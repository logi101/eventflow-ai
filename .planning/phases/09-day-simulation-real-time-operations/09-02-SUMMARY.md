---
phase: 09
plan: 02
subsystem: simulation
tags: [validation, validators, engine, simulation, conflict-detection, date-fns]
requires: [09-01]
provides: [simulation-engine, 8-validators, data-fetcher]
affects: [09-03]
tech-stack:
  added: []
  patterns: [parallel-validation, deterministic-sorting, pure-functions]
key-files:
  created:
    - eventflow-app/src/modules/simulation/services/dataFetcher.ts
    - eventflow-app/src/modules/simulation/services/validators/roomConflicts.ts
    - eventflow-app/src/modules/simulation/services/validators/speakerOverlaps.ts
    - eventflow-app/src/modules/simulation/services/validators/capacityValidation.ts
    - eventflow-app/src/modules/simulation/services/validators/transitionTimes.ts
    - eventflow-app/src/modules/simulation/services/validators/equipmentChecks.ts
    - eventflow-app/src/modules/simulation/services/validators/vipSchedule.ts
    - eventflow-app/src/modules/simulation/services/validators/cateringGaps.ts
    - eventflow-app/src/modules/simulation/services/validators/backToBack.ts
    - eventflow-app/src/modules/simulation/services/validators/index.ts
    - eventflow-app/src/modules/simulation/services/simulationEngine.ts
    - eventflow-app/src/modules/simulation/services/index.ts
  modified: []
decisions:
  - Supabase foreign key relationships return arrays by default - extract first element in transformers
  - Validators are pure functions with deterministic IDs (hash of content, not random UUID)
  - Parallel validator execution for performance (all run simultaneously via Promise.all)
  - Three-level deterministic sorting: severity > category > id
  - date-fns areIntervalsOverlapping() used for time overlap detection (inclusive: false for back-to-back)
  - Unused vendors parameter in validateCateringGaps kept for API consistency (may be used in future)
  - Severity mapping: CRITICAL (must fix), WARNING (recommended), INFO (suggestions)
  - Equipment validation uses missing equipment array for suggested fixes
metrics:
  duration: "9m 35s"
  completed: 2026-02-03
---

# Phase 9 Plan 2: Simulation Validators & Engine Summary

**One-liner:** 8 validators detecting event day issues (room conflicts, speaker overlaps, capacity, transitions, equipment, VIP, catering, back-to-back) with deterministic parallel orchestration engine

## What Was Built

### Data Fetcher Service
- `fetchSimulationData()`: Fetches all event data in parallel (schedules, participant schedules, vendors)
- Transforms Supabase response arrays to flat data structures
- Deterministic ordering with tie-breakers (`order by start_time, id`)
- Equipment data derived from schedule `equipment_required` arrays

### 8 Validators (All Pure Functions)

1. **Room Conflicts (CRITICAL)**
   - Detects room double-booking
   - Groups schedules by room_id, checks overlaps with `areIntervalsOverlapping()`
   - Suggested fix: reassign room

2. **Speaker Overlaps (CRITICAL)**
   - Detects speaker double-booking
   - Groups schedules by speaker_id, checks overlaps
   - Suggested fix: activate backup speaker (if available)

3. **Capacity Validation (CRITICAL/WARNING)**
   - CRITICAL: expected_attendance > room_capacity
   - WARNING: utilization > 90%
   - Suggested fix: reassign to larger room

4. **Transition Times (WARNING)**
   - Detects short gaps between rooms for participants (< 15 minutes)
   - Deduplicates by room transition (not per-participant)
   - Suggested fix: adjust time (add delay)

5. **Equipment Checks (WARNING)**
   - Detects missing equipment assignments
   - Compares `equipment_required` vs `assigned`
   - Suggested fix: add missing equipment

6. **VIP Schedule (WARNING)**
   - Detects VIP double-booking
   - Filters to VIPs only, checks overlaps
   - No suggested fix (may be intentional)

7. **Catering Gaps (INFO)**
   - Detects long gaps without meals (> 4 hours)
   - Checks event start → first meal, gaps between meals
   - Suggested fix: add catering breaks

8. **Back-to-Back (WARNING)**
   - Detects back-to-back sessions for same speaker (< 15 minutes gap)
   - Checks speaker fatigue, no prep time
   - Suggested fix: extend break

### Simulation Engine
- `runSimulation()`: Orchestrates all 8 validators
- Runs validators in parallel via `Promise.all()`
- Deterministic sorting: severity (0=critical, 1=warning, 2=info) → category (0=room, 1=speaker, ..., 7=backtoback) → id (string compare)
- Performance tracking with `duration_ms`
- Pure validation - no database writes
- `groupIssuesBySeverity()`: Helper for UI display

## Technical Implementation

### Deterministic Issue IDs
- Room conflicts: `room-conflict-{sortedIds[0]}-{sortedIds[1]}`
- Speaker overlaps: `speaker-overlap-{sortedIds[0]}-{sortedIds[1]}`
- Capacity: `capacity-exceeded-{scheduleId}` or `capacity-warning-{scheduleId}`
- Transitions: `transition-{currentScheduleId}-{nextScheduleId}`
- Equipment: `equipment-missing-{scheduleId}`
- VIP: `vip-conflict-{vipId}-{sortedScheduleIds[0]}-{sortedScheduleIds[1]}`
- Catering: `catering-gap-no-meals`, `catering-gap-start`, `catering-gap-{id1}-{id2}`
- Back-to-back: `backtoback-{currentId}-{nextId}`

### Time Overlap Detection
```typescript
areIntervalsOverlapping(
  { start: parseISO(a.start_time), end: parseISO(a.end_time) },
  { start: parseISO(b.start_time), end: parseISO(b.end_time) },
  { inclusive: false } // Back-to-back sessions OK (exact end/start times don't overlap)
)
```

### Data Transformation Pattern
```typescript
// Supabase returns arrays for foreign key relationships
const schedules = schedulesResult.data.map(s => {
  const room = s.rooms?.[0]  // Extract first element
  const speaker = s.speakers?.[0]
  return { ...s, room_name: room?.name, speaker_name: speaker?.name }
})
```

## Files Created (12 Total)
- **dataFetcher.ts** (184 lines): Parallel data fetching with Supabase
- **validators/** (8 validators + index): 520 lines total
  - roomConflicts.ts (66 lines)
  - speakerOverlaps.ts (63 lines)
  - capacityValidation.ts (52 lines)
  - transitionTimes.ts (77 lines)
  - equipmentChecks.ts (47 lines)
  - vipSchedule.ts (60 lines)
  - cateringGaps.ts (97 lines)
  - backToBack.ts (65 lines)
  - index.ts (8 lines)
- **simulationEngine.ts** (108 lines): Orchestration and sorting
- **services/index.ts** (3 lines): Public API exports

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | dcd4bc3 | Data fetcher service (parallel fetch, transformation) |
| 2 | 0011002 | 8 validators (all with deterministic IDs) |
| 3 | e7ac9c0 | Simulation engine (parallel execution, sorting) |

## Verification

✅ All 8 validators implemented
✅ Deterministic issue IDs (hash of content, not random UUID)
✅ Simulation engine runs all validators in parallel
✅ Results sorted deterministically (severity > category > id)
✅ No database writes during simulation (pure validation)
✅ date-fns `areIntervalsOverlapping()` used for time overlap detection
✅ TypeScript compiles without errors

## Next Phase Readiness

**For 09-03 (Contingency Services):**
- ✅ Simulation engine ready to be called from UI components
- ✅ `SimulationIssue` type provides all data needed for contingency execution
- ✅ `suggestedFix` field contains action_data for contingency manager

**Known Limitations:**
- Equipment validation uses placeholder empty `assigned` array (equipment_assignments table doesn't exist yet)
- Catering gap detection checks only meal/break sessions (doesn't validate against vendor schedules)

## Integration Points

**Used by (09-03):**
- `runSimulation(supabase, eventId)` → called from UI to run full validation
- `SimulationIssue.suggestedFix.type` → maps to contingency action types
- `SimulationIssue.affectedEntities` → provides context for contingency execution

**Dependencies:**
- Phase 09-01: SimulationIssue, SimulationResult types
- date-fns: areIntervalsOverlapping, differenceInMinutes, differenceInHours, parseISO
- Supabase: Data fetching with foreign key relationships

---

**Phase 9 Plan 2 Status:** ✅ COMPLETE
**Next Plan:** 09-03 (Contingency Services)
