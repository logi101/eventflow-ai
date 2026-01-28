# Codebase Structure

**Analysis Date:** 2026-01-28

## Directory Layout

```
eventflow-app/
├── src/                            # Application source code
│   ├── App.tsx                     # Main app with routing (8,368 lines - needs refactoring)
│   ├── main.tsx                    # React bootstrap entry point
│   ├── index.css                   # TailwindCSS + global styles
│   ├── modules/                    # Business domain modules
│   │   └── events/                 # Event management domain
│   │       ├── types.ts
│   │       ├── components/
│   │       ├── hooks/
│   │       ├── pages/
│   │       └── index.ts
│   ├── pages/                      # Page components organized by feature
│   │   ├── home/
│   │   ├── auth/
│   │   ├── events/
│   │   ├── vendors/
│   │   ├── messages/
│   │   ├── dashboard/
│   │   ├── checklist/
│   │   ├── schedules/
│   │   ├── feedback/
│   │   ├── ai/
│   │   ├── checkin/
│   │   ├── program/
│   │   ├── reports/
│   │   ├── guests/
│   │   ├── admin/
│   │   └── index.ts                # Barrel export of all pages
│   ├── features/                   # Cross-cutting reusable features
│   │   ├── ui/                     # Base UI components
│   │   ├── feedback/               # Feedback UI (StatsCard, EmptyState, LoadingState)
│   │   ├── data/                   # Data presentation (FilterBar, SearchBar, Pagination)
│   │   └── README.md
│   ├── components/                 # Shared components
│   │   ├── layout/                 # Layout components (Sidebar, Header)
│   │   ├── auth/                   # Auth-specific components
│   │   ├── chat/                   # Chat UI components
│   │   └── rooms/
│   ├── contexts/                   # React Context providers
│   │   ├── AuthContext.tsx         # Authentication state
│   │   ├── EventContext.tsx        # Selected event state
│   │   └── ChatContext.tsx         # Chat history state
│   ├── hooks/                      # Custom React hooks
│   │   ├── usePageContext.ts
│   │   ├── useMessages.ts
│   │   └── useChatActions.ts
│   ├── lib/                        # Core libraries and integrations
│   │   ├── supabase.ts             # Supabase client initialization
│   │   └── integrations/           # External service integrations
│   ├── types/                      # Central TypeScript type definitions
│   │   ├── index.ts                # Main types (Event, Participant, EventType, etc.)
│   │   └── chat.ts
│   ├── schemas/                    # Zod validation schemas
│   │   └── messages.ts             # Message validation schemas
│   ├── utils/                      # Utility functions
│   │   ├── index.ts                # Formatters, helpers, validators
│   │   └── README.md
│   ├── core/                       # App bootstrap (planned refactoring)
│   │   └── README.md               # Bootstrap infrastructure (future)
│   ├── services/                   # API and service layer
│   │   └── chatService.ts
│   ├── styles/                     # Styling (TailwindCSS configuration)
│   └── assets/                     # Static assets
├── supabase/                       # Supabase configuration
│   └── migrations/                 # Database migrations
├── public/                         # Static files served as-is
├── tests/                          # Test files (Playwright)
├── vite.config.ts                  # Vite build configuration
├── tsconfig.json                   # TypeScript configuration (references)
├── tsconfig.app.json               # App-specific TypeScript settings
├── tsconfig.node.json              # Node tools TypeScript settings
├── package.json                    # Dependencies and scripts
└── firebase.json                   # Firebase hosting configuration
```

## Directory Purposes

**src/modules/:**
- Purpose: Business domain modules (events, participants, vendors, etc.)
- Contains: Self-contained domain logic with types, components, hooks, pages
- Key files: `types.ts` (domain types), `index.ts` (public exports)
- Pattern: Each module is independent with minimal cross-module dependencies

**src/pages/:**
- Purpose: Page-level components for features and admin sections
- Contains: Components rendered when routes match
- Key files: index.ts (barrel export), [Feature]Page.tsx files
- Pattern: Organized by feature, each page handles layout and data fetching for its route

**src/features/:**
- Purpose: Reusable components and functionality across multiple domains
- Contains: UI components (ui/), feedback components (feedback/), data components (data/)
- Key files: Component implementations and barrel exports
- Pattern: Imported by pages and modules, no internal module dependencies

**src/components/:**
- Purpose: Shared structural components used throughout app
- Contains: Layout wrappers (Sidebar, Header), auth flows, chat interface
- Key files: Component implementations in subdirectories
- Pattern: No business logic, purely structural and reusable

**src/contexts/:**
- Purpose: Global React Context providers for app-wide state
- Contains: Three main contexts: Auth, Event, Chat
- Key pattern: Each context has a Provider component and custom hook (e.g., useEvent())
- Usage: Wrap App with providers in main.tsx, access via hooks in components

**src/lib/:**
- Purpose: Core libraries and external service clients
- Contains: Supabase client initialization, integration clients
- Key files: `supabase.ts` (main Supabase client), integrations/ subdirectory

**src/types/:**
- Purpose: Centralized TypeScript type definitions for entire app
- Contains: Core entity types (Event, Participant, EventType)
- Key pattern: Use `z.infer<typeof schema>` for types matching Zod schemas
- No module-specific types: Domain-specific types belong in module/types.ts

**src/schemas/:**
- Purpose: Zod validation schemas for runtime type checking
- Contains: Schemas for entities that accept user input (messages, forms)
- Key pattern: Schema-first (define Zod first), then infer TypeScript types
- Files: Organized by entity (messages.ts, etc.)

**src/utils/:**
- Purpose: Pure utility functions used across the app
- Contains: Formatters (formatDate, formatCurrency), helpers (getStatusColor), validators
- Key files: index.ts (all exported), README.md (documentation)
- Pattern: No dependencies on React or domain logic, pure functions only

**src/services/:**
- Purpose: API client services and business logic
- Contains: chatService.ts for external API calls
- Pattern: Lightweight service layer for Supabase and external API interactions

**src/core/:**
- Purpose: App bootstrap and routing infrastructure (future refactoring)
- Contains: App.tsx refactoring target, provider wrappers
- Status: Currently App.tsx in src/ (8,368 lines), should move to core/

**supabase/migrations/:**
- Purpose: Database schema versioning and migrations
- Contains: SQL migration files
- Usage: Applied to Supabase database sequentially

## Key File Locations

**Entry Points:**
- `src/main.tsx`: Creates React root, initializes QueryClient, wraps with providers
- `src/App.tsx`: Routes definition, component tree structure
- `public/index.html`: HTML template loaded by Vite

**Configuration:**
- `vite.config.ts`: Build configuration, path aliases
- `tsconfig.app.json`: TypeScript compiler options, strict mode
- `tailwind.config.js`: (if exists) Styling configuration
- `package.json`: Dependencies, build scripts

**Core Logic:**
- `src/contexts/*.tsx`: Global state management
- `src/modules/*/types.ts`: Domain type definitions
- `src/schemas/*.ts`: Input validation schemas
- `src/utils/index.ts`: Helper functions

**Testing:**
- `tests/*.spec.ts`: Playwright E2E tests
- No unit test infrastructure detected (no Jest/Vitest config)

## Naming Conventions

**Files:**
- Components: PascalCase (EventCard.tsx, LoginPage.tsx)
- Utilities: camelCase (formatDate.ts, useMessages.ts)
- Contexts: PascalCase with Context suffix (AuthContext.tsx)
- Pages: PascalCase with Page suffix (EventsPage.tsx, HomePage.tsx)
- Types: lowercase for filenames (messages.ts), PascalCase exports (Message, MessageStatus)
- Hooks: camelCase with `use` prefix (useEvent.ts, useMessages.ts)

**Directories:**
- Features/modules: kebab-case (ai-chat/, event-management/)
- Business domains: singular (events/, participants/, vendors/)
- Grouping folders: lowercase (components/, hooks/, utils/)

**Exports:**
- Barrel files: index.ts in each module/feature directory
- Named exports preferred over default exports
- Type exports: `export type { TypeName }`

## Where to Add New Code

**New Business Domain (e.g., participants management):**
1. Create `src/modules/participants/`
2. Add `types.ts` with domain types
3. Create `components/`, `hooks/`, `pages/` subdirectories
4. Add `index.ts` with public exports
5. Create page at `src/pages/participants/[PageName].tsx` if needed
6. Add routes to App.tsx

**New Feature Component (reusable across domains):**
1. Create in `src/features/[category]/` (e.g., src/features/ui/Button.tsx)
2. Add TypeScript types inline or in separate .types.ts file
3. Export from feature directory index.ts
4. Document usage in features/README.md

**New Utility Function:**
1. Add to `src/utils/index.ts`
2. No separate file needed unless function set is large
3. If large set (>50 lines), create separate file and re-export from index.ts
4. Document in utils/README.md

**New API Schema (for validation):**
1. Add Zod schema to `src/schemas/[entity].ts`
2. Infer TypeScript type: `export type MyEntity = z.infer<typeof myEntitySchema>`
3. Import and use in components for form validation

**New Context/Global State:**
1. Create `src/contexts/[DomainName]Context.tsx`
2. Define interface for context value
3. Create Provider component and custom hook (useContextName)
4. Wrap in main.tsx providers
5. Access throughout app via hook

**New Page:**
1. Create directory in `src/pages/[feature]/`
2. Add [PageName].tsx component
3. Add route to App.tsx Routes section
4. Export from `src/pages/index.ts` barrel file
5. Import in App.tsx routing

## Special Directories

**dist/:**
- Purpose: Build output directory
- Generated: Yes (by Vite during `npm run build`)
- Committed: No (in .gitignore)

**.firebase/:**
- Purpose: Firebase hosting cache and metadata
- Generated: Yes (by Firebase CLI)
- Committed: No (in .gitignore)

**node_modules/:**
- Purpose: Installed dependencies
- Generated: Yes (by npm install)
- Committed: No (in .gitignore)

**supabase/migrations/:**
- Purpose: Database schema version control
- Generated: No (manually created)
- Committed: Yes (part of codebase)

**tests/:**
- Purpose: End-to-end test files using Playwright
- Generated: No (manually created)
- Committed: Yes (part of codebase)
- Run: `npm run test`

## Path Aliases

All configured in vite.config.ts and tsconfig.app.json:

```typescript
@              → src/
@/types        → src/types/
@/utils        → src/utils/
@/components   → src/components/
@/features     → src/features/
@/modules      → src/modules/
@/lib          → src/lib/
@/contexts     → src/contexts/
@/hooks        → src/hooks/
@/schemas      → src/schemas/
@/services     → src/services/
@/styles       → src/styles/
@/assets       → src/assets/
```

Use these aliases for all imports (no relative paths like `../../../`).

---

*Structure analysis: 2026-01-28*
