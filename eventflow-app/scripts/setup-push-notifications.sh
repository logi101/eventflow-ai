#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# EventFlow AI - Push Notifications Backend Setup
# Run this ONCE from your terminal: bash scripts/setup-push-notifications.sh
# ═══════════════════════════════════════════════════════════════════════════

set -e
cd "$(dirname "$0")/.."

PROJECT_REF="byhohetafnhlakqbydbj"
VAPID_PUBLIC="BLQDKcWNcb0_kaJSGDA93BWRqBc3pjB10HeliCHTTVrx-aFnE2I9xuqbrTTJj0tmnUEc9U4BV1JL3MapU6EiAoc"
VAPID_PRIVATE="Xz4kUPfvX-ov5-8oMTr4he7zoAl5t6Gr2DKRgeEpFKc"

echo "═══════════════════════════════════════════════════"
echo "  EventFlow AI - Push Notifications Setup"
echo "═══════════════════════════════════════════════════"
echo ""

# Step 1: Login
echo "Step 1/4: Authenticating with Supabase..."
supabase login
echo "✅ Authenticated"
echo ""

# Step 2: Link project
echo "Step 2/4: Linking project..."
supabase link --project-ref $PROJECT_REF
echo "✅ Project linked"
echo ""

# Step 3: Set VAPID secrets
echo "Step 3/4: Setting VAPID secrets..."
supabase secrets set \
  VAPID_PUBLIC_KEY="$VAPID_PUBLIC" \
  VAPID_PRIVATE_KEY="$VAPID_PRIVATE"
echo "✅ VAPID secrets set"
echo ""

# Step 4: Apply DB migration
echo "Step 4/4: Applying database migration..."
supabase db push
echo "✅ Database migration applied"
echo ""

# Step 5: Deploy edge function
echo "Step 5/5: Deploying send-push-notification edge function..."
supabase functions deploy send-push-notification --no-verify-jwt
echo "✅ Edge function deployed"
echo ""

echo "═══════════════════════════════════════════════════"
echo "  ✅ Setup Complete!"
echo "═══════════════════════════════════════════════════"
echo ""
echo "Test: Open the app → Sidebar → Toggle Push Notifications → Send Test"
