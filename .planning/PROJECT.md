# EventFlow AI

## What This Is

EventFlow AI is a comprehensive Hebrew-first event production management system (מערכת הפקת אירועים חכמה מקצה לקצה). It manages the full event lifecycle: participant registration, vendor management, scheduling, WhatsApp communications, QR check-in, AI-assisted planning, and intelligent networking — transforming from a static data manager to an active real-time event concierge.

**Core Principle**: The system recommends - the user decides (המערכת ממליצה - המשתמש מחליט)

## Core Value

**The event manager has full control while AI handles the complexity** — The system proactively manages logistics, communications, and participant experience while every significant action requires manager approval.

## Requirements

### Validated

<!-- Shipped and confirmed working (v1.0) -->

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
- [x] Automatic reminder scheduling via pg_cron (v1.0)
- [x] 8 reminder types working automatically (v1.0)
- [x] Dynamic template system — templates from DB, variable substitution (v1.0)
- [x] Manager-controlled follow-up reminders — 3mo, 6mo approval (v1.0)
- [x] Deduplication — unique constraint prevents duplicate messages (v1.0)
- [x] Rate limiting — 2.1s throttle, ~28 msgs/min (v1.0)
- [x] Retry logic — one retry for transient failures (v1.0)
- [x] iOS PWA push notifications (v1.0)
- [x] Room assignment — participant_rooms with room details (v1.0)
- [x] Program management — tracks, rooms, speakers, time_blocks tables (v1.0)

### Active

<!-- Current scope - v2.0 milestone -->

- [ ] AI agent with DB write access (suggest + confirm pattern)
- [ ] Real-time schedule management + conflict detection
- [ ] Contingency plan activation (backup speakers)
- [ ] Advanced WhatsApp templates (room_number, table_number variables)
- [ ] Smart room assignment based on preferences
- [ ] VIP priority handling
- [ ] Day simulation (stress test for logistics)
- [ ] Offline-first check-in with local sync
- [ ] Networking engine — table seating by shared interests
- [ ] Vendor intelligence — quote analysis + budget alerts
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

**Key Existing Files:**
- `eventflow-app/supabase/functions/send-reminder/index.ts` — 1,375 lines, v14
- `eventflow-app/src/services/chatService.ts` — AI routing, Gemini, slash commands
- `eventflow-app/src/types/chat.ts` — 80+ action types defined
- `eventflow-app/src/pages/checkin/CheckinPage.tsx` — QR check-in
- `eventflow-app/src/components/rooms/RoomAssignmentPanel.tsx` — Room management

**What Needs to Be Built (v2.0):**
- AI chat → DB write capability with confirmation flow
- New tables: table_assignments, ai_insights_log
- New fields: networking_opt_in on participants, vendor_id on checklist_items
- Service Worker for offline check-in
- Stress simulation AI analysis
- Networking/seating algorithm

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
| Enhanced AI chat (not autonomous) | Safer, maintains user control, builds on existing | — Pending |
| Manager assigns tracks | Simpler UX, manager controls networking quality | — Pending |
| Offline check-in only | 80/20 — check-in is the only field-critical feature | — Pending |

## Current Milestone: v2.0 Intelligent Production & Networking Engine

**Goal:** Transform EventFlow AI from a static data manager to an active real-time event concierge — AI manages logistics, networking engine optimizes participant connections, and the system works even offline at the venue.

**Target features:**
- AI agent with DB write access (schedule changes, room assignments, messaging)
- Day simulation (stress test logistics before the event)
- Networking engine (seat participants by shared interests)
- Vendor intelligence (quote analysis, budget alerts)
- Offline-first check-in
- VIP concierge handling

---
*Last updated: 2026-02-02 after milestone v2.0 initialization*
