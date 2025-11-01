import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== TEST FUNCTION START ===');
    console.log('Method:', req.method);
    console.log('Headers:', JSON.stringify(Object.fromEntries(req.headers.entries())));
    
    const body = await req.json();
    console.log('Body:', JSON.stringify(body));
    
    // Test environment variables
    const GEMINI_KEY = Deno.env.get('GEMINI_API_KEY');
    console.log('GEMINI_API_KEY present:', !!GEMINI_KEY);
    console.log('GEMINI_API_KEY length:', GEMINI_KEY?.length || 0);
    
    const ENCRYPTION_SECRET = Deno.env.get('ENCRYPTION_SECRET');
    console.log('ENCRYPTION_SECRET present:', !!ENCRYPTION_SECRET);
    
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    console.log('SUPABASE_URL:', SUPABASE_URL);
    
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Test function works!',
        documentId: body?.documentId,
        hasGeminiKey: !!GEMINI_KEY,
        hasEncryptionSecret: !!ENCRYPTION_SECRET,
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
    
  } catch (error: any) {
    console.error('=== TEST FUNCTION ERROR ===');
    console.error('Error:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
