---
phase: 06
plan: 02
subsystem: ai-chat
tags: [gemini, edge-function, schedule-management, conflict-detection, vip-awareness, pending-approval]
requires: [06-01-database-foundation]
provides: [ai-schedule-tools, conflict-detection, vip-impact-assessment, audit-logging]
affects: [06-03-frontend-approval, 06-04-execution-layer]
tech-stack:
  added: []
  patterns: [suggest-confirm-execute, pending-approval, conflict-detection]
key-files:
  created: []
  modified:
    - eventflow-scaffold/supabase/functions/ai-chat/index.ts
decisions:
  - id: schedule-suggestions-only
    what: AI chat returns pending_approval actions, never executes schedule writes
    why: Manager must approve all schedule changes (suggest-confirm-execute pattern)
    alternatives: [auto-execute-low-risk, require-approval-all]
    chosen: require-approval-all
  - id: database-level-room-conflicts
    what: Room conflicts enforced by no_room_overlap constraint (database level)
    why: Atomic prevention via GIST exclusion constraint
    impact: Room double-booking is impossible at write time
  - id: application-level-speaker-conflicts
    what: Speaker conflicts detected at application level (warn but don't block)
    why: Same speaker can theoretically be in two places (edge case: video call + physical)
    impact: AI warns, manager decides
  - id: vip-flag-in-suggestions
    what: AI checks is_vip flag and includes vip_affected in action_data
    why: Manager needs to know if VIPs are impacted before approving
    impact: Frontend can highlight VIP-affecting changes
duration: 8m 19s
completed: 2026-02-02
---

# Phase [6] Plan [2]: Extend AI Chat with Schedule Management Tools Summary

Extended the existing ai-chat Edge Function with 3 new schedule management tools (create, update, delete) that detect conflicts, check VIP impact, log suggestions to ai_insights_log, and return pending_approval actions for frontend presentation.

## What Was Built

### Core Deliverables

**1. Schedule Management Tool Declarations (3 new tools)**
- `create_schedule_item`: Creates new schedule item with room, speaker, time, capacity validation
- `update_schedule_item`: Updates existing schedule item with partial changes object
- `delete_schedule_item`: Deletes schedule item with reason

**2. Conflict Detection System**
- `detectScheduleConflicts()` helper function
- Room overlap detection: queries schedules table for same event+room+overlapping time
- Speaker overlap detection: case-insensitive match on speaker_name with time overlap
- Capacity warning: compares proposed max_capacity with registered participant count
- Returns structured ConflictResult with arrays of conflicts and warnings

**3. VIP Impact Assessment**
- Each tool execution function checks participants table for `is_vip = true`
- VIP flag included in action_data JSONB for frontend visibility
- VIP impact mentioned in AI's response message

**4. Audit Logging**
- All suggestions logged to `ai_insights_log` table
- Includes: current_state, proposed_state, conflicts_detected, vip_affected, reasoning
- Execution status set to 'suggested' (lifecycle: suggested → approved/rejected → executed/failed)
- Log ID returned in pending_approval action for frontend reference

**5. Tool Execution Functions**
- `executeCreateScheduleItem`: validates dates, checks event exists, detects conflicts, logs suggestion
- `executeUpdateScheduleItem`: fetches current schedule, merges changes, validates, detects conflicts, logs suggestion
- `executeDeleteScheduleItem`: fetches current schedule, checks VIP impact, logs suggestion
- All return `{ success: true, data: { action: 'pending_approval', ... } }`

**6. System Prompt Enhancement**
- Added 3 new tools to tool list with Hebrew descriptions
- Added "ניהול לוח זמנים והשפעה על VIP" section with conflict/VIP handling guidance
- Instructs AI to check conflicts, identify VIP impact, suggest alternatives, explain changes

**7. Action Extraction**
- Added 3 new cases to `extractActions()` function
- Maps tool results to structured actions: `schedule_create_pending`, `schedule_update_pending`, `schedule_delete_pending`
- Labels include conflict status and VIP impact for frontend display

### Integration Points

**To ai_insights_log table (created in 06-01)**
- INSERT with execution_status='suggested' for all schedule tool calls
- JSONB action_data contains full proposed state and detected conflicts

**To schedules table**
- Query for conflict detection (no writes in this phase)
- Room conflict query: `event_id + room + overlapping time range`
- Speaker conflict query: `event_id + speaker_name (ILIKE) + overlapping time range`

**To participants table**
- Query `is_vip` flag to assess VIP impact
- Count registered participants for capacity validation

**Dispatcher Integration**
- Added 3 cases to `executeTool()` switch statement
- All cases pass `userId` parameter for audit logging

**Existing Functionality Preserved**
- All 7 existing tools unchanged: search_events, search_vendors, get_event_details, suggest_schedule, create_event_draft, add_checklist_items, assign_vendors
- Main handler, Gemini API call loop, CORS handling, authentication all unchanged

## Technical Implementation

### Files Modified

**event flow-scaffold/supabase/functions/ai-chat/index.ts**
- Lines added: 615
- Original size: 1464 lines → Final size: 2079 lines
- Additive changes only - no existing functionality broken

### Code Quality

**Type Safety**
- ConflictResult interface for conflict detection return type
- Proper typing for all tool execution functions
- z.infer pattern maintained (no `any` types)

**Error Handling**
- Try-catch blocks in all tool execution functions
- Specific error messages in Hebrew for each failure scenario
- Logged errors for debugging (console.error)

**Database Patterns**
- Service role key used for direct database access (bypasses RLS)
- Parallel queries avoided (sequential for data dependencies)
- Conflict detection uses multiple queries (room + speaker + capacity)

**Audit Trail**
- Every suggestion logged before returning to user
- Log failures logged but don't block suggestion return
- Log ID included in response for frontend tracking

## Verification Results

✅ All 7 existing tools still present and unchanged
✅ 3 new tool declarations added with proper parameters
✅ detectScheduleConflicts handles room, speaker, and capacity
✅ New tool execution functions return pending_approval (never execute writes)
✅ extractActions handles new tool types with proper labels
✅ System prompt has VIP and schedule management sections
✅ executeTool dispatcher includes 3 new cases
✅ File compiles without errors (TypeScript syntax valid)

### Tool Count Verification

```bash
$ grep "name: '" index.ts | grep -v "AES-GCM"
search_events
search_vendors
get_event_details
suggest_schedule
create_event_draft
add_checklist_items
assign_vendors
create_schedule_item      # NEW
update_schedule_item      # NEW
delete_schedule_item      # NEW
```

**Total: 10 tools (7 existing + 3 new)**

## Deviations from Plan

None - plan executed exactly as written.

All changes were additive. No existing functionality modified.

## Next Phase Readiness

**Phase 6, Plan 3 (Frontend Approval UI) can proceed** - AI chat now returns structured pending_approval actions with:
- `action_type`: schedule_create, schedule_update, schedule_delete
- `log_id`: Reference to ai_insights_log entry
- `proposed_item`: Full proposed state
- `conflicts`: Structured conflict details with counts
- `vip_affected`: Boolean flag for frontend highlighting

**Frontend can now:**
1. Display pending approvals with conflict warnings
2. Highlight VIP-affecting changes
3. Show detailed conflict information (which room/speaker/time)
4. Reference log_id for approval/rejection tracking

**Phase 6, Plan 4 (Execution Layer) prerequisites met:**
- Audit log entries created with execution_status='suggested'
- Proposed state stored in action_data for execution
- Log ID available for status updates (suggested → approved → executed)

## Knowledge for Future Phases

### Conflict Detection Patterns

**Room Conflicts (Database Level)**
- Enforced by `no_room_overlap` GIST exclusion constraint
- Application-level detection mirrors database constraint
- INSERT will fail if conflict exists (atomic prevention)

**Speaker Conflicts (Application Level)**
- Detected by application, not enforced by database
- Case-insensitive match on speaker_name
- Warns but doesn't block (manager decides)

**Overlap Logic**
- Condition: `existing.start_time < proposed.end_time AND existing.end_time > proposed.start_time`
- Handles all overlap scenarios: full overlap, partial overlap, contained, containing

### VIP Impact Assessment

**When to Check VIP Flag**
- Create: Check if `is_mandatory = true` (mandatory sessions affect all participants including VIPs)
- Update: Always check (any schedule change can affect VIPs)
- Delete: Always check (removing item affects VIPs)

**VIP Query Pattern**
```typescript
const { count } = await supabase
  .from('participants')
  .select('id', { count: 'exact', head: true })
  .eq('event_id', eventId)
  .eq('is_vip', true)

vipAffected = (count || 0) > 0
```

### Audit Logging Patterns

**action_data Structure**
```jsonb
{
  "current_state": {...},        // State before change (null for create)
  "proposed_state": {...},       // State after change (null for delete)
  "changes": {...},              // Partial changes (update only)
  "conflicts_detected": {
    "room": [...],               // Array of room conflicts
    "speaker": [...],            // Array of speaker conflicts
    "capacity": "..."            // Capacity warning string or null
  },
  "vip_affected": boolean,
  "reasoning": "..."             // AI's explanation
}
```

**Execution Status Lifecycle**
- suggested → approved (user confirms) → executed (system writes) → failed (if error)
- suggested → rejected (user declines)

### Error Messages (Hebrew)

- Missing required fields: "חסרים שדות חובה: ..."
- Invalid dates: "תאריכים לא תקינים. השתמש בפורמט ISO: YYYY-MM-DDTHH:MM:SS"
- Start >= End: "זמן התחלה חייב להיות לפני זמן סיום"
- Event not found: "האירוע לא נמצא"
- Schedule not found: "פריט לוח הזמנים לא נמצא"
- No changes: "לא צוינו שינויים"

### Pending Approval Response Format

```typescript
{
  success: true,
  data: {
    action: 'pending_approval',
    action_type: 'schedule_create' | 'schedule_update' | 'schedule_delete',
    log_id: 'uuid',
    proposed_item: {...},      // Full proposed state
    current_item?: {...},      // Current state (update/delete only)
    changes?: {...},           // Partial changes (update only)
    conflicts: {
      room_conflicts: number,
      speaker_conflicts: number,
      has_conflicts: boolean,
      details: ConflictResult
    },
    vip_affected: boolean,
    message: string            // Hebrew message for frontend display
  }
}
```

## Testing Recommendations

**Unit Tests Needed**
1. detectScheduleConflicts with various overlap scenarios
2. VIP flag detection with 0, 1, multiple VIPs
3. Capacity warning with below/equal/above threshold
4. Date validation with invalid formats
5. Merge changes logic in update function

**Integration Tests Needed**
1. Create schedule item → verify ai_insights_log INSERT
2. Update with room change → verify room conflict detection
3. Delete with VIP participants → verify vip_affected flag
4. Tool call with no userId → verify log still created

**Edge Cases to Test**
1. Room conflict with exact same time range (start1=start2, end1=end2)
2. Speaker conflict with case variations (John Doe vs john doe)
3. Capacity = 0 (unlimited)
4. Update with no changes (empty object)
5. Delete non-existent schedule_id

## Performance Considerations

**Query Count per Tool Call**
- Create: 3-5 queries (event check, room conflict, speaker conflict, VIP check, log insert)
- Update: 4-6 queries (fetch current, room conflict, speaker conflict, VIP check, log insert)
- Delete: 3 queries (fetch current, VIP check, log insert)

**Optimization Opportunities** (for future)
- Batch conflict queries (single query for room + speaker)
- Cache VIP participant list per event (reduces repeated queries)
- Use database function for conflict detection (single round-trip)

**Current Performance** (estimated)
- Average tool call: 150-300ms (5 queries × 30-60ms each)
- Acceptable for interactive AI chat (user sees "thinking" indicator)

## Security Considerations

**RLS Bypass via Service Role Key**
- Tool execution uses service_role_key (bypasses RLS)
- Relies on frontend authentication (userId passed from frontend)
- Audit log still enforces RLS on SELECT/UPDATE

**Input Validation**
- Required fields checked
- Date format validated
- Start < End enforced
- Event existence verified before suggesting changes

**No Direct Writes**
- All tools return suggestions only
- Actual writes deferred to Phase 6, Plan 4 (execution layer)
- Double-check before execution (suggestion may be stale)

## Rollback Plan

If issues discovered:
1. Revert commit: `git revert 0b33c50`
2. Restore original: `git checkout HEAD~1 -- eventflow-scaffold/supabase/functions/ai-chat/index.ts`
3. Redeploy Edge Function: `supabase functions deploy ai-chat`

No database changes in this plan - rollback is code-only.

## Lessons Learned

### What Went Well
- Additive changes kept existing functionality intact
- Structured action format makes frontend integration clear
- VIP awareness adds valuable context for managers
- Conflict detection provides safety before writes

### Challenges Encountered
- File size (2079 lines) makes edits complex
- Hebrew text in system prompt requires UTF-8 handling
- Linter reformatting interfered with automated edits
- Multiple insertion points required manual verification

### Process Improvements
- For large files: use Python script for complex insertions
- Test conflict detection logic before full integration
- Verify tool count after each addition
- Clean up development artifacts before commit

## Metrics

- **Plans Completed:** 2/4 (Phase 6)
- **Commit:** 0b33c50
- **Duration:** 8 minutes 19 seconds
- **Lines Added:** 615
- **Files Modified:** 1
- **Tools Added:** 3 (create, update, delete schedule items)
- **Total Tools:** 10 (7 existing + 3 new)
- **New Functions:** 4 (detectScheduleConflicts, executeCreateScheduleItem, executeUpdateScheduleItem, executeDeleteScheduleItem)
- **Test Coverage:** 0% (no tests added - recommend adding in future)

---

**Status:** ✅ Complete - All tasks executed, no deviations, ready for Phase 6 Plan 3 (Frontend Approval UI)

**Next:** Implement frontend approval UI to display pending_approval actions with conflict details and VIP warnings
