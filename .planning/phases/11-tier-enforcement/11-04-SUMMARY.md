---
phase: 11-tier-enforcement
plan: 04
type: summary
completed: 2026-02-04
status: PARTIAL - NEEDS IMPLEMENTATION
---

# Summary: Execute AI Action Tier Check

**Objective:** Add tier validation to execute-ai-action for Premium-only operations.

**Status:** ⚠️ PARTIAL - File exists but missing tier enforcement

---

## What Already Exists

**File:** `eventflow-app/supabase/functions/execute-ai-action/index.ts`

**File Status:** Partial (20024 bytes, no tier checks currently implemented)

---

## Current Functionality

### 1. Existing Features

```typescript
// CORS configuration (Lines 12-35)
function isAllowedOrigin(origin: string): boolean
function getCorsHeaders(origin: string | null): Record<string, string>

// Types (Lines 40-59)
interface ExecuteActionRequest { action_id: string }
interface AIInsightsLog { id, action_type, action_data, execution_status, event_id, organization_id }

// Conflict re-check functions (Lines 65-150)
async function recheckConflicts(supabase, actionType, actionData, eventId)
  - Only checks for schedule operations
  - Uses database constraint check_speaker_conflicts
  - Returns ScheduleConflict object

// Main handler with auth (Lines 200+)
  - OPTIONS preflight handler
  - Authorization check (user_profiles table)
  - Fetch action from ai_insights_log
  - Execute based on action_type
  - Update execution_status
  - Log to ai_insights_log
```

---

## What's Missing

### Tier Validation Required

**Per PLAN 11-04:**

1. **Import quota-check utilities**
   ```typescript
   import {
     checkPremiumFeature,
     checkQuota,
     createPremiumRequiredResponse,
     type PremiumFeature
   } from '../_shared/quota-check.ts'
   ```

2. **Premium-only actions list**
   ```typescript
   const PREMIUM_ONLY_ACTIONS: string[] = [
     'run_simulation',
     'analyze_vendors',
     'suggest_seating'
   ]
   ```

3. **Base-accessible actions list**
   ```typescript
   const BASE_ACCESSIBLE_ACTIONS: string[] = [
     'create_event',
     'search_events',
     'get_event_details',
     'schedule_create',
     'schedule_update',
     'schedule_delete'
   ]
   ```

4. **Tier check before execution**
   ```typescript
   // After fetching action data
   const actionData = actionRecord.action_data as Record<string, unknown>
   const actionType = actionRecord.action_type

   // Check if action is Premium-only
   if (PREMIUM_ONLY_ACTIONS.includes(actionType)) {
     const tierCheck = await checkPremiumFeature(supabase, userId, actionType as PremiumFeature)

     if (!tierCheck.allowed) {
       console.log(`Premium-only action ${actionType} denied for tier ${tierCheck.tier}`)
       return createPremiumRequiredResponse(actionType)
     }

     console.log(`Premium action ${actionType} allowed for tier ${tierCheck.tier}`)
   }
   ```

5. **Tool list adaptation for tier**
   - In AI chat, filter tool list based on tier
   - Remove simulation, vendor_analysis, seating tools for Base tier
   - Keep create_event, search_events, get_event_tools for Base tier

---

## Required Implementation

### Step 1: Add Imports (Line 6)
```typescript
import {
  checkPremiumFeature,
  createPremiumRequiredResponse,
  type PremiumFeature
} from '../_shared/quota-check.ts'
```

### Step 2: Define Action Lists (after line 59)
```typescript
// Premium-only actions (require Premium tier)
const PREMIUM_ONLY_ACTIONS: string[] = [
  'run_simulation',         // Day Simulation (Phase 9)
  'analyze_vendors',       // Vendor Analysis (Phase 8)
  'suggest_seating'        // Seating suggestions (Phase 7)
]

// Base-accessible actions (available to all)
const BASE_ACCESSIBLE_ACTIONS: string[] = [
  'create_event',           // Create event draft
  'search_events',          // Search events
  'get_event_details',      // Get event details
  'schedule_create',        // Create schedule item
  'schedule_update',        // Update schedule item
  'schedule_delete',        // Delete schedule item
]
```

### Step 3: Add tier check logic (after line ~250, before action execution)
```typescript
// Check if action requires Premium tier
if (PREMIUM_ONLY_ACTIONS.includes(actionType)) {
  const tierCheck = await checkPremiumFeature(
    supabase,
    userId,
    actionType as PremiumFeature
  )

  if (!tierCheck.allowed) {
    console.log(`Premium-only action ${actionType} denied for tier ${tierCheck.tier}`)
    return createPremiumRequiredResponse(actionType)
  }

  console.log(`Premium action ${actionType} allowed for tier ${tierCheck.tier}`)
}

// Base-accessible actions always allowed
console.log(`Base-accessible action ${actionType} allowed for all tiers`)
```

---

## Implementation Priority

| Component | Priority | Time Estimate |
|-----------|----------|---------------|
| Add imports from quota-check.ts | HIGH | 5 min |
| Define action type lists | HIGH | 5 min |
| Add tier check before execution | HIGH | 10 min |
| Tool list filtering in ai-chat | MEDIUM | 30 min |
| Test with Base tier user | HIGH | 15 min |
| Test with Premium tier user | HIGH | 15 min |
| Documentation update | LOW | 10 min |

**Total Time:** ~1.5 hours

---

## Testing Plan

### Test 1: Base Tier - Premium Action
```typescript
// 1. Create Base tier organization
// 2. Create ai_insights_log with action_type = 'run_simulation'
// 3. Call execute-ai-action with action_id
// Expected: 403 Forbidden with "Premium feature" error
```

### Test 2: Premium Tier - Premium Action
```typescript
// 1. Create Premium tier organization
// 2. Create ai_insights_log with action_type = 'run_simulation'
// 3. Call execute-ai-action with action_id
// Expected: Action executes successfully
```

### Test 3: Base Tier - Base Action
```typescript
// 1. Create Base tier organization
// 2. Create ai_insights_log with action_type = 'create_event'
// 3. Call execute-ai-action with action_id
// Expected: Action executes successfully
```

---

## Integration Points

**AI Chat Function:**
- Filter tool list based on user tier
- Remove simulation, vendor_analysis, seating tools for Base tier
- Keep create_event, search_events, get_event_tools

**execute-ai-action Function:**
- Tier check at entry (before action execution)
- 403 response for Premium-only actions on Base tier
- Full execution for Premium tier or Base-accessible actions

---

## Error Responses

**Premium Required (403):**
```typescript
return createPremiumRequiredResponse(actionType)
```

**Response Structure:**
```json
{
  "error": "Premium feature",
  "message": "run_simulation is a Premium feature.",
  "feature": "run_simulation",
  "upgradeUrl": "/settings/billing"
}
```

---

## Verification

✅ File exists and functional (20024 bytes)
✅ No tier checks currently implemented
✅ Needs: Imports from quota-check.ts
✅ Needs: Action type lists (PREMIUM_ONLY_ACTIONS, BASE_ACCESSIBLE_ACTIONS)
✅ Needs: Tier check logic before action execution
✅ Needs: 403 response for Premium-only actions on Base tier
⚠️ Tool list filtering in ai-chat not yet implemented

---

## Deployment Status

**Status:** ⚠️ NEEDS IMPLEMENTATION

**Already Exists:**
- ✅ execute-ai-action/index.ts (20024 bytes, no tier checks)
- ✅ Conflict re-check functions
- ✅ Action execution logic
- ✅ Authorization checks
- ✅ Execution status tracking

**Needs Implementation:**
- ⏳ Import quota-check utilities
- ⏳ Define PREMIUM_ONLY_ACTIONS array
- ⏳ Define BASE_ACCESSIBLE_ACTIONS array
- ⏳ Add tier check before execution
- ⏳ Return 403 for Premium-only actions
- ⏳ Filter tool list in ai-chat based on tier

---

## Next Steps

Since Plan 11-04 is **NEEDS IMPLEMENTATION**, the recommended approach is:

**Option 1: Complete Plan 11-04 (Recommended)**
- Implement tier checks in execute-ai-action
- Add imports, action lists, tier logic
- Test with Base and Premium tiers
- Estimated time: 1.5 hours

**Option 2: Skip for Now**
- Mark as deferred to future sprint
- Continue to Plans 11-05, 11-06, 11-07
- Revisit when Tier Enforcement is prioritized

**Option 3: Create New Plan**
- Create separate plan for AI chat tool filtering
- Focus on execute-ai-action tier checks separately
- Estimated time: 2 hours (both parts)

---

## Decision Point

**Recommendation:** Option 1 - Complete Plan 11-04

**Rationale:**
- execute-ai-action is a critical function for Premium feature enforcement
- Tier checks should be at Edge Function level (not just UI)
- Completing now ensures consistent enforcement across all AI operations
- Implementation is straightforward (follows same pattern as ai-chat)

---

**Completion Date:** 2026-02-04
**File:** `eventflow-app/supabase/functions/execute-ai-action/index.ts` (20024 bytes, partial)
**Phase Progress:** 11/93% (3/7 plans complete, 1 partial)
**Status:** NEEDS IMPLEMENTATION - Requires ~1.5 hours to complete
