# Domain Pitfalls: Adding SaaS Tiers to Existing Multi-Tenant System

**Domain:** SaaS Tier Structure (EventFlow AI)
**Context:** Adding Base + Premium tiers to existing multi-tenant event management system
**Researched:** 2026-02-03
**Confidence:** HIGH

---

## Critical Pitfalls

Mistakes that cause rewrites, data corruption, or major customer trust issues.

### Pitfall 1: Inconsistent Feature Gating Across Access Points

**What goes wrong:**
Tier checks are added to the UI but not to Edge Functions, RLS policies, or API endpoints. Users discover they can bypass Premium restrictions by calling Edge Functions directly, opening developer tools, or using mobile apps.

**Why it happens:**
Teams focus on UI implementation first ("make it work in the frontend") and treat backend enforcement as secondary. With 6 Edge Functions (ai-chat, send-reminder, execute-ai-action, budget-alerts, vendor-analysis, send-push-notification) and 30+ database tables with RLS policies, the enforcement surface is large.

**Consequences:**
- Security vulnerability: Free users access Premium features
- Revenue loss: No conversion because workarounds exist
- Customer trust damage when "fixed" (feels like bait-and-switch)
- Emergency patches required across all 6 Edge Functions

**Prevention:**
1. **Edge Functions FIRST** — Add tier checks to all 6 Edge Functions before UI
2. **RLS policies** — Add tier validation to critical tables (events, ai_chat_sessions, simulation_runs)
3. **Supabase service role bypass** — Even service_role calls must check tier from organizations table
4. **UI last** — UI checks are user experience, not security

**Detection:**
- Test with browser DevTools: Can you invoke Edge Functions with Base tier auth token?
- Test with Postman: Can you call Supabase API directly and bypass limits?
- Test with React Query cache manipulation: Can you fake Premium state?

**Phase Impact:** This must be addressed in Phase 1 (Foundation) — retrofitting is extremely difficult.

---

### Pitfall 2: JSONB Tier Checks in RLS Policies

**What goes wrong:**
Storing tier info in `organizations.settings->>'tier'` and checking it in RLS policies creates severe performance degradation. Queries on tables with 3M+ rows go from 200ms to 18,000ms because JSONB casting (::jsonb) is not LEAKPROOF and PostgreSQL cannot optimize it.

**Why it happens:**
Developers naturally extend existing JSONB `settings` column rather than adding a dedicated `tier` column, assuming "it's just one more field." PostgreSQL's query planner treats JSONB operations as untrusted functions that must execute for every row.

**Consequences:**
- Every query with RLS becomes 50-100x slower
- Participant lists, event dashboards become unusable
- pg_cron jobs timeout (8-second Edge Function limit)
- Database CPU spikes to 100% under load
- No simple fix — requires schema migration and RLS policy rewrite

**Prevention:**
1. Add dedicated `organizations.tier` column (TEXT or ENUM, not JSONB)
2. Add index: `CREATE INDEX idx_organizations_tier ON organizations(tier)`
3. Use simple equality in RLS: `organizations.tier = 'premium'`
4. Store tier_features as JSONB for flexibility, but never check in RLS policies

**Example — BAD:**
```sql
-- DON'T: JSONB in RLS = performance death
CREATE POLICY tier_check ON events
  FOR SELECT USING (
    (SELECT settings->>'tier' FROM organizations
     WHERE id = organization_id) = 'premium'
  );
```

**Example — GOOD:**
```sql
-- DO: Dedicated indexed column
CREATE POLICY tier_check ON events
  FOR SELECT USING (
    (SELECT tier FROM organizations
     WHERE id = organization_id) = 'premium'
  );
```

**Detection:**
- EXPLAIN ANALYZE shows sequential scans instead of index scans
- Supabase slow query logs show RLS policy execution time > 500ms
- Dashboard queries timeout after tier checks are added

**Phase Impact:** This must be decided in Phase 1 (Foundation) — schema changes are painful after production data exists.

**Sources:**
- [PostgREST Issue #2590: JSON GUCs lead to bad performance when used on RLS](https://github.com/PostgREST/postgrest/issues/2590)
- [Medium: Designing the most performant Row Level Security strategy in Postgres](https://cazzer.medium.com/designing-the-most-performant-row-level-security-strategy-in-postgres-a06084f31945)

---

### Pitfall 3: Existing User Tier Assignment Without Migration Plan

**What goes wrong:**
System ships with tier checks but no migration script. Existing users find their accounts locked with "Upgrade to Premium" errors. No one is assigned a tier, so even basic features break. Alternatively, all existing users get Premium by default, destroying the business model.

**Why it happens:**
Teams focus on new user signup flow (easy to set tier during registration) and forget existing users. The database has `organizations.tier` column but no DEFAULT value and no backfill migration.

**Consequences:**
- Production outage: ALL existing users locked out (if no default)
- Revenue loss: ALL existing users get Premium free (if default = 'premium')
- Customer confusion: "Why am I suddenly on a paid plan?"
- Support ticket flood requiring manual account fixes

**Prevention:**
1. **Before deployment:**
   - Migration script: `UPDATE organizations SET tier = 'base' WHERE tier IS NULL`
   - Consider grandfathering: Mark existing orgs as `tier = 'legacy_premium'` for 6-12 months
   - Email campaign announcing tier structure BEFORE launch

2. **Schema safety:**
   ```sql
   ALTER TABLE organizations
     ADD COLUMN tier TEXT NOT NULL DEFAULT 'base'
     CHECK (tier IN ('base', 'premium', 'legacy_premium'));
   ```

3. **Gradual rollout:**
   - Week 1: Deploy tier column with default, no enforcement
   - Week 2: UI shows tier badges, no blocking
   - Week 3: Enable soft limits (warnings, not errors)
   - Week 4: Enable hard limits for new users only
   - Week 5+: Migrate legacy users gradually

**Detection:**
- Before launch: `SELECT COUNT(*) FROM organizations WHERE tier IS NULL` should be 0
- After launch: Monitor error logs for "Tier check failed" or "Upgrade required"
- Monitor support tickets for "account locked" or "can't access features"

**Phase Impact:** This belongs in Phase 1 (Foundation) but requires Phase 3 (Testing) validation with real user data.

**Sources:**
- [GetMonetizely: Grandfathering vs Forced Migration](https://www.getmonetizely.com/articles/grandfathering-vs-forced-migration-the-strategic-approach-to-price-changes-for-existing-customers)
- [Wingback: Everything You Need to Know About Grandfathering in SaaS](https://www.wingback.com/blog/everything-you-need-to-know-about-grandfathering-in-saas)

---

### Pitfall 4: pg_cron Jobs Bypassing Tier Limits

**What goes wrong:**
Automated reminder system (8 active pg_cron jobs) continues sending WhatsApp messages for Base tier users who exceed their 100 messages/month limit. The cron jobs run as `postgres` superuser and bypass RLS policies entirely.

**Why it happens:**
pg_cron jobs use `postgres` role which bypasses all RLS policies. Developers add tier checks to manual message sending but forget about the automated reminder pipeline. The system silently violates tier limits every night at 2am.

**Consequences:**
- Free users consume unlimited WhatsApp API credits
- Revenue model breaks (no incentive to upgrade)
- Billing shock when Green API invoice arrives
- Difficult to recover costs from free-tier users
- Manual audit required to identify violators

**Prevention:**
1. **Tier check in send-reminder Edge Function:**
   ```typescript
   // Check organization tier and message usage
   const { data: org } = await supabase
     .from('organizations')
     .select('tier, message_count_this_month')
     .eq('id', organizationId)
     .single()

   if (org.tier === 'base' && org.message_count_this_month >= 100) {
     console.log(`Org ${organizationId} hit Base tier limit, skipping reminder`)
     return // Don't send, don't fail
   }
   ```

2. **Add usage tracking:**
   ```sql
   ALTER TABLE organizations ADD COLUMN message_count_this_month INT DEFAULT 0;
   ALTER TABLE organizations ADD COLUMN last_reset_at TIMESTAMPTZ DEFAULT NOW();
   ```

3. **Monthly reset cron:**
   ```sql
   SELECT cron.schedule('reset-monthly-limits', '0 0 1 * *', $$
     UPDATE organizations SET message_count_this_month = 0, last_reset_at = NOW();
   $$);
   ```

**Detection:**
- Monitor Green API usage: Does it match message_count for Base tier orgs?
- Audit query: `SELECT organization_id, COUNT(*) FROM messages WHERE created_at > '2026-02-01' GROUP BY organization_id HAVING COUNT(*) > 100`
- Alert if Base tier org sends > 100 messages/month

**Phase Impact:** This must be addressed in Phase 1 (Foundation) because pg_cron is already running in production.

**EventFlow Context:**
- 8 active cron jobs: reminder_activation, week_before, day_before, morning, 15min, event_end, follow_up_3mo, follow_up_6mo
- send-reminder Edge Function (v21) must check tier before calling Green API
- Rate limiting already exists (2.1s throttle) but no tier checks

---

### Pitfall 5: Offline Check-in Sync Violating Limits

**What goes wrong:**
Offline check-in system (IndexedDB + background sync) queues 500 participant check-ins while offline, then syncs all at once when online. The sync bypasses the "100 participants/event" limit for Base tier because it uses batch insert Edge Function.

**Why it happens:**
Offline-first architecture prioritizes data durability (never lose check-ins) over real-time validation. The IndexedDB schema doesn't include tier info, and background sync doesn't re-check limits before batch upload.

**Consequences:**
- Base tier events exceed 100 participant limit through offline sync
- Manager discovers limit only AFTER event completes
- Data inconsistency: database has 500 participants but UI says "limit 100"
- Retroactive enforcement breaks existing events
- Support nightmare: "Your event had 500 people but now you can only see 100"

**Prevention:**
1. **Pre-check before offline mode:**
   - UI warns: "You're at 95/100 participants. Offline mode may fail to sync if you exceed limit."
   - Disable bulk import for Base tier events approaching limit

2. **Soft limit enforcement:**
   - Allow offline sync to succeed (don't lose data)
   - Mark event as `over_limit = true` after sync
   - Show banner: "This event exceeded your Base tier limit. Upgrade or delete 400 participants."

3. **Batch insert validation:**
   ```typescript
   // In bulk-insert Edge Function
   const { data: event } = await supabase
     .from('events')
     .select('organization_id, participants:participants(count)')
     .eq('id', eventId)
     .single()

   const { data: org } = await supabase
     .from('organizations')
     .select('tier')
     .eq('id', event.organization_id)
     .single()

   if (org.tier === 'base' && event.participants[0].count + newParticipants.length > 100) {
     return { error: 'Exceeds Base tier limit (100 participants/event)' }
   }
   ```

**Detection:**
- Test offline → online sync with 150 participants
- Monitor `events` table for Base tier events with COUNT(participants) > 100
- Alert if bulk-insert succeeds for over-limit Base tier event

**Phase Impact:** This must be addressed in Phase 2 (Limits Enforcement) because offline check-in is a validated v2.0 feature.

**EventFlow Context:**
- Offline check-in uses IndexedDB with background sync
- bulk-insert Edge Function handles batch uploads
- No current participant count validation in sync flow

---

## Moderate Pitfalls

Mistakes that cause delays, technical debt, or customer confusion.

### Pitfall 6: Feature Flag Sprawl Without Audit Trail

**What goes wrong:**
Tier checks added organically over 6 months result in 47 different `if (tier === 'premium')` conditionals scattered across frontend, Edge Functions, and database. No central registry. When adding "Pro" tier later, developers find and update only 38 checks, missing 9 edge cases.

**Why it happens:**
Each developer adds tier checks where they're working without coordinating. No code review checklist for "Where else needs this check?" The system grows organically: AI chat → simulation → networking → vendor analysis.

**Consequences:**
- Incomplete Pro tier rollout (some features still check for 'premium' only)
- Security gaps where Pro tier can't access Premium features
- Technical debt: tier logic duplicated 47 times
- 6-month refactor required when adding 4th tier
- Cannot answer "What does Premium include?" without reading all code

**Prevention:**
1. **Central tier registry:**
   ```typescript
   // src/config/tiers.ts
   export const TIERS = {
     base: {
       features: ['events', 'participants', 'messages'],
       limits: { events: 5, participants: 100, messages: 100 }
     },
     premium: {
       features: ['events', 'participants', 'messages', 'ai', 'simulation', 'networking'],
       limits: { events: -1, participants: -1, messages: -1 }
     }
   } as const

   export function hasFeature(tier: string, feature: string): boolean {
     return TIERS[tier]?.features.includes(feature) ?? false
   }
   ```

2. **Mandatory code review checklist:**
   - [ ] Added to `tiers.ts` feature list
   - [ ] UI check in feature entry point
   - [ ] Edge Function check (if applicable)
   - [ ] RLS policy (if database access)
   - [ ] Added to tier comparison table in docs

3. **Quarterly audit:**
   ```bash
   # Find all tier checks
   rg "tier === 'premium'" --type ts
   rg "hasFeature" --type ts
   rg "organizations.tier" --type sql
   ```

**Detection:**
- Search codebase for hardcoded tier strings: `grep -r "=== 'premium'" src/`
- Test: Can you add new tier without touching >10 files?
- Onboarding test: New developer adds tier check — how do they know where?

**Phase Impact:** This should be established in Phase 1 (Foundation) to prevent sprawl during Phases 2-4.

**Sources:**
- [ConfigCat: Feature Flag Best Practices](https://configcat.com/feature-flag-best-practices/)
- [Unleash: 11 principles for building and scaling feature flag systems](https://docs.getunleash.io/topics/feature-flags/feature-flag-best-practices)

---

### Pitfall 7: Unclear Limit Enforcement (Hard vs Soft)

**What goes wrong:**
Base tier limit is "100 participants per event." At 100 participants, system behavior is undefined:
- Import button: Disabled (hard block)
- Manual add form: Shows error after submission (soft block)
- Bulk insert API: Succeeds but truncates at 100 (silent failure)
- Offline sync: Succeeds then shows banner (deferred warning)

Users discover inconsistencies and lose trust. "Sometimes it works, sometimes it doesn't."

**Why it happens:**
Different developers implement limits at different touchpoints without coordination. Product manager says "100 participant limit" but doesn't specify enforcement strategy. Frontend and backend make different assumptions.

**Consequences:**
- Customer confusion: "Is my limit 100 or not?"
- Support tickets: "I imported 150 but only 100 saved"
- Inconsistent user experience breeds distrust
- Difficult to document ("It depends...")
- Cannot A/B test limit changes (no single source of truth)

**Prevention:**
1. **Define enforcement strategy upfront:**
   - **Hard block:** Prevent action entirely (import, add button)
   - **Soft block:** Allow action, show error after (form submission)
   - **Deferred warning:** Allow action, show banner later (offline sync)
   - **Quota warning:** Show warning at 80%, block at 100% (progressive)

2. **Document in tiers.ts:**
   ```typescript
   export const LIMIT_ENFORCEMENT = {
     participants: 'hard', // Block at limit
     events: 'hard',
     messages: 'quota', // Warn at 80, block at 100
     storage: 'soft' // Allow over, show banner
   } as const
   ```

3. **Consistent UI pattern:**
   - Always show progress: "45 / 100 participants"
   - At 80%: Yellow badge "Approaching limit"
   - At 100%: Red badge "Limit reached" + disable actions
   - At 101%: Error message + upgrade prompt

**Detection:**
- Test each limit at 99, 100, 101 across all touchpoints
- Document actual behavior in spreadsheet
- User test: "What happens when you hit the limit?" should have single answer

**Phase Impact:** This should be decided in Phase 1 (Foundation) and implemented consistently in Phase 2 (Limits).

---

### Pitfall 8: AI Feature Gating After Training Data Includes it

**What goes wrong:**
AI chat (Gemini) is trained on conversations that include Premium features (simulation, networking, vendor analysis). When Base tier users ask "Can you run a simulation?", AI responds "Sure! Let me simulate your event..." then fails when execute-ai-action tries to run simulation Edge Function.

**Why it happens:**
AI training data includes full feature set before tier structure exists. Fine-tuning or prompt engineering to restrict features per tier is difficult because the model "knows" these features exist.

**Consequences:**
- AI promises features it can't deliver (breaks trust)
- Users blame AI ("It's broken") rather than tier limits
- Confusing error: "I can't run simulations" vs "Upgrade to Premium for simulations"
- Support tickets: "Your AI said it could do this but it failed"

**Prevention:**
1. **System prompt includes tier context:**
   ```typescript
   const systemPrompt = `You are EventFlow AI assistant.

   CURRENT PLAN: ${org.tier}

   ${org.tier === 'base' ? `
   BASE PLAN LIMITATIONS:
   - You CANNOT run event simulations (Premium feature)
   - You CANNOT analyze vendor quotes (Premium feature)
   - You CANNOT suggest networking seating (Premium feature)

   If user requests these features, respond:
   "This feature requires Premium plan. Would you like to learn about upgrading?"
   ` : ''}
   `
   ```

2. **Function calling gating:**
   ```typescript
   const tools = org.tier === 'premium' ? [
     searchEventsTool,
     createEventTool,
     runSimulationTool, // Premium only
     analyzeVendorsTool, // Premium only
     suggestSeatingTool  // Premium only
   ] : [
     searchEventsTool,
     createEventTool
   ]
   ```

3. **Graceful degradation message:**
   - AI: "I'd love to run a simulation for you! That's a Premium feature. In the meantime, I can help you review your checklist. Would you like me to do that?"

**Detection:**
- Test Base tier AI: Ask for each Premium feature
- Expected: Polite upgrade prompt, not error
- Unexpected: AI tries then fails, or says "I can't" without explaining

**Phase Impact:** This must be addressed in Phase 2 (Feature Gating) when AI features are gated.

**EventFlow Context:**
- ai-chat Edge Function (v25) has 8+ function calling tools
- execute-ai-action Edge Function runs privileged operations
- Current system prompt doesn't include tier awareness

---

### Pitfall 9: Usage Tracking Race Conditions

**What goes wrong:**
Two WhatsApp reminder cron jobs run simultaneously at 8:00am, both check `message_count_this_month = 99`, both send a message, both increment to 100. Actual count is now 101 but limit was 100. With 8 cron jobs and 500 messages/hour, race conditions cause significant overage.

**Why it happens:**
Simple read → check → write pattern without atomic operations or row locking. Each process assumes the count it reads is current. PostgreSQL default transaction isolation (READ COMMITTED) allows dirty reads.

**Consequences:**
- Base tier orgs consistently exceed limits by 5-15%
- Billing discrepancies compound monthly
- Cannot enforce hard limits reliably
- Customers complain: "You said 100 but I sent 112"
- Manual refunds or awkward "sorry, we'll let it slide"

**Prevention:**
1. **Atomic increment with limit check:**
   ```sql
   -- Single atomic operation
   UPDATE organizations
     SET message_count_this_month = message_count_this_month + 1
     WHERE id = $1
       AND (tier = 'premium' OR message_count_this_month < 100)
     RETURNING message_count_this_month;

   -- If no rows returned, limit exceeded
   ```

2. **Row-level locking for critical sections:**
   ```sql
   BEGIN;
   SELECT message_count_this_month FROM organizations
     WHERE id = $1 FOR UPDATE; -- Lock this row

   -- Check limit, increment, commit
   COMMIT;
   ```

3. **Idempotency keys for messages:**
   ```typescript
   // Prevent duplicate sends if function retries
   const idempotencyKey = `${orgId}-${messageType}-${participantId}-${date}`

   const { data: existing } = await supabase
     .from('messages')
     .select('id')
     .eq('idempotency_key', idempotencyKey)
     .maybeSingle()

   if (existing) {
     console.log('Message already sent, skipping')
     return
   }
   ```

**Detection:**
- Load test: Send 100 concurrent messages, count should stop at exactly 100
- Audit query: `SELECT COUNT(*) FROM messages WHERE organization_id = X AND created_at > '2026-02-01'` should match `organizations.message_count_this_month`
- Monitor for orgs with count > limit

**Phase Impact:** This must be addressed in Phase 2 (Limits Enforcement) before enabling automated reminders with limits.

**EventFlow Context:**
- 8 pg_cron jobs run concurrently
- send-reminder Edge Function (v21) sends ~28 messages/minute
- Current system has deduplication but not atomic limit checks

---

## Minor Pitfalls

Mistakes that cause annoyance but are fixable with good UX.

### Pitfall 10: Poor Upgrade Prompts

**What goes wrong:**
Base tier user tries to access AI chat. Error message: "Feature not available." No context, no upgrade path, no explanation of why. User leaves frustrated.

**Why it happens:**
Backend returns generic 403 error. Frontend shows error toast. No one designs the upgrade experience because focus is on building features and enforcing limits.

**Prevention:**
1. **Contextual upgrade prompts:**
   ```typescript
   // Instead of generic error
   if (!hasFeature(org.tier, 'ai-chat')) {
     return (
       <UpgradePrompt
         feature="AI Event Assistant"
         description="Get instant help planning your events with AI-powered suggestions, checklist generation, and smart scheduling."
         currentPlan="Base"
         requiredPlan="Premium"
         benefits={[
           'Unlimited AI conversations',
           'Event simulation and stress testing',
           'Smart vendor analysis',
           'Networking optimization'
         ]}
       />
     )
   }
   ```

2. **Show value, not restriction:**
   - Bad: "You can't use AI chat"
   - Good: "Unlock AI-powered event planning with Premium"

3. **Let them try:**
   - Give 3 free AI questions before upgrade prompt
   - "You've used 3/3 free AI questions. Upgrade for unlimited access."

**Phase Impact:** This should be designed in Phase 3 (Limit UI/UX) for good conversion rates.

---

## Phase-Specific Warnings

| Phase | Likely Pitfall | Mitigation |
|-------|---------------|------------|
| Phase 1: Foundation | JSONB RLS performance (Pitfall 2) | Use dedicated `tier` column, benchmark queries |
| Phase 1: Foundation | Inconsistent gating (Pitfall 1) | Edge Functions → RLS → UI order, checklist |
| Phase 1: Foundation | Missing user migration (Pitfall 3) | Migration script + grandfathering plan |
| Phase 2: Limits Enforcement | pg_cron bypass (Pitfall 4) | Tier check in send-reminder v22, usage tracking |
| Phase 2: Limits Enforcement | Race conditions (Pitfall 9) | Atomic increments, row locking, load testing |
| Phase 2: Limits Enforcement | Offline sync limits (Pitfall 5) | Pre-check + soft enforcement + over-limit warning |
| Phase 3: Feature Gating | AI promises Premium features (Pitfall 8) | System prompt tier awareness, function call gating |
| Phase 3: Feature Gating | Feature flag sprawl (Pitfall 6) | Central tiers.ts registry, quarterly audit |
| Phase 4: Limit UI/UX | Unclear enforcement (Pitfall 7) | Hard/soft/quota strategy, consistent UI patterns |
| Phase 4: Limit UI/UX | Poor upgrade prompts (Pitfall 10) | Contextual value props, trial periods |

---

## EventFlow-Specific Risk Assessment

| Risk Area | Severity | Likelihood | Priority |
|-----------|----------|------------|----------|
| 8 pg_cron jobs bypass limits | CRITICAL | HIGH | P0 |
| JSONB tier checks in RLS | CRITICAL | MEDIUM | P0 |
| Offline sync limit bypass | HIGH | HIGH | P1 |
| AI promises gated features | HIGH | MEDIUM | P1 |
| 6 Edge Functions inconsistent gating | CRITICAL | MEDIUM | P0 |
| Existing user migration plan missing | CRITICAL | HIGH | P0 |
| Usage tracking race conditions | HIGH | MEDIUM | P1 |
| Feature flag sprawl (47+ checks) | MEDIUM | HIGH | P2 |

**P0 (Blocker):** Must fix in Phase 1 or system is fundamentally broken
**P1 (Critical):** Must fix before public launch or revenue model fails
**P2 (Important):** Fix before it becomes technical debt

---

## Sources

### SaaS Tier Best Practices
- [WorkOS: The developer's guide to SaaS multi-tenant architecture](https://workos.com/blog/developers-guide-saas-multi-tenant-architecture)
- [FreshProposals: 8 Common Mistakes in Implementing Tiered Pricing](https://www.freshproposals.com/mistakes-in-implementing-tiered-pricing/)
- [GetMonetizely: Grandfathering vs Forced Migration](https://www.getmonetizely.com/articles/grandfathering-vs-forced-migration-the-strategic-approach-to-price-changes-for-existing-customers)
- [Wingback: Everything You Need to Know About Grandfathering in SaaS](https://www.wingback.com/blog/everything-you-need-to-know-about-grandfathering-in-saas)

### PostgreSQL RLS Performance
- [Medium: Designing the most performant Row Level Security strategy in Postgres](https://cazzer.medium.com/designing-the-most-performant-row-level-security-strategy-in-postgres-a06084f31945)
- [PostgREST Issue #2590: JSON GUCs lead to bad performance when used on RLS](https://github.com/PostgREST/postgrest/issues/2590)
- [Permit.io: Postgres RLS Implementation Guide](https://www.permit.io/blog/postgres-rls-implementation-guide)

### Supabase Edge Functions
- [Supabase: Edge Function Limits](https://supabase.com/docs/guides/functions/limits)
- [Supabase: Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)

### Feature Flag Management
- [ConfigCat: Feature Flag Best Practices](https://configcat.com/feature-flag-best-practices/)
- [Unleash: 11 principles for building and scaling feature flag systems](https://docs.getunleash.io/topics/feature-flags/feature-flag-best-practices)

---

## Research Confidence

**Overall Confidence:** HIGH

**Rationale:**
- SaaS tier best practices verified from multiple authoritative 2026 sources
- PostgreSQL RLS performance issues documented with real-world benchmarks
- EventFlow architecture analyzed from existing codebase (schema.sql, Edge Functions, pg_cron usage)
- pg_cron bypass risk confirmed from project context (8 active cron jobs)
- Offline sync architecture reviewed (IndexedDB, background sync documented in PROJECT.md)

**Low Confidence Areas:**
- Exact Green API pricing/cost impact (requires business data)
- Customer reaction to grandfathering (market-specific, Hebrew-speaking event managers)

**Next Research Needed:**
- Phase-specific: Load testing results will reveal if race condition mitigation is sufficient
- Phase-specific: User testing will validate upgrade prompt conversion rates
