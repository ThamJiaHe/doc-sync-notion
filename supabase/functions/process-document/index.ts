import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import {
  validateUUID,
  validateFileSize,
  validateFileType,
  validateSourceId,
  checkRateLimit,
} from '../_shared/validation.ts';
import {
  logAuditEvent,
  AuditEventType,
  AuditSeverity,
  extractIpAddress,
  extractUserAgent,
} from '../_shared/audit.ts';
import { encryptData, decryptData } from '../_shared/encryption.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production' 
    ? 'https://yourdomain.com' // Replace with your actual domain
    : '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let documentId: string | null = null;
  const ipAddress = extractIpAddress(req.headers);
  const userAgent = extractUserAgent(req.headers);
  
  try {
    // Rate limiting check
    const rateLimit = checkRateLimit(ipAddress, 50, 60000); // 50 requests per minute
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded. Please try again later.',
          resetTime: rateLimit.resetTime,
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil((rateLimit.resetTime - Date.now()) / 1000)),
            'X-RateLimit-Limit': '50',
            'X-RateLimit-Remaining': String(rateLimit.remaining),
          },
        }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const body = await req.json();
    documentId = body?.documentId ?? null;

    // Validate document ID
    const docIdValidation = validateUUID(documentId || '');
    if (!docIdValidation.valid) {
      await logAuditEvent(supabaseClient, {
        eventType: AuditEventType.INVALID_INPUT,
        severity: AuditSeverity.WARNING,
        ipAddress,
        userAgent,
        action: 'process_document_invalid_id',
        status: 'failure',
        errorMessage: docIdValidation.error,
      });
      throw new Error(docIdValidation.error || 'Invalid document ID');
    }
    documentId = docIdValidation.sanitized;
    
    console.log('Processing document:', documentId);

    // Get document details
    const { data: document, error: docError } = await supabaseClient
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError) throw docError;
    
    // Verify user ownership
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user || document.user_id !== user.id) {
      await logAuditEvent(supabaseClient, {
        eventType: AuditEventType.UNAUTHORIZED_ACCESS,
        severity: AuditSeverity.ERROR,
        userId: user?.id,
        ipAddress,
        userAgent,
        resourceId: documentId,
        action: 'process_document_unauthorized',
        status: 'failure',
        errorMessage: 'User does not own this document',
      });
      throw new Error('Unauthorized');
    }

    // Validate file size and type
    const fileSizeValidation = validateFileSize(document.file_size);
    if (!fileSizeValidation.valid) {
      throw new Error(fileSizeValidation.error);
    }

    const fileTypeValidation = validateFileType(document.file_type);
    if (!fileTypeValidation.valid) {
      throw new Error(fileTypeValidation.error);
    }

    // Log processing start
    await logAuditEvent(supabaseClient, {
      eventType: AuditEventType.DOCUMENT_PROCESS,
      severity: AuditSeverity.INFO,
      userId: user.id,
      userEmail: user.email,
      ipAddress,
      userAgent,
      resourceId: documentId,
      action: 'process_document_start',
      status: 'success',
      metadata: {
        filename: document.filename,
        fileType: document.file_type,
        fileSize: document.file_size,
      },
    });
    
    // Get source_id from document record
    const sourceId = (document as any).source_id ?? null;
    console.log('Document source_id:', sourceId);

    // Optionally fetch Notion database schema when a sourceId is provided
    let notionSchema: any | null = null;
    let notionHeaders: string[] | null = null;
    
    if (sourceId) {
      // Validate source_id format
      if (!validateSourceId(sourceId)) {
        await logAuditEvent(supabaseClient, {
          userId: document.user_id,
          eventType: AuditEventType.INVALID_INPUT,
          severity: AuditSeverity.MEDIUM,
          ipAddress,
          userAgent,
          resourceId: documentId,
          action: 'validate_source_id',
          status: 'failure',
          metadata: { sourceId, reason: 'Invalid source_id format' },
        });
        return new Response(
          JSON.stringify({ error: 'Invalid source_id format' }),
          { status: 400, headers: corsHeaders }
        );
      }

      // First try to get user's personal Notion API key from user_settings
      let notionApiKey = null;
      const { data: userSettings, error: settingsError } = await supabaseClient
        .from('user_settings')
        .select('notion_api_key')
        .eq('user_id', document.user_id)
        .maybeSingle();
      
      if (settingsError) {
        console.error('Error fetching user settings:', settingsError);
        await logAuditEvent(supabaseClient, {
          userId: document.user_id,
          eventType: AuditEventType.DATA_ACCESS,
          severity: AuditSeverity.MEDIUM,
          ipAddress,
          userAgent,
          resourceId: documentId,
          action: 'fetch_user_settings',
          status: 'failure',
          metadata: { error: settingsError.message },
        });
      }
      
      if (userSettings?.notion_api_key) {
        try {
          // Decrypt the stored API key
          const encryptionSecret = Deno.env.get('ENCRYPTION_SECRET');
          if (!encryptionSecret) {
            console.error('ENCRYPTION_SECRET not configured');
            await logAuditEvent(supabaseClient, {
              userId: document.user_id,
              eventType: AuditEventType.ENCRYPTION_FAILURE,
              severity: AuditSeverity.CRITICAL,
              ipAddress,
              userAgent,
              resourceId: documentId,
              action: 'decrypt_api_key',
              status: 'failure',
              metadata: { reason: 'ENCRYPTION_SECRET not configured' },
            });
          } else {
            notionApiKey = await decryptData(userSettings.notion_api_key, encryptionSecret);
            console.log('Using user\'s personal Notion API key');
            
            await logAuditEvent(supabaseClient, {
              userId: document.user_id,
              eventType: AuditEventType.API_KEY_USAGE,
              severity: AuditSeverity.INFO,
              ipAddress,
              userAgent,
              resourceId: documentId,
              action: 'use_personal_notion_key',
              status: 'success',
              metadata: { sourceId },
            });
          }
        } catch (decryptError) {
          console.error('Failed to decrypt Notion API key:', decryptError);
          await logAuditEvent(supabaseClient, {
            userId: document.user_id,
            eventType: AuditEventType.ENCRYPTION_FAILURE,
            severity: AuditSeverity.HIGH,
            ipAddress,
            userAgent,
            resourceId: documentId,
            action: 'decrypt_api_key',
            status: 'failure',
            metadata: { error: String(decryptError) },
          });
        }
      }
      
      if (!notionApiKey) {
        // Fallback to system-wide NOTION_API_KEY (if configured)
        notionApiKey = Deno.env.get('NOTION_API_KEY');
        if (notionApiKey) {
          console.log('Using system-wide Notion API key');
          await logAuditEvent(supabaseClient, {
            userId: document.user_id,
            eventType: AuditEventType.API_KEY_USAGE,
            severity: AuditSeverity.INFO,
            ipAddress,
            userAgent,
            resourceId: documentId,
            action: 'use_system_notion_key',
            status: 'success',
            metadata: { sourceId },
          });
        }
      }
      
      if (!notionApiKey) {
        console.warn('No Notion API key found (user or system). CSV will be formatted generically.');
      } else {
        try {
          notionSchema = await fetchNotionDatabaseSchema(sourceId, notionApiKey);
          notionHeaders = notionSchema ? Object.keys(notionSchema.properties) : null;
          
          if (notionHeaders) {
            await logAuditEvent(supabaseClient, {
              userId: document.user_id,
              eventType: AuditEventType.DATA_ACCESS,
              severity: AuditSeverity.INFO,
              ipAddress,
              userAgent,
              resourceId: documentId,
              action: 'fetch_notion_schema',
              status: 'success',
              metadata: { 
                sourceId,
                columnCount: notionHeaders.length,
              },
            });
            console.log(`Fetched Notion schema with ${notionHeaders.length} columns`);
          } else {
            await logAuditEvent(supabaseClient, {
              userId: document.user_id,
              eventType: AuditEventType.DATA_ACCESS,
              severity: AuditSeverity.WARNING,
              ipAddress,
              userAgent,
              resourceId: documentId,
              action: 'fetch_notion_schema',
              status: 'failure',
              metadata: { 
                sourceId,
                reason: 'Schema fetch returned null',
              },
            });
            console.warn('Failed to fetch Notion schema. CSV will be formatted generically.');
          }
        } catch (schemaError) {
          await logAuditEvent(supabaseClient, {
            userId: document.user_id,
            eventType: AuditEventType.DATA_ACCESS,
            severity: AuditSeverity.WARNING,
            ipAddress,
            userAgent,
            resourceId: documentId,
            action: 'fetch_notion_schema',
            status: 'failure',
            metadata: { 
              sourceId,
              error: String(schemaError),
            },
          });
          console.warn('Failed to fetch Notion schema:', schemaError);
        }
      }
    }

    // Update status to processing
    await supabaseClient
      .from('documents')
      .update({ status: 'processing' })
      .eq('id', documentId);

    // Call Google Gemini AI directly for OCR processing
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured. Get one from https://aistudio.google.com/apikey');
    }

    // Download the file securely from storage (bucket is private)
    let base64Data = '';
    let fileBlob: Blob | null = null;
    let mimeType = document.file_type || 'application/octet-stream';
    
    try {
      // Try to derive the storage object path from the file_url
      const objectPath = extractObjectPathFromUrl(document.file_url);
      if (!objectPath) throw new Error('Could not determine storage object path from file_url');
      const { data: downloadData, error: downloadError } = await supabaseClient
        .storage
        .from('documents')
        .download(objectPath);
      if (downloadError || !downloadData) {
        throw downloadError ?? new Error('File download failed');
      }
      fileBlob = downloadData as unknown as Blob;
      base64Data = await blobToBase64(fileBlob);
    } catch (storageErr) {
      console.warn('Storage download failed; falling back to direct fetch of file_url', storageErr);
      const resp = await fetch(document.file_url);
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`Failed to fetch file_url (${resp.status}): ${txt.slice(0,200)}`);
      }
      fileBlob = await resp.blob();
      base64Data = await blobToBase64(fileBlob);
    }

    // Prepare content depending on file type
    let inlineTextFromFile: string | null = null;
    try {
      const fileType = document.file_type || '';
      if (fileBlob && fileType.startsWith('application/pdf')) {
        const ab = await fileBlob.arrayBuffer();
        inlineTextFromFile = await extractPdfText(new Uint8Array(ab));
      } else if (fileBlob && (fileType.includes('wordprocessingml.document') || document.filename?.toLowerCase().endsWith('.docx'))) {
        const ab = await fileBlob.arrayBuffer();
        inlineTextFromFile = await extractDocxText(ab);
      }
    } catch (extractionErr) {
      console.warn('Failed to extract text directly from file; will rely on AI where possible.', extractionErr);
    }

    // If not image and we couldn't extract text (e.g., legacy .doc), return a clear error
    if (!inlineTextFromFile && !(document.file_type?.startsWith('image/'))) {
      await supabaseClient
        .from('documents')
        .update({ 
          status: 'error',
          error_message: `Unsupported file type for automated processing: ${document.file_type}. Supported: images, PDFs, DOCX.`
        })
        .eq('id', documentId);
      return new Response(
        JSON.stringify({ error: 'Unsupported file type. Supported: images, PDFs, DOCX.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare system prompt with Notion context if source_id exists
    const headersInstruction = notionHeaders && notionHeaders.length
      ? `\n\nCRITICAL INSTRUCTION - NOTION DATABASE (ID: ${sourceId}):\n` +
        `Use EXACTLY these column headers in this EXACT order:\n${notionHeaders.join(', ')}\n` +
        `Rules:\n` +
        `- First row MUST be only the headers above\n` +
        `- Do not add, rename, or reorder columns\n` +
        `- Leave cells blank if data is unavailable\n` +
        `- Date format: YYYY-MM-DD\n` +
        `- Escape commas and quotes properly (RFC4180)`
      : sourceId
        ? `\n\nNOTION DATABASE INTEGRATION (ID: ${sourceId}):\n` +
          `The user intends to import this CSV into a Notion database.\n` +
          `- Analyze the document and identify ALL data fields present\n` +
          `- Create descriptive column headers for each field\n` +
          `- Format dates as YYYY-MM-DD\n` +
          `- Format numbers consistently\n` +
          `- Create a structured, well-organized CSV with clear headers\n` +
          `- First row MUST be headers, subsequent rows are data\n` +
          `- Escape commas and quotes properly (RFC4180)`
        : `\n\nFormat the CSV with clear, descriptive column headers. First row must be headers, then data rows.`;

    const systemPrompt = `You are an expert document processing system specialized in extracting structured data for Notion databases.

YOUR TASK:
1. Extract ALL text and data from the provided document (PDF, DOCX, or image)
2. Identify the document type and structure
3. Return THREE formats:
   - JSON: Structured data with detected fields
   - Markdown: Clean formatted version of the content
   - CSV: PERFECTLY formatted for Notion database import${headersInstruction}

Be thorough and capture ALL information. The CSV format is CRITICAL for the user's workflow.

FORMAT REQUIREMENTS:
- Wrap each format in code blocks: \`\`\`json, \`\`\`markdown, \`\`\`csv
- For CSV: First row is headers, subsequent rows are data
- Extract all structured data (tables, lists, key-value pairs)
- Maintain data relationships and hierarchy where possible`;

    // Build the prompt for Google Gemini
    const userPrompt = notionHeaders && notionHeaders.length
      ? `Extract and structure ALL data from this document for the given Notion database. Align JSON keys and CSV columns to these headers: ${notionHeaders.join(', ')}.`
      : sourceId
        ? `Extract and structure ALL data from this document for import into Notion database ${sourceId}. Identify all fields, create appropriate column headers, and organize the data in a structured CSV format.`
        : 'Extract all information from this document. Provide: 1) JSON with structured data 2) Markdown version 3) CSV format with clear headers.';

    // Prepare the request body for Google Gemini API
    const geminiParts: any[] = [
      { text: systemPrompt },
      { text: userPrompt }
    ];

    if (inlineTextFromFile) {
      // For extracted text, just add it as text
      geminiParts.push({
        text: `Document text (extracted):\n${inlineTextFromFile}`
      });
    } else {
      // For images/PDFs, send as inline data
      geminiParts.push({
        inlineData: {
          mimeType: mimeType,
          data: base64Data
        }
      });
    }

    // Call Google Gemini API directly (no Lovable middleman)
    const aiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=' + GEMINI_API_KEY, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: geminiParts
        }],
        generationConfig: {
          temperature: 0.4,
          topK: 32,
          topP: 1,
          maxOutputTokens: 8192,
        }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Gemini API error:', aiResponse.status, errorText);
      throw new Error(`AI processing failed (${aiResponse.status}): ${errorText}`);
    }

    const aiData = await aiResponse.json();
    
    // Extract text from Gemini response format
    if (!aiData.candidates || !aiData.candidates[0] || !aiData.candidates[0].content) {
      throw new Error('Invalid response from Gemini API');
    }
    
    const extractedText = aiData.candidates[0].content.parts[0].text;

    // Parse the response to extract JSON, markdown, and CSV
    let jsonData: any = {};
    let markdownContent = '';
    let csvData = '';

    try {
      // Try to extract JSON from the response
      const jsonMatch = extractedText.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        jsonData = JSON.parse(jsonMatch[1]);
      }

      // Extract markdown
      const mdMatch = extractedText.match(/```markdown\n([\s\S]*?)\n```/);
      if (mdMatch) {
        markdownContent = mdMatch[1];
      } else {
        markdownContent = extractedText;
      }

      // Extract CSV
      const csvMatch = extractedText.match(/```csv\n([\s\S]*?)\n```/);
      if (csvMatch) {
        csvData = csvMatch[1];
      } else {
        // Generate basic CSV from the text
        csvData = convertToCSV(extractedText);
      }
    } catch (parseError) {
      console.error('Parsing error:', parseError);
      // Fallback: use the raw text
      markdownContent = extractedText;
      csvData = convertToCSV(extractedText);
      jsonData = { content: extractedText };
    }

    // If we have Notion headers, strictly enforce them
    if (notionHeaders && notionHeaders.length) {
      if (!csvData || !csvData.trim()) {
        csvData = rebuildCSVFromJson(jsonData, notionHeaders);
      } else {
        const firstLine = csvData.split('\n')[0] || '';
        const got = parseCSVHeaders(firstLine);
        const wanted = notionHeaders;
        const matches = got.length === wanted.length && got.every((h, i) => normalizeKey(h) === normalizeKey(wanted[i]));
        if (!matches) {
          csvData = rebuildCSVFromJson(jsonData, notionHeaders);
        }
      }
    }


    // Store extracted data
    const contentPayload = (jsonData && typeof jsonData === 'object' && !Array.isArray(jsonData))
      ? { source_id: sourceId, ...jsonData }
      : { source_id: sourceId, content: jsonData };

    const { error: dataError } = await supabaseClient
      .from('extracted_data')
      .insert({
        document_id: documentId,
        content: contentPayload,
        markdown_content: markdownContent,
        csv_data: csvData,
      });

    if (dataError) throw dataError;

    // Update document status to completed
    await supabaseClient
      .from('documents')
      .update({ status: 'completed' })
      .eq('id', documentId);

    // Log successful processing completion
    await logAuditEvent(supabaseClient, {
      userId: document.user_id,
      eventType: AuditEventType.DOCUMENT_PROCESSED,
      severity: AuditSeverity.INFO,
      ipAddress,
      userAgent,
      resourceId: documentId!,
      action: 'process_document_complete',
      status: 'success',
      metadata: {
        filename: document.filename,
        fileType: document.file_type,
        hadNotionSchema: !!notionHeaders,
        columnCount: notionHeaders?.length,
      },
    });

    return new Response(
      JSON.stringify({ success: true, message: 'Document processed successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in process-document function:', error);
    
    // Try to update document status to error and log audit event
    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        {
          global: {
            headers: { Authorization: req.headers.get('Authorization')! },
          },
        }
      );

      const errorDocId = documentId ?? undefined;
      if (errorDocId) {
        await supabaseClient
          .from('documents')
          .update({ 
            status: 'error',
            error_message: error.message?.slice(0, 500)
          })
          .eq('id', errorDocId);
        
        // Log processing failure
        await logAuditEvent(supabaseClient, {
          userId: document?.user_id,
          eventType: AuditEventType.DOCUMENT_PROCESS,
          severity: AuditSeverity.ERROR,
          ipAddress,
          userAgent,
          resourceId: errorDocId,
          action: 'process_document_error',
          status: 'failure',
          metadata: {
            error: error.message?.slice(0, 500),
            errorType: error.name,
          },
        });
      }
    } catch (updateError) {
      console.error('Failed to update error status:', updateError);
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// Helper function to convert blob to base64
async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper to parse object path from a storage URL
function extractObjectPathFromUrl(urlStr: string): string | null {
  try {
    const marker = '/documents/';
    const idx = urlStr.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(urlStr.slice(idx + marker.length));
  } catch {
    return null;
  }
}

// PDF text extraction using pdfjs-serverless (pure JS, serverless-friendly)
async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const { getDocument }: any = await import('https://esm.sh/pdfjs-serverless@0.3.2');
  const doc = await getDocument({ data: bytes, useSystemFonts: true }).promise;
  let all = '';
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((it: any) => (it && 'str' in it ? it.str : '')).join(' ');
    all += text + '\n';
  }
  return all.trim();
}

// DOCX text extraction using Mammoth (browser build)
async function extractDocxText(arrayBuffer: ArrayBuffer): Promise<string> {
  const mammoth: any = await import('https://esm.sh/mammoth@1.6.0/mammoth.browser.js');
  const result = await mammoth.extractRawText({ arrayBuffer });
  return (result?.value || '').trim();
}

// Helper function to convert text to basic CSV
function convertToCSV(text: string): string {
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length === 0) return '';
  return 'Content\n' + lines.map(line => `"${line.replace(/"/g, '""')}"`).join('\n');
}

// Optional: Fetch Notion database schema when a Source ID is provided
async function fetchNotionDatabaseSchema(databaseId: string, token: string): Promise<any | null> {
  try {
    if (!token) return null;
    const resp = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      }
    });
    if (!resp.ok) {
      const t = await resp.text();
      console.warn('Failed to fetch Notion schema:', resp.status, t);
      return null;
    }
    return await resp.json();
  } catch (e) {
    console.warn('Error fetching Notion schema:', e);
    return null;
  }
}

function parseCSVHeaders(line: string): string[] {
  // Split on commas not inside quotes
  const regex = /,(?=(?:[^"]*\"[^"]*\")*[^"]*$)/;
  return line.split(regex).map(h => h.trim().replace(/^\"|\"$/g, ''));
}

function normalizeKey(k: string): string {
  return k.replace(/[_\s-]+/g, '').toLowerCase();
}

function rebuildCSVFromJson(jsonData: any, headers: string[]): string {
  const rows: any[] = Array.isArray(jsonData)
    ? jsonData
    : Array.isArray(jsonData?.items)
      ? jsonData.items
      : [jsonData];

  const headerNorm = headers.map(normalizeKey);
  const csvRows: string[] = [];
  csvRows.push(headers.join(','));

  for (const row of rows) {
    const out: string[] = [];
    for (let i = 0; i < headers.length; i++) {
      const target = headerNorm[i];
      // Find best matching key in row
      let val: any = '';
      if (row && typeof row === 'object') {
        const foundKey = Object.keys(row).find(k => normalizeKey(k) === target);
        if (foundKey) val = row[foundKey];
      }
      if (val === undefined || val === null) val = '';
      const str = String(val).replace(/"/g, '""');
      // Quote if contains comma or quote
      out.push(/[,\n\r"]/g.test(str) ? `"${str}"` : str);
    }
    csvRows.push(out.join(','));
  }
  return csvRows.join('\n');
}
