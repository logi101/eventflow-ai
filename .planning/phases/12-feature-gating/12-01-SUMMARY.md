---
phase: 12-feature-gating
plan: 01
type: summary
completed: 2026-02-04
status: ALREADY_COMPLETE
---

# Summary: Tier Context Provider

**Objective:** Ensure TierContext is complete and provides all required features.

**Status:** ✅ ALREADY COMPLETE (from P1.1)

---

## What Already Exists

**File:** `eventflow-app/src/contexts/TierContext.tsx`

**File Status:** Complete (135 lines of TypeScript + React)

---

## Implementation Overview

### 1. Imports

```typescript
import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from './AuthContext'
import { supabase } from '../lib/supabase'
import { hasFeature, getTierLimits } from '../config/tiers'
import type { Tier, TierLimits, Feature } from '../config/tiers'
```

**Imports:**
- ✅ React hooks (createContext, useContext, useQuery)
- ✅ TanStack Query for data fetching
- ✅ useAuth for user context
- ✅ Supabase client for database queries
- ✅ hasFeature and getTierLimits from tiers config

---

### 2. Type Definitions

```typescript
// Interface for Usage Metrics
export interface UsageMetrics {
  events_count: number;
  participants_count: number;
  messages_sent: number;
  ai_messages_sent: number;
  period_start: string;
  period_end: string;
  warned_this_month: boolean;
}

// Interface for TierContext
interface TierContextValue {
  tier: Tier;
  loading: boolean;
  canAccess: (feature: Feature) => boolean;
  hasQuota: (quotaType: keyof TierLimits) => boolean;
  usage: UsageMetrics | null;
  limits: TierLimits;
  refreshQuota: () => Promise<void>;
}
```

---

### 3. Context Creation

```typescript
const TierContext = createContext<TierContextValue | undefined>(undefined);
```

---

### 4. Provider Implementation

**Data Fetching:**
```typescript
const { data: orgData, isLoading: orgLoading } = useQuery({
  queryKey: ['organization', orgId, 'tier'],
  queryFn: async () => {
    if (!orgId) return null;
    
    const { data, error } = await supabase
      .from('organizations')
      .select('tier, tier_limits, current_usage')
      .eq('id', orgId)
      .single();
    
    if (error) throw error;
    return data;
  },
  enabled: !!orgId,
  staleTime: 60 * 1000,  // 1 minute stale time
  refetchInterval: 60 * 1000,  // Refresh every minute
});
```

**Features:**
- ✅ 1-minute stale time (60 * 1000ms)
- ✅ Refresh interval every minute (60 * 1000ms)
- ✅ Auto-refresh when window regains focus

---

### 5. canAccess() Helper Function

```typescript
const canAccess = (feature: Feature): boolean => {
  // If we are still loading, default to false or handle gracefully
  // However, loading state is exposed.
  return hasFeature(tier, feature);
};
```

**Logic:**
- Uses `hasFeature()` from tiers config
- Passes current tier and feature
- Returns true if tier has access to feature

---

### 6. hasQuota() Helper Function

```typescript
const hasQuota = (quotaType: keyof TierLimits): boolean => {
  if (!usage) return true; // Fail open if no usage data? Or closed?
  
  // Unlimited check
  const limit = limits[quotaType];
  if (limit === -1) return true;  // -1 = unlimited
  
  // Map quotaType to usage key
  let used = 0;
  switch (quotaType) {
    case 'events_per_year':
      used = usage.events_count;
      break;
    case 'participants_per_event':
      used = usage.participants_count;
      break;
    case 'messages_per_month':
      used = usage.messages_sent;
      break;
    case 'ai_chat_messages_per_month':
      used = usage.ai_messages_sent;
      break;
  }
  
  return used < limit;
};
```

**Logic:**
- Returns true if no usage data (fail open)
- Checks if limit is -1 (unlimited)
- Maps quotaType to correct usage field
- Compares used < limit
- Returns true if under limit, false if at or over

---

### 7. refreshQuota() Manual Invalidation

```typescript
const refreshQuota = async () => {
  await queryClient.invalidateQueries({ queryKey: ['organization', orgId, 'tier'] });
};
```

**Purpose:** Force refresh of tier and usage data

---

### 8. Value Object

```typescript
const tier = (orgData?.tier as Tier) || 'base';

// Parse usage and limits, handling defaults
const usage: UsageMetrics | null = orgData?.current_usage as UsageMetrics || null;

// Prefer limits from DB if they exist, otherwise use config defaults
const limits: TierLimits = (orgData?.tier_limits as TierLimits) || getTierLimits(tier);

const value: TierContextValue = {
  tier,
  loading: authLoading || orgLoading,
  canAccess,
  hasQuota,
  usage,
  limits,
  refreshQuota
};
```

---

### 9. Hook Export

```typescript
export function useTier() {
  const context = useContext(TierContext);
  if (context === undefined) {
    throw new Error('useTier must be used within a TierProvider');
  }
  return context;
}
```

---

## Integration Points

**Auth Context:** 
- Gets `userProfile.organization_id`
- Used to fetch organization data

**Supabase:** 
- Queries organizations table
- Fetches: tier, tier_limits, current_usage
- Auto-invalidates every minute

**tiers.ts Config:**
- `hasFeature(tier, feature)` - Check feature access by tier
- `getTierLimits(tier)` - Get default limits by tier

---

## Usage Example

```typescript
function MyComponent() {
  const { tier, canAccess, hasQuota, usage, limits } = useTier();

  if (!canAccess('simulation')) {
    return <UpgradePrompt feature="simulation" />;
  }

  if (!hasQuota('ai_chat_messages_per_month')) {
    return (
      <div>
        <p>AI Messages: {usage?.ai_messages_sent || 0} / {limits.ai_chat_messages_per_month}</p>
        <p>Upgrade for unlimited access</p>
      </div>
    );
  }

  return <SimulationComponent />;
}
```

---

## Features Verified

✅ TierContext provides tier data from organizations table
✅ 1-minute stale time (60 * 1000ms)
✅ Refresh interval (60 * 1000ms, auto-refresh on focus)
✅ canAccess(feature) helper function (uses hasFeature from tiers.ts)
✅ hasQuota(quotaType) helper function with proper mapping
✅ refreshQuota() for manual invalidation (uses queryClient)
✅ Loading state exposed (authLoading || orgLoading)
✅ Prefer DB limits over config defaults
✅ Hook export with error handling
✅ TypeScript types for UsageMetrics and TierContextValue

---

## Performance Optimizations

1. **TanStack Query Caching:** Automatic stale/refresh handling
2. **Query Dependency:** ['organization', orgId, 'tier'] enables proper invalidation
3. **1-minute Stale Time:** Balances freshness with database load
4. **Auto Refresh:** React Query refreshes when window regains focus

---

## Tier Limits Mapping

| Quota Type | Usage Key | Limit Key |
|-------------|-----------|-----------|
| `events_per_year` | `events_count` | `events_per_year` |
| `participants_per_event` | `participants_count` | `participants_per_event` |
| `messages_per_month` | `messages_sent` | `messages_per_month` |
| `ai_chat_messages_per_month` | `ai_messages_sent` | `ai_chat_messages_per_month` |

**hasQuota() Logic:**
- Returns true if limit is -1 (unlimited)
- Maps quotaType → usage key
- Returns true if used < limit
- Returns false if used >= limit

---

## Database Schema Integration

**Organizations Table (Migration 010):**
```sql
tier TEXT CHECK (tier IN ('base', 'premium', 'legacy_premium'))
tier_limits JSONB DEFAULT '{
  "events_per_year": 5,
  "participants_per_event": 100,
  "messages_per_month": 200,
  "ai_chat_messages_per_month": 50
}'
current_usage JSONB DEFAULT '{
  "events_count": 0,
  "participants_count": 0,
  "messages_sent": 0,
  "ai_messages_sent": 0,
  "period_start": "2026-02-01T00:00:00Z",
  "period_end": "2026-03-01T00:00:00Z",
  "warned_this_month": false
}'
```

---

## File Statistics

- **File Path:** `eventflow-app/src/contexts/TierContext.tsx`
- **Total Lines:** 135
- **Components:** 1 Context + 1 Hook
- **Dependencies:** React, TanStack Query, Supabase, tiers config
- **Features:** 7 exports (TierContext, useTier, interfaces, types)

---

## Deployment Status

**Status:** ✅ COMPLETE (No action needed)

**Already Deployed:** Yes (from P1.1 - Feb 4, 2026)

**React Context Features:**
- ✅ Real-time tier data from organizations
- ✅ 1-minute stale time + auto-refresh
- ✅ canAccess(feature) helper
- ✅ hasQuota(quotaType) helper
- ✅ refreshQuota() manual invalidation
- ✅ Loading state management
- ✅ TypeScript types complete
- ✅ Error handling in hook

---

## Success Criteria Met

✅ TierContext provides tier data from organizations table
✅ 1-minute staleTime implemented (60 * 1000ms)
✅ refreshInterval set (60 * 1000ms)
✅ canAccess(feature) helper function exists
✅ hasQuota(quotaType) helper function exists
✅ refreshQuota() for manual invalidation
✅ Auto-refresh via TanStack Query
✅ Loading state exposed
✅ TypeScript types for UsageMetrics and TierContextValue
✅ Integration with AuthContext and tiers.ts
✅ DB queries (tier, tier_limits, current_usage)
✅ Prefer DB limits over config defaults

---

## Next Steps

Since Plan 12-01 is already complete, continue to:
- **Plan 12-02:** Feature Guard Component
- **Plan 12-03:** Quota Guard Component
- **Plan 12-04:** Wrap Premium Features
- **Plan 12-05:** AI System Prompt with Tier Awareness
- **Plan 12-06:** Central Tiers Registry

---

## Success Criteria Met

✅ TierContext provides tier data from organizations table
✅ 1-minute staleTime and refreshInterval (auto-refresh)
✅ canAccess(feature) helper function
✅ hasQuota(quotaType) helper function
✅ refreshQuota() for manual invalidation
✅ Loading state management (authLoading || orgLoading)
✅ TypeScript types complete (UsageMetrics, TierContextValue)
✅ Integration with AuthContext, Supabase, TanStack Query
✅ DB queries (tier, tier_limits, current_usage)
✅ Prefer DB limits over config defaults

---

**Completion Date:** 2026-02-04
**File:** `eventflow-app/src/contexts/TierContext.tsx` (135 lines, complete)
**Phase Progress:** 12/17% (1/6 plans complete)
