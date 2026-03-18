# EventFlow UI/UX Audit Report

**Date:** 2026-03-15
**Auditor:** Frontend Specialist Agent
**Score:** 88/100

---

## Executive Summary

A button-by-button, screen-by-screen audit of all UI elements across the EventFlow application. 8 bugs were found and 7 were fixed. 1 remaining item is a design decision that requires product clarity.

---

## Files Audited

| File | Status |
|------|--------|
| `src/pages/home/HomePage.tsx` | Fixed 2 bugs |
| `src/pages/events/EventsPage.tsx` | Pass |
| `src/pages/events/EventDetailPage.tsx` | Pass |
| `src/pages/events/components/EventDetailHeader.tsx` | Fixed 1 bug |
| `src/pages/events/components/EventOverviewTab.tsx` | Pass |
| `src/pages/event/EventDashboardPage.tsx` | Pass |
| `src/pages/dashboard/DashboardPage.tsx` | Fixed 4 bugs |
| `src/pages/rsvp/PublicRsvpPage.tsx` | Pass |
| `src/pages/auth/Login.tsx` | Pass |
| `src/pages/auth/ForgotPassword.tsx` | Pass |
| `src/pages/auth/ResetPassword.tsx` | Pass |
| `src/pages/messages/MessagesPage.tsx` | Pass |
| `src/modules/events/components/EventCard.tsx` | Fixed 1 bug |
| `src/modules/events/components/EventForm.tsx` | Pass |
| `src/modules/events/components/EventSettingsPanel.tsx` | Pass |
| `src/components/layout/Sidebar.tsx` | Pass |
| `src/components/shared/ConfirmationPopup.tsx` | Pass |
| `src/App.tsx` | Fixed 1 bug |

---

## Bugs Found & Fixed

### BUG-1 (FIXED): Invalid Tailwind class in EventCard
**File:** `src/modules/events/components/EventCard.tsx` — line 98
**Issue:** `hover:bg-red-500/100/10` is a malformed Tailwind class with a double slash. This class does not resolve to any CSS and the hover state on the delete button is invisible.
**Fix:** Changed to `hover:bg-red-500/10`.

---

### BUG-2 (FIXED): Archive button labeled "מחק" (Delete) in HomePage
**File:** `src/pages/home/HomePage.tsx` — line 502
**Issue:** The Archive button displayed "מחק" (Hebrew for "Delete"), which is misleading. The action archives the event; it does not delete it. Users may be confused or scared to use it.
**Fix:** Changed button label to "ארכיון" and changed hover color from red (`hover:bg-red-50`) to orange (`hover:bg-orange-50`) to remove the destructive visual implication.

---

### BUG-3 (FIXED): Incorrect count label in HomePage header
**File:** `src/pages/home/HomePage.tsx` — line 311
**Issue:** Header displayed `X אירועים פעילים` (X active events) but the count actually includes draft, planning, completed — all non-archived events. This is inaccurate.
**Fix:** Changed label to `X אירועים` (X events).

---

### BUG-4 (FIXED): DashboardPage EventDashboard — stats cards link to wrong routes
**File:** `src/pages/dashboard/DashboardPage.tsx` — lines 329, 354, 375
**Issue:** Three stats cards used legacy route paths:
- Participants card: `to="/guests"` → should be `/event/guests`
- Checklist card: `to="/checklist"` → should be `/event/checklist`
- Messages card: `to="/messages"` → should be `/event/messages`

These links all redirected to `HomePage` instead of the actual target pages.
**Fix:** Updated all three links to use the correct `/event/*` prefixed routes.

---

### BUG-5 (FIXED): DashboardPage EventDashboard — "הצג הכל" schedule link broken
**File:** `src/pages/dashboard/DashboardPage.tsx` — line 410
**Issue:** The "הצג הכל" link in the upcoming schedule section pointed to `/schedules` (a legacy route that redirected to HomePage).
**Fix:** Changed to `/event/schedule`.

---

### BUG-6 (FIXED): DashboardPage EventDashboard — "הצג הכל" messages link broken
**File:** `src/pages/dashboard/DashboardPage.tsx` — line 465
**Issue:** The "הצג הכל" link in the recent activity section pointed to `/messages` (a legacy route that redirected to HomePage).
**Fix:** Changed to `/event/messages`.

---

### BUG-7 (FIXED): Legacy routes in App.tsx redirect to HomePage instead of proper destinations
**File:** `src/App.tsx` — lines 139-148
**Issue:** All legacy routes (`/guests`, `/schedules`, `/program`, `/vendors`, `/checklist`, `/messages`, `/feedback`, `/checkin`, `/reports`) rendered `<HomePage />`. This means any deep-link or navigation to these paths silently showed the wrong page with no feedback. Users clicking "הצג הכל" from DashboardPage would land on the home screen instead of the intended page.
**Fix:** Changed all legacy routes to `<Navigate to="/event/..." replace />` so they redirect to the correct event-scoped routes.

---

### BUG-8 (FIXED): EventDetailHeader — duplicate Zap icon on "rooms" and "settings" tabs
**File:** `src/pages/events/components/EventDetailHeader.tsx` — lines 18-21
**Issue:** Both the "חדרים ולינה" (rooms) tab and the "הגדרות תזכורות" (settings) tab used the same `Zap` icon, making them visually indistinguishable.
**Fix:** Changed rooms tab to use `Hotel` icon (semantically appropriate) and settings tab to use `Settings` icon.

---

## Events-Not-Showing Bug Analysis

### Status Filter Behavior
- `filterStatus === 'all'` correctly excludes `archived` events from the default view (by design — archived events are hidden unless explicitly filtered)
- The `archived` filter correctly shows ONLY archived events
- There is no bug here — the behavior is intentional

### When "No Events" Empty State Shows vs Real Bug
The empty state shows when:
1. `filteredEvents.length === 0` — correct
2. If `search` or `filterStatus !== 'all'` is active, the message says "לא נמצאו אירועים" with hint to change filters
3. If neither search nor filter, the message says "אין אירועים עדיין" with create CTA

This is working correctly. If a user sees "no events" on the default view, they either have no non-archived events, or their events failed to load (check `allEvents` from `EventContext`).

### Event Selector/Dropdown in Header
The Sidebar shows the `selectedEvent` card. All events from `allEvents` are accessible via the home page `/`. The `allEvents` context loads all events including archived ones — the sidebar event card correctly renders for all statuses.

---

## Remaining Issues (Not Fixed — Product Decision Required)

### INFO-1: `/settings` route renders DashboardPage
**File:** `src/App.tsx` — line 120
**Observation:** The Sidebar has a "הגדרות" (Settings) link that navigates to `/settings`, which renders `DashboardPage`. This appears intentional since there is no dedicated `SettingsPage.tsx` component. However it is semantically confusing — clicking "Settings" lands on the dashboard.
**Recommendation:** Either create a dedicated settings page or rename the sidebar link to "לוח בקרה" (Dashboard).

---

## What Was Verified As Correct

- **All form submissions** have proper `onSubmit` handlers with `e.preventDefault()`
- **All modals** have open/close state handlers and backdrop click support
- **Loading states** are shown throughout (Loader2 spinners)
- **Error states** are displayed to users via toast notifications
- **Empty states** are shown for all list views
- **Disabled states** are correctly applied on save buttons during submission
- **Authentication flow** correctly redirects unauthenticated users
- **RSVP page** has proper form validation via Zod + react-hook-form
- **Keyboard accessibility** on event cards (onKeyDown handler for Enter/Space)
- **ARIA attributes** on modals, forms, and interactive elements
- **Error boundaries** wrap the entire app
- **Lazy loading** is implemented for all heavy pages

---

## Score Breakdown

| Category | Score | Notes |
|----------|-------|-------|
| Button interactions | 18/20 | Archive button mislabeled (fixed) |
| Form validation & submission | 20/20 | All forms validated |
| Modal open/close | 10/10 | All modals correct |
| Route correctness | 15/20 | 5 broken links fixed; /settings ambiguous |
| Loading states | 10/10 | All loading states present |
| Error states | 10/10 | All errors surfaced to users |
| Empty states | 10/10 | All empty states present |
| Accessibility | 5/10 | Basic ARIA done; missing focus trap in modals, skip links |

**Total: 88/100**

---

## Summary of All Fixes Applied

1. `EventCard.tsx` — Fixed malformed Tailwind class `hover:bg-red-500/100/10` → `hover:bg-red-500/10`
2. `HomePage.tsx` — Archive button label changed from "מחק" to "ארכיון"; hover color changed from red to orange
3. `HomePage.tsx` — Header count label changed from "אירועים פעילים" to "אירועים"
4. `DashboardPage.tsx` — Participants stat card link: `/guests` → `/event/guests`
5. `DashboardPage.tsx` — Checklist stat card link: `/checklist` → `/event/checklist`
6. `DashboardPage.tsx` — Messages stat card link: `/messages` → `/event/messages`
7. `DashboardPage.tsx` — Schedule "הצג הכל" link: `/schedules` → `/event/schedule`
8. `DashboardPage.tsx` — Messages "הצג הכל" link: `/messages` → `/event/messages`
9. `App.tsx` — 10 legacy routes now use proper `<Navigate>` redirects instead of rendering `<HomePage />`
10. `EventDetailHeader.tsx` — Rooms tab: `Zap` → `Hotel` icon; Settings tab: `Zap` → `Settings` icon
