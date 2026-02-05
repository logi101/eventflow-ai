---
phase: 12-feature-gating
plan: 05
type: summary
completed: 2026-02-04
status: COMPLETE
---

# Summary: AI System Prompt with Tier Awareness

**Objective:** Update AI chat system prompt to include tier context and feature limitations.

**Status:** ✅ COMPLETE

---

## Files Modified

### File: `eventflow-app/supabase/functions/ai-chat/index.ts`

**Changes Made:**

#### 1. Store User Tier

```typescript
// Before
if (userId) {
  const quotaResult = await checkQuota(supabase, userId, 'ai_messages')
  if (!quotaResult.allowed) {
    console.log(`AI chat quota exceeded for user ${userId}, tier: ${quotaResult.tier}`)
    return createQuotaExceededResponse('ai_messages', quotaResult)
  }
  console.log(`AI chat allowed for user ${userId}, tier: ${quotaResult.tier}, remaining: ${quotaResult.remaining ?? 'unlimited'}`)
}

// After
let userTier: 'base' | 'premium' | 'legacy_premium' = 'base'
if (userId) {
  const quotaResult = await checkQuota(supabase, userId, 'ai_messages')
  if (!quotaResult.allowed) {
    console.log(`AI chat quota exceeded for user ${userId}, tier: ${quotaResult.tier}`)
    return createQuotaExceededResponse('ai_messages', quotaResult)
  }
  userTier = quotaResult.tier
  console.log(`AI chat allowed for user ${userId}, tier: ${quotaResult.tier}, remaining: ${quotaResult.remaining ?? 'unlimited'}`)
}
```

**Purpose:** Store the user's tier for later use in system prompt and tool filtering.

---

#### 2. Tier-Aware System Prompt

```typescript
// Build system instruction (separate from messages - Gemini processes this as true system prompt)
let systemInstruction = SYSTEM_PROMPT

// Add tier-specific instructions
if (userTier === 'base') {
  systemInstruction += `\n\n--- מגבלות התוכנית (Base Tier) ---\n`
  systemInstruction += `הנך על גרסת ה-Basic של EventFlow AI. יש לך גישה מוגבלת לתכונות מסוימות:\n\n`
  systemInstruction += `**תכונות Premium שאינן זמינות:**\n`
  systemInstruction += `- סימולציית יום האירוע (Day Simulation)\n`
  systemInstruction += `- מנוע הנטוורקינג (Networking Engine)\n`
  systemInstruction += `- התראות תקציב (Budget Alerts)\n`
  systemInstruction += `- ניתוח ספקים (Vendor Analysis)\n\n`
  systemInstruction += `**הנחיות חשובות:**\n`
  systemInstruction += `- אל תציעי פתרונות הקשורים לתכונות Premium הללו\n`
  systemInstruction += `- אם המשתמש מבקש תכונת Premium, תודיעי לו בנימוס שזו תכונת Premium\n`
  systemInstruction += `- הציעי לו לשדרג ל-Premium אם הוא מעוניין\n\n`
} else if (userTier === 'premium' || userTier === 'legacy_premium') {
  systemInstruction += `\n\n--- מצב Premium ---\n`
  systemInstruction += `הנך על גרסת ה-Premium של EventFlow AI. יש לך גישה מלאה לכל התכונות, כולל:\n`
  systemInstruction += `- סימולציית יום האירוע\n`
  systemInstruction += `- מנוע הנטוורקינג\n`
  systemInstruction += `- התראות תקציב\n`
  systemInstruction += `- ניתוח ספקים\n\n`
}
```

**Purpose:** Add tier-specific instructions to the system prompt so the AI knows which features are available.

**Base Tier Instructions:**
- Lists forbidden Premium features
- Instructs AI to not suggest Premium features
- Politely informs users when they request Premium features
- Suggests upgrading if interested

**Premium Tier Instructions:**
- Confirms full access to all features
- Lists all available Premium features

---

#### 3. Tool Filtering Based on Tier

```typescript
// ====================================================================
// Filter tools based on tier (Base tier can't access Premium features)
// ====================================================================

const PREMIUM_ONLY_TOOLS = new Set([
  'suggest_room_assignments',  // Networking Engine - Premium only
])

let availableTools = TOOL_DECLARATIONS
if (userTier === 'base') {
  // Filter out Premium-only tools
  availableTools = TOOL_DECLARATIONS.filter(tool => !PREMIUM_ONLY_TOOLS.has(tool.name))
  console.log(`Base tier: filtered ${TOOL_DECLARATIONS.length} tools to ${availableTools.length} (removed ${TOOL_DECLARATIONS.length - availableTools.length} Premium tools)`)
} else {
  console.log(`Premium tier: all ${TOOL_DECLARATIONS.length} tools available`)
}
```

**Purpose:** Filter the tool declarations passed to Gemini API based on user tier.

**Premium-Only Tools:**
- `suggest_room_assignments` - Networking Engine (Premium only)

**Behavior:**
- **Base Tier:** Filters out Premium-only tools (14 tools → 13 tools)
- **Premium Tier:** All tools available (14 tools)

---

#### 4. Updated `callGemini` Function Signature

```typescript
// Before
async function callGemini(
  apiKey: string,
  messages: GeminiMessage[],
  systemInstruction: string
): Promise<{ parts: GeminiPart[]; usageMetadata?: { totalTokenCount?: number } }>

// After
async function callGemini(
  apiKey: string,
  messages: GeminiMessage[],
  systemInstruction: string,
  tools: typeof TOOL_DECLARATIONS = TOOL_DECLARATIONS
): Promise<{ parts: GeminiPart[]; usageMetadata?: { totalTokenCount?: number } }>
```

**Purpose:** Accept filtered tools parameter instead of always using TOOL_DECLARATIONS.

---

#### 5. Updated `callGemini` Request Body

```typescript
// Before
const requestBody: Record<string, unknown> = {
  contents: messages,
  tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
  ...
}

// After
const requestBody: Record<string, unknown> = {
  contents: messages,
  tools: [{ functionDeclarations: tools }],
  ...
}
```

**Purpose:** Use the filtered tools parameter in the Gemini API request.

---

#### 6. Updated `callGemini` Function Calls

```typescript
// Before
const geminiResult = await callGemini(geminiApiKey, messages, systemInstruction)
const finalResult = await callGemini(geminiApiKey, messages, systemInstruction)

// After
const geminiResult = await callGemini(geminiApiKey, messages, systemInstruction, availableTools)
const finalResult = await callGemini(geminiApiKey, messages, systemInstruction, availableTools)
```

**Purpose:** Pass filtered tools to both the initial and final Gemini calls.

---

## Premium Features Blocked in System Prompt

| Feature | Hebrew Name | Description |
|---------|-------------|-------------|
| `simulation` | סימולציית יום האירוע | Day Simulation |
| `networking` | מנוע הנטוורקינג | Networking Engine |
| `budget_alerts` | התראות תקציב | Budget Alerts |
| `vendor_analysis` | ניתוח ספקים | Vendor Analysis |

---

## Premium Tools Filtered

| Tool Name | Description | Tier |
|-----------|-------------|------|
| `suggest_room_assignments` | הצעת שיוך חדרים אוטומטית למשתתפים לפי עדיפויות VIP | Premium only |

---

## Tool Count by Tier

| Tier | Available Tools | Removed Tools |
|------|-----------------|---------------|
| Base | 13 | 1 (suggest_room_assignments) |
| Premium | 14 | 0 |
| Legacy Premium | 14 | 0 |

---

## System Prompt Examples

### Base Tier System Prompt (Partial)

```
את שותפה אמיתית לתכנון והפקת אירועים בשם EventFlow AI.
...

--- מגבלות התוכנית (Base Tier) ---
הנך על גרסת ה-Basic של EventFlow AI. יש לך גישה מוגבלת לתכונות מסוימות:

**תכונות Premium שאינן זמינות:**
- סימולציית יום האירוע (Day Simulation)
- מנוע הנטוורקינג (Networking Engine)
- התראות תקציב (Budget Alerts)
- ניתוח ספקים (Vendor Analysis)

**הנחיות חשובות:**
- אל תציעי פתרונות הקשורים לתכונות Premium הללו
- אם המשתמש מבקש תכונת Premium, תודיעי לו בנימוס שזו תכונת Premium
- הציעי לו לשדרג ל-Premium אם הוא מעוניין
```

### Premium Tier System Prompt (Partial)

```
את שותפה אמיתית לתכנון והפקת אירועים בשם EventFlow AI.
...

--- מצב Premium ---
הנך על גרסת ה-Premium של EventFlow AI. יש לך גישה מלאה לכל התכונות, כולל:
- סימולציית יום האירוע
- מנוע הנטוורקינג
- התראות תקציב
- ניתוח ספקים
```

---

## TypeScript Compilation

```bash
cd eventflow-app && npx tsc --noEmit --skipLibCheck
```

**Result:** ✅ No errors

---

## Testing Recommendations

### Manual Testing Steps

1. **Base Tier Testing:**
   - Set organization tier to `base`
   - Ask AI about Premium features (simulation, networking, budget alerts, vendor analysis)
   - Verify AI explains these are Premium features
   - Verify AI suggests upgrading if interested
   - Verify `suggest_room_assignments` tool is not available

2. **Premium Tier Testing:**
   - Set organization tier to `premium`
   - Ask AI about Premium features
   - Verify AI confirms access to all features
   - Verify `suggest_room_assignments` tool is available
   - Verify AI can use all tools

### Example Conversations

**Base Tier User:** "אני רוצה להריץ סימולציה ליום האירוע"

**Expected AI Response (Base):**
"סימולציית יום האירוע היא תכונת Premium. בגרסת ה-Basic של EventFlow AI, אין גישה לסימולציה. האם תרצה לשדרג ל-Premium?"

**Premium Tier User:** "אני רוצה להריץ סימולציה ליום האירוע"

**Expected AI Response (Premium):**
"בשמחה! אציע לך להריץ סימולציה ליום האירוע. הסימולציה תבדוק..."

---

## Success Criteria

✅ System prompt includes tier context (base/premium)
✅ Base prompt lists forbidden features (simulation, networking, budget_alerts, vendor_analysis)
✅ Base prompt instructs AI to not suggest Premium features
✅ Base prompt includes upgrade suggestion
✅ Premium prompt confirms full feature access
✅ Function calling adapts tool list to tier (filters suggest_room_assignments for Base)
✅ TypeScript compilation successful
✅ No breaking changes to existing functionality

---

## Next Steps

Continue to:
- **Plan 12-06:** Central Tiers Registry

---

**Completion Date:** 2026-02-04
**File Modified:** 1 file
**Lines Changed:** ~100 lines (added tier-aware system prompt, tool filtering)
**Phase Progress:** 12/83% (5/6 plans complete)
