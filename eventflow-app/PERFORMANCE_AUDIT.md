# EventFlow AI — Performance Audit

**Date:** 2026-03-15
**Auditor:** Claude Sonnet 4.6 (MD4 Agent)
**Scope:** Bundle size, query efficiency, React rendering, DB index coverage

---

## Overall Score: 68 / 100

| Category | Score | Max |
|---|---|---|
| N+1 / Query Efficiency | 14 | 25 |
| DB Index Coverage | 14 | 20 |
| Bundle Performance | 20 | 25 |
| React Rendering | 12 | 15 |
| Supabase Query hygiene | 8 | 15 |
| **Total** | **68** | **100** |

---

## 1. N+1 Queries — CRITICAL (Fixed)

### Finding: EventsPage.tsx — Severe N+1 (3N extra queries)

**File:** `src/modules/events/pages/EventsPage.tsx`

The `fetchEvents()` function fetched all events in one query, then for **each event** fired 3 parallel Supabase requests:
- `participants` count
- `checklist_items` rows
- `event_vendors` count

With 10 events → 31 total DB round-trips on every page load. With 50 events → 151 round-trips.

**Fix applied:** Replaced the per-event `Promise.all` loop with 3 batch queries using `.in('event_id', eventIds)`, then built O(n) lookup maps client-side. Now always **4 queries total** regardless of event count.

Before (N=10 events): 1 + 3×10 = **31 queries**
After: 1 + 3 = **4 queries**

### EventContext.tsx — Already Good

`refreshEvents()` correctly batch-fetches participants and schedules using `.in('event_id', eventIds)`. The pattern is sound.

Minor issue: `selectEventById()` (called only for cache misses) fires a separate `participants` count query but skips the `schedules` count. This is low-traffic code but inconsistent — the single-event path does 2 queries while the batch path does 1+2.

### Auto-complete side-effect in EventContext

`refreshEvents()` fires one `.update()` per past event that needs status correction. With many past events this can be N additional mutations. Consider a single SQL `UPDATE ... WHERE id = ANY($1)` RPC instead.

---

## 2. Missing DB Indexes — HIGH

No initial `schema.sql` was found in the repository; the core tables (`events`, `participants`, `schedules`, `checklist_items`, `event_vendors`, `user_profiles`) have no confirmed indexes in the migration history.

The later migrations (20260120+) create indexes for newer tables (speakers, tracks, rooms, etc.) but the foundational tables are uncovered.

**Missing indexes identified:**

| Table | Column(s) | Reason |
|---|---|---|
| `events` | `organization_id, start_date DESC` | Primary RLS + list query pattern |
| `events` | `status` | Filter used in both pages |
| `events` | `organization_id, status, start_date DESC` | Combined filter + sort |
| `participants` | `event_id` | All batch count queries |
| `schedules` | `event_id` | Batch fetch in EventContext |
| `schedules` | `event_id, start_time` | Schedule view ordering |
| `checklist_items` | `event_id` | Batch fetch post-fix |
| `checklist_items` | `event_id, status` | Progress calculation |
| `event_vendors` | `event_id` | Batch fetch post-fix |
| `push_subscriptions` | `user_id` | Lookup key |
| `user_profiles` | `organization_id` | RLS join in many policies |

**Fix applied:** Created migration `supabase/migrations/20260315000001_performance_indexes.sql` with all the above indexes using `CREATE INDEX IF NOT EXISTS`.

---

## 3. Bundle Performance — GOOD

### Vite config strengths
- Manual chunk splitting is well-configured:
  - `vendor-react` (react, react-dom, react-router-dom)
  - `vendor-supabase` (@supabase/supabase-js)
  - `vendor-query` (@tanstack/react-query + react-table)
  - `vendor-form` (react-hook-form + resolvers + zod)
  - `vendor-motion` (framer-motion) — isolated correctly since it's the heaviest animation lib
- PWA enabled with service worker caching of Supabase API responses (NetworkFirst, 1h TTL)
- Bundle budget checker script (`scripts/check-bundle-budget.mjs`) enforces 450KB entry and 220KB supabase chunk

### App.tsx — Excellent lazy-loading coverage
All 29 page components are lazy-loaded with `React.lazy()`. Core layout components (Sidebar, ProtectedRoute, guards) are eagerly loaded which is correct.

### Concerns

1. **`html5-qrcode` (not tree-shaken):** This library is ~200KB+ gzipped and has a tendency to bundle its full camera API even when unused. It should only be imported inside the `CheckinPage` lazy chunk — verify it's not accidentally imported at a higher level.

2. **`react-grid-layout`:** Full drag-and-drop grid library (~50KB gzipped). Verify it's only imported in dashboard/report components and not leaked to main chunk.

3. **`dexie` (IndexedDB ORM):** Added as a production dependency. If it's only used in one feature (offline support), ensure it stays in a lazy chunk.

4. **`crypto-js`:** Bundled in production. If only used for hash/encoding utilities, consider native `crypto.subtle` (browser built-in) to eliminate this dependency entirely.

5. **`framer-motion` v12:** The new v12 API has good tree-shaking, but `LazyMotion` + `domAnimation` should be used instead of importing all motion components to further reduce the animation bundle.

---

## 4. React Rendering — GOOD with caveats

### EventContext.tsx

**Good:**
- `useMemo` wraps the context value correctly, preventing unnecessary consumer re-renders
- `useCallback` wraps `clearSelectedEvent`
- `setSelectedEvent`, `refreshEvents` are stable function references (defined as `async function` inside the component — they are re-created on render but not in the `useMemo` dep array which could cause stale closures)

**Issue: Stale closure risk in `useMemo` deps**

```tsx
const value = useMemo(() => ({
  ...
  selectEventById,   // ← NOT in dep array
  refreshEvents,     // ← NOT in dep array
  // eslint-disable-next-line react-hooks/exhaustive-deps
}), [selectedEvent, loading, error, allEvents, clearSelectedEvent])
```

`selectEventById` and `refreshEvents` close over `session` and `allEvents`. They are excluded from the dep array with an eslint-disable comment. This means consumers get stale function references when `session` changes between renders. This is low risk today (they re-fetch on call) but would become a bug if any memoized child calls them without triggering a re-render of the context.

**Recommendation:** Wrap both in `useCallback` with proper deps, then include them in the `useMemo` dep array.

### HomePage.tsx

- No memoization on `filteredEvents` — calls `.filter()` on every render including unrelated state updates (modal open/close, search typing). Add `useMemo`:
  ```tsx
  const filteredEvents = useMemo(() => allEvents.filter(...), [allEvents, search, filterStatus])
  ```
- `getDaysUntil`, `getStatusLabel`, `getStatusBgColor` are re-declared inside the component on every render. Move outside the component or memoize.
- `new Date().toLocaleDateString(...)` in the header re-computes on every render. Move outside or memoize.

### EventsPage.tsx

- `filteredEvents` is computed inline: `filter === 'all' ? events : events.filter(...)` — same issue as above, should be `useMemo`.
- No memoization on the event cards list — EventCard receives inline `onEdit`/`onDelete` callbacks which are new references on every render. Wrap in `useCallback` or move to `useCallback`-stabilized handlers.

---

## 5. Supabase Query Hygiene — NEEDS IMPROVEMENT

### `select('*')` overuse

Multiple queries use `select('*')` which fetches all columns:

| Location | Table | Issue |
|---|---|---|
| `EventContext.refreshEvents()` | `events` | Fetches all columns including `settings` JSONB which can be large |
| `EventsPage.fetchEvents()` | `events` | Same issue |
| `HomePage` event_types fetch | `event_types` | `select('*')` fetches unused columns |
| `selectEventById()` | `events` | `select('*')` then fetches participants count separately |

**Recommendation:** Explicitly list needed columns. The `events` table has ~20 columns including `settings` JSONB which can be several KB per row.

### Unfiltered `checklist_items` fetch

In the original EventsPage (now fixed), `checklist_items` was fetched with `.select('id, status')` — this returns all rows for the event, not a count. For events with thousands of checklist items this transfers significant data. The batch-fixed version does the same. A server-side aggregation via RPC or Postgres view would be more efficient.

### `participants` batch fetch fetches full rows

`EventContext.refreshEvents()` fetches `participants` with `.select('event_id')` — this is correct column selection. The new EventsPage fix mirrors this pattern. Good.

### `event_vendors` batch fetch

The new batch fetch uses `.select('event_id')` which is correct.

---

## Summary of Changes Made

### 1. Fixed: `src/modules/events/pages/EventsPage.tsx`
- Replaced 3N per-event queries with 3 batch queries
- Reduces DB round-trips from O(n) to O(1) as event count grows
- Matches the efficient pattern already used in EventContext

### 2. Created: `supabase/migrations/20260315000001_performance_indexes.sql`
- 11 new indexes on core tables (events, participants, schedules, checklist_items, event_vendors, push_subscriptions, user_profiles)
- All use `CREATE INDEX IF NOT EXISTS` to be idempotent

---

## Recommended Next Steps (Not Applied)

| Priority | Action | Impact |
|---|---|---|
| HIGH | Wrap `selectEventById` and `refreshEvents` in `useCallback` with correct deps | Prevents stale closure bugs |
| HIGH | Add `useMemo` to `filteredEvents` in HomePage and EventsPage | Prevents unnecessary re-renders on typing |
| MEDIUM | Replace `select('*')` on events with explicit column list | Reduces payload size, especially `settings` JSONB |
| MEDIUM | Auto-complete update in EventContext: batch with `UPDATE ... WHERE id = ANY(array)` RPC | Eliminates N mutations on load |
| MEDIUM | Audit `html5-qrcode`, `dexie`, `crypto-js` for chunk placement | Ensures heavy libs stay in lazy chunks |
| LOW | Move `getStatusLabel`, `getDaysUntil`, `getStatusBgColor` outside HomePage component | Minor render perf |
| LOW | Use `LazyMotion` + `domAnimation` for framer-motion | Reduces animation bundle ~30KB |
