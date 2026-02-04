---
phase: 11-tier-enforcement
plan: 01
type: summary
completed: 2026-02-04
status: ALREADY_COMPLETE
---

# Summary: Quota Check Middleware

**Objective:** Create reusable Edge Function utility for checking tier and quota limits.

**Status:** ✅ ALREADY COMPLETE (from previous work)

---

## What Already Exists

**File:** `eventflow-app/supabase/functions/_shared/quota-check.ts`

**File Status:** Complete (369 lines of TypeScript)

---

## Complete Functionality

### 1. Type Definitions

```typescript
export type Tier = 'base' | 'premium' | 'legacy_premium'

export type QuotaType =
  | 'events'
  | 'participants'
  | 'whatsapp_messages'
  | 'ai_messages'

export interface TierLimits {
  events_per_year: number
  participants_per_event: number
  messages_per_month: number
  ai_chat_messages_per_month: number
}

export interface UsageMetrics {
  events_count: number
  participants_count: number
  messages_sent: number
  ai_messages_sent: number
  period_start: string
  period_end: string
  warned_this_month: boolean
}

export interface QuotaCheckResult {
  allowed: boolean
  remaining?: number
  resetDate?: string
  tier: Tier
  usage?: UsageMetrics
  limits?: TierLimits
}
```

---

### 2. Core Functions

#### getOrganizationData()
**Purpose:** Fetch organization tier and usage data
```typescript
async function getOrganizationData(
  supabase: SupabaseClient,
  organizationId: string
): Promise<OrganizationData | null>
```

**Returns:** Organization id, tier, tier_limits, current_usage

---

#### getOrganizationIdFromUser()
**Purpose:** Get organization_id from user profile
```typescript
async function getOrganizationIdFromUser(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null>
```

**Returns:** Organization ID string

---

#### checkOrgQuota()
**Purpose:** Check quota by organization ID (for cron jobs)
```typescript
async function checkOrgQuota(
  supabase: SupabaseClient,
  organizationId: string,
  quotaType: QuotaType
): Promise<QuotaCheckResult>
```

**Logic:**
1. Fetch organization data
2. Premium = always allowed
3. Base = check current_usage against tier_limits
4. Return allowed, remaining, resetDate

---

#### checkQuota() - MAIN FUNCTION
**Purpose:** Check quota by user ID (for Edge Functions)
```typescript
async function checkQuota(
  supabase: SupabaseClient,
  userId: string,
  quotaType: QuotaType
): Promise<QuotaCheckResult>
```

**Logic:**
1. Get organizationId from user profile
2. Get organization data
3. Premium = always allowed
4. Base = check quota
5. Return result

---

#### checkPremiumFeature()
**Purpose:** Check Premium-only feature access
```typescript
async function checkPremiumFeature(
  supabase: SupabaseClient,
  userId: string,
  feature: PremiumFeature
): Promise<QuotaCheckResult>
```

**Logic:**
1. Get organization data
2. Check if tier is premium or legacy_premium
3. Return allowed: true for Premium

---

### 3. Helper Functions

#### isPremiumFeature()
```typescript
export function isPremiumFeature(feature: string): boolean
```
**Premium Features:** simulation, networking, budget_alerts, vendor_analysis, offline_checkin

---

#### hasPremiumAccess()
```typescript
export function hasPremiumAccess(tier: Tier): boolean
```
**Returns:** true if tier is 'premium' or 'legacy_premium'

---

### 4. Usage Increment

#### incrementUsage()
```typescript
async function incrementUsage(
  supabase: SupabaseClient,
  organizationId: string,
  quotaType: QuotaType
): Promise<boolean>
```

**Method:** Uses RPC for atomic increment to prevent race conditions
- `increment_org_usage` RPC with p_org_id and p_usage_key
- Fallback to direct update if RPC fails

---

### 5. Response Generators

#### createQuotaExceededResponse()
**Purpose:** Create 429 Too Many Requests response
```typescript
export function createQuotaExceededResponse(
  quotaType: QuotaType,
  result: QuotaCheckResult
): Response
```

**Includes:**
- error: "Quota exceeded"
- message: "You have reached your {quota type} limit for this period"
- tier, remaining, resetDate, upgradeUrl

---

#### createPremiumRequiredResponse()
**Purpose:** Create 403 Forbidden response for Premium features
```typescript
export function createPremiumRequiredResponse(
  feature: string
): Response
```

**Includes:**
- error: "Premium feature"
- message: "{feature} is a Premium feature"
- upgradeUrl: '/settings/billing'

---

## Premium Features List

```typescript
export const PREMIUM_FEATURES = [
  'simulation',
  'networking',
  'budget_alerts',
  'vendor_analysis',
  'offline_checkin'
] as const
```

---

## Quota Type Mapping

| Quota Type | Limit Key | Usage Key |
|-------------|-----------|-----------|
| `events` | `events_per_year` | `events_count` |
| `participants` | `participants_per_event` | `participants_count` |
| `whatsapp_messages` | `messages_per_month` | `messages_sent` |
| `ai_messages` | `ai_chat_messages_per_month` | `ai_messages_sent` |

---

## Performance Optimizations

1. **Single Query:** Get organization data in one query
2. **RPC for Increment:** Atomic increment prevents race conditions
3. **No Redundant Calls:** Cache organization data in memory

---

## Usage Examples

### Example 1: Check quota in Edge Function
```typescript
import { checkQuota } from './_shared/quota-check.ts'

const result = await checkQuota(supabase, userId, 'ai_messages')

if (!result.allowed) {
  return new Response(
    JSON.stringify(createQuotaExceededResponse('ai_messages', result)),
    { status: 429 }
  )
}

// Continue processing...
await incrementUsage(supabase, organizationId, 'ai_messages')
```

### Example 2: Check Premium feature
```typescript
import { checkPremiumFeature } from './_shared/quota-check.ts'

const result = await checkPremiumFeature(supabase, userId, 'simulation')

if (!result.allowed) {
  return new Response(
    JSON.stringify(createPremiumRequiredResponse('simulation')),
    { status: 403 }
  )
}

// Continue processing...
```

---

## Integration Points

**Edge Functions using quota-check.ts:**
1. `send-reminder` - Check whatsapp_messages quota
2. `ai-chat` - Check ai_messages quota
3. `budget-alerts` - Check Premium feature access
4. `vendor-analysis` - Check Premium feature access
5. `execute-ai-action` - Check Premium features + quotas

---

## Verification

✅ All type definitions complete
✅ Main checkQuota() function implemented
✅ checkPremiumFeature() function implemented
✅ Quota mapping helper functions exist
✅ Premium features list defined
✅ incrementUsage() with atomic RPC
✅ Response generators for 429/403 errors
✅ Helper functions for tier checking
✅ Complete documentation with JSDoc comments
✅ Supports all 4 quota types
✅ Error messages in English
✅ upgradeUrl included in error responses

---

## File Statistics

- **File Path:** `eventflow-app/supabase/functions/_shared/quota-check.ts`
- **Total Lines:** 369
- **Functions:** 8 (getOrganizationData, getOrganizationIdFromUser, checkOrgQuota, checkQuota, checkPremiumFeature, isPremiumFeature, hasPremiumAccess, incrementUsage)
- **Response Generators:** 2 (createQuotaExceededResponse, createPremiumRequiredResponse)
- **Type Definitions:** 5 (Tier, QuotaType, TierLimits, UsageMetrics, QuotaCheckResult, OrganizationData)

---

## Deployment Status

**Status:** ✅ COMPLETE (No action needed)

**Already Deployed:** Yes (from previous work)

**Edge Functions Ready to Import:**
```typescript
import { checkQuota, incrementUsage, checkPremiumFeature } from './_shared/quota-check.ts'
```

---

## Next Steps

Since Plan 11-01 is already complete, continue to:
- **Plan 11-02:** AI Chat Tier Check
- **Plan 11-03:** Send Reminder Tier Check
- **Plan 11-04:** Execute AI Action Tier Check
- **Plan 11-05:** Budget Alerts Tier Check
- **Plan 11-06:** Vendor Analysis Tier Check
- **Plan 11-07:** Soft Limit Warnings

---

## Success Criteria Met

✅ checkQuota() function exists with proper TypeScript types
✅ Returns { allowed, remaining, tier, resetDate } object
✅ Always returns allowed: true for Premium tier
✅ Checks current_usage against tier_limits for Base tier
✅ Supports 4 quota types (events, participants, whatsapp_messages, ai_messages)
✅ Returns 429 status if quota exceeded
✅ Includes upgradeUrl and resetDate in error response
✅ checkPremiumFeature() function exists
✅ isPremiumFeature() and hasPremiumAccess() helpers exist
✅ incrementUsage() function with atomic RPC
✅ All functions documented with JSDoc
✅ Quota type mapping complete
✅ Response generators for 429/403 errors

---

**Completion Date:** 2026-02-04
**File:** `eventflow-app/supabase/functions/_shared/quota-check.ts` (369 lines, complete)
**Phase Progress:** 11/57% (1/7 plans complete)
