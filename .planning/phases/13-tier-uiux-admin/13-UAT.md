---
status: testing
phase: 13-tier-uiux-admin
source: 13-01-SUMMARY.md, 13-02-SUMMARY.md, 13-03-SUMMARY.md, 13-04-SUMMARY.md, 13-05-SUMMARY.md, 13-06-SUMMARY.md
started: 2026-02-08T10:00:00Z
updated: 2026-02-08T10:00:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

number: 1
name: Tier Badge in Sidebar
expected: |
  In the sidebar (when open), under the EventFlow AI logo, you should see a small badge.
  - If your org is Base tier: gray badge showing "בסיס" with 📦 icon
  - If your org is Premium tier: gold/amber badge showing "פרימיום" with 💎 icon
  - Clicking the badge should navigate to /settings/billing
awaiting: user response

## Tests

### 1. Tier Badge in Sidebar
expected: Gray badge "בסיס" (📦) or gold badge "פרימיום" (💎) visible under logo in sidebar. Clicking it navigates to /settings/billing.
result: [pending]

### 2. Usage Metrics Dashboard
expected: Navigate to the settings/usage or wherever UsageMetrics is rendered. For Base tier: shows 4 progress bars (events/year, participants/event, messages/month, AI messages/month) with actual numbers (e.g. "3 / 5 אירועים"). For Premium: shows "ללא הגבלה" for all metrics. Progress bars turn amber at 80% and red at 90%.
result: [pending]

### 3. Tier Comparison Page
expected: Navigate to /settings/tiers. Shows a comparison table with 8 features: events, participants, messages, AI chat, simulation, networking, budget alerts, vendor analysis. Base column shows limits or red X. Premium column shows "ללא הגבלה" or green checkmark. FAQ section at bottom with 3 expandable questions. If Base tier: shows "שדרג עכשיו" upgrade button.
result: [pending]

### 4. Upgrade Modal
expected: When a Base-tier user tries to access a Premium feature (simulation, networking, budget alerts, vendor analysis), an upgrade modal appears showing the feature name in Hebrew, 5 contextual benefits, a "שדרג לפרימיום" button, and a "למד עוד" button. Clicking "למד עוד" switches to a comparison table view inside the modal. Modal can be dismissed by clicking X or the backdrop.
result: [pending]

### 5. Feature Gating (Premium Features Locked for Base)
expected: As a Base-tier user, attempting to access AI Chat, Day Simulation, Networking Engine, Budget Alerts, or Vendor Analysis should show an upgrade prompt instead of the feature. Premium-tier users should see the features normally.
result: [pending]

### 6. Trial Banner
expected: If an organization has an active trial (trial_ends_at in the future), a banner appears at the top showing "ניסיון פרימיום בגימור" with days remaining. Banner color changes: purple for 6-7 days, amber for 3-5 days, red for ≤2 days. Banner has a dismiss button (per session only).
result: [pending]

### 7. Start Trial Flow
expected: A Base-tier user can start a 7-day Premium trial. After starting: tier changes to premium, all Premium features become accessible, trial banner appears with 7 days remaining, usage counters reset to zero.
result: [pending]

### 8. Admin Tier Management Page
expected: Navigate to /admin/tiers (requires super_admin role). Shows a table of all organizations with: name, current tier, usage metrics, last updated. Search/filter by org name works. Pagination works (20 per page). Clicking an org opens a tier override modal with: current tier display, new tier dropdown (base/premium/legacy_premium), reason field (required, min 10 chars). Submitting changes the tier with audit trail.
result: [pending]

### 9. Admin Access Control
expected: Non-admin users cannot access /admin/tiers — they should be blocked or redirected. Only super_admin role users can access the page and change tiers.
result: [pending]

### 10. App Loads Without Errors
expected: The app starts and loads the dashboard without console errors related to tier system. TierContext initializes correctly and provides tier data to all components.
result: [pending]

## Summary

total: 10
passed: 0
issues: 0
pending: 10
skipped: 0

## Gaps

[none yet]
