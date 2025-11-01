import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { encryptData, decryptData } from '../_shared/encryption.ts'
import { validateNotionApiKey, sanitizeText } from '../_shared/validation.ts'
import { logAuditEvent, AuditEventType, AuditSeverity, extractIpAddress, extractUserAgent } from '../_shared/audit.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Extract IP and User Agent for audit logging
    const ipAddress = extractIpAddress(req);
    const userAgent = extractUserAgent(req);

    // Initialize Supabase client with auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Verify user authentication
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      await logAuditEvent(supabaseClient, {
        userId: undefined,
        eventType: AuditEventType.UNAUTHORIZED_ACCESS,
        severity: AuditSeverity.WARNING,
        ipAddress,
        userAgent,
        action: 'update_user_settings',
        status: 'failure',
        metadata: { reason: 'Authentication failed' },
      });

      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle GET request - Fetch and decrypt settings
    if (req.method === 'GET') {
      const { data: userSettings, error: fetchError } = await supabaseClient
        .from('user_settings')
        .select('notion_api_key, default_source_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching user settings:', fetchError)
        return new Response(
          JSON.stringify({ error: 'Failed to fetch settings' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Decrypt the API key if it exists
      let decryptedApiKey = null
      if (userSettings?.notion_api_key) {
        const storedKey = userSettings.notion_api_key
        
        // Check if the key is already encrypted (starts with encryption prefix)
        // Encrypted keys will be base64 encoded and won't start with 'secret_' or 'ntn_'
        const isEncrypted = !storedKey.startsWith('secret_') && !storedKey.startsWith('ntn_')
        
        if (isEncrypted) {
          // Key is encrypted, decrypt it
          const encryptionSecret = Deno.env.get('ENCRYPTION_SECRET')
          if (!encryptionSecret) {
            console.error('ENCRYPTION_SECRET not configured')
            return new Response(
              JSON.stringify({ error: 'Server configuration error' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          try {
            decryptedApiKey = await decryptData(storedKey, encryptionSecret)
          } catch (decryptError) {
            console.error('Failed to decrypt API key:', decryptError)
            // Return empty string instead of error to allow user to re-enter
            decryptedApiKey = ''
          }
        } else {
          // Key is not encrypted (legacy data), return as-is
          // This handles the migration period
          console.log('Found unencrypted API key, will be encrypted on next save')
          decryptedApiKey = storedKey
        }
      }

      return new Response(
        JSON.stringify({ 
          notion_api_key: decryptedApiKey || '',
          default_source_id: userSettings?.default_source_id || '',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle POST request - Encrypt and save settings
    // Parse request body
    const { notion_api_key, default_source_id } = await req.json()

    // Validate Notion API key format if provided
    if (notion_api_key && !validateNotionApiKey(notion_api_key)) {
      await logAuditEvent(supabaseClient, {
        userId: user.id,
        eventType: AuditEventType.INVALID_INPUT,
        severity: AuditSeverity.MEDIUM,
        ipAddress,
        userAgent,
        action: 'validate_notion_api_key',
        status: 'failure',
        metadata: { reason: 'Invalid Notion API key format' },
      });

      return new Response(
        JSON.stringify({ error: 'Invalid Notion API key format. It should start with "secret_"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Encrypt the API key if provided
    let encryptedApiKey = null
    if (notion_api_key) {
      const encryptionSecret = Deno.env.get('ENCRYPTION_SECRET')
      if (!encryptionSecret) {
        console.error('ENCRYPTION_SECRET not configured')
        await logAuditEvent(supabaseClient, {
          userId: user.id,
          eventType: AuditEventType.ENCRYPTION_FAILURE,
          severity: AuditSeverity.CRITICAL,
          ipAddress,
          userAgent,
          action: 'encrypt_api_key',
          status: 'failure',
          metadata: { reason: 'ENCRYPTION_SECRET not configured' },
        });

        return new Response(
          JSON.stringify({ error: 'Server configuration error' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      try {
        encryptedApiKey = await encryptData(notion_api_key, encryptionSecret)
      } catch (encryptError) {
        console.error('Encryption failed:', encryptError)
        await logAuditEvent(supabaseClient, {
          userId: user.id,
          eventType: AuditEventType.ENCRYPTION_FAILURE,
          severity: AuditSeverity.HIGH,
          ipAddress,
          userAgent,
          action: 'encrypt_api_key',
          status: 'failure',
          metadata: { error: String(encryptError) },
        });

        return new Response(
          JSON.stringify({ error: 'Failed to encrypt API key' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Upsert user settings with encrypted API key
    const { error: upsertError } = await supabaseClient
      .from('user_settings')
      .upsert({
        user_id: user.id,
        notion_api_key: encryptedApiKey,
        default_source_id: default_source_id || null,
      }, {
        onConflict: 'user_id'
      })

    if (upsertError) {
      console.error('Database upsert failed:', upsertError)
      await logAuditEvent(supabaseClient, {
        userId: user.id,
        eventType: AuditEventType.SETTINGS_CHANGE,
        severity: AuditSeverity.MEDIUM,
        ipAddress,
        userAgent,
        action: 'save_user_settings',
        status: 'failure',
        metadata: { error: upsertError.message },
      });

      return new Response(
        JSON.stringify({ error: 'Failed to save settings' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log successful settings update
    await logAuditEvent(supabaseClient, {
      userId: user.id,
      eventType: AuditEventType.SETTINGS_CHANGE,
      severity: AuditSeverity.INFO,
      ipAddress,
      userAgent,
      action: 'save_user_settings',
      status: 'success',
      metadata: { 
        hasNotionKey: !!notion_api_key,
        hasDefaultSourceId: !!default_source_id,
      },
    });

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Error in update-user-settings function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
