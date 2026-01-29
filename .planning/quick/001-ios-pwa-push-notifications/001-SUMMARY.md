# Quick Task 001: iOS PWA Push Notifications

## Status: COMPLETE - Full stack deployed (frontend + backend)

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

### Backend Setup (completed via Management API)
8. Created `push_subscriptions` table with RLS (3 policies: INSERT, SELECT, DELETE)
9. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY as Supabase Edge Function secrets
10. Deployed `send-push-notification` Edge Function (--no-verify-jwt)

## VAPID Keys
- Public: `BLQDKcWNcb0_kaJSGDA93BWRqBc3pjB10HeliCHTTVrx-aFnE2I9xuqbrTTJj0tmnUEc9U4BV1JL3MapU6EiAoc`
- Private: stored in script only (not committed to git)

## Edge Function Status
| Function | Deployed |
|----------|----------|
| send-whatsapp | Yes |
| send-reminder | Yes |
| ai-chat | Yes |
| send-push-notification | Yes |

## Verification Checklist
- [x] `npm run build` passes
- [x] `dist/sw-push.js` exists
- [x] `dist/manifest.webmanifest` has `display: standalone`
- [x] `.env` has `VITE_VAPID_PUBLIC_KEY`
- [x] Frontend deployed to Firebase
- [x] Supabase secrets set (VAPID keys)
- [x] push_subscriptions table created (with RLS + 3 policies)
- [x] send-push-notification function deployed
- [ ] End-to-end test notification received (requires iOS device in PWA mode)
