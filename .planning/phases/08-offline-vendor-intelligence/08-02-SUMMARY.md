---
phase: 08-offline-vendor-intelligence
plan: 02
subsystem: database
tags: [dexie, indexeddb, offline, pwa, typescript]

# Dependency graph
requires:
  - phase: none
    provides: this is the first plan in Phase 8
provides:
  - Dexie.js 4.x IndexedDB foundation for offline check-in storage
  - Schema with OfflineCheckIn and CachedParticipant interfaces
  - Complete CRUD operations for check-ins and participant caching
  - 24-hour TTL system for Safari ITP compliance
affects: [08-03-sync-service, 08-06-ui-integration]

# Tech tracking
tech-stack:
  added: [dexie@4.3.0, dexie-react-hooks@4.2.0]
  patterns: [offline-first data layer, TTL-based cache expiration, last-wins deduplication]

key-files:
  created:
    - src/modules/checkin/db/schema.ts
    - src/modules/checkin/db/db.ts
    - src/modules/checkin/db/operations.ts
    - src/modules/checkin/db/index.ts
  modified:
    - package.json (dexie dependencies)

key-decisions:
  - "Dexie.js 4.x chosen as IndexedDB wrapper (ecosystem standard for React/TypeScript)"
  - "24-hour TTL for cached data to comply with Safari ITP"
  - "Last-wins rule for duplicate check-ins (update timestamp on conflict)"
  - "Store participants individually (not as array) to avoid UI blocking"
  - "synced boolean and syncRetries number for sync tracking"
  - "TypeScript verbatimModuleSyntax compliance with type-only imports"

patterns-established:
  - "IndexedDB schema pattern: separate interfaces for OfflineCheckIn and CachedParticipant"
  - "Singleton database instance: export const db = new CheckInDatabase()"
  - "TTL pattern: expiresAt = cachedAt + PARTICIPANT_TTL_MS"
  - "Deduplication pattern: check existing before add, update timestamp if found"
  - "Query pattern: use 0 instead of false for indexed boolean fields (Dexie IndexableType)"

# Metrics
duration: 2min
completed: 2026-02-03
---

# Phase 08 Plan 02: Dexie.js IndexedDB Setup Summary

**Dexie.js 4.x IndexedDB foundation with offline check-in schema, CRUD operations, and 24-hour TTL for Safari ITP compliance**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-03T15:40:40Z
- **Completed:** 2026-02-03T15:42:48Z
- **Tasks:** 5
- **Files modified:** 5

## Accomplishments
- Installed Dexie.js 4.x and React hooks integration
- Created IndexedDB schema with OfflineCheckIn and CachedParticipant interfaces
- Implemented complete CRUD operations for check-ins and participant caching
- Established 24-hour TTL system for Safari ITP compliance
- TypeScript-compliant with verbatimModuleSyntax

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Dexie.js** - `6f3ea35` (chore)
2. **Task 2: Create IndexedDB Schema** - `5e06efa` (feat)
3. **Task 3: Create Dexie Database Instance** - `5a824f0` (feat)
4. **Task 4: Create Database Operations** - `3ed5611` (feat)
5. **Task 5: Create Index Export** - `af09fd3` (feat)

## Files Created/Modified

- `package.json` - Added dexie@4.3.0 and dexie-react-hooks@4.2.0
- `src/modules/checkin/db/schema.ts` - IndexedDB schema with OfflineCheckIn and CachedParticipant interfaces, TTL constants
- `src/modules/checkin/db/db.ts` - Dexie database class with checkIns and participants tables, singleton instance
- `src/modules/checkin/db/operations.ts` - CRUD operations: add, get, update, delete for check-ins and participants
- `src/modules/checkin/db/index.ts` - Centralized exports for db module

## Decisions Made

- **Dexie.js 4.x over raw IndexedDB**: Ecosystem standard for React/TypeScript with TypedORM-like API
- **24-hour TTL for cached data**: Safari ITP deletes storage after 7 days of inactivity; 24h TTL ensures fresh data
- **Last-wins deduplication**: If duplicate check-in exists, update timestamp instead of creating duplicate
- **Indexed query using 0 for boolean**: Dexie requires IndexableType (number/string/Date) for indexed queries, not boolean
- **Type-only imports**: Project uses verbatimModuleSyntax, requires `type` keyword for type-only imports

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] TypeScript verbatimModuleSyntax errors**
- **Found during:** Task 3 (Create Dexie Database Instance)
- **Issue:** TypeScript error - 'Table', 'OfflineCheckIn', 'CachedParticipant' must be imported using type-only imports
- **Fix:** Changed imports to `import { type Table } from 'dexie'` and `import { type OfflineCheckIn, type CachedParticipant, DB_NAME, DB_VERSION } from './schema'`
- **Files modified:** src/modules/checkin/db/db.ts, src/modules/checkin/db/operations.ts
- **Verification:** TypeScript compilation passes (`npm run typecheck`)
- **Committed in:** 5a824f0, 3ed5611

**2. [Rule 1 - Bug] Dexie IndexableType constraint**
- **Found during:** Task 4 (Create Database Operations)
- **Issue:** `db.checkIns.where('synced').equals(false)` TypeScript error - boolean not assignable to IndexableType
- **Fix:** Changed `equals(false)` to `equals(0)` (Dexie indexes require number/string/Date)
- **Files modified:** src/modules/checkin/db/operations.ts
- **Verification:** TypeScript compilation passes, ESLint passes
- **Committed in:** 3ed5611

---

**Total deviations:** 2 auto-fixed (1 blocking TypeScript, 1 Dexie API bug)
**Impact on plan:** Both fixes necessary for TypeScript compliance and Dexie API correctness. No scope creep.

## Issues Encountered

None - all tasks executed smoothly after auto-fixes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Plan 08-03 (Sync Service & Hooks):**
- IndexedDB schema complete and tested (TypeScript compilation passes)
- CRUD operations available: addOfflineCheckIn, getPendingCheckIns, markCheckInSynced, etc.
- TTL system in place for cache expiration
- Singleton db instance ready for consumption

**Blockers:** None

**Notes for 08-03:**
- Import from `@/modules/checkin/db` for clean path
- Use `addOfflineCheckIn(participantId, eventId)` for offline check-in
- Use `cacheParticipants(participants, eventId)` to populate cache
- Background sync service will call `getPendingCheckIns()` and `markCheckInSynced(localId)`

---
*Phase: 08-offline-vendor-intelligence*
*Completed: 2026-02-03*
