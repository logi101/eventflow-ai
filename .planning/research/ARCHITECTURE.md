# Architecture Integration: EventFlow AI v2.0

**Domain:** Event management system
**Researched:** 2026-02-02
**Confidence:** HIGH (based on existing codebase analysis)

## Executive Summary

EventFlow AI v2.0 adds intelligent production features to a working v1.0 system. The existing architecture is React 19 + Supabase with Edge Functions, pg_cron automation, and Gemini AI integration. All v2.0 changes must be **additive only** — no breaking changes to existing functionality.

**Critical constraint:** The system is production-ready with automated reminder cron jobs, template engine, and WhatsApp integration. New features must integrate seamlessly without disrupting existing flows.

---

## Existing Architecture (v1.0)

### Frontend Architecture

```
React 19 + TypeScript + Vite
├── Services Layer
│   └── chatService.ts (Gemini routing, slash commands)
├── Pages
│   ├── checkin/CheckinPage.tsx (QR scan, manual entry)
│   └── Various event management pages
├── Components
│   ├── rooms/RoomAssignmentPanel.tsx (participant_rooms management)
│   └── UI components (TailwindCSS)
├── Types
│   └── chat.ts (80+ action types, mostly unimplemented)
└── Contexts
    └── EventContext (selected event state)
```

**Key characteristics:**
- **Hebrew-first (RTL)** - all UI is right-to-left
- **TanStack Query** for data fetching
- **Zod** for validation
- **No state management library** - React Context + hooks

### Backend Architecture

```
Supabase (PostgreSQL + Auth + Edge Functions + pg_cron)
├── Database (30+ tables with RLS)
│   ├── Core: organizations, user_profiles, events, participants
│   ├── Scheduling: schedules, participant_schedules, schedule_change_log
│   ├── Messaging: messages, message_templates
│   ├── Vendors: vendors, event_vendors, vendor_categories
│   ├── Program: tracks, rooms, speakers, time_blocks
│   ├── Accommodation: participant_rooms
│   └── AI: ai_chat_sessions, ai_chat_messages
├── Edge Functions
│   ├── send-whatsapp (Green API integration)
│   ├── send-reminder v14 (1,375 lines, 10 reminder types)
│   ├── send-push-notification (PWA notifications)
│   └── ai-chat (Gemini with 7 tool functions)
└── pg_cron Jobs (8 active)
    ├── Every 5min: activation, process_scheduled
    ├── Daily 8am: week_before, morning
    ├── Daily 7pm: day_before
    ├── Every 3min: process_changes
    └── Weekly: follow_up_3mo, follow_up_6mo
```

**Key characteristics:**
- **Row Level Security (RLS)** on all tables
- **Template engine** with fallback chain: org-specific → system → hardcoded
- **Deduplication** via unique constraint on (event_id, participant_id, message_type)
- **Rate limiting** built into send-reminder: 2.1s throttle between sends
- **Retry logic** for transient WhatsApp failures

### AI Integration (Current)

```
Frontend chatService.ts → Supabase Edge Function ai-chat → Gemini API
```

**Current AI capabilities (read-only):**
- search_events
- search_vendors
- get_event_details
- suggest_schedule
- create_event_draft ✓ (writes to DB!)
- add_checklist_items ✓ (writes to DB!)
- assign_vendors ✓ (writes to DB!)

**Important:** AI already has DB write access via create_event_draft, add_checklist_items, and assign_vendors tools. These tools write directly to the database. The pattern is established.

---

## v2.0 Features and Integration Points

### 1. AI Agent with Enhanced DB Writes

**What it is:** Extend existing Gemini function calling with new tools for schedule management, room assignments, and participant management.

**Existing foundation:**
- ✅ ai-chat Edge Function with 7 tools (3 write to DB)
- ✅ chatService.ts with Gemini routing
- ✅ Action type definitions in chat.ts (80+ types)
- ✅ System prompt and tool declarations in ai-chat/index.ts

**Integration points:**

| Component | File | Change Type | What Changes |
|-----------|------|-------------|--------------|
| Edge Function | `ai-chat/index.ts` | Extend | Add 5-7 new tool declarations |
| Frontend Service | `chatService.ts` | Minor | Handle new action types |
| Types | `chat.ts` | Extend | Use existing ActionType enum |
| Database | N/A | No change | Use existing tables |

**New tools to add:**
1. **create_schedule_items** - Add sessions to schedules table
2. **update_schedule_item** - Modify existing session (time, location, speaker)
3. **assign_participant_to_track** - Link participant to track
4. **assign_room** - Assign participant to participant_rooms
5. **detect_schedule_conflict** - Check for overlapping sessions/rooms
6. **send_whatsapp_message** - Send immediate WhatsApp notification
7. **suggest_room_assignment** - AI-based room pairing suggestions

**Build order:**
1. Add tool declarations to ai-chat/index.ts (TOOL_DECLARATIONS array)
2. Implement execute functions (similar to executeAddChecklistItems pattern)
3. Add to executeTool dispatcher
4. Update extractActions for new tool types
5. Test via chat UI

**No breaking changes:** All new tools are additive. Existing tools remain unchanged.

---

### 2. Offline Check-in

**What it is:** Service Worker caches participant list + QR mappings, syncs check-ins when back online.

**Existing foundation:**
- ✅ CheckinPage.tsx with manual QR entry
- ✅ participants table with checked_in_at field
- ✅ QR code generation: `EF-${participant.id.substring(0, 8)}`

**Integration points:**

| Component | File | Change Type | What Changes |
|-----------|------|-------------|--------------|
| Service Worker | `public/sw.js` | New file | Cache participants, sync check-ins |
| PWA Manifest | `public/manifest.json` | Extend | Add offline capability |
| CheckinPage | `CheckinPage.tsx` | Extend | Add offline indicator, sync status |
| API Layer | New service | New file | IndexedDB wrapper for offline queue |

**Architecture:**

```
CheckinPage (React)
    ↓
Offline Service (new)
    ├─ Online: Direct Supabase write
    └─ Offline: IndexedDB queue
           ↓
      Service Worker sync event
           ↓
      Supabase update when online
```

**Data flow:**

```typescript
// Offline check-in
1. User clicks check-in while offline
2. Write to IndexedDB: { participant_id, timestamp, synced: false }
3. Update local React state (optimistic UI)
4. Service Worker detects network
5. Flush IndexedDB queue to Supabase
6. Mark synced: true
```

**Build order:**
1. Create `src/services/offlineService.ts` with IndexedDB wrapper
2. Create `public/sw.js` with cache + sync logic
3. Modify CheckinPage to use offlineService
4. Add offline indicator UI (network status badge)
5. Add sync status display (pending uploads count)

**No breaking changes:** Online mode works exactly as before. Offline is progressive enhancement.

---

### 3. Networking Engine

**What it is:** Table seating algorithm that groups participants by shared interests/tracks.

**Existing foundation:**
- ✅ participants table (has is_vip field, no networking fields yet)
- ✅ tracks table (event-level tracks)
- ✅ participant_schedules table (participant-session links)

**Required database changes (ADDITIVE):**

```sql
-- Add networking opt-in to participants
ALTER TABLE participants
ADD COLUMN networking_opt_in BOOLEAN DEFAULT FALSE;

-- Create table_assignments table (new)
CREATE TABLE table_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  table_number INTEGER NOT NULL,
  seat_number INTEGER,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES user_profiles(id),
  reason TEXT, -- "Track: AI", "VIP priority", "Networking match"
  UNIQUE(event_id, participant_id)
);
```

**Integration points:**

| Component | File | Change Type | What Changes |
|-----------|------|-------------|--------------|
| Database | Migration | New table | Add table_assignments |
| Database | Migration | Alter table | Add networking_opt_in to participants |
| AI Tool | `ai-chat/index.ts` | New tool | suggest_table_seating |
| Algorithm | New service | New file | Networking algorithm |
| UI | New component | New file | Table seating UI panel |

**Algorithm architecture:**

```typescript
// src/services/networkingEngine.ts
interface NetworkingInput {
  participants: Participant[]
  tracks: Track[]
  participantSchedules: ParticipantSchedule[]
  tablesAvailable: number
  seatsPerTable: number
}

interface SeatingPlan {
  tables: Array<{
    table_number: number
    participants: Participant[]
    shared_interests: string[]
    vip_count: number
  }>
  unassigned: Participant[]
  score: number // quality metric
}

function generateSeatingPlan(input: NetworkingInput): SeatingPlan {
  // 1. Filter opt-in participants
  // 2. Extract interests from participant_schedules
  // 3. Cluster by shared tracks/sessions
  // 4. Assign VIPs first
  // 5. Fill remaining seats with highest interest overlap
  // 6. Balance table sizes
}
```

**Build order:**
1. Run migration to add networking_opt_in, table_assignments
2. Create networkingEngine.ts with algorithm
3. Add suggest_table_seating tool to ai-chat
4. Create TableSeatingPanel.tsx component
5. Add UI to participants page (opt-in checkbox)
6. Add UI to event detail page (seating plan view)

**No breaking changes:** New table, new field with DEFAULT. Existing queries unaffected.

---

### 4. Vendor Intelligence

**What it is:** AI analysis of vendor quotes + budget alerts.

**Existing foundation:**
- ✅ event_vendors table with quoted_amount, approved_amount
- ✅ vendors table with category_id
- ✅ events table with budget field

**Required database changes (ADDITIVE):**

```sql
-- Add AI insights log table (new)
CREATE TABLE ai_insights_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL, -- 'budget_alert', 'vendor_recommendation', 'cost_optimization'
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES user_profiles(id)
);

-- Add vendor_id to checklist_items (link vendor tasks)
ALTER TABLE checklist_items
ADD COLUMN vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL;
```

**Integration points:**

| Component | File | Change Type | What Changes |
|-----------|------|-------------|--------------|
| Database | Migration | New table | Add ai_insights_log |
| Database | Migration | Alter table | Add vendor_id to checklist_items |
| AI Tool | `ai-chat/index.ts` | New tool | analyze_vendor_quotes |
| AI Tool | `ai-chat/index.ts` | New tool | check_budget_status |
| UI | New component | New file | BudgetAlertPanel.tsx |
| Cron Job | New | New cron | Daily budget check |

**Analysis algorithm:**

```typescript
// AI tool: analyze_vendor_quotes
// Runs when vendor quotes are added/updated
async function analyzeVendorQuotes(eventId: string) {
  // 1. Fetch event budget
  // 2. Fetch all event_vendors with quotes
  // 3. Calculate total quoted vs approved vs budget
  // 4. Detect anomalies (quote 50%+ over category average)
  // 5. Generate insight: "Catering quote is 30% over budget. Consider Vendor X instead."
  // 6. Insert to ai_insights_log
  // 7. Send push notification if critical
}
```

**Build order:**
1. Run migrations (ai_insights_log, vendor_id on checklist_items)
2. Add analyze_vendor_quotes tool to ai-chat
3. Add check_budget_status tool to ai-chat
4. Create BudgetAlertPanel.tsx for UI
5. Add pg_cron job for daily budget checks
6. Integrate panel into event detail page

**No breaking changes:** New table, new field with DEFAULT. Existing queries unaffected.

---

### 5. Day Simulation (Stress Test)

**What it is:** AI runs through event day timeline, flags conflicts/gaps.

**Existing foundation:**
- ✅ schedules table with start_time, end_time, location, room
- ✅ participant_schedules table
- ✅ participant_rooms table
- ✅ messages table with scheduled_for

**Integration points:**

| Component | File | Change Type | What Changes |
|-----------|------|-------------|--------------|
| AI Tool | `ai-chat/index.ts` | New tool | run_day_simulation |
| Service | New service | New file | simulationEngine.ts |
| UI | New component | New file | SimulationReport.tsx |

**Simulation algorithm:**

```typescript
// src/services/simulationEngine.ts
interface SimulationResult {
  conflicts: Conflict[]
  gaps: Gap[]
  bottlenecks: Bottleneck[]
  recommendations: string[]
}

interface Conflict {
  type: 'room_overlap' | 'speaker_double_booking' | 'participant_overlap'
  time: string
  entities: string[]
  severity: 'critical' | 'warning'
}

async function simulateDayTimeline(eventId: string): Promise<SimulationResult> {
  // 1. Fetch all schedules, sorted by start_time
  // 2. Detect room conflicts (same room, overlapping times)
  // 3. Detect speaker conflicts (same speaker, overlapping times)
  // 4. Detect participant overload (too many simultaneous sessions they're in)
  // 5. Detect gaps (>2 hours with no activity)
  // 6. Detect bottlenecks (rooms at >90% capacity)
  // 7. Generate recommendations
}
```

**Build order:**
1. Create simulationEngine.ts with timeline analysis
2. Add run_day_simulation tool to ai-chat
3. Create SimulationReport.tsx component
4. Add "Simulate Day" button to event detail page
5. Display results in modal/panel

**No breaking changes:** Read-only analysis. No schema changes needed.

---

## Component Interaction Map

```
┌─────────────────────────────────────────────────────────────────┐
│                        EventFlow AI v2.0                        │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│  Frontend (React)│
└────────┬─────────┘
         │
    ┌────▼────────────────────────────────────────────────────┐
    │ chatService.ts                                          │
    │ - Routes to Gemini                                      │
    │ - Handles 80+ action types                             │
    │ - Manages conversation history                          │
    └────┬────────────────────────────────────────────────────┘
         │
         │ supabase.functions.invoke('ai-chat', {...})
         │
    ┌────▼────────────────────────────────────────────────────┐
    │ Edge Function: ai-chat/index.ts                         │
    │ ┌────────────────────────────────────────────────────┐  │
    │ │ Existing Tools (v1.0)                             │  │
    │ │ - search_events                                    │  │
    │ │ - search_vendors                                   │  │
    │ │ - get_event_details                                │  │
    │ │ - suggest_schedule                                 │  │
    │ │ - create_event_draft ✓ DB WRITE                  │  │
    │ │ - add_checklist_items ✓ DB WRITE                 │  │
    │ │ - assign_vendors ✓ DB WRITE                      │  │
    │ └────────────────────────────────────────────────────┘  │
    │ ┌────────────────────────────────────────────────────┐  │
    │ │ New Tools (v2.0) - ADDITIVE                       │  │
    │ │ - create_schedule_items ✓ DB WRITE               │  │
    │ │ - update_schedule_item ✓ DB WRITE                │  │
    │ │ - assign_participant_to_track ✓ DB WRITE         │  │
    │ │ - assign_room ✓ DB WRITE                         │  │
    │ │ - detect_schedule_conflict (READ)                 │  │
    │ │ - send_whatsapp_message ✓ DB WRITE               │  │
    │ │ - suggest_room_assignment (ALGORITHM)             │  │
    │ │ - suggest_table_seating (ALGORITHM)               │  │
    │ │ - analyze_vendor_quotes (ANALYSIS)                │  │
    │ │ - check_budget_status (ANALYSIS)                  │  │
    │ │ - run_day_simulation (ANALYSIS)                   │  │
    │ └────────────────────────────────────────────────────┘  │
    └────┬────────────────────────────────────────────────────┘
         │
         │ Gemini Function Calling (tool execution loop)
         │
    ┌────▼────────────────────────────────────────────────────┐
    │ Supabase PostgreSQL                                     │
    │ ┌────────────────────────────────────────────────────┐  │
    │ │ Existing Tables (v1.0)                            │  │
    │ │ - events, participants, vendors                    │  │
    │ │ - schedules, participant_schedules                 │  │
    │ │ - messages, message_templates                      │  │
    │ │ - checklist_items, event_vendors                   │  │
    │ │ - participant_rooms, tracks, rooms, speakers       │  │
    │ └────────────────────────────────────────────────────┘  │
    │ ┌────────────────────────────────────────────────────┐  │
    │ │ New Tables (v2.0) - ADDITIVE                      │  │
    │ │ - table_assignments (new)                          │  │
    │ │ - ai_insights_log (new)                            │  │
    │ └────────────────────────────────────────────────────┘  │
    │ ┌────────────────────────────────────────────────────┐  │
    │ │ New Fields (v2.0) - ADDITIVE                      │  │
    │ │ - participants.networking_opt_in (DEFAULT FALSE)   │  │
    │ │ - checklist_items.vendor_id (nullable)             │  │
    │ └────────────────────────────────────────────────────┘  │
    └─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Offline Check-in (v2.0 - ADDITIVE)                             │
└─────────────────────────────────────────────────────────────────┘

CheckinPage.tsx
    │
    │ Online?
    ├── YES → supabase.from('participants').update(...)
    │
    └── NO  → offlineService.queueCheckIn(...)
                │
                └─> IndexedDB: pending_checkins[]
                        │
                        └─> Service Worker (sw.js)
                                │ Network restored?
                                └─> Flush queue to Supabase

┌─────────────────────────────────────────────────────────────────┐
│  pg_cron Jobs (v1.0 + v2.0)                                     │
└─────────────────────────────────────────────────────────────────┘

Existing (v1.0):
- Every 5min: activation, process_scheduled
- Daily 8am: week_before, morning
- Daily 7pm: day_before
- Every 3min: process_changes
- Weekly: follow_up_3mo, follow_up_6mo

New (v2.0) - ADDITIVE:
- Daily 6am: check_budget_status (via ai-chat tool)
- Daily 7am: analyze_vendor_quotes (via ai-chat tool)
```

---

## Data Flow: AI Agent Writes to DB

### Example: Create Schedule Item via AI

```
1. User (chat): "הוסף הרצאה 'בינה מלאכותית באירועים' ב-10:00 באולם A"

2. chatService.ts → ai-chat Edge Function
   Body: { message: "...", eventId: "abc-123", organizationId: "org-456" }

3. ai-chat Edge Function
   ↓ Gemini API with system prompt + tools
   ↓ Gemini decides: use tool "create_schedule_items"
   ↓ Tool call: {
       name: "create_schedule_items",
       args: {
         event_id: "abc-123",
         items: [{
           title: "בינה מלאכותית באירועים",
           start_time: "2026-03-15T10:00:00",
           location: "אולם A",
           duration_minutes: 60
         }]
       }
     }

4. executeCreateScheduleItems(supabase, args)
   ↓ Validate event exists
   ↓ Insert to schedules table
   ↓ Return: { success: true, data: { schedule_id: "xyz-789" } }

5. Gemini receives tool response
   ↓ Generates Hebrew response: "הוספתי את ההרצאה 'בינה מלאכותית באירועים' ב-10:00 באולם A!"

6. Edge Function returns to frontend:
   {
     response: "הוספתי את ההרצאה...",
     actions: [{
       type: "schedule_items_added",
       data: { schedule_id: "xyz-789" },
       status: "completed"
     }]
   }

7. chatService.ts processes response
   ↓ Displays AI message
   ↓ Triggers UI refresh (TanStack Query invalidation)
   ↓ User sees new schedule item in UI
```

**Key insight:** The pattern is already established with create_event_draft, add_checklist_items, assign_vendors. We're just adding more tools following the same pattern.

---

## Suggested Build Order (Phased Approach)

### Phase 1: AI Agent Enhanced Tools (2-3 days)
**Goal:** Extend AI with schedule + room management tools

1. Add tool declarations to ai-chat/index.ts
   - create_schedule_items
   - update_schedule_item
   - detect_schedule_conflict
   - assign_room

2. Implement execute functions (follow executeAddChecklistItems pattern)

3. Update extractActions for new action types

4. Test via chat UI (no frontend changes needed)

**Deliverable:** AI can manage schedules and rooms via chat

---

### Phase 2: Database Schema Extensions (1 day)
**Goal:** Add networking and vendor intelligence tables

1. Write migrations:
   - ALTER TABLE participants ADD networking_opt_in
   - CREATE TABLE table_assignments
   - CREATE TABLE ai_insights_log
   - ALTER TABLE checklist_items ADD vendor_id

2. Run migrations in Supabase dashboard

3. Update RLS policies for new tables

**Deliverable:** Database ready for networking + vendor features

---

### Phase 3: Networking Engine (3-4 days)
**Goal:** Table seating algorithm + UI

1. Create networkingEngine.ts with clustering algorithm

2. Add suggest_table_seating tool to ai-chat

3. Create TableSeatingPanel.tsx component

4. Add opt-in checkbox to participants page

5. Add seating plan view to event detail page

**Deliverable:** Networking engine working with AI + UI

---

### Phase 4: Offline Check-in (2-3 days)
**Goal:** Service Worker + IndexedDB for offline capability

1. Create offlineService.ts with IndexedDB wrapper

2. Create public/sw.js with cache + sync logic

3. Modify CheckinPage.tsx to use offlineService

4. Add offline indicator UI

5. Test offline → online sync

**Deliverable:** Check-in works offline, syncs when back online

---

### Phase 5: Vendor Intelligence (2-3 days)
**Goal:** AI budget analysis + alerts

1. Add analyze_vendor_quotes tool to ai-chat

2. Add check_budget_status tool to ai-chat

3. Create BudgetAlertPanel.tsx

4. Add pg_cron job for daily budget checks

5. Integrate panel into event detail page

**Deliverable:** Budget alerts + vendor recommendations

---

### Phase 6: Day Simulation (2 days)
**Goal:** Stress test timeline analysis

1. Create simulationEngine.ts with conflict detection

2. Add run_day_simulation tool to ai-chat

3. Create SimulationReport.tsx component

4. Add "Simulate Day" button to event detail

**Deliverable:** Pre-event stress test with conflict report

---

## Files to Modify vs. New Files

### Modify Existing Files (Extend Only)

| File | What Changes | Risk Level |
|------|--------------|------------|
| `eventflow-app/supabase/functions/ai-chat/index.ts` | Add 11 new tool declarations + execute functions | LOW (additive) |
| `eventflow-app/src/services/chatService.ts` | Handle new action types in detectActionsFromResponse | LOW (additive) |
| `eventflow-app/src/types/chat.ts` | Use existing ActionType enum (already 80+ types) | NONE |
| `eventflow-app/src/pages/checkin/CheckinPage.tsx` | Integrate offlineService, add sync status UI | LOW (progressive enhancement) |
| `eventflow-app/src/components/rooms/RoomAssignmentPanel.tsx` | Add AI suggestion button | LOW (additive) |

### New Files to Create

| File | Purpose | Complexity |
|------|---------|------------|
| `eventflow-app/src/services/offlineService.ts` | IndexedDB wrapper for offline queue | Medium |
| `eventflow-app/public/sw.js` | Service Worker for offline check-in | Medium |
| `eventflow-app/src/services/networkingEngine.ts` | Table seating algorithm | Medium |
| `eventflow-app/src/services/simulationEngine.ts` | Day timeline conflict detection | Medium |
| `eventflow-app/src/components/tables/TableSeatingPanel.tsx` | Seating plan UI | Low |
| `eventflow-app/src/components/budget/BudgetAlertPanel.tsx` | Budget alerts UI | Low |
| `eventflow-app/src/components/simulation/SimulationReport.tsx` | Simulation results UI | Low |
| `eventflow-app/supabase/migrations/20260202_networking.sql` | Add networking_opt_in, table_assignments | Low |
| `eventflow-app/supabase/migrations/20260202_vendor_intelligence.sql` | Add ai_insights_log, vendor_id | Low |

---

## Critical Integration Patterns

### Pattern 1: AI Tool Addition (No Breaking Changes)

```typescript
// ai-chat/index.ts

// STEP 1: Add to TOOL_DECLARATIONS array
const TOOL_DECLARATIONS = [
  // ... existing tools ...
  {
    name: 'create_schedule_items',
    description: 'הוספת פריטים ללוח הזמנים',
    parameters: {
      type: 'OBJECT',
      properties: {
        event_id: { type: 'STRING', description: 'מזהה האירוע' },
        items: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              title: { type: 'STRING', description: 'שם הפעילות' },
              start_time: { type: 'STRING', description: 'ISO timestamp' },
              duration_minutes: { type: 'INTEGER' }
            }
          }
        }
      },
      required: ['event_id', 'items']
    }
  }
]

// STEP 2: Implement execute function
async function executeCreateScheduleItems(
  supabase: SupabaseClient,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const eventId = args.event_id as string
  const items = args.items as Array<{...}>

  // Validate
  // Insert
  // Return result
}

// STEP 3: Add to dispatcher
async function executeTool(toolName: string, ...) {
  switch (toolName) {
    // ... existing cases ...
    case 'create_schedule_items':
      return executeCreateScheduleItems(supabase, args)
  }
}

// STEP 4: Update extractActions
function extractActions(toolCallLog) {
  for (const call of toolCallLog) {
    switch (call.name) {
      // ... existing cases ...
      case 'create_schedule_items':
        actions.push({
          type: 'schedule_items_added',
          status: 'completed'
        })
    }
  }
}
```

**Why this is safe:**
- No existing tools are modified
- New tools are opt-in (AI chooses when to use them)
- Fallback if tool fails: AI gets error in tool response, can retry or explain to user

---

### Pattern 2: Database Migration (Additive Only)

```sql
-- ✓ SAFE: Add new column with DEFAULT
ALTER TABLE participants
ADD COLUMN networking_opt_in BOOLEAN DEFAULT FALSE;

-- ✓ SAFE: Add new column nullable
ALTER TABLE checklist_items
ADD COLUMN vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL;

-- ✓ SAFE: Create new table
CREATE TABLE table_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  table_number INTEGER NOT NULL,
  UNIQUE(event_id, participant_id)
);

-- ✓ SAFE: Add new index
CREATE INDEX idx_table_assignments_event ON table_assignments(event_id);

-- ✗ UNSAFE: Don't do this
-- ALTER TABLE participants DROP COLUMN phone;
-- ALTER TABLE messages RENAME COLUMN content TO body;
```

**Why additive migrations are safe:**
- Existing queries don't select new columns, so they're unaffected
- DEFAULT values mean INSERT without new column still works
- Nullable foreign keys don't break existing inserts
- New tables don't affect existing queries

---

### Pattern 3: Progressive Enhancement (Offline Check-in)

```typescript
// CheckinPage.tsx

async function handleCheckIn(participantId: string) {
  // Try online first
  if (navigator.onLine) {
    try {
      await supabase
        .from('participants')
        .update({ status: 'checked_in', checked_in_at: new Date().toISOString() })
        .eq('id', participantId)

      // Success - update UI immediately
      return
    } catch (error) {
      // Network error - fall through to offline
    }
  }

  // Offline fallback
  await offlineService.queueCheckIn(participantId)
  // Update UI optimistically
  // Service Worker will sync when online
}
```

**Why this is safe:**
- Online behavior unchanged (direct Supabase write)
- Offline is additive (if offlineService fails, error is isolated)
- User always sees feedback (optimistic UI)
- No data loss (queued in IndexedDB, synced later)

---

## Risk Mitigation

### Risk 1: AI Tools Write Bad Data

**Mitigation:**
- All tools validate inputs (event exists, dates are valid, etc.)
- Tools return ToolResult with success/error
- Gemini sees errors and can retry or explain to user
- RLS policies prevent cross-org writes
- Audit trail: ai_chat_messages table logs all AI actions

**Example validation:**
```typescript
async function executeCreateScheduleItems(...) {
  // Validate event exists and user has access (RLS)
  const { data: event, error } = await supabase
    .from('events')
    .select('id, start_date')
    .eq('id', eventId)
    .single()

  if (error) {
    return { success: false, error: 'Event not found or no access' }
  }

  // Validate times are within event dates
  for (const item of items) {
    const startTime = new Date(item.start_time)
    if (startTime < new Date(event.start_date)) {
      return { success: false, error: 'Session starts before event' }
    }
  }

  // Insert
}
```

---

### Risk 2: Offline Sync Conflicts

**Mitigation:**
- Check-in is write-once (can't check-in twice)
- Unique constraint on participants.id prevents duplicates
- Service Worker retries with exponential backoff
- UI shows sync status (pending uploads badge)

**Conflict resolution:**
```typescript
// offlineService.ts
async function syncPendingCheckIns() {
  const pending = await getPendingFromIndexedDB()

  for (const checkIn of pending) {
    try {
      // Upsert with conflict resolution
      const { error } = await supabase
        .from('participants')
        .update({
          status: 'checked_in',
          checked_in_at: checkIn.timestamp
        })
        .eq('id', checkIn.participant_id)
        .eq('status', 'confirmed') // Only update if not already checked in

      if (!error) {
        await markSyncedInIndexedDB(checkIn.id)
      }
    } catch (e) {
      // Retry later
    }
  }
}
```

---

### Risk 3: Performance Degradation

**Concerns:**
- AI tools add latency (tool call → DB query → Gemini → response)
- Networking algorithm O(n²) complexity
- Day simulation analyzes 100+ schedule items

**Mitigation:**
- Tool execution is async, UI shows loading state
- Networking algorithm runs server-side (Edge Function or pg function)
- Simulation is on-demand (user clicks "Simulate Day")
- Results cached in ai_insights_log (don't recompute)

**Performance budget:**
- AI tool latency: <3s per tool call (acceptable for chat)
- Networking algorithm: <10s for 500 participants
- Day simulation: <5s for 50 schedule items

---

## Deployment Strategy

### Step 1: Database Migrations (Non-Breaking)

```bash
# Run in Supabase SQL editor
psql -f supabase/migrations/20260202_networking.sql
psql -f supabase/migrations/20260202_vendor_intelligence.sql
```

**Rollback:** Migrations are additive, so rollback is just DROP TABLE / DROP COLUMN (but existing app keeps working even if not rolled back).

---

### Step 2: Deploy Edge Function (Backward Compatible)

```bash
# Deploy updated ai-chat function
supabase functions deploy ai-chat
```

**Rollback:** Previous version still works (new tools are additive, old tools unchanged).

---

### Step 3: Deploy Frontend (Progressive Enhancement)

```bash
# Build and deploy
npm run build
# Deploy to Firebase/Vercel/etc.
```

**Rollback:** Old frontend works with new backend (new tools are unused, old tools work as before).

---

### Step 4: Enable Features (Feature Flags)

```typescript
// config.ts
export const FEATURES = {
  offlineCheckIn: true,
  networkingEngine: true,
  vendorIntelligence: true,
  daySimulation: true
}
```

**Rollback:** Toggle flags to false, features disabled without redeployment.

---

## Testing Strategy

### Unit Tests

```typescript
// networkingEngine.test.ts
describe('generateSeatingPlan', () => {
  it('assigns VIPs to table 1', () => {
    const result = generateSeatingPlan({
      participants: [
        { id: '1', is_vip: true, networking_opt_in: true },
        { id: '2', is_vip: false, networking_opt_in: true }
      ],
      tablesAvailable: 2,
      seatsPerTable: 5
    })

    expect(result.tables[0].participants.some(p => p.is_vip)).toBe(true)
  })
})

// offlineService.test.ts
describe('queueCheckIn', () => {
  it('writes to IndexedDB when offline', async () => {
    await offlineService.queueCheckIn('participant-123')
    const queue = await offlineService.getPendingCheckIns()
    expect(queue).toContainEqual({ participant_id: 'participant-123' })
  })
})
```

---

### Integration Tests

```typescript
// ai-chat.test.ts
describe('ai-chat Edge Function', () => {
  it('creates schedule items via tool call', async () => {
    const response = await fetch('http://localhost:54321/functions/v1/ai-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'הוסף הרצאה ב-10:00',
        eventId: 'test-event-123',
        organizationId: 'test-org-456'
      })
    })

    const result = await response.json()
    expect(result.actions).toContainEqual({ type: 'schedule_items_added' })
  })
})
```

---

### E2E Tests (Playwright)

```typescript
// offline-checkin.spec.ts
test('check-in works offline', async ({ page, context }) => {
  // Go online, load participants
  await page.goto('/checkin')
  await page.waitForSelector('[data-testid="checkin-list"]')

  // Go offline
  await context.setOffline(true)

  // Check in participant
  await page.click('[data-testid="checkin-btn"]')
  await expect(page.locator('[data-testid="checkin-result"]')).toContainText('נרשם בהצלחה')

  // Verify sync indicator shows pending
  await expect(page.locator('[data-testid="sync-status"]')).toContainText('1 ממתינים')

  // Go online
  await context.setOffline(false)

  // Verify sync completes
  await expect(page.locator('[data-testid="sync-status"]')).toContainText('מסונכרן')
})
```

---

## Monitoring and Observability

### Metrics to Track

| Metric | Source | Alert Threshold |
|--------|--------|----------------|
| AI tool success rate | ai_chat_messages table | <90% success |
| Offline sync queue size | IndexedDB | >100 pending |
| Budget alert frequency | ai_insights_log | >5/day per event |
| Schedule conflicts detected | day simulation runs | >10 conflicts |
| Average AI response time | Edge Function logs | >5s |

### Logging Strategy

```typescript
// ai-chat/index.ts
console.log(`[AI Tool] ${toolName} - Event: ${eventId} - Result: ${result.success}`)

// offlineService.ts
console.log(`[Offline Sync] Synced ${count} check-ins - Pending: ${remaining}`)

// networkingEngine.ts
console.log(`[Networking] Generated seating for ${participants.length} participants - Score: ${score}`)
```

---

## Architecture Decision Records

### ADR 1: Why Add Tools to Existing ai-chat Instead of New Edge Function?

**Decision:** Extend ai-chat/index.ts with new tools

**Rationale:**
- Tool calling pattern already established (7 tools exist)
- Gemini can compose tools (search vendors → assign → add to checklist)
- Single conversation context (user doesn't switch between agents)
- Code reuse (executeTool dispatcher, extractActions)

**Alternatives considered:**
- New Edge Function per feature → More complex routing, context loss
- Frontend calls Supabase directly → No AI guidance, manual workflows

---

### ADR 2: Why Service Worker for Offline Instead of React Query Persistence?

**Decision:** Service Worker + IndexedDB

**Rationale:**
- Works even if tab closed (background sync)
- PWA integration (already have manifest.json)
- Can cache participant list (instant load offline)
- Network-aware (detect online/offline)

**Alternatives considered:**
- React Query devtools persistence → Only works while tab open
- LocalStorage → No background sync, size limits

---

### ADR 3: Why pg_cron for Budget Checks Instead of Client-Side?

**Decision:** Daily pg_cron job calls ai-chat tool

**Rationale:**
- Runs even if manager not logged in
- Consistent timing (every day at 6am)
- Server-side = access to all events in org
- Notification push even if app closed

**Alternatives considered:**
- Client-side on event detail page load → Only checks when manager visits
- Webhook from accounting system → Requires external integration

---

## Summary: Integration Confidence

| Feature | Integration Complexity | Breaking Change Risk | Confidence |
|---------|----------------------|---------------------|-----------|
| AI Enhanced Tools | Low (extend existing pattern) | None (additive) | HIGH |
| Offline Check-in | Medium (Service Worker new) | None (progressive) | HIGH |
| Networking Engine | Medium (algorithm + new table) | None (new table) | HIGH |
| Vendor Intelligence | Low (new table + AI tool) | None (new table) | HIGH |
| Day Simulation | Low (read-only analysis) | None (no schema change) | HIGH |

**Overall confidence: HIGH** - All changes are additive. Existing v1.0 functionality remains intact. Build order is clear. Rollback strategy is simple (feature flags).

---

## Next Steps for Roadmap Creation

Based on this architecture research, the roadmap should:

1. **Phase 1 (Week 1):** AI Enhanced Tools
   - Extend ai-chat/index.ts with 11 new tools
   - Test via chat UI (no frontend changes)
   - **Deliverable:** AI can manage schedules, rooms, networking

2. **Phase 2 (Week 2):** Database Schema + Networking Engine
   - Run migrations (networking_opt_in, table_assignments, ai_insights_log)
   - Implement networkingEngine.ts
   - Create TableSeatingPanel.tsx
   - **Deliverable:** Networking engine working

3. **Phase 3 (Week 3):** Offline Check-in + Vendor Intelligence
   - Implement Service Worker + offlineService.ts
   - Add budget analysis tools to ai-chat
   - Create BudgetAlertPanel.tsx
   - **Deliverable:** Offline check-in + budget alerts

4. **Phase 4 (Week 4):** Day Simulation + Polish
   - Implement simulationEngine.ts
   - Create SimulationReport.tsx
   - Add pg_cron jobs for daily checks
   - **Deliverable:** Full v2.0 feature set

**Total estimated time: 4 weeks with 1 developer**

---

*Research completed 2026-02-02. All findings based on existing EventFlow AI codebase analysis.*
