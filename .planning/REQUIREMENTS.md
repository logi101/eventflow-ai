# EventFlow AI v2.1 Requirements

**Milestone:** v2.1 SaaS Tier Structure
**Status:** In Progress
**Last Updated:** 2026-02-03

---

## Overview

Add Base (free) and Premium (paid) subscription tiers to EventFlow AI. Implement tier enforcement at three layers (database RLS, Edge Functions, React Context) with transparent usage limits and graceful upgrade UX. Defer payment integration to v2.2.

**Scope:**
- Tier structure: Base + Premium
- Feature gating: Premium-only features (AI chat, simulation, networking, budget alerts)
- Usage limits: Events, participants, messages per tier
- Admin controls: Manual tier assignment
- **Out of scope:** Payment processing, Stripe integration (v2.2)

---

## Phase 1: Foundation (Week 1)

### P1.1 Database Schema: Tier Columns
**Priority:** P0 (Critical)
**Description:** Extend `organizations` table with tier information, usage tracking, and limits.

**Requirements:**
- [ ] Add `tier` TEXT column with CHECK constraint: `CHECK (tier IN ('base', 'premium', 'legacy_premium'))`
- [ ] Set default value to `'base'` for new organizations
- [ ] Add `tier_limits` JSONB column storing limits per tier:
  ```json
  {
    "events_per_year": 5,
    "participants_per_event": 100,
    "messages_per_month": 200
  }
  ```
- [ ] Add `current_usage` JSONB column tracking consumption:
  ```json
  {
    "events_count": 0,
    "participants_count": 0,
    "messages_sent": 0,
    "period_start": "2026-02-01T00:00:00Z",
    "period_end": "2026-03-01T00:00:00Z"
  }
  ```
- [ ] Add `tier_updated_at` TIMESTAMPTZ column
- [ ] Add `tier_updated_by` UUID column referencing `user_profiles(id)` for audit trail
- [ ] Create index on `tier` column for RLS performance

**Acceptance Criteria:**
- Schema migration runs without errors
- New organizations default to `'base'` tier
- All existing organizations have `tier` set (no NULL values)

---

### P1.2 Database Schema: Usage Counter Triggers
**Priority:** P0 (Critical)
**Description:** Create PostgreSQL triggers to auto-increment usage counters when events/participants/messages are created.

**Requirements:**
- [ ] Create trigger `on_event_created` that increments `organizations.current_usage->'events_count'`
- [ ] Create trigger `on_participant_created` that increments `organizations.current_usage->'participants_count'`
- [ ] Create trigger `on_message_sent` that increments `organizations.current_usage->'messages_sent'`
- [ ] Use `AFTER INSERT` to ensure data integrity
- [ ] Handle concurrent inserts with atomic operations

**Acceptance Criteria:**
- Creating an event increments `events_count` by 1
- Creating a participant increments `participants_count` by 1
- Sending a message increments `messages_sent` by 1
- No race conditions under concurrent load

---

### P1.3 RLS Policies: Premium Feature Tables
**Priority:** P0 (Critical)
**Description:** Add tier-aware RLS policies to restrict Premium-only tables to Premium organizations.

**Requirements:**
- [ ] Create RLS policy on `simulations` table: `organizations.tier = 'premium'`
- [ ] Create RLS policy on `ai_chat_sessions` table: `organizations.tier = 'premium'`
- [ ] Create RLS policy on `vendor_analysis` table: `organizations.tier = 'premium'`
- [ ] Create security definer function `check_org_tier(org_id UUID, required_tier TEXT)` for performance
- [ ] Mark function as `STABLE` for query optimizer caching

**Acceptance Criteria:**
- Base tier users cannot query/insert Premium feature tables
- Premium tier users can access all tables
- RLS queries complete in <200ms under load

---

### P1.4 Existing User Migration
**Priority:** P0 (Critical)
**Description:** Migrate existing users to Base tier with grandfathering option for long-term users.

**Requirements:**
- [ ] Create migration script to set `tier = 'base'` for all existing organizations
- [ ] Option 1: Simple migration → All orgs set to `'base'`
- [ ] Option 2: Grandfathering → Orgs created before 2026-02-03 set to `'legacy_premium'` for 6 months
- [ ] Add `legacy_expires_at` TIMESTAMPTZ for grandfathered orgs
- [ ] Create admin query to identify grandfathered orgs approaching expiration
- [ ] Email campaign template: Tier structure announcement

**Acceptance Criteria:**
- All existing organizations have tier set after migration
- No production outages during deployment
- Legacy Premium orgs tracked separately for expiration

---

### P1.5 Monthly Usage Reset Cron Job
**Priority:** P1 (High)
**Description:** Create pg_cron job to reset usage counters monthly.

**Requirements:**
- [ ] Schedule cron to run on 1st of each month at 00:00 UTC
- [ ] Reset `current_usage` JSONB to zero:
  ```json
  {
    "events_count": 0,
    "participants_count": 0,
    "messages_sent": 0,
    "period_start": "2026-03-01T00:00:00Z",
    "period_end": "2026-04-01T00:00:00Z"
  }
  ```
- [ ] Keep `period_start` and `period_end` accurate
- [ ] Add logging for reset operations

**Acceptance Criteria:**
- Usage counters reset to zero on 1st of month
- Premium tier orgs (unlimited) also reset for consistency

---

## Phase 2: Enforcement (Week 2)

### P2.1 Quota Check Middleware
**Priority:** P0 (Critical)
**Description:** Create reusable Edge Function utility for checking tier and quota.

**Requirements:**
- [ ] Create `functions/_shared/quota-check.ts`:
  - `checkQuota(supabaseClient, userId, quotaType)` function
  - Returns `{ allowed: boolean, remaining: number, tier: string, resetDate: string }`
  - Queries `organizations` table for tier and usage
  - Checks `current_usage` against `tier_limits`
  - Always allows Premium tier (`tier === 'premium'`)
- [ ] Support quota types: `'events'`, `'participants'`, `'messages'`, `'ai_messages'`
- [ ] Return 429 status if quota exceeded
- [ ] Include `upgradeUrl` and `resetDate` in error response

**Acceptance Criteria:**
- Quota check completes in <100ms
- Premium tier always returns `allowed: true`
- Base tier enforces limits correctly

---

### P2.2 Edge Function: AI Chat Tier Check
**Priority:** P0 (Critical)
**Description:** Add tier validation to `ai-chat` Edge Function before processing.

**Requirements:**
- [ ] Add quota check at function entry
- [ ] If `quota.allowed === false` and `tier === 'base'`:
  - Return 429 status
  - Error message: "AI chat is a Premium feature. Upgrade to access."
  - Include upgrade URL
- [ ] After successful message, increment `ai_messages_sent` counter
- [ ] Use atomic increment: `UPDATE organizations SET current_usage->>'ai_messages_sent' = current_usage->>'ai_messages_sent' + 1 WHERE id = $1`

**Acceptance Criteria:**
- Base tier users get 429 when quota exceeded
- Premium tier users can send unlimited AI messages
- Usage counter increments atomically

---

### P2.3 Edge Function: Send Reminder Tier Check
**Priority:** P0 (Critical)
**Description:** Add tier validation to `send-reminder` Edge Function to prevent pg_cron bypass.

**Requirements:**
- [ ] Add quota check at function entry
- [ ] If `tier === 'base'` AND `messages_sent >= 200`:
  - Skip sending reminder (don't fail, don't send)
  - Log: "Org ${orgId} hit message limit, skipping reminder"
  - Return success silently
- [ ] If `tier === 'premium'`: Send normally
- [ ] Increment `messages_sent` counter atomically

**Acceptance Criteria:**
- Base tier orgs don't send >200 messages/month via cron
- Premium tier orgs unlimited
- No production errors from quota enforcement

---

### P2.4 Edge Function: Execute AI Action Tier Check
**Priority:** P0 (Critical)
**Description:** Add tier validation to `execute-ai-action` for Premium-only operations.

**Requirements:**
- [ ] Check action type:
  - `run_simulation`: Premium only
  - `analyze_vendors`: Premium only
  - `suggest_seating`: Premium only
  - `create_event`: All tiers
  - `search_events`: All tiers
- [ ] If Premium-only action AND `tier === 'base'`:
  - Return 403 status
  - Error message: "This action requires Premium plan"
- [ ] Register only Base-accessible tools in function calling if `tier === 'base'`

**Acceptance Criteria:**
- Base tier users cannot execute Premium-only actions
- Function calling tool list adapts to tier

---

### P2.5 Edge Function: Budget Alerts Tier Check
**Priority:** P1 (High)
**Description:** Add tier validation to `budget-alerts` Edge Function.

**Requirements:**
- [ ] Add quota check at function entry
- [ ] If `tier === 'base'`:
  - Return 403 status
  - Error message: "Budget alerts is a Premium feature"
- [ ] If `tier === 'premium'`: Process normally

**Acceptance Criteria:**
- Base tier users cannot access budget alerts
- Premium tier users can configure budget alerts

---

### P2.6 Edge Function: Vendor Analysis Tier Check
**Priority:** P1 (High)
**Description:** Add tier validation to `vendor-analysis` Edge Function.

**Requirements:**
- [ ] Add quota check at function entry
- [ ] If `tier === 'base'`:
  - Return 403 status
  - Error message: "Vendor analysis is a Premium feature"
- [ ] If `tier === 'premium'`: Process normally

**Acceptance Criteria:**
- Base tier users cannot access vendor analysis
- Premium tier users can analyze vendor quotes

---

### P2.7 Soft Limit Warnings
**Priority:** P1 (High)
**Description:** Send notifications when users approach limits (80% threshold).

**Requirements:**
- [ ] Create pg_cron job to check usage daily
- [ ] Calculate percentage: `(current / limit) * 100`
- [ ] If percentage >= 80 AND not yet warned this month:
  - Send in-app notification
  - Send email notification
  - Log warning in `notifications` table
  - Mark as `warned_this_month = true` in `current_usage`
- [ ] Warning message (Hebrew): "הגעת ל-80% מהמגבלה החודשית שלך. שדרג לפרימיום עבור גישה ללא הגבלה."

**Acceptance Criteria:**
- Users receive warning at 80% usage
- No duplicate warnings in same month

---

## Phase 3: Feature Gating (Week 2)

### P3.1 Tier Context Provider
**Priority:** P1 (High)
**Description:** Create React Context for global tier state management.

**Requirements:**
- [ ] Create `src/contexts/TierContext.tsx`:
  ```typescript
  interface TierContextValue {
    tier: 'base' | 'premium' | null;
    loading: boolean;
    canAccess: (feature: string) => boolean;
    hasQuota: (quotaType: string) => boolean;
    usage: UsageMetrics | null;
    limits: TierLimits | null;
    refreshQuota: () => Promise<void>;
  }
  ```
- [ ] Fetch tier data from `organizations` table on auth
- [ ] Use TanStack Query with 1-minute stale time for usage data
- [ ] Provide `canAccess('ai_chat')` helper function
- [ ] Provide `hasQuota('messages')` helper function
- [ ] Wrap `<App />` in `<TierProvider>`

**Acceptance Criteria:**
- Context provides accurate tier data
- Usage data refreshes every minute
- Helper functions return correct boolean values

---

### P3.2 Feature Guard Component
**Priority:** P1 (High)
**Description:** Create reusable component to wrap Premium features with upgrade prompts.

**Requirements:**
- [ ] Create `src/components/guards/FeatureGuard.tsx`:
  ```typescript
  interface FeatureGuardProps {
    feature: 'ai_chat' | 'simulation' | 'networking' | 'budget_alerts' | 'vendor_analysis';
    fallback?: ReactNode;
    showUpgrade?: boolean;
    children: ReactNode;
  }
  ```
- [ ] Check `canAccess(feature)` from TierContext
- [ ] If not allowed and `showUpgrade`: Render `<UpgradePrompt>`
- [ ] If not allowed and `fallback`: Render fallback
- [ ] If allowed: Render children

**Acceptance Criteria:**
- Base tier users see upgrade prompt instead of Premium features
- Premium tier users see content normally
- Fallback renders when provided

---

### P3.3 Quota Guard Component
**Priority:** P1 (High)
**Description:** Create component to display quota status and disable actions when exceeded.

**Requirements:**
- [ ] Create `src/components/guards/QuotaGuard.tsx`:
  ```typescript
  interface QuotaGuardProps {
    quotaType: 'events' | 'participants' | 'messages';
    onQuotaExceeded?: () => void;
    children: (hasQuota: boolean, remaining: number) => ReactNode;
  }
  ```
- [ ] Check `hasQuota(quotaType)` from TierContext
- [ ] Calculate remaining: `limit - used`
- [ ] Call `onQuotaExceeded` when quota hit
- [ ] Render children with `hasQuota` and `remaining` props

**Acceptance Criteria:**
- Buttons disabled when quota exceeded
- Progress shows "X / Y remaining"
- `onQuotaExceeded` callback triggers at limit

---

### P3.4 Wrap Premium Features
**Priority:** P1 (High)
**Description:** Apply FeatureGuard to all Premium features in the application.

**Requirements:**
- [ ] Wrap AI Chat widget in `<FeatureGuard feature="ai_chat">`
- [ ] Wrap Day Simulation page in `<FeatureGuard feature="simulation">`
- [ ] Wrap Networking Engine in `<FeatureGuard feature="networking">`
- [ ] Wrap Budget Alerts settings in `<FeatureGuard feature="budget_alerts">`
- [ ] Wrap Vendor Analysis in `<FeatureGuard feature="vendor_analysis">`

**Acceptance Criteria:**
- Base tier users see upgrade prompt for all Premium features
- Premium tier users access all features

---

### P3.5 AI System Prompt with Tier Awareness
**Priority:** P1 (High)
**Description:** Update AI chat system prompt to include tier context and feature limitations.

**Requirements:**
- [ ] Add tier context to system prompt:
  ```
  CURRENT PLAN: ${tier}

  ${tier === 'base' ? `
  BASE PLAN LIMITATIONS:
  - You CANNOT run event simulations
  - You CANNOT analyze vendor quotes
  - You CANNOT suggest networking seating
  - You CANNOT access budget alerts

  If user requests these features, respond:
  "This feature requires Premium plan. Would you like to learn about upgrading?"
  ` : ''}
  ```
- [ ] Update function calling: Only register Base-accessible tools if `tier === 'base'`
- [ ] Base-accessible tools: `search_events`, `create_event`, `get_event_details`
- [ ] Premium tools: `run_simulation`, `analyze_vendors`, `suggest_seating`, `get_budget_alerts`

**Acceptance Criteria:**
- Base tier AI refuses Premium feature requests politely
- Premium tier AI can access all features

---

### P3.6 Central Tiers Registry
**Priority:** P2 (Medium)
**Description:** Create centralized configuration file for tier definitions to prevent sprawl.

**Requirements:**
- [ ] Create `src/config/tiers.ts`:
  ```typescript
  export const TIERS = {
    base: {
      features: ['events', 'participants', 'messages'],
      limits: { events: 5, participants: 100, messages: 200 }
    },
    premium: {
      features: ['events', 'participants', 'messages', 'ai', 'simulation', 'networking', 'budget_alerts', 'vendor_analysis'],
      limits: { events: -1, participants: -1, messages: -1 }
    }
  } as const;

  export function hasFeature(tier: string, feature: string): boolean {
    return TIERS[tier]?.features.includes(feature) ?? false;
  }
  ```
- [ ] Update FeatureGuard to use `hasFeature()` helper
- [ ] Update TierContext to use `TIERS[tier].limits`
- [ ] Document that all tier changes must update this file

**Acceptance Criteria:**
- Single source of truth for tier configuration
- Code review checklist includes "Update tiers.ts"

---

## Phase 4: UI/UX & Admin (Week 3-4)

### P4.1 Tier Badge Component
**Priority:** P1 (High)
**Description:** Display current tier badge in header/navigation.

**Requirements:**
- [ ] Create `src/components/ui/TierBadge.tsx`
- [ ] Display "Base" or "Premium" label
- [ ] Style with color coding: Base (gray), Premium (gold)
- [ ] Click to navigate to settings/billing page
- [ ] Hebrew text: "תוכנית בסיס" / "תוכנית פרימיום"

**Acceptance Criteria:**
- Badge visible in header for all authenticated users
- RTL layout correct for Hebrew

---

### P4.2 Usage Metrics Dashboard
**Priority:** P1 (High)
**Description:** Create settings page showing usage quotas and limits.

**Requirements:**
- [ ] Create `src/modules/settings/UsageMetrics.tsx`:
  - Display events used/limit: "3 / 5 events this year"
  - Display participants used/limit: "85 / 100 participants this event"
  - Display messages used/limit: "145 / 200 messages this month"
  - Progress bars for each quota
  - 80% warning indicator
  - Upgrade button when near limit
- [ ] Refresh data every 30 seconds
- [ ] Hebrew labels for all text

**Acceptance Criteria:**
- Users can see all current usage
- Progress bars visually accurate
- Hebrew RTL layout correct

---

### P4.3 Tier Comparison Page
**Priority:** P1 (High)
**Description:** Create comparison page showing Base vs Premium features.

**Requirements:**
- [ ] Create `src/app/routes/settings/tiers.tsx`
- [ ] Side-by-side comparison table:
  - Features: Event limit, Participant limit, Messages, AI Chat, Simulation, Networking, Budget Alerts
  - Base column: Show limits or "✗" for Premium features
  - Premium column: "ללא הגבלה" or "✓"
- [ ] Upgrade button for Base tier users
- [ ] CTA: "שדרג עכשיו" (Upgrade Now)
- [ ] Full RTL Hebrew layout

**Acceptance Criteria:**
- Clear comparison of all features
- Upgrade flow accessible from page

---

### P4.4 Upgrade Modal Component
**Priority:** P1 (High)
**Description:** Create modal for upgrading to Premium with contextual messaging.

**Requirements:**
- [ ] Create `src/components/billing/UpgradePrompt.tsx`:
  - Show feature being upgraded (contextual)
  - Explain benefits: "Get unlimited events, AI chat, simulation, and more"
  - CTA: "שדרג לפרימיום" (Upgrade to Premium)
  - Secondary: "למד עוד" (Learn More) → Tier comparison page
- [ ] Different messaging per feature:
  - AI Chat: "תכנן אירועים מהר יותר עם AI"
  - Simulation: "בדוק את היום של האירוע לפני שידרוג"
  - Networking: "חיבורים חכמים עם מנוע נטוורקינג"
- [ ] RTL Hebrew layout

**Acceptance Criteria:**
- Contextual upgrade prompts shown when Premium features accessed
- Modal dismissible with "לא עכשיו" (Not now) button

---

### P4.5 Trial Mode Logic
**Priority:** P2 (Medium)
**Description:** Add 7-day Premium trial feature.

**Requirements:**
- [ ] Add `trial_ends_at` TIMESTAMPTZ column to `organizations`
- [ ] Update RLS policies to check `trial_ends_at > NOW()` for trial access
- [ ] Update TierContext to treat trial as Premium
- [ ] Show trial banner: "ניסיון פרימיום — 5 ימים נשארו"
- [ ] Create Edge Function to start trial: `start-trial.ts`
- [ ] Send trial reminder 2 days before expiration

**Acceptance Criteria:**
- Trial users access Premium features for 7 days
- Banner shows correct days remaining
- Trial expires automatically

---

### P4.6 Admin Tier Management Panel
**Priority:** P2 (Medium)
**Description:** Create admin interface for viewing and modifying organization tiers.

**Requirements:**
- [ ] Create `src/app/routes/admin/tiers.tsx` (admin-only route)
- [ ] Table showing:
  - Organization name
  - Current tier
  - Usage metrics
  - `tier_updated_at`
  - `tier_updated_by`
- [ ] Actions:
  - Manual tier override dropdown
  - Reason text field (audit trail)
  - "Update Tier" button
- [ ] Require admin role to access route
- [ ] Use `admin-set-tier` Edge Function for updates

**Acceptance Criteria:**
- Admins can view all organizations
- Admins can change tiers with audit trail
- Non-admins cannot access route

---

## Non-Functional Requirements

### Performance
- [ ] RLS tier checks complete in <200ms under 100 concurrent requests
- [ ] Quota check Edge Functions complete in <100ms
- [ ] TierContext fetch completes in <500ms

### Security
- [ ] Service role keys used only in Edge Functions, never exposed to frontend
- [ ] All tier checks enforced at Edge Function layer (not just frontend)
- [ ] RLS policies prevent unauthorized access to Premium tables
- [ ] Audit trail tracks all tier changes

### Accessibility
- [ ] All tier-related UI elements support RTL Hebrew
- [ ] Keyboard navigation works for upgrade modals
- [ ] Screen reader announces tier badge and status

### Reliability
- [ ] No race conditions in usage counters under concurrent load
- [ ] Usage resets happen reliably on 1st of month
- [ ] Grandfathered orgs automatically downgrade after expiration

## Deferred to v2.2 (Payment Integration)

### Out of Scope
- [ ] Stripe SDK integration
- [ ] Credit card collection UI
- [ ] Automated billing cycles
- [ ] Subscription lifecycle webhooks
- [ ] Proration for mid-tier upgrades
- [ ] Invoice generation
- [ ] Payment failure retry logic (dunning)
- [ ] Enterprise contract management

### Rationale
Validate tier structure first (do users want Premium? are limits correct?) before adding payment complexity. Use manual tier assignment via admin panel initially.

## Success Metrics

- [ ] **Tier adoption:** 15-25% of Base users upgrade to Premium within 30 days
- [ ] **Trial conversion:** 25-40% of trial users upgrade to paid
- [ ] **Limit hit rate:** 60-80% of Base users hit at least one limit
- [ ] **Performance:** RLS queries <200ms, quota checks <100ms
- [ ] **Support tickets:** <5% tickets related to tier confusion

## Open Questions

1. **Usage limits validation:** Are 5 events/year, 100 participants/event, 200 messages/month the right limits for Hebrew-speaking event managers?
2. **Trial duration:** Should trial be 7, 14, or 30 days? Events take weeks to plan.
3. **Grandfathering period:** Should existing users get 6 or 12 months of legacy Premium?
4. **Upgrade messaging:** Which contextual prompts convert best? (A/B test needed)
