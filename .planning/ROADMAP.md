# Roadmap: EventFlow AI v2.0

## Overview

This roadmap delivers the v2.0 milestone: Intelligent Production & Networking Engine. Building on v1.0's automated reminder system, v2.0 transforms EventFlow AI from a static data manager to an active real-time event concierge. The journey progresses through four phases: establishing AI write capabilities with human confirmation (Phase 6), adding networking infrastructure for intelligent seating and VIP handling (Phase 7), enabling offline check-in and vendor budget intelligence (Phase 8), and culminating in day simulation for proactive issue detection (Phase 9). All changes are additive — existing v1.0 functionality remains intact.

## Milestones

- **v1.0 Automated Reminders** - Phases 1-5 (shipped 2026-02-02)
- **v2.0 Intelligent Production & Networking Engine** - Phases 6-9 (in progress)

## Phases

**Phase Numbering:**
- Integer phases (6, 7, 8, 9): Planned v2.0 work
- Decimal phases (6.1, 6.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 6: AI Write Foundation** - AI manages schedules and rooms with human confirmation
- [ ] **Phase 7: Networking & VIP Infrastructure** - Intelligent seating, VIP priority, room assignments
- [ ] **Phase 8: Offline & Vendor Intelligence** - Offline check-in with sync, budget alerts
- [ ] **Phase 9: Day Simulation & Real-Time Operations** - Stress testing and contingency management

## Phase Details

### Phase 6: AI Write Foundation
**Goal**: AI can manage schedules, room assignments, and participant tracks via chat with human confirmation and full audit trail

**Depends on**: Phase 5 (v1.0 complete)

**Requirements**: AIAG-01, AIAG-02, AIAG-03, AIAG-04, AIAG-05, SCHED-05, SCHED-06, SCHED-07, VIP-03

**Success Criteria** (what must be TRUE):
  1. Manager can ask AI "Add workshop at 2pm in Room A" and see preview before execution
  2. AI suggestions show conflict warnings (room double-booking, capacity overflow) before approval
  3. Every AI write action appears in audit log with timestamp, user, and data changed
  4. AI chat maintains correct event context throughout conversation
  5. AI write operations respect RLS policies (multi-tenant isolation preserved)

**Plans**: 4 plans

Plans:
- [x] 06-01-PLAN.md -- Database foundation: ai_insights_log table, btree_gist, schedule conflict constraints, speaker overlap detection
- [x] 06-02-PLAN.md -- Extend ai-chat Edge Function: 3 schedule management tools, conflict detection, VIP awareness, pending_approval responses
- [x] 06-03-PLAN.md -- New execute-ai-action Edge Function: authenticated action executor with RLS enforcement and conflict re-check
- [x] 06-04-PLAN.md -- Frontend confirmation workflow: types, useAIConfirmation hook, AIConfirmationDialog, ChatContext + ChatWindow integration

### Phase 7: Networking & VIP Infrastructure
**Goal**: Manager can assign interest tracks to participants, generate intelligent table seating based on shared interests and diversity, and ensure VIP priority throughout the system

**Depends on**: Phase 6

**Requirements**: NETW-01, NETW-02, NETW-03, NETW-04, NETW-05, NETW-06, VIP-01, VIP-02, ROOM-01, ROOM-02, ROOM-03

**Success Criteria** (what must be TRUE):
  1. Manager can assign interest tracks to participants and toggle networking opt-in flag
  2. Seating algorithm generates table assignments placing participants with shared interests together while maintaining diversity
  3. VIP participants visually distinguished with badges throughout participant lists and check-in
  4. Manager can review AI-generated seating plan and manually override specific table assignments
  5. AI suggests room assignments based on VIP status, bed preferences, and accessibility needs with availability preview

**Plans**: 6 plans (5 core + 1 gap closure)

Plans:
- [x] 07-01-PLAN.md -- Database foundation: networking_opt_in column, table_assignments table, track_statistics view
- [x] 07-02-PLAN.md -- VIP visual treatment: VIPBadge component, useVIPSorting hook, WhatsApp VIP templates
- [x] 07-03-PLAN.md -- Track assignment UI: TrackChip component, useTrackAssignment hook, TrackAssignmentBulk component
- [x] 07-04-PLAN.md -- Seating algorithm: greedy optimization with VIP spread, companion grouping, shared interests scoring
- [x] 07-05-PLAN.md -- AI room assignments: suggest_room_assignments tool, RoomGridView, RoomListView, RoomAssignmentPanel
- [ ] 07-06-PLAN.md -- Gap closure: Wire TrackAssignmentBulk into GuestsPage, add seating tab to EventDetailPage

### Phase 8: Offline & Vendor Intelligence
**Goal**: Check-in works without internet connection and syncs when connection returns, while AI analyzes vendor quotes against budget and suggests alternatives

**Depends on**: Phase 6

**Requirements**: OFFL-01, OFFL-02, OFFL-03, OFFL-04, OFFL-05, VEND-01, VEND-02, VEND-03, VEND-04

**Success Criteria** (what must be TRUE):
  1. Check-in page loads participant list into local storage and shows offline/online status indicator
  2. QR check-in succeeds without internet, stores locally, and syncs to Supabase when connection returns
  3. Sync queue shows pending check-ins count and respects rate limits (no conflict with reminder system)
  4. Manager receives alert when accepted vendor quotes exceed budget threshold for checklist item
  5. AI can analyze vendor pricing and suggest alternative vendors with better ratings or lower cost

**Plans**: TBD

Plans:
- [ ] 08-01: TBD
- [ ] 08-02: TBD

### Phase 9: Day Simulation & Real-Time Operations
**Goal**: Manager can run day simulation to detect issues before event day (room conflicts, speaker overlaps, capacity problems) and activate contingency plans when issues occur

**Depends on**: Phase 6, Phase 7

**Requirements**: SIM-01, SIM-02, SIM-03, SIM-04, SIM-05, SCHED-08, SCHED-09

**Success Criteria** (what must be TRUE):
  1. Manager can trigger day simulation from event detail page or via chat command
  2. Simulation report shows issues by severity (critical/warning/info) with specific problems identified (room capacity exceeded, speaker double-booked, transition time too short)
  3. Simulation is deterministic (running twice with same data produces identical results)
  4. Manager can activate contingency plan (swap to backup speaker) when primary cancels
  5. Affected participants receive WhatsApp notification when schedule changes occur

**Plans**: TBD

Plans:
- [ ] 09-01: TBD
- [ ] 09-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 6 → 6.1 (if inserted) → 6.2 → 7 → 8 → 9

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 6. AI Write Foundation | 4/4 | Complete | 2026-02-02 |
| 7. Networking & VIP Infrastructure | 5/6 | Gap closure pending | - |
| 8. Offline & Vendor Intelligence | 0/TBD | Not started | - |
| 9. Day Simulation & Real-Time Operations | 0/TBD | Not started | - |

---
*Roadmap created: 2026-02-02*
*Roadmap updated: 2026-02-03 (Phase 7 gap closure plan added)*
*Milestone: v2.0 Intelligent Production & Networking Engine*
*Coverage: 36/36 v2.0 requirements mapped*
