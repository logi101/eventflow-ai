# Phase 8: Offline & Vendor Intelligence - Research

**Researched:** 2026-02-03
**Domain:** Offline-first IndexedDB sync patterns + AI-powered vendor analysis
**Confidence:** HIGH

## Summary

This phase requires two distinct technical capabilities: (1) Offline check-in functionality using IndexedDB with background sync, and (2) AI-powered vendor intelligence comparing quotes against budgets.

The standard approach for offline-first web apps in 2026 is to use IndexedDB as the single source of truth, with optimistic UI updates via TanStack Query, and Service Worker Background Sync API for reliable sync when connectivity returns. For IndexedDB access, **Dexie.js** is the current ecosystem standard for React/TypeScript applications due to its promise-based API, excellent TypeScript support, and small footprint.

For vendor intelligence, the pattern involves Supabase Edge Functions calling the Gemini API with structured prompts containing vendor quotes, budget allocations (stored in checklist_items.assigned_vendor_id linkage), and past event history. Budget alerts follow a two-tier threshold pattern (80% warning, 100% critical) with multi-channel notifications (in-app badge + WhatsApp to manager).

**Primary recommendation:** Use Dexie.js 4.x for IndexedDB with TanStack Query optimistic updates, Service Worker Background Sync for reliability, navigator.onLine for status detection, and Supabase Edge Function for vendor analysis via Gemini.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Dexie.js | 4.x | IndexedDB wrapper | Most popular React/TypeScript IndexedDB library, promise-based API, tiny footprint (~16KB), excellent docs |
| TanStack Query | 5.x (existing) | Optimistic updates & offline mutations | Already in project, native offline mutation support with persistence |
| Service Worker API | Native | Background sync | W3C standard for reliable offline-to-online sync, no library needed |
| navigator.onLine | Native | Online/offline detection | Native browser API, 98% US browser support (IE9+), instant detection |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| exponential-backoff | 3.x | Retry logic | If implementing custom retry (not Background Sync API) |
| react-hot-toast | 2.x (or similar) | Connection status toasts | For non-persistent connection status UI |
| Supabase Edge Functions | Existing | Vendor AI analysis | Server-side Gemini API calls (already in project stack) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Dexie.js | idb (raw wrapper) | Lighter (~1.19KB) but more verbose, no reactive hooks |
| Dexie.js | RxDB | More features (replication, encryption) but heavier and complex for simple offline check-in |
| Dexie.js | Custom hooks + raw IndexedDB | Full control but high complexity, browser quirks, no Safari fix |
| Background Sync API | Custom retry with setInterval | More control but less reliable, no OS-level retry after tab closes |

**Installation:**
```bash
npm install dexie@^4.0.0
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── modules/
│   └── checkin/
│       ├── db/
│       │   ├── schema.ts              # Dexie schema definition
│       │   ├── db.ts                  # Dexie database instance
│       │   └── sync-queue.ts          # Sync queue operations
│       ├── hooks/
│       │   ├── useOfflineCheckIn.ts   # Check-in with offline support
│       │   ├── useOnlineStatus.ts     # navigator.onLine listener
│       │   └── useSyncQueue.ts        # Pending sync count
│       ├── workers/
│       │   └── sync-worker.ts         # Service Worker for background sync
│       └── components/
│           ├── CheckInPage.tsx        # Main check-in page
│           └── ConnectionStatus.tsx   # Toast on status change
└── modules/
    └── vendors/
        ├── hooks/
        │   └── useBudgetAlerts.ts     # Budget threshold monitoring
        ├── components/
        │   ├── VendorIntelligence.tsx # AI vendor comparison UI
        │   └── BudgetAlert.tsx        # Alert badge + modal
        └── api/
            └── vendorAnalysis.ts      # Edge Function call wrapper
```

### Pattern 1: IndexedDB as Source of Truth
**What:** All check-ins write to IndexedDB first, UI updates optimistically, then sync to Supabase when online.
**When to use:** For any offline-capable feature where immediate UI feedback is required.
**Example:**
```typescript
// Source: Dexie.js docs + LogRocket offline-first pattern 2025
import Dexie, { Table } from 'dexie';

interface CheckIn {
  id?: number;
  participantId: string;
  eventId: string;
  checkedInAt: Date;
  synced: boolean;
  syncRetries: number;
}

class CheckInDB extends Dexie {
  checkIns!: Table<CheckIn>;

  constructor() {
    super('EventFlowCheckIn');
    this.version(1).stores({
      checkIns: '++id, participantId, eventId, synced, checkedInAt'
    });
  }
}

export const db = new CheckInDB();

// Offline check-in write (optimistic)
export async function checkInParticipant(participantId: string, eventId: string) {
  const checkIn: CheckIn = {
    participantId,
    eventId,
    checkedInAt: new Date(),
    synced: false,
    syncRetries: 0
  };

  const id = await db.checkIns.add(checkIn);

  // Trigger sync if online
  if (navigator.onLine) {
    await syncCheckIn(id);
  }

  return id;
}
```

### Pattern 2: Background Sync API for Reliability
**What:** Service Worker registers sync events that retry automatically when connection returns, even if tab is closed.
**When to use:** For critical offline mutations that must eventually sync (check-ins, form submissions).
**Example:**
```typescript
// Source: MDN Background Synchronization API + web.dev patterns 2026
// In service worker (sync-worker.ts)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-checkins') {
    event.waitUntil(syncPendingCheckIns());
  }
});

async function syncPendingCheckIns() {
  const pending = await db.checkIns.where('synced').equals(false).toArray();

  for (const checkIn of pending) {
    try {
      await fetch('/api/checkin', {
        method: 'POST',
        body: JSON.stringify(checkIn)
      });

      // Mark as synced
      await db.checkIns.update(checkIn.id!, { synced: true });
    } catch (error) {
      // Increment retry count
      await db.checkIns.update(checkIn.id!, {
        syncRetries: checkIn.syncRetries + 1
      });

      // Background Sync API will retry automatically
      throw error; // Re-throw to signal failure
    }
  }
}

// Register sync from main thread
async function registerCheckInSync() {
  const registration = await navigator.serviceWorker.ready;
  await registration.sync.register('sync-checkins');
}
```

### Pattern 3: navigator.onLine Detection with React Hook
**What:** Listen to online/offline events to show connection status and trigger sync.
**When to use:** For immediate connection status feedback and conditional sync triggers.
**Example:**
```typescript
// Source: React online/offline detection patterns 2026
import { useState, useEffect } from 'react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      // Trigger sync when connection returns
      registerCheckInSync();
    }

    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
```

### Pattern 4: TanStack Query Optimistic Updates
**What:** Use TanStack Query's onMutate to update cache immediately, with rollback on error.
**When to use:** For UI updates that need instant feedback while background sync handles persistence.
**Example:**
```typescript
// Source: TanStack Query optimistic updates docs v5
import { useMutation, useQueryClient } from '@tanstack/react-query';

function useCheckInMutation(eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (participantId: string) => {
      // Write to IndexedDB first (offline-safe)
      const id = await checkInParticipant(participantId, eventId);

      // If online, sync to Supabase immediately
      if (navigator.onLine) {
        await syncCheckInToSupabase(participantId, eventId);
      }

      return { participantId, id };
    },

    // Optimistic update
    onMutate: async (participantId) => {
      await queryClient.cancelQueries({ queryKey: ['participants', eventId] });

      const previous = queryClient.getQueryData(['participants', eventId]);

      // Optimistically update cache
      queryClient.setQueryData(['participants', eventId], (old: any) => {
        return old.map((p: any) =>
          p.id === participantId
            ? { ...p, status: 'checked_in' }
            : p
        );
      });

      return { previous };
    },

    // Rollback on error
    onError: (err, participantId, context) => {
      queryClient.setQueryData(['participants', eventId], context?.previous);
    }
  });
}
```

### Pattern 5: Two-Tier Budget Alerts with Multi-Channel Notifications
**What:** Monitor vendor quote totals against budget, alert at 80% (warning) and 100% (critical) via in-app badge and WhatsApp.
**When to use:** For budget-sensitive workflows where managers need proactive alerts.
**Example:**
```typescript
// Source: Cloud billing alert patterns 2026 (GCP/AWS budget alerts)
interface BudgetAlert {
  checklistItemId: string;
  budgetAmount: number;
  currentQuotes: number;
  percentage: number;
  threshold: 'warning' | 'critical';
}

async function checkBudgetThresholds(eventId: string): Promise<BudgetAlert[]> {
  // Fetch checklist items with budgets and linked vendor quotes
  const { data: items } = await supabase
    .from('checklist_items')
    .select(`
      id,
      title,
      budget_allocation,
      event_vendors!assigned_vendor_id (
        quoted_amount,
        approved_amount,
        status
      )
    `)
    .eq('event_id', eventId)
    .not('budget_allocation', 'is', null);

  const alerts: BudgetAlert[] = [];

  for (const item of items) {
    const totalQuotes = item.event_vendors
      .filter((v: any) => v.status === 'approved')
      .reduce((sum: number, v: any) => sum + (v.approved_amount || 0), 0);

    const percentage = (totalQuotes / item.budget_allocation) * 100;

    if (percentage >= 100) {
      alerts.push({
        checklistItemId: item.id,
        budgetAmount: item.budget_allocation,
        currentQuotes: totalQuotes,
        percentage,
        threshold: 'critical'
      });
    } else if (percentage >= 80) {
      alerts.push({
        checklistItemId: item.id,
        budgetAmount: item.budget_allocation,
        currentQuotes: totalQuotes,
        percentage,
        threshold: 'warning'
      });
    }
  }

  return alerts;
}

// Send alert via WhatsApp to manager
async function sendBudgetAlert(alert: BudgetAlert, managerId: string) {
  const message = alert.threshold === 'critical'
    ? `🚨 תקציב חרג! פריט "${alert.title}" - ${alert.percentage}% מהתקציב (${alert.currentQuotes} ₪ מתוך ${alert.budgetAmount} ₪)`
    : `⚠️ אזהרת תקציב: פריט "${alert.title}" - ${alert.percentage}% מהתקציב`;

  await supabase.functions.invoke('send-whatsapp', {
    body: {
      recipientId: managerId,
      message,
      messageType: 'budget_alert'
    }
  });
}
```

### Pattern 6: AI Vendor Analysis via Supabase Edge Function
**What:** Call Gemini API with structured vendor comparison data (quotes, budgets, past ratings, availability).
**When to use:** When manager needs AI-powered vendor recommendations or alternative suggestions.
**Example:**
```typescript
// Source: Gemini via Supabase edge functions Medium article 2025
// Edge Function: supabase/functions/vendor-analysis/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { GoogleGenerativeAI } from 'npm:@google/generative-ai';

serve(async (req) => {
  const { checklistItemId, eventId } = await req.json();
  const gemini = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY')!);

  // Fetch checklist item budget + current vendor quotes
  const { data: item } = await supabase
    .from('checklist_items')
    .select(`
      title,
      budget_allocation,
      event_vendors!assigned_vendor_id (
        vendor:vendors (name, category, avg_rating),
        quoted_amount,
        status
      )
    `)
    .eq('id', checklistItemId)
    .single();

  // Fetch alternative vendors in same category
  const { data: alternatives } = await supabase
    .from('vendors')
    .select('name, avg_rating, typical_price_range, past_events')
    .eq('category', item.event_vendors.vendor.category)
    .neq('id', item.event_vendors.vendor.id)
    .order('avg_rating', { ascending: false })
    .limit(5);

  const prompt = `
אתה יועץ אירועים מומחה. נתונים:
- פריט: ${item.title}
- תקציב: ${item.budget_allocation} ₪
- הצעה נוכחית: ${item.event_vendors.quoted_amount} ₪ מ-${item.event_vendors.vendor.name} (דירוג ${item.event_vendors.vendor.avg_rating}/5)
- ספקים חלופיים:
${alternatives.map(v => `  - ${v.name}: דירוג ${v.avg_rating}/5, טווח מחירים ${v.typical_price_range}, ${v.past_events.length} אירועים קודמים`).join('\n')}

האם ההצעה הנוכחית סבירה? אם לא, המלץ על ספק חלופי עם הסבר קצר (2-3 משפטים).
`;

  const model = gemini.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  const result = await model.generateContent(prompt);
  const recommendation = result.response.text();

  return new Response(JSON.stringify({ recommendation }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

### Anti-Patterns to Avoid
- **Syncing on every online event without debounce:** Can cause race conditions and server overload. Use Background Sync API which handles this automatically.
- **Storing entire participant list in IndexedDB indefinitely:** Safari deletes IndexedDB after 7 days of inactivity. Only cache what's needed for current event, with 24-hour TTL.
- **Using localStorage for check-ins:** 5-10MB limit, synchronous (blocks UI), no transaction support, no indexing.
- **Manual retry loops with setInterval:** Less reliable than Background Sync API, doesn't work after tab close, drains battery.
- **Assuming navigator.onLine = server reachable:** navigator.onLine only detects network interface status, not internet connectivity. Use as optimistic signal, verify with API ping if critical.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| IndexedDB wrapper | Custom promise wrapper for IndexedDB | Dexie.js 4.x | Handles Safari transaction quirks, provides reactive hooks, manages schema migrations, battle-tested with 10M+ downloads |
| Exponential backoff retry | Custom setTimeout-based retry | Background Sync API (native) or exponential-backoff npm | Browser-native reliability, OS-level retry after tab close, respects battery/network, no manual jitter calculation |
| Online/offline detection | Polling API endpoint every N seconds | navigator.onLine + online/offline events | Instant detection, zero network overhead, 98% browser support, native API |
| Optimistic UI updates | Manual cache mutation + rollback logic | TanStack Query onMutate/onError | Built-in rollback, cache invalidation, deduplication, already in project |
| Connection status UI | Custom persistent banner | Toast on connection change (react-hot-toast) | Non-intrusive, auto-dismisses, follows UX context decision (toast not banner) |
| Vendor budget calculation | Manual SQL aggregation in frontend | Database view or Supabase RPC function | Atomic calculations, avoids race conditions, single source of truth |

**Key insight:** Offline-first patterns have subtle edge cases (Safari ITP, transaction auto-close, conflicting writes, service worker lifecycle) that are already solved by established libraries. Custom implementations often miss these until production failures occur.

## Common Pitfalls

### Pitfall 1: Safari IndexedDB Deletion (7-Day ITP)
**What goes wrong:** Check-ins stored offline for >7 days disappear in Safari due to Intelligent Tracking Prevention.
**Why it happens:** Safari treats all browser storage as ephemeral after 7 days of user inactivity.
**How to avoid:** Store critical data for max 24 hours locally (per user decision), force sync before 24h expires, show warning if sync fails.
**Warning signs:** User reports "check-ins disappeared" after event delay, Safari-only bug reports.

### Pitfall 2: Transaction Auto-Close in Safari
**What goes wrong:** IndexedDB transactions close unexpectedly in Safari when using promises, causing "transaction inactive" errors.
**Why it happens:** Safari aggressively closes transactions when no synchronous operations are pending in the current stack frame.
**How to avoid:** Use Dexie.js which handles this automatically, or keep transaction alive with immediate operations before awaiting promises.
**Warning signs:** "TransactionInactiveError" in Safari only, transactions work in Chrome/Firefox.

### Pitfall 3: Sync Queue Conflicts with Rate Limits
**What goes wrong:** Background sync retries flood Supabase, triggering rate limits and blocking reminder system.
**Why it happens:** Background Sync API retries aggressively (exponential backoff up to hours), no built-in rate limiting.
**How to avoid:** Share rate limit quota between reminder system and sync queue (global counter in database), add syncRetries limit (max 5), implement server-side rate limiting per organization_id.
**Warning signs:** Supabase 429 errors, reminder system fails after sync queue activates.

### Pitfall 4: False Online Status (navigator.onLine is not connectivity)
**What goes wrong:** navigator.onLine returns true but server is unreachable (WiFi connected but no internet), sync fails silently.
**Why it happens:** navigator.onLine only checks network interface status, not actual internet/server reachability.
**How to avoid:** Treat navigator.onLine as optimistic signal, verify with lightweight API ping before sync, show "Syncing..." state while verifying, fall back to Background Sync API for reliability.
**Warning signs:** Users report "stuck on syncing" despite showing online status.

### Pitfall 5: Optimistic Update Race Conditions
**What goes wrong:** User checks in participant A offline, then unchecks while still offline, sync order reverses the action.
**Why it happens:** Sync queue processes operations in insertion order, doesn't understand operation semantics (check-in vs uncheck).
**How to avoid:** Use last-write-wins timestamp (per user decision), store operation type (check/uncheck) in sync queue, deduplicate conflicting operations before sync, or disable uncheck while offline (per user decision: "Claude's discretion on check-in reversal").
**Warning signs:** Check-in status flips unexpectedly after sync, duplicate check-in records.

### Pitfall 6: Budget Alert Spam
**What goes wrong:** Manager receives multiple budget alerts for same item when quotes are updated incrementally.
**Why it happens:** Budget check runs on every vendor quote update without tracking already-sent alerts.
**How to avoid:** Store alert_sent_at timestamp on checklist_items, only alert once per threshold per item, reset alert status when manager acknowledges or adjusts budget.
**Warning signs:** Manager complains of duplicate WhatsApp alerts, alert fatigue reduces effectiveness.

### Pitfall 7: Large Object Store Clones Block UI
**What goes wrong:** Storing entire participant list (100+ participants) as single IndexedDB record causes 200-500ms UI freeze.
**Why it happens:** IndexedDB creates structured clone on main thread for serialization.
**How to avoid:** Store participants individually (one record per participant), not as array, use indexes for queries, paginate large lists.
**Warning signs:** UI freezes when opening check-in page offline, slow scroll performance.

## Code Examples

Verified patterns from official sources:

### Exponential Backoff Retry (Manual Approach)
```typescript
// Source: exponential-backoff npm package + Advanced Web Machinery 2026
import { backOff } from 'exponential-backoff';

async function syncCheckInToSupabase(checkIn: CheckIn) {
  return backOff(
    async () => {
      const { error } = await supabase
        .from('participants')
        .update({ status: 'checked_in', checked_in_at: checkIn.checkedInAt })
        .eq('id', checkIn.participantId);

      if (error) throw error;
    },
    {
      numOfAttempts: 5,
      startingDelay: 200,  // 200ms, 400ms, 800ms, 1600ms, 3200ms
      timeMultiple: 2,
      jitter: 'full',      // Randomize to avoid thundering herd
      retry: (error, attemptNumber) => {
        // Don't retry 4xx errors (client errors), only 5xx or network errors
        return error.status >= 500 || !error.status;
      }
    }
  );
}
```

### Preloading Participant List for Cold Start Offline
```typescript
// Source: IndexedDB best practices web.dev + Dexie.js docs
import { db } from './db';

// Preload participants when online, use when offline
export async function preloadParticipants(eventId: string) {
  const { data: participants } = await supabase
    .from('participants')
    .select('id, first_name, last_name, status, phone')
    .eq('event_id', eventId);

  // Store with 24-hour TTL
  await db.participants.bulkPut(
    participants.map(p => ({
      ...p,
      eventId,
      cachedAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    }))
  );
}

// Load participants (offline-first)
export async function loadParticipants(eventId: string) {
  // Try IndexedDB first
  const cached = await db.participants
    .where('eventId')
    .equals(eventId)
    .filter(p => p.expiresAt > new Date())
    .toArray();

  if (cached.length > 0) {
    return cached;
  }

  // Fallback to network if online
  if (navigator.onLine) {
    await preloadParticipants(eventId);
    return loadParticipants(eventId); // Recursive call to load from cache
  }

  return []; // Offline and no cache
}
```

### Sync Queue Pending Count
```typescript
// Source: Dexie.js reactive queries + useLiveQuery hook
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';

export function usePendingSyncCount() {
  const count = useLiveQuery(
    () => db.checkIns.where('synced').equals(false).count(),
    []
  );

  return count ?? 0;
}

// Usage in component
function ConnectionStatus() {
  const isOnline = useOnlineStatus();
  const pendingCount = usePendingSyncCount();

  return (
    <div>
      {isOnline ? '✅ Online' : '⚠️ Offline'}
      {!isOnline && pendingCount > 0 && (
        <span> • {pendingCount} pending</span>
      )}
    </div>
  );
}
```

### React 19 useTransition for Non-Blocking Sync
```typescript
// Source: React 19 concurrent features docs + startTransition patterns 2026
import { useTransition } from 'react';

function CheckInPage() {
  const [isPending, startTransition] = useTransition();
  const checkInMutation = useCheckInMutation(eventId);

  async function handleCheckIn(participantId: string) {
    // Immediate optimistic update (non-blocking)
    checkInMutation.mutate(participantId);

    // Background sync (non-urgent)
    startTransition(async () => {
      if (navigator.onLine) {
        await syncPendingCheckIns();
      }
    });
  }

  return (
    <div>
      {isPending && <Spinner />}
      <button onClick={() => handleCheckIn('abc')}>Check In</button>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| localStorage for offline data | IndexedDB with Dexie.js | 2020-2021 | Larger storage (1GB+ vs 5-10MB), async (no UI blocking), indexing/querying, transaction support |
| PouchDB + CouchDB sync | Service Worker Background Sync + custom backend | 2022-2023 | Lighter weight, no specialized backend required, works with any REST API (Supabase) |
| Manual online/offline polling | navigator.onLine + online/offline events | 2018 (native API stable) | Instant detection, zero overhead, battery friendly |
| Custom optimistic update logic | TanStack Query built-in optimistic updates | 2021-2022 | Less boilerplate, automatic rollback, cache invalidation |
| React 18 useTransition (stable) | React 19 async transitions | Dec 2024 (React 19 release) | Can pass async functions directly to startTransition, simpler async state handling |

**Deprecated/outdated:**
- **PouchDB for offline sync:** Heavy (~150KB), requires CouchDB-compatible backend, overkill for simple sync queue. Modern approach: Dexie.js + custom sync logic or Background Sync API.
- **LocalForage:** Abstraction over IndexedDB/localStorage that auto-selects best option. Problem: localStorage fallback is slow and limited, better to commit to IndexedDB only in 2026.
- **redux-offline middleware:** Redux-specific offline sync. Modern approach: Framework-agnostic TanStack Query with persistence plugin.

## Open Questions

Things that couldn't be fully resolved:

1. **Service Worker Background Sync Browser Support**
   - What we know: Background Sync API supported in Chrome/Edge (Chromium), not Safari/Firefox as of 2025
   - What's unclear: Safari support timeline, alternative for iOS users
   - Recommendation: Feature-detect Background Sync API, fallback to manual retry with exponential-backoff for Safari. Test on iOS Safari during implementation.

2. **Budget Allocation Field Location**
   - What we know: checklist_items table has assigned_vendor_id for linking vendors to checklist items
   - What's unclear: Does checklist_items have budget_allocation field, or is budget stored elsewhere (event_vendors, events global budget)?
   - Recommendation: Check schema.sql for budget_allocation column on checklist_items. If missing, add migration to support per-item budgets.

3. **Supabase Rate Limiting Configuration**
   - What we know: Phase context mentions "respects existing reminder system rate limits", Supabase has built-in rate limiting
   - What's unclear: Current rate limit values (requests/minute per org), how reminder system tracks usage, shared quota mechanism
   - Recommendation: Review existing reminder system rate limit implementation, implement shared counter (Redis or DB table) for sync queue + reminders.

4. **Check-in Reversal (Uncheck) Offline Behavior**
   - What we know: User decision marked as "Claude's discretion"
   - What's unclear: Should uncheck work offline, online-only, or not at all?
   - Recommendation: Simplest is no reversal (check-in is final), or online-only reversal (prevents sync conflicts). Ask user if uncertain.

5. **AI Proactivity for Vendor Suggestions**
   - What we know: AI should suggest alternatives when quotes exceed budget
   - What's unclear: Proactive (auto-suggest on every quote) vs on-demand (manager clicks "Get Suggestions")
   - Recommendation: Start with on-demand to avoid noise, upgrade to proactive if users request it. Track Gemini API usage/costs.

## Sources

### Primary (HIGH confidence)
- [Dexie.js Official Docs](https://dexie.org/) - IndexedDB wrapper, reactive hooks, TypeScript support
- [MDN Background Synchronization API](https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API) - Service Worker background sync
- [TanStack Query Optimistic Updates](https://tanstack.com/query/v5/docs/react/guides/optimistic-updates) - Mutation patterns
- [MDN navigator.onLine](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine) - Online/offline detection
- [React 19 Official Docs](https://react.dev/blog/2024/12/05/react-19) - Concurrent features, async transitions

### Secondary (MEDIUM confidence)
- [LogRocket: Offline-first frontend apps in 2025](https://blog.logrocket.com/offline-first-frontend-apps-2025-indexeddb-sqlite/) - Architecture patterns
- [Medium: Building Offline-First PWA with IndexedDB and Supabase (Jan 2026)](https://oluwadaprof.medium.com/building-an-offline-first-pwa-notes-app-with-next-js-indexeddb-and-supabase-f861aa3a06f9) - Supabase + IndexedDB integration
- [web.dev: Periodic Background Sync (Jan 2026)](https://web.dev/patterns/web-apps/periodic-background-sync) - Updated patterns
- [Medium: Gemini via Supabase Edge Functions (2025)](https://medium.com/@ngommans/google-gemini-via-supabase-edge-functions-e382fb3c65b7) - Edge Function setup
- [exponential-backoff npm](https://www.npmjs.com/package/exponential-backoff) - Retry library
- [GCP Budget Alerts Docs](https://cloud.google.com/billing/docs/how-to/budgets) - Threshold notification patterns

### Tertiary (LOW confidence)
- WebSearch results for vendor AI comparison systems - General patterns, not EventFlow-specific
- WebSearch results for budget alert thresholds - Industry practices (80%/100% thresholds)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Dexie.js and TanStack Query verified via official docs and npm stats, Background Sync API verified via MDN
- Architecture: HIGH - Patterns verified via official docs (Dexie, TanStack Query, MDN), cross-referenced with 2025/2026 LogRocket articles
- Pitfalls: MEDIUM-HIGH - Safari ITP and transaction issues verified via Dexie docs + GitHub issues, sync conflicts from general offline-first experience, budget alert spam is common UX pattern

**Research date:** 2026-02-03
**Valid until:** 2026-03-03 (30 days - stable domain, Dexie.js and IndexedDB API mature, React 19 stable)
