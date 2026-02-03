# Architecture Patterns: SaaS Tier Structure Integration

**Domain:** Multi-tenant Event Management SaaS
**Researched:** 2026-02-03
**Confidence:** HIGH

## Executive Summary

Integrating SaaS tier structure into EventFlow AI's existing Supabase multi-tenant architecture requires a **three-layer enforcement strategy**: database-level (RLS policies), application-level (Edge Functions), and presentation-level (React Context). The existing `organizations` table is the natural anchor point for tier information, and the established RLS pattern using `auth.user_org_id()` provides a foundation for tier-based feature gating.

**Key Principle:** Never rely on frontend enforcement alone. Tier limits must be enforced at the database and Edge Function layers for security.

## Recommended Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     React Frontend                           │
│  ┌──────────────┐  ┌─────────────────┐  ┌───────────────┐  │
│  │ Tier Context │→ │ Feature Guards  │→ │  UI Components│  │
│  │ (useOrgTier) │  │ (conditional)   │  │  (gated)      │  │
│  └──────────────┘  └─────────────────┘  └───────────────┘  │
└─────────────────────┬──────────────────────────────────────┘
                      │
                      ↓ Supabase Client (anon_key)
┌─────────────────────────────────────────────────────────────┐
│              Supabase Edge Functions                         │
│  ┌──────────────────────────────────────────────────────────┤
│  │ Quota Enforcement (before processing)                    │
│  │  - Check org tier from JWT app_metadata                  │
│  │  - Query usage counters                                  │
│  │  - Return 429 if quota exceeded                          │
│  └──────────────────────────────────────────────────────────┤
└─────────────────────┬──────────────────────────────────────┘
                      │
                      ↓ service_role_key or RLS
┌─────────────────────────────────────────────────────────────┐
│              PostgreSQL + RLS Policies                       │
│  ┌──────────────────────────────────────────────────────────┤
│  │ organizations table (tier column)                        │
│  │  - tier: 'base' | 'premium'                              │
│  │  - tier_limits: JSONB (events_per_month, etc)            │
│  │  - current_usage: JSONB (events_count, etc)              │
│  └──────────────────────────────────────────────────────────┤
│  │ RLS Policies (tier-aware)                                │
│  │  - Premium features tables check tier                    │
│  │  - Quota checks via computed columns                     │
│  └──────────────────────────────────────────────────────────┤
└─────────────────────────────────────────────────────────────┘
```

### Data Flow for Tier Enforcement

**Scenario: User creates a new event**

1. **Frontend**: React component checks `useOrgTier()` context
   - If base tier + quota reached → Show upgrade modal
   - If premium or quota available → Allow form submission

2. **Edge Function** (optional validation layer):
   - Extract `tier` from JWT `app_metadata`
   - Query `organizations.current_usage` and `tier_limits`
   - If quota exceeded → `return 429 Too Many Requests`
   - If allowed → Proceed to database insert

3. **Database RLS**:
   - `INSERT` policy checks organization tier via `auth.user_org_id()`
   - Computed trigger increments `organizations.current_usage`
   - Row inserted only if policy passes

4. **Frontend Response**:
   - Success → Update UI, refresh context
   - Quota exceeded → Display upgrade prompt

## Integration Points with Existing Architecture

### 1. Database Layer (HIGH Priority - Build First)

**Modify:** `organizations` table (schema.sql)

```sql
-- Add tier columns to existing organizations table
ALTER TABLE organizations
ADD COLUMN tier TEXT DEFAULT 'base' CHECK (tier IN ('base', 'premium')),
ADD COLUMN tier_limits JSONB DEFAULT '{
  "events_per_month": 3,
  "participants_per_event": 50,
  "whatsapp_messages_per_month": 100,
  "ai_chat_messages_per_month": 50,
  "premium_features": {
    "qr_checkin": false,
    "vendor_management": false,
    "feedback_surveys": false,
    "calendar_sync": false
  }
}',
ADD COLUMN current_usage JSONB DEFAULT '{
  "events_count": 0,
  "participants_count": 0,
  "whatsapp_sent": 0,
  "ai_messages_sent": 0,
  "period_start": null,
  "period_end": null
}',
ADD COLUMN tier_updated_at TIMESTAMPTZ;

-- Update premium tier limits template
-- (Applied when org upgrades to premium)
COMMENT ON COLUMN organizations.tier_limits IS
'Premium limits: {
  "events_per_month": 999999,
  "participants_per_event": 999999,
  "whatsapp_messages_per_month": 999999,
  "ai_chat_messages_per_month": 999999,
  "premium_features": {
    "qr_checkin": true,
    "vendor_management": true,
    "feedback_surveys": true,
    "calendar_sync": true
  }
}';
```

**New:** Usage counter triggers

```sql
-- Increment event count on event creation
CREATE OR REPLACE FUNCTION increment_org_event_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE organizations
  SET current_usage = jsonb_set(
    current_usage,
    '{events_count}',
    to_jsonb(COALESCE((current_usage->>'events_count')::int, 0) + 1)
  )
  WHERE id = NEW.organization_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER event_created_increment_usage
AFTER INSERT ON events
FOR EACH ROW
EXECUTE FUNCTION increment_org_event_count();

-- Similar triggers for participants, messages, ai_chat_messages
```

**New:** Tier-aware RLS policies (extends existing patterns)

```sql
-- Example: Restrict premium features table to premium orgs
CREATE POLICY "Premium orgs only"
ON vendor_management FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM organizations
    WHERE id = auth.user_org_id()
    AND tier = 'premium'
  )
);

-- Example: Quota enforcement via RLS (soft limit warning)
-- Note: Hard enforcement should happen in Edge Functions
CREATE POLICY "Warn on quota exceeded"
ON events FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organizations o
    WHERE o.id = auth.user_org_id()
    AND (
      o.tier = 'premium'  -- Premium = unlimited
      OR (o.current_usage->>'events_count')::int < (o.tier_limits->>'events_per_month')::int
    )
  )
);
```

### 2. Edge Functions Layer (MEDIUM Priority - Build Second)

**Modify:** Existing Edge Functions (ai-chat, send-whatsapp, send-reminder)

**Pattern:** Quota check middleware

```typescript
// functions/_shared/quota-check.ts
interface QuotaCheckResult {
  allowed: boolean;
  remaining?: number;
  resetDate?: string;
  tier: 'base' | 'premium';
}

export async function checkQuota(
  supabaseClient: SupabaseClient,
  userId: string,
  quotaType: 'events' | 'whatsapp_messages' | 'ai_messages'
): Promise<QuotaCheckResult> {
  // 1. Get organization from user_profiles
  const { data: profile } = await supabaseClient
    .from('user_profiles')
    .select('organization_id')
    .eq('id', userId)
    .single();

  if (!profile) throw new Error('User profile not found');

  // 2. Get tier and usage from organizations
  const { data: org } = await supabaseClient
    .from('organizations')
    .select('tier, tier_limits, current_usage')
    .eq('id', profile.organization_id)
    .single();

  if (!org) throw new Error('Organization not found');

  // 3. Premium = always allowed
  if (org.tier === 'premium') {
    return { allowed: true, tier: 'premium' };
  }

  // 4. Base tier: check quota
  const limitKey = quotaType === 'events'
    ? 'events_per_month'
    : quotaType === 'whatsapp_messages'
    ? 'whatsapp_messages_per_month'
    : 'ai_chat_messages_per_month';

  const usageKey = quotaType === 'events'
    ? 'events_count'
    : quotaType === 'whatsapp_messages'
    ? 'whatsapp_sent'
    : 'ai_messages_sent';

  const limit = org.tier_limits[limitKey];
  const used = org.current_usage[usageKey] || 0;

  return {
    allowed: used < limit,
    remaining: Math.max(0, limit - used),
    resetDate: org.current_usage.period_end,
    tier: 'base'
  };
}
```

**Modify:** ai-chat.ts (example integration)

```typescript
// Before existing logic
const quota = await checkQuota(supabaseClient, userId, 'ai_messages');

if (!quota.allowed) {
  return new Response(
    JSON.stringify({
      error: 'Quota exceeded',
      message: 'You have reached your AI chat message limit for this month.',
      tier: quota.tier,
      resetDate: quota.resetDate,
      upgradeUrl: '/settings/billing'
    }),
    { status: 429, headers: { 'Content-Type': 'application/json' } }
  );
}

// Existing ai-chat logic...

// After successful message, increment counter
await incrementUsage(supabaseClient, profile.organization_id, 'ai_messages');
```

### 3. Frontend Layer (MEDIUM Priority - Build Third)

**New:** Tier Context Provider

```typescript
// src/contexts/TierContext.tsx
interface OrgTier {
  tier: 'base' | 'premium';
  limits: {
    eventsPerMonth: number;
    participantsPerEvent: number;
    whatsappMessagesPerMonth: number;
    aiChatMessagesPerMonth: number;
    premiumFeatures: {
      qrCheckin: boolean;
      vendorManagement: boolean;
      feedbackSurveys: boolean;
      calendarSync: boolean;
    };
  };
  usage: {
    eventsCount: number;
    participantsCount: number;
    whatsappSent: number;
    aiMessagesSent: number;
    periodEnd: string | null;
  };
  canUseFeature: (feature: string) => boolean;
  hasQuota: (quotaType: string) => boolean;
}

export function TierProvider({ children }: { children: React.ReactNode }) {
  const { data: org, isLoading } = useQuery({
    queryKey: ['organization-tier'],
    queryFn: async () => {
      const { data } = await supabase
        .from('organizations')
        .select('tier, tier_limits, current_usage')
        .eq('id', user.organization_id)
        .single();
      return data;
    }
  });

  const value: OrgTier = {
    tier: org?.tier || 'base',
    limits: org?.tier_limits || defaultBaseLimits,
    usage: org?.current_usage || defaultUsage,
    canUseFeature: (feature: string) => {
      if (org?.tier === 'premium') return true;
      return org?.tier_limits?.premium_features?.[feature] === true;
    },
    hasQuota: (quotaType: string) => {
      if (org?.tier === 'premium') return true;
      const key = quotaTypeToUsageKey(quotaType);
      return (org?.current_usage?.[key] || 0) < (org?.tier_limits?.[key] || 0);
    }
  };

  return <TierContext.Provider value={value}>{children}</TierContext.Provider>;
}

export function useOrgTier() {
  return useContext(TierContext);
}
```

**New:** Feature Guard Components

```typescript
// src/components/guards/FeatureGuard.tsx
interface FeatureGuardProps {
  feature: 'qr_checkin' | 'vendor_management' | 'feedback_surveys' | 'calendar_sync';
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function FeatureGuard({ feature, fallback, children }: FeatureGuardProps) {
  const { canUseFeature, tier } = useOrgTier();

  if (!canUseFeature(feature)) {
    return fallback || <UpgradePrompt feature={feature} tier={tier} />;
  }

  return <>{children}</>;
}

// Usage in components
<FeatureGuard feature="vendor_management">
  <VendorManagementTab />
</FeatureGuard>
```

**New:** Quota Guard Components

```typescript
// src/components/guards/QuotaGuard.tsx
interface QuotaGuardProps {
  quotaType: 'events' | 'whatsapp_messages' | 'ai_messages';
  onQuotaExceeded?: () => void;
  children: (hasQuota: boolean, remaining: number) => React.ReactNode;
}

export function QuotaGuard({ quotaType, onQuotaExceeded, children }: QuotaGuardProps) {
  const { hasQuota, usage, limits, tier } = useOrgTier();

  const remaining = tier === 'premium'
    ? Infinity
    : limits[quotaType] - (usage[quotaType] || 0);

  const allowed = hasQuota(quotaType);

  useEffect(() => {
    if (!allowed && onQuotaExceeded) {
      onQuotaExceeded();
    }
  }, [allowed]);

  return <>{children(allowed, remaining)}</>;
}

// Usage in create event flow
<QuotaGuard quotaType="events">
  {(hasQuota, remaining) => (
    <Button disabled={!hasQuota}>
      Create Event {hasQuota && `(${remaining} left)`}
    </Button>
  )}
</QuotaGuard>
```

### 4. New Components Needed

| Component | Location | Purpose | Depends On |
|-----------|----------|---------|------------|
| `TierContext.tsx` | `src/contexts/` | Global tier state | organizations table tier columns |
| `FeatureGuard.tsx` | `src/components/guards/` | Feature gating | TierContext |
| `QuotaGuard.tsx` | `src/components/guards/` | Quota display/gating | TierContext |
| `UpgradePrompt.tsx` | `src/components/billing/` | Upgrade CTA | TierContext |
| `TierBadge.tsx` | `src/components/ui/` | Display current tier | TierContext |
| `UsageMetrics.tsx` | `src/modules/settings/` | Usage dashboard | TierContext |
| `quota-check.ts` | `functions/_shared/` | Quota middleware | organizations table |
| `increment-usage.ts` | `functions/_shared/` | Usage counter helper | organizations table |

### 5. Modified Components

| Component | File | Modification |
|-----------|------|--------------|
| Main App | `src/App.tsx` | Wrap with `<TierProvider>` |
| Create Event | `src/modules/events/CreateEvent.tsx` | Add `<QuotaGuard quotaType="events">` |
| Vendor Tab | `src/modules/vendors/VendorManagement.tsx` | Wrap in `<FeatureGuard feature="vendor_management">` |
| QR Check-in | `src/modules/checkin/QRScanner.tsx` | Wrap in `<FeatureGuard feature="qr_checkin">` |
| Feedback | `src/modules/feedback/FeedbackSurveys.tsx` | Wrap in `<FeatureGuard feature="feedback_surveys">` |
| Settings Nav | `src/modules/settings/SettingsNav.tsx` | Add Billing tab |
| ai-chat.ts | `functions/ai-chat.ts` | Add quota check at start |
| send-whatsapp.ts | `functions/send-whatsapp.ts` | Add quota check at start |

## Patterns to Follow

### Pattern 1: JWT App Metadata for Tier (Scalable)

**What:** Store tier information in Supabase Auth JWT `app_metadata` for Edge Functions access

**When:** Edge Functions need tier info without database query

**Example:**
```typescript
// When org tier changes (admin action or webhook)
await supabaseAdmin.auth.admin.updateUserById(userId, {
  app_metadata: {
    tier: 'premium',
    organization_id: orgId
  }
});

// In Edge Function
const { data: { user } } = await supabaseClient.auth.getUser(jwt);
const tier = user.app_metadata.tier || 'base';

if (tier === 'base') {
  // Check quota
}
```

**Why:** Avoids extra database query per Edge Function invocation. JWT is already validated by Supabase gateway.

### Pattern 2: Usage Counter Triggers (Automatic)

**What:** PostgreSQL triggers auto-increment usage counters on insert

**When:** Need accurate usage tracking without manual increments

**Example:**
```sql
CREATE TRIGGER event_created_increment_usage
AFTER INSERT ON events
FOR EACH ROW
EXECUTE FUNCTION increment_org_event_count();
```

**Why:** Ensures usage counters stay accurate. No application code needed. Can't be bypassed.

### Pattern 3: Three-Layer Enforcement (Defense in Depth)

**What:** Enforce limits at Frontend (UX), Edge Functions (quota), and RLS (security)

**When:** Always. Never rely on a single layer.

**Example:**
```
Frontend → User sees "Upgrade" modal before even trying
Edge Function → Returns 429 if quota exceeded
RLS Policy → Blocks insert if somehow bypassed
```

**Why:** Frontend alone = easily bypassed. Edge Functions alone = can be called directly with service_role. RLS = final security boundary.

### Pattern 4: Centralized Permissions File (Maintainability)

**What:** All tier/feature logic in `src/utils/permissions.ts`

**When:** Multiple components need same tier checks

**Example:**
```typescript
// src/utils/permissions.ts
export const TIER_FEATURES = {
  base: {
    qrCheckin: false,
    vendorManagement: false,
    feedbackSurveys: false,
    calendarSync: false
  },
  premium: {
    qrCheckin: true,
    vendorManagement: true,
    feedbackSurveys: true,
    calendarSync: true
  }
} as const;

export function canUseFeature(
  tier: 'base' | 'premium',
  feature: keyof typeof TIER_FEATURES.base
): boolean {
  return TIER_FEATURES[tier][feature];
}
```

**Why:** Single source of truth. Easy to update limits. Type-safe.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Frontend-Only Enforcement

**What:** Checking tier only in React components without backend validation

**Why bad:** Trivially bypassed by API calls or browser DevTools

**Instead:** Always validate tier in Edge Functions and RLS policies

**Example of what NOT to do:**
```typescript
// ❌ BAD - only checks frontend
function CreateEvent() {
  const { tier } = useOrgTier();

  if (tier === 'base') {
    return <UpgradePrompt />;
  }

  // User can bypass by calling API directly!
  await supabase.from('events').insert(eventData);
}
```

**Example of what TO do:**
```typescript
// ✅ GOOD - frontend + Edge Function + RLS
function CreateEvent() {
  const { hasQuota } = useOrgTier();

  if (!hasQuota('events')) {
    return <UpgradePrompt />;  // UX layer
  }

  // Edge Function checks quota before insert
  // RLS policy validates organization tier
  const response = await fetch('/functions/v1/create-event', {
    method: 'POST',
    body: JSON.stringify(eventData)
  });

  if (response.status === 429) {
    // Quota exceeded at Edge Function layer
    showUpgradeModal();
  }
}
```

### Anti-Pattern 2: Storing Tier in Multiple Places

**What:** Duplicating tier info in user_profiles, events, etc.

**Why bad:** Data inconsistency, complex updates, wasted storage

**Instead:** Single source of truth in `organizations` table

### Anti-Pattern 3: Hard-Coding Tier Limits in Code

**What:** Limits like `if (events > 3)` scattered in components

**Why bad:** Can't change limits without code deployment. Breaks for custom enterprise tiers.

**Instead:** Store limits in `organizations.tier_limits` JSONB, read at runtime

### Anti-Pattern 4: Blocking All Features on Quota Exceeded

**What:** Disabling entire app when one quota is exceeded

**Why bad:** Terrible UX. User can't even access settings to upgrade.

**Instead:** Quota-specific gating. Allow navigation, settings, billing. Block only the action that exceeds quota.

### Anti-Pattern 5: No Grace Period or Soft Limits

**What:** Hard cutoff at exact quota limit

**Why bad:** User creates 50th participant, gets error. No warning before hitting limit.

**Instead:**
- Show warning at 80% quota ("You've used 40/50 participants")
- Allow up to 110% with banner ("You're over quota, please upgrade")
- Hard block at 120%

## Scalability Considerations

| Concern | Base Tier (100 orgs) | Premium Tier (1K orgs) | Enterprise (10K orgs) |
|---------|----------------------|------------------------|------------------------|
| Quota checks | PostgreSQL triggers | PostgreSQL triggers | Redis cache + triggers |
| Tier info access | JWT app_metadata | JWT app_metadata | JWT app_metadata + Redis |
| Usage reset | Monthly cron job | Monthly cron job | Daily cron + sharding |
| RLS performance | Indexed `auth.user_org_id()` | Materialized views | Separate schema per tier |
| Feature flags | JSONB in DB | JSONB in DB | External service (LaunchDarkly) |

**Current recommendation:** Start with JWT + PostgreSQL triggers. Sufficient for 0-5K organizations.

**Migration path when scaling:**
1. Add Redis cache for frequently-accessed tier data (>5K orgs)
2. Materialize `org_tier_view` for complex RLS queries (>10K orgs)
3. Move feature flags to external service (>20K orgs or complex rollouts)

## Build Order Recommendation

**Phase 1: Database Foundation (Week 1)**
1. Alter `organizations` table (add tier columns)
2. Create usage counter triggers (events, participants, messages)
3. Add tier-aware RLS policies (premium features tables)
4. Create database migration script

**Phase 2: Edge Function Quota Enforcement (Week 1)**
1. Create `quota-check.ts` shared utility
2. Create `increment-usage.ts` shared utility
3. Modify `ai-chat.ts` to check quota
4. Modify `send-whatsapp.ts` to check quota
5. Test quota responses (429 with upgrade info)

**Phase 3: Frontend Context & Guards (Week 2)**
1. Create `TierContext.tsx`
2. Create `FeatureGuard.tsx` component
3. Create `QuotaGuard.tsx` component
4. Create `UpgradePrompt.tsx` component
5. Wrap App in `<TierProvider>`

**Phase 4: UI Integration (Week 2)**
1. Add guards to premium features (vendor management, QR, feedback)
2. Add quota displays to create flows (events, participants)
3. Create usage dashboard in settings
4. Create tier badge in header/nav
5. Update architecture status diagram

**Phase 5: Admin & Billing (v2.3 - payment processing)**
1. Tier upgrade flow (Stripe integration)
2. Admin panel for tier management
3. Webhook handlers (tier change, subscription status)
4. Email notifications (quota warnings, tier changes)

**Why this order:**
- Database first = foundation for everything
- Edge Functions second = security layer before frontend
- Frontend third = UX layer once backend is secure
- Admin/billing last = depends on payment provider (not in v2.2 scope)

## Sources

- [Supabase Row Level Security Docs](https://supabase.com/docs/guides/database/postgres/row-level-security) - HIGH confidence
- [Makerkit Subscription Permissions](https://makerkit.dev/docs/next-supabase/organizations/subscription-permissions) - HIGH confidence
- [PostgreSQL SaaS Subscription Schema](https://axellarsson.com/blog/modeling-saas-subscriptions-in-postgres/) - MEDIUM confidence
- [Supabase Rate Limiting Edge Functions](https://supabase.com/docs/guides/functions/examples/rate-limiting) - HIGH confidence
- [Multi-tenant SaaS Patterns](https://www.checklyhq.com/blog/building-a-multi-tenant-saas-data-model/) - MEDIUM confidence
- [React Feature Flags Best Practices 2026](https://medium.com/@ignatovich.dm/implementing-feature-flags-in-react-a-comprehensive-guide-f85266265fb3) - MEDIUM confidence

## Gaps & Future Research

**Open Questions:**
1. **Usage reset timing**: Should quotas reset on calendar month or rolling 30-day window? (Calendar month recommended for simpler admin)
2. **Custom enterprise tiers**: How to handle custom limits per organization? (Extend tier_limits JSONB, no code changes needed)
3. **Trial periods**: Allow premium features for 14 days before downgrade? (Add `trial_ends_at` column, check in RLS)
4. **Quota overage**: Allow temporary overage with charges? (v2.3 with Stripe integration)

**Needs validation:**
- Performance of RLS policies with tier checks on high-traffic tables (load testing required)
- JWT app_metadata sync timing when tier changes (expect 0-60s delay for existing sessions)
- Edge Function quota check latency (<50ms expected, measure in production)

**Deferred to future milestones:**
- v2.3: Stripe integration, tier upgrade flow, webhook handlers
- v2.4: Usage analytics, quota forecasting, auto-upgrade suggestions
- v3.0: Custom enterprise plans, usage-based pricing, seat-based licensing
