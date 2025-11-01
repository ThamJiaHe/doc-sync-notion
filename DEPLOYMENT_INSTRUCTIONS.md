# Deployment Instructions

## Critical: Documents Stuck in "Pending" Status

**Problem:** Documents are uploaded successfully but remain in "pending" status indefinitely.

**Root Cause:** The `process-document` Edge Function has not been deployed to Supabase. The function is invoked after file upload, but if it's not deployed, the invocation silently fails.

### Solution: Deploy Edge Functions

You need to deploy the edge functions to Supabase for document processing to work.

#### Option 1: Deploy via Supabase Dashboard (Easiest)

1. Go to your Supabase project dashboard: https://hthwsxnyqrcbvqxnydmi.supabase.co
2. Navigate to **Edge Functions** in the left sidebar
3. Click **Deploy new function**
4. Upload the function files from `supabase/functions/process-document/`
5. Set required environment variables:
   - `GEMINI_API_KEY` - Your Google Gemini API key (FREE from https://aistudio.google.com/apikey)
   - `ENCRYPTION_SECRET` - Random 32-byte string (for API key encryption)
   
#### Option 2: Deploy via Supabase CLI (Recommended)

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref hthwsxnyqrcbvqxnydmi

# Deploy all functions
supabase functions deploy

# Or deploy specific functions
supabase functions deploy process-document
supabase functions deploy update-user-settings

# Set required secrets
supabase secrets set GEMINI_API_KEY=your_gemini_api_key
supabase secrets set ENCRYPTION_SECRET=$(openssl rand -base64 32)
```

#### Option 3: Manual Processing (Temporary Workaround)

If you cannot deploy edge functions immediately, you can manually trigger processing:

1. Go to Supabase Dashboard > SQL Editor
2. Run this query to get pending documents:
   ```sql
   SELECT id, filename, file_url FROM documents WHERE status = 'pending' AND user_id = 'YOUR_USER_ID';
   ```
3. Note: This doesn't actually process them - you'll need the edge function deployed for OCR.

### Verification

After deploying edge functions:

1. Upload a new document
2. Check that status changes from `pending` → `processing` → `completed`
3. Verify extracted data appears in the `extracted_data` table
4. Download CSV should now work

### Environment Variables Required

**process-document function:**
- `GEMINI_API_KEY` - Required for AI OCR processing (FREE from Google AI Studio)
- `ENCRYPTION_SECRET` - Required for decrypting user's Notion API keys
- `NOTION_API_KEY` - Optional system-wide fallback

**update-user-settings function:**
- `ENCRYPTION_SECRET` - Required for encrypting/decrypting user settings

### Database Setup

Before deploying functions, ensure you've run the complete database setup:

```sql
-- Run this in Supabase SQL Editor
-- File: COMPLETE_SETUP.sql

-- This creates all tables, RLS policies, and storage buckets
```

See `COMPLETE_SETUP.sql` for the full script.

## User Settings Persistence

✅ **FIXED** - User settings (Notion API Key, Default Source ID) are now stored in the database.

### What was implemented:

1. **Database Schema**: Added `default_source_id` column to `user_settings` table
2. **Settings UI**: Added "Default Notion Database ID" field in Settings dialog
3. **Auto-populate**: FileUpload component now loads the default Source ID automatically
4. **Edge Function**: Updated to save/retrieve the default source ID

### How it works:

1. User enters their **Notion API Key** and **Default Notion Database ID** in Settings
2. Settings are saved to `user_settings` table (API key is encrypted)
3. When uploading documents, the Source ID field auto-populates from saved settings
4. User can override the Source ID for individual uploads
5. Settings persist across browser sessions and page refreshes

### Migration Required:

Run this migration in Supabase SQL Editor:

```sql
-- File: supabase/migrations/20251101160000_add_default_source_id.sql

ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS default_source_id TEXT;

COMMENT ON COLUMN public.user_settings.default_source_id IS 'User''s default Notion Database ID for document uploads';
```

## Security

All sensitive data is encrypted:
- **Notion API Keys**: Encrypted with AES-256-GCM before storage
- **User Settings**: Row Level Security (RLS) ensures users only access their own data
- **Documents**: Private storage bucket with RLS policies

See `SECURITY.md` for complete security documentation.

## Support

If documents are still stuck in pending after deploying edge functions:

1. Check edge function logs in Supabase Dashboard
2. Verify `LOVABLE_API_KEY` is set correctly
3. Check browser console for errors
4. Verify the document was uploaded to storage successfully
