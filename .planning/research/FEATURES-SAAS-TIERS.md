# Feature Landscape: SaaS Tier Structure for Event Management

**Domain:** SaaS Subscription Tiers & Feature Gating
**Researched:** 2026-02-03
**Context:** Adding SaaS tier structure to existing EventFlow AI application
**Confidence:** HIGH (verified via multiple 2026 sources)

---

## Executive Summary

This research examines how SaaS tier structures and feature gating patterns work in 2026, specifically for adding Base (free) and Premium (paid) tiers to EventFlow AI.

**Key Finding:** In 2026, successful SaaS tiering follows the "3-tier maximum" rule with transparent limits, soft warnings, and value-based gating. The emphasis is on ethical design — no dark patterns, no surprise paywalls, clear upgrade paths that align with genuine business needs.

**For EventFlow AI:** Recommend Base/Premium structure where Base provides full workflow at limited scale (5 events, 100 participants/event, 200 messages/month) while Premium unlocks unlimited scale + AI-powered features (chat, simulation, networking, budget alerts).

---

## Table Stakes

Features users expect in any SaaS tier system. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Clear tier visibility** | Users must see what tier they're on | Low | Display current tier in dashboard/settings |
| **Usage metrics display** | Users expect to see how much they've used | Low | Show events count, participants count, messages sent |
| **Transparent limits** | Users must know limits before hitting them | Low | Display limits with current usage (e.g., "3/5 events") |
| **Soft limit warnings** | Warn at 80% before hard limit | Medium | Proactive notifications prevent frustration |
| **Graceful degradation** | Show upgrade prompt, not hard errors | Medium | "You've reached your limit. Upgrade to continue" |
| **Self-service upgrade** | Users upgrade without sales contact | Medium | One-click upgrade flow with immediate access |
| **Feature flag checking** | Check tier access before feature use | Low | Centralized permission check function |
| **Tier-based UI gating** | Hide/show features based on tier | Low | Conditional rendering with upgrade CTAs |

**2026 Context:** Per research, users now expect full transparency. Showing limits prominently (not hiding them until hit) is the standard. Columbia University research shows that hiding limits reduces conversions by up to 40%.

---

## Differentiators

Features that set products apart. Not expected, but highly valued when present.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Usage-based soft limits** | Allow temporary overage vs hard block | Medium | Better UX than hard stops, builds trust |
| **Contextual upgrade prompts** | Show value when user tries gated feature | Medium | "Use AI chat to plan faster" vs generic "Upgrade now" |
| **Progressive feature unlocking** | Unlock features as user grows | High | Based on behavior, not just payment |
| **Tier recommendation engine** | Suggest right tier based on usage patterns | Medium | "Your usage suggests Premium would save you..." |
| **Trial mode for premium features** | Let users try before committing | Medium | 7-day trial of AI features, networking engine |
| **Granular usage analytics** | Show which features drive value | Medium | Help users justify upgrade to their team |
| **Plan migration wizard** | Guide users through tier changes | Low | Explain what changes, no surprises |
| **Legacy plan protection** | Grandfather existing users on price changes | Low | Reduce churn, build loyalty |

**Why These Matter:** The shift to product-led growth (PLG) in 2026 means users expect to experience value before paying. Trial modes and contextual prompts drive 2-4x higher conversion rates than generic "Upgrade" buttons.

---

## Anti-Features

Features to explicitly NOT build. Common mistakes in this domain.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Hidden limits** | Dark pattern, erodes trust, CPRA violations | Show all limits upfront in transparent table |
| **Surprise paywalls mid-workflow** | Causes frustration and abandonment | Warn before action starts, not during |
| **Too many tiers (4+)** | Decision paralysis, 40% drop in conversions | Stick to 2-3 tiers (Base + Premium + optional Enterprise) |
| **Feature-gating core value** | Users must get value in free tier | Gate scale/advanced features, not core workflow |
| **Inconsistent value gaps** | Confusing, unclear upgrade path | Each tier must be clearly better than previous |
| **Aggressive upsell nagging** | Damages user experience | Contextual, value-driven prompts only |
| **Instant hard blocks** | Poor UX, no grace period | Soft limits with grace period or notification |
| **Complex credit systems** | Cognitive overhead | Simple counts (events, participants, messages) |

**Critical 2026 Regulatory Context:** California Privacy Protection Agency explicitly prohibits dark patterns. Google paid €150M, TikTok €345M, Amazon $2.5B for dark pattern violations. Ethical design is legally enforced, not optional.

---

## Feature Dependencies

How tier system integrates with EventFlow AI's existing architecture:

```
EXISTING FOUNDATION:
├── organizations table (EXISTING)
│   ├── [NEW] tier TEXT (base/premium)
│   ├── [NEW] tier_limits JSONB {event_limit, participant_limit, message_limit}
│   ├── [NEW] tier_changed_at TIMESTAMPTZ
│   └── [NEW] trial_ends_at TIMESTAMPTZ
│
├── Feature Flag Service (NEW)
│   ├── checkFeatureAccess(feature, org_id) → boolean
│   ├── checkUsageLimit(resource, org_id) → {current, limit, canUse}
│   ├── getUpgradeContext(feature) → {title, description, benefits}
│   └── logFeatureAttempt(feature, org_id, allowed) → void
│
├── Usage Tracking Service (NEW)
│   ├── getEventsCount(org_id) → number
│   ├── getParticipantsCount(org_id, event_id?) → number
│   ├── getMessagesCount(org_id, month?) → number
│   └── getUsageSummary(org_id) → {events, participants, messages}
│
├── Upgrade Flow (NEW)
│   ├── TierComparisonPage (UI)
│   ├── UpgradeModal (UI)
│   ├── updateOrganizationTier(org_id, new_tier) → void
│   └── handleUpgradeSuccess(org_id) → void
│
└── Admin Tier Management (NEW)
    ├── OrgTierDashboard (admin UI)
    ├── UsageAnalytics (admin UI)
    └── manualTierOverride(org_id, tier, reason) → void
```

**Critical Path:**
1. Extend organizations table with tier fields (schema migration)
2. Build usage tracking service (counts events, participants, messages)
3. Build feature flag service (checks tier, returns boolean)
4. Add tier display to dashboard UI
5. Enforce limits on create operations (events, participants, messages)
6. Build upgrade flow UI
7. Add contextual upgrade prompts throughout app

---

## Gating Strategy for EventFlow AI

Based on existing features and 2026 best practices:

### Base Tier (Free)
**Philosophy:** Full workflow access, limited scale

**Included:**
- ✅ 5 events max (annual limit)
- ✅ 100 participants per event
- ✅ 200 messages per month (WhatsApp/SMS/Email combined)
- ✅ Basic participant management (registration, companions, dietary)
- ✅ Excel import/export
- ✅ Personal schedules
- ✅ WhatsApp invitations & reminders
- ✅ Manual check-in
- ✅ Event dashboard
- ✅ Vendor management (basic)

**Excluded:**
- ❌ AI chat assistant
- ❌ Day simulation & stress testing
- ❌ Networking engine & smart seating
- ❌ Budget alerts & vendor analysis
- ❌ Offline check-in with sync
- ❌ Advanced analytics
- ❌ Priority support

**Rationale:** Users get full event production workflow with real value. Limits are scale-based, not feature-based. This follows 2026 best practice: "limit scale, not features" for better trial-to-paid conversion.

---

### Premium Tier (Paid)
**Philosophy:** Unlimited scale + AI-powered intelligence

**Included:**
- ✅ **Everything from Base tier**, plus:
- ✅ Unlimited events
- ✅ Unlimited participants per event
- ✅ Unlimited messages per month
- ✅ **AI chat assistant** with DB write access (suggest+confirm)
- ✅ **Day simulation** with 8 validators & stress testing
- ✅ **Networking engine** with smart table assignments
- ✅ **Budget alerts** with spend tracking
- ✅ **Vendor analysis** with quote comparisons & AI insights
- ✅ **Offline check-in** with automatic sync
- ✅ **Advanced analytics** (attendance patterns, engagement metrics)
- ✅ **Priority support** (24h response time)

**Rationale:** Premium unlocks AI-powered features (high compute cost) and unlimited scale (high storage/message costs). Clear value proposition for growing event production companies.

---

### Gating Patterns by Feature Type

| Feature Category | Gating Approach | Rationale | Implementation |
|------------------|----------------|-----------|----------------|
| **Core CRUD** (events, participants) | Usage limits only | Users need full workflow | Check count before create |
| **Communication** (WhatsApp) | Message count limits | Prevents abuse, scales with value | Monthly counter + reset |
| **AI features** (chat, simulation) | Tier-gated entirely | Premium differentiator, compute cost | if (tier !== 'premium') showUpgrade() |
| **Analysis** (networking, budget) | Tier-gated entirely | Advanced value, premium feature | Upgrade prompt with demo |
| **Data tools** (Excel, schedules) | Included in base | Expected functionality | No gating |
| **Infrastructure** (offline check-in) | Tier-gated | High dev cost, premium value | Service Worker only for Premium |

---

## Interaction Patterns

How users typically interact with tier limits:

### Pattern 1: Soft Limit Warning (80%)

**Flow:**
1. User approaches limit (e.g., 4/5 events created)
2. System shows in-app notification: "You've used 4 of 5 events. Upgrade for unlimited."
3. User can continue using until hard limit
4. Notification includes link to tier comparison page

**Example (Hebrew):**
```
🔔 התראה: השתמשת ב-4 מתוך 5 אירועים
   שדרג לפרימיום עבור אירועים ללא הגבלה
   [צפה בתוכניות] [לא עכשיו]
```

**Why this works:** Proactive warning gives user time to decide on upgrade, not panic when hitting hard limit.

---

### Pattern 2: Graceful Hard Limit

**Flow:**
1. User tries to create 6th event (exceeds limit)
2. System prevents creation, shows modal explaining limit
3. Modal highlights benefits of Premium tier
4. CTA to upgrade or view tier comparison
5. User can close modal, no action taken

**Example (Hebrew):**
```
⚠️ הגעת למגבלת התוכנית
   התוכנית הבסיסית מאפשרת עד 5 אירועים בשנה.

   שדרג לפרימיום עבור:
   ✓ אירועים ללא הגבלה
   ✓ צ'אט AI לתכנון מהיר יותר
   ✓ סימולציית יום האירוע

   [שדרג עכשיו] [השווה תוכניות] [סגור]
```

**Why this works:** Clear explanation, no error message, shows value not restriction.

---

### Pattern 3: Contextual Feature Gate

**Flow:**
1. User clicks "AI Chat" in navigation (Premium feature)
2. Instead of 404 or error, show feature preview with upgrade prompt
3. Explain what AI chat does, show example conversation
4. CTA to start trial or upgrade
5. If trial available, let user try for 7 days

**Example (Hebrew):**
```
✨ צ'אט AI - תכנן אירועים מהר יותר

   שאל שאלות בשפה טבעית:
   • "תמצא לי אולם ל-200 איש בתל אביב"
   • "צור רשימת משימות לחתונה"
   • "הצע לוחות זמנים לכנס 3 ימים"

   AI Chat זמין בתוכנית פרימיום

   [נסה בחינם 7 ימים] [שדרג עכשיו] [למד עוד]
```

**Why this works:** User sees value before being asked to pay. 2-4x higher conversion than generic "Upgrade" button.

---

### Pattern 4: Trial Mode Activation

**Flow:**
1. User activates 7-day trial of Premium features
2. System updates organizations.trial_ends_at
3. All Premium features unlock with banner: "Premium Trial — 5 days left"
4. 2 days before trial ends, email reminder with upgrade link
5. On trial end, features revert to Base tier gracefully

**Implementation:**
```typescript
function checkFeatureAccess(feature: string, orgId: string): boolean {
  const org = getOrganization(orgId)

  // Check if in trial period
  if (org.trial_ends_at && new Date() < org.trial_ends_at) {
    return true // All features unlocked during trial
  }

  // Check tier
  if (org.tier === 'premium') {
    return true
  }

  // Base tier — check if feature is included
  return BASE_FEATURES.includes(feature)
}
```

**Why this works:** Let users experience full value before committing. Trials convert 25-40% of users to paid according to ProfitWell data.

---

## Implementation Complexity

| Component | Effort | Priority | Dependencies |
|-----------|--------|----------|--------------|
| **Schema migration** (add tier to orgs) | 1 day | P0 | None |
| **Usage tracking service** | 2 days | P0 | Organizations table |
| **Feature flag service** | 2 days | P0 | Tier schema |
| **Tier display in dashboard** | 1 day | P0 | Feature flags |
| **Usage limit enforcement** | 3 days | P0 | Usage tracking |
| **Upgrade flow UI** | 3 days | P1 | Tier schema |
| **Contextual upgrade prompts** | 2 days | P1 | Feature flags |
| **Trial mode logic** | 2 days | P1 | Feature flags |
| **Admin tier management** | 2 days | P2 | Tier schema |
| **Usage analytics dashboard** | 3 days | P2 | Usage tracking |

**Total estimated effort:** 21 days
- **P0 (Core infrastructure):** 9 days
- **P1 (User-facing upgrade):** 7 days
- **P2 (Admin tools):** 5 days

---

## Phased Rollout Plan

### Phase 1: Core Infrastructure (Week 1)
**Goal:** Enable tier checking without enforcement

1. ✅ Schema migration: add tier, tier_limits, trial_ends_at to organizations
2. ✅ Seed existing orgs with tier='premium' (grandfather all users)
3. ✅ Build usage tracking service
4. ✅ Build feature flag service
5. ✅ Add tier badge to dashboard header (all show "Premium" for now)

**Success criteria:** No user-visible changes, infrastructure ready

---

### Phase 2: Enforcement (Week 2)
**Goal:** Enforce limits, show upgrade prompts

6. ✅ Enforce event limit (check before create)
7. ✅ Enforce participant limit (check on event page)
8. ✅ Enforce message limit (check before send)
9. ✅ Gate AI features (chat, simulation, networking)
10. ✅ Gate budget features (alerts, vendor analysis)
11. ✅ Add soft limit warnings (80% notifications)

**Success criteria:** All limits enforced, existing users unaffected (still premium)

---

### Phase 3: Upgrade Flow (Week 3)
**Goal:** Enable self-service upgrades

12. ✅ Build tier comparison page (Hebrew)
13. ✅ Build upgrade modal with contextual messaging
14. ✅ Add contextual upgrade prompts throughout UI
15. ✅ Implement trial mode logic (7-day Premium trial)
16. ✅ Test upgrade flow end-to-end

**Success criteria:** New user can sign up → hit limit → view comparison → upgrade/trial

---

### Phase 4: Admin & Analytics (Week 4)
**Goal:** Internal tools for tier management

17. ✅ Build admin tier dashboard (view all orgs, tiers, usage)
18. ✅ Add manual tier override (for support/sales)
19. ✅ Build usage analytics (track conversion rates, trial success)
20. ✅ Add tier change audit log

**Success criteria:** Support team can view/modify tiers, track metrics

---

## Defer to v2.2 (Payment Integration)

**Not in scope for v2.1 SaaS tier structure:**
- Stripe/payment processor integration
- Automated billing & invoicing
- Credit card collection
- Dunning & retry logic
- Proration for mid-cycle changes
- Enterprise custom contracts
- Subscription lifecycle management

**Rationale:** Tier structure should be validated first (do users want Premium? what's the right limit?) before adding payment complexity. Can use manual tier assignment initially (sales team processes payment externally, then upgrades tier in admin panel).

**Payment integration timeline:** v2.2 (after tier validation)

---

## 2026 Best Practices Applied to EventFlow AI

| Best Practice | How We Apply It |
|--------------|-----------------|
| **3-tier maximum** | Base + Premium (Enterprise can be added later) |
| **Transparent limits** | Show "3/5 events" in dashboard, comparison table on signup |
| **Soft limits preferred** | Warn at 80%, allow to 100%, graceful message at limit |
| **Contextual prompts** | "Use AI chat to plan this event faster" not "Upgrade now" |
| **Self-service first** | One-click upgrade, no sales call required |
| **Value-based gating** | Gate AI/advanced features, not core workflow (events, participants) |
| **Avoid dark patterns** | No hidden limits, no surprise paywalls, equal button prominence |
| **Ethical design** | CPRA-compliant, transparent language, clear opt-ins |
| **Trial before purchase** | 7-day Premium trial, full feature access |
| **Graceful degradation** | Show upgrade modal, not error screens |

---

## EventFlow-Specific Considerations

### Hebrew-First UI
- All tier messaging in Hebrew (RTL layout)
- Terminology: "תוכנית בסיס" (Base), "תוכנית פרימיום" (Premium)
- Pricing in ILS (₪), not USD

### Multi-Tenant Architecture
- Tier limits per organization_id, not per user
- All users in org share the same tier
- Usage counts aggregate across all users in org

### Supabase RLS Integration
- Enforce tier checks at database level where possible
- Add RLS policy: `tier = 'premium' OR count(events) < 5`
- Prevents API bypass of tier limits

### Edge Function Secrets
- Keep tier pricing config server-side (not in frontend)
- Tier check function as Supabase Edge Function
- Prevents client-side tampering

### Offline-First Check-in
- Don't break offline check-in with tier checks
- Cache tier status locally, validate on sync
- Graceful degradation if tier check fails offline

---

## Success Metrics

How to measure if tier system is working:

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Free-to-paid conversion** | 15-25% | Users who upgrade within 30 days |
| **Trial activation rate** | 40-60% | Free users who start Premium trial |
| **Trial-to-paid conversion** | 25-40% | Trial users who upgrade before trial ends |
| **Limit hit rate** | 60-80% | Free users who hit at least one limit |
| **Upgrade prompt engagement** | 10-15% | Users who click "Learn more" on upgrade prompts |
| **Support tickets re: tiers** | <5% | Tickets about tier confusion/complaints |

**How to track:**
- Add analytics events: `tier_limit_hit`, `upgrade_prompt_shown`, `upgrade_prompt_clicked`, `trial_started`, `upgrade_completed`
- Dashboard: track conversion funnel (signup → limit hit → trial → paid)

---

## Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| **Tier structure (2-3 tiers)** | HIGH | Multiple 2026 sources confirm 3-tier maximum |
| **Transparent limits** | HIGH | CPRA enforcement, Columbia research on dark patterns |
| **Soft limits pattern** | HIGH | Industry standard, documented by Appcues, ProfitWell |
| **Contextual prompts** | HIGH | Verified by Appcues case studies, 2-4x conversion lift |
| **Usage tracking patterns** | HIGH | Standard SaaS practice, documented by WorkOS, AWS |
| **Trial conversion rates** | MEDIUM | ProfitWell data cited (25-40%), may vary by market |
| **EventFlow-specific limits** | LOW | Need to validate (5 events right limit? 200 messages?) |

---

## Open Questions for Validation

1. **Event limit validation:** Is 5 events/year the right Base limit? Or should it be 3 (more aggressive) or 10 (more generous)? → Needs user research

2. **Message limit validation:** Is 200 messages/month sufficient for Base tier? Average wedding = 100-150 guests × 5 messages = 500-750 total. Is monthly right or should it be per-event? → Needs usage data analysis

3. **Participant limit:** Is 100 participants/event right for Base? Larger than that = corporate event (should be Premium)? → Validate with target market

4. **Trial length:** Is 7 days right for event management? Events take weeks to plan, not days. Should trial be 14 or 30 days? → Test different durations

5. **Feature gate priorities:** Which features most drive upgrades? AI chat? Simulation? Networking? → Track analytics after launch

6. **Pricing:** What should Premium cost? (Not in scope for v2.1, but affects tier design) → Market research needed

---

## Sources

### High Confidence (2026 verified)

**Tier Structure & Best Practices:**
- [Feature-Based Tiers: Packaging Your Product for Maximum Revenue - 2026 Guide](https://resources.rework.com/libraries/saas-growth/feature-based-tiers)
- [The SaaS Pricing Strategy Guide for 2026: Why Usage-Based is Winning](https://www.momentumnexus.com/blog/saas-pricing-strategy-guide-2026/)
- [SaaS Pricing Trap: How Too Many Tiers Kill Conversions](https://altegon.com/insights/saas-pricing-trap/)
- [5 Common SaaS Pricing Mistakes and How to Avoid Them](https://www.getmonetizely.com/articles/5-common-saas-pricing-mistakes-and-how-to-avoid-them)

**Feature Gating & Technical Implementation:**
- [Technical Feature Gating and Code Quality Tool Pricing: How to Structure Developer Tool Tiers for SaaS Growth](https://www.getmonetizely.com/articles/technical-feature-gating-and-code-quality-tool-pricing-how-to-structure-developer-tool-tiers-for-saas-growth)
- [The developer's guide to SaaS multi-tenant architecture](https://workos.com/blog/developers-guide-saas-multi-tenant-architecture)
- [Simple Feature Flag for Multitenant applications](https://dev.to/woovi/simple-feature-flag-for-multitenant-applications-e76)

**Usage Limits & Enforcement:**
- [API Rate Limiting 2026 | How It Works & Why It Matters](https://www.levo.ai/resources/blogs/api-rate-limiting-guide-2026)
- [Freemium Model Design: Building a Free Tier That Drives Paid Conversions - 2026 Guide](https://resources.rework.com/libraries/saas-growth/freemium-model-design)
- [Scaling Freemium: Handling Growth When Your Free User Base Explodes](https://www.getmonetizely.com/articles/scaling-freemium-handling-growth-when-your-free-user-base-explodes)

**Upgrade Flows & UX:**
- [How freemium SaaS products convert users with brilliant upgrade prompts](https://www.appcues.com/blog/best-freemium-upgrade-prompts)
- [SaaS UI/UX Best Practices | High-Volume Conversions 2026](https://www.krishaweb.com/blog/saas-ui-ux-best-practices-high-volume-conversions/)
- [59 SaaS Billing UI Design Examples in 2026](https://www.saasframe.io/categories/upgrading)

**Dark Patterns & Compliance:**
- [Dark Pattern Avoidance 2026 Checklist | UX & Compliance Guide](https://secureprivacy.ai/blog/dark-pattern-avoidance-2026-checklist)
- [Top 10 Most Common Dark Patterns in UX and How to Avoid Them](https://www.netsolutions.com/insights/dark-patterns-in-ux-disadvantages/)

### Medium Confidence (Multiple community sources)
- ProfitWell research on pricing optimization (cited in multiple articles)
- Columbia University research on choice overload (cited in pricing articles)
- Appcues case studies on contextual upgrade prompts

### Internal Sources (High confidence)
- EventFlow AI existing codebase (schema.sql, organizations table)
- Supabase documentation (RLS, Edge Functions)
- Existing feature set (AI chat, simulation, networking, budget alerts)

---

## Metadata

**Research date:** 2026-02-03
**Confidence:** HIGH — Multiple 2026 sources verify tier structure best practices
**Valid until:** 2026-04-03 (60 days — SaaS pricing evolves relatively slowly)
**Researcher:** gsd-project-researcher

**Limitations:**
- No EventFlow-specific user research (would need surveys/interviews to validate limits)
- No A/B testing data (would need production deployment to test trial lengths, messaging)
- No competitor pricing data (would need market research for pricing strategy)

**Recommendation:** Tier structure design is low-risk and follows industry best practices. Start with conservative Base limits (5 events, 100 participants, 200 messages) and adjust based on usage data after launch. Defer payment integration to v2.2 to validate tier structure first.
