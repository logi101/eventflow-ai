---
phase: quick
plan: 001
type: execute
wave: 1
depends_on: []
files_modified:
  - eventflow-app/.env
  - eventflow-app/supabase/functions/send-push-notification/index.ts
autonomous: false
user_setup:
  - service: supabase
    why: "VAPID keys and edge function secrets"
    env_vars:
      - name: VAPID_PUBLIC_KEY
        source: "Generated via web-push CLI or online generator"
      - name: VAPID_PRIVATE_KEY
        source: "Generated alongside public key"
    dashboard_config:
      - task: "Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY as Edge Function secrets"
        location: "Supabase Dashboard -> Edge Functions -> Manage Secrets"

must_haves:
  truths:
    - "User can enable push notifications from the sidebar toggle"
    - "User receives a test push notification on their device"
    - "Push subscription is stored in push_subscriptions table"
    - "iOS PWA users see installation instructions if not in standalone mode"
  artifacts:
    - path: "eventflow-app/.env"
      provides: "VITE_VAPID_PUBLIC_KEY environment variable"
      contains: "VITE_VAPID_PUBLIC_KEY"
    - path: "eventflow-app/supabase/functions/send-push-notification/index.ts"
      provides: "Edge function for RFC 8291 web push delivery"
      exports: ["Deno.serve handler"]
    - path: "eventflow-app/src/hooks/usePushNotifications.ts"
      provides: "React hook for push subscription management"
      exports: ["usePushNotifications"]
    - path: "eventflow-app/src/components/PushNotificationSettings.tsx"
      provides: "Push notification toggle UI component"
      exports: ["PushNotificationSettings"]
    - path: "eventflow-app/public/sw-push.js"
      provides: "Push notification service worker"
    - path: "eventflow-app/supabase/migrations/20260129000001_push_subscriptions.sql"
      provides: "Database migration for push_subscriptions table"
  key_links:
    - from: "PushNotificationSettings.tsx"
      to: "usePushNotifications hook"
      via: "React hook import"
      pattern: "usePushNotifications"
    - from: "usePushNotifications.ts"
      to: "sw-push.js"
      via: "navigator.serviceWorker.register('/sw-push.js')"
      pattern: "register.*sw-push"
    - from: "usePushNotifications.ts"
      to: "push_subscriptions table"
      via: "supabase.from('push_subscriptions').upsert"
      pattern: "push_subscriptions.*upsert"
    - from: "PushNotificationSettings.tsx"
      to: "send-push-notification edge function"
      via: "supabase.functions.invoke('send-push-notification')"
      pattern: "send-push-notification"
    - from: "Sidebar.tsx"
      to: "PushNotificationSettings.tsx"
      via: "import and render in sidebar"
      pattern: "PushNotificationSettings"
---

<objective>
Complete iOS PWA Push Notification setup for EventFlow AI.

Purpose: Enable push notifications for iOS PWA and all browsers so event managers receive real-time alerts about event updates, participant RSVPs, and reminders.

Output: Fully working push notification flow - user toggles on in sidebar, receives test notification, subscriptions persist in database.

CRITICAL CONTEXT - Most code already exists from a recent git pull. This plan focuses on:
1. Applying the database migration to production Supabase
2. Generating VAPID keys and configuring them
3. Deploying the edge function
4. Adding VITE_VAPID_PUBLIC_KEY to .env
5. Verifying the full flow works end-to-end
</objective>

<execution_context>
@/Users/eliyawolfman/.claude/get-shit-done/workflows/execute-plan.md
@/Users/eliyawolfman/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@eventflow-app/vite.config.ts
@eventflow-app/public/sw-push.js
@eventflow-app/src/hooks/usePushNotifications.ts
@eventflow-app/src/components/PushNotificationSettings.tsx
@eventflow-app/supabase/functions/send-push-notification/index.ts
@eventflow-app/supabase/migrations/20260129000001_push_subscriptions.sql
@eventflow-app/src/components/layout/Sidebar.tsx
@eventflow-app/.env
@eventflow-app/index.html
@eventflow-app/src/index.css
</context>

<audit_summary>
## Existing Files Audit (All pulled from GitHub)

All existing code is CORRECT and ready to use. Here is the audit:

| File | Status | Notes |
|------|--------|-------|
| `vite.config.ts` | GOOD | VitePWA configured with manifest, icons, workbox caching. Has `@` path alias to `./src` |
| `index.html` | GOOD | Has apple-mobile-web-app-capable, viewport-fit=cover, apple-touch-icon |
| `index.css` | GOOD | Has safe-area CSS classes (safe-area-bottom, safe-area-top, etc.) at lines 787-803 |
| `sw-push.js` | GOOD | Handles push events, notification click/close, RTL dir='rtl', Hebrew lang='he' |
| `usePushNotifications.ts` | GOOD | Uses `@/lib/supabase` (correct with vite alias). iOS detection, PWA detection, subscribe/unsubscribe |
| `PushNotificationSettings.tsx` | GOOD | Uses `@/hooks/usePushNotifications` and `@/lib/supabase` (both correct). Self-contained with lucide-react icons. Shows iOS install instructions. Has test send button. |
| `Sidebar.tsx` | GOOD | Already imports and renders `<PushNotificationSettings />` in sidebar (lines 37, 385-390) |
| `send-push-notification/index.ts` | GOOD | Full RFC 8291 implementation (ECDH + HKDF + aes128gcm). VAPID JWT generation. Handles 410 cleanup. |
| `push_subscriptions.sql` | GOOD | Creates table with RLS policies (insert/select/delete for own user) |
| `.env` | MISSING `VITE_VAPID_PUBLIC_KEY` | Only has VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY |

## What Still Needs to Happen

1. **Generate VAPID key pair** (ECDSA P-256)
2. **Add `VITE_VAPID_PUBLIC_KEY` to `.env`** so the frontend can use it
3. **Set VAPID secrets on Supabase** (VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY as edge function secrets)
4. **Apply database migration** (push_subscriptions table to production)
5. **Deploy the edge function** (send-push-notification)
6. **Verify the full flow** end-to-end
</audit_summary>

<tasks>

<task type="auto">
  <name>Task 1: Generate VAPID keys, configure environment, apply migration, deploy edge function</name>
  <files>eventflow-app/.env</files>
  <action>
  This task sets up all the infrastructure needed for push notifications to work.

  **Step 1: Generate VAPID key pair**
  Use Node.js crypto to generate an ECDSA P-256 key pair for VAPID:
  ```bash
  cd eventflow-app
  node -e "
    const crypto = require('crypto');
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
    const pubRaw = publicKey.export({ type: 'spki', format: 'der' });
    // SPKI DER for P-256: 26-byte header + 65-byte uncompressed point
    const pubBytes = pubRaw.slice(pubRaw.length - 65);
    const pubB64url = Buffer.from(pubBytes).toString('base64url');
    const privJwk = privateKey.export({ type: 'pkcs8', format: 'der' });
    // Extract 32-byte private scalar from PKCS8 DER
    const privKeyJwk = crypto.createPrivateKey({ key: privateKey.export({ format: 'jwk' }) });
    const jwk = privateKey.export({ format: 'jwk' });
    console.log('VAPID_PUBLIC_KEY=' + pubB64url);
    console.log('VAPID_PRIVATE_KEY=' + jwk.d);
    console.log('');
    console.log('Add to .env:');
    console.log('VITE_VAPID_PUBLIC_KEY=' + pubB64url);
  "
  ```

  Alternatively, if `web-push` npm package is available or can be installed:
  ```bash
  npx web-push generate-vapid-keys --json
  ```

  **Step 2: Add VITE_VAPID_PUBLIC_KEY to .env**
  Append the public key to `eventflow-app/.env`:
  ```
  VITE_VAPID_PUBLIC_KEY=<generated-public-key>
  ```

  **Step 3: Set Supabase Edge Function secrets**
  Use the Supabase CLI to set the VAPID keys as secrets:
  ```bash
  cd eventflow-app
  npx supabase secrets set VAPID_PUBLIC_KEY=<generated-public-key> VAPID_PRIVATE_KEY=<generated-private-key>
  ```
  If the CLI is not authenticated, fall back to a checkpoint for the user to set them via the Supabase dashboard.

  **Step 4: Apply the database migration**
  Run the migration against production Supabase:
  ```bash
  cd eventflow-app
  npx supabase db push
  ```
  If CLI auth is an issue, output the SQL for the user to run manually:
  The SQL is in `supabase/migrations/20260129000001_push_subscriptions.sql`

  **Step 5: Deploy the edge function**
  ```bash
  cd eventflow-app
  npx supabase functions deploy send-push-notification --no-verify-jwt
  ```
  The `--no-verify-jwt` flag is needed because the function is called from the authenticated frontend (which passes the auth header) but we want the function to also be callable for server-to-server push sending without a user JWT.

  IMPORTANT: If Supabase CLI is not linked/authenticated, create a checkpoint for the user to:
  1. Run `npx supabase link --project-ref byhohetafnhlakqbydbj` first
  2. Then retry the above commands
  </action>
  <verify>
  - `.env` contains VITE_VAPID_PUBLIC_KEY with a base64url-encoded string (should be 87 chars, no padding)
  - `npx supabase secrets list` shows VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY
  - `npx supabase functions list` shows send-push-notification as deployed
  - Run `npx supabase db push` shows migration applied (or already exists)
  </verify>
  <done>
  - VAPID key pair generated and configured in both .env (public) and Supabase secrets (both)
  - push_subscriptions table exists in production database with RLS policies
  - send-push-notification edge function deployed with --no-verify-jwt
  </done>
</task>

<task type="auto">
  <name>Task 2: Build verification and smoke test</name>
  <files></files>
  <action>
  Verify the full stack is wired correctly without runtime errors.

  **Step 1: Verify build passes**
  ```bash
  cd eventflow-app
  npm run build
  ```
  Ensure no TypeScript errors related to push notification files. Key files that must compile:
  - `src/hooks/usePushNotifications.ts` (imports `@/lib/supabase`)
  - `src/components/PushNotificationSettings.tsx` (imports `@/hooks/usePushNotifications`, `@/lib/supabase`)
  - `src/components/layout/Sidebar.tsx` (imports `../PushNotificationSettings`)

  **Step 2: Verify service worker is in build output**
  After build, check that `sw-push.js` exists in the dist output:
  ```bash
  ls eventflow-app/dist/sw-push.js
  ```
  Since `sw-push.js` is in `public/`, Vite copies it to `dist/` as-is.

  **Step 3: Verify manifest includes correct config**
  Check the generated manifest in dist:
  ```bash
  cat eventflow-app/dist/manifest.webmanifest
  ```
  Should show `display: standalone`, correct icons, and app name.

  **Step 4: Verify .env has the VAPID key**
  ```bash
  grep VITE_VAPID_PUBLIC_KEY eventflow-app/.env
  ```
  Should output a non-empty value.
  </action>
  <verify>
  - `npm run build` completes with exit code 0
  - `dist/sw-push.js` exists
  - `dist/manifest.webmanifest` contains `"display":"standalone"`
  - `.env` has VITE_VAPID_PUBLIC_KEY set
  </verify>
  <done>
  - Build passes with no errors
  - Service worker present in build output
  - PWA manifest correctly configured
  - All environment variables in place
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
  Complete iOS PWA push notification system:
  - VAPID keys generated and configured (frontend .env + Supabase secrets)
  - push_subscriptions database table with RLS policies
  - send-push-notification edge function deployed
  - PushNotificationSettings component integrated in sidebar
  - Service worker (sw-push.js) handles push events with RTL Hebrew notifications
  </what-built>
  <how-to-verify>
  1. Start the dev server: `cd eventflow-app && npm run dev`
  2. Open the app in Chrome/Edge at http://localhost:8080
  3. Log in to the app
  4. Look at the sidebar -- you should see a "Push Notifications" toggle card
  5. Click the toggle to enable notifications
  6. Accept the browser permission prompt
  7. The toggle should turn green and show "Active" (or Hebrew equivalent)
  8. Click "Send Test Notification" button that appears
  9. You should receive a browser notification with Hebrew text

  **For iOS testing (optional):**
  1. Deploy to a public HTTPS URL (e.g., Vercel)
  2. Open in Safari on iPhone/iPad
  3. Tap Share -> "Add to Home Screen"
  4. Open the app from home screen (standalone mode)
  5. Enable push notifications from sidebar
  6. Send test notification
  </how-to-verify>
  <resume-signal>Type "approved" if notifications work, or describe any issues</resume-signal>
</task>

</tasks>

<verification>
- `npm run build` passes with no TypeScript errors
- `dist/sw-push.js` exists in build output
- `dist/manifest.webmanifest` has `display: standalone`
- `.env` has `VITE_VAPID_PUBLIC_KEY` set to a base64url string
- Supabase secrets include VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY
- send-push-notification edge function is deployed
- push_subscriptions table exists with RLS enabled
- PushNotificationSettings renders in sidebar
- User can toggle notifications on/off
- Test notification is received
</verification>

<success_criteria>
- Push notification toggle appears in sidebar and functions correctly
- Enabling notifications creates a push_subscriptions record in the database
- "Send Test Notification" button triggers a real push notification via the edge function
- iOS users in Safari (not PWA) see installation instructions
- iOS users in PWA standalone mode can subscribe to push notifications
- Build passes cleanly with no errors
</success_criteria>

<output>
After completion, create `.planning/quick/001-ios-pwa-push-notifications/001-SUMMARY.md`
</output>
