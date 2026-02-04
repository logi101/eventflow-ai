# Phase 13: UI/UX & Admin Context

**Phase Number:** 13
**Name:** UI/UX & Admin
**Duration:** Weeks 3-4
**Priority:** P1 (High)
**Status:** Not Started

---

## Phase Overview

Build user-facing tier UI, upgrade flows, usage dashboards, and admin management tools for manual tier assignment.

---

## Plans

| Plan | Name | Status | Summary |
|------|------|--------|---------|
| 13-01 | Tier Badge Component | ⏳ Not Started | Display current tier in header (already exists in P1.1, may need integration) |
| 13-02 | Usage Metrics Dashboard | ⏳ Not Started | Settings page showing usage quotas and limits |
| 13-03 | Tier Comparison Page | ⏳ Not Started | Side-by-side comparison of Base vs Premium |
| 13-04 | Upgrade Modal Component | ⏳ Not Started | Contextual upgrade prompts per feature |
| 13-05 | Trial Mode Logic | ⏳ Not Started | 7-day Premium trial with banner and expiration |
| 13-06 | Admin Tier Management Panel | ⏳ Not Started | Admin interface for viewing/modifying organization tiers |

---

## Key Decisions

1. **RTL Hebrew layout**: All UI in Hebrew with right alignment
2. **Progress bars**: Visual usage tracking
3. **80% warning indicators**: Soft limit warnings
4. **Contextual upgrade prompts**: Feature-specific messaging
5. **7-day trial**: Balance conversion vs abuse prevention
6. **Admin audit trail**: Track all tier changes

---

## Dependencies

- Depends on: Phase 10 (TierContext), Phase 12 (FeatureGuard)

---

## Acceptance Criteria

- [ ] Tier badge visible in header for all authenticated users
- [ ] Usage dashboard displays all three quotas with progress bars
- [ ] Progress bars accurate to current usage
- [ ] Tier comparison page shows all features side-by-side
- [ ] Upgrade modal shows contextual messaging per feature
- [ ] Trial users access Premium features for 7 days
- [ ] Trial banner displays correct days remaining
- [ ] Admins can view all organizations and tiers
- [ ] Admins can change tiers with audit trail
- [ ] All UI supports RTL Hebrew

---

## Estimated Effort

- 13-01: 2 hours (partial if P1.1 complete)
- 13-02: 4 hours
- 13-03: 4 hours
- 13-04: 4 hours
- 13-05: 6 hours
- 13-06: 6 hours

**Total:** ~26 hours (~4 days)

---

## Notes

- TierBadge already exists from P1.1
- UI components in eventflow-app/src/
- Admin route in eventflow-app/src/app/routes/admin/tiers.tsx
- Usage dashboard in eventflow-app/src/modules/settings/UsageMetrics.tsx
- Trial column needed: organizations.trial_ends_at
- Edge Function: admin-set-tier for admin operations
- Use service role for admin operations (bypass RLS)

---

**Last Updated:** 2026-02-04
