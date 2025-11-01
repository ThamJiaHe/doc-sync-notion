# Getting Your Lovable API Key

## The App Needs Lovable AI Gateway

**Important:** This application was built on Lovable Cloud and uses **Lovable's AI Gateway** for document OCR processing. The edge function **cannot work** without the `LOVABLE_API_KEY`.

## How to Get Your Lovable API Key

### Option 1: From Lovable Project Dashboard

1. Go to your Lovable project:
   **https://lovable.dev/projects/ad7b146c-454c-4253-b3ac-814e5b9f85cf**

2. Look for one of these locations:
   - **Project Settings** > **API Keys**
   - **Settings** > **AI Gateway**
   - **Integrations** > **API Keys**
   - **Developer Settings**

3. Copy the API key (it might be called "AI Gateway Key" or "Lovable API Key")

### Option 2: Contact Lovable Support

If you can't find the API key in the dashboard:

1. Contact Lovable support: support@lovable.dev
2. Reference your project: `ad7b146c-454c-4253-b3ac-814e5b9f85cf`
3. Ask for your "AI Gateway API Key" or "Lovable API Key"

### Option 3: Check Environment Variables in Lovable

1. Go to your Lovable project dashboard
2. Navigate to **Environment Variables** or **Secrets**
3. Look for `LOVABLE_API_KEY` or similar
4. Copy the value

## What This Key Does

The `LOVABLE_API_KEY` is used to:
- Call Lovable's AI Gateway for OCR (Optical Character Recognition)
- Process documents using Google Gemini 2.5 Flash model
- Extract structured data from PDFs, images, and DOCX files

**Without this key, document processing will fail with:**
```
Failed to process document: Edge Function returned a non-2xx status code
```

## After Getting the Key

Once you have your Lovable API key:

### If you haven't deployed edge functions yet:

```bash
chmod +x deploy-functions.sh
./deploy-functions.sh
```

When prompted, enter your Lovable API key.

### If edge functions are already deployed:

Set the secret using Supabase CLI:

```bash
supabase secrets set LOVABLE_API_KEY=your_actual_lovable_api_key_here
```

Or via Supabase Dashboard:
1. Go to: https://hthwsxnyqrcbvqxnydmi.supabase.co
2. Navigate to **Edge Functions** > **Settings**
3. Add secret: `LOVABLE_API_KEY` = `your_key_here`
4. Save

## Verify It Works

After setting the API key:

1. Upload a test document (PDF or image)
2. Status should change from `pending` → `processing` → `completed`
3. If it still fails, check edge function logs:
   - Supabase Dashboard > Edge Functions > process-document > Logs
   - Look for "LOVABLE_API_KEY is not configured" error

## Alternative: Self-Host AI Processing

If you want to move away from Lovable's AI Gateway, you would need to:

1. Replace the AI Gateway call in `supabase/functions/process-document/index.ts`
2. Use a different AI service (OpenAI, Anthropic, Google Gemini directly)
3. Update the code to use the new API
4. Deploy the modified edge function

**This requires significant code changes** and is beyond the scope of this fix.

## Current Status

✅ Code changes for settings persistence: **Complete**  
✅ Database migration created: **Ready to run**  
✅ Edge functions code: **Ready to deploy**  
⚠️ **Missing:** `LOVABLE_API_KEY` environment variable  

**Next step:** Get your Lovable API key and either:
- Run `./deploy-functions.sh` (will prompt for the key)
- Or manually set it with `supabase secrets set LOVABLE_API_KEY=your_key`
