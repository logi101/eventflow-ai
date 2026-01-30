# GSD State

## Current Position

Phase: 3 (Dynamic Template System) — COMPLETE
Plan: 03-02 verified
Status: Phase 3 complete, dynamic template system deployed and working
Last activity: 2026-01-30 - Phase 3 verified: template engine wired to all 8 handlers, source synced from Supabase v13

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-28)

**Core value:** Participants receive the right message at the right time automatically
**Current focus:** Phase 3 complete. Next: Phase 4 - Manager Controls

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
- Template engine uses org-specific lookup first, then system fallback
- Variable substitution via regex with empty string fallback for missing values
- Hardcoded message builders kept as emergency fallback

### Blockers
(None currently)

### Technical Notes
- Edge Function send-reminder deployed as v13 with template engine + all 8 handlers
- All 8 cron jobs active and verified
- Deduplication uses `message_type` column (enum-based)
- Settings flags in events.settings JSONB control per-event reminder behavior
- message_templates table wired to send-reminder via getMessageTemplate()
- substituteVariables() handles {{var}} replacement with empty string fallback
- Test mode available: `body.mode === 'test'` sends single message to manager's phone
- push_subscriptions table created with RLS (3 policies)
- send-push-notification Edge Function deployed (RFC 8291 encryption, --no-verify-jwt)
- VAPID keys set as Supabase secrets

### Completed Phases
- Phase 1: Scheduler Infrastructure (4/4 plans complete)
- Phase 2: Reminder Types Implementation (4/4 plans complete)
- Phase 3: Dynamic Template System (2/2 plans complete)

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 001 | iOS PWA Push Notifications | 2026-01-30 | complete | [001-ios-pwa-push-notifications](./quick/001-ios-pwa-push-notifications/) |

---
*State updated: 2026-01-30*
