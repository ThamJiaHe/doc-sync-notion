# Quick Deployment Guide

## Issue: Supabase CLI Installation Failed

The `npm install -g supabase` command doesn't work because Supabase CLI doesn't support global npm installation anymore.

## ✅ Solution: Use the Deployment Script

I've created an automated deployment script for you. Here's how to use it:

### Option 1: Automated Script (Recommended)

```bash
# Make the script executable
chmod +x deploy-functions.sh

# Run the deployment script
./deploy-functions.sh
```

The script will:
1. ✅ Install Supabase CLI (Linux binary)
2. 🔐 Login to Supabase (opens browser)
3. 🔗 Link to your project
4. 🚀 Deploy all edge functions
5. 🔑 Set environment secrets (ENCRYPTION_SECRET, LOVABLE_API_KEY)

### Option 2: Manual Installation

If you prefer to do it manually:

```bash
# Install Supabase CLI
cd /tmp
curl -fsSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz -o supabase.tar.gz
tar -xzf supabase.tar.gz
chmod +x supabase
sudo mv supabase /usr/local/bin/
cd -

# Verify installation
supabase --version

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref hthwsxnyqrcbvqxnydmi

# Deploy functions
supabase functions deploy

# Set secrets
supabase secrets set ENCRYPTION_SECRET=$(openssl rand -base64 32)
supabase secrets set GEMINI_API_KEY=your_gemini_api_key_here
```

## Important: Get Your Google Gemini API Key (FREE!)

We've ditched Lovable's dependency! The app now uses **Google Gemini AI directly**.

**Get your FREE API key:**
1. Go to: **https://aistudio.google.com/apikey**
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Copy the key (starts with `AIza...`)

**It's completely FREE:**
- No credit card required
- 1,500 requests per day
- Perfect for this application

## After Deployment

Once edge functions are deployed:

### 1. Run Database Migration

Go to Supabase SQL Editor:
https://hthwsxnyqrcbvqxnydmi.supabase.co/project/hthwsxnyqrcbvqxnydmi/sql/new

Run this SQL:
```sql
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS default_source_id TEXT;

COMMENT ON COLUMN public.user_settings.default_source_id IS 'User''s default Notion Database ID for document uploads';
```

Or run the complete setup:
```sql
-- Paste entire contents of COMPLETE_SETUP.sql
```

### 2. Test Everything

**Test 1: Settings Persistence**
1. Open app → Click profile picture → Settings
2. Enter Notion API Key and Default Database ID
3. Click Save
4. Refresh browser
5. Open Settings again - values should persist ✅

**Test 2: Document Processing**
1. Upload a test document (PDF/image)
2. Status should change: `pending` → `processing` → `completed`
3. Download CSV should work ✅

## Troubleshooting

### If deployment fails:

**Check Supabase CLI installation:**
```bash
supabase --version
```

**Check if you're logged in:**
```bash
supabase projects list
```

**Check function logs:**
- Go to Supabase Dashboard > Edge Functions > Logs
- Look for errors

**Verify secrets are set:**
- Supabase Dashboard > Edge Functions > Settings
- Should see: ENCRYPTION_SECRET, GEMINI_API_KEY

### If documents still stuck in pending:

1. Check edge function logs in Supabase Dashboard
2. Verify GEMINI_API_KEY is set correctly
3. Check browser console (F12) for errors
4. Make sure you deployed the `process-document` function

## Summary

1. ✅ Code is ready (all fixes implemented)
2. ⚠️ Run `./deploy-functions.sh` to deploy edge functions
3. ⚠️ Run database migration in Supabase SQL Editor
4. ✅ Test settings persistence and document processing

That's it! Let me know if you hit any issues.
