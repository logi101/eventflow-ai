# EventFlow AI v2.1 Roadmap

**Milestone:** v2.1 SaaS Tier Structure
**Status:** In Progress
**Timeline:** 4 weeks
**Start Date:** 2026-02-03
**Target Completion:** 2026-03-03

---

## Milestone Overview

Add Base (free) and Premium (paid) subscription tiers to EventFlow AI. Implement three-layer enforcement strategy (database RLS, Edge Functions, React Context) with transparent usage limits and graceful upgrade UX.

**Key Objectives:**
- Implement tier structure: Base (5 events, 100 participants, 200 messages) + Premium (unlimited)
- Enforce limits at database, Edge Function, and UI layers
- Gate Premium-only features: AI chat, simulation, networking, budget alerts, vendor analysis
- Provide admin controls for manual tier assignment
- Defer payment integration to v2.2

**Success Metrics:**
- 15-25% of Base users upgrade to Premium within 30 days
- 25-40% trial-to-paid conversion rate
- RLS queries <200ms, quota checks <100ms
- <5% support tickets related to tier confusion

---

## Phase Breakdown

### Phase 1: Foundation (Week 1)
**Duration:** 7 days
**Priority:** P0 (Critical)
**Goal:** Establish database foundation with tier columns, usage tracking, and RLS policies

#### Requirements
- P1.1: Database Schema: Tier Columns
- P1.2: Database Schema: Usage Counter Triggers
- P1.3: RLS Policies: Premium Feature Tables
- P1.4: Existing User Migration
- P1.5: Monthly Usage Reset Cron Job

#### Tasks

**P1.1 - Database Schema: Tier Columns**
- [ ] Create migration file `migrations/010_add_tier_columns.sql`
- [ ] Add `tier` TEXT column to `organizations` table
- [ ] Add CHECK constraint: `CHECK (tier IN ('base', 'premium', 'legacy_premium'))`
- [ ] Set default value to `'base'`
- [ ] Add `tier_limits` JSONB column with Base limits template
- [ ] Add `current_usage` JSONB column for tracking
- [ ] Add `tier_updated_at` TIMESTAMPTZ column
- [ ] Add `tier_updated_by` UUID column referencing `user_profiles(id)`
- [ ] Create index on `tier` column: `CREATE INDEX idx_organizations_tier ON organizations(tier)`
- [ ] Test migration locally with sample data
- [ ] Deploy to Supabase development
- [ ] Verify schema changes in Supabase dashboard

**Dependencies:** None
**Estimated Effort:** 4 hours

---

**P1.2 - Database Schema: Usage Counter Triggers**
- [ ] Create function `increment_event_usage()` in schema
- [ ] Create trigger `on_event_created` for AFTER INSERT on events
- [ ] Create function `increment_participant_usage()` in schema
- [ ] Create trigger `on_participant_created` for AFTER INSERT on participants
- [ ] Create function `increment_message_usage()` in schema
- [ ] Create trigger `on_message_sent` for AFTER INSERT on messages
- [ ] Test triggers with manual INSERT statements
- [ ] Verify atomic behavior with concurrent inserts (load test)
- [ ] Document trigger functions for future reference

**Dependencies:** P1.1 complete (organizations table must exist)
**Estimated Effort:** 3 hours

---

**P1.3 - RLS Policies: Premium Feature Tables**
- [ ] Create security definer function `check_org_tier(org_id UUID, required_tier TEXT)` with STABLE mark
- [ ] Create RLS policy `premium_only_simulations` on simulations table
- [ ] Create RLS policy `premium_only_ai_chat_sessions` on ai_chat_sessions table
- [ ] Create RLS policy `premium_only_vendor_analysis` on vendor_analysis table
- [ ] Test RLS policies with Base tier user (should fail)
- [ ] Test RLS policies with Premium tier user (should succeed)
- [ ] Benchmark query performance with EXPLAIN ANALYZE
- [ ] Ensure queries complete in <200ms under 100 concurrent requests

**Dependencies:** P1.1 complete (tier column must exist)
**Estimated Effort:** 4 hours

---

**P1.4 - Existing User Migration**
- [ ] Create migration script `migrations/011_migrate_existing_orgs.sql`
- [ ] Option 1: Simple migration - `UPDATE organizations SET tier = 'base' WHERE tier IS NULL`
- [ ] Option 2: Grandfathering - Mark orgs created before 2026-02-03 as `legacy_premium`
- [ ] Add `legacy_expires_at` column if grandfathering
- [ ] Create admin query to identify grandfathered orgs: `SELECT * FROM organizations WHERE tier = 'legacy_premium' AND legacy_expires_at < NOW()`
- [ ] Draft email template: Tier structure announcement
- [ ] Test migration on staging database first
- [ ] Plan deployment: Deploy column first, then run migration in non-peak hours
- [ ] Verify all organizations have tier set after migration: `SELECT COUNT(*) FROM organizations WHERE tier IS NULL` should be 0

**Dependencies:** P1.1 complete (tier column must exist)
**Estimated Effort:** 6 hours

---

**P1.5 - Monthly Usage Reset Cron Job**
- [ ] Create cron schedule: `SELECT cron.schedule('reset-monthly-limits', '0 0 1 * *', $$ ... $$)`
- [ ] Write SQL to reset `current_usage` JSONB to zero
- [ ] Update `period_start` and `period_end` for new month
- [ ] Add logging: `INSERT INTO admin_logs (action, details) VALUES ('monthly_reset', ...)`
- [ ] Test cron manually with `SELECT cron.schedule('test-reset', '*/5 * * * *', ...)`
- [ ] Verify reset happens correctly (check `current_usage` after test)
- [ ] Enable production cron after verification
- [ ] Monitor first monthly reset (February 1st or March 1st)

**Dependencies:** P1.1 complete (current_usage column must exist)
**Estimated Effort:** 2 hours

---

#### Phase 1 Acceptance Criteria
- [ ] Schema migration runs without errors on development and staging
- [ ] All existing organizations have `tier` set (no NULL values)
- [ ] New organizations default to `'base'` tier
- [ ] Usage counters increment correctly when events/participants/messages are created
- [ ] RLS policies prevent Base tier users from accessing Premium tables
- [ ] RLS queries complete in <200ms under load
- [ ] Monthly reset cron job is scheduled and tested
- [ ] Grandfathered orgs are tracked with expiration date

**Phase 1 Estimated Total Effort:** 19 hours (~3 days)

---

### Phase 2: Enforcement (Week 2)
**Duration:** 7 days
**Priority:** P0 (Critical)
**Goal:** Implement Edge Function quota validation and atomic usage increments

#### Requirements
- P2.1: Quota Check Middleware
- P2.2: Edge Function: AI Chat Tier Check
- P2.3: Edge Function: Send Reminder Tier Check
- P2.4: Edge Function: Execute AI Action Tier Check
- P2.5: Edge Function: Budget Alerts Tier Check
- P2.6: Edge Function: Vendor Analysis Tier Check
- P2.7: Soft Limit Warnings

#### Tasks

**P2.1 - Quota Check Middleware**
- [ ] Create `functions/_shared/quota-check.ts`:
  - [ ] Define `QuotaCheckResult` interface
  - [ ] Implement `checkQuota(supabaseClient, userId, quotaType)` function
  - [ ] Query `user_profiles` for `organization_id`
  - [ ] Query `organizations` for `tier`, `tier_limits`, `current_usage`
  - [ ] Implement tier check: Premium always allowed, Base checks quota
  - [ ] Calculate remaining: `limit - used`
  - [ ] Return `{ allowed, remaining, tier, resetDate }`
- [ ] Write unit tests for quota check logic
- [ ] Test with Base tier user at quota limit
- [ ] Test with Premium tier user (should always allow)
- [ ] Verify performance: completes in <100ms

**Dependencies:** P1.1 complete (organizations schema must exist)
**Estimated Effort:** 3 hours

---

**P2.2 - Edge Function: AI Chat Tier Check**
- [ ] Open `functions/ai-chat/index.ts`
- [ ] Import `checkQuota` from `_shared/quota-check.ts`
- [ ] Add quota check at function entry (after auth validation)
- [ ] If `!quota.allowed` and `tier === 'base'`:
  - [ ] Return Response with status 429
  - [ ] JSON body: `{ error: 'Quota exceeded', message: '...', upgradeUrl: '/settings/billing' }`
- [ ] After successful message, add usage increment:
  ```typescript
  await supabase.rpc('increment_usage', {
    p_org_id: organizationId,
    p_quota_type: 'ai_messages'
  });
  ```
- [ ] Test with Base tier user (should enforce quota)
- [ ] Test with Premium tier user (should allow unlimited)
- [ ] Deploy to Supabase
- [ ] Monitor logs for quota enforcement

**Dependencies:** P2.1 complete, existing ai-chat Edge Function
**Estimated Effort:** 2 hours

---

**P2.3 - Edge Function: Send Reminder Tier Check**
- [ ] Open `functions/send-reminder/index.ts`
- [ ] Import `checkQuota` from `_shared/quota-check.ts`
- [ ] Add quota check at function entry
- [ ] If `tier === 'base'` AND `messages_sent >= 200`:
  - [ ] Log: `console.log(\`Org \${orgId} hit Base tier limit, skipping reminder\`)`
  - [ ] Return Response with status 200 (don't fail silently)
  - [ ] Don't call Green API
- [ ] If `tier === 'premium'`: Proceed normally
- [ ] After successful send, increment `messages_sent` atomically
- [ ] Test with Base tier org at 200 messages (should skip)
- [ ] Test with Premium tier org (should send normally)
- [ ] Deploy to Supabase
- [ ] Verify 8 pg_cron jobs respect tier limits

**Dependencies:** P2.1 complete, existing send-reminder Edge Function
**Estimated Effort:** 2 hours

---

**P2.4 - Edge Function: Execute AI Action Tier Check**
- [ ] Open `functions/execute-ai-action/index.ts`
- [ ] Import `checkQuota` from `_shared/quota-check.ts`
- [ ] Define Premium-only actions: `['run_simulation', 'analyze_vendors', 'suggest_seating']`
- [ ] Define Base-accessible actions: `['create_event', 'search_events', 'get_event_details']`
- [ ] Add tier check at function entry
- [ ] If action is Premium-only AND `tier === 'base'`:
  - [ ] Return Response with status 403
  - [ ] JSON body: `{ error: 'Premium feature', message: '...' }`
- [ ] Update function calling: Only register Base tools if `tier === 'base'`
- [ ] Test with Base tier user trying Premium action (should fail)
- [ ] Test with Premium tier user (should succeed)
- [ ] Deploy to Supabase

**Dependencies:** P2.1 complete, existing execute-ai-action Edge Function
**Estimated Effort:** 2 hours

---

**P2.5 - Edge Function: Budget Alerts Tier Check**
- [ ] Open `functions/budget-alerts/index.ts`
- [ ] Import `checkQuota` from `_shared/quota-check.ts`
- [ ] Add tier check at function entry
- [ ] If `tier === 'base'`:
  - [ ] Return Response with status 403
  - [ ] JSON body: `{ error: 'Premium feature', message: 'Budget alerts is a Premium feature.' }`
- [ ] If `tier === 'premium'`: Proceed normally
- [ ] Deploy to Supabase
- [ ] Test Base tier access (should be blocked)
- [ ] Test Premium tier access (should work)

**Dependencies:** P2.1 complete, existing budget-alerts Edge Function
**Estimated Effort:** 1 hour

---

**P2.6 - Edge Function: Vendor Analysis Tier Check**
- [ ] Open `functions/vendor-analysis/index.ts`
- [ ] Import `checkQuota` from `_shared/quota-check.ts`
- [ ] Add tier check at function entry
- [ ] If `tier === 'base'`:
  - [ ] Return Response with status 403
  - [ ] JSON body: `{ error: 'Premium feature', message: 'Vendor analysis is a Premium feature.' }`
- [ ] If `tier === 'premium'`: Proceed normally
- [ ] Deploy to Supabase
- [ ] Test Base tier access (should be blocked)
- [ ] Test Premium tier access (should work)

**Dependencies:** P2.1 complete, existing vendor-analysis Edge Function
**Estimated Effort:** 1 hour

---

**P2.7 - Soft Limit Warnings**
- [ ] Create pg_cron job: `SELECT cron.schedule('check-soft-limits', '0 9 * * *', $$ ... $$)`
- [ ] Query all Base tier organizations
- [ ] Calculate percentage: `(current_usage->>'events_count') / (tier_limits->>'events_per_year') * 100`
- [ ] If percentage >= 80 AND `warned_this_month != true`:
  - [ ] Insert notification into `notifications` table
  - [ ] Send email via existing email function
  - [ ] Set `warned_this_month = true` in `current_usage`
- [ ] Reset `warned_this_month = false` in monthly reset cron (P1.5)
- [ ] Test with organization at 80% usage (should send warning)
- [ ] Test with organization at 90% usage (should not send duplicate warning)
- [ ] Deploy cron to production
- [ ] Monitor first warning notifications

**Dependencies:** P1.1 complete, P1.5 complete
**Estimated Effort:** 3 hours

---

#### Phase 2 Acceptance Criteria
- [ ] Quota check middleware completes in <100ms
- [ ] All 6 Edge Functions validate tier before processing
- [ ] Base tier users get 429/403 responses when quota exceeded
- [ ] Premium tier users can access unlimited resources
- [ ] Usage counters increment atomically without race conditions
- [ ] pg_cron jobs respect tier limits (send-reminder doesn't exceed quota)
- [ ] Soft limit warnings trigger at 80% usage
- [ ] No duplicate warnings in same month

**Phase 2 Estimated Total Effort:** 14 hours (~2 days)

---

### Phase 3: Feature Gating (Week 2)
**Duration:** 7 days
**Priority:** P1 (High)
**Goal:** Implement React Context for tier state and feature gating components

#### Requirements
- P3.1: Tier Context Provider
- P3.2: Feature Guard Component
- P3.3: Quota Guard Component
- P3.4: Wrap Premium Features
- P3.5: AI System Prompt with Tier Awareness
- P3.6: Central Tiers Registry

#### Tasks

**P3.1 - Tier Context Provider**
- [ ] Create `src/contexts/TierContext.tsx`:
  - [ ] Define `TierContextValue` interface
  - [ ] Create `TierContext` with createContext
  - [ ] Create `TierProvider` component
  - [ ] Fetch tier data from `organizations` table on auth
  - [ ] Use TanStack Query with 1-minute staleTime
  - [ ] Implement `canAccess(feature: string): boolean`
  - [ ] Implement `hasQuota(quotaType: string): boolean`
  - [ ] Implement `refreshQuota(): Promise<void>`
  - [ ] Export `useTier()` hook
- [ ] Write unit tests for TierContext
- [ ] Test with Base tier user data
- [ ] Test with Premium tier user data
- [ ] Verify usage data refreshes every minute

**Dependencies:** P1.1 complete (organizations schema must exist)
**Estimated Effort:** 4 hours

---

**P3.2 - Feature Guard Component**
- [ ] Create `src/components/guards/FeatureGuard.tsx`:
  - [ ] Define `FeatureGuardProps` interface
  - [ ] Import `useTier` hook
  - [ ] Check `canAccess(feature)` from context
  - [ ] If not allowed and `showUpgrade`: Render `<UpgradePrompt>`
  - [ ] If not allowed and `fallback`: Render fallback
  - [ ] If allowed: Render children
- [ ] Add TypeScript types for Premium features
- [ ] Write unit tests for FeatureGuard
- [ ] Test with Base tier (shows upgrade prompt)
- [ ] Test with Premium tier (shows children)

**Dependencies:** P3.1 complete (TierContext must exist)
**Estimated Effort:** 2 hours

---

**P3.3 - Quota Guard Component**
- [ ] Create `src/components/guards/QuotaGuard.tsx`:
  - [ ] Define `QuotaGuardProps` interface
  - [ ] Import `useTier` hook
  - [ ] Check `hasQuota(quotaType)` from context
  - [ ] Calculate remaining: `limits[quotaType] - usage[quotaType]`
  - [ ] Call `onQuotaExceeded` callback when quota hit
  - [ ] Render children with `hasQuota` and `remaining` props
- [ ] Add progress bar display
- [ ] Write unit tests for QuotaGuard
- [ ] Test with quota available (renders children)
- [ ] Test with quota exceeded (calls callback)

**Dependencies:** P3.1 complete (TierContext must exist)
**Estimated Effort:** 2 hours

---

**P3.4 - Wrap Premium Features**
- [ ] AI Chat widget: Wrap in `<FeatureGuard feature="ai_chat">`
  - [ ] File: `src/modules/ai-chat/AIChatWidget.tsx`
- [ ] Day Simulation page: Wrap in `<FeatureGuard feature="simulation">`
  - [ ] File: `src/modules/simulation/DaySimulation.tsx`
- [ ] Networking Engine: Wrap in `<FeatureGuard feature="networking">`
  - [ ] File: `src/modules/networking/NetworkingEngine.tsx`
- [ ] Budget Alerts settings: Wrap in `<FeatureGuard feature="budget_alerts">`
  - [ ] File: `src/modules/budget/BudgetAlerts.tsx`
- [ ] Vendor Analysis: Wrap in `<FeatureGuard feature="vendor_analysis">`
  - [ ] File: `src/modules/vendors/VendorAnalysis.tsx`
- [ ] Offline Check-in: Wrap in `<FeatureGuard feature="offline_checkin">`
  - [ ] File: `src/modules/checkin/OfflineCheckIn.tsx`
- [ ] Test each Premium feature with Base tier (shows upgrade prompt)
- [ ] Test each Premium feature with Premium tier (renders normally)

**Dependencies:** P3.2 complete (FeatureGuard must exist)
**Estimated Effort:** 3 hours

---

**P3.5 - AI System Prompt with Tier Awareness**
- [ ] Open `functions/ai-chat/index.ts`
- [ ] Update system prompt to include tier context:
  ```typescript
  const systemPrompt = `You are EventFlow AI assistant.

  CURRENT PLAN: ${org.tier}

  ${org.tier === 'base' ? `
  BASE PLAN LIMITATIONS:
  - You CANNOT run event simulations
  - You CANNOT analyze vendor quotes
  - You CANNOT suggest networking seating
  - You CANNOT access budget alerts

  If user requests these features, respond:
  "This feature requires Premium plan. Would you like to learn about upgrading?"
  ` : ''}
  `;
  ```
- [ ] Update function calling registration:
  - [ ] If `tier === 'base'`: Register only [`search_events`, `create_event`, `get_event_details`]
  - [ ] If `tier === 'premium'`: Register all tools including [`run_simulation`, `analyze_vendors`, `suggest_seating`]
- [ ] Test AI with Base tier user asking for Premium feature (should refuse gracefully)
- [ ] Test AI with Premium tier user (should execute all features)

**Dependencies:** P2.4 complete, P3.1 complete
**Estimated Effort:** 2 hours

---

**P3.6 - Central Tiers Registry**
- [ ] Create `src/config/tiers.ts`:
  ```typescript
  export const TIERS = {
    base: {
      features: ['events', 'participants', 'messages'],
      limits: { events: 5, participants: 100, messages: 200 }
    },
    premium: {
      features: ['events', 'participants', 'messages', 'ai', 'simulation', 'networking', 'budget_alerts', 'vendor_analysis', 'offline_checkin'],
      limits: { events: -1, participants: -1, messages: -1 }
    }
  } as const;

  export function hasFeature(tier: string, feature: string): boolean {
    return TIERS[tier]?.features.includes(feature) ?? false;
  }

  export function getTierLimits(tier: string) {
    return TIERS[tier]?.limits ?? {};
  }
  ```
- [ ] Update FeatureGuard to use `hasFeature()` helper
- [ ] Update TierContext to use `TIERS[tier].limits`
- [ ] Add code review checklist item: "Update tiers.ts"
- [ ] Document in DEVELOPMENT.md: All tier changes must update tiers.ts

**Dependencies:** None (independent)
**Estimated Effort:** 2 hours

---

#### Phase 3 Acceptance Criteria
- [ ] TierContext provides accurate tier data from organizations table
- [ ] Usage data refreshes every minute via TanStack Query cache
- [ ] `canAccess('ai_chat')` returns correct boolean per tier
- [ ] `hasQuota('messages')` returns correct boolean per tier
- [ ] FeatureGuard shows upgrade prompt for Base tier, content for Premium
- [ ] QuotaGuard displays progress and disables actions at limit
- [ ] All Premium features wrapped in FeatureGuard
- [ ] AI refuses Premium feature requests on Base tier politely
- [ ] AI executes all features on Premium tier
- [ ] tiers.ts is single source of truth for tier configuration
- [ ] Code review checklist includes "Update tiers.ts"

**Phase 3 Estimated Total Effort:** 15 hours (~2 days)

---

### Phase 4: UI/UX & Admin (Week 3-4)
**Duration:** 14 days
**Priority:** P1 (High)
**Goal:** Build user-facing tier UI, upgrade flows, and admin management tools

#### Requirements
- P4.1: Tier Badge Component
- P4.2: Usage Metrics Dashboard
- P4.3: Tier Comparison Page
- P4.4: Upgrade Modal Component
- P4.5: Trial Mode Logic
- P4.6: Admin Tier Management Panel

#### Tasks

**P4.1 - Tier Badge Component**
- [ ] Create `src/components/ui/TierBadge.tsx`:
  - [ ] Accept `tier` prop ('base' | 'premium')
  - [ ] Style Base tier: Gray badge, text "תוכנית בסיס"
  - [ ] Style Premium tier: Gold badge, text "תוכנית פרימיום"
  - [ ] Add onClick handler to navigate to `/settings/billing`
  - [ ] RTL layout: Hebrew text aligned right
- [ ] Add to header navigation: `src/components/layouts/MainLayout.tsx`
  - [ ] Place badge in top-right corner
  - [ ] Visible for all authenticated users
  - [ ] Hidden for non-authenticated users
- [ ] Test RTL rendering in browser
- [ ] Test navigation to settings page on click

**Dependencies:** P3.1 complete (TierContext must exist)
**Estimated Effort:** 2 hours

---

**P4.2 - Usage Metrics Dashboard**
- [ ] Create `src/modules/settings/UsageMetrics.tsx`:
  - [ ] Fetch usage data from TierContext
  - [ ] Display events quota: "3 / 5 אירועים השנה" (3 / 5 events this year)
  - [ ] Display participants quota: "85 / 100 משתתפים באירוע" (85 / 100 participants in event)
  - [ ] Display messages quota: "145 / 200 הודעות החודש" (145 / 200 messages this month)
  - [ ] Add progress bars for each quota with Tailwind CSS
  - [ ] Add 80% warning indicator (yellow bar)
  - [ ] Add 100% limit indicator (red bar)
  - [ ] Add "שדרג לפרימיום" (Upgrade to Premium) button
  - [ ] Set auto-refresh every 30 seconds with TanStack Query
- [ ] Ensure RTL layout for Hebrew text
- [ ] Test with Base tier user (shows limits)
- [ ] Test with Premium tier user (shows "ללא הגבלה" - no limits)
- [ ] Test progress bar accuracy

**Dependencies:** P3.1 complete
**Estimated Effort:** 4 hours

---

**P4.3 - Tier Comparison Page**
- [ ] Create `src/app/routes/settings/tiers.tsx`:
  - [ ] Fetch tier data from TierContext
  - [ ] Create comparison table with columns: Feature, Base, Premium
  - [ ] Rows:
    - [ ] אירועים (Events): Base "5 לשנה", Premium "ללא הגבלה"
    - [ ] משתתפים (Participants): Base "100 לאירוע", Premium "ללא הגבלה"
    - [ ] הודעות (Messages): Base "200 לחודש", Premium "ללא הגבלה"
    - [ ] צ'אט AI: Base "✗", Premium "✓"
    - [ ] סימולציית יום: Base "✗", Premium "✓"
    - [ ] נטוורקינג: Base "✗", Premium "✓"
    - [ ] התראות תקציב: Base "✗", Premium "✓"
    - [ ] ניתוח ספקים: Base "✗", Premium "✓"
  - [ ] Add "שדרג עכשיו" (Upgrade Now) button for Base tier users
  - [ ] Add pricing placeholder (TBA, contact for pricing)
  - [ ] RTL layout: Table aligned right, Hebrew text
- [ ] Test page loads correctly
- [ ] Test upgrade button navigation to upgrade modal
- [ ] Verify RTL rendering in browser

**Dependencies:** P3.1 complete
**Estimated Effort:** 4 hours

---

**P4.4 - Upgrade Modal Component**
- [ ] Create `src/components/billing/UpgradePrompt.tsx`:
  - [ ] Accept `feature` prop for contextual messaging
  - [ ] Display feature name in Hebrew
  - [ ] Show benefits list:
    - AI Chat: "תכנן אירועים מהר יותר עם AI" (Plan events faster with AI)
    - Simulation: "בדוק את היום של האירוע לפני שידרוג" (Test event day before it happens)
    - Networking: "חיבורים חכמים עם מנוע נטוורקינג" (Smart connections with networking engine)
  - [ ] Add "שדרג לפרימיום" (Upgrade to Premium) CTA button
  - [ ] Add "למד עוד" (Learn More) button → Tier comparison page
  - [ ] Add "לא עכשיו" (Not Now) button to dismiss modal
  - [ ] RTL layout: All text aligned right
- [ ] Integrate with FeatureGuard as fallback
- [ ] Test modal display when Premium feature accessed
- [ ] Test buttons (upgrade, learn more, dismiss)
- [ ] Test RTL rendering

**Dependencies:** P3.2 complete, P4.3 complete
**Estimated Effort:** 4 hours

---

**P4.5 - Trial Mode Logic**
- [ ] Add `trial_ends_at` TIMESTAMPTZ column to `organizations` table
- [ ] Create migration: `migrations/012_add_trial_columns.sql`
- [ ] Update RLS policies to check `trial_ends_at > NOW()` for trial access
- [ ] Update TierContext to treat trial users as Premium
- [ ] Create trial banner component: `src/components/ui/TrialBanner.tsx`
  - [ ] Display: "ניסיון פרימיום — X ימים נשארו"
  - [ ] Calculate days remaining: `Math.ceil((trialEndsAt - now) / (1000 * 60 * 60 * 24))`
  - [ ] Add "שדרג לפרימיום" button
  - [ ] RTL layout
- [ ] Create Edge Function `functions/start-trial/index.ts`:
  - [ ] Accept `organization_id` in request body
  - [ ] Set `trial_ends_at = NOW() + INTERVAL '7 days'`
  - [ ] Return success response
- [ ] Add trial button to Tier Comparison page
- [ ] Create reminder cron: 2 days before trial expiration
- [ ] Send email reminder with upgrade link
- [ ] Test trial start (user gets Premium access for 7 days)
- [ ] Test trial expiration (access revoked after 7 days)
- [ ] Test banner displays correct days remaining

**Dependencies:** P1.1 complete, P3.1 complete
**Estimated Effort:** 6 hours

---

**P4.6 - Admin Tier Management Panel**
- [ ] Create `src/app/routes/admin/tiers.tsx`:
  - [ ] Add route protection: Check user.role === 'admin'
  - [ ] Fetch all organizations from database
  - [ ] Create table with columns:
    - [ ] Organization name
    - [ ] Current tier (Base / Premium / Legacy)
    - [ ] Events used/limit
    - [ ] Participants used/limit
    - [ ] Messages used/limit
    - [ ] Tier updated at
    - [ ] Tier updated by
  - [ ] Add search/filter by organization name
  - [ ] Add pagination (20 orgs per page)
- [ ] Add tier override modal:
  - [ ] Select organization
  - [ ] Dropdown for new tier (Base / Premium)
  - [ ] Reason text field (audit trail)
  - [ ] "Update Tier" button
- [ ] Create Edge Function `functions/admin-set-tier/index.ts`:
  - [ ] Verify admin role from user_profiles
  - [ ] Use service_role to bypass RLS
  - [ ] Update `organizations` table: `tier`, `tier_updated_at`, `tier_updated_by`
  - [ ] Log audit trail to `admin_logs` table
- [ ] Test admin-only route access (non-admins blocked)
- [ ] Test tier update via admin panel
- [ ] Verify audit trail logged correctly
- [ ] RTL layout: Hebrew text aligned right

**Dependencies:** P1.1 complete, P2.1 complete
**Estimated Effort:** 6 hours

---

#### Phase 4 Acceptance Criteria
- [ ] Tier badge visible in header for all authenticated users
- [ ] Badge colors: Base (gray), Premium (gold)
- [ ] Usage dashboard displays all three quotas with progress bars
- [ ] Progress bars accurate to current usage
- [ ] 80% warning indicator displays correctly
- [ ] Tier comparison page shows all features side-by-side
- [ ] Upgrade modal shows contextual messaging per feature
- [ ] All upgrade CTAs navigate correctly
- [ ] Trial users access Premium features for 7 days
- [ ] Trial banner displays correct days remaining
- [ ] Trial expires automatically after 7 days
- [ ] Admins can view all organizations and tiers
- [ ] Admins can change tiers with audit trail
- [ ] Non-admins cannot access admin routes
- [ ] All UI elements support RTL Hebrew layout

**Phase 4 Estimated Total Effort:** 26 hours (~4 days)

---

## Critical Path

```
Phase 1 (Foundation) → Phase 2 (Enforcement) → Phase 3 (Feature Gating) → Phase 4 (UI/UX)
     (Week 1)               (Week 2)                 (Week 2)               (Weeks 3-4)
```

### Dependencies
- **Phase 2 depends on Phase 1:**
  - P2.1 (Quota Check) → P1.1 (Tier schema)
  - P2.2-P2.6 (Edge Functions) → P2.1 + P1.1
  - P2.7 (Soft Limits) → P1.1 + P1.5

- **Phase 3 depends on Phase 2:**
  - P3.1 (TierContext) → P1.1 (organizations schema)
  - P3.2 (FeatureGuard) → P3.1
  - P3.3 (QuotaGuard) → P3.1
  - P3.5 (AI Prompt) → P2.4 (Execute AI Action) + P3.1

- **Phase 4 depends on Phase 3:**
  - P4.1 (Tier Badge) → P3.1
  - P4.2-P4.4 (UI Components) → P3.1 + P3.2
  - P4.5 (Trial) → P1.1 + P3.1
  - P4.6 (Admin) → P1.1 + P2.1

### Parallel Work Opportunities
- **Phase 3 and Phase 2 overlap:** UI components (P3.2-P3.4) can be developed while Edge Functions are tested
- **Phase 4 early tasks:** P4.1 (Tier Badge) can be done in Week 2 while Phase 3 completes
- **UI/UX design work:** Tier comparison page mockups, upgrade modal designs can start in Week 1

---

## Risk Mitigation

### High-Priority Risks

**Risk 1: JSONB RLS Performance Degradation**
- **Likelihood:** HIGH
- **Impact:** CRITICAL (50-100x query slowdown)
- **Mitigation:**
  - Use dedicated `organizations.tier` TEXT column (not JSONB)
  - Add index on `tier` column
  - Use security definer functions marked STABLE
  - Benchmark queries with EXPLAIN ANALYZE before production
- **Owner:** Database Phase (P1)

**Risk 2: pg_cron Jobs Bypassing Tier Limits**
- **Likelihood:** HIGH
- **Impact:** CRITICAL (unlimited message usage for free tier)
- **Mitigation:**
  - Add tier check in `send-reminder` Edge Function (P2.3)
  - Use atomic increments to prevent race conditions
  - Monitor Green API usage vs database message counts
  - Set alert if Base tier orgs send >200 messages/month
- **Owner:** Enforcement Phase (P2)

**Risk 3: Existing User Migration Outage**
- **Likelihood:** MEDIUM
- **Impact:** CRITICAL (all users locked out)
- **Mitigation:**
  - Test migration on staging first
  - Deploy in non-peak hours
  - Have rollback plan: `UPDATE organizations SET tier = 'premium'` if issues
  - Email campaign before deployment
- **Owner:** Foundation Phase (P1)

**Risk 4: Usage Tracking Race Conditions**
- **Likelihood:** MEDIUM
- **Impact:** HIGH (5-15% overage, revenue loss)
- **Mitigation:**
  - Use atomic `UPDATE ... WHERE ... RETURNING` pattern
  - Add row locking with `FOR UPDATE` in critical sections
  - Load test with 100 concurrent operations
  - Add idempotency keys for message sends
- **Owner:** Enforcement Phase (P2)

### Medium-Priority Risks

**Risk 5: AI Promises Premium Features**
- **Likelihood:** MEDIUM
- **Impact:** HIGH (user trust damage)
- **Mitigation:**
  - Update system prompt with tier context (P3.5)
  - Gate function calling tools by tier
  - Test AI with Base tier users asking for Premium features
  - Monitor support tickets for AI-related confusion
- **Owner:** Feature Gating Phase (P3)

**Risk 6: RTL Hebrew Layout Issues**
- **Likelihood:** LOW
- **Impact:** MEDIUM (poor UX for Hebrew users)
- **Mitigation:**
  - Use Tailwind CSS RTL utilities (`dir="rtl"`)
  - Test all Phase 4 UI components with Hebrew text
  - Use Heebo font for proper Hebrew rendering
  - Test on mobile devices (iOS/Android)
- **Owner:** UI/UX Phase (P4)

---

## Success Criteria

### Phase 1 Success
- [ ] Schema migration deployed to production without errors
- [ ] All organizations have `tier` set (no NULL values)
- [ ] Usage counters increment correctly on insert
- [ ] RLS policies enforce tier restrictions
- [ ] RLS queries complete in <200ms

### Phase 2 Success
- [ ] All 6 Edge Functions validate tier before processing
- [ ] Quota checks complete in <100ms
- [ ] Base tier users get 429/403 when quota exceeded
- [ ] Premium tier users have unlimited access
- [ ] pg_cron jobs respect tier limits
- [ ] No race conditions in usage tracking

### Phase 3 Success
- [ ] TierContext provides accurate state
- [ ] FeatureGuard shows upgrade prompt for Base tier
- [ ] QuotaGuard displays usage progress
- [ ] AI refuses Premium features on Base tier
- [ ] tiers.ts is single source of truth

### Phase 4 Success
- [ ] Tier badge visible in header
- [ ] Usage dashboard displays all quotas
- [ ] Tier comparison page loads correctly
- [ ] Upgrade modal shows contextual messaging
- [ ] Trial mode works for 7 days
- [ ] Admin panel allows tier changes
- [ ] All UI supports RTL Hebrew

### Milestone Success
- [ ] 15-25% of Base users upgrade to Premium within 30 days
- [ ] 25-40% trial-to-paid conversion
- [ ] <5% support tickets for tier confusion
- [ ] RLS <200ms, quota checks <100ms
- [ ] No production outages during deployment
- [ ] All 6 Phase 1-3 risks mitigated

---

## Timeline Summary

| Week | Phase | Key Deliverables |
|-------|--------|-----------------|
| Week 1 (Feb 3-9) | Phase 1: Foundation | Database schema, triggers, RLS policies, user migration |
| Week 2 (Feb 10-16) | Phase 2: Enforcement | Quota middleware, Edge Function tier checks, soft limits |
| Week 2 (Feb 10-16) | Phase 3: Feature Gating | TierContext, FeatureGuard, QuotaGuard, AI prompt updates |
| Week 3-4 (Feb 17 - Mar 3) | Phase 4: UI/UX & Admin | Tier badge, usage dashboard, upgrade flow, admin panel |

**Total Estimated Effort:** 74 hours (~9.5 days)
**Buffer:** 20% for testing and unexpected issues
**Target Completion:** March 3, 2026

---

## Open Questions

1. **Usage Limits Validation:** Are 5 events/year, 100 participants/event, 200 messages/month the right limits? → A/B test with first 100 users
2. **Trial Duration:** Is 7 days sufficient for event planning (events take weeks)? → Test 7 vs 14 vs 30 days
3. **Grandfathering Period:** Should existing users get 6 or 12 months of legacy Premium? → Business decision based on churn risk
4. **Upgrade Messaging:** Which contextual prompts convert best? → A/B test different messaging variants
5. **Pricing:** What should Premium cost? → Market research before v2.2 payment integration

---

## Deferred to v2.2

- Stripe SDK integration
- Credit card collection UI
- Automated billing cycles
- Subscription lifecycle webhooks
- Proration for mid-tier upgrades
- Invoice generation
- Payment failure retry logic (dunning)
- Enterprise contract management

**Rationale:** Validate tier structure first (do users want Premium? are limits correct?) before adding payment complexity. Use manual tier assignment via admin panel initially.

---

*Last Updated: 2026-02-03*
*Version: 1.0*
