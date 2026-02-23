# EventFlow AI - Smart Event Production System

**Project Type**: Full-Stack Web Application
**Status**: Production-Verified
**Version**: 2.2.0
**Last Updated**: 2026-02-23T00:00:00Z

---

## Project Overview

EventFlow AI is a comprehensive event production management system (מערכת הפקת אירועים חכמה מקצה לקצה).

**Core Principle**: The system recommends - the user decides (המערכת ממליצה - המשתמש מחליט)

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + TypeScript + Vite |
| Styling | TailwindCSS + Heebo Font (RTL) |
| State | TanStack Query + TanStack Table |
| Backend | Supabase (PostgreSQL + Auth + Edge Functions) |
| AI | Gemini API |
| WhatsApp | Green API |
| Validation | Zod + React Hook Form |
| QR | qrcode.react + html5-qrcode |
| Data | xlsx + papaparse (Excel import/export) |

---

## Directory Structure

```
eventflows/
├── eventflow-scaffold/
│   ├── 01-init.sh              # Full project initializer
│   ├── init-eventflow.sh       # Simplified initializer
│   ├── schema.sql              # Complete database schema
│   ├── seed.sql                # Seed data
│   └── functions/              # Supabase Edge Functions
│       ├── send-whatsapp.ts
│       ├── send-reminder.ts
│       └── ai-chat.ts
```

### Generated Project Structure

```
src/
├── app/routes/                 # App routes
├── components/
│   ├── ui/                     # Base UI components
│   ├── shared/                 # Shared components
│   ├── layouts/                # Layout components
│   └── forms/                  # Form components
├── modules/                    # Feature modules
│   ├── events/                 # Event management
│   ├── participants/           # Participants + companions
│   ├── vendors/                # Vendor management + quotes
│   ├── checklist/              # Dynamic checklist
│   ├── communication/          # WhatsApp + reminders
│   ├── schedules/              # Personal schedules
│   ├── checkin/                # Check-in + QR
│   ├── feedback/               # Surveys + insights
│   ├── ai-chat/                # AI assistant
│   ├── dashboard/              # Real-time dashboard
│   └── reports/                # Reports & analytics
├── hooks/                      # Custom hooks
├── schemas/                    # Zod schemas
├── types/                      # TypeScript types
├── utils/                      # Utility functions
├── config/                     # Configuration
├── contexts/                   # React contexts
└── lib/
    ├── integrations/           # External integrations
    └── encryption/             # Encryption utilities
```

---

## Database Schema Highlights

### Core Entities
- **organizations** - Multi-tenant support
- **user_profiles** - User management with Supabase Auth
- **events** - Full event management
- **participants** - Participants with companion support
- **vendors** - Vendor management with categories
- **event_vendors** - Event-vendor relationships with quotes

### Features
- **schedules** - Event schedules with session management
- **checklist_items** - Dynamic checklist with dependencies
- **messages** - WhatsApp/Email/SMS messaging
- **message_templates** - Reusable message templates
- **feedback_surveys** - Post-event surveys
- **ai_chat_sessions** - AI chat history

### Security
- Row Level Security (RLS) enabled on all tables
- Encrypted API credentials storage
- Phone number normalization

---

## Key Features

### Phase 1: Execution System (מערכת ביצוע)
- Participant registration page
- Excel import/export
- Personal schedules
- WhatsApp invitations & reminders

### Phase 2: Smart Planning (תכנון חכם)
- AI chat interface
- Event type detection
- Dynamic checklist generation

### Phase 3: Vendor Management (ניהול ספקים)
- Vendor database
- Quote requests & tracking
- Vendor ratings

### Phase 4: Summary & Learning (סיכום ולמידה)
- Feedback surveys
- Event summary generation
- Follow-up management

### Phase 5: Premium Features
- QR Check-in
- Payment processing
- Calendar sync (Google Calendar)

---

## Development Guidelines

### Rules
1. **Schema First** - Define Zod schemas before components
2. **No `any`** - Use `z.infer<typeof schema>` for types
3. **RTL First** - Hebrew is the primary language
4. **Edge Functions for Secrets** - Never expose API keys to frontend
5. **Update Architecture Diagram** - After any change to the system (new feature, bug fix, component added/removed, status change), update `docs/ARCHITECTURE-STATUS.html`:
   - Change component box color: green (100% working), yellow (partial), red (not implemented)
   - Update percentage in the box
   - Add/remove component boxes as needed
   - Update SVG connection lines between components
   - Update the stats counters (Implemented / Partial / Missing / Overall %)
   - Add a changelog entry with date and description
   - Update the footer version and date

### Patterns
```typescript
// Zod schema example
const participantSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  phone: z.string().regex(/^0[0-9]{9}$/),
  email: z.string().email().optional()
})

type Participant = z.infer<typeof participantSchema>
```

---

## Quick Start

```bash
# Create new project from scaffold
cd eventflow-scaffold
bash init-eventflow.sh my-event-app

# Or use the full initializer
bash 01-init.sh my-event-app
```

### Setup Steps
1. Create Supabase project
2. Run `schema.sql` in Supabase SQL editor
3. Run `seed.sql` for initial data
4. Copy `.env.example` to `.env` and fill in keys
5. Deploy Edge Functions
6. `npm run dev`

---

## Environment Variables

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Encryption (for credentials storage)
ENCRYPTION_KEY=your-32-char-encryption-key-here

# Edge Functions secrets (set in Supabase dashboard)
# GREEN_API_INSTANCE=your-instance
# GREEN_API_TOKEN=your-token
# GEMINI_API_KEY=your-gemini-key
```

---

## Supabase Edge Functions

| Function | Purpose |
|----------|---------|
| `send-whatsapp` | Send WhatsApp messages via Green API |
| `send-reminder` | Automated reminder system |
| `ai-chat` | AI assistant with Gemini |
| `generate-checklist` | AI-generated checklists |
| `sync-calendar` | Google Calendar sync |

---

## Related Resources

- Supabase Dashboard: [project dashboard]
- Green API: https://green-api.com
- Gemini API: https://ai.google.dev

---

## Quality Baseline (2026-02-23)

| Metric | Value |
|--------|-------|
| TypeScript | 0 errors (tsc --noEmit) |
| ESLint | 0 warnings |
| Unit Tests | 126/126 passing (Vitest) |
| E2E Tests | 11/11 PASS (login, dashboard, events, create event, participants, vendors, checklist, messages, ai-chat, networking, logout) |
| Build | Clean |
| Latest Commit | 106b553 on main |
| Deployed | https://eventflow-ai-prod.web.app |

## Recent Changes

- **2026-02-23:** Fixed events INSERT 403 — added SECURITY DEFINER to 4 usage trigger functions (increment_event_usage, increment_participant_usage, increment_message_usage, increment_ai_message_usage) via Supabase migration on project byhohetafnhlakqbydbj. Added logout button to Sidebar.tsx (LogOut icon, signOut() from useAuth(), data-testid="logout-button", label "יציאה", red on hover). E2E suite 11/11 PASS.
- **2026-02-22:** Fixed ai-chat BOOT_ERROR — duplicate `const suggestions = []` in `executeSuggestRoomAssignments` caused Deno strict mode failure at startup. Merged tools.ts back into index.ts (2822 lines). All 9 edge functions verified working in production. AI Chat function calling verified end-to-end. Unit tests increased from 115 to 126.

## Notes

- All UI is RTL-first (Hebrew primary)
- Phone numbers are normalized to Israeli format (972...)
- Companion support is built into participant management
- Multi-tenant architecture with organization isolation
- Edge Functions: 9 total (ai-chat, send-reminder, execute-ai-action, admin-set-tier, start-trial, budget-alerts, vendor-analysis, send-push-notification, _shared/quota-check)
