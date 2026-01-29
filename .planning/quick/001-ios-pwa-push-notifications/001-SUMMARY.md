# Quick Task 001: iOS PWA Push Notifications

## Status: PARTIAL - Frontend deployed, backend needs one-time setup

## What was done

### Audit Results
All 9 files from the git pull are correct and ready:
| File | Status |
|------|--------|
| `vite.config.ts` | VitePWA configured with manifest, icons, workbox |
| `index.html` | Has apple-mobile-web-app-capable, viewport-fit=cover |
| `index.css` | Has safe-area CSS classes |
| `sw-push.js` | Push events, notification click, RTL Hebrew |
| `usePushNotifications.ts` | iOS detection, PWA detection, subscribe/unsubscribe |
| `PushNotificationSettings.tsx` | Toggle UI, test button, iOS install instructions |
| `Sidebar.tsx` | Already integrates PushNotificationSettings |
| `send-push-notification/index.ts` | RFC 8291 encryption, VAPID JWT |
| `push_subscriptions.sql` | Table with RLS policies |

### Completed
1. Generated VAPID key pair (ECDSA P-256)
2. Added `VITE_VAPID_PUBLIC_KEY` to `.env`
3. Verified hook reads from `import.meta.env.VITE_VAPID_PUBLIC_KEY`
4. Build passes (`npm run build` - clean)
5. PWA artifacts verified: `sw-push.js`, `manifest.webmanifest` (display: standalone)
6. Deployed to Firebase: https://eventflow-ai-prod.web.app
7. Created setup script: `scripts/setup-push-notifications.sh`

### Requires manual terminal step
The Supabase CLI requires TTY authentication (browser-based login). Run once:
```bash
cd eventflow-app && bash scripts/setup-push-notifications.sh
```
This script handles: login, link project, set VAPID secrets, apply migration, deploy edge function.

## VAPID Keys
- Public: `BLQDKcWNcb0_kaJSGDA93BWRqBc3pjB10HeliCHTTVrx-aFnE2I9xuqbrTTJj0tmnUEc9U4BV1JL3MapU6EiAoc`
- Private: stored in script only (not committed to git)

## Edge Function Status
| Function | Deployed |
|----------|----------|
| send-whatsapp | Yes |
| send-reminder | Yes |
| ai-chat | Yes |
| send-push-notification | **Not yet** (needs script) |

## Verification Checklist
- [x] `npm run build` passes
- [x] `dist/sw-push.js` exists
- [x] `dist/manifest.webmanifest` has `display: standalone`
- [x] `.env` has `VITE_VAPID_PUBLIC_KEY`
- [x] Frontend deployed to Firebase
- [ ] Supabase secrets set (VAPID keys)
- [ ] push_subscriptions table created
- [ ] send-push-notification function deployed
- [ ] End-to-end test notification received
