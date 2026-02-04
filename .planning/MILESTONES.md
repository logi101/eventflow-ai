# Milestones: EventFlow AI

## v2.1 — SaaS Tier Structure (IN PROGRESS)

**Started:** 2026-02-03
**Status:** In Progress
**Phases:** 4 (Phases 10-13)
**Plans:** 22 total (planned)
**Requirements:** 623 lines in REQUIREMENTS.md, 847 lines in ROADMAP.md

**What we're building:**
- Base (free) and Premium (paid) subscription tiers
- Three-layer enforcement: Database RLS, Edge Functions, React Context
- Usage limits: Events (5/year Base), Participants (100/event Base), Messages (200/month Base), AI chat (50/month Base)
- Premium-only features: AI chat, simulation, networking, budget alerts, vendor analysis
- Graceful upgrade UX with contextual prompts
- Admin panel for manual tier assignment
- 7-day trial mode
- **Out of scope:** Payment integration (deferred to v2.2)

**Phase summary:**

| Phase | Name | Plans | Status |
|-------|------|-------|--------|
| 10 | Foundation | 5/5 | In Progress (1/5 complete) |
| 11 | Enforcement | 7/7 | Not Started |
| 12 | Feature Gating | 6/6 | Not Started |
| 13 | UI/UX & Admin | 6/6 | Not Started |

**Key accomplishments:**
1. Database schema with tier columns (tier, tier_limits, current_usage)
2. TierContext with real-time usage tracking
3. Central tiers configuration (TIERS registry)
4. TierBadge component for header display

**Next steps:**
- Complete Phase 10: Usage triggers, RLS policies, user migration, reset cron
- Phase 11: Edge Function quota middleware and tier checks
- Phase 12: FeatureGuard, QuotaGuard, wrap Premium features
- Phase 13: Usage dashboard, tier comparison, upgrade modal, admin panel

**Git range:** `docs(v2.1)` → `feat(13-06)`

**Last phase number:** 13

---

## v1.0 — Automated Reminders (COMPLETE)

## v2.0 — Intelligent Production & Networking Engine (COMPLETE)

**Completed:** 2026-02-03
**Phases:** 4 (Phases 6-9)
**Plans:** 22 total
**Requirements:** 36/36 complete

**What shipped:**
- AI chat with suggest → confirm → execute pattern and full audit trail
- Intelligent seating algorithm with VIP priority and drag-drop override
- Track assignment for participant networking optimization
- Offline-first check-in with IndexedDB and background sync
- Budget alerts with dual-channel notifications (in-app + WhatsApp)
- AI vendor analysis with alternative suggestions
- Day simulation with 8 validators (rooms, speakers, capacity, timing, equipment, VIP, catering, back-to-back)
- Contingency management with backup speaker activation and participant notifications

**Phase summary:**

| Phase | Name | Plans | Status |
|-------|------|-------|--------|
| 6 | AI Write Foundation | 4/4 | Complete |
| 7 | Networking & VIP Infrastructure | 6/6 | Complete |
| 8 | Offline & Vendor Intelligence | 6/6 | Complete |
| 9 | Day Simulation & Real-Time Operations | 6/6 | Complete |

**Key accomplishments:**
1. AI manages schedules with human confirmation and conflict detection
2. Networking engine assigns tables by shared interests with VIP spread
3. Offline check-in works without internet, syncs when connection returns
4. Budget threshold alerts trigger WhatsApp notifications to manager
5. Day simulation detects issues before event day
6. Contingency system activates backup speakers with participant notifications

**Stats:**
- 29,352 lines of TypeScript
- 4 phases, 22 plans
- 2 days from start to ship (2026-02-02 → 2026-02-03)
- 14 Edge Functions deployed

**Git range:** `feat(06-01)` → `feat(09-06)`

---

## v1.0 — Automated Reminders (COMPLETE)

**Completed:** 2026-01-30
**Phases:** 5 (all complete)
**Requirements:** 20/20 complete

**What shipped:**
- pg_cron scheduler with 8 active cron jobs
- All 8 reminder types (activation → 6-month follow-up)
- Dynamic template engine from message_templates table
- Manager controls (toggles, preview, test button)
- Deduplication via unique partial index
- Rate limiting (2.1s throttle, ~28 msgs/min)
- Retry logic for transient failures
- iOS PWA push notifications

**Phase summary:**

| Phase | Name | Plans | Status |
|-------|------|-------|--------|
| 1 | Scheduler Infrastructure | 4/4 | ✓ Complete |
| 2 | Reminder Types Implementation | 4/4 | ✓ Complete |
| 3 | Dynamic Template System | 2/2 | ✓ Complete |
| 4 | Manager Controls | audit-only | ✓ Complete |
| 5 | Reliability & Production Readiness | 2/2 | ✓ Complete |

---
*Created: 2026-02-02*
*Updated: 2026-02-04*
