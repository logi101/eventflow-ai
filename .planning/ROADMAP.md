# Roadmap: EventFlow AI - Automated Reminders

**Milestone:** v1.0
**Created:** 2026-01-28
**Phases:** 5

---

## Phase 1: Scheduler Infrastructure

**Goal:** Enable pg_cron and create database functions that trigger Edge Functions on schedule

**Requirements:** SCHED-01, SCHED-02, SCHED-03, SCHED-04

**Plans:** 4 plans

Plans:
- [x] 01-01-PLAN.md - Enable pg_cron, pg_net, vault extensions
- [x] 01-02-PLAN.md - Configure Vault secrets for credentials
- [x] 01-03-PLAN.md - Create trigger_reminder_job function
- [x] 01-04-PLAN.md - Schedule cron jobs for reminders

**Success Criteria:**
1. pg_cron extension shows as enabled in Supabase dashboard
2. Database function `trigger_reminder_job(reminder_type)` exists and callable
3. Cron job for `check_reminders_due` runs every 5 minutes without errors
4. Test reminder job executes successfully when triggered manually

**Build Order:**
1. Enable pg_cron in Supabase dashboard
2. Create migration for `trigger_reminder_job` function
3. Create migration for cron schedule configuration
4. Test with manual invocation

---

## Phase 2: Reminder Types Implementation

**Goal:** Implement all 8 reminder types in send-reminder Edge Function

**Requirements:** REM-01, REM-02, REM-03, REM-04, REM-05, REM-06, REM-07, REM-08

**Plans:** 4 plans

Plans:
- [ ] 02-01-PLAN.md — Schema migration for new reminder types
- [ ] 02-02-PLAN.md — Activation & week-before reminder handlers
- [ ] 02-03-PLAN.md — Event-end & follow-up reminder handlers
- [ ] 02-04-PLAN.md — Full integration test & verification

**Success Criteria:**
1. send-reminder accepts `type` parameter for all 8 types
2. Activation reminder fires when event.status changes to 'active'
3. Week-before reminder finds events 7 days out
4. Day-before reminder finds events tomorrow
5. Morning reminder finds events today
6. 15-min reminder finds sessions starting in 15-20 minutes
7. Event-end reminder fires when event end_date passes
8. Follow-up reminders check manager approval flags before sending

**Build Order:**
1. Add activation trigger (database trigger on event status change)
2. Extend send-reminder.ts with week_before logic
3. Verify day_before logic (existing)
4. Verify morning logic (existing)
5. Verify 15_min logic (existing)
6. Add event_end logic
7. Add follow_up_3mo and follow_up_6mo logic with approval check

---

## Phase 3: Dynamic Template System

**Goal:** send-reminder fetches and uses templates from message_templates table

**Requirements:** TMPL-01, TMPL-02, TMPL-03, TMPL-04

**Plans:** 2 plans

Plans:
- [ ] 03-01-PLAN.md — Seed 8 default reminder templates into message_templates
- [ ] 03-02-PLAN.md — Wire send-reminder to fetch templates + variable substitution + verify

**Success Criteria:**
1. send-reminder queries message_templates by type before sending
2. Variable substitution replaces {{participant_name}}, {{event_name}}, {{event_date}}, {{venue_name}}, {{venue_address}}
3. All 8 reminder types have default templates seeded in database
4. Templates display correctly in WhatsApp with Hebrew RTL

**Build Order:**
1. Create/update seed.sql with 8 default templates
2. Modify send-reminder to fetch template by reminder type
3. Implement variable substitution function
4. Test each template renders correctly

---

## Phase 4: Manager Controls

**Goal:** Managers can control follow-up reminders and preview messages

**Requirements:** CTRL-01, CTRL-02, CTRL-03, CTRL-04

**Success Criteria:**
1. Event settings UI has toggles for follow_up_3mo and follow_up_6mo
2. Database events.settings JSONB stores these flags
3. Manager can see preview of activation message before enabling event
4. Test reminder button sends a single test message to manager's phone

**Build Order:**
1. Add follow-up toggles to event settings schema
2. Update EventDetailPage to show follow-up controls
3. Add message preview component
4. Add test reminder button with Edge Function call

---

## Phase 5: Reliability & Production Readiness

**Goal:** Ensure reminders are reliable, don't duplicate, and handle failures

**Requirements:** REL-01, REL-02, REL-03, REL-04

**Success Criteria:**
1. Same participant never receives same reminder type twice for same event
2. Failed messages logged with timestamp, error message, and retry count
3. Transient failures (network, rate limit) trigger automatic retry
4. System respects 30 msgs/min rate limit per organization

**Build Order:**
1. Add unique constraint on messages (participant_id, event_id, type)
2. Add retry_count and last_error columns to messages table
3. Implement retry logic in send-reminder with exponential backoff
4. Add rate limiting check before sending batch

---

## Summary

| Phase | Name | Requirements | Success Criteria |
|-------|------|--------------|------------------|
| 1 | Scheduler Infrastructure | SCHED-01,02,03,04 | 4 |
| 2 | Reminder Types | REM-01,02,03,04,05,06,07,08 | 8 |
| 3 | Dynamic Templates | TMPL-01,02,03,04 | 4 |
| 4 | Manager Controls | CTRL-01,02,03,04 | 4 |
| 5 | Reliability | REL-01,02,03,04 | 4 |

**Total:** 5 phases, 20 requirements, 24 success criteria

---
*Roadmap updated: 2026-01-28*
