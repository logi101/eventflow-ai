# Phase 9: Day Simulation & Real-Time Operations - Research

**Researched:** 2026-02-03
**Domain:** Event simulation validation, real-time contingency management, audit logging
**Confidence:** HIGH

## Summary

This phase implements two critical capabilities: (1) pre-event simulation that validates event day operations before they happen, and (2) real-time contingency response when issues arise during the event. Both capabilities follow the existing "suggest+confirm" pattern established in Phase 6.

The research confirms that event simulation is best approached as a comprehensive "pre-flight checklist" that validates all timing, capacity, and resource constraints. Real-time contingency management requires immediate participant notification via the existing WhatsApp integration and complete audit logging for accountability.

The standard approach uses application-level validation (not database constraints) for simulation because it needs to report ALL issues at once with context and suggested fixes. For contingency activation, the Phase 6 suggest+confirm pattern provides the exact foundation needed: AI suggests changes → manager approves → system executes → audit log records.

**Primary recommendation:** Build simulation as pure validation logic (no database writes), integrate with existing conflict detection patterns from schedules module, and extend Phase 6's suggest+confirm infrastructure for contingency activation with full audit logging.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 19 | 19.2.0 | UI framework | Already in project |
| TypeScript | 5.9.3 | Type safety | Already in project |
| Zod | 4.3.5 | Schema validation | Already in project for data validation |
| @tanstack/react-query | 5.90.19 | State management | Already in project |
| @supabase/supabase-js | 2.90.1 | Backend client | Already in project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | 4.1.0 | Date/time calculations | Time overlap detection, duration checks |
| date-fns-tz | 3.2.0 | Timezone handling | Event timezone conversions |
| lucide-react | 0.562.0 | Icons | Severity level indicators (alert-triangle, info, alert-circle) |
| framer-motion | 12.27.1 | Animations | Report UI transitions, issue list animations |

### No New Dependencies Required
All necessary libraries are already in the project's package.json. No additional installations needed.

## Architecture Patterns

### Recommended Project Structure
```
src/modules/
├── simulation/
│   ├── components/
│   │   ├── SimulationTrigger.tsx      # Button on event detail page
│   │   ├── SimulationReport.tsx       # Grouped results display
│   │   ├── SimulationIssueCard.tsx    # Individual issue with fix action
│   │   └── SimulationProgress.tsx     # Loading state during validation
│   ├── services/
│   │   ├── simulationEngine.ts        # Main validation orchestrator
│   │   ├── validators/
│   │   │   ├── roomConflicts.ts       # Room double-booking detection
│   │   │   ├── speakerOverlaps.ts     # Speaker time conflicts
│   │   │   ├── capacityValidation.ts  # Attendance vs room capacity
│   │   │   ├── transitionTimes.ts     # Room change timing gaps
│   │   │   ├── equipmentChecks.ts     # Missing equipment assignments
│   │   │   ├── vipSchedule.ts         # VIP conflict detection
│   │   │   └── cateringGaps.ts        # Meal/break timing validation
│   │   └── fixSuggestions.ts          # One-click fix generators
│   ├── types/
│   │   ├── simulation.types.ts        # SimulationResult, Issue, Severity
│   │   └── validators.types.ts        # Validator interface
│   └── hooks/
│       └── useSimulation.ts           # React Query hook for simulation
├── contingency/
│   ├── components/
│   │   ├── ContingencyPanel.tsx       # Backup speaker selection UI
│   │   ├── ContingencyHistory.tsx     # Audit log display
│   │   └── ImpactPreview.tsx          # Affected participants preview
│   ├── services/
│   │   ├── contingencyManager.ts      # Activation logic
│   │   └── notificationService.ts     # WhatsApp notification dispatch
│   ├── types/
│   │   └── contingency.types.ts       # ContingencyAction, AuditEntry
│   └── hooks/
│       ├── useContingency.ts          # Activation mutation
│       └── useContingencyHistory.ts   # Audit log query
└── schedules/
    └── services/
        └── conflictDetector.ts        # Reuse existing Phase 6 logic
```

### Pattern 1: Simulation as Pure Validation Function
**What:** Simulation reads current state and returns issues list without modifying database
**When to use:** Day simulation execution
**Example:**
```typescript
// Source: Application-level validation pattern (Phase 6 conflict detection)
// src/modules/simulation/services/simulationEngine.ts

interface SimulationIssue {
  id: string
  severity: 'critical' | 'warning' | 'info'
  category: 'room' | 'speaker' | 'capacity' | 'timing' | 'equipment' | 'vip' | 'catering'
  title: string
  description: string
  affectedEntities: {
    schedule_ids?: string[]
    participant_ids?: string[]
    vendor_ids?: string[]
  }
  suggestedFix?: {
    type: 'update_schedule' | 'reassign_room' | 'adjust_time' | 'add_equipment'
    action_data: Record<string, unknown>
    label: string
  }
}

interface SimulationResult {
  event_id: string
  run_at: string
  total_issues: number
  critical: number
  warnings: number
  info: number
  issues: SimulationIssue[]
  deterministic_seed?: string // For reproducibility
}

async function runSimulation(
  supabase: SupabaseClient,
  event_id: string
): Promise<SimulationResult> {
  // 1. Fetch all event data in parallel
  const [schedules, participants, vendors, equipment] = await Promise.all([
    fetchSchedules(supabase, event_id),
    fetchParticipants(supabase, event_id),
    fetchVendors(supabase, event_id),
    fetchEquipment(supabase, event_id)
  ])

  // 2. Run all validators in parallel
  const validatorResults = await Promise.all([
    validateRoomConflicts(schedules),
    validateSpeakerOverlaps(schedules),
    validateCapacity(schedules, participants),
    validateTransitionTimes(schedules),
    validateEquipment(schedules, equipment),
    validateVIPSchedule(schedules, participants),
    validateCateringGaps(schedules, vendors)
  ])

  // 3. Flatten and categorize issues
  const allIssues = validatorResults.flat()

  return {
    event_id,
    run_at: new Date().toISOString(),
    total_issues: allIssues.length,
    critical: allIssues.filter(i => i.severity === 'critical').length,
    warnings: allIssues.filter(i => i.severity === 'warning').length,
    info: allIssues.filter(i => i.severity === 'info').length,
    issues: allIssues
  }
}
```

### Pattern 2: Severity-Based Issue Grouping
**What:** Group and sort issues by severity (Critical → Warning → Info) for prioritization
**When to use:** Simulation report display
**Example:**
```typescript
// Source: Standard incident severity classification (industry pattern)
// src/modules/simulation/components/SimulationReport.tsx

const severityConfig = {
  critical: {
    color: 'red',
    icon: AlertTriangle,
    label: 'קריטי',
    description: 'בעיות שחייבות פתרון לפני האירוע'
  },
  warning: {
    color: 'yellow',
    icon: AlertCircle,
    label: 'אזהרה',
    description: 'בעיות מומלצות לפתרון'
  },
  info: {
    color: 'blue',
    icon: Info,
    label: 'מידע',
    description: 'המלצות לשיפור'
  }
}

function SimulationReport({ result }: { result: SimulationResult }) {
  const groupedIssues = {
    critical: result.issues.filter(i => i.severity === 'critical'),
    warning: result.issues.filter(i => i.severity === 'warning'),
    info: result.issues.filter(i => i.severity === 'info')
  }

  return (
    <div className="space-y-6">
      <SimulationSummary
        total={result.total_issues}
        critical={result.critical}
        warnings={result.warnings}
        info={result.info}
      />

      {(['critical', 'warning', 'info'] as const).map(severity => (
        <IssueSection
          key={severity}
          severity={severity}
          issues={groupedIssues[severity]}
          config={severityConfig[severity]}
        />
      ))}
    </div>
  )
}
```

### Pattern 3: Contingency Activation with Suggest+Confirm
**What:** Extend Phase 6's suggest+confirm pattern for backup speaker activation
**When to use:** When manager activates contingency plan during event
**Example:**
```typescript
// Source: Phase 6 suggest+confirm pattern (ai-write-foundation)
// src/modules/contingency/services/contingencyManager.ts

interface ContingencyAction {
  type: 'backup_speaker_activate' | 'room_change' | 'schedule_adjust'
  schedule_id: string
  original_speaker_id?: string
  backup_speaker_id?: string
  original_room?: string
  new_room?: string
  reason: string
  activated_by: string
}

async function suggestContingencyAction(
  supabase: SupabaseClient,
  action: ContingencyAction
): Promise<{
  action_id: string
  type: string
  status: 'pending_approval'
  data: ContingencyAction
  impact: {
    affected_participants: number
    notification_count: number
    affected_sessions: string[]
  }
  label: string
}> {
  // 1. Calculate impact BEFORE suggesting
  const affectedParticipants = await getSessionParticipants(
    supabase,
    action.schedule_id
  )

  // 2. Log suggestion to audit table (following Phase 6 pattern)
  const { data: auditLog } = await supabase
    .from('contingency_audit_log')
    .insert({
      event_id: action.event_id,
      action_type: action.type,
      action_data: action,
      execution_status: 'suggested',
      suggested_by: action.activated_by,
      suggested_at: new Date().toISOString()
    })
    .select('id')
    .single()

  // 3. Return as pending_approval action (NOT executed yet)
  return {
    action_id: auditLog.id,
    type: action.type,
    status: 'pending_approval',
    data: action,
    impact: {
      affected_participants: affectedParticipants.length,
      notification_count: affectedParticipants.length,
      affected_sessions: [action.schedule_id]
    },
    label: `החלפת דובר לסשן "${session.title}"`
  }
}

async function executeContingencyAction(
  supabase: SupabaseClient,
  action_id: string
): Promise<void> {
  // 1. Get action from audit log
  const { data: action } = await supabase
    .from('contingency_audit_log')
    .select('*')
    .eq('id', action_id)
    .single()

  // 2. Execute database changes
  if (action.action_type === 'backup_speaker_activate') {
    await supabase
      .from('schedules')
      .update({
        speaker_id: action.action_data.backup_speaker_id,
        original_speaker_id: action.action_data.original_speaker_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', action.action_data.schedule_id)
  }

  // 3. Update audit log
  await supabase
    .from('contingency_audit_log')
    .update({
      execution_status: 'executed',
      executed_at: new Date().toISOString(),
      executed_by: action.suggested_by
    })
    .eq('id', action_id)

  // 4. Trigger notifications (immediate, not batched)
  const participants = await getSessionParticipants(
    supabase,
    action.action_data.schedule_id
  )

  await notifyParticipants(supabase, participants, {
    type: 'schedule_change',
    message: generateChangeNotification(action)
  })
}
```

### Pattern 4: Immediate Notification on Contingency
**What:** Send WhatsApp notifications immediately via existing send-whatsapp Edge Function
**When to use:** After contingency action execution
**Example:**
```typescript
// Source: Existing send-whatsapp Edge Function
// src/modules/contingency/services/notificationService.ts

async function notifyParticipants(
  supabase: SupabaseClient,
  participants: Participant[],
  change: {
    type: 'schedule_change'
    message: string
  }
): Promise<void> {
  // Use existing send-whatsapp Edge Function
  const notifications = participants.map(participant => ({
    organization_id: participant.organization_id,
    phone: participant.phone_normalized,
    message: change.message,
    participant_id: participant.id
  }))

  // Send in parallel (immediate, no batching)
  await Promise.allSettled(
    notifications.map(notification =>
      supabase.functions.invoke('send-whatsapp', {
        body: notification
      })
    )
  )

  // Log notification attempts in messages table
  await supabase
    .from('messages')
    .insert(
      notifications.map(n => ({
        event_id: participant.event_id,
        participant_id: n.participant_id,
        channel: 'whatsapp',
        to_phone: n.phone,
        content: n.message,
        message_type: 'update',
        status: 'sent',
        sent_at: new Date().toISOString()
      }))
    )
}

function generateChangeNotification(action: ContingencyAction): string {
  // Simple, clear notification content
  if (action.type === 'backup_speaker_activate') {
    return `עדכון: הסשן "${action.session_title}" יועבר לדובר חלופי. הזמן והמיקום נותרים זהים.`
  }
  if (action.type === 'room_change') {
    return `עדכון: הסשן "${action.session_title}" הועבר לאולם ${action.new_room}.`
  }
  // ... other types
}
```

### Pattern 5: Deterministic Simulation
**What:** Same input produces same output for reproducibility
**When to use:** Simulation validation tests, regression detection
**Example:**
```typescript
// Source: Deterministic testing principles (DST pattern)
// src/modules/simulation/services/simulationEngine.ts

// Approach: Sort all inputs consistently + use stable algorithms
async function runDeterministicSimulation(
  supabase: SupabaseClient,
  event_id: string,
  options?: { seed?: string }
): Promise<SimulationResult> {
  // 1. Fetch data with consistent ordering
  const schedules = await supabase
    .from('schedules')
    .select('*')
    .eq('event_id', event_id)
    .order('start_time', { ascending: true })
    .order('id', { ascending: true }) // Tie-breaker for determinism

  // 2. Process in stable order (no Map/Set iteration, use sorted arrays)
  const sortedSchedules = schedules.data?.sort((a, b) => {
    const timeCompare = a.start_time.localeCompare(b.start_time)
    return timeCompare !== 0 ? timeCompare : a.id.localeCompare(b.id)
  })

  // 3. Validators produce consistent results (no randomness, no Date.now())
  const issues = await runValidators(sortedSchedules)

  // 4. Sort issues deterministically
  return {
    event_id,
    run_at: new Date().toISOString(),
    issues: issues.sort((a, b) => {
      // Sort by severity first, then category, then id
      const severityOrder = { critical: 0, warning: 1, info: 2 }
      const severityCompare = severityOrder[a.severity] - severityOrder[b.severity]
      if (severityCompare !== 0) return severityCompare

      const categoryCompare = a.category.localeCompare(b.category)
      if (categoryCompare !== 0) return categoryCompare

      return a.id.localeCompare(b.id)
    }),
    // ... counts
  }
}
```

### Pattern 6: Audit Log Table Design
**What:** Append-only log table tracking all contingency actions
**When to use:** Recording who/what/when/why for accountability
**Example:**
```sql
-- Source: Audit log database design best practices
-- Database schema addition for Phase 9

CREATE TABLE contingency_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'backup_speaker_activate', 'room_change', etc.
  action_data JSONB NOT NULL, -- Full action details
  execution_status TEXT NOT NULL, -- 'suggested', 'executed', 'rejected'
  suggested_by UUID NOT NULL REFERENCES user_profiles(id),
  suggested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  executed_by UUID REFERENCES user_profiles(id),
  executed_at TIMESTAMPTZ,
  reason TEXT NOT NULL, -- Why this action was taken
  impact_summary JSONB, -- { affected_participants: 15, notifications_sent: 15 }
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contingency_audit_event ON contingency_audit_log(event_id);
CREATE INDEX idx_contingency_audit_status ON contingency_audit_log(execution_status);

-- Append-only enforcement: No UPDATE or DELETE policies
ALTER TABLE contingency_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert audit logs" ON contingency_audit_log
  FOR INSERT USING (event_id IN (
    SELECT id FROM events WHERE organization_id = auth.user_organization_id()
  ));
CREATE POLICY "Users can view audit logs" ON contingency_audit_log
  FOR SELECT USING (event_id IN (
    SELECT id FROM events WHERE organization_id = auth.user_organization_id()
  ));
-- NO UPDATE OR DELETE POLICIES - append-only
```

### Anti-Patterns to Avoid
- **Blocking on critical issues:** Never prevent simulation from completing or returning results. Always return full report and let manager decide.
- **Database constraints for simulation:** Don't use PostgreSQL exclusion constraints for validation. Simulation needs to report ALL issues at once, not fail on first conflict.
- **Batching contingency notifications:** Send notifications immediately on action execution. Delays during live events cause confusion.
- **Mutable audit logs:** Never allow UPDATE or DELETE on audit log entries. Append-only is non-negotiable for accountability.
- **Complex fix actions:** One-click fixes should be simple (update one field, reassign one resource). Multi-step workflows break the pattern.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Time overlap detection | Custom date comparison logic | date-fns `areIntervalsOverlapping()` | Handles edge cases (inclusive/exclusive bounds, same-time events) |
| Severity icons | Custom SVG icons | lucide-react (AlertTriangle, AlertCircle, Info) | Consistent design, accessibility labels, size variants |
| Phone normalization | Custom regex transformations | Existing `normalize_phone()` function in schema.sql | Already handles Israeli format (972), tested in production |
| WhatsApp sending | Direct Green API integration | Existing send-whatsapp Edge Function | Rate limiting, error handling, encryption, retry logic |
| Conflict detection | New validation logic | Extend Phase 6 conflictDetector.ts | Already detects room/speaker/capacity conflicts |

**Key insight:** Phase 6 already built most of the validation infrastructure for schedules (room conflicts, speaker overlaps, capacity checks). Simulation reuses this logic but runs ALL validators in parallel and reports comprehensively instead of failing fast.

## Common Pitfalls

### Pitfall 1: Simulation Side Effects
**What goes wrong:** Writing to database during simulation, causing unintended state changes
**Why it happens:** Confusion between simulation (validation only) and contingency (actual changes)
**How to avoid:**
- Simulation functions are pure: read-only database access, return issues list
- No INSERT/UPDATE/DELETE in simulation code paths
- Clear naming: `validateX()` not `checkAndFixX()`
**Warning signs:**
- Simulation takes longer on second run (caching from first run)
- Database updated_at timestamps change after simulation
- Unexpected data in audit logs

### Pitfall 2: Non-Deterministic Validators
**What goes wrong:** Same event produces different simulation results on different runs
**Why it happens:** Using Date.now(), random IDs, unsorted Map iteration, parallel race conditions
**How to avoid:**
- Sort ALL inputs consistently (ORDER BY in queries + stable sorts in code)
- Use stable algorithms only (no Map/Set iteration, use sorted arrays)
- Generate issue IDs deterministically (hash of issue content, not random UUID)
- Process validators in parallel but aggregate results deterministically
**Warning signs:**
- Tests fail intermittently
- Issue order changes between runs
- Issue counts differ on identical data

### Pitfall 3: Notification Failures Not Handled
**What goes wrong:** Contingency action succeeds but participants never get notified
**Why it happens:** send-whatsapp Edge Function fails silently, rate limits hit, network timeouts
**How to avoid:**
- Use Promise.allSettled() not Promise.all() for parallel notifications
- Log ALL notification attempts to messages table (even failures)
- Return notification summary in contingency result
- Show notification status in audit log UI
**Warning signs:**
- Participants report not receiving updates
- Empty messages table for contingency actions
- No error logs in Edge Function

### Pitfall 4: Audit Log Data Loss
**What goes wrong:** Audit entries get modified or deleted, losing accountability trail
**Why it happens:** Forgetting to disable UPDATE/DELETE policies, allowing admin overrides
**How to avoid:**
- Enable RLS with INSERT and SELECT only (NO UPDATE/DELETE policies)
- Document append-only requirement in schema comments
- Add database-level checks if paranoid (trigger that rejects updates)
- Test audit log immutability in integration tests
**Warning signs:**
- Missing audit entries for known actions
- Timestamps that don't match (suggested_at > executed_at)
- Action data that contradicts actual schedule changes

### Pitfall 5: VIP Notification Scope Unclear
**What goes wrong:** VIPs get spammed with notifications for sessions they're not attending, or miss critical updates
**Why it happens:** "Affected participant" definition not clarified (session attendees vs all VIPs vs all participants)
**How to avoid:**
- Define clearly in code: affected = participants enrolled in changed session(s)
- VIP flag determines priority/personalization, not notification scope
- Document in notification service comments
- Provide configuration option if scope needs to vary by event
**Warning signs:**
- VIPs complain about irrelevant notifications
- VIPs miss important schedule changes they care about
- Notification count doesn't match expected participant count

## Code Examples

Verified patterns from official sources:

### Room Conflict Validator
```typescript
// Source: date-fns interval overlap detection + Phase 6 conflict patterns
// src/modules/simulation/services/validators/roomConflicts.ts

import { areIntervalsOverlapping, parseISO } from 'date-fns'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { SimulationIssue } from '../types/simulation.types'

interface Schedule {
  id: string
  title: string
  start_time: string
  end_time: string
  room: string | null
}

export async function validateRoomConflicts(
  schedules: Schedule[]
): Promise<SimulationIssue[]> {
  const issues: SimulationIssue[] = []

  // Group by room
  const byRoom = schedules.reduce((acc, schedule) => {
    if (!schedule.room) return acc
    if (!acc[schedule.room]) acc[schedule.room] = []
    acc[schedule.room].push(schedule)
    return acc
  }, {} as Record<string, Schedule[]>)

  // Check each room for overlaps
  for (const [room, roomSchedules] of Object.entries(byRoom)) {
    // Sort by start time for determinism
    const sorted = [...roomSchedules].sort((a, b) =>
      a.start_time.localeCompare(b.start_time)
    )

    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const a = sorted[i]
        const b = sorted[j]

        const overlaps = areIntervalsOverlapping(
          { start: parseISO(a.start_time), end: parseISO(a.end_time) },
          { start: parseISO(b.start_time), end: parseISO(b.end_time) },
          { inclusive: false } // Exact end/start is OK
        )

        if (overlaps) {
          issues.push({
            id: `room-conflict-${a.id}-${b.id}`,
            severity: 'critical',
            category: 'room',
            title: `התנגשות באולם ${room}`,
            description: `"${a.title}" ו-"${b.title}" מתרחשים באותו אולם בזמנים חופפים`,
            affectedEntities: {
              schedule_ids: [a.id, b.id]
            },
            suggestedFix: {
              type: 'reassign_room',
              action_data: { schedule_id: b.id, current_room: room },
              label: `שנה אולם ל-"${b.title}"`
            }
          })
        }
      }
    }
  }

  return issues
}
```

### Capacity Validator
```typescript
// Source: Capacity validation pattern from Phase 6
// src/modules/simulation/services/validators/capacityValidation.ts

import type { SimulationIssue } from '../types/simulation.types'

interface Schedule {
  id: string
  title: string
  room: string | null
  max_capacity: number | null
  current_count: number
}

export async function validateCapacity(
  schedules: Schedule[]
): Promise<SimulationIssue[]> {
  const issues: SimulationIssue[] = []

  for (const schedule of schedules) {
    if (!schedule.max_capacity) continue

    const utilizationPercent = (schedule.current_count / schedule.max_capacity) * 100

    if (schedule.current_count > schedule.max_capacity) {
      issues.push({
        id: `capacity-exceeded-${schedule.id}`,
        severity: 'critical',
        category: 'capacity',
        title: `חריגה מהקיבולת באולם ${schedule.room}`,
        description: `${schedule.current_count} משתתפים רשומים, אבל הקיבולת היא ${schedule.max_capacity}`,
        affectedEntities: {
          schedule_ids: [schedule.id]
        },
        suggestedFix: {
          type: 'reassign_room',
          action_data: { schedule_id: schedule.id, reason: 'capacity_exceeded' },
          label: `העבר לאולם גדול יותר`
        }
      })
    } else if (utilizationPercent > 90) {
      issues.push({
        id: `capacity-warning-${schedule.id}`,
        severity: 'warning',
        category: 'capacity',
        title: `אולם כמעט מלא: ${schedule.room}`,
        description: `${schedule.current_count}/${schedule.max_capacity} משתתפים (${Math.round(utilizationPercent)}%)`,
        affectedEntities: {
          schedule_ids: [schedule.id]
        }
      })
    }
  }

  return issues
}
```

### Transition Time Validator
```typescript
// Source: Event scheduling best practices (minimum 15min room change buffer)
// src/modules/simulation/services/validators/transitionTimes.ts

import { differenceInMinutes, parseISO } from 'date-fns'
import type { SimulationIssue } from '../types/simulation.types'

interface ParticipantSchedule {
  participant_id: string
  participant_name: string
  schedule_id: string
  schedule_title: string
  start_time: string
  end_time: string
  room: string | null
}

const MIN_TRANSITION_MINUTES = 15

export async function validateTransitionTimes(
  participantSchedules: ParticipantSchedule[]
): Promise<SimulationIssue[]> {
  const issues: SimulationIssue[] = []

  // Group by participant
  const byParticipant = participantSchedules.reduce((acc, ps) => {
    if (!acc[ps.participant_id]) acc[ps.participant_id] = []
    acc[ps.participant_id].push(ps)
    return acc
  }, {} as Record<string, ParticipantSchedule[]>)

  for (const [participantId, schedules] of Object.entries(byParticipant)) {
    // Sort by start time
    const sorted = [...schedules].sort((a, b) =>
      a.start_time.localeCompare(b.start_time)
    )

    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i]
      const next = sorted[i + 1]

      // Only check if rooms are different
      if (!current.room || !next.room || current.room === next.room) continue

      const gapMinutes = differenceInMinutes(
        parseISO(next.start_time),
        parseISO(current.end_time)
      )

      if (gapMinutes < MIN_TRANSITION_MINUTES) {
        issues.push({
          id: `transition-${participantId}-${current.schedule_id}-${next.schedule_id}`,
          severity: 'warning',
          category: 'timing',
          title: `זמן מעבר קצר בין אולמות`,
          description: `${current.participant_name} צריך לעבור מ-${current.room} ל-${next.room} תוך ${gapMinutes} דקות`,
          affectedEntities: {
            schedule_ids: [current.schedule_id, next.schedule_id],
            participant_ids: [participantId]
          }
        })
      }
    }
  }

  return issues
}
```

### React Query Hook for Simulation
```typescript
// Source: @tanstack/react-query patterns (already in project)
// src/modules/simulation/hooks/useSimulation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSupabase } from '@/hooks/useSupabase'
import { runSimulation } from '../services/simulationEngine'
import type { SimulationResult } from '../types/simulation.types'

export function useSimulation(eventId: string) {
  const supabase = useSupabase()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      return runSimulation(supabase, eventId)
    },
    onSuccess: (data: SimulationResult) => {
      // Don't invalidate any queries - simulation is read-only
      // Just return the result for display
      return data
    },
    onError: (error) => {
      console.error('Simulation failed:', error)
    }
  })
}

// Usage in component:
// const simulation = useSimulation(eventId)
// <Button onClick={() => simulation.mutate()}>הרץ סימולציה</Button>
// {simulation.data && <SimulationReport result={simulation.data} />}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Real-time validation on save | Pre-event batch validation | 2020s event tech | Comprehensive reporting vs fail-fast |
| Manual phone calls for changes | Automated WhatsApp notifications | 2020+ (WhatsApp Business API) | Instant updates, audit trail |
| Text file change logs | Structured audit tables (JSONB) | 2010s+ database features | Queryable history, compliance |
| Random test data | Deterministic simulation testing | 2020+ (DST pattern) | Reproducible bugs, regression detection |

**Deprecated/outdated:**
- Synchronous notifications: Async with Promise.allSettled is standard to handle failures gracefully
- Global validation rules: Event-specific rules (some events allow speaker back-to-back, others don't)
- Email-only notifications: WhatsApp is primary channel in 2026 for event updates

## Open Questions

Things that couldn't be fully resolved:

1. **Original Speaker Handling on Backup Activation**
   - What we know: Manager can activate backup speaker, system tracks original_speaker_id
   - What's unclear: Should original speaker status be "cancelled" (blocked from future events) or "standby" (still available)? Does this vary by cancellation reason (sick vs no-show)?
   - Recommendation: Start with simple approach (original speaker remains in system, backup becomes active speaker). Add status field later if cancellation tracking is needed. Mark as Claude's discretion in CONTEXT.md.

2. **Affected Participant Scope for VIP Notifications**
   - What we know: Notifications sent immediately on contingency activation, VIP flag exists in participants table
   - What's unclear: Should VIPs always get notified of ANY schedule change (even if not attending), or only changes to sessions they're enrolled in?
   - Recommendation: Start with session-based scope (notify only enrolled participants, VIP flag adds priority/personalization). Expand if event managers request broader VIP notifications. Marked in CONTEXT.md Claude's discretion.

3. **Simulation Determinism Level**
   - What we know: Deterministic simulation means same input → same output
   - What's unclear: How strict? Should issue IDs be deterministic (hash-based vs UUID)? Should parallel validator execution order matter?
   - Recommendation: Use stable sorting and ordered aggregation for determinism. Issue IDs can be UUIDs (non-deterministic) as long as issue content and order are stable. This is sufficient for regression detection. Implementation approach marked as Claude's discretion.

4. **VIP Notification Priority Implementation**
   - What we know: VIP field exists, notifications use existing send-whatsapp Edge Function
   - What's unclear: What does "priority" mean? Send VIP messages first? Use different message template? Add VIP-specific personalization?
   - Recommendation: Start with send order (VIPs first in notification batch) + simple flag in message template. More sophisticated priority (SMS fallback, push notifications) can be added later. Marked as Claude's discretion.

## Sources

### Primary (HIGH confidence)
- date-fns official documentation - areIntervalsOverlapping API and timezone handling
- @tanstack/react-query v5 documentation - mutation patterns and cache invalidation
- Supabase Edge Functions documentation - Deno runtime and function invocation patterns
- EventFlow project package.json - confirmed versions of all dependencies
- EventFlow schema.sql - existing database structure, RLS policies, normalize_phone function
- EventFlow send-whatsapp Edge Function - existing WhatsApp integration implementation
- Phase 6 research document - suggest+confirm pattern, conflict detection, ai_insights_log table

### Secondary (MEDIUM confidence)
- [Scheduling & Meeting Conflicts: Best Resolution Practices](https://blog.virtosoftware.com/scheduling-conflicts-guide/) - severity levels, conflict categorization
- [How to Use Contingency Planning to Future-Proof Your Event Strategy](https://www.marketingprofs.com/articles/2023/48871/event-strategy-contingency-planning) - backup speaker planning, real-time communication
- [Database Design for Audit Logging | Vertabelo](https://vertabelo.com/blog/database-design-for-audit-logging/) - audit log table patterns, append-only enforcement
- [Understanding incident severity levels | Atlassian](https://www.atlassian.com/incident-management/kpis/severity-levels) - critical/warning/info severity classification
- [Deterministic Simulation Testing (DST) - Antithesis](https://antithesis.com/resources/deterministic_simulation_testing/) - deterministic validation principles

### Tertiary (LOW confidence)
- [Event Risk Management: Key Safety Risks to Plan for in 2026](https://eventify.io/blog/event-risk-management) - real-time notification trends
- [Understanding how to use Mulberry32 to achieve deterministic randomness in JavaScript](https://emanueleferonato.com/2026/01/08/understanding-how-to-use-mulberry32-to-achieve-deterministic-randomness-in-javascript/) - deterministic seed patterns (not directly applicable, marked for validation)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in project package.json, versions confirmed
- Architecture: HIGH - Patterns verified in existing Phase 6 code, date-fns APIs confirmed
- Pitfalls: MEDIUM - Based on general event management patterns + WebSearch findings, not EventFlow-specific incidents

**Research date:** 2026-02-03
**Valid until:** 2026-03-03 (30 days - stable domain, no fast-moving frameworks)
