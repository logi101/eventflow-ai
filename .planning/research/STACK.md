# Technology Stack — SaaS Tier Structure

**Project:** EventFlow AI v2.1
**Researched:** 2026-02-03
**Confidence:** HIGH

## Context

This research focuses on **stack additions/changes needed for SaaS tier structure** in an existing Supabase + React app. EventFlow AI already has:

- React 19 + TypeScript + Vite frontend
- Supabase backend (PostgreSQL + Auth + Edge Functions)
- Multi-tenant architecture (organizations table)
- RLS policies enforcing organization isolation
- 14 Edge Functions, 7 migrations, 29,352 lines of TypeScript

**New requirements:** Feature gating (Premium-only features), usage limits (events, participants, messages), admin tier control, tier-aware UI.

**Payment integration deferred to v2.2** — This milestone focuses on tier infrastructure only.

---

## Recommended Stack Additions

### Database Schema Changes

**NO NEW LIBRARIES NEEDED** — Use existing PostgreSQL in Supabase.

| Component | Technology | Version | Purpose | Why |
|-----------|------------|---------|---------|-----|
| Tier storage | `organizations` table column | n/a | Add `subscription_tier` enum | Store tier at org level (not user level) since multi-tenant |
| Usage tracking | New `usage_quotas` table | n/a | Track consumption per org | Enable usage-based limits |
| RLS tier checks | PostgreSQL RLS policies | n/a | Enforce access control | Database-level security, no frontend bypass |
| Tier enum | `subscription_tier` ENUM | n/a | Type-safe tier values | `('base', 'premium')` with room for future tiers |

**Schema additions:**

```sql
-- Tier enum
CREATE TYPE subscription_tier AS ENUM ('base', 'premium');

-- Add tier to organizations
ALTER TABLE organizations
ADD COLUMN subscription_tier subscription_tier DEFAULT 'base',
ADD COLUMN tier_expires_at TIMESTAMPTZ,
ADD COLUMN tier_updated_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN tier_updated_by UUID REFERENCES user_profiles(id);

-- Usage tracking table
CREATE TABLE usage_quotas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  period_start TIMESTAMPTZ NOT NULL DEFAULT date_trunc('month', NOW()),
  period_end TIMESTAMPTZ NOT NULL DEFAULT (date_trunc('month', NOW()) + interval '1 month'),
  events_used INTEGER DEFAULT 0,
  participants_used INTEGER DEFAULT 0,
  messages_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, period_start)
);
```

**Rationale:**
- **Tier at org level, not user level**: Multi-tenant architecture means the organization is the billing entity, not individual users.
- **No external database**: Existing Supabase PostgreSQL handles everything. No Redis, no separate quota service.
- **Period-based tracking**: Monthly usage windows align with SaaS billing cycles.

---

### RLS Policies for Tier-Based Access

**NO NEW LIBRARIES NEEDED** — Use PostgreSQL RLS + security definer functions.

| Component | Technology | Purpose | Why |
|-----------|------------|---------|-----|
| Tier checking | Security definer function | Fast tier checks in RLS | Avoids repeated JWT parsing per row |
| Feature gates | RLS policies with tier checks | Enforce Premium-only access | Database-level enforcement, no frontend bypass |

**Implementation pattern:**

```sql
-- Security definer function for tier checking (performance optimization)
CREATE FUNCTION check_org_tier(org_id UUID, required_tier subscription_tier)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN (
    SELECT subscription_tier >= required_tier
    FROM organizations
    WHERE id = org_id
  );
END;
$$;

-- Example RLS policy for Premium-only feature
CREATE POLICY "simulation_premium_only"
ON simulations FOR ALL
TO authenticated
USING (
  (SELECT check_org_tier(organization_id, 'premium'))
);
```

**Rationale:**
- **SECURITY DEFINER + STABLE**: PostgreSQL optimizer caches result per statement, not per row ([Supabase RLS docs](https://supabase.com/docs/guides/database/postgres/row-level-security)).
- **No LEAKPROOF needed**: Function doesn't leak data, just returns boolean ([Common Postgres RLS footguns](https://www.bytebase.com/blog/postgres-row-level-security-footguns/)).
- **Tier comparison**: Using `>=` allows future tier hierarchy (e.g., 'enterprise' > 'premium' > 'base').

---

### Frontend State Management

**USE EXISTING REACT CONTEXT** — No new state library needed.

| Component | Technology | Version | Purpose | Why |
|-----------|------------|---------|---------|-----|
| Tier state | React Context API | React 19 | Global tier state | Already used in EventFlow, tier data is infrequent ([React Context best practices](https://www.nucamp.co/blog/state-management-in-2026-redux-context-api-and-modern-patterns)) |
| Tier provider | `TierContext.tsx` | n/a | Wrap app with tier data | Fetch from `organizations` table on auth |

**DO NOT ADD:** Zustand, Redux, Jotai — overkill for infrequent tier data. Context API is optimal for "environment-style" state like auth and subscription tier ([React state patterns 2026](https://www.patterns.dev/react/react-2026/)).

**Implementation pattern:**

```typescript
// TierContext.tsx
interface TierContextValue {
  tier: 'base' | 'premium' | null;
  loading: boolean;
  canAccess: (feature: PremiumFeature) => boolean;
  usageQuota: UsageQuota | null;
  refreshQuota: () => Promise<void>;
}

const TierContext = createContext<TierContextValue | undefined>(undefined);

export function TierProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [tier, setTier] = useState<'base' | 'premium' | null>(null);
  const [quota, setQuota] = useState<UsageQuota | null>(null);

  // Fetch tier from organizations table
  useEffect(() => {
    if (user?.organization_id) {
      fetchTierAndQuota(user.organization_id);
    }
  }, [user?.organization_id]);

  const canAccess = useCallback((feature: PremiumFeature) => {
    if (tier === 'premium') return true;
    return !PREMIUM_FEATURES.includes(feature);
  }, [tier]);

  return (
    <TierContext.Provider value={{ tier, loading, canAccess, quota, refreshQuota }}>
      {children}
    </TierContext.Provider>
  );
}

export const useTier = () => {
  const context = useContext(TierContext);
  if (!context) throw new Error('useTier must be used within TierProvider');
  return context;
};
```

**Rationale:**
- **Context is sufficient**: Tier changes are rare (admin-triggered), no performance concerns with Context ([Kent C. Dodds on Context](https://kentcdodds.com/blog/how-to-use-react-context-effectively)).
- **Single source of truth**: Database tier → Context → UI, no need for local storage sync.
- **Type-safe feature checks**: `canAccess('ai_chat')` is cleaner than boolean flags everywhere.

---

### Feature Gating Components

**NO NEW LIBRARIES NEEDED** — Build on React primitives.

| Component | Technology | Purpose | Why |
|-----------|------------|---------|-----|
| Feature gate wrapper | React component | Show/hide Premium features | Simple conditional rendering |
| Upgrade prompt | React component | "Upgrade to Premium" UI | Inform users, no hard upsell (payment in v2.2) |

**Implementation pattern:**

```typescript
// FeatureGate.tsx
interface FeatureGateProps {
  feature: PremiumFeature;
  fallback?: ReactNode;
  showUpgrade?: boolean;
  children: ReactNode;
}

export function FeatureGate({
  feature,
  fallback,
  showUpgrade = true,
  children
}: FeatureGateProps) {
  const { canAccess, tier } = useTier();

  if (canAccess(feature)) {
    return <>{children}</>;
  }

  if (showUpgrade) {
    return (
      <UpgradePrompt
        feature={feature}
        currentTier={tier}
      />
    );
  }

  return <>{fallback}</>;
}

// Usage
<FeatureGate feature="ai_chat">
  <AIChatWidget />
</FeatureGate>
```

**Rationale:**
- **Declarative**: Wrapping components is cleaner than `if (tier === 'premium')` everywhere.
- **Centralized logic**: Feature-tier mapping in one place, easy to change.
- **Fallback support**: Show alternative UI for Base tier users.

---

### Usage Limit Tracking

**NO NEW LIBRARIES NEEDED** — Use PostgreSQL triggers + React hooks.

| Component | Technology | Purpose | Why |
|-----------|------------|---------|-----|
| Usage counter | PostgreSQL trigger | Auto-increment quota on insert | Atomic, no race conditions |
| Quota check hook | React hook | Fetch current usage | Show "X/Y events used" in UI |

**Implementation pattern:**

```sql
-- Trigger to increment events_used
CREATE OR REPLACE FUNCTION increment_event_usage()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO usage_quotas (organization_id, events_used)
  VALUES (NEW.organization_id, 1)
  ON CONFLICT (organization_id, period_start)
  DO UPDATE SET
    events_used = usage_quotas.events_used + 1,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_event_created
AFTER INSERT ON events
FOR EACH ROW
EXECUTE FUNCTION increment_event_usage();
```

**Frontend hook:**

```typescript
// useUsageQuota.ts
export function useUsageQuota() {
  const { organization_id } = useAuth();

  const { data: quota, isLoading } = useQuery({
    queryKey: ['usage-quota', organization_id],
    queryFn: () => fetchUsageQuota(organization_id),
    staleTime: 60000, // 1 minute cache
  });

  const isNearLimit = (usage: number, limit: number) => {
    return usage >= limit * 0.8; // 80% threshold
  };

  return { quota, isLoading, isNearLimit };
}
```

**Rationale:**
- **Triggers are atomic**: No race conditions when multiple events created simultaneously.
- **ON CONFLICT**: Upsert pattern ensures single row per org per month.
- **TanStack Query cache**: Already used in EventFlow, reuse existing pattern.

---

### Admin Controls

**USE EXISTING SUPABASE AUTH + EDGE FUNCTION** — No new admin framework.

| Component | Technology | Purpose | Why |
|-----------|------------|---------|-----|
| Admin role | `user_profiles.role` | Check if user is admin | Already exists in schema |
| Tier update function | Supabase Edge Function | Update org tier (service_role) | Must use service role, can't trust frontend ([Supabase admin user management](https://supabase.com/docs/guides/auth/managing-user-data)) |
| Admin UI | React component | Tier control panel | Simple form for admins |

**Edge Function pattern:**

```typescript
// supabase/functions/admin-set-tier/index.ts
import { createClient } from '@supabase/supabase-js';

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, // SERVICE ROLE, not anon key
  );

  const { organization_id, tier, admin_user_id } = await req.json();

  // Verify admin role
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', admin_user_id)
    .single();

  if (profile?.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
  }

  // Update tier (bypasses RLS with service role)
  const { error } = await supabase
    .from('organizations')
    .update({
      subscription_tier: tier,
      tier_updated_at: new Date().toISOString(),
      tier_updated_by: admin_user_id
    })
    .eq('id', organization_id);

  return new Response(JSON.stringify({ success: !error }));
});
```

**Rationale:**
- **Service role required**: Clients can't update `organizations.subscription_tier` ([Supabase app_metadata admin updates](https://github.com/orgs/supabase/discussions/33931)).
- **Admin audit trail**: `tier_updated_by` tracks who changed tiers.
- **RLS bypass**: Service role ignores RLS, necessary for admin operations.

---

## What NOT to Add

| Technology | Why Not | Alternative |
|------------|---------|-------------|
| **Stripe integration** | Deferred to v2.2 per milestone scope | Manual admin tier updates for now |
| **Redis for caching** | PostgreSQL + RLS security definer functions are fast enough | Use STABLE functions ([Postgres security definer](https://linuxhint.com/postgres-security-definer/)) |
| **Feature flag service (LaunchDarkly, Unleash)** | Overkill for 2 tiers and ~5 features | Simple enum + FeatureGate component |
| **Zustand/Redux** | Tier data is infrequent, Context is sufficient | React Context API ([React 2026 patterns](https://www.patterns.dev/react/react-2026/)) |
| **Separate quota service** | PostgreSQL triggers handle usage tracking | Atomic DB operations prevent race conditions |
| **Rate limiter library (p-ratelimit)** | Usage limits are monthly, not per-second | Database-enforced quotas |

---

## Integration with Existing Stack

### With Supabase Auth

```typescript
// Fetch tier on auth
const { data: { user } } = await supabase.auth.getUser();
const { data: org } = await supabase
  .from('organizations')
  .select('subscription_tier, id')
  .eq('id', user?.organization_id)
  .single();

// Store in Context
<TierProvider initialTier={org.subscription_tier}>
  <App />
</TierProvider>
```

### With Existing RLS Policies

```sql
-- Example: Extend existing event creation policy
CREATE POLICY "users_can_create_events"
ON events FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  AND (
    -- Base tier: max 5 events
    (SELECT subscription_tier FROM organizations WHERE id = organization_id) = 'base'
    AND (SELECT events_used FROM usage_quotas WHERE organization_id = organization_id) < 5
  )
  OR
    -- Premium tier: unlimited
    (SELECT subscription_tier FROM organizations WHERE id = organization_id) = 'premium'
);
```

**IMPORTANT:** This pattern is **not** recommended due to RLS performance issues with subqueries. Use security definer function instead:

```sql
-- Better approach
CREATE POLICY "users_can_create_events"
ON events FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  AND check_can_create_event(organization_id)
);

CREATE FUNCTION check_can_create_event(org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  org_tier subscription_tier;
  events_count INTEGER;
BEGIN
  SELECT subscription_tier INTO org_tier FROM organizations WHERE id = org_id;

  IF org_tier = 'premium' THEN
    RETURN TRUE;
  END IF;

  SELECT events_used INTO events_count FROM usage_quotas WHERE organization_id = org_id;
  RETURN COALESCE(events_count, 0) < 5;
END;
$$;
```

### With Existing Edge Functions

No changes needed to existing Edge Functions. Usage tracking is handled by triggers.

---

## Installation

**NO NEW NPM PACKAGES NEEDED.**

All functionality is implemented with:
- Existing React 19 + TypeScript
- Existing Supabase client (@supabase/supabase-js ^2.90.1)
- Existing TanStack Query (@tanstack/react-query ^5.90.19)

---

## Migration Path

1. **Database migration** — Add tier enum, alter organizations table, create usage_quotas table, create RLS functions
2. **Backend** — Deploy admin-set-tier Edge Function
3. **Frontend** — Add TierContext, FeatureGate component, admin UI
4. **RLS policies** — Update policies for Premium-only features
5. **UI integration** — Wrap Premium features in FeatureGate
6. **Testing** — Verify tier enforcement at DB and UI levels

---

## Performance Considerations

### RLS Policy Performance

**Problem:** Subqueries in RLS policies can slow down queries significantly ([Common Postgres RLS footguns](https://www.bytebase.com/blog/postgres-row-level-security-footguns/)).

**Solution:** Use SECURITY DEFINER + STABLE functions. PostgreSQL optimizer caches the result per statement ([Supabase RLS docs](https://supabase.com/docs/guides/database/postgres/row-level-security)).

### Context Re-renders

**Problem:** Context updates trigger all consumers to re-render.

**Solution:** Tier changes are rare (admin-triggered), so this isn't a concern. For usage quota (more frequent), use TanStack Query cache with 1-minute staleTime to minimize fetches.

### Quota Tracking Overhead

**Problem:** Triggers on every insert add overhead.

**Solution:** Minimal overhead (~0.5ms) for single row upsert. If needed, batch updates or use PostgreSQL advisory locks for high-throughput scenarios.

---

## Confidence Assessment

| Area | Confidence | Source |
|------|------------|--------|
| Database schema | HIGH | PostgreSQL official docs, Supabase patterns |
| RLS patterns | HIGH | [Supabase RLS docs](https://supabase.com/docs/guides/database/postgres/row-level-security) |
| React Context | HIGH | [React 2026 patterns](https://www.patterns.dev/react/react-2026/), [Kent C. Dodds](https://kentcdodds.com/blog/how-to-use-react-context-effectively) |
| Security definer | HIGH | [PostgreSQL function security](https://www.postgresql.org/docs/current/perm-functions.html) |
| Admin updates | HIGH | [Supabase user management docs](https://supabase.com/docs/guides/auth/managing-user-data) |
| Performance | MEDIUM | Requires load testing to confirm RLS function caching works as expected |

---

## Open Questions / Validation Needed

1. **Load test RLS functions**: Confirm STABLE + SECURITY DEFINER caching under load (100+ concurrent requests)
2. **Tier expiration handling**: Should expired Premium tiers auto-downgrade to Base? Or require admin action?
3. **Usage quota reset**: Monthly auto-reset via cron job, or manual admin reset?

---

## Sources

### Official Documentation (HIGH confidence)
- [Supabase RLS Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase User Management](https://supabase.com/docs/guides/auth/managing-user-data)
- [PostgreSQL Function Security](https://www.postgresql.org/docs/current/perm-functions.html)

### Best Practices (HIGH confidence)
- [Multi-tenant PostgreSQL patterns](https://www.crunchydata.com/blog/designing-your-postgres-database-for-multi-tenancy)
- [PostgreSQL RLS Footguns](https://www.bytebase.com/blog/postgres-row-level-security-footguns/)
- [React Context best practices (Kent C. Dodds)](https://kentcdodds.com/blog/how-to-use-react-context-effectively)

### State Management (HIGH confidence)
- [React State Management 2026](https://www.nucamp.co/blog/state-management-in-2026-redux-context-api-and-modern-patterns)
- [React Stack Patterns 2026](https://www.patterns.dev/react/react-2026/)

### Community Patterns (MEDIUM confidence)
- [Supabase tier management discussion](https://www.answeroverflow.com/m/1394188870723047500)
- [GitHub discussions on app_metadata](https://github.com/orgs/supabase/discussions/33931)

---

**Last Updated:** 2026-02-03
