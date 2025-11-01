#!/bin/bash

# Simple deployment checker and fixer
# Run this to diagnose and fix deployment issues

echo "========================================="
echo "Doc Sync Notion - Deployment Diagnostics"
echo "========================================="
echo ""

# Check 1: Is Supabase CLI installed?
echo "1. Checking Supabase CLI installation..."
if command -v supabase &> /dev/null; then
    echo "   ✅ Supabase CLI is installed"
    supabase --version
else
    echo "   ❌ Supabase CLI not installed"
    echo "   Installing now..."
    cd /tmp
    curl -fsSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz -o supabase.tar.gz
    tar -xzf supabase.tar.gz
    chmod +x supabase
    sudo mv supabase /usr/local/bin/
    rm supabase.tar.gz
    cd -
    echo "   ✅ Supabase CLI installed"
fi

echo ""

# Check 2: Are you logged in?
echo "2. Checking Supabase authentication..."
if supabase projects list &> /dev/null; then
    echo "   ✅ Logged in to Supabase"
else
    echo "   ❌ Not logged in"
    echo "   Please run: supabase login"
    exit 1
fi

echo ""

# Check 3: Is project linked?
echo "3. Checking project link..."
if [ -f .supabase/config.toml ]; then
    echo "   ✅ Project is linked"
else
    echo "   ❌ Project not linked"
    echo "   Linking now..."
    supabase link --project-ref hthwsxnyqrcbvqxnydmi
    echo "   ✅ Project linked"
fi

echo ""

# Check 4: Deploy edge functions
echo "4. Deploying edge functions..."
echo "   This will deploy:"
echo "   - process-document (for AI OCR)"
echo "   - update-user-settings (for encryption)"
echo ""
read -p "   Deploy edge functions now? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    supabase functions deploy
    echo "   ✅ Edge functions deployed"
else
    echo "   ⚠️  Skipped deployment"
fi

echo ""

# Check 5: Set environment variables
echo "5. Setting environment variables..."
echo ""

# Check if GEMINI_API_KEY is already set
echo "   Checking if GEMINI_API_KEY is set..."
if supabase secrets list | grep -q "GEMINI_API_KEY"; then
    echo "   ✅ GEMINI_API_KEY already set"
else
    echo "   ❌ GEMINI_API_KEY not set"
    echo ""
    echo "   Get your FREE Google Gemini API key:"
    echo "   👉 https://aistudio.google.com/apikey"
    echo ""
    read -p "   Enter your GEMINI_API_KEY (or press Enter to skip): " GEMINI_KEY
    if [ -n "$GEMINI_KEY" ]; then
        supabase secrets set GEMINI_API_KEY="$GEMINI_KEY"
        echo "   ✅ GEMINI_API_KEY set"
    else
        echo "   ⚠️  Skipped - Documents will not process without this!"
    fi
fi

echo ""

# Check if ENCRYPTION_SECRET is already set
echo "   Checking if ENCRYPTION_SECRET is set..."
if supabase secrets list | grep -q "ENCRYPTION_SECRET"; then
    echo "   ✅ ENCRYPTION_SECRET already set"
else
    echo "   ❌ ENCRYPTION_SECRET not set"
    echo "   Generating secure encryption secret..."
    ENC_SECRET=$(openssl rand -base64 32)
    supabase secrets set ENCRYPTION_SECRET="$ENC_SECRET"
    echo "   ✅ ENCRYPTION_SECRET set: $ENC_SECRET"
fi

echo ""
echo "========================================="
echo "Deployment Status Summary"
echo "========================================="
echo ""

# Show current secrets
echo "Environment Variables:"
supabase secrets list

echo ""
echo "Next Steps:"
echo ""
echo "1. ✅ Edge functions deployed"
echo "2. Run database migration in Supabase SQL Editor:"
echo "   https://hthwsxnyqrcbvqxnydmi.supabase.co/project/hthwsxnyqrcbvqxnydmi/sql/new"
echo ""
echo "   Paste and run:"
echo "   ALTER TABLE public.user_settings"
echo "   ADD COLUMN IF NOT EXISTS default_source_id TEXT;"
echo ""
echo "3. Test your app:"
echo "   - Upload a document"
echo "   - Should process: pending → processing → completed"
echo ""
echo "If you see '500 Internal Server Error':"
echo "- Make sure GEMINI_API_KEY is set (see above)"
echo "- Check edge function logs in Supabase Dashboard"
echo ""
