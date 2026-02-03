# Requirements: EventFlow AI — Intelligent Production & Networking Engine

**Defined:** 2026-02-02
**Core Value:** The event manager has full control while AI handles the complexity

## v2.0 Requirements

Requirements for intelligent production features. Each maps to roadmap phases.

### AI Agent Foundation (AIAG)

- [x] **AIAG-01**: AI chat can suggest DB write operations with preview before execution
- [x] **AIAG-02**: Manager sees confirmation dialog with action description + impact before any AI write executes
- [x] **AIAG-03**: AI actions are logged in audit trail (ai_insights_log table) with action type, data, user, timestamp
- [x] **AIAG-04**: AI chat maintains correct event context (event_id scoped per conversation)
- [x] **AIAG-05**: AI writes respect existing RLS policies (uses user JWT, not service_role_key)

### Schedule Management (SCHED)

- [x] **SCHED-05**: AI can create, update, and delete schedule items via chat with manager confirmation
- [x] **SCHED-06**: System detects schedule conflicts (room double-booking, speaker overlap, capacity overflow) in real-time
- [x] **SCHED-07**: Conflict warnings shown before AI suggestion is approved
- [ ] **SCHED-08**: Manager can activate contingency plan (swap to backup speaker) when primary cancels
- [ ] **SCHED-09**: Affected participants notified via WhatsApp when schedule changes

### Networking Engine (NETW)

- [x] **NETW-01**: Manager can assign interest tracks to participants (participant_tracks linking)
- [x] **NETW-02**: Participants have networking_opt_in flag (default false, manager toggles)
- [x] **NETW-03**: Seating algorithm assigns participants to tables based on shared interests + diversity constraints
- [x] **NETW-04**: Table assignments stored in table_assignments table with event_id, participant_id, table_number
- [x] **NETW-05**: Manager can view and manually override AI-generated seating plan
- [x] **NETW-06**: VIP participants get priority seating (table 1 or designated VIP tables)

### VIP Handling (VIP)

- [x] **VIP-01**: VIP participants visually distinguished throughout the system (badges, priority indicators)
- [x] **VIP-02**: VIP-specific WhatsApp templates with personalized variables (room_number, table_number)
- [x] **VIP-03**: AI prioritizes VIP requests and concerns in chat responses

### Smart Room Assignment (ROOM)

- [x] **ROOM-01**: AI can suggest room assignments based on VIP status, bed preferences, accessibility needs
- [x] **ROOM-02**: Manager sees room availability and capacity before approving AI suggestion
- [x] **ROOM-03**: WhatsApp templates include room details (room_number, building, floor) as dynamic variables

### Day Simulation (SIM)

- [ ] **SIM-01**: Manager can trigger day simulation from event detail page or via chat command
- [ ] **SIM-02**: Simulation analyzes: room capacity vs registrations, transition times between sessions, speaker schedule risks, vendor readiness
- [ ] **SIM-03**: Simulation report shows issues by severity (critical, warning, info) with suggested fixes
- [ ] **SIM-04**: Simulation is deterministic (same input → same output)
- [ ] **SIM-05**: Manager can re-run simulation after fixing issues to verify resolution

### Vendor Intelligence (VEND)

- [ ] **VEND-01**: AI can analyze vendor quotes against budget allocation per checklist item
- [ ] **VEND-02**: System alerts when accepted quotes exceed budget threshold
- [ ] **VEND-03**: AI suggests alternative vendors with better ratings or pricing
- [ ] **VEND-04**: Checklist items can be linked to vendors (vendor_id on checklist_items)

### Offline Check-In (OFFL)

- [ ] **OFFL-01**: Check-in page loads participant list into local IndexedDB for offline access
- [ ] **OFFL-02**: QR check-in works without internet connection (writes to local DB)
- [ ] **OFFL-03**: Offline check-ins sync to Supabase when connection returns
- [ ] **OFFL-04**: UI shows online/offline status and pending sync count
- [ ] **OFFL-05**: Sync respects existing rate limits (no conflict with reminder system throttle)

## v3.0 Requirements

Deferred to future milestone.

### Multi-Channel (CHAN)

- **CHAN-01**: Email reminders as fallback for failed WhatsApp
- **CHAN-02**: SMS reminders for urgent messages
- **CHAN-03**: Push notifications via web (partially done — iOS PWA push exists)

### Calendar Integration (CAL)

- **CAL-01**: Google Calendar sync for event schedules
- **CAL-02**: Calendar invites sent to participants

### Payments (PAY)

- **PAY-01**: Payment processing for event registration
- **PAY-02**: Invoice generation for vendors

### Analytics (ANLYT)

- **ANLYT-01**: Dashboard showing reminder delivery rates
- **ANLYT-02**: Message open/read tracking via Green API webhooks
- **ANLYT-03**: A/B testing for message templates

## Out of Scope

| Feature | Reason |
|---------|--------|
| Autonomous AI agent (no confirmation) | Violates core principle: system recommends, user decides |
| Participant self-service track selection | Manager controls networking quality |
| Full offline mode (all features) | 80/20 rule — only check-in is field-critical |
| Real-time chat with participants | Different product category |
| Mobile native app | Web PWA approach covers offline needs |
| Social media auto-posting | Brand risk, requires separate approval workflow |
| Gamification (badges, leaderboards) | Wrong fit for luxury/professional events |
| Multi-event attendee dashboard | Attendees care about ONE event at a time |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AIAG-01 | Phase 6 | Complete |
| AIAG-02 | Phase 6 | Complete |
| AIAG-03 | Phase 6 | Complete |
| AIAG-04 | Phase 6 | Complete |
| AIAG-05 | Phase 6 | Complete |
| SCHED-05 | Phase 6 | Complete |
| SCHED-06 | Phase 6 | Complete |
| SCHED-07 | Phase 6 | Complete |
| SCHED-08 | Phase 9 | Pending |
| SCHED-09 | Phase 9 | Pending |
| NETW-01 | Phase 7 | Complete |
| NETW-02 | Phase 7 | Complete |
| NETW-03 | Phase 7 | Complete |
| NETW-04 | Phase 7 | Complete |
| NETW-05 | Phase 7 | Complete |
| NETW-06 | Phase 7 | Complete |
| VIP-01 | Phase 7 | Complete |
| VIP-02 | Phase 7 | Complete |
| VIP-03 | Phase 6 | Complete |
| ROOM-01 | Phase 7 | Complete |
| ROOM-02 | Phase 7 | Complete |
| ROOM-03 | Phase 7 | Complete |
| SIM-01 | Phase 9 | Pending |
| SIM-02 | Phase 9 | Pending |
| SIM-03 | Phase 9 | Pending |
| SIM-04 | Phase 9 | Pending |
| SIM-05 | Phase 9 | Pending |
| VEND-01 | Phase 8 | Pending |
| VEND-02 | Phase 8 | Pending |
| VEND-03 | Phase 8 | Pending |
| VEND-04 | Phase 8 | Pending |
| OFFL-01 | Phase 8 | Pending |
| OFFL-02 | Phase 8 | Pending |
| OFFL-03 | Phase 8 | Pending |
| OFFL-04 | Phase 8 | Pending |
| OFFL-05 | Phase 8 | Pending |

**Coverage:**
- v2.0 requirements: 36 total
- Mapped to phases: 36 (100% coverage ✓)
- Phase 6: 9 requirements
- Phase 7: 11 requirements
- Phase 8: 9 requirements
- Phase 9: 7 requirements

---
*Requirements defined: 2026-02-02*
*Last updated: 2026-02-02 after roadmap creation*
