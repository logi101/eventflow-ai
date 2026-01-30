# GSD State

## Current Position

Phase: 5 (Reliability & Production Readiness) — COMPLETE
Plan: 2 plans (05-01 database safety net, 05-02 rate limit + retry)
Status: All 5 phases complete. Milestone v1.0 finished.
Last activity: 2026-01-30 - Phase 5: unique constraint, retry columns, throttle + retry in send-reminder v14

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-28)

**Core value:** Participants receive the right message at the right time automatically
**Current focus:** All 5 phases complete. Milestone v1.0 (Automated Reminders) ready.

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

### Completed Phases
- Phase 1: Scheduler Infrastructure (4/4 plans complete)
- Phase 2: Reminder Types Implementation (4/4 plans complete)
- Phase 3: Dynamic Template System (2/2 plans complete)
- Phase 4: Manager Controls (audit-only, all pre-existing, 1 bug fixed)
- Phase 5: Reliability & Production Readiness (2/2 plans complete)

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 001 | iOS PWA Push Notifications | 2026-01-30 | complete | [001-ios-pwa-push-notifications](./quick/001-ios-pwa-push-notifications/) |

### Technical Notes (Phase 4 Audit)
- EventSettingsPanel.tsx: 8 toggles (6 standard + 2 follow-up), accordion message preview, save to JSONB
- MessagePreview.tsx: WhatsApp-style bubble with Hebrew RTL, variable substitution, all 8 types
- TestReminderButton.tsx + useTestReminder.ts: invokes `send-reminder` with `mode: 'test'`
- send-reminder v13 line 124: full test mode handling (phone normalization, template engine, single send)
- Routes: `/events/:eventId` and `/event/reminder-settings` both render EventSettingsPanel

### Technical Notes (Phase 5 Reliability)
- Unique partial index `idx_messages_dedup` on (event_id, participant_id, message_type) WHERE participant_id IS NOT NULL
- Cleaned 48 duplicate reminder_15min messages before constraint creation (kept oldest per group)
- Added `retry_count` (INT DEFAULT 0) and `last_retry_at` (TIMESTAMPTZ) columns to messages table
- sendWhatsApp helper: 2.1s throttle between sends (~28 msgs/min, safely under 30/min limit)
- sendWhatsApp helper: one retry for transient failures (network/rate/timeout/fetch/429) with 3s delay
- retry_count tracked in messages table on retry attempt
- send-reminder v14 deployed (ACTIVE, id: 28edf0d6-e6af-4f95-9c79-df378a38dab9)
- All 8 handler sections untouched — only sendWhatsApp helper modified

---
*State updated: 2026-01-30*
