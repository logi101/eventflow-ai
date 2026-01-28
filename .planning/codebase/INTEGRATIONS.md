# External Integrations

**Analysis Date:** 2026-01-28

## APIs & External Services

**Backend Services (via Supabase Edge Functions):**
- Gemini API - AI chat and content generation
  - SDK: None (invoked via Supabase Edge Function `ai-chat`)
  - Auth: `GEMINI_API_KEY` (set in Supabase dashboard, not frontend)
  - Used by: `src/services/chatService.ts`, AI routing system

- Green API - WhatsApp messaging
  - SDK: None (invoked via Supabase Edge Function `send-whatsapp`)
  - Auth: `GREEN_API_INSTANCE`, `GREEN_API_TOKEN` (set in Supabase dashboard)
  - Used by: `src/App.tsx`, `src/pages/admin/TestWhatsAppPage.tsx`, `src/pages/program/ProgramManagementPage.tsx`
  - Endpoints: `supabase.functions.invoke('send-whatsapp')`

**Google Services:**
- Google Calendar - Calendar sync and scheduling
  - Status: Planned (Phase 5 premium feature)
  - Located in: `src/lib/integrations/README.md`
  - Not yet implemented in codebase

## Data Storage

**Databases:**
- PostgreSQL (via Supabase)
  - Connection: `VITE_SUPABASE_URL` (frontend-safe public URL)
  - Client: `@supabase/supabase-js` 2.90.1
  - Location: `src/lib/supabase.ts`
  - Authentication: Supabase Auth with RLS (Row-Level Security)
  - Core tables: organizations, user_profiles, events, participants, vendors, event_vendors, schedules, checklist_items, messages, message_templates, feedback_surveys, ai_chat_sessions

**File Storage:**
- Local filesystem only - No cloud storage integration
- Excel/CSV files handled client-side with `xlsx` and `papaparse`
- Generated files exported to user's browser downloads

**Caching:**
- TanStack Query - In-memory caching with stale-time strategy
  - Default: 5-minute stale time
  - Located in: `src/main.tsx` QueryClient configuration
- Supabase realtime subscriptions - Enabled for live data sync

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (PostgreSQL-backed)
  - Implementation: JWT tokens, session management
  - Location: `src/contexts/AuthContext.tsx`
  - User table: `user_profiles` (mapped to Supabase Auth users)
  - Features: Email/password auth, session persistence
  - Used in: All authenticated pages and API calls

## Monitoring & Observability

**Error Tracking:**
- Not detected - No external error tracking service

**Logs:**
- Browser console logging
- Supabase function logs (server-side)

## CI/CD & Deployment

**Hosting:**
- Firebase Hosting
  - Config: `firebase.json` with SPA rewrites
  - Deployment: `npm run deploy` (build → Firebase)
  - Preview deployments: `npm run deploy:preview`

**Build Pipeline:**
- Vite build process (`npm run build`)
- Type checking: `tsc -b`
- Linting: `eslint .`
- No CI/CD automation detected (manual deployment)

## Environment Configuration

**Required Frontend env vars:**
```env
VITE_SUPABASE_URL=<project-url>        # Supabase project URL
VITE_SUPABASE_ANON_KEY=<anon-key>     # Supabase public anon key
```

**Required Supabase Dashboard Secrets (for Edge Functions):**
```
GREEN_API_INSTANCE=<green-api-instance>
GREEN_API_TOKEN=<green-api-token>
GEMINI_API_KEY=<gemini-api-key>
ENCRYPTION_KEY=<32-char-key>          # For credential storage
```

**Secrets location:**
- Frontend: `.env` file (Vite environment variables, safe for public keys)
- Backend: Supabase dashboard → Project Settings → Secrets
- Never expose: API tokens, encryption keys via frontend

## Webhooks & Callbacks

**Incoming:**
- Not detected - No incoming webhooks

**Outgoing:**
- WhatsApp messages via Green API (async invocation of Edge Function)
  - Trigger: `supabase.functions.invoke('send-whatsapp', { body })`
  - Response handling: Error checking with error boundary
- Supabase realtime subscriptions - Database changes trigger frontend updates

## Data Flow Architecture

**Request Flow:**
```
Frontend Component
    ↓
TanStack Query (cache/invalidation)
    ↓
Supabase Auth (session verification)
    ↓
PostgreSQL (RLS policies check)
    ↓
Supabase Edge Function (for external APIs)
    ↓
External Service (Gemini, Green API, etc.)
    ↓
Response back to frontend
```

**Example: WhatsApp Send:**
```typescript
// Frontend invokes Edge Function
const { error } = await supabase.functions.invoke('send-whatsapp', {
  body: { phone, message }
})

// Edge Function has access to secrets (GREEN_API_INSTANCE, GREEN_API_TOKEN)
// Calls Green API with phone number and message
// Returns success/error to frontend
```

**Example: AI Chat:**
```typescript
// Frontend sends user message to Edge Function
const { data, error } = await supabase.functions.invoke('ai-chat', {
  body: { message, context }
})

// Edge Function has access to GEMINI_API_KEY
// Routes to Claude or Gemini based on intent analysis
// Returns AI response and metadata
```

## Service Integration Patterns

**Why Edge Functions for Secrets:**
- Rule: "Never expose API keys to frontend" (per CLAUDE.md)
- Implementation: All external API keys live in Supabase dashboard
- Frontend calls Edge Functions via `supabase.functions.invoke()`
- Edge Functions have secure access to secrets via Deno.env

**Encryption for Stored Credentials:**
- Location: `src/lib/` (encryption utilities)
- Used for: API credentials stored in database
- Method: crypto-js AES encryption with `ENCRYPTION_KEY`

## Feature-to-Integration Mapping

| Feature | Integration | Service | Status |
|---------|-------------|---------|--------|
| Authentication | Supabase Auth | PostgreSQL | Live |
| Event Management | Supabase DB | PostgreSQL | Live |
| Participant Registration | Supabase DB | PostgreSQL | Live |
| WhatsApp Invites | Green API | Edge Function | Live |
| AI Chat | Gemini API | Edge Function | Live |
| Data Export | xlsx | Client-side | Live |
| Data Import | papaparse | Client-side | Live |
| QR Generation | qrcode.react | Client-side | Live |
| QR Scanning | html5-qrcode | Client-side | Live |
| Calendar Sync | Google Calendar | Edge Function | Planned |
| Payments | Stripe (not implemented) | Edge Function | Planned |
| Email | SMTP (not implemented) | Edge Function | Planned |

## Rate Limiting & Request Handling

**Current approach:**
- TanStack Query retry logic: 1 retry on failure
- Supabase functions have inherent rate limits
- No explicit rate limiting middleware detected
- WhatsApp messages queued in `messages` table before sending

**Recommended for scaling:**
- Queue system for bulk operations
- Exponential backoff for failed requests
- Request batching for multiple recipients

---

*Integration audit: 2026-01-28*
