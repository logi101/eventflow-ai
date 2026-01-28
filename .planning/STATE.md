# GSD State

## Current Position

Phase: 3 (Dynamic Template System) — COMPLETE
Plan: 03-02 complete (2/2 plans done)
Status: Phase 3 fully executed — templates seeded + Edge Function v7 deployed
Last activity: 2026-01-28 — Phase 3 complete (dynamic template system)

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-28)

**Core value:** Participants receive the right message at the right time automatically
**Current focus:** Phase 3 complete — next: Phase 4 (Manager Controls)

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
- Template content matches v6 hardcoded messages exactly (seamless transition)
- Idempotent DO block guard for template seeding
- Template-first pattern with hardcoded fallback for all 8 handlers
- Template fetched once per event (not per participant) for efficiency
- Org-specific template override with system template fallback

### Blockers
(None currently)

### Technical Notes
- Edge Function send-reminder deployed as v7 with template-first message building
- All 8 cron jobs active and verified
- Deduplication uses `message_type` column (enum-based)
- Settings flags in events.settings JSONB control per-event reminder behavior
- 8 system templates seeded in message_templates table
- 4 utility functions: getMessageTemplate, substituteVariables, buildEventVariableMap, buildScheduleVariableMap
- CRITICAL: Use `message_type` column (NOT `type`) for template queries
- CRITICAL: Use `.is('organization_id', null)` for NULL checks in PostgREST
- Variable substitution supports 11 variables across event-level and schedule-level

### Completed Phases
- Phase 1: Scheduler Infrastructure (4/4 plans complete)
- Phase 2: Reminder Types Implementation (4/4 plans complete)
- Phase 3: Dynamic Template System (2/2 plans complete)

---
*State updated: 2026-01-28*
