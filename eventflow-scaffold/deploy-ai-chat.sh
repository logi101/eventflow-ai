#!/bin/bash
# Deploy ai-chat Edge Function to Supabase
# Run: bash deploy-ai-chat.sh
# Requires: supabase CLI logged in, OR set SUPABASE_ACCESS_TOKEN env var
# To get token: Supabase Dashboard > Account (top-right) > Access Tokens > Generate

PROJECT_REF="byhohetafnhlakqbydbj"

echo "=== Deploying ai-chat Edge Function (v7) to Supabase ==="
echo "Project: $PROJECT_REF"
echo ""

# Check if logged in
if ! supabase projects list &>/dev/null; then
  echo "Not logged in. Attempting login..."
  supabase login
  if [ $? -ne 0 ]; then
    echo "Login failed. Please set SUPABASE_ACCESS_TOKEN or run: supabase login"
    exit 1
  fi
fi

cd /Users/eliyawolfman/claude_brain/projects/eventflows/eventflow-scaffold
echo "Working directory: $(pwd)"
echo ""

# Deploy the function
echo "Deploying ai-chat function..."
supabase functions deploy ai-chat --project-ref "$PROJECT_REF"

if [ $? -eq 0 ]; then
  echo ""
  echo "=== SUCCESS: ai-chat v7 deployed ==="
  echo "Test with:"
  echo "  curl -X POST https://$PROJECT_REF.supabase.co/functions/v1/ai-chat \\"
  echo "    -H 'Content-Type: application/json' \\"
  echo "    -H 'Authorization: Bearer YOUR_ANON_KEY' \\"
  echo '    -d '\''{"message":"שלום, אני רוצה ליצור אירוע חדש","context":{"currentPage":"dashboard","availableCommands":[]},"agent":"general","conversationHistory":[]}'\'''
else
  echo ""
  echo "=== FAILED: Deployment error ==="
  echo "Try: supabase login (to authenticate first)"
fi
