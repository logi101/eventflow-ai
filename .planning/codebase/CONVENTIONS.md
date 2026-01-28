# Coding Conventions

**Analysis Date:** 2026-01-28

## Naming Patterns

**Files:**
- Components: PascalCase (e.g., `ChatMessage.tsx`, `Sidebar.tsx`)
- Hooks: camelCase with `use` prefix (e.g., `useMessages.ts`, `usePageContext.ts`)
- Utilities: camelCase (e.g., `index.ts`)
- Schemas: camelCase (e.g., `messages.ts`)
- Types: camelCase files containing interfaces/types (e.g., `index.ts`, `chat.ts`)
- Contexts: PascalCase (e.g., `AuthContext.tsx`, `EventContext.tsx`)

**Functions:**
- Component functions: PascalCase (e.g., `ChatMessage`, `Sidebar`)
- Hook functions: camelCase with `use` prefix (e.g., `useAuth`, `useSendMessage`)
- Utility functions: camelCase (e.g., `formatDate`, `normalizePhone`, `getStatusColor`)
- Event handlers: camelCase with `handle` prefix (e.g., `handleNavigate`, `handleSubmit`)
- Formatters/getters: camelCase with `format`/`get` prefix (e.g., `formatDate`, `getStatusColor`)

**Variables:**
- State variables: camelCase (e.g., `user`, `session`, `loading`, `selectedEvent`)
- Constants: UPPER_SNAKE_CASE for global constants (not prevalent in codebase; most use camelCase)
- Record types/maps: camelCase (e.g., `messageStatusLabels`, `messageStatusColors`)
- Types from union: lowercase values in enums (e.g., `'draft'`, `'planning'`, `'active'`)

**Types:**
- Interface names: PascalCase (e.g., `AuthContextType`, `MessageStats`, `EventFormData`)
- Type aliases: PascalCase (e.g., `EventStatus`, `ParticipantStatus`, `TaskStatus`)
- Zod schema variables: camelCase with `Schema` suffix (e.g., `messageSchema`, `messageStatusSchema`)
- Inferred types from schemas: Use `z.infer<typeof schemaName>` pattern

## Code Style

**Formatting:**
- No explicit formatter config (no .prettierrc file found)
- TypeScript strict mode enabled: `"strict": true`
- No unused variables: `"noUnusedLocals": true`
- No unused parameters: `"noUnusedParameters": true`
- Line length: No specific limit enforced, but patterns suggest ~80-120 characters per line

**Linting:**
- ESLint with @eslint/js, typescript-eslint, eslint-plugin-react-hooks, eslint-plugin-react-refresh
- Config: `eslint.config.js` (flat config format)
- React Hooks rules enabled: `reactHooks.configs.flat.recommended`
- React Refresh rules enabled: `reactRefresh.configs.vite`

**Code Comments:**
- Decorative section dividers used extensively: `// ═══════════════════════════════════════════════════════════════════════════`
- Section headers: `// EventFlow - [Component/Feature Name]`
- Subsection headers: `// ────────────────────────────────────────────────────────────────────────────`
- Inline comments for complex logic are present but sparse
- JSDoc comments not used (no `/** */` patterns found)

## Import Organization

**Order:**
1. React and third-party libraries: `import { createContext, useState } from 'react'`
2. Type imports: `import type { ReactNode } from 'react'`
3. External libraries: `import { useQuery, useMutation } from '@tanstack/react-query'`
4. Internal lib/integrations: `import { supabase } from '../lib/supabase'`
5. Internal types: `import type { MessageWithRelations } from '../schemas/messages'`
6. Components: `import { FloatingChat } from './components/chat'`
7. Hooks: `import { useEvent } from './contexts/EventContext'`
8. Styles: (not prevalent)
9. Assets: (not prevalent)

**Path Aliases:**
```typescript
// From tsconfig.app.json
@/* → ./src/*
@/types/* → ./src/types/*
@/utils → ./src/utils
@/components/* → ./src/components/*
@/features/* → ./src/features/*
@/modules/* → ./src/modules/*
@/lib/* → ./src/lib/*
@/contexts/* → ./src/contexts/*
@/hooks/* → ./src/hooks/*
@/schemas/* → ./src/schemas/*
@/services/* → ./src/services/*
@/styles/* → ./src/styles/*
@/assets/* → ./src/assets/*
```

## Error Handling

**Patterns:**
- Try-catch blocks used for async operations: See `src/hooks/useMessages.ts` lines 162-217
- Error logging with console.error: `console.error('Error fetching messages:', error)`
- Error propagation through `throw error` pattern
- Supabase error checking: `if (error) throw error`
- Optional error objects in function returns: `{ error } = await operation`
- Error handling in React mutations with `onSuccess` callbacks

**Pattern Example:**
```typescript
// From useMessages.ts
try {
  const { data, error } = await supabase.from('messages').select()
  if (error) {
    console.error('Error fetching messages:', error)
    throw error
  }
  return data
} catch (error) {
  console.error('Operation failed:', error)
  // Rethrow for React Query handling
  throw error
}
```

## Logging

**Framework:** console (native browser console)

**Patterns:**
- `console.error()` for error conditions with descriptive messages
- No info/debug/warn levels used
- Errors logged before throwing: `console.error('Error fetching...', error); throw error`
- Error messages are descriptive but basic

## Comments

**When to Comment:**
- Section headers with decorative dividers (very common)
- Complex logic explanations (sparse)
- No TODO/FIXME comments found in src code
- Type/interface definitions have minimal comments

**Pattern Example (from messages.ts):**
```typescript
// ────────────────────────────────────────────────────────────────────────────
// Message Schema (matching actual DB columns)
// ────────────────────────────────────────────────────────────────────────────

export const messageSchema = z.object({
  id: z.string().uuid(),
  // ... fields
})
```

## Function Design

**Size:** Generally compact (10-50 lines typical)

**Parameters:**
- Use object destructuring for multiple parameters
- Type all parameters explicitly
- Use `type` keyword for parameter types when extracted: `type ChatMessageProps`

**Return Values:**
- Explicit return types on all functions
- Functions return objects/records for multiple values
- Async functions return Promises explicitly typed

**Example:**
```typescript
// From AuthContext.tsx
async signIn(email: string, password: string): Promise<{ error: AuthError | null }>

// From useMessages.ts
export function useMessages(filters: MessageFilters = {}): UseQueryResult<MessageWithRelations[]>
```

## Module Design

**Exports:**
- Named exports exclusively (no default exports found)
- Barrel files (`index.ts`) re-export from sibling files: See `src/components/chat/index.ts`
- Types and implementations exported separately

**Barrel Files:**
- Located in `src/components/chat/index.ts`, `src/modules/events/index.ts`, etc.
- Re-export related functions and components
- Enable clean imports: `import { ChatMessage, ChatInput } from '@/components/chat'`

**Module Structure (Modules Pattern):**
- Each module has: `components/`, `hooks/`, `pages/`, `types.ts`, `index.ts`
- Example: `src/modules/events/` contains event-specific code
- Types are co-located with features: `src/modules/events/types.ts`

## Zod Schema Pattern

**Pattern:** All schemas follow a strict convention:

```typescript
// 1. Define enum schemas
export const messageStatusSchema = z.enum(['pending', 'sent', 'delivered', 'failed'])
export type MessageStatus = z.infer<typeof messageStatusSchema>

// 2. Define main schemas
export const messageSchema = z.object({
  id: z.string().uuid(),
  status: messageStatusSchema,
  // ...
})
export type Message = z.infer<typeof messageSchema>

// 3. Define specialized schemas (create, update, filters)
export const createMessageSchema = z.object({
  to_phone: z.string().regex(/^0[0-9]{9}$/),
  content: z.string().min(1)
})
export type CreateMessage = z.infer<typeof createMessageSchema>

// 4. Define display helpers (labels, colors)
export const messageStatusLabels: Record<MessageStatus, string> = {
  pending: 'ממתינה',
  // ...
}
```

**No `any` Rule:** Use `z.infer<typeof schema>` for derived types instead of explicit `any`

## React Component Pattern

**Functional Components:** All components are functional with hooks

**Pattern:**
```typescript
interface ComponentProps {
  prop1: string
  prop2?: number
}

export function ComponentName({ prop1, prop2 }: ComponentProps) {
  const [state, setState] = useState<StateType>(initial)

  return (
    <div>
      {/* JSX */}
    </div>
  )
}
```

**Hooks Usage:**
- `useState` for component state
- `useQuery`/`useMutation` from TanStack Query for server state
- Custom hooks from `src/hooks/*` for shared logic
- Context hooks (`useAuth`, `useEvent`) for global state

## Context Pattern

**Pattern:**
```typescript
// 1. Define context interface
interface ContextType {
  value: Type
  action: () => void
}

// 2. Create context
const Context = createContext<ContextType | undefined>(undefined)

// 3. Create provider component
export function Provider({ children }: { children: ReactNode }) {
  // State and logic
  return (
    <Context.Provider value={value}>
      {children}
    </Context.Provider>
  )
}

// 4. Create custom hook for usage
export function useContext() {
  const context = useContext(Context)
  if (context === undefined) {
    throw new Error('must be used within Provider')
  }
  return context
}
```

## Localization (RTL/Hebrew)

**RTL-First Approach:**
- All labels and strings are in Hebrew
- UI direction set to RTL: `dir="rtl"` on root container
- Date formatting uses `'he-IL'` locale
- Phone numbers normalized to Israeli format (972...)

**Pattern Example:**
```typescript
export const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('he-IL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
```

---

*Convention analysis: 2026-01-28*
