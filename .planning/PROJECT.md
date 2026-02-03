# EventFlow AI

## What This Is

EventFlow AI is a comprehensive Hebrew-first event production management system (מערכת הפקת אירועים חכמה מקצה לקצה). It manages the full event lifecycle: participant registration, vendor management, scheduling, WhatsApp communications, QR check-in, AI-assisted planning, and intelligent networking — transforming from a static data manager to an active real-time event concierge.

**Core Principle**: The system recommends - the user decides (המערכת ממליצה - המשתמש מחליט)

## Core Value

**The event manager has full control while AI handles the complexity** — The system proactively manages logistics, communications, and participant experience while every significant action requires manager approval.

## Requirements

### Validated

<!-- Shipped and confirmed working -->

**v1.0 — Automated Reminders:**
- [x] Event creation and management (events table + CRUD)
- [x] Participant registration with companion support
- [x] Vendor management with quote tracking
- [x] Schedule management (schedules + participant_schedules)
- [x] WhatsApp message sending via Green API Edge Function
- [x] Message templates table with variable support
- [x] Manual reminder sending from UI
- [x] QR code generation for check-in
- [x] AI chat integration via Gemini
- [x] Excel import/export for participants
- [x] Multi-tenant architecture (organizations)
- [x] Supabase Auth with RLS policies
- [x] Automatic reminder scheduling via pg_cron
- [x] 8 reminder types working automatically
- [x] Dynamic template system — templates from DB, variable substitution
- [x] Manager-controlled follow-up reminders — 3mo, 6mo approval
- [x] Deduplication — unique constraint prevents duplicate messages
- [x] Rate limiting — 2.1s throttle, ~28 msgs/min
- [x] Retry logic — one retry for transient failures
- [x] iOS PWA push notifications
- [x] Room assignment — participant_rooms with room details
- [x] Program management — tracks, rooms, speakers, time_blocks tables

**v2.0 — Intelligent Production & Networking Engine:**
- [x] AI agent with DB write access (suggest + confirm pattern)
- [x] Real-time schedule management + conflict detection
- [x] Contingency plan activation (backup speakers)
- [x] Advanced WhatsApp templates (room_number, table_number variables)
- [x] Smart room assignment based on preferences
- [x] VIP priority handling with badges throughout system
- [x] Day simulation with 8 validators (stress test for logistics)
- [x] Offline-first check-in with IndexedDB and background sync
- [x] Networking engine — table seating by shared interests with VIP spread
- [x] Vendor intelligence — quote analysis + budget alerts + AI suggestions

### Active

<!-- Next scope - v2.1 milestone -->

- [ ] SaaS tier structure (Base + Premium)

### Out of Scope

<!-- Explicit exclusions -->

- Email/SMS reminders — WhatsApp only for now
- Google Calendar sync — deferred to v3
- Payment processing — deferred to v3
- Mobile native app — Web PWA approach
- Full offline mode — only check-in is offline-capable
- Autonomous AI agent — AI always suggests, user confirms
- Participant self-service track selection — manager assigns tracks

## Context

**Existing Architecture:**
- React 19 + TypeScript + Vite frontend
- Supabase backend (PostgreSQL + Auth + Edge Functions)
- Edge Functions: send-whatsapp, send-reminder v14, send-push-notification, ai-chat
- pg_cron with 8 active cron jobs for automated reminders
- Template engine (org-specific → system fallback → hardcoded fallback)
- 30+ database tables with RLS policies
- AI chat via Gemini (chatService.ts in frontend, ai-chat Edge Function)
- Room assignment (participant_rooms table + RoomAssignmentPanel.tsx)
- Program management (tracks, rooms, speakers, time_blocks tables)
- Check-in page (list mode, manual QR entry, VIP highlighting)

**Key Files (v2.0):**
- `eventflow-app/supabase/functions/send-reminder/index.ts` — v21, 8 reminder types
- `eventflow-app/supabase/functions/ai-chat/index.ts` — v25, schedule management tools
- `eventflow-app/supabase/functions/budget-alerts/index.ts` — v1, threshold notifications
- `eventflow-app/supabase/functions/vendor-analysis/index.ts` — v1, Gemini analysis
- `eventflow-app/src/services/chatService.ts` — AI routing with confirmation flow
- `eventflow-app/src/modules/simulation/` — 8 validators, simulation engine
- `eventflow-app/src/modules/contingency/` — backup speaker management
- `eventflow-app/src/modules/checkin/db/` — IndexedDB offline schema

**Current State:**
- 14 Edge Functions deployed
- 29,352 lines of TypeScript
- 7 database migrations applied
- Offline check-in with background sync
- AI suggest+confirm pattern established

## Constraints

- **Stack**: Must use existing Supabase project (no new services)
- **Scheduling**: pg_cron in Supabase (no external schedulers)
- **Language**: Hebrew primary, RTL-first
- **API Limits**: Green API rate limits (30 msgs/min per org)
- **Breaking Changes**: FORBIDDEN — all changes must be additive, existing functionality must remain intact
- **AI Pattern**: Suggest + confirm (no autonomous writes)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| pg_cron for scheduling | Native to Supabase, no extra cost, reliable | ✓ Good |
| Templates from DB | Allows manager customization without code changes | ✓ Good |
| 8 reminder stages | Comprehensive coverage of event lifecycle | ✓ Good |
| Vault for credential storage | Secure, built into Supabase | ✓ Good |
| message_type enum for dedup | Clean deduplication without string matching | ✓ Good |
| Follow-up defaults to false | Opt-in by manager, safer for users | ✓ Good |
| Template engine with fallback chain | Org-specific → system → hardcoded ensures reliability | ✓ Good |
| Enhanced AI chat (not autonomous) | Safer, maintains user control, builds on existing | ✓ Good |
| Manager assigns tracks | Simpler UX, manager controls networking quality | ✓ Good |
| Offline check-in only | 80/20 — check-in is the only field-critical feature | ✓ Good |
| Greedy seating algorithm | Sufficient for <500 participants, avoids CSP complexity | ✓ Good |
| Dexie.js for IndexedDB | Ecosystem standard for React/TypeScript offline | ✓ Good |
| Append-only audit log | RLS INSERT/SELECT only ensures integrity | ✓ Good |
| 8 simulation validators | Comprehensive coverage of event logistics | ✓ Good |

## Completed Milestone: v2.0 Intelligent Production & Networking Engine

**Shipped:** 2026-02-03

**Delivered:**
- AI manages schedules with suggest → confirm → execute pattern
- Day simulation detects issues before event day with 8 validators
- Networking engine assigns tables by shared interests with VIP spread
- Vendor intelligence analyzes quotes and suggests alternatives
- Offline-first check-in with IndexedDB and background sync
- VIP concierge handling with badges and priority throughout system
- Contingency management with backup speaker activation

**Stats:** 4 phases, 22 plans, 36 requirements, 29,352 LOC TypeScript

---
*Last updated: 2026-02-03 after v2.0 milestone completion*
