---
phase: 07-networking-vip-infrastructure
plan: 04
subsystem: networking-seating
tags: [seating-algorithm, drag-drop, dnd-kit, greedy-algorithm, table-assignments, ui]

# Dependency graph
requires:
  - phase: 07-01
    provides: "table_assignments database schema, networking_opt_in column"
  - phase: 07-02
    provides: "VIPBadge component for VIP visual treatment"
provides:
  - "Greedy seating algorithm with shared interests optimization"
  - "SeatingService CRUD operations for table_assignments"
  - "Drag-drop seating plan UI with manual override capability"
  - "Companion grouping and VIP spread algorithms"
affects: [07-05-business-card-exchange, 08-room-assignment]

# Tech tracking
tech-stack:
  added: ["@dnd-kit/core", "@dnd-kit/sortable", "@dnd-kit/utilities"]
  patterns:
    - "Greedy table assignment with constraint satisfaction"
    - "Drag-drop with @dnd-kit for manual overrides"
    - "Companion grouping preserves relationships"
    - "VIP spread optimization (max 2 VIPs per table)"

key-files:
  created:
    - eventflow-app/src/modules/networking/types.ts
    - eventflow-app/src/modules/networking/services/seatingService.ts
    - eventflow-app/src/modules/networking/services/seatingAlgorithm.ts
    - eventflow-app/src/components/networking/DraggableParticipant.tsx
    - eventflow-app/src/components/networking/TableCard.tsx
    - eventflow-app/src/components/networking/SeatingPlanView.tsx
  modified:
    - eventflow-app/src/components/participants/TrackChip.tsx

key-decisions:
  - "Greedy algorithm chosen over CSP library for v1 (sufficient for typical event sizes)"
  - "8px pointer activation distance prevents accidental drags"
  - "Manual edits default to 'manager' assigned_by for audit trail"
  - "Companions processed as atomic groups (cannot separate)"
  - "Shared interests scoring based on track overlap count"

patterns-established:
  - "Pattern 1: Drag-drop with manual override toggle (default disabled for safety)"
  - "Pattern 2: Algorithm generates, user approves/edits, then saves to DB"
  - "Pattern 3: Table capacity validation at drop time prevents overfilling"
  - "Pattern 4: VIP priority tables get bonus score when VIPs present"

# Metrics
duration: 24min
completed: 2026-02-03
---

# Phase 7 Plan 4: Seating Algorithm & Table Management Summary

**Greedy seating algorithm with shared interests, VIP spread, companion grouping, and drag-drop UI for manual override**

## Performance

- **Duration:** 24 min
- **Started:** 2026-02-03T08:22:15Z
- **Completed:** 2026-02-03T08:46:24Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- Built greedy seating algorithm respecting VIP spread, companion grouping, diversity, and shared interests
- Created seatingService with full CRUD operations for table_assignments table
- Implemented drag-drop seating plan UI with 3-column responsive grid and manual override capability
- VIP participants prioritized and spread across tables (max 2 per table)
- Companions kept together as atomic groups during assignment

## Task Commits

Each task was committed atomically:

1. **Task 1: Create seating types and service** - `21a115f` (feat)
2. **Task 2: Create seating algorithm** - `3b992ba` (feat)
3. **Task 3: Create seating plan UI components** - `c39a471` (feat)

## Files Created/Modified

### Created
- `eventflow-app/src/modules/networking/types.ts` (91 lines) - Seating types: SeatingConstraints, TableAssignment, SeatingParticipant, TableWithParticipants
- `eventflow-app/src/modules/networking/services/seatingService.ts` (179 lines) - CRUD service: fetch, save, update, delete table assignments
- `eventflow-app/src/modules/networking/services/seatingAlgorithm.ts` (313 lines) - Greedy algorithm with companion grouping and VIP spread
- `eventflow-app/src/components/networking/DraggableParticipant.tsx` (77 lines) - Draggable participant card with VIPBadge and track indicators
- `eventflow-app/src/components/networking/TableCard.tsx` (125 lines) - Droppable table card with capacity and VIP count indicators
- `eventflow-app/src/components/networking/SeatingPlanView.tsx` (302 lines) - Main seating plan UI with algorithm generation and drag-drop editing

### Modified
- `eventflow-app/src/components/participants/TrackChip.tsx` - Fixed type-only import for verbatimModuleSyntax compliance

## Decisions Made

**1. Greedy algorithm over CSP solver**
- **Decision:** Use greedy algorithm for v1, defer CSP library integration to future optimization
- **Rationale:** Greedy algorithm is fast O(n²), sufficient for typical event sizes (<500 participants), and simpler to maintain. CSP adds complexity and dependencies without proven need.
- **Impact:** If events exceed 500 participants or require complex constraints, CSP can be added later as optional optimization

**2. Companion atomic grouping**
- **Decision:** Process companions as atomic groups (cannot be separated)
- **Rationale:** Hard constraint per CONTEXT.md - companions must sit together. Treating as atomic unit simplifies algorithm and prevents constraint violations.
- **Impact:** Groups with companions may require larger table capacity, but ensures social cohesion

**3. VIP spread with max 2 per table**
- **Decision:** Maximum 2 VIPs per table when vipSpread enabled
- **Rationale:** Distributes VIP networking opportunities across event, prevents clustering at single "VIP table"
- **Impact:** VIPs get better networking exposure, regular participants get VIP interaction

**4. Shared interests scoring**
- **Decision:** Score tables by count of shared tracks between new participant and existing table members
- **Rationale:** Maximizes connection potential, encourages meaningful conversations
- **Impact:** Tables form around interest clusters, improving networking quality

**5. Manual override with edit mode toggle**
- **Decision:** Drag-drop disabled by default, requires explicit "עריכה ידנית" toggle
- **Rationale:** Prevents accidental moves, forces deliberate manager intervention
- **Impact:** Safer UX, clear distinction between AI suggestion and manual adjustment

**6. 8px activation distance for drags**
- **Decision:** Require 8px pointer movement before drag activates
- **Rationale:** Prevents accidental drags from clicks/taps, especially on mobile
- **Impact:** Better mobile experience, fewer user errors

**7. Manager attribution for manual moves**
- **Decision:** All drag-drop moves set assigned_by='manager'
- **Rationale:** Audit trail shows human override vs AI suggestion
- **Impact:** Can analyze manager intervention patterns, improve algorithm

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TrackChip.tsx type import**
- **Found during:** Task 1 (creating networking types)
- **Issue:** TrackChip.tsx used regular import for `Track` type, violating verbatimModuleSyntax setting causing TypeScript compilation error
- **Fix:** Changed `import { Track }` to `import type { Track }` for type-only import
- **Files modified:** eventflow-app/src/components/participants/TrackChip.tsx
- **Verification:** TypeScript compilation succeeds with no errors
- **Committed in:** 21a115f (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Bug fix was necessary for compilation. No scope creep.

## Issues Encountered

None - all planned functionality implemented successfully.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Plan 07-05 (Business Card Exchange):**
- ✅ Seating assignments stored in table_assignments table
- ✅ SeatingService provides CRUD operations for fetching participants at tables
- ✅ SeatingParticipant type includes track data for skill matching
- ✅ VIP indicators available via VIPBadge component

**Ready for Phase 8 (Room Assignment & Lodging):**
- ✅ Table assignment patterns can be adapted for room assignments
- ✅ Companion grouping algorithm reusable for roommate pairing
- ✅ Constraint satisfaction patterns established

**No blockers.**

## Verification Results

All success criteria met:

✅ **NETW-03:** Seating algorithm assigns participants based on shared interests + diversity
- Algorithm scores shared tracks between participants
- maxSameTrack constraint prevents clustering
- minSharedInterests threshold enforced

✅ **NETW-04:** Table assignments stored in table_assignments table
- saveAllTableAssignments bulk saves algorithm results
- updateParticipantTable saves individual drag-drop moves
- assigned_by tracks source (ai/manager/auto)

✅ **NETW-05:** Manager can view and manually override AI seating plan
- SeatingPlanView displays all tables in responsive grid
- Edit mode toggle enables drag-drop
- Changes persist to database immediately

✅ **NETW-06:** VIP participants get priority seating spread across tables
- VIPs sorted first in algorithm
- Max 2 VIPs per table when vipSpread enabled
- vipPriorityTables bonus scoring for designated tables

✅ **Companion grouping:** Companions grouped together at same table
- groupCompanions() creates atomic companion units
- Processed together, never separated during assignment
- Bidirectional companion_id relationships handled

## Component Statistics

| Component | Lines | Purpose |
|-----------|-------|---------|
| seatingAlgorithm.ts | 313 | Greedy algorithm with 8 helper functions |
| SeatingPlanView.tsx | 302 | Main UI with DndContext and table grid |
| seatingService.ts | 179 | 6 CRUD operations for table_assignments |
| TableCard.tsx | 125 | Droppable table card with capacity indicators |
| types.ts | 91 | 5 TypeScript interfaces for seating system |
| DraggableParticipant.tsx | 77 | Draggable participant with track indicators |

**Total:** 1,087 lines of production code

## Technical Highlights

### Algorithm Performance
- **Time complexity:** O(n² × t) where n=participants, t=tables
- **Space complexity:** O(n + t) for tables map and companion groups
- **Optimization:** Companions pre-grouped reduces iterations

### Constraint Handling
1. **Hard constraints** (must satisfy):
   - Table capacity (cannot exceed)
   - Companions together (atomic groups)

2. **Soft constraints** (maximize score):
   - Shared interests (track overlap count)
   - VIP spread (bonus for priority tables)
   - Diversity (maxSameTrack limit)

### UI Features
- **Responsive grid:** 1 column mobile, 2 tablet, 3 desktop
- **Visual feedback:** Highlight on drag-over, "שחרר כאן" overlay
- **State management:** Local state + auto-save to DB on drop
- **Error handling:** Capacity validation, revert on save failure

---
*Phase: 07-networking-vip-infrastructure*
*Completed: 2026-02-03*
