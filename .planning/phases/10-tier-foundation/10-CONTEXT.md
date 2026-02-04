# Phase 10: Tier Foundation Context

**Phase Number:** 10
**Name:** Tier Foundation
**Duration:** Week 1
**Priority:** P0 (Critical)
**Status:** In Progress (1/5 plans complete)

---

## Phase Overview

Establish the database and frontend foundation for Base and Premium subscription tiers. This phase creates the data model, usage tracking infrastructure, and React context needed for all subsequent tier enforcement and UI features.

---

## Plans

| Plan | Name | Status | Summary |
|------|------|--------|---------|
| 10-01 | Database Schema: Tier Columns | ✅ Complete | Migration with tier, tier_limits, current_usage columns; TierContext, tiers.ts, TierBadge |
| 10-02 | Usage Counter Triggers | ⏳ Not Started | PostgreSQL triggers to auto-increment usage counters |
| 10-03 | RLS Policies: Premium Features | ⏳ Not Started | RLS policies on simulations, ai_chat_sessions, vendor_analysis tables |
| 10-04 | Existing User Migration | ⏳ Not Started | Migration script for existing organizations (simple or grandfathering) |
| 10-05 | Monthly Reset Cron Job | ⏳ Not Started | pg_cron job to reset usage counters on 1st of each month |

---

## Key Decisions

1. **Dedicated tier column (TEXT)**: Not JSONB for RLS performance
2. **Atomic increments via jsonb_set**: Prevents race conditions
3. **Security definer + STABLE**: For RLS function performance
4. **TierContext with 1-minute refresh**: Real-time usage tracking
5. **tiers.ts as single source**: Prevents configuration sprawl

---

## Dependencies

- None (first phase of v2.1)
- Depends on: v2.0 completion (all tables exist)

---

## Acceptance Criteria

- [ ] Schema migration deployed without errors
- [ ] All existing organizations have tier set (no NULL values)
- [ ] Usage counters increment correctly when events/participants/messages are created
- [ ] RLS policies prevent Base tier users from accessing Premium tables
- [ ] RLS queries complete in <200ms under load
- [ ] Monthly reset cron job is scheduled and tested
- [ ] TierContext provides accurate tier data with 1-minute refresh

---

## Estimated Effort

- 10-01: Complete (implemented on 2026-02-03)
- 10-02: 3 hours
- 10-03: 4 hours
- 10-04: 6 hours
- 10-05: 2 hours

**Total:** ~15 hours (~2 days)

---

## Notes

- P1.1 completed on 2026-02-03 before planning phase was created
- Migration files go in eventflow-app/supabase/migrations/
- Frontend files go in eventflow-app/src/
- All RLS policies use check_org_tier() function for consistency
- Monthly reset affects all organizations (including Premium) for consistency

---

**Last Updated:** 2026-02-04
