---
phase: 08-offline-vendor-intelligence
plan: 03
subsystem: offline-sync
tags: [indexeddb, dexie, react-hooks, offline-first, rate-limiting, sync]

# Dependency graph
requires:
  - phase: 08-02
    provides: Dexie.js IndexedDB database with check-ins and participants tables
provides:
  - Online/offline status detection with React hooks
  - Sync queue tracking with live IndexedDB updates
  - Rate-limited sync service (10 req/min shared quota)
  - Offline-first check-in hook with optimistic updates
  - Connection status UI component with toast notifications
affects: [08-04, check-in-ui, offline-mode]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - navigator.onLine + window online/offline events for connection detection
    - useLiveQuery from dexie-react-hooks for real-time IndexedDB updates
    - localStorage-based rate limiting with rolling window
    - Exponential backoff with jitter (200ms-5s, max 5 retries)
    - Optimistic updates with TanStack Query onMutate
    - Toast notifications for connection state changes (3s auto-hide)

key-files:
  created:
    - src/modules/checkin/hooks/useOnlineStatus.ts
    - src/modules/checkin/hooks/useSyncQueue.ts
    - src/modules/checkin/hooks/useOfflineCheckIn.ts
    - src/modules/checkin/services/syncService.ts
    - src/modules/checkin/components/ConnectionStatus.tsx
    - src/modules/checkin/hooks/index.ts
    - src/modules/checkin/components/index.ts
  modified: []

key-decisions:
  - "Rate limit: 10 requests/minute shared across all sync operations"
  - "Exponential backoff: 200ms base with 30% jitter, max 5s delay"
  - "Max retry count: 5 attempts before giving up"
  - "Pending count badge only visible when offline (per CONTEXT.md)"
  - "Toast notification on connection change, not persistent banner"
  - "Auto-sync triggered by 'online' event via setupAutoSync()"
  - "Optimistic updates for instant UI feedback on check-in"

patterns-established:
  - "useOnlineStatus: Track navigator.onLine with event listeners"
  - "useSyncQueue: useLiveQuery for live pending count tracking"
  - "syncService: Rate limiting via localStorage with rolling time window"
  - "useOfflineCheckIn: Write to IndexedDB first, sync if online, optimistic updates"
  - "ConnectionStatus: Toast on connection change with 3s auto-hide"

# Metrics
duration: 12min
completed: 2026-02-03
---

# Phase 08 Plan 03: Offline Sync Service Summary

**Offline-first sync infrastructure with rate limiting, exponential backoff, and real-time connection status UI**

## Performance

- **Duration:** 12 min
- **Started:** 2026-02-03T15:47:48Z
- **Completed:** 2026-02-03T15:58:55Z
- **Tasks:** 6
- **Files modified:** 8 (7 created, 1 fixed)

## Accomplishments
- Online/offline detection with useOnlineStatus hook tracking navigator.onLine
- Live sync queue monitoring with useSyncQueue using Dexie useLiveQuery
- Rate-limited sync service (10 req/min) with exponential backoff and retry logic
- Offline-first check-in hook with optimistic UI updates via TanStack Query
- Connection status component with toast notifications (3s auto-hide, Hebrew RTL)
- Auto-sync on connection restore via window 'online' event listener

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Online Status Hook** - `e88b07a` (feat)
2. **Task 2: Create Sync Queue Hook** - `4565118` (feat)
3. **Task 3: Create Sync Service** - `ac9e4ad` (feat)
4. **Task 4: Create Offline Check-In Hook** - `d7797ed` (feat)
5. **Task 5: Create Connection Status Component** - `68d70f4` (feat)
6. **Task 6: Create Index Exports** - `aa6e636` (feat)

## Files Created/Modified

### Created
- `src/modules/checkin/hooks/useOnlineStatus.ts` - Navigator.onLine state with event listeners
- `src/modules/checkin/hooks/useSyncQueue.ts` - Live pending count via useLiveQuery
- `src/modules/checkin/hooks/useOfflineCheckIn.ts` - Offline-first check-in with optimistic updates
- `src/modules/checkin/services/syncService.ts` - Rate-limited sync with exponential backoff
- `src/modules/checkin/components/ConnectionStatus.tsx` - Connection UI with toast notifications
- `src/modules/checkin/hooks/index.ts` - Hook exports
- `src/modules/checkin/components/index.ts` - Component exports

### Modified
- `src/modules/vendors/hooks/useBudgetAlerts.ts` - Fixed: Removed unused BudgetAlert type import

## Decisions Made

**1. Rate Limiting Strategy**
- 10 requests/minute shared quota across all sync operations
- localStorage-based tracking with rolling time window (60s)
- Prevents overwhelming Supabase when many offline check-ins sync at once
- Rate limit state: `{ count: number, windowStart: timestamp }`

**2. Exponential Backoff with Jitter**
- Base delay: 200ms doubled per retry (200ms, 400ms, 800ms, 1600ms, 3200ms)
- 30% jitter to prevent thundering herd
- Capped at 5 seconds max delay
- Max 5 retry attempts before giving up

**3. Connection Status UX**
- Toast notification on connection change (3s auto-hide) - not persistent banner
- Pending count badge only visible when offline (per CONTEXT.md)
- Hebrew RTL with lucide-react icons (Wifi/WifiOff/RefreshCw)
- Green gradient for online, amber gradient for offline

**4. Offline-First Pattern**
- Always write to IndexedDB first (offline-safe)
- Attempt immediate sync if online
- Optimistic updates for instant UI feedback
- Rollback on error via TanStack Query onError

**5. Auto-Sync Trigger**
- setupAutoSync() registers 'online' event listener
- 1-second delay after connection restore for stability
- Syncs all pending check-ins automatically

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed unused import in syncService.ts**
- **Found during:** Task 3 (Sync Service creation)
- **Issue:** Imported `db` from '../db' but never used (getPendingCheckIns was sufficient)
- **Fix:** Removed unused `db` import
- **Files modified:** `src/modules/checkin/services/syncService.ts`
- **Verification:** ESLint and TypeScript validation passed
- **Committed in:** ac9e4ad (Task 3 commit)

**2. [Rule 1 - Bug] Fixed Dexie synced field type mismatch**
- **Found during:** Task 4 (Offline Check-In Hook)
- **Issue:** Plan used `{ synced: 1 }` but Dexie expects boolean or PropModification
- **Fix:** Changed to use `markCheckInSynced(localId)` helper function
- **Files modified:** `src/modules/checkin/hooks/useOfflineCheckIn.ts`
- **Verification:** TypeScript type checking passed
- **Committed in:** d7797ed (Task 4 commit)

**3. [Rule 2 - Missing Critical] Added proper TypeScript types for optimistic updates**
- **Found during:** Task 4 (Offline Check-In Hook)
- **Issue:** ESLint no-explicit-any errors on TanStack Query cache updates
- **Fix:** Defined Participant interface and typed the setQueryData callback
- **Files modified:** `src/modules/checkin/hooks/useOfflineCheckIn.ts`
- **Verification:** ESLint validation passed, types correct
- **Committed in:** d7797ed (Task 4 commit)

**4. [Rule 3 - Blocking] Fixed unused parameters in error handler**
- **Found during:** Task 4 (Offline Check-In Hook)
- **Issue:** ESLint error for unused err and participantId in onError callback
- **Fix:** Prefixed with underscore (_err, _participantId) per ESLint convention
- **Files modified:** `src/modules/checkin/hooks/useOfflineCheckIn.ts`
- **Verification:** ESLint validation passed
- **Committed in:** d7797ed (Task 4 commit)

**5. [Rule 3 - Blocking] Removed unused BudgetAlert type import**
- **Found during:** Task 6 (Index Exports)
- **Issue:** TypeScript error in useBudgetAlerts.ts - imported but never used
- **Fix:** Removed type import (auto-fixed by linter)
- **Files modified:** `src/modules/vendors/hooks/useBudgetAlerts.ts`
- **Verification:** TypeScript validation passed
- **Committed in:** aa6e636 (Task 6 commit)

---

**Total deviations:** 5 auto-fixed (2 bugs, 1 missing critical, 2 blocking)
**Impact on plan:** All auto-fixes necessary for type safety and correctness. No scope creep.

## Issues Encountered

None - all tasks completed as specified with only minor type fixes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for:**
- 08-04: Budget alerts UI integration
- Check-in UI implementation using offline hooks
- Vendor intelligence features requiring sync infrastructure

**Available infrastructure:**
- `useOnlineStatus()` - Connection state tracking
- `useSyncQueue(eventId?)` - Live pending count with hasPending flag
- `useOfflineCheckIn(eventId)` - Offline-first check-in mutation
- `useManualSync(eventId?)` - Manual sync trigger if needed
- `<ConnectionStatus />` - Ready-to-use connection UI component
- `syncPendingCheckIns(eventId?)` - Background sync service
- `setupAutoSync()` - Auto-sync on connection restore

**Technical notes:**
- Rate limit shared across all sync operations (10/min)
- Pending count only visible offline per CONTEXT.md
- Toast appears for 3 seconds on connection change
- Max 5 retry attempts with exponential backoff
- Auto-sync has 1s delay for connection stability

**No blockers or concerns.**

---
*Phase: 08-offline-vendor-intelligence*
*Completed: 2026-02-03*
