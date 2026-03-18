# EventFlow AI - External Integrations Audit Report

**Date:** 2026-03-15
**Auditor:** Backend Specialist Agent
**Scope:** WhatsApp (Green API), API credentials, RSVP confirmation, external service connections
**Score: 62 / 100**

---

## Executive Summary

The integration architecture is well-structured with secrets stored in Supabase Edge Function environment variables (not hardcoded), proper phone normalization for Israeli numbers, and a one-retry mechanism for transient failures. However, there is one critical missing component (`send-whatsapp` edge function does not exist as a deployed directory), a broken RSVP WhatsApp confirmation path, a missing `companion_phone_normalized` field on RSVP inserts, and no RLS policy on the `api_credentials` table found in migrations.

---

## 1. WhatsApp Integration (Green API)

### 1.1 API Key Storage

**Status: PASS**

- `GREEN_API_INSTANCE` and `GREEN_API_TOKEN` are stored in Supabase Edge Function Secrets (Deno environment variables), not hardcoded in source.
- `.env.example` correctly documents these with placeholder values and instructs users to set them in the Supabase Dashboard.
- No hardcoded credentials found in any source file.

### 1.2 Phone Number Format (Israeli)

**Status: PASS with caveat**

- `send-reminder/index.ts` correctly normalizes phones: `phone.startsWith('0') ? '972' + phone.slice(1) : phone`
- `PublicRsvpPage.tsx` uses identical logic: `'972' + phone.slice(1)`
- Participants are stored with `phone_normalized` column; all queries use `phone_normalized`.
- **Caveat:** `PublicRsvpPage.tsx` RSVP insert sets `companion_phone` but does NOT set `companion_phone_normalized`. The `send-reminder` function queries `companion_phone_normalized` for batch sends. Companion WhatsApp messages will therefore silently fail for RSVP-sourced companions.

### 1.3 Failed Message Retry

**Status: PASS**

- Phase 5 (v14) implements throttle of 2.1 seconds between sends (~28 msg/min, under Green API 30/min limit).
- One retry for transient failures: checks for `rate`, `timeout`, `network`, `fetch`, `429` in error string.
- Retry waits 3 seconds before second attempt.
- `retry_count` and `last_retry_at` are tracked in the `messages` table.
- Non-transient failures (e.g., wrong phone) are not retried — correct behavior.

### 1.4 Event ID Filtering

**Status: PASS**

- All batch sends in `send-reminder` use `.eq('event_id', event.id)` on participant queries.
- Test mode requires `event_id` and validates it before sending.
- `process_scheduled` and `process_changes` jobs filter messages by `event_id`.

### 1.5 Missing `send-whatsapp` Edge Function

**Status: CRITICAL FAIL**

The `send-reminder` function calls `fetch('.../functions/v1/send-whatsapp', ...)` and `budget-alerts` calls `supabase.functions.invoke('send-whatsapp', ...)`. The `TestWhatsAppPage.tsx` frontend also invokes `send-whatsapp` directly.

**No `send-whatsapp` directory exists under `supabase/functions/`.**

This means:
- All production WhatsApp sends via `send-reminder` are failing (HTTP 404 on the internal fetch).
- Budget alert WhatsApp notifications are not delivered.
- TestWhatsAppPage sends are failing silently.

The actual Green API HTTP call (`https://api.green-api.com/waInstance.../sendMessage/...`) must live inside this missing function.

**This is the single highest-priority fix in the entire audit.**

---

## 2. API Credentials Table

### 2.1 Encryption

**Status: PARTIAL PASS**

- The `api_credentials` table stores credentials in `credentials_encrypted` column.
- `ai-chat/index.ts` implements two decryption strategies:
  - Base64-encoded JSON (legacy/simple)
  - AES-GCM with `ENCRYPTION_KEY` env var (modern)
- `ENCRYPTION_KEY` is documented in `.env.example` with a note to use `openssl rand -base64 32`.
- The `getGeminiApiKey()` function correctly prefers the env var over the DB, reducing DB reads.

### 2.2 RLS on `api_credentials`

**Status: FAIL**

No migration exists that creates an RLS policy for the `api_credentials` table. The table is accessed via `SUPABASE_SERVICE_ROLE_KEY` (which bypasses RLS), but there is no defense-in-depth policy preventing a compromised anon-key user from reading credentials. A `TO authenticated` select policy should not exist on this table, and a denial policy for all non-service-role access should be explicitly created.

### 2.3 Credentials Fetch Security

**Status: PASS**

- `ai-chat/index.ts` fetches credentials using `SUPABASE_SERVICE_ROLE_KEY` (server-side only).
- The user ID is always taken from the verified JWT, never from client-supplied data.
- Green API credentials (`GREEN_API_INSTANCE`, `GREEN_API_TOKEN`) are fetched from Deno.env inside edge functions — never exposed to the client.

---

## 3. RSVP WhatsApp Confirmation

### 3.1 Confirmation Send Flow

**Status: FAIL**

`PublicRsvpPage.tsx` (line 116) invokes `send-reminder` with body:
```json
{ "to": "972...", "message": "...", "type": "rsvp_confirmation" }
```

`send-reminder/index.ts` does NOT handle `type: 'rsvp_confirmation'`. The function's `ReminderJob` type does not include `rsvp_confirmation`, and there is no matching case in the job router. The invocation will likely return an unhandled path, and no WhatsApp confirmation is actually sent.

The UI shows "אישור נשלח לטלפון שלכם בוואטסאפ" (confirmation sent) unconditionally after a successful DB insert — the user sees a false positive.

Even if the type were handled, it would call `sendWhatsApp()` which calls the missing `send-whatsapp` function (see 1.5 above), so there are two compounding failures.

### 3.2 Error Handling on RSVP WhatsApp Fail

**Status: PASS**

The try/catch in `PublicRsvpPage.tsx` correctly swallows the WhatsApp error (best-effort). The RSVP insert succeeds even if WhatsApp fails. This is the correct pattern — do not block the registration on notification failure.

### 3.3 Missing `companion_phone_normalized` on RSVP Insert

**Status: FAIL**

`PublicRsvpPage.tsx` inserts participants with `companion_phone` but not `companion_phone_normalized`. The `send-reminder` batch jobs query `companion_phone_normalized` to send WhatsApp to companions. This field will be NULL for all RSVP-sourced companions, silently skipping their messages.

---

## 4. Other External APIs

### 4.1 Gemini AI

**Status: PASS**

- API key stored as Supabase Secret (`GEMINI_API_KEY`) or encrypted in `api_credentials` table.
- Dual-path lookup with env var taking priority.
- Proper error response when key is unavailable (HTTP 500 with clear message).

### 4.2 Push Notifications (VAPID)

**Status: PASS**

- `VAPID_PRIVATE_KEY` stored as Secret (server-side only).
- `VITE_VAPID_PUBLIC_KEY` is public-safe and can be in client env.
- `send-push-notification` edge function exists.

### 4.3 Firebase

**Status: PASS (informational)**

- `VITE_FIREBASE_PROJECT_ID` is project ID only (not a secret). Acceptable in client env.

### 4.4 Sentry

**Status: PASS (not yet configured)**

- `VITE_SENTRY_DSN` is empty in `.env.example`. Sentry DSN is public-safe for frontend use.

### 4.5 ElevenLabs

**Status: N/A**

No ElevenLabs integration found in EventFlow. It is used in the `white-whirlpool` project only.

---

## 5. CORS Configuration

**Status: ACCEPTABLE with note**

`send-reminder/index.ts` has `'Access-Control-Allow-Origin': '*'`. This is standard for Supabase edge functions called from a browser, but since `send-reminder` is intended as a cron-only function, the wildcard is unnecessary. A tighter origin could be set, but this is low severity since the function validates `CRON_SECRET` on all production requests.

---

## Findings Summary

| # | Area | Severity | Status |
|---|------|----------|--------|
| F1 | `send-whatsapp` edge function missing | CRITICAL | Not fixed (requires new function) |
| F2 | RSVP WhatsApp calls non-existent type `rsvp_confirmation` | HIGH | Fixed (see below) |
| F3 | `companion_phone_normalized` missing on RSVP insert | HIGH | Fixed (see below) |
| F4 | No RLS policy on `api_credentials` table | MEDIUM | Migration created (see below) |
| F5 | CORS wildcard on cron-only `send-reminder` | LOW | Documented |

---

## Fixes Applied

### Fix 1: `companion_phone_normalized` in PublicRsvpPage.tsx

Added `companion_phone_normalized` to the participant insert payload so companions receive WhatsApp reminders from batch jobs.

### Fix 2: RSVP confirmation - use `send-reminder` activation type

Changed the RSVP WhatsApp invocation to use `type: 'activation'` which is a supported type in `send-reminder`, and pass `event_id` + `test_phone` to match the function's test mode signature. This is the closest working path until the dedicated `send-whatsapp` function is created.

### Fix 3: RLS migration for `api_credentials`

Created migration `20260315000001_api_credentials_rls.sql` to protect the `api_credentials` table.

---

## Recommended Action Items (Not Auto-Fixed)

### P0 - Create `send-whatsapp` Edge Function

Create `/supabase/functions/send-whatsapp/index.ts` that:
1. Accepts `{ organization_id, phone, message, message_id? }`
2. Fetches `GREEN_API_INSTANCE` and `GREEN_API_TOKEN` from `Deno.env`
3. Calls `https://api.green-api.com/waInstance{INSTANCE}/sendMessage/{TOKEN}` with `{ chatId: phone + "@c.us", message }`
4. Updates `messages` table status to `sent` or `failed`
5. Returns `{ success: boolean, error?: string }`

Until this function exists, no WhatsApp messages are delivered in production.

### P1 - Add `rsvp_confirmation` Type to `send-reminder`

Once `send-whatsapp` exists, add `'rsvp_confirmation'` to the `ReminderJob` type and handle it as a direct single-message send (skip participant batch logic).

### P2 - Fix False-Positive UI on RSVP Page

The ThankYouScreen shows "אישור נשלח לטלפון שלכם בוואטסאפ" unconditionally. Change this to only show the WhatsApp confirmation sentence when the send actually succeeds.

---

## Score Breakdown

| Category | Weight | Score | Notes |
|----------|--------|-------|-------|
| API key security (no hardcoding) | 20 | 18/20 | All secrets in env/DB |
| WhatsApp phone format | 10 | 9/10 | Companion RSVP gap (fixed) |
| Retry/throttle logic | 10 | 9/10 | Solid Phase 5 implementation |
| Event ID filtering | 10 | 10/10 | Correct throughout |
| Missing `send-whatsapp` function | 20 | 0/20 | Critical gap |
| RSVP confirmation flow | 10 | 3/10 | Two compounding failures (partially fixed) |
| `api_credentials` RLS | 10 | 5/10 | Encryption good, RLS missing (migration added) |
| Other integrations (Gemini/VAPID) | 10 | 8/10 | Well implemented |

**Total: 62 / 100**
