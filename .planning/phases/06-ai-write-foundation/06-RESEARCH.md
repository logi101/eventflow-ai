# Phase 6: AI Write Foundation - Research

**Researched:** 2026-02-02
**Domain:** AI-assisted database operations with confirmation workflows
**Confidence:** HIGH

## Summary

Phase 6 extends the existing AI chat system (Gemini function calling) from read-only operations to write operations with mandatory user confirmation and full audit trails. The standard approach builds on established patterns: (1) Gemini suggests database operations via function calling, (2) Edge Function returns structured actions requiring approval, (3) Frontend displays confirmation dialog with impact preview, (4) User approves or rejects, (5) Approved action executes via separate API call with RLS enforcement, (6) All actions logged to audit table.

The existing EventFlow AI chat already implements Gemini function calling with 7 tools, 3 of which perform writes (create_event_draft, add_checklist_items, assign_vendors). Phase 6 systematizes this into a formal "suggest + confirm + execute" workflow, adds schedule management tools (create/update/delete schedule items), implements conflict detection, and builds comprehensive audit logging.

**Primary recommendation:** Extend existing Gemini function calling with a two-phase execution model: (1) AI suggests write operations with impact preview returned as `pending_approval` actions, (2) Frontend executes approved actions via separate authenticated API calls that respect RLS. Use PostgreSQL exclusion constraints with GIST indexes for real-time schedule conflict detection. Log all AI-initiated writes to ai_insights_log table with user_id, event_id, action metadata, and approval status.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already Integrated)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Gemini 2.0 Flash API | v1beta | Function calling for AI suggestions | EventFlow's current AI engine, supports tool declarations |
| Supabase Edge Functions | Deno 1.x | Server-side AI logic with secrets | Already running ai-chat.ts with GEMINI_API_KEY |
| Supabase Client (authenticated) | 2.x | Frontend database operations | Enforces RLS via user JWT |
| PostgreSQL RLS | 15.x+ | Row-level security enforcement | Existing policies on events, schedules, participants |
| PostgreSQL btree_gist | Latest | Exclusion constraints for overlaps | Built-in extension for time range conflict detection |

### New Components for Phase 6
| Component | Purpose | When to Use |
|-----------|---------|-------------|
| ai_insights_log table | Audit trail for AI actions | Log every AI-suggested write with approval status |
| PostgreSQL exclusion constraints | Schedule conflict prevention | Detect room double-booking, speaker overlap in real-time |
| Confirmation action pattern | UX for dangerous operations | Before any AI-initiated write affects production data |
| VIP priority flags | Differentiate urgent requests | AI prioritizes VIP participant concerns in responses |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Two-phase suggest+execute | Direct AI writes with undo | Undo is complex for cascading changes; confirm is safer |
| Exclusion constraints | Application-level conflict checks | Race conditions; database guarantees atomicity |
| RLS with user JWT | Service role key for AI writes | Bypasses multi-tenant security; major vulnerability |
| PostgreSQL audit log | Custom logging table | Built-in audit extensions exist but custom ai_insights_log gives AI-specific metadata |

**Installation:**
```sql
-- Enable btree_gist for schedule conflict detection
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Create audit log table
CREATE TABLE ai_insights_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  event_id UUID REFERENCES events(id),
  action_type TEXT NOT NULL, -- 'schedule_create', 'schedule_update', 'schedule_delete', 'participant_assign', etc.
  action_data JSONB NOT NULL, -- Full details of suggested/executed action
  suggested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES user_profiles(id),
  executed_at TIMESTAMPTZ,
  execution_status TEXT, -- 'suggested', 'approved', 'rejected', 'executed', 'failed'
  execution_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add schedule conflict detection (PostgreSQL 15+)
-- Prevents double-booking same room at same time for same event
ALTER TABLE schedules ADD CONSTRAINT no_room_overlap
  EXCLUDE USING GIST (
    event_id WITH =,
    room WITH =,
    tstzrange(start_time, end_time) WITH &&
  )
  WHERE (room IS NOT NULL);
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── modules/
│   ├── ai-chat/
│   │   ├── components/
│   │   │   ├── AIChatPanel.tsx          # Existing chat UI
│   │   │   ├── AIConfirmationDialog.tsx # NEW: Confirmation modal for AI writes
│   │   │   └── AIAuditLog.tsx           # NEW: Display AI action history
│   │   ├── services/
│   │   │   ├── chatService.ts           # Existing: calls ai-chat Edge Function
│   │   │   ├── aiActionService.ts       # NEW: Execute approved AI actions
│   │   │   └── auditService.ts          # NEW: Query ai_insights_log
│   │   └── types.ts                     # 80+ action types defined
│   └── schedules/
│       ├── services/
│       │   ├── scheduleService.ts       # Existing CRUD operations
│       │   └── conflictDetector.ts      # NEW: Query conflict detection
│       └── components/
│           └── ConflictWarning.tsx      # NEW: Display conflicts before save
├── hooks/
│   └── useAIConfirmation.tsx            # NEW: Manage confirmation workflow state
└── supabase/functions/
    ├── ai-chat/
    │   └── index.ts                     # EXTEND: Add schedule management tools
    └── execute-ai-action/               # NEW: Authenticated action executor
        └── index.ts
```

### Pattern 1: Suggest + Confirm + Execute Workflow
**What:** Three-phase AI write operation with human-in-the-loop approval
**When to use:** Always for AI-initiated database writes affecting production data

**Flow:**
```typescript
// Phase 1: AI Suggestion (in ai-chat Edge Function)
// Gemini calls function like update_schedule_item()
// Edge Function returns action with status: 'pending_approval'
{
  type: 'schedule_update',
  status: 'pending_approval',
  data: {
    schedule_id: 'uuid',
    changes: { start_time: '2026-03-15T10:00:00Z', room: 'Hall B' },
    conflicts: [
      { type: 'room_overlap', message: 'Hall B already booked 10:00-11:00 by "Keynote"' }
    ]
  },
  label: 'שינוי זמן הרצאה ל-10:00 באולם B'
}

// Phase 2: User Confirmation (Frontend)
// Display AIConfirmationDialog with:
// - Action description in Hebrew
// - Impact preview (conflicts, affected participants, cascade effects)
// - Risk indicators (conflict warnings in red)
// User clicks "אישור" (Approve) or "ביטול" (Cancel)

// Phase 3: Execution (execute-ai-action Edge Function)
// If approved:
// - Log to ai_insights_log (suggested_at, approved_at, approved_by)
// - Execute write using authenticated Supabase client (RLS enforced)
// - Update ai_insights_log (executed_at, execution_status)
// - Return result to frontend
```

**Example implementation:**
```typescript
// Source: Derived from Gemini function calling best practices + Supabase RLS patterns
// supabase/functions/ai-chat/index.ts - EXTEND existing tool declarations

const SCHEDULE_TOOLS = [
  {
    name: 'create_schedule_item',
    description: 'יצירת פריט חדש בלוח הזמנים של האירוע (הרצאה, סדנה, הפסקה)',
    parameters: {
      type: 'OBJECT',
      properties: {
        event_id: { type: 'STRING', description: 'מזהה האירוע' },
        title: { type: 'STRING', description: 'כותרת הפעילות' },
        start_time: { type: 'STRING', description: 'זמן התחלה ISO' },
        end_time: { type: 'STRING', description: 'זמן סיום ISO' },
        room: { type: 'STRING', description: 'שם האולם/חדר' },
        speaker_name: { type: 'STRING', description: 'שם הדובר' },
        max_capacity: { type: 'INTEGER', description: 'קיבולת מקסימלית' }
      },
      required: ['event_id', 'title', 'start_time', 'end_time']
    }
  },
  {
    name: 'update_schedule_item',
    description: 'עדכון פריט קיים בלוח הזמנים (שינוי זמן, אולם, דובר)',
    parameters: {
      type: 'OBJECT',
      properties: {
        schedule_id: { type: 'STRING', description: 'מזהה פריט הלוח זמנים' },
        changes: {
          type: 'OBJECT',
          description: 'שדות לעדכון',
          properties: {
            title: { type: 'STRING' },
            start_time: { type: 'STRING' },
            end_time: { type: 'STRING' },
            room: { type: 'STRING' },
            speaker_name: { type: 'STRING' }
          }
        }
      },
      required: ['schedule_id', 'changes']
    }
  },
  {
    name: 'delete_schedule_item',
    description: 'מחיקת פריט מלוח הזמנים',
    parameters: {
      type: 'OBJECT',
      properties: {
        schedule_id: { type: 'STRING', description: 'מזהה פריט למחיקה' },
        reason: { type: 'STRING', description: 'סיבת המחיקה (לתיעוד)' }
      },
      required: ['schedule_id']
    }
  }
]

// Tool execution returns pending_approval actions
async function executeCreateScheduleItem(
  supabase: SupabaseClient,
  args: Record<string, unknown>,
  userId?: string
): Promise<ToolResult> {
  // Check for conflicts BEFORE suggesting
  const conflicts = await detectScheduleConflicts(supabase, {
    event_id: args.event_id,
    start_time: args.start_time,
    end_time: args.end_time,
    room: args.room
  })

  // Log suggestion to audit table
  const { data: auditLog } = await supabase
    .from('ai_insights_log')
    .insert({
      user_id: userId,
      event_id: args.event_id,
      action_type: 'schedule_create',
      action_data: args,
      execution_status: 'suggested'
    })
    .select('id')
    .single()

  // Return as pending_approval action (NOT executed yet)
  return {
    success: true,
    data: {
      action_id: auditLog.id,
      type: 'schedule_create',
      status: 'pending_approval',
      data: args,
      conflicts,
      impact: {
        affected_participants: 0, // Calculate if needed
        requires_notifications: conflicts.length === 0
      },
      label: `יצירת "${args.title}" ב-${formatTime(args.start_time)}`
    }
  }
}
```

### Pattern 2: Conflict Detection Before Confirmation
**What:** Real-time validation of schedule changes against existing data
**When to use:** Before suggesting any schedule create/update that involves time/room/speaker

**Example:**
```typescript
// Source: PostgreSQL exclusion constraints + application-level conflict detection
// src/modules/schedules/services/conflictDetector.ts

interface ScheduleConflict {
  type: 'room_overlap' | 'speaker_overlap' | 'capacity_overflow'
  severity: 'error' | 'warning'
  message: string
  conflicting_item?: {
    id: string
    title: string
    start_time: string
    end_time: string
  }
}

async function detectScheduleConflicts(
  supabase: SupabaseClient,
  proposed: {
    event_id: string
    start_time: string
    end_time: string
    room?: string
    speaker_name?: string
    max_capacity?: number
    exclude_schedule_id?: string // For updates
  }
): Promise<ScheduleConflict[]> {
  const conflicts: ScheduleConflict[] = []

  // Room double-booking check (PostgreSQL will also enforce this)
  if (proposed.room) {
    const { data: roomConflicts } = await supabase
      .from('schedules')
      .select('id, title, start_time, end_time, room')
      .eq('event_id', proposed.event_id)
      .eq('room', proposed.room)
      .neq('id', proposed.exclude_schedule_id || 'none')
      .or(`start_time.lte.${proposed.end_time},end_time.gte.${proposed.start_time}`)

    if (roomConflicts && roomConflicts.length > 0) {
      conflicts.push({
        type: 'room_overlap',
        severity: 'error',
        message: `אולם ${proposed.room} כבר תפוס ב-${formatTimeRange(roomConflicts[0])}`,
        conflicting_item: roomConflicts[0]
      })
    }
  }

  // Speaker overlap check (same speaker can't be in two places)
  if (proposed.speaker_name) {
    const { data: speakerConflicts } = await supabase
      .from('schedules')
      .select('id, title, start_time, end_time, speaker_name')
      .eq('event_id', proposed.event_id)
      .ilike('speaker_name', proposed.speaker_name)
      .neq('id', proposed.exclude_schedule_id || 'none')
      .or(`start_time.lte.${proposed.end_time},end_time.gte.${proposed.start_time}`)

    if (speakerConflicts && speakerConflicts.length > 0) {
      conflicts.push({
        type: 'speaker_overlap',
        severity: 'error',
        message: `${proposed.speaker_name} כבר מופיע ב-"${speakerConflicts[0].title}"`,
        conflicting_item: speakerConflicts[0]
      })
    }
  }

  // Capacity warning (not error - manager can override)
  if (proposed.max_capacity) {
    const { count: assignedCount } = await supabase
      .from('participant_schedules')
      .select('id', { count: 'exact', head: true })
      .eq('schedule_id', proposed.exclude_schedule_id || 'placeholder')

    if (assignedCount && assignedCount > proposed.max_capacity) {
      conflicts.push({
        type: 'capacity_overflow',
        severity: 'warning',
        message: `${assignedCount} משתתפים כבר רשומים, אך הקיבולת ${proposed.max_capacity}`
      })
    }
  }

  return conflicts
}
```

### Pattern 3: Risk-Based Confirmations
**What:** Different confirmation UX based on action risk level
**When to use:** Balance safety and usability - not all actions need heavy confirmation

**Risk Levels:**
```typescript
// Source: UX best practices for destructive action confirmation
type ActionRisk = 'low' | 'medium' | 'high' | 'critical'

function getActionRisk(action: AIAction): ActionRisk {
  // CRITICAL: Irreversible data loss
  if (action.type.includes('delete') && action.data.has_participants) {
    return 'critical' // Delete session with registered participants
  }

  // HIGH: Major data changes with side effects
  if (action.type.includes('update') && action.conflicts?.some(c => c.severity === 'error')) {
    return 'high' // Update causing conflicts
  }

  // MEDIUM: Reversible changes affecting multiple entities
  if (action.type.includes('create') && action.impact.affected_participants > 0) {
    return 'medium' // Create session requiring participant notifications
  }

  // LOW: Safe, easily reversible
  return 'low' // Most reads, simple creates
}

// Confirmation UI varies by risk
function ConfirmationDialog({ action }: { action: AIAction }) {
  const risk = getActionRisk(action)

  switch (risk) {
    case 'critical':
      return (
        <Dialog>
          <Icon color="red" />
          <Title>פעולה מסוכנת - נדרשת אישור מפורש</Title>
          <Warning>{action.conflicts.map(c => c.message)}</Warning>
          <Input
            placeholder='הקלד "מחק" לאישור'
            required
            pattern="מחק"
          />
          <Button color="red" disabled={inputValue !== 'מחק'}>
            מחק לצמיתות
          </Button>
        </Dialog>
      )

    case 'high':
      return (
        <Dialog>
          <Icon color="orange" />
          <ConflictList conflicts={action.conflicts} />
          <Checkbox required>אני מבין/ה את ההשלכות</Checkbox>
          <Button color="orange">המשך בכל זאת</Button>
        </Dialog>
      )

    case 'medium':
      return (
        <Dialog>
          <ImpactPreview impact={action.impact} />
          <Button color="blue">אישור</Button>
          <Button variant="text">ביטול</Button>
        </Dialog>
      )

    case 'low':
      // No modal - inline confirmation or auto-approve
      return <InlineConfirm onConfirm={execute} />
  }
}
```

### Pattern 4: RLS-Enforced Execution
**What:** Execute approved AI actions with authenticated user context (NOT service_role_key)
**When to use:** Always for AI-initiated writes - never bypass RLS

**Example:**
```typescript
// Source: Supabase RLS best practices + secure AI agent patterns
// supabase/functions/execute-ai-action/index.ts

import { createClient } from '@supabase/supabase-js'

serve(async (req) => {
  // Extract user JWT from Authorization header
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response('Unauthorized', { status: 401 })
  }

  const userToken = authHeader.replace('Bearer ', '')

  // Create Supabase client with USER JWT (enforces RLS)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!, // NOT service_role_key
    {
      global: {
        headers: { Authorization: `Bearer ${userToken}` }
      }
    }
  )

  const { action_id, action_type, action_data } = await req.json()

  // Verify action exists and is in 'approved' status
  const { data: auditEntry, error: auditError } = await supabase
    .from('ai_insights_log')
    .select('*')
    .eq('id', action_id)
    .eq('execution_status', 'approved')
    .single()

  if (auditError || !auditEntry) {
    return new Response('Action not found or not approved', { status: 403 })
  }

  // Execute action based on type
  let result
  try {
    switch (action_type) {
      case 'schedule_create':
        result = await supabase
          .from('schedules')
          .insert(action_data)
          .select()
          .single()
        break

      case 'schedule_update':
        result = await supabase
          .from('schedules')
          .update(action_data.changes)
          .eq('id', action_data.schedule_id)
          .select()
          .single()
        break

      case 'schedule_delete':
        result = await supabase
          .from('schedules')
          .delete()
          .eq('id', action_data.schedule_id)
        break

      default:
        throw new Error(`Unknown action type: ${action_type}`)
    }

    // Update audit log with execution result
    await supabase
      .from('ai_insights_log')
      .update({
        executed_at: new Date().toISOString(),
        execution_status: result.error ? 'failed' : 'executed',
        execution_error: result.error?.message
      })
      .eq('id', action_id)

    return new Response(JSON.stringify({
      success: !result.error,
      data: result.data,
      error: result.error?.message
    }), { status: result.error ? 500 : 200 })

  } catch (err) {
    await supabase
      .from('ai_insights_log')
      .update({
        executed_at: new Date().toISOString(),
        execution_status: 'failed',
        execution_error: err.message
      })
      .eq('id', action_id)

    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})

// KEY SECURITY POINT:
// Using user JWT (from Authorization header) means:
// 1. RLS policies are enforced (user can only modify their org's events)
// 2. auth.uid() in policies returns the actual user, not a service account
// 3. Multi-tenant isolation is maintained
// 4. Audit trail correctly records who executed the action
```

### Pattern 5: VIP Priority Handling
**What:** AI prioritizes VIP participant requests and concerns
**When to use:** When processing participant-related operations or generating responses

**Example:**
```typescript
// Source: EventFlow requirement VIP-03
// supabase/functions/ai-chat/index.ts - EXTEND system prompt

const VIP_SYSTEM_ADDITION = `
## טיפול במשתתפי VIP

כאשר משתמש מזכיר משתתף מסויים או שואל שאלה הקשורה למשתתף:
1. בדוק אם המשתתף מסומן כ-VIP (is_vip = true)
2. אם כן, תעדף את הבקשה:
   - תן עדיפות בתשובות (הזכר במפורש שזה VIP)
   - הצע פתרונות מיוחדים או התאמות אישיות
   - התריע אם יש קונפליקט שמשפיע על VIP
   - המלץ להקצות משאבים טובים יותר (חדרים, מקומות ישיבה, נגישות)
3. בצ'קליסט ובלוחות זמנים, וודא שצרכי VIP מכוסים
`

// In tool execution, check VIP status
async function executeUpdateScheduleItem(args: any) {
  // Get affected participants
  const { data: participants } = await supabase
    .from('participant_schedules')
    .select('participant_id, participants ( is_vip, full_name, vip_notes )')
    .eq('schedule_id', args.schedule_id)

  const vipParticipants = participants?.filter(p => p.participants.is_vip)

  if (vipParticipants && vipParticipants.length > 0) {
    return {
      success: true,
      data: {
        ...args,
        vip_affected: true,
        vip_details: vipParticipants.map(p => ({
          name: p.participants.full_name,
          notes: p.participants.vip_notes
        })),
        warning: `שינוי זה ישפיע על ${vipParticipants.length} משתתפי VIP`
      }
    }
  }
  // ... normal execution
}
```

### Anti-Patterns to Avoid
- **Direct AI writes without confirmation:** Dangerous - no human oversight on production data changes
- **Using service_role_key for AI actions:** Bypasses RLS, breaks multi-tenant security, creates audit trail gaps
- **Client-side conflict detection only:** Race conditions allow double-bookings; database constraints are atomic
- **Generic confirmation dialogs:** "Are you sure?" fatigue - use risk-based confirmation levels
- **No audit logging:** Can't debug AI mistakes or trace who approved what
- **Synchronous execution in chat:** Long writes block conversation; use async pattern with status updates

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Schedule overlap detection | Manual time comparison loops | PostgreSQL exclusion constraints with GIST | Atomic, handles race conditions, database-enforced |
| Confirmation dialogs | Custom modal components | Risk-based pattern library (see Pattern 3) | UX research-backed, accessibility built-in |
| Audit trail | Custom logging functions | Structured ai_insights_log table with status enum | Queryable, consistent schema, supports analytics |
| Action execution queue | Custom job queue | PostgreSQL + status polling | Simplest that works; avoid premature complexity |
| Conflict resolution | AI decides automatically | Always require human approval | AI can't understand business context of conflicts |
| JWT extraction | Custom header parsing | Supabase client with user token | Handles refresh, validation, RLS integration |

**Key insight:** The "suggest + confirm + execute" pattern is not novel - it's how Git works (diff → review → merge), how medical systems work (AI diagnosis → doctor review → treatment), and how financial systems work (AI recommendation → compliance review → execution). Don't reinvent; adapt proven patterns.

## Common Pitfalls

### Pitfall 1: AI Bypassing RLS with Service Key
**What goes wrong:** AI actions use service_role_key, allowing writes to any organization's data
**Why it happens:** Developers think "AI needs full access" or copy patterns from cron jobs
**How to avoid:**
- ALWAYS use authenticated user JWT when executing AI actions
- Create separate execute-ai-action Edge Function that receives user token
- Never pass service_role_key to frontend or expose in AI action responses
- Verify RLS policies allow user to perform the action (will fail naturally if not)
**Warning signs:**
- Audit logs show ai_insights_log.user_id doesn't match approved_by
- Users can trigger AI actions on other organizations' events
- RLS policies have exceptions for AI operations

### Pitfall 2: Confirmation Fatigue
**What goes wrong:** Every AI action requires confirmation, users auto-click "approve" without reading
**Why it happens:** Treating all actions equally risky, overusing confirmation dialogs
**How to avoid:**
- Use risk-based confirmations (Pattern 3): low-risk actions auto-approve or inline confirm
- Batch related actions into single confirmation (e.g., "create 5 schedule items" not 5 separate dialogs)
- For read-only operations (search, get details), never confirm
- Reserve critical confirmations (type "DELETE") for irreversible data loss only
**Warning signs:**
- Users complain about "too many popups"
- Time-to-complete simple tasks increases
- Approval rate is >95% (indicates users not reading)

### Pitfall 3: Schedule Conflicts Discovered After Approval
**What goes wrong:** User approves schedule change, execution fails due to room double-booking
**Why it happens:** Conflict detection runs during suggestion but not at execution time (race condition)
**How to avoid:**
- Run conflict detection in BOTH places: (1) during AI suggestion, (2) in execute-ai-action before write
- Use PostgreSQL exclusion constraints as final safety net (will raise error if violated)
- Display conflicts in confirmation dialog with severity levels
- For high-severity conflicts (errors), block approval button entirely
**Warning signs:**
- ai_insights_log shows execution_status = 'failed' with conflict errors
- Users report "approved but nothing happened"
- Database logs show constraint violation errors

### Pitfall 4: Missing Audit Trail Context
**What goes wrong:** Audit log records action happened but not why or what user saw
**Why it happens:** Logging only action_type and action_data, not AI reasoning or conflicts
**How to avoid:**
- Store full context in ai_insights_log.action_data:
  - AI's reasoning (if available from Gemini response)
  - Conflicts detected during suggestion
  - User's approval timestamp and identity
  - Original user message that triggered suggestion
- Add correlation_id to link suggestion → approval → execution
- Include snapshot of relevant state (e.g., old schedule values before update)
**Warning signs:**
- Can't debug why AI suggested a bad action
- Dispute resolution lacks evidence of what user was shown
- Compliance audits require manual investigation

### Pitfall 5: Over-Automating VIP Handling
**What goes wrong:** AI automatically prioritizes VIPs in ways that cause problems (e.g., bumping other participants)
**Why it happens:** Misinterpreting VIP-03 as "AI makes VIP decisions" instead of "AI highlights VIP concerns"
**How to avoid:**
- VIP priority means AI **mentions** VIP status in responses, NOT auto-changes data
- Example: "שים לב: המשתתף הזה VIP - כדאי לשקול..." (notice, don't force)
- VIPs don't get auto-assigned to best rooms; AI **suggests** better rooms for approval
- Never let AI bypass capacity limits or conflict rules for VIPs
**Warning signs:**
- Non-VIP participants complain about being moved without notice
- Room assignments change automatically
- Audit log shows VIP-related actions without human approval

### Pitfall 6: Gemini Function Calling Loops
**What goes wrong:** AI calls tools infinitely, Edge Function times out after MAX_TOOL_ITERATIONS
**Why it happens:** Tool responses don't satisfy Gemini, or tool returns invalid data that prompts retry
**How to avoid:**
- Set MAX_TOOL_ITERATIONS (current: 3) and force text response at limit (existing ai-chat.ts does this)
- Tool execution must return success/failure clearly in response.content
- If tool fails, include actionable error message in Hebrew for AI to explain to user
- Log tool call count per request; alert if frequently hitting max
**Warning signs:**
- Edge Function latency spikes to 30+ seconds
- Gemini returns generic "I couldn't complete" messages
- ai-chat logs show MAX_TOOL_ITERATIONS warnings frequently

## Code Examples

Verified patterns from official sources and existing EventFlow implementation:

### Complete Suggest + Confirm + Execute Flow
```typescript
// ============================================================================
// PART 1: AI Suggestion (supabase/functions/ai-chat/index.ts)
// ============================================================================

// Add schedule management tools to TOOL_DECLARATIONS
const TOOL_DECLARATIONS = [
  // ... existing tools ...
  {
    name: 'update_schedule_item',
    description: 'עדכון פריט קיים בלוח הזמנים (שינוי זמן, אולם, דובר). מחזיר הצעה הדורשת אישור מנהל.',
    parameters: {
      type: 'OBJECT',
      properties: {
        schedule_id: { type: 'STRING', description: 'מזהה פריט לוח הזמנים' },
        changes: {
          type: 'OBJECT',
          description: 'שדות לעדכון (רק שדות ששונו)',
          properties: {
            start_time: { type: 'STRING', description: 'זמן התחלה חדש ISO' },
            end_time: { type: 'STRING', description: 'זמן סיום חדש ISO' },
            room: { type: 'STRING', description: 'אולם חדש' },
            speaker_name: { type: 'STRING', description: 'דובר חדש' }
          }
        }
      },
      required: ['schedule_id', 'changes']
    }
  }
]

// Tool execution function
async function executeUpdateScheduleItem(
  supabase: SupabaseClient,
  args: Record<string, unknown>,
  userId?: string
): Promise<ToolResult> {
  const scheduleId = args.schedule_id as string
  const changes = args.changes as Record<string, unknown>

  // Fetch current schedule item
  const { data: currentSchedule, error: fetchError } = await supabase
    .from('schedules')
    .select('*, events!inner(id, organization_id)')
    .eq('id', scheduleId)
    .single()

  if (fetchError || !currentSchedule) {
    return { success: false, error: 'פריט לוח הזמנים לא נמצא' }
  }

  // Build proposed state (merge current + changes)
  const proposed = {
    event_id: currentSchedule.event_id,
    start_time: changes.start_time || currentSchedule.start_time,
    end_time: changes.end_time || currentSchedule.end_time,
    room: changes.room || currentSchedule.room,
    speaker_name: changes.speaker_name || currentSchedule.speaker_name,
    exclude_schedule_id: scheduleId
  }

  // Detect conflicts with proposed changes
  const conflicts = await detectScheduleConflicts(supabase, proposed)

  // Check VIP impact
  const { data: participantSchedules } = await supabase
    .from('participant_schedules')
    .select('participants ( is_vip, full_name, vip_notes )')
    .eq('schedule_id', scheduleId)

  const vipParticipants = participantSchedules
    ?.map(ps => ps.participants)
    .filter(p => p.is_vip) || []

  // Log suggestion to audit trail
  const { data: auditEntry } = await supabase
    .from('ai_insights_log')
    .insert({
      user_id: userId,
      event_id: currentSchedule.event_id,
      action_type: 'schedule_update',
      action_data: {
        schedule_id: scheduleId,
        changes,
        current_state: currentSchedule,
        proposed_state: proposed,
        conflicts_detected: conflicts,
        vip_affected: vipParticipants.length > 0
      },
      execution_status: 'suggested'
    })
    .select('id')
    .single()

  // Return pending approval action (NOT executed)
  return {
    success: true,
    data: {
      action_id: auditEntry.id,
      type: 'schedule_update',
      status: 'pending_approval',
      data: {
        schedule_id: scheduleId,
        changes,
        current_title: currentSchedule.title,
        current_time: formatTimeRange(currentSchedule),
        current_room: currentSchedule.room
      },
      conflicts,
      impact: {
        affected_participants: participantSchedules?.length || 0,
        vip_count: vipParticipants.length,
        requires_notifications: true
      },
      label: conflicts.length > 0
        ? `שינוי "${currentSchedule.title}" (יש קונפליקטים!)`
        : `שינוי "${currentSchedule.title}"`,
      vip_warning: vipParticipants.length > 0
        ? `משפיע על ${vipParticipants.length} משתתפי VIP`
        : undefined
    }
  }
}

// ============================================================================
// PART 2: User Confirmation (Frontend)
// ============================================================================

// src/modules/ai-chat/hooks/useAIConfirmation.tsx
import { useState } from 'react'

interface AIAction {
  action_id: string
  type: string
  status: 'pending_approval' | 'approved' | 'rejected'
  data: any
  conflicts: ScheduleConflict[]
  impact: {
    affected_participants: number
    vip_count: number
    requires_notifications: boolean
  }
  label: string
  vip_warning?: string
}

export function useAIConfirmation() {
  const [pendingAction, setPendingAction] = useState<AIAction | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  function requestConfirmation(action: AIAction) {
    setPendingAction(action)
    setIsDialogOpen(true)
  }

  async function approve() {
    if (!pendingAction) return

    // Update audit log status
    await supabase
      .from('ai_insights_log')
      .update({
        approved_at: new Date().toISOString(),
        approved_by: currentUser.id,
        execution_status: 'approved'
      })
      .eq('id', pendingAction.action_id)

    // Execute action via authenticated Edge Function
    const result = await executeAIAction(pendingAction)

    setIsDialogOpen(false)
    setPendingAction(null)

    return result
  }

  function reject() {
    if (!pendingAction) return

    // Log rejection
    supabase
      .from('ai_insights_log')
      .update({ execution_status: 'rejected' })
      .eq('id', pendingAction.action_id)

    setIsDialogOpen(false)
    setPendingAction(null)
  }

  return {
    pendingAction,
    isDialogOpen,
    requestConfirmation,
    approve,
    reject
  }
}

// src/modules/ai-chat/components/AIConfirmationDialog.tsx
function AIConfirmationDialog({ action, onApprove, onReject }: Props) {
  const risk = getActionRisk(action)
  const hasErrors = action.conflicts.some(c => c.severity === 'error')

  return (
    <Dialog open={true} onOpenChange={onReject}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {risk === 'high' && <AlertTriangle className="text-orange-500" />}
          {risk === 'critical' && <XCircle className="text-red-500" />}
          {action.label}
        </DialogTitle>
      </DialogHeader>

      <DialogContent>
        {/* VIP Warning */}
        {action.vip_warning && (
          <Alert variant="info" className="bg-purple-50 border-purple-200">
            <Crown className="text-purple-500" />
            <AlertDescription>{action.vip_warning}</AlertDescription>
          </Alert>
        )}

        {/* Conflicts */}
        {action.conflicts.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold">קונפליקטים:</h4>
            {action.conflicts.map((conflict, i) => (
              <Alert
                key={i}
                variant={conflict.severity === 'error' ? 'destructive' : 'warning'}
              >
                <AlertCircle />
                <AlertDescription>{conflict.message}</AlertDescription>
                {conflict.conflicting_item && (
                  <div className="text-sm mt-1 opacity-80">
                    {conflict.conflicting_item.title}
                    ({formatTimeRange(conflict.conflicting_item)})
                  </div>
                )}
              </Alert>
            ))}
          </div>
        )}

        {/* Impact Summary */}
        <div className="bg-gray-50 p-3 rounded space-y-1 text-sm">
          <div>משתתפים מושפעים: {action.impact.affected_participants}</div>
          {action.impact.vip_count > 0 && (
            <div className="text-purple-600 font-medium">
              כולל {action.impact.vip_count} משתתפי VIP
            </div>
          )}
          {action.impact.requires_notifications && (
            <div className="text-blue-600">
              יישלחו הודעות עדכון למשתתפים
            </div>
          )}
        </div>

        {/* Current vs Proposed (for updates) */}
        {action.type.includes('update') && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-semibold">מצב נוכחי:</div>
              <div>{action.data.current_time}</div>
              <div>{action.data.current_room}</div>
            </div>
            <div>
              <div className="font-semibold">מצב מוצע:</div>
              <div>{formatTime(action.data.changes.start_time)}</div>
              <div>{action.data.changes.room}</div>
            </div>
          </div>
        )}
      </DialogContent>

      <DialogFooter>
        <Button variant="outline" onClick={onReject}>
          ביטול
        </Button>
        <Button
          onClick={onApprove}
          disabled={hasErrors}
          variant={risk === 'critical' ? 'destructive' : 'default'}
        >
          {hasErrors ? 'לא ניתן לאשר (יש קונפליקטים)' : 'אישור'}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}

// ============================================================================
// PART 3: Action Execution (supabase/functions/execute-ai-action/index.ts)
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  // Extract authenticated user token from Authorization header
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'Missing or invalid Authorization header' }),
      { status: 401 }
    )
  }

  const userToken = authHeader.replace('Bearer ', '')

  // Create Supabase client with USER JWT (enforces RLS)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!, // NOT service_role_key!
    {
      global: {
        headers: { Authorization: `Bearer ${userToken}` }
      }
    }
  )

  const { action_id } = await req.json()

  // Fetch and validate audit entry
  const { data: auditEntry, error: auditError } = await supabase
    .from('ai_insights_log')
    .select('*')
    .eq('id', action_id)
    .eq('execution_status', 'approved')
    .single()

  if (auditError || !auditEntry) {
    return new Response(
      JSON.stringify({ error: 'Action not found or not approved' }),
      { status: 403 }
    )
  }

  const { action_type, action_data } = auditEntry

  try {
    let result
    let notifyParticipants = false

    switch (action_type) {
      case 'schedule_update': {
        // Re-check conflicts at execution time (prevent race conditions)
        const proposed = {
          event_id: action_data.proposed_state.event_id,
          start_time: action_data.proposed_state.start_time,
          end_time: action_data.proposed_state.end_time,
          room: action_data.proposed_state.room,
          speaker_name: action_data.proposed_state.speaker_name,
          exclude_schedule_id: action_data.schedule_id
        }

        const conflicts = await detectScheduleConflicts(supabase, proposed)
        const errorConflicts = conflicts.filter(c => c.severity === 'error')

        if (errorConflicts.length > 0) {
          throw new Error(
            `קונפליקטים זוהו במהלך הביצוע: ${errorConflicts.map(c => c.message).join(', ')}`
          )
        }

        // Execute update (RLS will enforce user can modify this event)
        result = await supabase
          .from('schedules')
          .update(action_data.changes)
          .eq('id', action_data.schedule_id)
          .select()
          .single()

        notifyParticipants = true
        break
      }

      case 'schedule_create': {
        // PostgreSQL exclusion constraint will prevent conflicts at DB level
        result = await supabase
          .from('schedules')
          .insert(action_data)
          .select()
          .single()
        break
      }

      case 'schedule_delete': {
        result = await supabase
          .from('schedules')
          .delete()
          .eq('id', action_data.schedule_id)

        notifyParticipants = true
        break
      }

      default:
        throw new Error(`Unknown action type: ${action_type}`)
    }

    // Update audit log with success
    await supabase
      .from('ai_insights_log')
      .update({
        executed_at: new Date().toISOString(),
        execution_status: result.error ? 'failed' : 'executed',
        execution_error: result.error?.message
      })
      .eq('id', action_id)

    // Trigger participant notifications if needed (async, don't wait)
    if (notifyParticipants && !result.error) {
      // Call separate notification Edge Function or insert to message queue
      // Don't block on this
    }

    return new Response(
      JSON.stringify({
        success: !result.error,
        data: result.data,
        error: result.error?.message
      }),
      { status: result.error ? 500 : 200 }
    )

  } catch (err) {
    // Log failure to audit trail
    await supabase
      .from('ai_insights_log')
      .update({
        executed_at: new Date().toISOString(),
        execution_status: 'failed',
        execution_error: err.message
      })
      .eq('id', action_id)

    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500 }
    )
  }
})
```

### Schedule Conflict Detection with PostgreSQL
```sql
-- Source: PostgreSQL wiki + EventFlow schema
-- Enable btree_gist extension for exclusion constraints
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Add exclusion constraint to prevent room double-booking
-- This is atomic and handles race conditions that application-level checks can't
ALTER TABLE schedules
ADD CONSTRAINT no_room_overlap
EXCLUDE USING GIST (
  event_id WITH =,           -- Same event
  room WITH =,               -- Same room
  tstzrange(start_time, end_time) WITH &&  -- Overlapping time range
)
WHERE (room IS NOT NULL);    -- Only check when room is specified

-- Add check for same speaker overlap (application-level, not constraint)
-- Can't use exclusion constraint because ILIKE isn't an operator class for GIST
CREATE INDEX idx_schedules_speaker_time ON schedules (
  event_id,
  speaker_name,
  start_time,
  end_time
)
WHERE speaker_name IS NOT NULL;

-- Application-level conflict check (used in AI suggestion phase)
CREATE OR REPLACE FUNCTION check_speaker_conflicts(
  p_event_id UUID,
  p_speaker_name TEXT,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ,
  p_exclude_schedule_id UUID DEFAULT NULL
)
RETURNS TABLE (
  conflict_id UUID,
  conflict_title TEXT,
  conflict_start TIMESTAMPTZ,
  conflict_end TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.title,
    s.start_time,
    s.end_time
  FROM schedules s
  WHERE s.event_id = p_event_id
    AND s.speaker_name ILIKE p_speaker_name
    AND s.id IS DISTINCT FROM p_exclude_schedule_id
    AND (
      s.start_time <= p_end_time
      AND s.end_time >= p_start_time
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- Test conflict detection
-- Will raise error: "conflicting key value violates exclusion constraint"
INSERT INTO schedules (event_id, title, start_time, end_time, room)
VALUES (
  '123e4567-e89b-12d3-a456-426614174000',
  'Test Session 1',
  '2026-03-15 10:00:00+00',
  '2026-03-15 11:00:00+00',
  'Hall A'
);

-- This will FAIL (same room, overlapping time)
INSERT INTO schedules (event_id, title, start_time, end_time, room)
VALUES (
  '123e4567-e89b-12d3-a456-426614174000',
  'Test Session 2',
  '2026-03-15 10:30:00+00',  -- Overlaps 10:00-11:00
  '2026-03-15 11:30:00+00',
  'Hall A'
);
```

### Audit Trail Query Examples
```sql
-- View all AI actions for an event
SELECT
  ail.id,
  ail.action_type,
  ail.execution_status,
  ail.suggested_at,
  ail.approved_at,
  ail.executed_at,
  u1.full_name AS suggested_by,
  u2.full_name AS approved_by,
  ail.action_data->>'schedule_id' AS affected_schedule,
  ail.execution_error
FROM ai_insights_log ail
LEFT JOIN user_profiles u1 ON ail.user_id = u1.id
LEFT JOIN user_profiles u2 ON ail.approved_by = u2.id
WHERE ail.event_id = '...'
ORDER BY ail.suggested_at DESC;

-- Find rejected AI suggestions (to improve AI)
SELECT
  action_type,
  COUNT(*) AS rejection_count,
  COUNT(*) FILTER (WHERE action_data->'conflicts' IS NOT NULL) AS had_conflicts
FROM ai_insights_log
WHERE execution_status = 'rejected'
  AND suggested_at > NOW() - INTERVAL '30 days'
GROUP BY action_type
ORDER BY rejection_count DESC;

-- VIP impact analysis
SELECT
  ail.action_type,
  ail.execution_status,
  (ail.action_data->>'vip_affected')::boolean AS vip_affected,
  COUNT(*) AS action_count
FROM ai_insights_log ail
WHERE ail.event_id = '...'
GROUP BY 1, 2, 3
ORDER BY action_count DESC;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| AI directly modifies data | Suggest + Confirm + Execute | 2024-2025 | Human-in-loop prevents runaway AI errors |
| Application-level conflict checks | PostgreSQL exclusion constraints | Postgres 9.0+ (2010) | Atomic guarantees, no race conditions |
| Service role key for all writes | Authenticated user JWT with RLS | Supabase best practice | Multi-tenant security, proper audit trails |
| Generic "Are you sure?" dialogs | Risk-based confirmation UX | UX research 2023-2024 | Reduces confirmation fatigue, maintains safety |
| Separate audit logging library | Built-in JSONB audit tables | PostgreSQL 9.4+ (JSONB) | Queryable, flexible schema, no dependencies |
| Manual VIP tracking | Database flag + AI awareness | EventFlow v2.0 | Systematic VIP handling, no manual mentions |

**Deprecated/outdated:**
- **Direct AI database writes:** Too risky for production; modern systems require approval loops
- **Client-side only conflict detection:** Race conditions allow double-bookings; database constraints mandatory
- **Service_role_key for user actions:** Bypasses RLS, breaks security model; only for cron/system jobs
- **Synchronous AI action execution in chat:** Blocks conversation; async pattern with status polling preferred

## Open Questions

Things that couldn't be fully resolved:

1. **Batch vs Individual Confirmations**
   - What we know: UX best practices recommend batching related actions into single confirmation
   - What's unclear: When to batch schedule creates (e.g., "AI suggests 5 break sessions") vs individual confirms
   - Recommendation: Start with individual confirmations (safer). Add batching in v2 based on user feedback. Use heuristic: batch if all actions have same risk level and affect same entity.

2. **Conflict Resolution Suggestions**
   - What we know: AI can detect conflicts, display them to user
   - What's unclear: Should AI proactively suggest alternative times/rooms when conflicts exist?
   - Recommendation: Phase 6 only detects and blocks. Phase 7+ can add "AI suggests alternative time" feature. Complexity: requires multi-step negotiation (user rejects → AI re-suggests → repeat).

3. **Audit Log Retention and Analytics**
   - What we know: ai_insights_log stores all actions indefinitely
   - What's unclear: When to archive old logs, how to surface insights (e.g., "AI suggestions rejected 40% for room conflicts")
   - Recommendation: No archival in Phase 6. Add analytics dashboard in Phase 8+. Include created_at index for time-based queries.

4. **Multi-User Conflict Approval**
   - What we know: Current design assumes single user approves actions
   - What's unclear: If two managers chat with AI simultaneously, can both approve conflicting schedule changes?
   - Recommendation: Rely on PostgreSQL exclusion constraints to prevent conflicts at DB level. First-to-execute wins. Loser sees error and AI explains conflict. No pessimistic locking needed.

5. **VIP Auto-Notifications**
   - What we know: VIP-03 requires prioritizing VIP concerns in AI responses
   - What's unclear: Should schedule changes affecting VIPs auto-notify them before approval, or only after execution?
   - Recommendation: Only after execution (same as non-VIPs). Notification before approval would be premature. Add "preview notification" feature in confirmation dialog if needed.

## Sources

### Primary (HIGH confidence)
- [Gemini API Function Calling](https://ai.google.dev/gemini-api/docs/function-calling) - Official Google AI docs for tool declarations
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) - RLS with JWT authentication
- [PostgreSQL Exclusion Constraints](https://wiki.postgresql.org/wiki/How_to_avoid_overlapping_intervals_with_PostgreSQL) - Official wiki on preventing overlaps
- [Supabase API Keys Guide](https://supabase.com/docs/guides/api/api-keys) - Service role vs anon key usage
- EventFlow existing codebase:
  - `/eventflow-scaffold/supabase/functions/ai-chat/index.ts` - Gemini integration with 7 existing tools
  - `/eventflow-scaffold/schema.sql` - Database schema including schedules, ai_chat_sessions, RLS policies

### Secondary (MEDIUM confidence)
- [Confirmation Dialog UX Patterns](https://www.nngroup.com/articles/confirmation-dialog/) - Nielsen Norman Group research on when/how to use confirmations
- [Destructive Actions Design](https://uxmovement.com/buttons/how-to-design-destructive-actions-that-prevent-data-loss/) - Risk-based confirmation strategies
- [Temporal Constraints in PostgreSQL 18](https://betterstack.com/community/guides/databases/postgres-temporal-constraints/) - New WITHOUT OVERLAPS feature (not using yet, but future reference)
- [Schedule Conflict Detection Algorithms](https://www.myshyft.com/blog/conflict-detection-algorithms/) - Industry practices for conflict detection

### Tertiary (LOW confidence)
- [Google Gemini Function Calling Guide 2025](https://sparkco.ai/blog/mastering-google-gemini-function-calling-in-2025) - Blog post with confirmation pattern examples (not official)
- [Prevent Overlapping Schedules with Postgres](https://peterullrich.com/prevent-overlapping-schedules-with-ecto-and-postgres) - Community tutorial (Ecto-specific but concepts transferable)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Existing EventFlow implementation already uses Gemini function calling, Supabase RLS, PostgreSQL
- Architecture patterns: HIGH - Suggest+confirm+execute is industry standard; PostgreSQL exclusion constraints are well-documented official features
- Pitfalls: MEDIUM - Based on security best practices and UX research, but specific EventFlow edge cases may surface during implementation
- VIP handling: MEDIUM - Requirement VIP-03 is clear (prioritize in responses), but implementation details require user feedback

**Research date:** 2026-02-02
**Valid until:** 2026-03-02 (30 days - stable technologies, but UX patterns evolve)
**Recommended re-verification:** Before implementing conflict resolution suggestions (Open Question #2) - may require additional Gemini API research
