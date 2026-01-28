# Requirements: EventFlow AI - Automated Reminders

**Defined:** 2026-01-28
**Core Value:** Participants receive the right message at the right time automatically

## v1 Requirements

Requirements for automated reminder system. Each maps to roadmap phases.

### Scheduler Infrastructure (SCHED)

- [ ] **SCHED-01**: pg_cron extension enabled in Supabase project
- [ ] **SCHED-02**: Database function exists that calls send-reminder Edge Function
- [ ] **SCHED-03**: Cron jobs configured for each reminder type at correct intervals
- [ ] **SCHED-04**: System verifies cron jobs are active and running

### Reminder Types (REM)

- [ ] **REM-01**: Activation reminder sent when manager activates event or sets date
- [ ] **REM-02**: Week-before reminder sent 7 days before event
- [ ] **REM-03**: Day-before reminder sent evening before event
- [ ] **REM-04**: Morning reminder sent on event day with location details
- [ ] **REM-05**: 15-minute reminder sent before each scheduled activity
- [ ] **REM-06**: Event-end reminder sent after event concludes (thank you)
- [ ] **REM-07**: 3-month follow-up sent (only if manager approved)
- [ ] **REM-08**: 6-month follow-up sent (only if manager approved)

### Template System (TMPL)

- [ ] **TMPL-01**: send-reminder fetches templates from message_templates table
- [ ] **TMPL-02**: Variable substitution works ({{participant_name}}, {{event_name}}, etc.)
- [ ] **TMPL-03**: Each reminder type has a default template in the database
- [ ] **TMPL-04**: Templates support Hebrew RTL with Heebo font styling hints

### Manager Controls (CTRL)

- [ ] **CTRL-01**: Manager can enable/disable follow-up reminders per event
- [ ] **CTRL-02**: Event settings store follow-up approval (follow_up_3mo, follow_up_6mo flags)
- [ ] **CTRL-03**: Manager can preview message before activation reminder goes out
- [ ] **CTRL-04**: Manager can manually trigger any reminder type for testing

### Reliability (REL)

- [ ] **REL-01**: Duplicate prevention (same reminder not sent twice to same participant)
- [ ] **REL-02**: Failed messages logged with error details
- [ ] **REL-03**: Retry logic for transient failures (up to 3 attempts)
- [ ] **REL-04**: Rate limiting respected (30 msgs/min per organization)

## v2 Requirements

Deferred to future milestone.

### Multi-Channel (CHAN)

- **CHAN-01**: Email reminders as fallback for failed WhatsApp
- **CHAN-02**: SMS reminders for urgent messages
- **CHAN-03**: Push notifications via web

### Analytics (ANLYT)

- **ANLYT-01**: Dashboard showing reminder delivery rates
- **ANLYT-02**: Message open/read tracking via Green API webhooks
- **ANLYT-03**: A/B testing for message templates

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time chat with participants | Different feature - not reminder system |
| Payment reminders | Phase 5 premium feature |
| Google Calendar invites | Phase 5 premium feature |
| Mobile app push notifications | Web-first approach |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SCHED-01 | Phase 1 | Pending |
| SCHED-02 | Phase 1 | Pending |
| SCHED-03 | Phase 1 | Pending |
| SCHED-04 | Phase 1 | Pending |
| REM-01 | Phase 2 | Pending |
| REM-02 | Phase 2 | Pending |
| REM-03 | Phase 2 | Pending |
| REM-04 | Phase 2 | Pending |
| REM-05 | Phase 2 | Pending |
| REM-06 | Phase 2 | Pending |
| REM-07 | Phase 2 | Pending |
| REM-08 | Phase 2 | Pending |
| TMPL-01 | Phase 3 | Pending |
| TMPL-02 | Phase 3 | Pending |
| TMPL-03 | Phase 3 | Pending |
| TMPL-04 | Phase 3 | Pending |
| CTRL-01 | Phase 4 | Pending |
| CTRL-02 | Phase 4 | Pending |
| CTRL-03 | Phase 4 | Pending |
| CTRL-04 | Phase 4 | Pending |
| REL-01 | Phase 5 | Pending |
| REL-02 | Phase 5 | Pending |
| REL-03 | Phase 5 | Pending |
| REL-04 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 20 total
- Mapped to phases: 20
- Unmapped: 0 ✓

---
*Requirements defined: 2026-01-28*
*Last updated: 2026-01-28 after initial definition*
