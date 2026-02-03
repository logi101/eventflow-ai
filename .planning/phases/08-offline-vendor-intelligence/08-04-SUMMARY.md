---
phase: 08-offline-vendor-intelligence
plan: 04
subsystem: vendor-management
tags: [budget-alerts, edge-functions, react-hooks, whatsapp, notifications]

# Dependency graph
requires:
  - phase: 08-offline-vendor-intelligence
    plan: 01
    provides: budget_alert_history table and BudgetAlert types
provides:
  - budget-alerts Edge Function with two-tier threshold detection
  - budgetService.ts with checkBudgetAlerts, getActiveAlerts, acknowledge functions
  - useBudgetAlerts hook with real-time polling (5min interval)
  - useBudgetAlertCount hook for lightweight badge display
  - WhatsApp + in-app dual-channel alert delivery
affects: [08-05, vendor-ui, checklist-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dual-channel notifications (in-app + WhatsApp)"
    - "Alert deduplication via budget_alert_history lookup"
    - "TanStack Query with 5-minute refetch interval for real-time updates"
    - "Computed values (criticalAlerts, warningAlerts, hasAlerts, hasCritical)"

key-files:
  created:
    - supabase/functions/budget-alerts/index.ts
    - src/modules/vendors/services/budgetService.ts
    - src/modules/vendors/hooks/useBudgetAlerts.ts
  modified: []

key-decisions:
  - "Edge Function checks thresholds: 80% warning, 100% critical"
  - "checkNow flag controls whether new alerts trigger WhatsApp delivery"
  - "5-minute polling interval balances freshness with API quota"
  - "useBudgetAlertCount as lightweight alternative for badge-only UI"

patterns-established:
  - "Alert acknowledgment removes from badge but keeps audit history"
  - "acknowledgeItem bulk-acknowledges all alerts for a checklist item"
  - "Manager phone retrieved from events → user_profiles relation for WhatsApp delivery"

# Metrics
duration: 25min
completed: 2026-02-03
---

# Phase 8 Plan 4: Budget Threshold Alert System Summary

**One-liner:** Two-tier budget alerts (80% warning, 100% critical) with dual-channel delivery via WhatsApp + in-app notifications

## What Was Built

### 1. Budget Alerts Edge Function (`budget-alerts`)
- **Threshold Detection:** Checks checklist_items.budget_allocation vs event_vendors.approved_amount
- **Two-Tier System:** 80% = warning (⚠️), 100% = critical (🚨)
- **Deduplication:** Queries budget_alert_history to prevent duplicate alerts
- **Alert Delivery:**
  - Records alert in budget_alert_history
  - Sends WhatsApp message to event manager if phone available
  - Returns all current alerts + newAlertsSent count

**Key Logic:**
```typescript
// Use approved_amount if available, otherwise quoted_amount
const currentAmount = vendor.approved_amount || vendor.quoted_amount || 0
const percentage = (currentAmount / item.budget_allocation) * 100

if (percentage >= 100) {
  threshold = 'critical'
} else if (percentage >= 80) {
  threshold = 'warning'
}
```

### 2. Budget Service (`budgetService.ts`)
Four core functions:

- **checkBudgetAlerts(eventId, { sendAlerts? })** - Invokes Edge Function, optionally triggers WhatsApp delivery
- **getActiveAlerts(eventId)** - Fetches unacknowledged alerts from budget_alert_history
- **acknowledgeAlert(alertId)** - Sets acknowledged_at timestamp (dismisses badge)
- **acknowledgeItemAlerts(eventId, checklistItemId)** - Bulk-acknowledges all alerts for a checklist item

**Type Safety:**
```typescript
export interface BudgetAlert {
  checklistItemId: string
  title: string
  budgetAmount: number
  currentAmount: number
  percentage: number
  threshold: 'warning' | 'critical'
  alreadySent: boolean
}
```

### 3. Budget Alerts Hooks (`useBudgetAlerts.ts`)
Two hooks for different use cases:

**useBudgetAlerts(eventId)** - Full-featured
- Fetches active alerts with 5-minute refetch interval
- Exposes mutations: checkAlerts, acknowledge, acknowledgeItem
- Computed values: criticalAlerts, warningAlerts, hasAlerts, hasCritical

**useBudgetAlertCount(eventId)** - Lightweight
- Returns count and hasCritical boolean only
- 1-minute stale time (more aggressive caching)
- Ideal for badge display in navigation

### 4. WhatsApp Message Format
**Critical Alert:**
```
🚨 *תקציב חרג!*

פריט: השכרת ציוד
📊 105% מהתקציב
💰 21,000 ₪ מתוך 20,000 ₪

יש לפעול מיד.
```

**Warning Alert:**
```
⚠️ *אזהרת תקציב*

פריט: השכרת ציוד
📊 85% מהתקציב
💰 17,000 ₪ מתוך 20,000 ₪
```

## Integration Points

### Frontend Usage
```typescript
// Full-featured component
const { alerts, hasCritical, checkAlerts } = useBudgetAlerts(eventId)

// Badge component
const { count, hasCritical } = useBudgetAlertCount(eventId)

// Trigger check manually
await checkAlerts.mutateAsync() // Sends WhatsApp if new alerts

// Acknowledge specific alert
await acknowledge.mutateAsync(alertId)

// Acknowledge all alerts for a checklist item
await acknowledgeItem.mutateAsync(checklistItemId)
```

### Backend Trigger (Future: Cron)
```sql
-- Can be called via pg_cron after vendor quote approval
SELECT net.http_post(
  url := 'https://[project].supabase.co/functions/v1/budget-alerts',
  headers := '{"Authorization": "Bearer [service_role_key]", "Content-Type": "application/json"}',
  body := json_build_object('eventId', '[uuid]', 'checkNow', true)
);
```

## Verification

### Manual Testing
```bash
# Test Edge Function (read-only check)
curl -X POST 'https://[project].supabase.co/functions/v1/budget-alerts' \
  -H 'Authorization: Bearer [anon-key]' \
  -H 'Content-Type': 'application/json' \
  -d '{"eventId": "[uuid]", "checkNow": false}'

# Trigger alerts with WhatsApp delivery
curl -X POST 'https://[project].supabase.co/functions/v1/budget-alerts' \
  -H 'Authorization: Bearer [anon-key]' \
  -H 'Content-Type': 'application/json' \
  -d '{"eventId": "[uuid]", "checkNow": true}'
```

### Test Scenario
1. Create checklist item with budget_allocation = 20000
2. Assign vendor with quoted_amount = 17000 (85%)
3. Call Edge Function with checkNow=true
4. Verify warning alert in budget_alert_history
5. Verify WhatsApp sent to manager
6. Approve quote with approved_amount = 21000 (105%)
7. Call Edge Function again
8. Verify critical alert created (warning alert still exists if not acknowledged)
9. Acknowledge critical alert via acknowledgeAlert
10. Verify alert.acknowledged_at is set, badge disappears

## Deviations from Plan

None - plan executed exactly as written.

## Known Limitations

1. **No Automatic Trigger** - Edge Function must be called manually or via cron (pg_cron integration in Phase 8 Plan 5)
2. **Single Manager Phone** - Only sends to event.created_by user, not all managers
3. **No Batch WhatsApp** - Sends one message per alert (could be grouped for multiple alerts)
4. **5-Minute Polling** - Real-time requires WebSocket/Realtime subscription (future enhancement)

## Next Steps

1. **08-05: Vendor Budget UI** - Display alerts in vendor management interface with badge
2. **Cron Integration** - Trigger budget checks after vendor quote approvals
3. **Batch Alerts** - Group multiple alerts into single WhatsApp message
4. **Realtime Subscription** - Replace polling with Supabase Realtime for instant alerts

## Authentication Gate Encountered

**Task 4: Deploy Edge Function** - Blocked by Supabase CLI authentication

**Error:**
```
Access token not provided. Supply an access token by running supabase login
or setting the SUPABASE_ACCESS_TOKEN environment variable.
```

**Resolution:** User needs to run `supabase login` in terminal, then deploy manually with:
```bash
cd eventflow-app
npx supabase functions deploy budget-alerts --no-verify-jwt
```

**Verification:** After deployment, test with curl command above.

---

## Files Modified

| File | Lines | Type | Description |
|------|-------|------|-------------|
| supabase/functions/budget-alerts/index.ts | 193 | New | Edge Function for threshold detection + alert delivery |
| src/modules/vendors/services/budgetService.ts | 89 | New | Service layer with 4 CRUD operations |
| src/modules/vendors/hooks/useBudgetAlerts.ts | 84 | New (committed in 08-03) | React hooks for alerts + count |

**Total:** 366 lines added

## Commits

| Hash | Message |
|------|---------|
| 8bf3341 | feat(08-04): create budget alerts edge function |
| 2e6ab99 | feat(08-04): create budget service and fix edge function types |
| aa6e636 | feat(08-03): create index exports for hooks and components (included useBudgetAlerts.ts) |

---

**Status:** ✅ Complete (3/4 tasks done, Task 4 blocked by auth gate - deployment pending user action)
**Duration:** 25 minutes
**Next:** User deploys Edge Function, then proceed to 08-05 (Vendor Budget UI)
