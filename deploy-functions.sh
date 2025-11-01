#!/bin/bash

# Deployment script for Supabase Edge Functions
# This script automates the deployment of edge functions to Supabase

set -e  # Exit on error

echo "==================================="
echo "Supabase Edge Functions Deployment"
echo "==================================="
echo ""

# Step 1: Install Supabase CLI if not installed
if ! command -v supabase &> /dev/null; then
    echo "📦 Installing Supabase CLI..."
    cd /tmp
    curl -fsSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz -o supabase.tar.gz
    tar -xzf supabase.tar.gz
    chmod +x supabase
    sudo mv supabase /usr/local/bin/
    rm supabase.tar.gz
    cd -
    echo "✅ Supabase CLI installed successfully"
    supabase --version
else
    echo "✅ Supabase CLI already installed"
    supabase --version
fi

echo ""

# Step 2: Login to Supabase
echo "🔐 Logging into Supabase..."
echo "Please follow the authentication prompts in your browser."
supabase login

echo ""

# Step 3: Link to project
echo "🔗 Linking to Supabase project..."
supabase link --project-ref hthwsxnyqrcbvqxnydmi

echo ""

# Step 4: Deploy functions
echo "🚀 Deploying edge functions..."
supabase functions deploy

echo ""

# Step 5: Set secrets
echo "🔑 Setting environment secrets..."

# Generate encryption secret
ENCRYPTION_SECRET=$(openssl rand -base64 32)
echo "Generated ENCRYPTION_SECRET: $ENCRYPTION_SECRET"
supabase secrets set ENCRYPTION_SECRET="$ENCRYPTION_SECRET"

# Prompt for GEMINI_API_KEY
echo ""
echo "⚠️  IMPORTANT: You need to set GEMINI_API_KEY"
echo "Get your FREE Google Gemini API key from: https://aistudio.google.com/apikey"
echo "This is completely FREE (no credit card required) and gives you 1500 requests/day!"
echo ""
read -p "Enter your GEMINI_API_KEY: " GEMINI_API_KEY

if [ -n "$GEMINI_API_KEY" ]; then
    supabase secrets set GEMINI_API_KEY="$GEMINI_API_KEY"
    echo "✅ GEMINI_API_KEY set successfully"
else
    echo "⚠️  WARNING: GEMINI_API_KEY not set. Document processing will not work."
    echo "You can set it later with: supabase secrets set GEMINI_API_KEY=your_key"
fi

echo ""
echo "==================================="
echo "✅ Deployment Complete!"
echo "==================================="
echo ""
echo "Next steps:"
echo "1. Run the database migration (see DEPLOYMENT_INSTRUCTIONS.md)"
echo "2. Test document upload and processing"
echo "3. Verify settings persistence works"
echo ""
echo "Secrets configured:"
echo "  - ENCRYPTION_SECRET: ✅ Set (generated: $ENCRYPTION_SECRET)"
if [ -n "$GEMINI_API_KEY" ]; then
    echo "  - GEMINI_API_KEY: ✅ Set"
else
    echo "  - GEMINI_API_KEY: ❌ Not set (REQUIRED for document processing)"
fi
echo ""
