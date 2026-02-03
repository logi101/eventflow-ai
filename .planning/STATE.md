# GSD State

## Current Position

Phase: 7 (Networking & VIP Infrastructure) IN PROGRESS
Plan: 1 of 5
Status: Phase 7 started - Plan 01 complete
Last activity: 2026-02-03 — Completed 07-01-PLAN.md (database foundation)

Progress: ██████░░░░░░░░░░░░░░ 30% (1.2/4 phases complete)

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-02)

**Core value:** The event manager has full control while AI handles the complexity
**Current focus:** Milestone v2.0 — Intelligent Production & Networking Engine (Phase 6/9)

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
- v2.0: Phase numbering continues from v1.0 (starts at Phase 6)
- v2.0: 4 phases covering 36 requirements across 8 feature categories
- Phase 6: Database-level conflict detection for rooms (EXCLUDE USING GIST), application-level for speakers (warn but don't block)
- Phase 6: ai_insights_log with JSONB action_data for flexibility across different AI action types
- Phase 6: RLS policies on ai_insights_log enforce organization isolation for AI operations
- Phase 6: AI chat extended with schedule management tools (create, update, delete)
- Phase 6: detectScheduleConflicts checks room/speaker overlap + capacity warnings
- Phase 6: All schedule suggestions return pending_approval (never auto-execute)
- Phase 6: VIP impact assessed for all schedule changes (vip_affected flag in action_data)
- Phase 6: ai-chat has 10 tools total (7 existing + 3 new schedule tools)
- Phase 6: execute-ai-action Edge Function enforces RLS and re-checks conflicts at execution time
- Phase 6: AIConfirmationDialog with RTL Hebrew UI shows conflicts, VIP warnings, and risk assessment
- Phase 6: Approve button disabled when error-level conflicts exist (safety first)
- Phase 6: Risk levels: critical (error conflicts) > high (VIPs/warnings) > medium (notifications) > low
- Phase 6: Full suggest → confirm → execute flow complete end-to-end
- Phase 7: networking_opt_in defaults to false (explicit opt-in, privacy-first)
- Phase 7: Event-level networking default in events.settings JSONB: default_networking_opt_in
- Phase 7: table_assignments tracks both table_number (required) and seat_number (optional)
- Phase 7: assigned_by field tracks source: 'ai', 'manager', or 'auto'
- Phase 7: is_vip_table separate from participant.is_vip (table vs. individual designation)
- Phase 7: track_statistics view filters only is_active tracks for distribution analysis

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
- Migration 006 ready: ai_insights_log table, btree_gist extension, no_room_overlap constraint, check_speaker_conflicts function
- Idempotent migration with validation queries - safe to run multiple times
- Migration 007 ready: networking_opt_in column, table_assignments table, track_statistics view
- table_assignments has RLS policies for multi-tenant isolation
- Performance indexes on table_assignments: event_id, (event_id, table_number), participant_id, (event_id, is_vip_table)

### Completed Milestones
- v1.0: Automated Reminders (5 phases, 20 requirements, all complete — shipped 2026-02-02)

### Completed Phases (v1.0)
- Phase 1: Scheduler Infrastructure (4/4 plans complete)
- Phase 2: Reminder Types Implementation (4/4 plans complete)
- Phase 3: Dynamic Template System (2/2 plans complete)
- Phase 4: Manager Controls (audit-only, all pre-existing, 1 bug fixed)
- Phase 5: Reliability & Production Readiness (2/2 plans complete)

### Completed Plans (v2.0)
- Phase 6, Plan 1: Database foundation for AI write operations (06-01-SUMMARY.md)
- Phase 6, Plan 2: AI chat schedule management tools (06-02-SUMMARY.md)
- Phase 6, Plan 3: Execute AI action Edge Function (06-03-SUMMARY.md)
- Phase 6, Plan 4: Frontend confirmation UI (06-04-SUMMARY.md)
- Phase 7, Plan 1: Database foundation for networking & VIP infrastructure (07-01-SUMMARY.md)

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 001 | iOS PWA Push Notifications | 2026-01-30 | complete | [001-ios-pwa-push-notifications](./quick/001-ios-pwa-push-notifications/) |

## Session Continuity

Last session: 2026-02-03
Stopped at: Completed 07-01-PLAN.md
Resume file: None

---
*State updated: 2026-02-03*
*Next: Continue Phase 7 - Plan 02 (Table assignment UI components)*
