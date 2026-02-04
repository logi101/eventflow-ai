# Phase 11: Tier Enforcement Context

**Phase Number:** 11
**Name:** Tier Enforcement
**Duration:** Week 2
**Priority:** P0 (Critical)
**Status:** Not Started

---

## Phase Overview

Implement Edge Function quota validation and atomic usage increments. All API-level tier checks happen here to prevent bypass and ensure security.

---

## Plans

| Plan | Name | Status | Summary |
|------|------|--------|---------|
| 11-01 | Quota Check Middleware | ⏳ Not Started | Shared utility for checking tier and quota limits |
| 11-02 | AI Chat Tier Check | ⏳ Not Started | Add tier validation to ai-chat Edge Function |
| 11-03 | Send Reminder Tier Check | ⏳ Not Started | Add tier validation to send-reminder Edge Function |
| 11-04 | Execute AI Action Tier Check | ⏳ Not Started | Add tier validation to execute-ai-action Edge Function |
| 11-05 | Budget Alerts Tier Check | ⏳ Not Started | Add tier validation to budget-alerts Edge Function |
| 11-06 | Vendor Analysis Tier Check | ⏳ Not Started | Add tier validation to vendor-analysis Edge Function |
| 11-07 | Soft Limit Warnings | ⏳ Not Started | pg_cron job for 80% usage warnings |

---

## Key Decisions

1. **Shared quota-check.ts**: Single utility for all Edge Functions
2. **Always allow Premium**: No quota checks for Premium tier
3. **Silent skip for cron**: Don't fail send-reminder if quota exceeded
4. **Atomic increments**: UPDATE ... RETURNING pattern
5. **429 status code**: Standard HTTP for rate/quota exceeded

---

## Dependencies

- Depends on: Phase 10 (tier columns, usage tracking)

---

## Acceptance Criteria

- [ ] Quota check middleware completes in <100ms
- [ ] All 6 Edge Functions validate tier before processing
- [ ] Base tier users get 429/403 when quota exceeded
- [ ] Premium tier users have unlimited access
- [ ] pg_cron jobs respect tier limits
- [ ] No race conditions in usage tracking

---

## Estimated Effort

- 11-01: 3 hours
- 11-02: 2 hours
- 11-03: 2 hours
- 11-04: 2 hours
- 11-05: 1 hour
- 11-06: 1 hour
- 11-07: 3 hours

**Total:** ~14 hours (~2 days)

---

## Notes

- Edge Functions are in eventflow-app/supabase/functions/
- Shared utilities in eventflow-app/supabase/functions/_shared/
- All tier checks must happen before processing
- Use service role for atomic operations
- Monitor Green API usage vs database message counts

---

**Last Updated:** 2026-02-04
