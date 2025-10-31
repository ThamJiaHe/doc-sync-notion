import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let documentId: string | null = null;
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

    const body = await req.json();
    documentId = body?.documentId ?? null;
    console.log('Processing document:', documentId);

    if (!documentId) {
      throw new Error('Document ID is required');
    }

    // Get document details
    const { data: document, error: docError } = await supabaseClient
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError) throw docError;
    
    // Get source_id from document record
    const sourceId = (document as any).source_id ?? null;
    console.log('Document source_id:', sourceId);

    // Update status to processing
    await supabaseClient
      .from('documents')
      .update({ status: 'processing' })
      .eq('id', documentId);

    // Call Lovable AI for OCR processing
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Download the file securely from storage (bucket is private)
    let base64Data = '';
    let fileBlob: Blob | null = null;
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
    const notionContext = sourceId 
      ? `\n\nIMPORTANT: This data will be imported into a Notion database with Source ID: ${sourceId}. Format the CSV to match common Notion database properties (Name, Tags, Status, Date, Notes, Description, etc.) based on the content. Use proper column headers that Notion can understand.`
      : '';

    const systemPrompt = `You are an expert document processing system. Extract ALL text and data from documents, PDFs, and images. Return structured data in JSON format with fields detected. Also provide markdown version and CSV format that can be imported to Notion databases.${notionContext}`;

    // Use Lovable AI to process the image/document
    const userContent: any[] = [
      {
        type: 'text',
        text: 'Extract all information from this document. Provide: 1) JSON with structured data 2) Markdown version 3) CSV format. Be thorough and capture ALL text, tables, and structured information.'
      }
    ];

    if (inlineTextFromFile) {
      userContent.push({
        type: 'text',
        text: `Document text (extracted):\n${inlineTextFromFile}`
      });
    } else {
      userContent.push({
        type: 'image_url',
        image_url: {
          url: `data:${document.file_type};base64,${base64Data}`
        }
      });
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userContent
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI processing failed: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const extractedText = aiData.choices[0].message.content;

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

    return new Response(
      JSON.stringify({ success: true, message: 'Document processed successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in process-document function:', error);
    
    // Try to update document status to error (avoid re-consuming body)
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