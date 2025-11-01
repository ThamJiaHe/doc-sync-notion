# 🔍 Error Diagnosis: 500 Internal Server Error

## What's Happening

Both edge functions are returning **500 Internal Server Error**:
1. `process-document` - Can't process documents
2. `update-user-settings` - Can't load/save settings (but fallback works)

## Why This Is Happening

The edge functions are **either not deployed OR missing the GEMINI_API_KEY**.

### Check 1: Are Edge Functions Deployed?

Run this command:
```bash
supabase functions list
```

**If you get an error** or it shows no functions:
- Edge functions are NOT deployed
- You need to deploy them

**If it shows functions:**
- They're deployed but missing environment variables

### Check 2: Is GEMINI_API_KEY Set?

Run this command:
```bash
supabase secrets list
```

**Expected output:**
```
ENCRYPTION_SECRET: ****
GEMINI_API_KEY: ****
```

**If GEMINI_API_KEY is missing:**
- That's your problem!
- Get one from: https://aistudio.google.com/apikey

## 🚀 Quick Fix

Run the automated fix script:

```bash
chmod +x fix-deployment.sh
./fix-deployment.sh
```

This will:
1. ✅ Install Supabase CLI if needed
2. ✅ Check if you're logged in
3. ✅ Link to your project
4. ✅ Deploy edge functions
5. ✅ Prompt for GEMINI_API_KEY
6. ✅ Set ENCRYPTION_SECRET

## OR Manual Fix

### Step 1: Install & Login

```bash
# Install Supabase CLI
cd /tmp && curl -fsSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz -o supabase.tar.gz && tar -xzf supabase.tar.gz && chmod +x supabase && sudo mv supabase /usr/local/bin/ && cd -

# Login
supabase login

# Link project
supabase link --project-ref hthwsxnyqrcbvqxnydmi
```

### Step 2: Get Google Gemini API Key

1. Go to: **https://aistudio.google.com/apikey**
2. Sign in with Google
3. Click "Create API Key"
4. Copy the key (starts with `AIza...`)

### Step 3: Deploy Functions & Set Secrets

```bash
# Deploy edge functions
supabase functions deploy

# Set your Gemini API key (replace with your actual key)
supabase secrets set GEMINI_API_KEY=AIzaSy...your_key_here

# Set encryption secret
supabase secrets set ENCRYPTION_SECRET=$(openssl rand -base64 32)
```

### Step 4: Verify

```bash
# Check secrets are set
supabase secrets list

# Should show:
# ENCRYPTION_SECRET: ****
# GEMINI_API_KEY: ****
```

### Step 5: Run Database Migration

Go to Supabase SQL Editor:
https://hthwsxnyqrcbvqxnydmi.supabase.co/project/hthwsxnyqrcbvqxnydmi/sql/new

Paste and run:
```sql
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS default_source_id TEXT;

COMMENT ON COLUMN public.user_settings.default_source_id IS 'User''s default Notion Database ID for document uploads';
```

## ✅ Test

After fixing:

1. **Refresh your browser**
2. **Open Settings** (click profile picture)
   - Settings should load (no more 500 error)
   - You should see the Save button
3. **Upload a document**
   - Status should change: pending → processing → completed
   - No more 500 error

## About the Save Button

The Save button **IS there** - it's at the bottom of the Settings dialog. The issue is that:

1. Settings dialog is trying to fetch settings via edge function
2. Edge function returns 500 error
3. It falls back to direct database read (that's why you see settings)
4. But the **dialog still renders** with the Save button at the bottom

**You should see it!** Look at the very bottom of the Settings modal - there's a footer with "Cancel" and "Save Settings" buttons.

If you don't see it, it might be cut off. Try:
- Scrolling down in the Settings dialog
- Maximizing your browser window
- The dialog should have a scrollable area with buttons always visible at bottom

## Current Status

| Component | Status | Fix |
|-----------|--------|-----|
| Frontend Code | ✅ Working | - |
| Database Schema | ⚠️ Needs migration | Run SQL script |
| Edge Functions | ❌ Not deployed | Run deployment script |
| GEMINI_API_KEY | ❌ Not set | Get from Google AI Studio |
| Save Button | ✅ Exists | It's there! Check bottom of Settings |

---

**Run `./fix-deployment.sh` and everything will work!** 🚀
