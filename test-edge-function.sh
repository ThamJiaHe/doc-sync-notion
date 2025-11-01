#!/bin/bash

# Test edge function diagnostics
# This script helps debug edge function issues

echo "=== Edge Function Diagnostics ==="
echo ""

echo "1. Checking Supabase secrets..."
supabase secrets list | grep -E "GEMINI|ENCRYPTION"
echo ""

echo "2. Testing Gemini API key..."
GEMINI_KEY=$(supabase secrets list | grep GEMINI_API_KEY | awk '{print $NF}')
if [ -n "$GEMINI_KEY" ]; then
    echo "✓ GEMINI_API_KEY is set"
else
    echo "✗ GEMINI_API_KEY is NOT set"
fi
echo ""

echo "3. Checking deployed functions..."
supabase functions list
echo ""

echo "=== Test Complete ==="
echo ""
echo "To view edge function logs in real-time:"
echo "Open: https://supabase.com/dashboard/project/hthwsxnyqrcbvqxnydmi/logs/edge-functions"
echo ""
echo "Or upload a document and check browser console for detailed errors"
