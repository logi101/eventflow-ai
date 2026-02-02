# GSD State

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements for milestone v2.0
Last activity: 2026-02-02 — Milestone v2.0 started

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-02)

**Core value:** The event manager has full control while AI handles the complexity
**Current focus:** Milestone v2.0 — Intelligent Production & Networking Engine

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
- Fixed Zod schema follow-up defaults from true→false (opt-in alignment)
- v2.0: Enhanced AI chat (not autonomous agent) — suggest + confirm pattern
- v2.0: Manager assigns participant tracks (not self-service)
- v2.0: Offline mode only for check-in (not full app)
- v2.0: ALL changes must be additive — no breaking existing functionality

### Blockers
(None currently)

### Technical Notes
- Edge Function send-reminder deployed as v14 with template engine + all 8 handlers + throttle + retry
- All 8 cron jobs active and verified
- Deduplication uses `message_type` column (enum-based)
- Settings flags in events.settings JSONB control per-event reminder behavior
- message_templates table wired to send-reminder via getMessageTemplate()
- substituteVariables() handles {{var}} replacement with empty string fallback
- Test mode available: `body.mode === 'test'` sends single message to manager's phone
- push_subscriptions table created with RLS (3 policies)
- send-push-notification Edge Function deployed (RFC 8291 encryption, --no-verify-jwt)
- VAPID keys set as Supabase secrets
- AI chat types define 80+ action types (most not yet implemented)
- chatService.ts routes all conversations to Gemini except /help and skill triggers
- participant_rooms table + RoomAssignmentPanel.tsx exist for room management
- Program management tables exist: tracks, rooms, speakers, time_blocks

### Completed Milestones
- v1.0: Automated Reminders (5 phases, 20 requirements, all complete)

### Completed Phases (v1.0)
- Phase 1: Scheduler Infrastructure (4/4 plans complete)
- Phase 2: Reminder Types Implementation (4/4 plans complete)
- Phase 3: Dynamic Template System (2/2 plans complete)
- Phase 4: Manager Controls (audit-only, all pre-existing, 1 bug fixed)
- Phase 5: Reliability & Production Readiness (2/2 plans complete)

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 001 | iOS PWA Push Notifications | 2026-01-30 | complete | [001-ios-pwa-push-notifications](./quick/001-ios-pwa-push-notifications/) |

---
*State updated: 2026-02-02*
