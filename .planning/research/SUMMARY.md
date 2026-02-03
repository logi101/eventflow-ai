# Project Research Summary

**Project:** EventFlow AI v2.1 SaaS Tier Structure
**Domain:** Multi-tenant Event Management SaaS
**Researched:** 2026-02-03
**Confidence:** HIGH

## Executive Summary

EventFlow AI v2.1 adds SaaS tier structure (Base + Premium) to an existing Supabase multi-tenant event management system. The research reveals a clear implementation path: extend the existing `organizations` table with tier information, enforce limits at three layers (database RLS, Edge Functions, React Context), and defer payment integration to v2.2.

**Recommended approach:** Implement a three-layer enforcement strategy where the database is the single source of truth for tier information, Edge Functions provide quota validation before processing, and the React frontend delivers graceful degradation UX. Use dedicated `tier` column (not JSONB) for RLS performance, atomic counters for usage tracking, and Context API (not new state libraries) for frontend tier state.

**Key risk:** The existing system has 8 pg_cron jobs and offline check-in capabilities that could bypass tier limits if not properly gated. Prevention requires tier checks in Edge Functions (especially send-reminder v21+), atomic usage increments, and soft limit enforcement for offline sync. The biggest technical pitfall is JSONB RLS performance degradation — using a dedicated indexed `tier` column avoids 50-100x query slowdowns.

## Key Findings

### Recommended Stack

**NO NEW LIBRARIES NEEDED.** The entire tier system builds on EventFlow AI's existing stack: PostgreSQL for tier storage and RLS enforcement, Edge Functions for quota checks, and React Context for frontend state.

**Core technologies:**
- **PostgreSQL tier column + ENUM** — Dedicated `organizations.tier` (not JSONB) prevents RLS performance death. Indexed column enables fast tier checks in RLS policies without 50-100x slowdowns.
- **PostgreSQL triggers + atomic updates** — Auto-increment usage counters on insert, preventing race conditions across 8 concurrent pg_cron jobs sending ~28 messages/minute.
- **Security definer functions (STABLE)** — PostgreSQL optimizer caches tier checks per statement rather than per row, enabling performant RLS policies for Premium feature gating.
- **Supabase Edge Functions (service role)** — Quota enforcement before processing, admin tier updates that bypass RLS, preventing frontend tampering.
- **React Context API** — Sufficient for infrequent tier data (admin-triggered changes). Avoid Zustand/Redux — overkill for "environment-style" state like subscription tier.

**Critical version requirements:** None. Uses existing Supabase client (@supabase/supabase-js ^2.90.1), TanStack Query (@tanstack/react-query ^5.90.19), React 19.

### Expected Features

**Tier Structure (2-tier maximum for v2.1):**

Base Tier (Free):
- 5 events per year (annual limit)
- 100 participants per event
- 200 messages per month (WhatsApp/SMS/Email combined)
- Full workflow access: registration, Excel import/export, schedules, basic check-in, vendor management (basic)
- **Excluded:** AI chat, simulation, networking engine, budget alerts, offline check-in, advanced analytics

Premium Tier (Paid):
- Unlimited events, participants, messages
- All Base features PLUS AI chat (DB write access), day simulation (8 validators), networking engine (smart seating), budget alerts (spend tracking), vendor analysis (AI insights), offline check-in (with sync), advanced analytics, priority support

**Gating strategy:** "Limit scale, not features" — Base users get full workflow at limited scale. Premium unlocks AI-powered features (high compute cost) and unlimited scale (high storage/message costs).

**Must have (table stakes):**
- Clear tier visibility (dashboard badge showing current tier)
- Transparent limits (display "3/5 events" before hitting limit)
- Soft limit warnings (notify at 80% usage)
- Graceful degradation (upgrade prompt, not hard errors)
- Contextual upgrade prompts ("Use AI chat to plan faster" vs generic "Upgrade now")

**Defer to v2.2 (Payment Integration):**
- Stripe integration, automated billing, credit card collection, dunning, proration, subscription lifecycle management
- **Rationale:** Validate tier structure first (do users want Premium? are limits right?) before adding payment complexity. Use manual tier assignment initially.

### Architecture Approach

The tier system integrates seamlessly with EventFlow AI's existing multi-tenant architecture by anchoring tier information in the `organizations` table and leveraging the established RLS pattern using `auth.user_org_id()`.

**Three-layer enforcement strategy (defense in depth):**
1. **Database layer (RLS)** — Security boundary. Tier checks in RLS policies block unauthorized access even if Edge Functions are bypassed with service_role. Dedicated `tier` column (indexed) prevents JSONB performance issues.
2. **Edge Functions layer** — Quota validation before processing. All 6 Edge Functions (ai-chat, send-reminder, execute-ai-action, budget-alerts, vendor-analysis, send-push-notification) check tier and usage counters, returning 429 if quota exceeded.
3. **Frontend layer (React Context)** — UX layer for graceful degradation. `TierContext` provides `canAccess(feature)` and `hasQuota(type)` helpers. `FeatureGuard` and `QuotaGuard` components wrap Premium features with upgrade prompts.

**Major components:**
1. **TierContext (src/contexts/TierContext.tsx)** — Global tier state fetched from `organizations` table on auth. Exposes `tier`, `limits`, `usage`, `canAccess()`, `hasQuota()` to all components.
2. **Quota middleware (functions/_shared/quota-check.ts)** — Reusable Edge Function helper that checks tier and usage, returns `{allowed, remaining, tier}`. Used by all message-sending and AI functions.
3. **Usage counter triggers (schema migration)** — PostgreSQL triggers auto-increment `organizations.current_usage` on events/participants/messages insert. Atomic operations prevent race conditions.
4. **Admin tier control (functions/admin-set-tier)** — Edge Function using service_role to update tier (bypasses RLS). Logs audit trail: `tier_updated_by`, `tier_updated_at`.

### Critical Pitfalls

1. **Inconsistent gating across access points (CRITICAL)** — Tier checks in UI but not Edge Functions/RLS = easily bypassed. Prevention: Edge Functions FIRST (add tier checks to all 6 functions), then RLS policies, finally UI. Never rely on frontend alone.

2. **JSONB tier checks in RLS policies (CRITICAL)** — Storing tier in `organizations.settings->>'tier'` causes 50-100x query slowdown (18s vs 200ms) because JSONB casting is not LEAKPROOF. Prevention: Dedicated `organizations.tier` column (TEXT/ENUM), indexed, simple equality in RLS.

3. **pg_cron jobs bypass tier limits (CRITICAL)** — 8 active cron jobs run as `postgres` superuser, bypass all RLS. send-reminder Edge Function must check tier before calling Green API or free users consume unlimited WhatsApp credits. Prevention: Tier check in send-reminder v22+, monthly reset cron, message_count tracking.

4. **Existing user migration missing (CRITICAL)** — No migration script = all existing users locked out (if no default) or get Premium free (if default = premium). Prevention: Migration script with grandfathering (`tier = 'legacy_premium'` for 6-12 months), gradual rollout (weeks 1-2 deploy column, weeks 3-4 enable enforcement), email campaign before launch.

5. **Offline check-in sync violating limits (HIGH)** — IndexedDB queues 500 participants while offline, syncs all at once, bypasses 100 participant limit because bulk-insert doesn't check. Prevention: Pre-check before offline mode, soft enforcement (allow sync, mark `over_limit = true`, show upgrade banner), batch insert validation.

6. **Usage tracking race conditions (HIGH)** — 8 concurrent cron jobs sending ~28 messages/minute hit read → check → write race condition, causing 5-15% overage. Prevention: Atomic `UPDATE organizations SET count = count + 1 WHERE tier = 'premium' OR count < 100`, row locking, idempotency keys.

7. **AI promises gated features (HIGH)** — AI chat trained on full feature set promises "Sure! Let me run a simulation..." then fails when execute-ai-action tries to call Premium-only function. Prevention: System prompt includes tier context (`CURRENT PLAN: ${tier}`, `BASE PLAN LIMITATIONS: You CANNOT run simulations`), function calling gating (only register Base-accessible tools).

## Implications for Roadmap

Based on research, suggested 4-phase structure:

### Phase 1: Foundation (Week 1)
**Rationale:** Database-first approach ensures security boundary before any user-facing changes. Existing user migration is mission-critical to avoid production outage.

**Delivers:**
- Schema migration: `ALTER TABLE organizations ADD COLUMN tier TEXT DEFAULT 'base'`, tier_limits JSONB, current_usage JSONB
- Usage counter triggers (events, participants, messages)
- Tier-aware RLS policies (Premium feature tables)
- Existing user migration script (grandfather to `legacy_premium` or backfill to `base`)
- Security definer functions for performant RLS tier checks

**Addresses:**
- Pitfall 2 (JSONB RLS performance) — uses dedicated column
- Pitfall 4 (existing user migration) — includes grandfathering plan
- Table stakes: tier visibility foundation

**Avoids:**
- JSONB performance death (indexed TEXT column)
- Production outage from unmigrated users
- Race condition foundation (atomic usage increments)

**Research flag:** SKIP — PostgreSQL schema patterns well-documented, no complex integrations.

---

### Phase 2: Enforcement (Week 2)
**Rationale:** Edge Functions and backend logic must enforce limits before UI shows them. Prevents bypass vulnerabilities discovered in Pitfall 1.

**Delivers:**
- Quota middleware (functions/_shared/quota-check.ts)
- Modify 6 Edge Functions: ai-chat, send-reminder, execute-ai-action, budget-alerts, vendor-analysis, send-push-notification
- Atomic usage increments with limit checks
- Monthly usage reset pg_cron job
- Soft limit warnings (80% notifications)

**Addresses:**
- Pitfall 1 (inconsistent gating) — Edge Functions enforced before UI
- Pitfall 3 (pg_cron bypass) — send-reminder v22+ checks tier
- Pitfall 9 (race conditions) — atomic increments, row locking
- Table stakes: usage limit enforcement, quota tracking

**Uses:**
- Supabase Edge Functions (service_role for admin, anon_key for quota checks)
- PostgreSQL atomic updates (`UPDATE ... WHERE ... RETURNING`)

**Implements:**
- Quota middleware component (Architecture.md pattern 2)
- Three-layer enforcement (Architecture.md pattern 3)

**Research flag:** SKIP — Supabase Edge Function patterns documented, atomic SQL well-established.

---

### Phase 3: Feature Gating (Week 2)
**Rationale:** Premium features (AI, simulation, networking, budget) need both backend enforcement (Phase 2) and graceful frontend UX.

**Delivers:**
- TierContext (src/contexts/TierContext.tsx)
- FeatureGuard and QuotaGuard components
- Wrap Premium features: ai-chat, simulation, networking, budget alerts, vendor analysis
- AI system prompt with tier awareness
- Function calling gating (Base vs Premium tool registration)

**Addresses:**
- Pitfall 8 (AI promises gated features) — system prompt + function gating
- Pitfall 6 (feature flag sprawl) — central tiers.ts registry
- Table stakes: feature-level gating, contextual prompts

**Uses:**
- React Context API (not Zustand/Redux)
- Existing TanStack Query for usage data caching

**Implements:**
- TierContext provider (Architecture.md integration point)
- Feature guard components (Architecture.md new components)

**Research flag:** NEEDS RESEARCH — AI prompt engineering for tier awareness may need iterative testing. Contextual upgrade messaging requires UX validation.

---

### Phase 4: UI/UX & Admin (Week 3-4)
**Rationale:** User-facing tier UI and admin tools can be polished after enforcement is solid. Upgrade flow design impacts conversion but not security.

**Delivers:**
- Tier comparison page (Hebrew, RTL)
- Upgrade modal with contextual messaging
- Usage dashboard (settings page showing quotas)
- Tier badge in header/nav
- Admin tier management panel (view orgs, manual tier override)
- Contextual upgrade prompts throughout UI
- Trial mode logic (7-day Premium trial)

**Addresses:**
- Pitfall 10 (poor upgrade prompts) — contextual value props
- Pitfall 7 (unclear enforcement) — consistent hard/soft limit UI
- Table stakes: upgrade flow, tier visibility, trial mode

**Uses:**
- React 19 + TailwindCSS (existing)
- Heebo font (RTL Hebrew)

**Implements:**
- UpgradePrompt, TierBadge, UsageMetrics components (Architecture.md new components)
- Admin dashboard (Architecture.md Phase 5)

**Research flag:** NEEDS RESEARCH — Hebrew upgrade messaging, trial duration validation (7 vs 14 vs 30 days for event planning), limit validation (5 events right? 200 messages enough?).

---

### Phase Ordering Rationale

- **Database first (Phase 1)** — Foundation for everything. RLS is security boundary. Schema changes after production data = painful.
- **Edge Functions second (Phase 2)** — Security layer before frontend. Prevents bypass vulnerabilities. Usage tracking must be atomic before high-traffic cron jobs run.
- **Feature gating third (Phase 3)** — AI tier awareness depends on Edge Function enforcement. Frontend Context depends on database tier schema.
- **UI/UX last (Phase 4)** — Polishing upgrade flow can iterate after enforcement is solid. Admin tools less critical than user-facing limits.

**Critical path dependencies:**
- Phase 2 depends on Phase 1 (schema must exist)
- Phase 3 depends on Phase 2 (Edge Functions must enforce before frontend shows)
- Phase 4 can partially overlap Phase 3 (UI work while feature gating stabilizes)

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 3 (Feature Gating):** AI prompt engineering for tier awareness — may need iterative testing with real users to perfect "I can't do that, but here's what I can do" messaging. Complex because AI model "knows" Premium features exist from training data.
- **Phase 4 (UI/UX):** Usage limit validation — 5 events/year, 100 participants/event, 200 messages/month are educated guesses from research. Need user research or market data to validate before launch. Trial duration (7 vs 14 vs 30 days) needs testing — events take weeks to plan, not days.

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Foundation):** PostgreSQL schema patterns, Supabase RLS well-documented. No novel integrations.
- **Phase 2 (Enforcement):** Edge Function quota checks, atomic SQL updates well-established. Standard SaaS patterns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | **HIGH** | No new libraries needed. PostgreSQL tier storage, RLS security definer functions, React Context all verified via official docs and EventFlow's existing patterns. |
| Features | **MEDIUM-HIGH** | Tier structure (2-tier, transparent limits, contextual prompts) verified via multiple 2026 sources. Specific limits (5 events, 100 participants, 200 messages) need user validation. |
| Architecture | **HIGH** | Three-layer enforcement (RLS + Edge Functions + Context) is standard SaaS pattern. Integration points with existing EventFlow architecture (organizations table, auth.user_org_id(), pg_cron) well-defined. |
| Pitfalls | **HIGH** | JSONB RLS performance issue confirmed via PostgREST issue #2590 and real-world benchmarks. pg_cron bypass risk verified from EventFlow's 8 active cron jobs. Offline sync bypass risk confirmed from existing IndexedDB architecture. |

**Overall confidence:** **HIGH**

Research is built on EventFlow AI's existing codebase (schema.sql, 6 Edge Functions, 8 pg_cron jobs documented) combined with verified 2026 SaaS tier best practices from authoritative sources (Supabase docs, PostgreSQL performance guides, WorkOS multi-tenancy patterns).

### Gaps to Address

**Validation needed during implementation:**
1. **Usage limit values** — Are 5 events/year, 100 participants/event, 200 messages/month the right Base tier limits? Research provides ranges (3-10 events, 50-200 participants) but EventFlow's target market (Hebrew-speaking event managers) may have different expectations. **How to handle:** A/B test limits with first 100 users, adjust based on conversion data before public launch.

2. **Trial duration** — Is 7 days sufficient for event management trial? Events take weeks to plan, suggesting 14-30 days may convert better. **How to handle:** Test 7-day vs 14-day vs 30-day trials with cohorts, measure trial-to-paid conversion rate (target: 25-40% per ProfitWell data).

3. **AI tier awareness prompting** — Optimal phrasing for "I can't do that because you're on Base plan" without frustrating users. **How to handle:** Iterative testing with real users during Phase 3, monitor support tickets for AI-related confusion.

4. **RLS performance under load** — Research confirms STABLE security definer functions cache tier checks, but needs load testing validation (100+ concurrent requests). **How to handle:** Load test in Phase 1 after RLS policies deployed, monitor Supabase slow query logs.

5. **Offline sync soft limit UX** — How to communicate "You synced 500 participants but your limit is 100" gracefully. **How to handle:** User research during Phase 2, test messaging like "Upgrade to keep all participants" vs "Delete 400 or upgrade."

6. **Grandfathering period** — Should existing users get 3 months, 6 months, or 12 months of `legacy_premium` before forced migration? **How to handle:** Business decision based on churn risk tolerance. Research suggests 6-12 months is standard, start with 6 and extend if needed.

## Sources

### Primary (HIGH confidence)

**Stack & Architecture:**
- [Supabase Row Level Security Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security) — RLS patterns, security definer functions
- [Supabase User Management](https://supabase.com/docs/guides/auth/managing-user-data) — Admin tier updates, app_metadata
- [PostgreSQL Function Security](https://www.postgresql.org/docs/current/perm-functions.html) — Security definer, STABLE functions
- [Multi-tenant PostgreSQL patterns (Crunchy Data)](https://www.crunchydata.com/blog/designing-your-postgres-database-for-multi-tenancy) — Tier storage, isolation

**Features & Best Practices:**
- [Feature-Based Tiers: Packaging Your Product for Maximum Revenue - 2026 Guide](https://resources.rework.com/libraries/saas-growth/feature-based-tiers) — 3-tier maximum, transparent limits
- [SaaS Pricing Strategy Guide for 2026](https://www.momentumnexus.com/blog/saas-pricing-strategy-guide-2026/) — Usage-based patterns
- [Freemium Model Design: 2026 Guide](https://resources.rework.com/libraries/saas-growth/freemium-model-design) — Limit scale not features
- [How freemium SaaS products convert users with brilliant upgrade prompts](https://www.appcues.com/blog/best-freemium-upgrade-prompts) — Contextual prompts, 2-4x conversion

**Pitfalls & Performance:**
- [PostgreSQL RLS Footguns (Bytebase)](https://www.bytebase.com/blog/postgres-row-level-security-footguns/) — JSONB performance issues
- [PostgREST Issue #2590: JSON GUCs lead to bad performance](https://github.com/PostgREST/postgrest/issues/2590) — Real-world benchmarks
- [Designing the most performant RLS strategy in Postgres](https://cazzer.medium.com/designing-the-most-performant-row-level-security-strategy-in-postgres-a06084f31945) — Security definer optimization
- [WorkOS: Multi-tenant SaaS architecture](https://workos.com/blog/developers-guide-saas-multi-tenant-architecture) — Tier enforcement patterns

**Compliance & Dark Patterns:**
- [Dark Pattern Avoidance 2026 Checklist](https://secureprivacy.ai/blog/dark-pattern-avoidance-2026-checklist) — CPRA compliance, transparent limits
- [Grandfathering vs Forced Migration (GetMonetizely)](https://www.getmonetizely.com/articles/grandfathering-vs-forced-migration-the-strategic-approach-to-price-changes-for-existing-customers) — Existing user migration

### Secondary (MEDIUM confidence)
- [React State Management 2026](https://www.nucamp.co/blog/state-management-in-2026-redux-context-api-and-modern-patterns) — Context API for tier state
- [Kent C. Dodds on React Context](https://kentcdodds.com/blog/how-to-use-react-context-effectively) — Best practices
- ProfitWell research (cited in multiple articles) — Trial conversion rates (25-40%)

### Internal Sources (HIGH confidence)
- EventFlow AI existing codebase (schema.sql, organizations table, 6 Edge Functions, 8 pg_cron jobs)
- Supabase dashboard configuration (RLS policies, Edge Function limits)
- PROJECT.md context (offline check-in architecture, multi-tenant design)

---
*Research completed: 2026-02-03*
*Ready for roadmap: YES*
