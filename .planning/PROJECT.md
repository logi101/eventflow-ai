# EventFlow AI

## What This Is

EventFlow AI is a comprehensive Hebrew-first event production management system (מערכת הפקת אירועים חכמה מקצה לקצה). It manages the full event lifecycle: participant registration, vendor management, scheduling, WhatsApp communications, QR check-in, and AI-assisted planning.

**Core Principle**: The system recommends - the user decides (המערכת ממליצה - המשתמש מחליט)

## Core Value

**Participants receive the right message at the right time automatically** - The automated reminder system must deliver personalized messages reliably according to the event schedule.

## Requirements

### Validated

<!-- Shipped and confirmed working -->

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

### Active

<!-- Current scope - this milestone -->

- [ ] Automatic reminder scheduling via pg_cron
- [ ] 8 reminder types working automatically
- [ ] Dynamic template system (templates from DB, variable substitution)
- [ ] Manager-controlled follow-up reminders (3mo, 6mo approval)

### Out of Scope

<!-- Explicit exclusions -->

- Email/SMS reminders - WhatsApp only for this milestone
- Google Calendar sync - Phase 5 premium feature
- Payment processing - Phase 5 premium feature
- Mobile app - Web-first approach

## Context

**Existing Architecture:**
- React 19 + TypeScript + Vite frontend
- Supabase backend (PostgreSQL + Auth + Edge Functions)
- Edge Functions: send-whatsapp (working), send-reminder (logic exists but not triggered)
- message_templates table exists with templates, but not wired to send-reminder
- No cron jobs configured - reminders only work manually

**Key Files:**
- `eventflow-scaffold/functions/send-reminder.ts` - Reminder logic (needs pg_cron trigger)
- `eventflow-scaffold/functions/send-whatsapp.ts` - WhatsApp sending (working)
- `eventflow-scaffold/schema.sql` - Database schema

**Gap Analysis:**
- send-reminder has hardcoded message templates instead of using message_templates table
- No pg_cron extension enabled
- No database functions to call Edge Functions from cron
- Missing reminder types: activation, week_before, event_end, follow_up_3mo, follow_up_6mo

## Constraints

- **Stack**: Must use existing Supabase project (no new services)
- **Scheduling**: pg_cron in Supabase (no external schedulers)
- **Language**: Hebrew primary, RTL-first
- **API Limits**: Green API rate limits (30 msgs/min per org)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| pg_cron for scheduling | Native to Supabase, no extra cost, reliable | — Pending |
| Templates from DB | Allows manager customization without code changes | — Pending |
| 8 reminder stages | Comprehensive coverage of event lifecycle | — Pending |

## Current Milestone: v1.0 Automated Reminders

**Goal:** Make the reminder system fully automatic - participants receive all 8 reminder types at the right time without manual intervention.

**Target features:**
- pg_cron enabled and scheduling reminders
- All 8 reminder types configured and working
- Templates fetched from message_templates table
- Manager approval flow for follow-up reminders

---
*Last updated: 2026-01-28 after milestone initialization*
