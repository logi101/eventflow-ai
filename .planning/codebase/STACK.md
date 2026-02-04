# Technology Stack

**Analysis Date:** 2026-01-28

## Languages

**Primary:**
- TypeScript 5.9.3 - Full-stack type safety, strict mode enabled
- JavaScript - Node.js scripts and configuration files

**Secondary:**
- SQL - Supabase PostgreSQL database schema and queries

## Runtime

**ironment:**
- Node.js - Backend and build tooling (version via npm, ESNext module system)

**Package Manager:**
- npm - Dependency management
- Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**
- React 19.2.0 - Frontend UI library with React Router v7.12.0
- Vite 7.2.4 - Build tool and dev server
- Supabase 2.90.1 - Backend-as-a-Service (PostgreSQL + Auth + Edge Functions)

**State Management:**
- TanStack Query (@tanstack/react-query) 5.90.19 - Server state management
- TanStack Table (@tanstack/react-table) 8.21.3 - Advanced data table rendering
- React Context API - Local state (AuthContext, EventContext, ChatContext)

**Forms & Validation:**
- React Hook Form 7.71.1 - Form state management
- Zod 4.3.5 - Schema validation and type inference
- @hookform/resolvers 5.2.2 - RHF integration with Zod

**Styling:**
- TailwindCSS 4.1.18 - Utility-first CSS framework
- Heebo Font (RTL) - Primary font for Hebrew UI
- Rubik Font - Display font
- Class Variance Authority (cva) 0.7.1 - Component variant management
- clsx 2.1.1 - Conditional className utilities
- tailwind-merge 3.4.0 - Intelligent TailwindCSS class merging

**Animation & Motion:**
- Framer Motion 12.27.1 - React animation library

**UI & Icons:**
- Lucide React 0.562.0 - Icon library

**Data Processing:**
- xlsx 0.18.5 - Excel file parsing and generation
- papaparse 5.5.3 - CSV parsing

**QR Codes:**
- qrcode.react 4.2.0 - QR code generation (React wrapper)
- html5-qrcode 2.3.8 - QR code scanning

**Utilities:**
- date-fns 4.1.0 - Date manipulation
- date-fns-tz 3.2.0 - Timezone support for date-fns
- crypto-js 4.2.0 - Encryption/decryption utilities
- class-variance-authority 0.7.1 - Component style variants

## Testing

**Framework:**
- Playwright 1.57.0 (@playwright/test) - E2E and integration testing
- HTML Reporter - Test report generation

## Build & Development

**Tooling:**
- ESLint 9.39.1 - Code linting
  - typescript-eslint 8.46.4 - TypeScript linting
  - eslint-plugin-react-hooks 7.0.1 - React Hooks linting
  - eslint-plugin-react-refresh 0.4.24 - React Refresh plugin
- TypeScript Compiler - Type checking (`tsc -b`)
- Autoprefixer 10.4.23 - CSS vendor prefixing
- PostCSS 8.5.6 - CSS transformation

## Configuration

**Build:**
- `vite.config.ts` - Vite configuration with React plugin and path aliases
- `tsconfig.json` - Main TypeScript config
- `tsconfig.app.json` - App-specific TypeScript config (ES2022, JSX React, strict mode)
- `tsconfig.node.json` - Node tooling TypeScript config
- `tailwind.config.js` - Custom Tailwind theme (premium colors, animations, shadows)
- `eslint.config.js` - ESLint flat config with React and TypeScript rules
- `postcss.config.js` - PostCSS plugins (TailwindCSS, Autoprefixer)
- `playwright.config.ts` - E2E test configuration (Chromium, dev server at localhost:5173)

**Environment:**
- `.env` - Supabase connection variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
- Vite environment variables prefixed with `VITE_` for frontend access

## Key Dependencies Analysis

**Critical Infrastructure:**
- `@supabase/supabase-js` - PostgreSQL database, Auth, Edge Functions invocation
- `@tanstack/react-query` - Data fetching, caching, and synchronization
- `react-router-dom` - Client-side routing

**Essential UI:**
- `react`, `react-dom` - React runtime
- `tailwindcss`, `@tailwindcss/postcss` - Styling system

**Data & Validation:**
- `zod` - Runtime schema validation
- `react-hook-form` - Form handling
- `xlsx`, `papaparse` - Data import/export

**Features:**
- `qrcode.react`, `html5-qrcode` - QR operations
- `framer-motion` - Animations
- `date-fns`, `date-fns-tz` - Date operations

**Type Safety:**
- `typescript` 5.9.3 - Strict type checking
- `@types/react`, `@types/react-dom`, `@types/node`, `@types/papaparse`, `@types/crypto-js` - Type definitions

## Platform Requirements

**Development:**
- Node.js with npm
- Supabase account (for database and auth)
- Modern browser with ES2022 support

**Production:**
- Firebase Hosting (configured in `firebase.json`)
- Supabase backend (PostgreSQL + Auth + Edge Functions)
- Gemini API (via Supabase Edge Functions)
- Green API (WhatsApp integration via Edge Functions)

## Build Output

- Target: `dist/` directory
- Module format: ESNext (modern JavaScript)
- Browser compatibility: ES2022 baseline
- File hashing: Enabled for caching (`.@(js|css)` get max-age=31536000)

## Runtime Dependencies Summary

```
Production (26 packages):
├── @hookform/resolvers (form validation)
├── @supabase/supabase-js (backend)
├── @tanstack/react-query (state)
├── @tanstack/react-table (tables)
├── class-variance-authority (component variants)
├── clsx (classnames utility)
├── crypto-js (encryption)
├── date-fns & date-fns-tz (dates)
├── framer-motion (animations)
├── html5-qrcode (QR scanning)
├── lucide-react (icons)
├── papaparse (CSV parsing)
├── qrcode.react (QR generation)
├── react & react-dom (framework)
├── react-hook-form (forms)
├── react-router-dom (routing)
├── tailwind-merge (Tailwind utilities)
├── xlsx (Excel)
└── zod (validation)

Dev (34 packages):
├── TypeScript & type definitions
├── Vite & plugins
├── ESLint & plugins
├── TailwindCSS & PostCSS
├── Playwright & testing
└── Autoprefixer
```

---

*Stack analysis: 2026-01-28*
