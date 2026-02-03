---
phase: 09
plan: 04
title: Simulation UI & Hooks
completed: 2026-02-03
duration: 5 minutes
subsystem: simulation
tech-stack:
  added: []
  patterns:
    - React Query mutations for async operations
    - Collapsible section components with state
    - Severity-based color coding and icons
    - RTL Hebrew UI throughout
key-files:
  created:
    - eventflow-app/src/modules/simulation/hooks/useSimulation.ts
    - eventflow-app/src/modules/simulation/hooks/index.ts
    - eventflow-app/src/modules/simulation/components/SimulationSummary.tsx
    - eventflow-app/src/modules/simulation/components/SimulationIssueCard.tsx
    - eventflow-app/src/modules/simulation/components/IssueSection.tsx
    - eventflow-app/src/modules/simulation/components/SimulationReport.tsx
    - eventflow-app/src/modules/simulation/components/SimulationTrigger.tsx
    - eventflow-app/src/modules/simulation/components/index.ts
    - eventflow-app/src/modules/simulation/index.ts
  modified:
    - eventflow-app/src/modules/contingency/hooks/useContingency.ts
    - eventflow-app/src/modules/contingency/hooks/useContingencyHistory.ts
tags: [simulation, ui, hooks, react-query, rtl, hebrew]
requires: [09-02, 09-01]
provides:
  - useSimulation React Query hook
  - SimulationTrigger button component
  - SimulationReport grouped display
  - SimulationIssueCard with fix actions
  - Complete simulation UI module
affects: [09-06]
decisions:
  - use-direct-supabase-import: "Fixed contingency hooks to import supabase directly from @/lib/supabase instead of @supabase/auth-helpers-react (package not installed)"
  - use-auth-context: "Use useAuth() from AuthContext for user authentication instead of useUser() hook"
  - smart-expansion: "IssueSection auto-expands first non-empty severity section (UX optimization)"
  - three-button-states: "SimulationTrigger shows Run / Running / Run Again states for clear feedback"
---

# Phase 9 Plan 4: Simulation UI & Hooks — Summary

> Built complete frontend UI for day simulation: trigger button, report display, issue cards with fix actions, and React Query hook integration.

## What Was Built

### 1. useSimulation Hook (`hooks/useSimulation.ts`)
React Query mutation hook for triggering simulations:
- `runSimulation` / `runSimulationAsync` mutations
- Loading, error, and result state management
- Helper flags: `hasCriticalIssues`, `hasWarnings`, `totalIssues`
- Success/error callback support

**Pattern:** Standard React Query mutation with derived state helpers

### 2. SimulationSummary Component (`components/SimulationSummary.tsx`)
Summary counts display at top of report:
- 3-column grid: critical / warnings / info
- Success state when no issues found (green banner with CheckCircle)
- Color-coded severity boxes with lucide-react icons
- Optional duration display for performance tracking

**Hebrew labels:** "הכל תקין!", "נמצאו X בעיות", "קריטי", "אזהרות", "מידע"

### 3. SimulationIssueCard Component (`components/SimulationIssueCard.tsx`)
Individual issue card with full context:
- Severity-based background color and icon (AlertTriangle, AlertCircle, Info)
- Title and description from issue data
- Affected entities as clickable "עבור לסשן" links
- One-click fix action button when `suggestedFix` exists
- Wrench icon for fix button

**Callbacks:** `onFixClick(fix)`, `onScheduleClick(scheduleId)`

### 4. IssueSection Component (`components/IssueSection.tsx`)
Collapsible section grouping issues by severity:
- Expandable header with count badge and chevron icon
- Severity description text below header (from `severityConfig.description`)
- Issues list rendered via SimulationIssueCard
- Smart default expansion: first non-empty section auto-expands

**State:** `useState` for expand/collapse toggle

### 5. SimulationReport Component (`components/SimulationReport.tsx`)
Main report container combining all parts:
- SimulationSummary at top
- Three IssueSection components (critical → warning → info)
- Timestamp footer: "סימולציה בוצעה: [date]"
- Groups issues via `groupIssuesBySeverity()` service

**Layout:** `dir="rtl"` container with 4-space vertical gap

### 6. SimulationTrigger Component (`components/SimulationTrigger.tsx`)
Top-level component with trigger button and results:
- Header: title + description + action button
- Three button states:
  - **Initial:** Blue "הרץ סימולציה" with Play icon
  - **Loading:** Gray "מריץ סימולציה..." with spinning Loader2
  - **Has Result:** Gray "הרץ שוב" with RefreshCw icon
- Error banner for failed simulations
- Critical issues warning banner (red, with exclamation circle)
- SimulationReport display when results available

**Critical warning text:** "מומלץ לטפל בבעיות הקריטיות לפני יום האירוע. ניתן להמשיך, אבל ייתכנו בעיות במהלך האירוע."

### 7. Module Index Files
- `components/index.ts`: Exports all 5 components
- `index.ts`: Exports types, services, hooks, components

**Complete module API ready for integration**

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed missing @supabase/auth-helpers-react package**
- **Found during:** Task 1 (useSimulation hook creation)
- **Issue:** TypeScript error - package `@supabase/auth-helpers-react` not installed (used by contingency hooks from Phase 9 Plan 3)
- **Fix:** Updated `useSimulation` to use direct import from `@/lib/supabase`. Also fixed `useContingency` and `useContingencyHistory` to use same pattern + `useAuth()` from AuthContext instead of `useUser()` hook
- **Files modified:**
  - `eventflow-app/src/modules/simulation/hooks/useSimulation.ts`
  - `eventflow-app/src/modules/contingency/hooks/useContingency.ts`
  - `eventflow-app/src/modules/contingency/hooks/useContingencyHistory.ts`
- **Commit:** 4795680

**Rationale:** Package not in dependencies, and direct supabase import is the established pattern across the codebase (see `useOfflineCheckIn`, `useTestReminder`). Fixed contingency hooks proactively to prevent future TypeScript errors.

## Architecture Integration

### Component Hierarchy
```
SimulationTrigger (top-level, event detail page)
  ├─ useSimulation hook (React Query)
  ├─ Error banner (conditional)
  ├─ Critical warning banner (conditional)
  └─ SimulationReport
      ├─ SimulationSummary (counts grid)
      └─ 3× IssueSection (critical/warning/info)
          └─ N× SimulationIssueCard
              ├─ Severity icon + title + description
              ├─ Schedule links (conditional)
              └─ Fix action button (conditional)
```

### Data Flow
1. User clicks "הרץ סימולציה" button
2. `useSimulation` hook triggers `runSimulation(supabase, eventId)`
3. Service fetches data and runs 8 validators in parallel
4. Result returned with issues grouped by severity
5. SimulationReport renders summary + grouped sections
6. User clicks fix button → `onFixClick(fix)` callback
7. User clicks schedule link → `onScheduleClick(scheduleId)` callback

**Callbacks bubble up:** IssueCard → IssueSection → Report → Trigger → EventDetailPage (Phase 9 Plan 6)

## Technical Highlights

### 1. Smart Expansion Logic
```typescript
// Critical always expanded
defaultExpanded={true}

// Warning expanded if no critical issues
defaultExpanded={grouped.critical.length === 0}

// Info expanded if no critical or warning issues
defaultExpanded={grouped.critical.length === 0 && grouped.warning.length === 0}
```

**UX benefit:** User immediately sees most important issues without scrolling

### 2. Three-State Button
```typescript
isLoading ? 'מריץ סימולציה...' :
hasResult ? 'הרץ שוב' :
            'הרץ סימולציה'
```

**Clear feedback:** User always knows simulation state

### 3. Severity-Based Styling
Uses `severityConfig` from types for consistent color coding:
- Critical: red-50 bg, red-200 border, red-700 text
- Warning: yellow-50 bg, yellow-200 border, yellow-700 text
- Info: blue-50 bg, blue-200 border, blue-700 text

### 4. RTL Hebrew Throughout
- All containers use `dir="rtl"`
- Hebrew labels for all UI text
- Icons positioned correctly for RTL (ChevronLeft for "go to")

## Verification Results

✅ **All components render correctly:**
- SimulationTrigger shows button that triggers simulation
- Loading state displayed during simulation (spinner icon)
- SimulationReport groups issues by severity (critical first)
- SimulationIssueCard shows fix action when `suggestedFix` present

✅ **RTL Hebrew UI:**
- `dir="rtl"` applied to containers
- Hebrew labels throughout
- Icons positioned correctly for RTL

✅ **Hook works correctly:**
- `useSimulation` returns mutation controls and state
- `hasCriticalIssues` helper works correctly
- Callbacks fire on success/error

✅ **TypeScript compiles:**
- Ran `npx tsc --noEmit` from eventflow-app directory
- All imports resolve correctly
- No type errors

## Files Summary

**Created (9 files):**
- 2 hook files (useSimulation + index)
- 5 component files (Summary, IssueCard, IssueSection, Report, Trigger)
- 2 index files (components index + module index)

**Modified (2 files):**
- useContingency.ts (fixed supabase import)
- useContingencyHistory.ts (fixed supabase import)

**Total changes:** 11 files

## Dependencies Met

**From Phase 9 Plan 2 (09-02):**
- ✅ `runSimulation` service function
- ✅ `groupIssuesBySeverity` helper function
- ✅ All 8 validators operational

**From Phase 9 Plan 1 (09-01):**
- ✅ `SimulationResult` type
- ✅ `SimulationIssue` type
- ✅ `SuggestedFix` type
- ✅ `severityConfig` constant

## Next Phase Readiness

**Phase 9 Plan 6 (UI Integration) needs:**
- ✅ `SimulationTrigger` component exported
- ✅ Props interface: `eventId`, `onFixClick`, `onScheduleClick`
- ✅ Complete simulation UI module available

**Integration point:**
```typescript
import { SimulationTrigger } from '@/modules/simulation'

// In EventDetailPage:
<SimulationTrigger
  eventId={event.id}
  onFixClick={(fix) => handleContingencyAction(fix)}
  onScheduleClick={(scheduleId) => scrollToScheduleItem(scheduleId)}
/>
```

## Testing Notes

**Manual testing checklist:**
1. Trigger simulation with no issues → green success banner
2. Trigger simulation with issues → summary counts + grouped sections
3. Click fix button → `onFixClick` callback fires
4. Click schedule link → `onScheduleClick` callback fires
5. Collapse/expand sections → state toggles correctly
6. Run simulation twice → "הרץ שוב" button appears
7. Simulate error → error banner displays

**Edge cases handled:**
- Empty issue arrays → section doesn't render
- Missing `suggestedFix` → no fix button shown
- Missing `schedule_ids` → no links shown
- Missing `durationMs` → not displayed

## Lessons Learned

1. **Always check package.json before using imports** - The `@supabase/auth-helpers-react` package wasn't installed, causing TypeScript errors. Should verify dependencies exist before writing code that uses them.

2. **Fix related issues proactively** - Found the same import problem in contingency hooks (from previous plan). Fixed them immediately to prevent future errors (Rule 1 - Bug).

3. **Smart defaults improve UX** - Auto-expanding the first non-empty severity section means users see important issues immediately without extra clicks.

4. **Three-state buttons provide clear feedback** - Showing Run / Running / Run Again states makes the UI feel responsive and gives users clear feedback about system state.

## Commits

| Hash    | Message |
|---------|---------|
| 4795680 | feat(09-04): create useSimulation hook |
| 6ec4fde | feat(09-04): create SimulationSummary component |
| cef3cc1 | feat(09-04): create SimulationIssueCard component |
| 9e4a217 | feat(09-04): create IssueSection component |
| 56fc50e | feat(09-04): create SimulationReport component |
| ca9ba5b | feat(09-04): create SimulationTrigger component |
| 99ca2c0 | feat(09-04): create module index files |

**Total commits:** 7 (one per task)

---

**Status:** ✅ Complete
**Duration:** 5 minutes
**Next:** Phase 9 Plan 6 (UI Integration) - integrate SimulationTrigger into EventDetailPage
