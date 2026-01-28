# Codebase Concerns

**Analysis Date:** 2026-01-28

## Critical Architecture Issues

### Monolithic App Component
- **Issue:** `src/App.tsx` is 8,368 lines - contains all routing, event management, participant handling, vendor management, messaging, schedules, checklists, feedback, and checkin logic in a single file
- **Files:** `src/App.tsx`
- **Impact:**
  - Unmaintainable - impossible to locate specific features
  - Single point of failure for entire application
  - Difficult to test any single feature in isolation
  - Performance degradation as component tree grows
  - Code splitting ineffective
- **Fix approach:**
  - Migrate feature routes to dedicated page components (most are already in `src/pages/` but not used)
  - Extract business logic to services and custom hooks
  - Use React lazy loading and code splitting per route
  - Move state management out of App.tsx to context providers

### Excessive State Management in Single Components
- **Issue:** Multiple pages maintain dozens of useState hooks (EventDetailPage has 40+ state variables across form states, edit states, modal states)
- **Files:**
  - `src/pages/events/EventDetailPage.tsx` (2,099 lines, 40+ useState hooks)
  - `src/pages/program/ProgramManagementPage.tsx` (1,084 lines)
  - `src/pages/messages/MessagesPage.tsx` (730 lines)
- **Impact:**
  - State management is fragile and error-prone
  - Renders trigger on any state change affecting unrelated parts
  - Complex form handling with scattered state
  - Difficult to reason about component behavior
- **Fix approach:**
  - Extract form state into useReducer or custom hooks
  - Use React Hook Form for complex forms
  - Implement proper state isolation with context
  - Consider TanStack Query for server state

## Dependency & Environment Issues

### Secret Exposure Risk
- **Issue:** `.env` file committed to repository with real Supabase credentials (URL + ANON KEY visible)
- **Files:** `.env`
- **Impact:**
  - Anyone with repo access has database connection credentials
  - Anon key allows direct database writes from any origin
  - Credentials in git history (cannot be revoked without full repo reset)
  - Violates security best practices
- **Fix approach:**
  - Remove `.env` from git immediately (git rm --cached, add to .gitignore)
  - Regenerate Supabase credentials
  - Use Supabase RLS policies strictly on all tables
  - Document env var setup in README (.env.example with dummy values)

### Missing Error Boundary for Supabase Initialization
- **Issue:** `src/lib/supabase.ts` throws error if env vars missing, but no error boundary catches this
- **Files:** `src/lib/supabase.ts`
- **Impact:**
  - App crashes silently if Supabase URL or key missing
  - No user-facing error message
  - Development/staging environment setup failures hard to debug
- **Fix approach:**
  - Add React Error Boundary at app root
  - Implement graceful fallback UI for missing config
  - Add startup validation with helpful error messages

### Optional Chaining in ChatService Initialization
- **Issue:** `src/services/chatService.ts` line 20-21 uses `|| ''` fallback, creating empty strings instead of failing fast
- **Files:** `src/services/chatService.ts`
- **Impact:**
  - Silent initialization failures
  - API calls fail at runtime with cryptic errors
  - Harder to debug than explicit error on startup
- **Fix approach:**
  - Throw on missing env vars like `src/lib/supabase.ts`
  - Add env validation utility
  - Test env setup during app startup

## React & State Management Issues

### Missing Dependency in ChatContext useEffect
- **Issue:** `src/contexts/ChatContext.tsx` line 243 calls `toggleChat()` inside useEffect, but `toggleChat` defined after effect (lines 264+) and dependency array only includes `state.settings.shortcutKey`
- **Files:** `src/contexts/ChatContext.tsx` (lines 226-249)
- **Impact:**
  - Potential stale closure issues
  - Keyboard shortcut may not work with latest state
  - Breaking React hooks linting rules
- **Fix approach:**
  - Move `toggleChat` definition before useEffect or use useCallback before effect
  - Add `toggleChat` to dependency array (or use useRef + useCallback pattern)
  - Enable ESLint exhaustive-deps rule

### Potential Race Condition in EventContext
- **Issue:** `src/contexts/EventContext.tsx` line 66-69: `selectEventById` called in useEffect based on `allEvents` dependency, but `selectEventById` itself modifies state used by effect
- **Files:** `src/contexts/EventContext.tsx` (lines 52-69)
- **Impact:**
  - May trigger infinite updates or miss updates
  - localStorage state may be out of sync with selected event
  - Component may not correctly restore selected event on mount
- **Fix approach:**
  - Separate concerns: loading events vs restoring selected event
  - Use useCallback for `selectEventById` with proper dependencies
  - Add guard to prevent circular updates

### localStorage Parsing Without Error Handling
- **Issue:** `src/contexts/ChatContext.tsx` lines 24-51 parse localStorage with try/catch but silently ignore errors
- **Files:** `src/contexts/ChatContext.tsx`
- **Impact:**
  - Corrupted localStorage data silently reverts to defaults
  - No indication to user that data was lost
  - Makes debugging data persistence issues harder
- **Fix approach:**
  - Log parsing errors (development only)
  - Consider implementing data recovery for corrupted settings
  - Add version/schema validation for stored data

### Missing Unsubscription in AuthContext
- **Issue:** `src/contexts/AuthContext.tsx` correctly unsubscribes from auth listener (line 44), but pattern should be consistent across all contexts
- **Files:** `src/contexts/AuthContext.tsx`
- **Impact:**
  - This one is correct, but other contexts may have memory leaks
  - Good model to follow for other listeners
- **Fix approach:**
  - Audit all useEffect hooks with event listeners
  - Ensure all subscriptions have cleanup functions

## Testing & Quality Gaps

### Zero Test Coverage
- **Issue:** No test files found in `src/` directory. package.json has playwright configured but no test files.
- **Files:** All source files lack corresponding .test.ts/.spec.ts files
- **Impact:**
  - No regression detection on refactors
  - No CI/CD validation
  - Brittle to changes in complex components
  - Edge cases undiscovered until production
- **Fix approach:**
  - Set up unit testing (vitest preferred for Vite)
  - Add component tests for page components
  - Create integration tests for critical flows (auth, event creation)
  - Target 60%+ coverage on business logic

### Missing Error Handling in fetch() Calls
- **Issue:** `src/hooks/useMessages.ts` lines 190, 268 use fetch() without proper error handling
- **Files:** `src/hooks/useMessages.ts`
- **Impact:**
  - Network errors silently fail
  - No user feedback on send failure
  - Potential for double-sends or lost messages
- **Fix approach:**
  - Wrap fetch calls in try/catch
  - Validate response.ok before parsing
  - Add retry logic with exponential backoff
  - Show toast/alert to user on failure

## Performance Concerns

### N+1 Query Pattern in EventContext
- **Issue:** `src/contexts/EventContext.tsx` lines 85-103 loads participant and schedule counts separately for each event using Promise.all
- **Files:** `src/contexts/EventContext.tsx` (refreshEvents function)
- **Impact:**
  - With 100 events, makes 100+ database requests
  - Sequential at load time but poor for dynamic updates
  - No caching or pagination
- **Fix approach:**
  - Use single aggregate query with SQL aggregation
  - Implement pagination for large event lists
  - Cache counts at database level (materialized view)
  - Consider TanStack Query for automatic caching

### Large Component Re-renders
- **Issue:** EventDetailPage and similar pages have excessive state that triggers full re-renders
- **Files:**
  - `src/pages/events/EventDetailPage.tsx`
  - `src/pages/program/ProgramManagementPage.tsx`
- **Impact:**
  - Slow interactive response to form inputs
  - Lag when opening/closing modals
  - Expensive form validation on every keystroke
- **Fix approach:**
  - Implement React.memo on modal components
  - Use useTransition for non-urgent updates
  - Split form state with useReducer
  - Profile with React DevTools

### No Code Splitting
- **Issue:** All routes bundled together, single App.tsx imported everywhere
- **Files:** `src/App.tsx`, all pages
- **Impact:**
  - Initial bundle size includes all page code
  - Poor Core Web Vitals on slow connections
  - No lazy loading benefit from routes
- **Fix approach:**
  - Implement React.lazy() for each route
  - Use Vite route-based code splitting
  - Implement route-level preloading
  - Measure bundle size impact

## Data Persistence Issues

### Unserialization of localStorage Data
- **Issue:** `src/contexts/ChatContext.tsx` line 44 converts timestamp string back to Date object, but other complex types not handled
- **Files:** `src/contexts/ChatContext.tsx`
- **Impact:**
  - Objects with methods lost on hydration
  - Type information not preserved
  - Harder to evolve stored data schema
- **Fix approach:**
  - Add schema validation with Zod for stored objects
  - Implement migration function for schema updates
  - Add version field to stored data
  - Consider IndexedDB for complex data

### No Data Validation Before Database Insert
- **Issue:** Many mutations insert data without client-side validation (relies on server RLS)
- **Files:** `src/App.tsx`, all pages with forms
- **Impact:**
  - Server rejects requests without user feedback
  - Poor UX on validation errors
  - Network round-trip wasted
- **Fix approach:**
  - Implement Zod schema validation before every insert/update
  - Show validation errors in form fields
  - Provide helpful hints for invalid data
  - Use React Hook Form with Zod integration

## Security Concerns

### Hardcoded Slash Commands
- **Issue:** `src/hooks/usePageContext.ts` likely contains hardcoded slash commands without access control
- **Files:** `src/hooks/usePageContext.ts` (referenced in chatService.ts)
- **Impact:**
  - Any command available to any user regardless of permissions
  - No RBAC enforcement on actions
  - Users may execute actions they shouldn't
- **Fix approach:**
  - Validate command access against user permissions
  - Filter available commands based on user role
  - Log all command executions
  - Add RBAC middleware to all actions

### Browser Storage of Chat History
- **Issue:** `src/contexts/ChatContext.tsx` stores messages in localStorage (line 221-222)
- **Files:** `src/contexts/ChatContext.tsx`
- **Impact:**
  - Sensitive event/participant data stored in browser
  - Visible in DevTools
  - Not encrypted
  - Persists if device compromised
- **Fix approach:**
  - Move chat history to server (add to database schema)
  - Clear localStorage on logout
  - If local storage needed, encrypt sensitive fields
  - Implement automatic deletion policy

### No Input Sanitization
- **Issue:** Messages and form inputs not sanitized before display
- **Files:** All components that display user input
- **Impact:**
  - Potential XSS if user data contains HTML/scripts
  - Even though React escapes by default, stored XSS possible if concatenating strings
  - AI responses may contain unexpected markup
- **Fix approach:**
  - Add DOMPurify for user-generated content from external APIs
  - Validate all user input with Zod before storage
  - Sanitize HTML in markdown renderer if used
  - Add CSP headers to prevent inline scripts

## Missing Features & Documentation

### No Real-time Sync
- **Issue:** Supabase client created but no realtime subscriptions for updates
- **Files:** `src/lib/supabase.ts`, all pages
- **Impact:**
  - Multiple users see stale data
  - Manual refresh required to see changes
  - No notification of participant updates
  - Checklist changes not reflected in real-time
- **Fix approach:**
  - Implement Supabase realtime subscriptions for events, participants, messages
  - Use TanStack Query invalidation on channel updates
  - Add websocket error handling and reconnection
  - Show presence indicators for active users

### Missing Loading States
- **Issue:** Many async operations lack loading indicators
- **Files:** Throughout - form submissions, list loads
- **Impact:**
  - User clicks button multiple times thinking nothing happened
  - No feedback on long operations (imports, exports)
  - Poor perceived performance
- **Fix approach:**
  - Add loading spinner overlay for mutations
  - Disable buttons during submission
  - Show progress bar for imports
  - Add timeout handling for hung requests

### No Offline Mode
- **Issue:** Application requires constant connection, no offline support
- **Files:** Entire app
- **Impact:**
  - Cannot work on event checklist without internet
  - Changes made offline are lost
  - Checkin at venue fails if connectivity drops
- **Fix approach:**
  - Implement Service Worker
  - Add local-first sync with Supabase
  - Queue mutations when offline
  - Retry when connection restored

## TypeScript & Type Safety

### Duplicate Type Definitions
- **Issue:** Multiple definitions of same types across files (Event, Participant)
- **Files:** `src/App.tsx` (lines 30-75), `src/types/index.ts`, `src/contexts/EventContext.tsx`
- **Impact:**
  - Type mismatch bugs when definitions diverge
  - Hard to keep in sync
  - Maintenance burden
- **Fix approach:**
  - Create single source of truth in `src/types/index.ts`
  - Import and use throughout app
  - Use Zod schemas as source of type truth (z.infer)

### Missing Type Exports
- **Issue:** Many custom hooks return untyped results
- **Files:** All custom hooks in `src/hooks/`
- **Impact:**
  - Component props lack proper typing
  - IDE autocomplete incomplete
  - Type errors not caught at compile time
- **Fix approach:**
  - Export interface for each hook's return type
  - Use ReturnType utility for consistency
  - Enable noUnusedLocals to catch unused types

---

*Concerns audit: 2026-01-28*
