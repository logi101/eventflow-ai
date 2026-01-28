# GSD State

## Current Position

Phase: 1 (Scheduler Infrastructure)
Plan: Not yet planned
Status: Ready to plan
Last activity: 2026-01-28 — Roadmap created

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-28)

**Core value:** Participants receive the right message at the right time automatically
**Current focus:** Phase 1 - Enable pg_cron scheduler

## Accumulated Context

### Key Decisions
- pg_cron for scheduling (native Supabase solution)
- Templates from message_templates table (dynamic, editable)
- 8 reminder types covering full event lifecycle

### Blockers
(None currently)

### Technical Notes
- Existing send-reminder.ts has working logic for day_before, morning, 15_min
- Need to add: activation, week_before, event_end, follow_up_3mo, follow_up_6mo
- message_templates table exists but not wired to send-reminder

---
*State updated: 2026-01-28*
