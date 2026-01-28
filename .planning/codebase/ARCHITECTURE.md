# Architecture

**Analysis Date:** 2026-01-28

## Pattern Overview

**Overall:** Multi-layered modular React application with feature and domain-based module organization.

**Key Characteristics:**
- Context API for global state management (Auth, Event, Chat)
- Module-first architecture for business domains
- React Router for client-side routing
- TanStack Query for server state management
- Supabase as backend (PostgreSQL + Auth + Edge Functions)
- Schema-first design using Zod for type safety

## Layers

**Presentation Layer (UI & Pages):**
- Purpose: User interface and page-level routing
- Location: `src/pages/` and `src/components/`
- Contains: Page components, page-specific layouts, UI elements
- Depends on: Features, modules, components, contexts
- Used by: Routes and user interactions

**Modules Layer (Business Domains):**
- Purpose: Self-contained business logic for each domain (events, participants, vendors, etc.)
- Location: `src/modules/[domain]/`
- Contains: Domain types, components, hooks, services
- Depends on: Core utils, schemas, contexts
- Used by: Page components and other modules (minimal cross-module dependencies)

**Features Layer (Cross-Cutting):**
- Purpose: Reusable components and functionality used across multiple modules
- Location: `src/features/`
- Contains: UI components, authentication, chat interface, feedback components
- Depends on: Core utils, types
- Used by: Pages and modules

**State Management Layer (Contexts):**
- Purpose: Global application state (Auth, Event selection, Chat)
- Location: `src/contexts/`
- Contains: React Context providers, state logic
- Depends on: Supabase client, types
- Used by: All components via hooks

**Integration Layer (API & External Services):**
- Purpose: Communication with Supabase and external services
- Location: `src/lib/integrations/`
- Contains: Supabase client, service clients
- Depends on: Environment variables
- Used by: Contexts, modules, services

**Utility & Schema Layer:**
- Purpose: Formatting, validation, and type definitions
- Location: `src/utils/`, `src/schemas/`, `src/types/`
- Contains: Helper functions, Zod schemas, TypeScript type definitions
- Depends on: Standard libraries
- Used by: All layers

## Data Flow

**Event Selection Flow:**

1. User selects event from EventsPage or list component
2. EventContext.selectEventById() is called
3. Context fetches full event data from Supabase
4. setSelectedEvent() updates context state
5. Components connected via useEvent() hook re-render with new event data
6. Navigation occurs to event-specific pages

**Authentication Flow:**

1. User logs in via LoginPage
2. AuthContext.signIn() calls supabase.auth.signInWithPassword()
3. Supabase returns session and user data
4. setUser() and setSession() update context state
5. ProtectedRoute components check authentication status
6. User is redirected or granted access based on auth state

**Message Creation Flow:**

1. User submits message form (NewMessagePage or inline component)
2. Form validates against createMessageSchema (Zod)
3. Message is inserted to messages table via Supabase
4. Optional: Edge Function send-whatsapp is triggered asynchronously
5. Messages are fetched and displayed via useMessages hook (TanStack Query)

**State Management:**

- Global state: AuthContext (user session), EventContext (selected event), ChatContext (chat history)
- Server state: TanStack Query with 5-minute stale time
- Local state: useState for component-level UI state
- Forms: React Hook Form + Zod for validation

## Key Abstractions

**Module Pattern:**

- Purpose: Encapsulate business domain functionality
- Examples: `src/modules/events/`, `src/modules/vendors/`, `src/modules/participants/`
- Pattern: Each module exports types, components, hooks via `index.ts` barrel file
- Internal structure: types.ts, components/, hooks/, pages/, services/

**Context + Hook Pattern:**

- Purpose: Provide centralized access to global state
- Examples: `useEvent()`, `useAuth()`, `useChat()`
- Pattern: Context provider wraps app, custom hooks expose context value
- Implementation: `src/contexts/[Domain]Context.tsx` + `useContext()` custom hook

**Schema-First Types:**

- Purpose: Single source of truth for data validation and TypeScript types
- Examples: `messageSchema`, `createMessageSchema` in `src/schemas/messages.ts`
- Pattern: Zod schema defined first, TypeScript types inferred via `z.infer<typeof schema>`
- Prevents: Type mismatches between validation and usage

**Utility Functions (Formatters & Helpers):**

- Purpose: Reusable logic for common operations
- Examples: `formatDate()`, `formatCurrency()`, `getStatusColor()` in `src/utils/index.ts`
- Pattern: Pure functions exported from `src/utils/`
- Used by: Components for display formatting

## Entry Points

**Application Bootstrap:**
- Location: `src/main.tsx`
- Triggers: Page load
- Responsibilities: Create React root, set up QueryClient, initialize providers

**Main App Component:**
- Location: `src/App.tsx`
- Triggers: Initial render after bootstrap
- Responsibilities: Define routes, wrap with context providers

**Page Components:**
- Location: `src/pages/[feature]/[PageName].tsx`
- Triggers: Route match
- Responsibilities: Fetch and display feature-specific data

**Module Pages:**
- Location: `src/modules/[domain]/pages/[PageName].tsx`
- Triggers: Route match for module
- Responsibilities: Module-level data fetching and layout

## Error Handling

**Strategy:** Layered error handling with user-facing error messages

**Patterns:**
- Async operations: try-catch with error messages in contexts
- Form submission: Zod validation errors displayed inline
- API calls: Supabase errors caught and displayed via toast/UI feedback
- Contexts: Error states stored in context for UI components to access

**Example:** AuthContext wraps auth methods in try-catch, stores error state, contexts expose error messages to components

## Cross-Cutting Concerns

**Logging:** console-based logging (no centralized logging framework detected)

**Validation:**
- Runtime: Zod schemas in `src/schemas/`
- TypeScript: Strict mode enabled (`noUnusedLocals`, `noUnusedParameters`, etc.)

**Authentication:**
- Supabase Auth via AuthContext
- Protected routes check session existence
- Row-level security on Supabase tables enforces authorization

**Internationalization:**
- Hebrew as primary language
- RTL support built into styling and components
- Date/number formatting using `he-IL` locale

---

*Architecture analysis: 2026-01-28*
