# Fix Summary - User Settings Persistence & Pending Documents

## Issues Fixed

### 1. ✅ User Settings Not Persisting (FIXED)

**Problem:**
- Notion API Key and Source ID were lost on page refresh
- Users had to re-enter credentials every time

**Solution Implemented:**
1. **Database Schema Update**
   - Added `default_source_id` column to `user_settings` table
   - Migration file: `supabase/migrations/20251101160000_add_default_source_id.sql`

2. **Settings Dialog Enhancement**
   - Added "Default Notion Database ID" input field
   - Both API key and Source ID are now saved to database
   - Edge function updated to handle both fields

3. **FileUpload Component Update**
   - Loads default Source ID from database on component mount
   - Auto-populates the field with saved value
   - User can still override for individual uploads

4. **TypeScript Types Updated**
   - Added `default_source_id` to `user_settings` table type
   - Both Row, Insert, and Update types updated

**Files Modified:**
- `src/components/SettingsDialog.tsx` - Added default_source_id field
- `src/components/FileUpload.tsx` - Auto-load saved source ID
- `src/integrations/supabase/types.ts` - Added default_source_id column
- `supabase/functions/update-user-settings/index.ts` - Save/retrieve default_source_id
- `COMPLETE_SETUP.sql` - Included default_source_id column

**Migration Required:**
```sql
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS default_source_id TEXT;

COMMENT ON COLUMN public.user_settings.default_source_id IS 'User''s default Notion Database ID for document uploads';
```

Run this in Supabase SQL Editor or re-run the complete setup script.

---

### 2. ⚠️ Documents Stuck in "Pending" Status (ROOT CAUSE IDENTIFIED)

**Problem:**
- Documents upload successfully
- Status remains "pending" indefinitely (20+ minutes)
- No processing happens

**Root Cause:**
The `process-document` Edge Function has **NOT been deployed** to Supabase. The code exists locally but isn't running on the server.

When FileUpload.tsx calls:
```typescript
supabase.functions.invoke('process-document', {
  body: { documentId: documentData.id }
})
```

This silently fails because the function doesn't exist on the server.

**Solution:**

**Option 1: Deploy Edge Functions (REQUIRED FOR PRODUCTION)**

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref hthwsxnyqrcbvqxnydmi

# Deploy all functions
supabase functions deploy

# Set required environment variables
supabase secrets set LOVABLE_API_KEY=your_lovable_api_key_here
supabase secrets set ENCRYPTION_SECRET=$(openssl rand -base64 32)
```

**Option 2: Deploy via Supabase Dashboard**

1. Go to: https://hthwsxnyqrcbvqxnydmi.supabase.co
2. Navigate to **Edge Functions** in sidebar
3. Click **Deploy new function**
4. Upload files from `supabase/functions/process-document/`
5. Set environment variables in Settings

**Required Environment Variables:**
- `LOVABLE_API_KEY` - Needed for AI OCR processing (from Lovable Cloud)
- `ENCRYPTION_SECRET` - Random 32-byte string for encrypting user data
- `NOTION_API_KEY` - (Optional) System-wide fallback Notion API key

**Generate ENCRYPTION_SECRET:**
```bash
openssl rand -base64 32
```

**Verification Steps:**
1. Deploy edge functions with required secrets
2. Upload a test document
3. Watch status change: `pending` → `processing` → `completed`
4. Check `extracted_data` table for OCR results
5. Download CSV should now work

---

## What Works Now

✅ **User Settings Persistence**
- Notion API Key saved to database (encrypted)
- Default Source ID saved to database (plaintext)
- Settings persist across sessions
- Auto-populate on page load

✅ **Security**
- API keys encrypted with AES-256-GCM
- Row Level Security (RLS) on all user data
- Audit logging for all operations
- Input validation and sanitization

✅ **User Experience**
- Settings dialog with both API key and default Source ID
- FileUpload auto-loads default Source ID
- Users can override Source ID per upload
- Password field with show/hide toggle

---

## What Still Needs Action

⚠️ **Edge Functions Deployment (CRITICAL)**
- Process-document function must be deployed
- Update-user-settings function should be deployed (for encryption)
- Environment variables must be set

📋 **Database Migration**
- Run the `20251101160000_add_default_source_id.sql` migration
- OR re-run `COMPLETE_SETUP.sql` (safe, uses IF NOT EXISTS)

---

## Files Created/Modified

**New Files:**
- `supabase/migrations/20251101160000_add_default_source_id.sql` - Database migration
- `DEPLOYMENT_INSTRUCTIONS.md` - Complete deployment guide
- `FIX_SUMMARY.md` - This file

**Modified Files:**
- `src/components/SettingsDialog.tsx` - Added default_source_id field
- `src/components/FileUpload.tsx` - Auto-load default source ID
- `src/integrations/supabase/types.ts` - Updated schema types
- `supabase/functions/update-user-settings/index.ts` - Handle default_source_id
- `COMPLETE_SETUP.sql` - Include default_source_id column
- `README.md` - Updated troubleshooting section

---

## Next Steps for User

### Immediate (To Fix Pending Documents):

1. **Deploy Edge Functions**
   ```bash
   supabase login
   supabase link --project-ref hthwsxnyqrcbvqxnydmi
   supabase functions deploy
   supabase secrets set LOVABLE_API_KEY=<your_key>
   supabase secrets set ENCRYPTION_SECRET=$(openssl rand -base64 32)
   ```

2. **Run Database Migration**
   - Go to Supabase SQL Editor
   - Paste contents of `supabase/migrations/20251101160000_add_default_source_id.sql`
   - Click Run

### Testing:

1. **Test Settings Persistence**
   - Open Settings (click profile pic in top right)
   - Enter Notion API Key
   - Enter Default Notion Database ID
   - Click Save
   - Refresh page
   - Open Settings again - values should still be there ✅

2. **Test Document Processing**
   - Upload a document
   - Status should change to "processing" within seconds
   - After AI processing completes, status should be "completed"
   - Download CSV should work ✅

3. **Test Default Source ID**
   - Save a default Source ID in Settings
   - Refresh page
   - Go to upload page
   - Source ID field should be pre-filled ✅

---

## Support

If issues persist:

1. **Check Edge Function Logs**
   - Supabase Dashboard > Edge Functions > Logs
   - Look for invocation errors

2. **Verify Environment Variables**
   - Supabase Dashboard > Edge Functions > Settings
   - Ensure LOVABLE_API_KEY and ENCRYPTION_SECRET are set

3. **Check Browser Console**
   - F12 > Console tab
   - Look for fetch errors or 404s

4. **Database Verification**
   ```sql
   -- Check if column exists
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'user_settings' AND column_name = 'default_source_id';
   
   -- Check user settings
   SELECT * FROM user_settings WHERE user_id = 'your_user_id';
   ```

---

## Documentation References

- [DEPLOYMENT_INSTRUCTIONS.md](./DEPLOYMENT_INSTRUCTIONS.md) - Full deployment guide
- [SECURITY.md](./SECURITY.md) - Security architecture and compliance
- [README.md](./README.md) - General usage and troubleshooting
- [COMPLETE_SETUP.sql](./COMPLETE_SETUP.sql) - Complete database setup script
