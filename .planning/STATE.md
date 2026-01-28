# GSD State

## Current Position

Phase: 2 (Reminder Types Implementation) — COMPLETE
Plan: 02-04 verified
Status: Phase 2 complete, all 8 reminder types working
Last activity: 2026-01-28 — Phase 2 verification passed (8/8 types, dedup, settings flags)

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-28)

**Core value:** Participants receive the right message at the right time automatically
**Current focus:** Phase 2 complete. Next: Phase 3 - Dynamic Templates

## Accumulated Context

### Key Decisions
- pg_cron for scheduling (native Supabase solution)
- Templates from message_templates table (dynamic, editable)
- 8 reminder types covering full event lifecycle
- Vault for secure credential storage (service_role_key + project URL)
- 30s timeout for Edge Function calls from pg_net
- Added `message_type` column (enum) to messages table for proper deduplication
- Both `message_type` and `subject` populated for backward compatibility
- Follow-up reminders default to false (opt-in by manager)
- Follow-up date windows are 4 days wide for cron timing tolerance

### Blockers
(None currently)

### Technical Notes
- Edge Function send-reminder deployed as v6 with all 8 handlers
- All 8 cron jobs active and verified
- Deduplication uses `message_type` column (enum-based)
- Settings flags in events.settings JSONB control per-event reminder behavior
- message_templates table exists but not yet wired to send-reminder (Phase 3)

### Completed Phases
- Phase 1: Scheduler Infrastructure (4/4 plans complete)
- Phase 2: Reminder Types Implementation (4/4 plans complete)

---
*State updated: 2026-01-28*
