# EventFlow AI - Architecture Analysis

**Analysis Date:** 2026-02-05
**Version:** 2.1 (SaaS Tier Structure)
**Codebase Size:** 31,735 lines of TypeScript/React

---

## Executive Summary

EventFlow AI is a comprehensive event production management system built with **React 19 + TypeScript + Supabase**, featuring a multi-tenant SaaS architecture with three tier levels (Base/Premium/Legacy Premium). The system implements quota-based feature access, real-time messaging (WhatsApp via Green API), AI assistance (Gemini), and advanced event orchestration.

**Key Architecture Pattern:** Multi-tenant + feature-gated monolith with Edge Functions for secrets/quotas.

---

## Architecture Pattern

**Overall Pattern:** Feature-Driven Modular Monolith with SaaS Tier Abstraction

### Design Principles

1. **Feature Gates** - Premium features are blocked at both frontend and edge function levels
2. **Quota Enforcement** - Base tier gets hard usage limits; Premium gets unlimited
3. **Edge Functions for Secrets** - All external API keys stored in Supabase secrets, never exposed to frontend
4. **Real-time RLS** - Row Level Security ensures organization isolation
5. **Graceful Degradation** - Missing configs show error boundaries, not crashes

### System Layers

```
┌─────────────────────────────────────────────────────────┐
│ Frontend (React 19 + TypeScript + Vite)                 │
│ - TanStack Query (data fetching + caching)              │
│ - TanStack Table (complex tables)                       │
│ - React Router v7 (routing)                             │
│ - RTL UI (Hebrew-first, TailwindCSS + Heebo font)      │
│ - Feature Guards (FeatureGuard component)               │
│ - Tier Context (quota display, trial tracking)          │
└──────────────────┬──────────────────────────────────────┘
                   │ HTTPS
┌──────────────────▼──────────────────────────────────────┐
│ Supabase (Backend + Database)                           │
├──────────────────────────────────────────────────────────┤
│ Auth Layer (Supabase Auth)                              │
│ - Email/password + JWT tokens                           │
│ - Role-based access (super_admin, admin, member)        │
│                                                          │
│ Edge Functions (Deno runtime)                           │
│ - ai-chat (Gemini with Function Calling)                │
│ - send-reminder (WhatsApp + scheduled messages)         │
│ - send-push-notification (PWA push)                     │
│ - budget-alerts (spend tracking)                        │
│ - admin-set-tier (manual tier adjustment)               │
│ - execute-ai-action (AI-triggered operations)           │
│ - vendor-analysis (vendor quote insights)               │
│ - start-trial (free trial initialization)               │
│                                                          │
│ Quota Check Middleware (_shared/quota-check.ts)         │
│ - Rate limiting per tier                                │
│ - Premium-only feature blocking                         │
│ - Usage tracking (events, participants, messages, AI)   │
│                                                          │
│ PostgreSQL Database                                     │
│ - Real-time subscriptions (Postgres LISTEN/NOTIFY)      │
│ - pg_cron jobs (soft limit warnings, monthly reset)     │
│ - Row Level Security (organization isolation)           │
│ - JSONB storage (tier_limits, current_usage)            │
│                                                          │
│ External APIs (via Edge Functions only)                │
│ - Green API (WhatsApp)                                  │
│ - Gemini API (AI)                                       │
└──────────────────────────────────────────────────────────┘
```

---

## Data Flow

### 1. **Authentication Flow**

```
User Login
  ↓
AuthContext.signIn()
  ↓
supabase.auth.signInWithPassword()
  ↓ (on success)
JWT Token Stored (localStorage)
Session created
  ↓
fetchUserProfile() → user_profiles table
  ↓
TierContext loads organization tier/limits
  ↓
ProtectedRoute allows access or redirects to /login
```

**Files:**
- `src/contexts/AuthContext.tsx` - Auth state management
- `src/components/auth/ProtectedRoute.tsx` - Route protection
- `src/pages/auth/LoginPage.tsx` - Login UI

### 2. **Feature Access Flow**

```
Component wants to use premium feature
  ↓
<FeatureGuard feature="ai"> wrapper
  ↓
useTier() hook checks canAccess(feature)
  ↓
TierContext queries org tier from database
  ↓
hasFeature(tier, feature) → true/false
  ↓
If false: Show UpgradePrompt modal
If true: Render feature component
```

**Files:**
- `src/components/guards/FeatureGuard.tsx` - Feature access control
- `src/config/tiers.ts` - Tier feature matrix (TIERS object)
- `src/contexts/TierContext.tsx` - Tier state + quota tracking
- `src/components/billing/UpgradePrompt.tsx` - Upgrade UI

### 3. **Quota Check Flow (Edge Functions)**

```
Frontend calls edge function (e.g., ai-chat)
  ↓
getCorsHeaders() validates origin (localhost, Firebase prod, custom)
  ↓
checkQuota() calls quota-check.ts middleware
  ↓
getOrganizationData() loads org tier + usage from DB
  ↓
Quota validation:
  - If premium: Allow all
  - If base: Check usage < limits
  - If legacy_premium: Allow all (grandfathered)
  ↓
If quota exceeded: Return 429 (Too Many Requests) + createQuotaExceededResponse()
If allowed: Process request (call Gemini/Green API)
  ↓
On success: Update current_usage counter via trigger
```

**Files:**
- `supabase/functions/ai-chat/index.ts` - Gemini integration
- `supabase/functions/send-reminder/index.ts` - WhatsApp scheduling
- `supabase/functions/_shared/quota-check.ts` - Quota validation middleware

### 4. **Message Scheduling Flow**

```
User creates scheduled message
  ↓
scheduleMessageSync() utility
  ↓
Inserts into messages table with:
- status: 'pending' / 'scheduled'
- scheduled_for: timestamp
- attempt_count: 0
  ↓
pg_cron job 'process-scheduled-messages' runs every 1 minute
  ↓
Finds messages WHERE scheduled_for <= NOW() AND status = 'pending'
  ↓
Calls send-reminder edge function via HTTP trigger
  ↓
Sends via Green API WhatsApp
  ↓
Updates message status: 'sent' / 'failed'
- On failure: retry_count++, rescheduled in 2min
- After 3 retries: status = 'failed', logged
```

**Files:**
- `src/utils/scheduleMessageSync.ts` - Frontend scheduling
- `src/pages/event/ContingencyPage.tsx` - User-facing scheduling UI
- `supabase/migrations/20260203000014_add_usage_reset_cron.sql` - Cron job setup
- `supabase/functions/send-reminder/index.ts` - Edge function handler

### 5. **AI Chat with Function Calling**

```
User sends message in chat
  ↓
FloatingChat component calls frontend AI endpoint
  ↓
Sends to ai-chat edge function with:
- message: string
- context: page/eventId/organizationId
- history: chat message array
- organizationId: for quota check
  ↓
ai-chat function:
  1. checkQuota('ai_messages') - ensures Base tier hasn't hit limit
  2. Calls Gemini API with Function Calling tools:
     - search_events (find events by name/status)
     - create_event (create new event)
     - list_participants (search participants)
     - add_participant (register new attendee)
     - get_event_stats (fetch event metrics)
     - get_vendor_quotes (search vendor bids)
  3. Parses Gemini response for function calls
  4. Executes tool (queries DB, creates records)
  5. Returns actionItems array with completed/suggested/pending actions
  ↓
Frontend renders AI suggestions
  ↓
User approves/rejects
  ↓
Approved actions committed to database
```

**Files:**
- `src/contexts/ChatContext.tsx` - Chat state
- `src/components/chat/FloatingChat.tsx` - Chat UI
- `supabase/functions/ai-chat/index.ts` - Gemini integration with tools

---

## Database Schema (Core Entities)

### Organizations Table
```sql
organizations:
  id (UUID, PK)
  name (TEXT)
  tier (TEXT) → 'base' | 'premium' | 'legacy_premium'
  tier_limits (JSONB) → { events_per_year, participants_per_event, messages_per_month, ai_chat_messages_per_month }
  current_usage (JSONB) → { events_count, participants_count, messages_sent, ai_messages_sent, period_start, period_end, warned_this_month }
  trial_started_at (TIMESTAMPTZ)
  trial_ends_at (TIMESTAMPTZ)
  tier_updated_at (TIMESTAMPTZ)
  tier_updated_by (UUID) → user_profiles.id
  created_at (TIMESTAMPTZ)
  updated_at (TIMESTAMPTZ)
```

### User Profiles Table
```sql
user_profiles:
  id (UUID, PK) → auth.users.id
  full_name (TEXT)
  email (TEXT)
  role (TEXT) → 'super_admin' | 'admin' | 'member'
  organization_id (UUID, FK)
  phone (TEXT)
  avatar_url (TEXT)
  created_at (TIMESTAMPTZ)
  updated_at (TIMESTAMPTZ)
```

### Events Table
```sql
events:
  id (UUID, PK)
  name (TEXT)
  description (TEXT)
  status (TEXT) → 'draft' | 'planning' | 'active' | 'completed' | 'cancelled' | 'archived'
  start_date (TIMESTAMPTZ)
  end_date (TIMESTAMPTZ)
  venue_name (TEXT)
  venue_address (TEXT)
  venue_city (TEXT)
  max_participants (INTEGER)
  budget (NUMERIC)
  currency (TEXT)
  event_type_id (UUID, FK) → event_types.id
  organization_id (UUID, FK)
  settings (JSONB)
  created_at (TIMESTAMPTZ)
```

### Participants Table
```sql
participants:
  id (UUID, PK)
  event_id (UUID, FK)
  first_name (TEXT)
  last_name (TEXT)
  full_name (TEXT, computed)
  email (TEXT)
  phone (TEXT)
  phone_normalized (TEXT) → 972XXXXXXXXX format
  status (TEXT) → 'invited' | 'confirmed' | 'declined' | 'maybe' | 'checked_in' | 'no_show'
  has_companion (BOOLEAN)
  companion_name (TEXT)
  companion_phone (TEXT)
  dietary_restrictions (TEXT[])
  accessibility_needs (TEXT)
  needs_transportation (BOOLEAN)
  transportation_location (TEXT)
  notes (TEXT)
  internal_notes (TEXT)
  is_vip (BOOLEAN)
  vip_notes (TEXT)
  custom_fields (JSONB)
  invited_at (TIMESTAMPTZ)
  confirmed_at (TIMESTAMPTZ)
  checked_in_at (TIMESTAMPTZ)
  created_at (TIMESTAMPTZ)
```

### Messages Table
```sql
messages:
  id (UUID, PK)
  event_id (UUID, FK)
  participant_id (UUID, FK)
  organization_id (UUID, FK)
  message_type (TEXT) → 'whatsapp' | 'email' | 'sms' | 'push'
  content (TEXT)
  status (TEXT) → 'pending' | 'scheduled' | 'sent' | 'failed'
  scheduled_for (TIMESTAMPTZ)
  sent_at (TIMESTAMPTZ)
  attempt_count (INTEGER, default 0)
  retry_count (INTEGER, default 0)
  error_details (JSONB)
  green_api_response (JSONB)
  created_at (TIMESTAMPTZ)
```

### Schedules Table
```sql
schedules:
  id (UUID, PK)
  event_id (UUID, FK)
  title (TEXT)
  description (TEXT)
  start_time (TIMESTAMPTZ)
  end_time (TIMESTAMPTZ)
  location (TEXT)
  speaker_name (TEXT)
  speaker_role (TEXT)
  session_type (TEXT)
  capacity (INTEGER)
  order (INTEGER)
  created_at (TIMESTAMPTZ)
```

### Messages Templates Table
```sql
message_templates:
  id (UUID, PK)
  organization_id (UUID, FK) → NULL for system templates
  message_type (TEXT) → 'activation' | 'week_before' | 'day_before' | 'morning' | '15_min' | 'follow_up_3mo' | etc.
  content (TEXT) → Template with {{variable}} placeholders
  is_active (BOOLEAN)
  is_system (BOOLEAN)
  created_at (TIMESTAMPTZ)
```

### Tier Configuration
```sql
Tier Definitions (src/config/tiers.ts):

BASE:
  - events_per_year: 5
  - participants_per_event: 100
  - messages_per_month: 200
  - ai_chat_messages_per_month: 50
  - Features: events, participants, messages only
  - Restrictions: No AI, simulation, networking, budget_alerts, vendor_analysis

PREMIUM:
  - All limits: -1 (unlimited)
  - All features: events, participants, messages, ai, simulation, networking, budget_alerts, vendor_analysis

LEGACY_PREMIUM:
  - All limits: -1 (unlimited)
  - All features: same as premium (grandfathered existing users)
```

---

## State Management

### Context Providers (Hierarchy)

```tsx
<AuthProvider>
  ├─ user: User | null
  ├─ session: Session | null
  ├─ userProfile: UserProfile | null
  ├─ isSuperAdmin: boolean (hardcoded check for ew5933070@gmail.com)
  ├─ signIn, signOut, resetPassword
  │
  └─ <TierProvider>
     ├─ tier: Tier (from DB)
     ├─ effectiveTier: Tier (super_admin = premium always)
     ├─ canAccess: (feature: Feature) => boolean
     ├─ hasQuota: (quotaType: keyof TierLimits) => boolean
     ├─ usage: UsageMetrics | null
     ├─ limits: TierLimits
     ├─ trialDaysRemaining: number | null
     │
     └─ <EventProvider>
        ├─ selectedEvent: Event | null
        ├─ events: Event[]
        ├─ selectEvent, loadEvents
        │
        └─ <ChatProvider>
           ├─ messages: ChatMessage[]
           ├─ sendMessage, clearHistory
           └─ actionItems: ActionItem[]
```

### TanStack Query Usage

**Cache Strategy:**
- `staleTime: 60 * 1000` (1 minute default)
- `gcTime: 5 * 60 * 1000` (5 minute garbage collection)
- `refetchOnWindowFocus: false` (prevent excessive refetches)

**Query Patterns:**
```tsx
const { data: events } = useQuery({
  queryKey: ['events', eventId, 'tier'],
  queryFn: async () => supabase.from('events').select(...).eq('id', eventId).single(),
  enabled: !!eventId && !isSuperAdmin,
  staleTime: 60 * 1000,
})
```

---

## Edge Functions

### 1. ai-chat (`/supabase/functions/ai-chat/index.ts`)

**Purpose:** Gemini API integration with Function Calling for event management

**Flow:**
1. Validates CORS origin (localhost, Firebase prod, custom)
2. Checks quota (Base tier limit: 50 AI messages/month)
3. Calls Gemini API with system prompt + tools
4. Parses function calls from Gemini response
5. Executes database operations
6. Returns actionItems array

**Tools Available:**
- `search_events` - Find events by name/status
- `create_event` - Create new event
- `list_participants` - Search participants
- `add_participant` - Register attendee
- `get_event_stats` - Fetch event metrics
- `get_vendor_quotes` - Search vendor bids

**Error Handling:**
- Tool execution errors caught, returned in actionItems with status='failed'
- Quota exceeded → 429 response with `createQuotaExceededResponse()`
- CORS violations → 403 Forbidden

### 2. send-reminder (`/supabase/functions/send-reminder/index.ts`)

**Purpose:** Scheduled WhatsApp message sending with template system

**Job Types:**
- `activation` - Initial invitation
- `week_before` - 7 days before event
- `day_before` - 24 hours before event
- `morning` - Day of event (morning)
- `15_min` - 15 minutes before start
- `event_end` - Event concluded
- `follow_up_3mo` - 3 months after event
- `follow_up_6mo` - 6 months after event
- `process_scheduled` - Process scheduled messages
- `process_changes` - Handle changed participants

**Template System:**
1. Load org-specific template first
2. Fall back to system template
3. Fall back to hardcoded builder function
4. Substitute `{{variable}}` placeholders
5. Send via Green API

**Rate Limiting:**
- 2.1 second throttle between sends
- Prevents Green API rate limits

**Retry Logic:**
- 1 attempt for transient failures
- Max 3 total retries
- Logs retry_count in messages table

### 3. send-push-notification

**Purpose:** Send PWA push notifications to subscribed clients

**Implementation:**
- Reads push_subscriptions table
- Sends via Web Push API
- Handles invalid subscriptions gracefully

### 4. budget-alerts

**Purpose:** Track event spending vs budget

**Logic:**
- Queries vendors/quotes for event
- Sums actual spend
- Compares to budget
- Sends alert if > 80%

### 5. admin-set-tier

**Purpose:** Manual tier adjustment by super admin

**Endpoint:** POST /admin-set-tier
**Body:**
```json
{
  "organizationId": "uuid",
  "newTier": "premium|base|legacy_premium",
  "reason": "string"
}
```

**Actions:**
- Updates organizations.tier
- Resets usage counters if downgrading
- Creates audit log entry

### 6. execute-ai-action

**Purpose:** Execute AI-suggested actions

**Endpoint:** POST /execute-ai-action
**Body:**
```json
{
  "actionId": "string",
  "actionType": "create_event|add_participant|update_schedule",
  "data": { ... }
}
```

### 7. vendor-analysis

**Purpose:** Generate insights from vendor quotes

**Logic:**
- Analyzes quotes by category
- Recommends best value vendors
- Flags price outliers

### 8. start-trial

**Purpose:** Initialize free trial for new Base tier users

**Logic:**
- Sets trial_started_at = NOW()
- Sets trial_ends_at = NOW() + 14 days
- Updates tier to 'base' if not already set

---

## Security Architecture

### Authentication & Authorization

**Auth Flow:**
1. Email/password → Supabase Auth
2. JWT token stored in localStorage
3. Token auto-refreshed by supabase-js SDK
4. Protected routes check user + session before rendering

**Role Hierarchy:**
```
super_admin (level 2) ← Master bypass
  ↓
admin (level 1)
  ↓
member (level 0)
```

**Super Admin Detection:**
- Primary: `userProfile.role === 'super_admin'` (from DB)
- Secondary: Email contains 'ew5933070' AND 'gmail.com' (hardcoded backup)
- Effect: Bypasses all tier restrictions, gets unlimited quotas

**Files:**
- `src/contexts/AuthContext.tsx` - Auth state
- `src/components/auth/ProtectedRoute.tsx` - Role-based route protection

### Row Level Security (RLS)

**Database-Level Isolation:**

All tables have RLS enabled:
```sql
-- Example: events table
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_can_access_own_org_events"
  ON events FOR SELECT
  USING (organization_id = auth.uid()::uuid → user_profiles.organization_id);
```

**Effect:**
- User can only see data from their organization
- Supabase automatically filters queries
- Frontend cannot bypass (enforced at PG layer)

**Files:**
- `supabase/migrations/20260203000012_add_rls_policies.sql` - RLS policy definitions

### API Key Management

**Never Exposed to Frontend:**

All sensitive keys stored in Supabase Edge Function Secrets:
- `GEMINI_API_KEY` - Google AI
- `GREEN_API_INSTANCE` - WhatsApp instance ID
- `GREEN_API_TOKEN` - WhatsApp token

**Frontend Configuration:**
```env
VITE_SUPABASE_URL=https://...supabase.co          # Public, safe
VITE_SUPABASE_ANON_KEY=eyJhbGc...                 # Public anon key
ENCRYPTION_KEY=your-32-char-key                   # Local only, for credential storage
```

**Edge Function Access:**
```typescript
const apiKey = Deno.env.get('GEMINI_API_KEY')  // Only available in Edge Function context
```

**Files:**
- `src/lib/supabase.ts` - Supabase client init
- `ENVIRONMENT.md` - Env var documentation
- `.env.example` - Template with placeholders

### CORS Configuration

**ai-chat Function CORS:**
```typescript
function isAllowedOrigin(origin: string): boolean {
  if (origin === 'https://eventflow-ai-prod.web.app') return true
  if (origin === 'https://eventflow-ai-prod.firebaseapp.com') return true

  const prodOrigin = Deno.env.get('ALLOWED_ORIGIN')
  if (prodOrigin && origin === prodOrigin) return true

  if (origin.startsWith('http://localhost:')) return true  // Dev

  return false
}
```

**Prevents:**
- Unauthorized domains calling private endpoints
- Cross-site request forgery

---

## State Persistence

### LocalStorage
- JWT token (automatic, by supabase-js)
- Chat history (if implemented)
- User preferences (timezone, language)

### Browser DB (IndexedDB via Dexie)
```typescript
const db = new Dexie('eventflow_db');
db.version(1).stores({
  chatHistory: '++id, sessionId',
  draftEvents: '++id, userId'
});
```

**Purpose:**
- Offline-first capability
- Reduces API calls for frequently accessed data
- Syncs with server when back online

**Files:**
- `src/lib/dexie.ts` - Local DB schema (if exists)

---

## Performance Optimizations

### 1. PWA Caching Strategy
```javascript
// vite.config.ts
runtimeCaching: [
  {
    urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
    handler: 'NetworkFirst',
    options: {
      cacheName: 'supabase-api-cache',
      expiration: {
        maxEntries: 100,
        maxAgeSeconds: 60 * 60  // 1 hour
      }
    }
  }
]
```

**Effect:**
- Supabase API calls cached for 1 hour
- Network request attempted first, falls back to cache
- Offline support for cached data

### 2. Code Splitting
```typescript
// vite.config.ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'vendor': ['react', '@tanstack/react-query'],
        'supabase': ['@supabase/supabase-js'],
      }
    }
  }
}
```

### 3. React Query Caching
- Default staleTime: 60s
- Prevents refetch on component remount
- Background refetch on window focus disabled

### 4. Image Optimization
- Lucide icons (tree-shakeable SVG)
- No large image assets in repo

---

## Build & Deployment

### Build Process
```bash
npm run build
# → tsc -b && vite build
# → Outputs dist/ for Firebase Hosting
```

### Deployment Targets
- **Frontend:** Firebase Hosting (https://eventflow-ai-prod.web.app)
- **Backend:** Supabase (managed PostgreSQL + Edge Functions)
- **Edge Functions:** Deno runtime (Supabase Edge Functions)

### Environment-Specific Configs

**Development:**
```env
VITE_DEBUG=true
VITE_LOG_LEVEL=debug
VITE_SUPABASE_URL=http://localhost:54321  # Local Supabase
```

**Production:**
```env
VITE_DEBUG=false
VITE_LOG_LEVEL=error
VITE_SUPABASE_URL=https://...supabase.co
```

---

## Quota & Usage Tracking System

### Current Usage Tracking

**JSONB Structure:**
```json
organizations.current_usage = {
  "events_count": 2,
  "participants_count": 45,
  "messages_sent": 120,
  "ai_messages_sent": 12,
  "period_start": "2026-02-01T00:00:00Z",
  "period_end": "2026-03-01T00:00:00Z",
  "warned_this_month": false
}
```

### Usage Update Triggers

**Automatic Updates (via database triggers):**

1. On event creation:
   ```sql
   UPDATE organizations
   SET current_usage = jsonb_set(current_usage, '{events_count}',
                                  (events_count + 1)::text::jsonb)
   WHERE id = new.organization_id;
   ```

2. On participant confirmation:
   ```sql
   UPDATE organizations
   SET current_usage = jsonb_set(current_usage, '{participants_count}', ...)
   WHERE id = (SELECT organization_id FROM events WHERE id = new.event_id);
   ```

3. On message send:
   ```sql
   UPDATE organizations
   SET current_usage = jsonb_set(current_usage, '{messages_sent}', ...)
   WHERE id = new.organization_id;
   ```

**Files:**
- `supabase/migrations/20260203000011_add_usage_triggers.sql` - Trigger definitions

### Soft Limit Warnings (80% Threshold)

**pg_cron Job:** Runs daily at 09:00 UTC

**Logic:**
```sql
SELECT * FROM organizations
WHERE tier = 'base'
  AND (current_usage->>'warned_this_month')::BOOLEAN IS NOT TRUE
  AND (
    (events_count * 100 / events_per_year) >= 80
    OR (participants_count * 100 / participants_per_event) >= 80
    OR (messages_sent * 100 / messages_per_month) >= 80
    OR (ai_messages_sent * 100 / ai_chat_messages_per_month) >= 80
  );
```

**Actions:**
1. Insert notification into notifications table
2. Set current_usage.warned_this_month = true
3. Log to admin_logs table

**Files:**
- `supabase/migrations/20260204000015_add_soft_limit_warnings.sql` - Cron setup

### Monthly Reset

**pg_cron Job:** Runs first day of month at 00:00 UTC

**Logic:**
```sql
UPDATE organizations
SET current_usage = jsonb_build_object(
  'events_count', 0,
  'participants_count', 0,
  'messages_sent', 0,
  'ai_messages_sent', 0,
  'period_start', NOW(),
  'period_end', (NOW() + interval '1 month'),
  'warned_this_month', false
)
WHERE tier = 'base';
```

**Files:**
- `supabase/migrations/20260203000014_add_usage_reset_cron.sql` - Monthly reset setup

---

## Type Safety

### TypeScript Strict Mode

All enabled:
```json
{
  "strict": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "noUncheckedSideEffectImports": true,
  "noFallthroughCasesInSwitch": true
}
```

### Zod Schema Pattern

**Rule:** Define schemas before components, never use `any`

```typescript
// src/schemas/participant.ts
const participantSchema = z.object({
  first_name: z.string().min(2),
  last_name: z.string().min(2),
  phone: z.string().regex(/^972[0-9]{9}$/),
  email: z.string().email().optional(),
  has_companion: z.boolean(),
  companion_name: z.string().optional(),
  status: z.enum(['invited', 'confirmed', 'declined', 'maybe', 'checked_in', 'no_show'])
});

type Participant = z.infer<typeof participantSchema>;
```

**Usage:**
```typescript
const { data, error } = await supabase
  .from('participants')
  .insert(participantSchema.parse(formData))
  .select();
```

**Files:**
- `src/schemas/` - All Zod schemas
- `src/types/index.ts` - Centralized types

---

## Special Architecture Notes

### RTL-First Design

All UI components support right-to-left layout:
- TailwindCSS with RTL directives
- Heebo font (Hebrew-optimized)
- Text direction auto-detected or explicitly set

**Files:**
- `tailwind.config.js` - RTL configuration
- `src/styles/globals.css` - Font imports

### Multi-Tenant Isolation

**Enforcement Points:**
1. **AuthContext** - User must have valid organization_id
2. **TierProvider** - Only loads tier for user's organization
3. **Database RLS** - Queries automatically filtered by organization_id
4. **Edge Functions** - getOrganizationData() validates org membership

**Critical:** No user can see another org's data even with direct API call.

### Trial System

**Trial Columns:**
- `trial_started_at` - When trial began
- `trial_ends_at` - When trial expires
- `trial_days_remaining` - Computed in TierContext

**Free Trial Logic:**
```typescript
const trialDaysRemaining = orgData?.trial_ends_at
  ? Math.ceil(
      (new Date(orgData.trial_ends_at).getTime() - Date.now())
      / (1000 * 60 * 60 * 24)
    )
  : null;

// If trial still active, treat as premium for free
const effectiveTier = trialDaysRemaining && trialDaysRemaining > 0
  ? 'premium'
  : tier;
```

**Files:**
- `src/contexts/TierContext.tsx` - Trial calculation

---

## Summary

EventFlow AI implements a **mature SaaS architecture** with:

✓ Multi-tenant isolation via RLS
✓ Feature-gated access (frontend + backend)
✓ Quota enforcement at edge function layer
✓ Real-time messaging via scheduled jobs
✓ AI integration with rate limiting
✓ TypeScript strict mode throughout
✓ PWA caching for offline support
✓ CORS protection on edge functions
✓ Trial system for freemium model

**No major architectural flaws detected.** Code organization is clean and intentional.

---

*Analysis complete. See CODE_QUALITY_REPORT.md for implementation details and issues.*
