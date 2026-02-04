# Phase 12: Feature Gating Context

**Phase Number:** 12
**Name:** Feature Gating
**Duration:** Week 2
**Priority:** P1 (High)
**Status:** Not Started

---

## Phase Overview

Implement React Context for tier state management and create reusable guard components to wrap Premium features with upgrade prompts.

---

## Plans

| Plan | Name | Status | Summary |
|------|------|--------|---------|
| 12-01 | Tier Context Provider | ⏳ Not Started | React Context for global tier state (already exists in P1.1, may need updates) |
| 12-02 | Feature Guard Component | ⏳ Not Started | Reusable wrapper for Premium features |
| 12-03 | Quota Guard Component | ⏳ Not Started | Display quota status and disable actions at limit |
| 12-04 | Wrap Premium Features | ⏳ Not Started | Apply FeatureGuard to all Premium features |
| 12-05 | AI System Prompt with Tier Awareness | ⏳ Not Started | Update AI prompt to include tier context |
| 12-06 | Central Tiers Registry | ⏳ Not Started | Single source of truth for tier config (already exists in P1.1) |

---

## Key Decisions

1. **Context-first approach**: Tier data available everywhere
2. **Guard components**: Declarative feature gating
3. **Upgrade prompts**: Contextual messaging per feature
4. **Central registry**: tiers.ts as single source of truth
5. **AI tier awareness**: System prompt includes limitations

---

## Dependencies

- Depends on: Phase 10 (TierContext exists), Phase 11 (Edge Function checks)

---

## Acceptance Criteria

- [ ] TierContext provides accurate tier data with 1-minute refresh
- [ ] canAccess('feature') returns correct boolean
- [ ] hasQuota('quotaType') returns correct boolean
- [ ] FeatureGuard shows upgrade prompt for Base tier
- [ ] QuotaGuard displays progress and disables at limit
- [ ] All Premium features wrapped in FeatureGuard
- [ ] AI refuses Premium features on Base tier politely
- [ ] tiers.ts is single source of truth

---

## Estimated Effort

- 12-01: 4 hours (may be partial if P1.1 complete)
- 12-02: 2 hours
- 12-03: 2 hours
- 12-04: 3 hours
- 12-05: 2 hours
- 12-06: 2 hours (may be partial if P1.1 complete)

**Total:** ~15 hours (~2 days)

---

## Notes

- TierContext and tiers.ts already exist from P1.1
- May only need enhancements, not full creation
- Guard components in eventflow-app/src/components/guards/
- Upgrade prompts in eventflow-app/src/components/billing/
- AI changes in eventflow-app/supabase/functions/ai-chat/

---

**Last Updated:** 2026-02-04
