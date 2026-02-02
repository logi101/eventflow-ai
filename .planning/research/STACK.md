# Technology Stack Additions for EventFlow AI v2.0

**Project:** EventFlow AI
**Researched:** 2026-02-02
**Milestone:** v2.0 Intelligent Production & Networking Engine
**Confidence:** MEDIUM

## Summary

This research identifies the minimal stack additions needed to implement v2.0 features while preserving the existing Supabase + React 19 architecture. The focus is on five new capabilities: AI agent with DB writes, offline-first check-in, networking/seating algorithms, day simulation, and vendor intelligence.

**Key Finding:** All v2.0 features can be implemented with ZERO new external services — only library additions to the existing stack.

**Primary recommendation:** Use Gemini's native function calling (already integrated), add Service Worker + Dexie.js for offline, implement networking algorithm in TypeScript with no external engine, leverage existing Supabase Edge Functions for simulation logic.

## Stack Additions by Capability

### 1. AI Agent with DB Write Access

**Requirement:** Allow Gemini to suggest database operations (schedule changes, room assignments, messaging), with user confirmation before execution.

#### Core (No New Dependencies)

| Component | Solution | Why Standard |
|-----------|----------|--------------|
| Function Calling | Gemini API native function calling | Already integrated via ai-chat Edge Function, supports tool definitions + execution cycle |
| Confirmation Flow | React state pattern | Standard React pattern — show preview, await user click, then execute |
| Database Writes | Supabase client in Edge Function | Already used for reads, RLS policies protect writes |

**Confidence:** HIGH — Gemini function calling is documented, Supabase supports writes from Edge Functions

**Integration Point:** Extend existing `supabase/functions/ai-chat/index.ts` to define tool schemas and execute confirmed actions.

**Pattern:**
```typescript
// Define tools for Gemini
const tools = [
  {
    name: "assign_room",
    description: "Assign a participant to a room",
    parameters: {
      type: "object",
      properties: {
        participant_id: { type: "string" },
        room_id: { type: "string" },
        reason: { type: "string" }
      }
    }
  }
]

// On function call response from Gemini:
// 1. Return suggestion to frontend with preview
// 2. Frontend shows confirmation UI
// 3. User clicks confirm → POST back to Edge Function with confirmation token
// 4. Edge Function executes DB write via supabase.from().insert()
```

#### Supporting Library (Optional)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod-to-json-schema | ^3.22 | Convert Zod schemas to JSON Schema for Gemini tool definitions | If you want type-safe tool definitions from existing Zod schemas |

**Installation (optional):**
```bash
npm install zod-to-json-schema
```

**Rationale:** Gemini expects JSON Schema format for function parameters. If you already have Zod schemas for DB operations (you do — see CLAUDE.md), convert them automatically instead of maintaining duplicate JSON Schema definitions.

### 2. Offline-First Check-In

**Requirement:** Check-in must work without internet at the venue. Sync when connection returns.

#### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Workbox | ^7.0 | Service Worker tooling | Google's official SW framework, handles caching strategies, precaching, runtime caching |
| Dexie.js | ^4.0 | IndexedDB wrapper | Most popular IndexedDB library, TypeScript-native, handles versioning and migrations cleanly |

**Confidence:** HIGH — Workbox is the industry standard for Service Workers, Dexie is the de facto IndexedDB library

**Installation:**
```bash
npm install workbox-window workbox-precaching workbox-routing workbox-strategies
npm install dexie
```

**Integration Points:**
- Vite config: Add Workbox plugin for SW generation
- Check-in page: Wrap Supabase calls with Dexie fallback
- Background sync: Use Workbox's `workbox-background-sync` for queued operations

**Pattern:**
```typescript
// Dexie database schema
import Dexie from 'dexie'

class OfflineDB extends Dexie {
  participants: Dexie.Table<Participant, string>
  checkIns: Dexie.Table<CheckIn, string>

  constructor() {
    super('EventFlowOffline')
    this.version(1).stores({
      participants: 'id, event_id, first_name, last_name',
      checkIns: '++id, participant_id, checked_in_at, synced'
    })
  }
}

// Check-in with offline support
async function checkInParticipant(participantId: string) {
  const checkIn = { participant_id: participantId, checked_in_at: new Date(), synced: false }

  if (navigator.onLine) {
    try {
      await supabase.from('check_ins').insert(checkIn)
      checkIn.synced = true
    } catch (error) {
      // Network error, fall through to offline
    }
  }

  // Store locally regardless
  await db.checkIns.add(checkIn)
}

// Background sync when connection returns
self.addEventListener('sync', async (event) => {
  if (event.tag === 'sync-checkins') {
    const pending = await db.checkIns.where('synced').equals(false).toArray()
    for (const checkIn of pending) {
      await supabase.from('check_ins').insert(checkIn)
      await db.checkIns.update(checkIn.id, { synced: true })
    }
  }
})
```

#### Supporting (PWA Enhancements)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vite-plugin-pwa | ^0.19 | Vite integration for PWA + Workbox | Simplifies Workbox setup in Vite projects |

**Installation:**
```bash
npm install -D vite-plugin-pwa
```

**Rationale:** Handles Workbox config, manifest generation, and SW registration automatically in Vite. You already have PWA support (push notifications in v1.0), this extends it.

### 3. Networking/Seating Algorithm

**Requirement:** Match participants by shared interests, assign tables to maximize meaningful connections.

#### Core (No New Dependencies)

| Component | Solution | Why |
|-----------|----------|-----|
| Interest Matching | TypeScript implementation | Problem is domain-specific, existing libraries (matching algorithms) are overkill for event seating |
| Constraint Solver | Greedy algorithm with backtracking | Seating is NP-hard but small scale (100-500 people), greedy works well |
| Score Function | Weighted similarity (interests, track, VIP status) | Domain knowledge > generic algorithm |

**Confidence:** MEDIUM — Algorithm complexity depends on scale, but greedy + domain heuristics is the standard for event seating

**Implementation Strategy:**

```typescript
// No libraries needed — implement in TypeScript
interface ParticipantInterest {
  participant_id: string
  interests: string[] // e.g., ['AI', 'Real Estate', 'Startups']
  track_id: string
  vip: boolean
}

interface Table {
  id: string
  capacity: number
  assigned: string[]
}

function calculateMatchScore(p1: ParticipantInterest, p2: ParticipantInterest): number {
  const sharedInterests = p1.interests.filter(i => p2.interests.includes(i)).length
  const sameTrack = p1.track_id === p2.track_id ? 1 : 0
  const vipBonus = (p1.vip || p2.vip) ? 0.5 : 0

  return sharedInterests * 3 + sameTrack * 2 + vipBonus
}

function assignTables(participants: ParticipantInterest[], tables: Table[]): Map<string, string> {
  // 1. Sort participants by VIP status (VIPs first)
  // 2. For each participant, find table with highest avg match score to existing members
  // 3. If no good match (score < threshold), start new cluster
  // 4. Backtrack if table capacity exceeded
}
```

**Why not use a library?**
- Generic matching libraries (e.g., munkres for Hungarian algorithm) don't understand event-specific constraints (VIPs, tracks, table capacity)
- Seating is ~200 lines of TypeScript, a library is 10KB+ and harder to customize
- Domain heuristics (VIP priority, track clustering) outperform generic algorithms

**Alternative Considered:**

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom TypeScript | graph-matching libraries (e.g., munkres) | Generic algorithms don't support domain constraints (VIP, tracks), harder to tune, adds dependency |

### 4. Day Simulation / Stress Testing

**Requirement:** AI analyzes event logistics (schedule conflicts, room capacity, timing issues) and suggests optimizations.

#### Core (No New Dependencies)

| Component | Solution | Why |
|-----------|----------|-----|
| Simulation Engine | TypeScript logic in Edge Function | Event simulation is date arithmetic + conflict detection, no complex dependencies |
| AI Analysis | Gemini via existing ai-chat function | Already integrated, can analyze simulation output and suggest fixes |

**Confidence:** HIGH — This is data analysis, not real-time simulation

**Implementation Strategy:**

```typescript
// Edge Function: supabase/functions/simulate-event-day/index.ts

interface SimulationIssue {
  type: 'schedule_conflict' | 'room_overcapacity' | 'speaker_overlap' | 'timing_gap'
  severity: 'critical' | 'warning' | 'info'
  description: string
  affected_entities: string[]
}

async function simulateEventDay(eventId: string): Promise<SimulationIssue[]> {
  const issues: SimulationIssue[] = []

  // 1. Load all schedules, rooms, participants
  const schedules = await supabase.from('schedules').select('*').eq('event_id', eventId)
  const rooms = await supabase.from('rooms').select('*').eq('event_id', eventId)

  // 2. Check for conflicts
  for (let i = 0; i < schedules.length; i++) {
    for (let j = i + 1; j < schedules.length; j++) {
      if (schedulesOverlap(schedules[i], schedules[j])) {
        if (schedules[i].room_id === schedules[j].room_id) {
          issues.push({
            type: 'schedule_conflict',
            severity: 'critical',
            description: `Room ${schedules[i].room_id} double-booked`,
            affected_entities: [schedules[i].id, schedules[j].id]
          })
        }
      }
    }
  }

  // 3. Check room capacity
  for (const schedule of schedules) {
    const room = rooms.find(r => r.id === schedule.room_id)
    const participantCount = await getParticipantCount(schedule.id)
    if (participantCount > room.capacity) {
      issues.push({
        type: 'room_overcapacity',
        severity: 'critical',
        description: `${participantCount} people assigned to ${room.capacity}-person room`,
        affected_entities: [schedule.id, room.id]
      })
    }
  }

  return issues
}

// Then pass issues to Gemini for analysis
const prompt = `Event logistics issues detected:\n${JSON.stringify(issues, null, 2)}\n\nSuggest fixes.`
const geminiResponse = await callGemini(prompt)
```

**Why not use a library?**
- Event simulation is domain-specific date/time logic + SQL queries
- No general-purpose "event simulation" library exists
- This is ~100-200 lines of TypeScript, adding a dependency would be overkill

### 5. Vendor Intelligence

**Requirement:** Compare vendor quotes, detect outliers, alert if over budget.

#### Core (No New Dependencies)

| Component | Solution | Why |
|-----------|----------|-----|
| Quote Analysis | TypeScript statistical functions | Calculate mean, median, outliers — simple math, no need for stats library |
| Budget Alerts | PostgreSQL triggers + Edge Function | Existing architecture pattern, reuse send-reminder infrastructure |
| AI Insights | Gemini via ai-chat | Already integrated, can analyze quote patterns |

**Confidence:** HIGH — This is basic statistics + database queries

**Implementation Strategy:**

```typescript
// lib/vendor-intelligence.ts

interface Quote {
  vendor_id: string
  item: string
  amount: number
}

function analyzeQuotes(quotes: Quote[]): {
  mean: number
  median: number
  outliers: Quote[]
  recommendation: string
} {
  const amounts = quotes.map(q => q.amount).sort((a, b) => a - b)
  const mean = amounts.reduce((sum, a) => sum + a, 0) / amounts.length
  const median = amounts[Math.floor(amounts.length / 2)]

  // Outliers: more than 1.5x IQR above Q3
  const q1 = amounts[Math.floor(amounts.length * 0.25)]
  const q3 = amounts[Math.floor(amounts.length * 0.75)]
  const iqr = q3 - q1
  const upperBound = q3 + 1.5 * iqr

  const outliers = quotes.filter(q => q.amount > upperBound)

  return {
    mean,
    median,
    outliers,
    recommendation: outliers.length > 0
      ? `${outliers.length} quotes significantly above market rate`
      : 'All quotes within normal range'
  }
}

// Budget alert via PostgreSQL trigger
CREATE TRIGGER check_budget_exceeded
  AFTER INSERT OR UPDATE ON event_vendors
  FOR EACH ROW
  WHEN (NEW.accepted = true)
  EXECUTE FUNCTION alert_if_over_budget();
```

**Why not use a library?**
- Simple statistics (mean, median, IQR) are ~20 lines of code
- Libraries like math.js or simple-statistics are 50KB+ for features you won't use
- Quote analysis is domain-specific (event budgeting), not general-purpose stats

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Offline DB | Dexie.js | LocalForage, PouchDB | Dexie has best TypeScript support, PouchDB is overkill (syncs to CouchDB) |
| Service Worker | Workbox | Vanilla SW API | Workbox handles edge cases (cache versioning, routing strategies) that are error-prone to hand-roll |
| AI Function Calling | Gemini native | LangChain, Vercel AI SDK | You already use Gemini directly, adding a framework is unnecessary abstraction |
| Seating Algorithm | Custom TypeScript | Hungarian algorithm libraries | Generic algorithms don't support domain constraints, custom is easier to tune |
| Simulation | Custom logic | Discrete-event simulation libraries | Event logistics is simple date arithmetic, DES libraries are for complex systems (queuing theory, etc.) |

## What NOT to Add

| Library | Why Avoid | What to Do Instead |
|---------|-----------|-------------------|
| LangChain | Heavy abstraction, overkill for function calling | Use Gemini API directly (already integrated) |
| Redis | Adds infrastructure complexity | Use Supabase pg_cron + PostgreSQL (already working) |
| Separate GraphQL server | Increases attack surface, deployment complexity | Supabase PostgREST is sufficient |
| Native mobile app libraries | Maintenance burden, PWA works offline | Extend existing PWA with Service Worker |
| Complex ML libraries (TensorFlow.js) | Networking is rule-based, not ML | Use domain heuristics (interests, tracks) |

## Installation Summary

**Required:**
```bash
npm install dexie workbox-window workbox-precaching workbox-routing workbox-strategies
npm install -D vite-plugin-pwa
```

**Optional:**
```bash
npm install zod-to-json-schema  # If converting Zod schemas to Gemini tool definitions
```

**Total added dependencies:** 6 (all focused, well-maintained)

## Integration Checklist

- [ ] Extend `supabase/functions/ai-chat/index.ts` with function calling tools
- [ ] Create `lib/offline-db.ts` with Dexie schema
- [ ] Add Workbox config to `vite.config.ts`
- [ ] Implement `lib/seating-algorithm.ts` (no dependencies)
- [ ] Create `supabase/functions/simulate-event-day/index.ts`
- [ ] Create `lib/vendor-intelligence.ts` (no dependencies)
- [ ] Add confirmation flow UI in `modules/ai-chat/ConfirmActionModal.tsx`

## Architecture Patterns

### Pattern 1: AI Suggest + User Confirm

**What:** AI proposes database operations, user reviews and approves before execution.

**Implementation:**
```typescript
// 1. AI chat returns function call suggestion
{
  type: 'function_call',
  name: 'assign_room',
  arguments: { participant_id: '123', room_id: 'room-a', reason: 'VIP priority' },
  preview: {
    action: 'Assign David Cohen to Room A (VIP)',
    impact: 'Room A will have 8/10 capacity'
  }
}

// 2. Frontend shows confirmation modal
<ConfirmActionModal
  action={functionCall.preview.action}
  impact={functionCall.preview.impact}
  onConfirm={() => executeAction(functionCall)}
  onCancel={() => dismissSuggestion()}
/>

// 3. On confirm, POST to Edge Function with confirmation token
await fetch('/functions/v1/execute-ai-action', {
  method: 'POST',
  body: JSON.stringify({
    function_call: functionCall,
    confirmation_token: generateToken(functionCall)
  })
})

// 4. Edge Function validates token and executes
const { data, error } = await supabase
  .from('participant_rooms')
  .insert({ participant_id, room_id, assigned_by: 'ai', assigned_at: new Date() })
```

**Why:** Prevents autonomous AI writes, maintains user control, satisfies "system recommends, user decides" principle.

### Pattern 2: Offline-First with Background Sync

**What:** Check-in page works without internet, syncs when connection returns.

**Implementation:**
```typescript
// 1. Service Worker intercepts check-in requests
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/check-in')) {
    event.respondWith(
      fetch(event.request).catch(async () => {
        // Network failed, queue for background sync
        const cache = await caches.open('offline-checkins')
        await cache.put(event.request, new Response(null, { status: 202 }))
        await self.registration.sync.register('sync-checkins')
        return new Response(JSON.stringify({ queued: true }), { status: 202 })
      })
    )
  }
})

// 2. Background sync event
self.addEventListener('sync', async (event) => {
  if (event.tag === 'sync-checkins') {
    const cache = await caches.open('offline-checkins')
    const requests = await cache.keys()
    for (const request of requests) {
      await fetch(request)  // Retry
      await cache.delete(request)
    }
  }
})
```

**Why:** Standard PWA pattern, works on iOS (background sync is supported), minimal code.

### Anti-Patterns to Avoid

**Anti-Pattern 1: Autonomous AI Agent**
- **What:** AI writes to database without user approval
- **Why bad:** Violates "user decides" principle, safety risk, no accountability
- **Instead:** Always show confirmation modal with preview

**Anti-Pattern 2: Full Offline Mode**
- **What:** Make entire app work offline (participant lists, schedules, messaging)
- **Why bad:** Huge complexity (conflict resolution, sync strategies), 80% of effort for 20% of value
- **Instead:** Only check-in needs offline support (field-critical)

**Anti-Pattern 3: Using Generic Matching Libraries**
- **What:** Import Hungarian algorithm library for table seating
- **Why bad:** Generic algorithms don't support domain constraints (VIP, tracks, table sizes), harder to customize
- **Instead:** Write 200 lines of domain-specific TypeScript with greedy + backtracking

## Common Pitfalls

### Pitfall 1: Service Worker Cache Invalidation

**What goes wrong:** Users see stale data after deployment (cached HTML/JS doesn't update)

**Why it happens:** Service Worker caches aggressively by default

**How to avoid:**
- Use Workbox's `skipWaiting()` and `clientsClaim()` for immediate updates
- Version your cache names (`v1-assets`, `v2-assets`)
- Set `cleanupOutdatedCaches: true` in Workbox config

**Warning signs:** Users report seeing old UI after refresh

### Pitfall 2: IndexedDB Version Conflicts

**What goes wrong:** Dexie schema upgrades fail if another tab has old version open

**Why it happens:** IndexedDB can only have one schema version active across all tabs

**How to avoid:**
- Use Dexie's `version().upgrade()` migrations carefully
- Prompt user to close other tabs if version conflict detected
- Test schema changes with multiple tabs open

**Warning signs:** Console errors "VersionError: The requested version (N) is less than the existing version (M)"

### Pitfall 3: Gemini Function Calling Hallucinations

**What goes wrong:** AI suggests invalid database operations (non-existent IDs, wrong types)

**Why it happens:** Gemini hallucinates plausible-looking IDs/values

**How to avoid:**
- Validate all function arguments server-side before execution
- Include current state in tool descriptions (available rooms, participant IDs)
- Use Zod validation on Edge Function input

**Warning signs:** Database constraint violations, foreign key errors

### Pitfall 4: Race Conditions in Seating Algorithm

**What goes wrong:** Two managers assign tables simultaneously, breaking constraints

**Why it happens:** No locking mechanism on table assignments

**How to avoid:**
- Use PostgreSQL row-level locks (`SELECT ... FOR UPDATE`)
- Check table capacity in database transaction before insert
- Add unique constraint on `(event_id, participant_id, table_id)`

**Warning signs:** Tables exceeding capacity, duplicate assignments

## Code Examples

### Example 1: Gemini Function Calling Setup

```typescript
// supabase/functions/ai-chat/index.ts (extended)

import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY'))

const tools = [
  {
    name: 'assign_room',
    description: 'Assign a participant to a hotel room',
    parameters: {
      type: 'object',
      properties: {
        participant_id: { type: 'string', description: 'Participant UUID' },
        room_id: { type: 'string', description: 'Room UUID' },
        reason: { type: 'string', description: 'Why this assignment (for audit log)' }
      },
      required: ['participant_id', 'room_id']
    }
  },
  {
    name: 'send_message',
    description: 'Send WhatsApp message to participant',
    parameters: {
      type: 'object',
      properties: {
        participant_id: { type: 'string' },
        message_type: { type: 'string', enum: ['reminder', 'update', 'alert'] },
        template_id: { type: 'string', description: 'Message template UUID' }
      },
      required: ['participant_id', 'template_id']
    }
  }
]

const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-pro',
  tools: [{ functionDeclarations: tools }]
})

// When Gemini returns function call
const result = await chat.sendMessage(userMessage)
const functionCall = result.response.functionCalls()?.[0]

if (functionCall) {
  // Return to frontend for confirmation (DO NOT EXECUTE YET)
  return new Response(JSON.stringify({
    type: 'function_call',
    function: functionCall.name,
    arguments: functionCall.args,
    preview: generatePreview(functionCall)  // Human-readable summary
  }), { headers: { 'Content-Type': 'application/json' } })
}
```

**Source:** Gemini API documentation (as of training cutoff)

### Example 2: Dexie Offline Database

```typescript
// lib/offline-db.ts

import Dexie, { Table } from 'dexie'

interface Participant {
  id: string
  event_id: string
  first_name: string
  last_name: string
  phone: string
  vip: boolean
}

interface CheckIn {
  id?: number  // Auto-increment for local storage
  participant_id: string
  checked_in_at: string
  checked_in_by: string
  synced: boolean
}

class EventFlowOfflineDB extends Dexie {
  participants!: Table<Participant, string>
  checkIns!: Table<CheckIn, number>

  constructor() {
    super('EventFlowOffline')

    this.version(1).stores({
      participants: 'id, event_id, [first_name+last_name], vip',
      checkIns: '++id, participant_id, synced'
    })
  }
}

export const offlineDB = new EventFlowOfflineDB()

// Prefetch participants for current event
export async function prefetchParticipants(eventId: string) {
  const { data } = await supabase
    .from('participants')
    .select('*')
    .eq('event_id', eventId)

  if (data) {
    await offlineDB.participants.bulkPut(data)
  }
}

// Check-in with offline fallback
export async function checkInParticipant(participantId: string, checkedInBy: string) {
  const checkIn: CheckIn = {
    participant_id: participantId,
    checked_in_at: new Date().toISOString(),
    checked_in_by: checkedInBy,
    synced: false
  }

  // Try online first
  if (navigator.onLine) {
    try {
      const { error } = await supabase.from('check_ins').insert({
        participant_id: checkIn.participant_id,
        checked_in_at: checkIn.checked_in_at,
        checked_in_by: checkIn.checked_in_by
      })

      if (!error) {
        checkIn.synced = true
      }
    } catch (err) {
      console.warn('Online check-in failed, queueing offline', err)
    }
  }

  // Store locally (always, even if online succeeded)
  await offlineDB.checkIns.add(checkIn)

  return checkIn
}

// Sync pending check-ins
export async function syncPendingCheckIns() {
  const pending = await offlineDB.checkIns.where('synced').equals(false).toArray()

  for (const checkIn of pending) {
    try {
      const { error } = await supabase.from('check_ins').insert({
        participant_id: checkIn.participant_id,
        checked_in_at: checkIn.checked_in_at,
        checked_in_by: checkIn.checked_in_by
      })

      if (!error && checkIn.id) {
        await offlineDB.checkIns.update(checkIn.id, { synced: true })
      }
    } catch (err) {
      console.error('Sync failed for check-in', checkIn.id, err)
    }
  }
}
```

**Source:** Dexie documentation (as of training cutoff)

### Example 3: Service Worker with Workbox

```typescript
// src/service-worker.ts (generated by vite-plugin-pwa)

import { precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst, CacheFirst } from 'workbox-strategies'

// Precache static assets
precacheAndRoute(self.__WB_MANIFEST)

// API calls: Network first, fallback to cache
registerRoute(
  ({ url }) => url.pathname.startsWith('/rest/v1/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 3,
  })
)

// Images: Cache first
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({ cacheName: 'images' })
)

// Background sync for check-ins
self.addEventListener('sync', async (event) => {
  if (event.tag === 'sync-checkins') {
    // Import and call your sync function
    const { syncPendingCheckIns } = await import('./lib/offline-db')
    await syncPendingCheckIns()
  }
})

// Update detection
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
```

**Source:** Workbox documentation (as of training cutoff)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| LangChain for AI agents | Direct Gemini API with function calling | 2024 | Simpler, less abstraction, better TypeScript support |
| LocalStorage for offline | IndexedDB via Dexie | Ongoing | Structured queries, larger storage, no size limits |
| Custom Service Worker | Workbox | 2019 | Less boilerplate, handles edge cases |
| External scheduler (n8n, Zapier) | PostgreSQL pg_cron | v1.0 | No external dependencies, native to Supabase |

**Deprecated/outdated:**
- **PouchDB for offline sync:** Heavy (500KB+), designed for CouchDB sync which you don't need
- **Redux for state management:** TanStack Query already handles server state, React 19 hooks handle local state
- **Vercel AI SDK:** Useful for multi-provider abstraction, but you're locked into Gemini (already integrated)

## Open Questions

1. **Gemini function calling limits**
   - What we know: Gemini 1.5 Pro supports function calling
   - What's unclear: Rate limits, concurrent function calls, error handling specifics
   - Recommendation: Test thoroughly with production API key, implement retry logic

2. **iOS Service Worker background sync support**
   - What we know: iOS 16.4+ supports Service Workers and Background Sync API
   - What's unclear: Reliability in low-battery mode, time limits for sync events
   - Recommendation: Test on real iOS devices at event venue with poor connectivity

3. **Table assignment algorithm scale**
   - What we know: Greedy + backtracking works for <500 participants
   - What's unclear: Performance with 1,000+ participants, optimal heuristics for large events
   - Recommendation: Implement greedy first, profile with production data, optimize if needed

## Sources

### Primary (HIGH confidence)

- Supabase documentation: Edge Functions, pg_cron, RLS (verified in v1.0)
- Gemini API documentation: Function calling (official Google AI docs, as of training cutoff)
- Dexie.js documentation: IndexedDB wrapper patterns (official docs, widely used)
- Workbox documentation: Service Worker strategies (official Google docs)

### Secondary (MEDIUM confidence)

- React 19 patterns: State management, hooks (official React docs)
- Vite PWA plugin: Configuration (official plugin docs)
- Event seating algorithms: Domain knowledge from event management systems (general practice, not library-specific)

### Tertiary (LOW confidence - needs validation)

- Gemini function calling rate limits: Not explicitly documented in training data, needs production testing
- iOS Background Sync reliability: Anecdotal reports, needs real-device testing
- Algorithm performance at scale: Theoretical complexity, needs profiling with real data

## Metadata

**Confidence breakdown:**
- AI function calling: MEDIUM - API documented but rate limits unclear
- Offline-first: HIGH - Dexie + Workbox are proven, standard patterns
- Networking algorithm: MEDIUM - Custom implementation, needs testing at scale
- Simulation: HIGH - Simple logic, no complex dependencies
- Vendor intelligence: HIGH - Basic statistics, straightforward implementation

**Research date:** 2026-02-02
**Valid until:** 2026-03-02 (30 days - stable technologies)

**What might be missing:**
- Specific Gemini API rate limits for function calling (needs testing)
- iOS Service Worker edge cases (needs device testing)
- Performance benchmarks for seating algorithm at scale (needs profiling)
- Supabase Edge Function timeout limits for simulation (check Supabase docs)
