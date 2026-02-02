# Domain Pitfalls: Adding Intelligence to Production Event Management

**Domain:** Event Management System with AI Enhancement
**Researched:** 2026-02-02
**Confidence:** HIGH (based on existing EventFlow codebase analysis + domain knowledge)

---

## Critical Pitfalls

Mistakes that cause data corruption, system failures, or security breaches.

### Pitfall 1: AI Bypasses Row-Level Security Policies

**What goes wrong:** AI chat gains DB write access via service_role_key, bypassing all RLS policies designed to enforce multi-tenant isolation.

**Why it happens:**
- Edge Function uses `SUPABASE_SERVICE_ROLE_KEY` for DB access (current ai-chat.ts line 53)
- Service role bypasses ALL RLS policies
- AI-suggested writes execute without organization_id validation
- User in Org A can trick AI into modifying Org B's data

**Consequences:**
- Multi-tenant data leakage (catastrophic)
- Participant data exposed across organizations
- Vendor quotes visible to competitors
- Regulatory compliance violations (GDPR, data privacy)
- Complete loss of trust, potential legal liability

**Prevention:**
1. **Use user-scoped auth tokens for AI writes**, not service_role_key
2. Create dedicated RLS policy for AI operations: `ai_user_writes` that validates organization_id
3. AI Edge Function must accept user JWT, forward to Supabase client
4. Every AI write must validate: `organization_id = auth.user_org_id()`
5. Add audit log: `ai_actions` table with user_id, organization_id, action, target_table
6. Test: User from Org A attempts AI write to Org B event → should fail with RLS error

**Detection:**
- RLS violation errors in Supabase logs
- Audit log shows mismatched organization_id
- Automated test: AI write across org boundary fails

**Phase to address:** Phase 1 (AI write foundation) — MUST be correct from day 1

---

### Pitfall 2: Offline Sync Creates Duplicate Participants

**What goes wrong:** Manager checks in participant "John Doe" offline. Before sync completes, another manager checks in same person online. Result: Two check-in records, conflicting timestamps, duplicate database entries.

**Why it happens:**
- Offline writes use optimistic IDs (UUIDs generated client-side)
- Online system has no knowledge of pending offline writes
- No conflict detection on participant.id during sync
- Sync uses INSERT instead of UPSERT
- Race condition: both writes succeed, last-write-wins clobbers first check-in

**Consequences:**
- Attendance reports show duplicates
- Participant checked_in_at timestamp incorrect
- Room assignments may be duplicated
- Statistics corrupted (inflated attendance)
- Manual reconciliation required (expensive, error-prone)

**Prevention:**
1. **Use deterministic conflict resolution**: server timestamp always wins
2. Client-side: Tag offline writes with `is_offline: true`, `offline_generated_at: timestamp`
3. Sync endpoint: UPSERT with conflict check on `(event_id, participant.id)`
4. If server has newer `updated_at`, reject client write, return server version
5. Queue system: Process offline writes sequentially, not in parallel
6. Add `sync_version` column: Increment on every write, detect conflicts
7. UI: Show "Sync conflict detected" modal, let manager choose winner

**Detection:**
- Duplicate `participant.id` entries in `participants` table
- `messages` sent to same phone twice
- Check-in count mismatch: sum(checked_in) ≠ count(checked_in_at)
- Sync logs show INSERT failures on unique constraint

**Phase to address:** Phase 2 (Offline check-in) — Core sync logic must handle conflicts

---

### Pitfall 3: pg_cron Jobs Fire During Schema Migration

**What goes wrong:** Automated reminder cron job fires mid-migration while `messages` table is being altered. Job crashes, leaves partial messages in DB, or sends reminders with wrong template.

**Why it happens:**
- 8 active cron jobs fire every 30-60 minutes (per existing system)
- Migration locks table, cron job times out or throws error
- No migration-time safeguard to pause cron jobs
- Edge Function `send-reminder` assumes table schema hasn't changed
- Column name changes (e.g., `message_type` → `reminder_type`) break running jobs

**Consequences:**
- Reminders not sent (participants miss event)
- Partial messages written to DB (invalid state)
- Cron job disabled by Supabase after repeated failures
- Template substitution fails → recipients see `{{participant_name}}` literally
- Requires manual re-queuing of all missed reminders

**Prevention:**
1. **Migration protocol**: Disable all cron jobs BEFORE schema changes
2. Use `pg_cron.unschedule()` at migration start, re-schedule after verify
3. Edge Function: Add schema version check at start: `SELECT version FROM schema_metadata`
4. If version mismatch, return error, refuse to process
5. Test migrations in staging with cron jobs active
6. Add `ENABLE_CRON` env var: Set to false during deployments
7. Document deployment checklist: Stop cron → migrate → verify → resume cron

**Detection:**
- Supabase logs show cron job errors during migration window
- `messages` table has rows with `status: 'error'` and `error_message: 'column not found'`
- Monitoring: Alert if cron job fails >3 times in 1 hour
- Post-deployment test: Verify all 8 cron jobs run successfully

**Phase to address:** Every phase that modifies DB schema — Deployment safeguard

---

### Pitfall 4: Seating Algorithm Exposes Sensitive Preferences

**What goes wrong:** Networking engine seats participants by shared interests. Manager assigns participant to track "LGBTQ+ Leadership". Seating algorithm groups this person with others in same track. Table assignments exported to Excel → sent to venue coordinator. Coordinator is homophobic, participant faces discrimination.

**Why it happens:**
- Track names stored literally: `tracks.name = "LGBTQ+ Leadership"`
- Seating algorithm uses track names for grouping
- No distinction between "visible metadata" (role: speaker) vs "private preference" (topic interest)
- Export includes raw track names
- No opt-out mechanism for participants
- Manager assumes internal data stays internal

**Consequences:**
- Participant safety compromised (physical, emotional)
- Privacy violation (sensitive attribute disclosed)
- Legal liability (discrimination claim)
- Reputational damage to event organizer
- Loss of participant trust

**Prevention:**
1. **Track visibility flags**: Add `is_public: boolean` to `tracks` table
2. Private tracks: Visible to manager only, not exported
3. Seating algorithm: Use hashed track IDs for grouping, never raw names
4. Participant opt-out: `networking_opt_in: boolean` (default: false)
5. Export sanitization: Strip sensitive columns before generating Excel
6. UI warning: "Private tracks are for internal use only"
7. Audit log: Track which staff viewed private participant data
8. Legal review: GDPR compliance for sensitive attribute processing

**Detection:**
- Exported Excel files contain track names marked `is_public: false`
- Participant data shows tracks without participant consent
- Audit log shows non-manager roles accessing private track data

**Phase to address:** Phase 3 (Networking engine) — Privacy design from day 1

---

### Pitfall 5: AI Simulation Recommends Impossible Room Assignment

**What goes wrong:** Day simulation AI suggests moving "VIP Session" from Room A (capacity 50) to Room B (capacity 200). Manager approves. On event day: Room B is already booked by another session (time block conflict). 200 participants show up, no room available. Chaos.

**Why it happens:**
- AI queries `rooms` table, sees capacity 200, returns suggestion
- AI doesn't validate `time_blocks` for conflicts
- No constraint in DB enforcing one-room-per-time-block
- Suggestion approval bypasses normal validation
- Manager assumes AI checked for conflicts (it didn't)

**Consequences:**
- Double-booked rooms on event day
- Participants stranded without venue
- Manual scrambling to find backup space
- Event delays, angry participants
- AI loses credibility, manager stops using feature

**Prevention:**
1. **AI suggestions must go through same validation as manual edits**
2. Create DB constraint: `UNIQUE (room_id, time_block_id)` on `schedules`
3. AI query: JOIN `schedules` to check room availability before suggesting
4. Suggestion payload: Include validation results: `conflicts: []`
5. UI: Show conflict warnings before approval: "Room B is busy 10:00-11:00"
6. Rollback mechanism: If applied suggestion breaks event, one-click undo
7. Test: Simulation with existing conflicts → AI must detect and warn

**Detection:**
- DB constraint violation errors on `schedules` insert
- Audit log shows AI suggestion approved without validation
- Event day: Multiple sessions show `room_id: same_value` for overlapping times
- Monitoring: Alert if simulation applies >5 changes without conflicts detected

**Phase to address:** Phase 4 (Day simulation) — Validation layer is mandatory

---

## Moderate Pitfalls

Mistakes that cause poor UX, technical debt, or system slowdowns.

### Pitfall 6: AI Write Confirmation Flow Blocks Critical Actions

**What goes wrong:** Manager asks AI "cancel tomorrow's reminder". AI responds "I can cancel the reminder. Approve?" Manager clicks "Yes". AI then asks "Are you sure?" Manager frustrated, clicks through 3 confirmation dialogs. During event crisis, this delay is unacceptable.

**Why it happens:**
- Over-engineered safety: Every AI action requires confirmation
- No distinction between low-risk (view data) and high-risk (delete data) actions
- Confirmation dialog interrupts conversation flow
- No "trust mode" for experienced users

**Consequences:**
- Managers avoid AI, revert to manual operations
- AI adoption stalls (feature goes unused)
- Development time wasted building unused safety layer
- User frustration, support tickets

**Prevention:**
1. **Risk-based confirmation**: Read-only actions don't need approval
2. Low-risk: Room assignment change → Inline approval ("Apply this change? ✓")
3. High-risk: Delete event, send 500 messages → Full confirmation dialog
4. Trust mode: After 10 successful AI actions, offer "Skip confirmations for simple tasks"
5. Batch approval: AI suggests 5 changes → One dialog with list, approve all
6. Escape hatch: "Undo last AI action" button (visible for 5 minutes)

**Detection:**
- Analytics: Average confirmations per AI interaction >2
- User feedback: "Too many popups"
- Session recordings show users canceling AI flow mid-way

**Phase to address:** Phase 1 (AI write foundation) — UX design phase

---

### Pitfall 7: Offline Queue Grows Unbounded

**What goes wrong:** Manager checks in 500 participants offline at venue with poor WiFi. App queues all 500 writes in IndexedDB. WiFi reconnects, sync starts. After 50 successful syncs, user closes laptop. Next day: 450 writes still pending, but event is over. Queue never clears.

**Why it happens:**
- No queue size limit in IndexedDB
- Sync process doesn't resume on app reload
- No expiration policy for queued writes
- User has no visibility into queue status

**Consequences:**
- Stale data syncs days later, overwriting current data
- App storage grows indefinitely (performance degradation)
- Sync never completes (appears stuck)
- User frustration, manual data re-entry required

**Prevention:**
1. **Queue size limit**: Max 100 pending writes in IndexedDB
2. Expiration policy: Queued writes older than 24 hours auto-deleted
3. UI: Show queue status: "50 changes waiting to sync"
4. Resume on reload: Service Worker checks queue on app start
5. Batch sync: Process 10 writes per API call, not 1-by-1
6. Manual clear: Button to flush queue ("Discard offline changes")
7. Monitoring: Alert if queue >50 items for >1 hour

**Detection:**
- IndexedDB size >10MB
- `sync_queue` table shows items with `created_at` >24h ago
- Analytics: Average queue size at sync time

**Phase to address:** Phase 2 (Offline check-in) — Queue management must be robust

---

### Pitfall 8: Vendor Intelligence Compares Quotes in Different Currencies

**What goes wrong:** Event manager gets quotes: Vendor A: $5000 USD, Vendor B: ₪18000 ILS. AI analysis says "Vendor A is cheaper: $5000 < ₪18000". Manager approves Vendor A. On invoice day: Exchange rate makes Vendor B actually cheaper. Manager overpays.

**Why it happens:**
- No currency normalization in quote comparison
- AI compares numeric values without checking currency field
- Exchange rates not fetched
- Manager assumes AI did the math

**Consequences:**
- Incorrect vendor selection (budget overrun)
- Manager loses trust in AI recommendations
- Finance team angry, manual reconciliation needed

**Prevention:**
1. **Currency column**: Add `currency: string` to `event_vendors` table
2. Quote comparison: Normalize all to single currency (ILS for Israeli system)
3. Fetch exchange rates: API call to currency service, cache for 24h
4. AI disclaimer: "Comparison uses rate 1 USD = 3.6 ILS (2026-02-02)"
5. UI: Show original and normalized amounts side-by-side
6. Fallback: If currency API fails, refuse comparison with error

**Detection:**
- AI comparison logs show different currency codes in same calculation
- Audit: Quote selection doesn't match cheapest after normalization
- User complaints: "AI recommended wrong vendor"

**Phase to address:** Phase 5 (Vendor intelligence) — Currency handling from start

---

### Pitfall 9: Seating Algorithm Creates Socially Awkward Tables

**What goes wrong:** Networking algorithm seats participants by shared tracks. Result: Table of 8 people, all strangers, all introverts, no conversation starters. Networking fails.

**Why it happens:**
- Algorithm only considers interest overlap, ignores social dynamics
- No "connector" seating: Experienced attendees mixed with newcomers
- All VIPs seated together (echo chamber, no diverse perspectives)
- No table diversity metrics (e.g., gender balance, seniority mix)

**Consequences:**
- Participants report poor networking experience
- "I sat with 8 people and we barely talked"
- Event NPS score drops
- Manager manually re-assigns tables (algorithm unused)

**Prevention:**
1. **Diversity constraints**: Each table needs ≥30% newcomers, ≥30% experienced
2. Connector seating: Identify extroverts (opt-in flag), place 2 per table
3. Balance metrics: Track role distribution (speaker, attendee, sponsor)
4. Randomness: 20% of seats random (serendipitous connections)
5. Feedback loop: Post-event survey asks "Did you make valuable connections?"
6. Manager override: Easy drag-drop to adjust AI seating

**Detection:**
- Post-event survey: Low networking scores
- Tables with 100% newcomers or 100% VIPs
- Analytics: No conversation starters at 50%+ tables

**Phase to address:** Phase 3 (Networking engine) — Algorithm tuning with UX research

---

## Minor Pitfalls

Mistakes that cause annoyance but are fixable without major refactoring.

### Pitfall 10: AI Chat Suggests Actions for Wrong Event

**What goes wrong:** Manager has 5 active events. Opens AI chat from Event A context. Asks "Add a speaker". AI creates speaker for Event B (last event manager viewed yesterday).

**Why it happens:**
- AI chat doesn't maintain event_id context properly
- Session context relies on localStorage, not URL parameter
- AI Edge Function receives stale event_id from previous session

**Consequences:**
- Speaker added to wrong event
- Manager confused, submits support ticket
- Manual fix required (move speaker to correct event)

**Prevention:**
1. **Explicit event context**: AI chat always shows "Context: Event A" at top
2. URL parameter: `?event_id=xxx` passed to AI Edge Function
3. Validation: If user switches events mid-chat, show "Context changed" warning
4. Session scoping: `ai_chat_sessions.event_id` must match current URL

**Detection:**
- Audit log: AI action applied to event_id ≠ current URL event_id
- User feedback: "AI added thing to wrong event"

**Phase to address:** Phase 1 (AI write foundation) — Context management

---

### Pitfall 11: Offline Check-In Shows Stale Participant List

**What goes wrong:** Manager loads check-in page at 8 AM. Goes offline. At 9 AM, online admin adds 10 late registrations. Offline manager checks in 50 people, doesn't see the 10 new ones. They arrive, not on list.

**Why it happens:**
- Service Worker caches participant list from initial load
- No background sync to refresh cached data
- Manager assumes list is up-to-date

**Consequences:**
- Late registrants manually added on paper, entered into system later
- Poor experience for participants ("You're not on the list")
- Extra work for staff

**Prevention:**
1. **Cache timestamp**: Show "Participant list from 8:00 AM" at top
2. Periodic refresh: Every 5 minutes, attempt background sync
3. Online indicator: Green dot = connected, yellow = stale cache
4. Manual refresh button: "Update participant list"
5. Offline warning: "Working offline. New registrations not visible until sync."

**Detection:**
- Manager checks in participant not in cached list → shows "Not found" but exists in DB
- Post-event: Manual paper check-ins don't match digital list

**Phase to address:** Phase 2 (Offline check-in) — Cache freshness UI

---

### Pitfall 12: AI Simulation Results Not Reproducible

**What goes wrong:** Manager runs day simulation Tuesday, gets result: "3 conflicts detected". Runs again Wednesday with same data, gets: "5 conflicts detected". Manager doesn't trust AI.

**Why it happens:**
- AI uses non-deterministic model (temperature >0)
- Simulation queries database with ORDER BY random()
- Results depend on current timestamp or external factors

**Consequences:**
- Manager can't rely on simulation for planning
- Feature perceived as buggy, abandoned
- Debugging impossible (can't reproduce errors)

**Prevention:**
1. **Deterministic mode**: Simulation uses temperature=0 for Gemini
2. Fixed seed: For any given event state, simulation returns same results
3. Snapshot simulation input: Save DB state at simulation start
4. Results versioning: `simulation_runs` table with input hash, output, timestamp
5. Replay feature: Re-run past simulation with exact same inputs

**Detection:**
- User reports: "Results change every time"
- Audit log: Same event_id, different simulation results <1 hour apart

**Phase to address:** Phase 4 (Day simulation) — Determinism for trust

---

## Integration Pitfalls with Existing System

Specific to modifying EventFlow AI v1.0 in production.

### Pitfall 13: Modified Edge Function Breaks Existing Cron Callers

**What goes wrong:** Developer adds required parameter `confirm: boolean` to `send-reminder` Edge Function. Deploys. All 8 cron jobs fail because they call old signature without `confirm` param.

**Why it happens:**
- Edge Functions don't have versioning
- Breaking API changes deployed without migration
- Cron jobs hardcoded to call function name, not versioned endpoint
- No API contract testing between cron and function

**Consequences:**
- All automated reminders stop working
- Silent failure (no immediate alert)
- Participants miss event notifications
- Emergency rollback required

**Prevention:**
1. **Backward compatibility**: New params must be optional with defaults
2. Versioned functions: `send-reminder-v14`, `send-reminder-v15` (keep old deployed)
3. Migration script: Update all cron jobs to new signature before deploying
4. Integration tests: Cron job mocks call Edge Function, assert success
5. Canary deployment: Deploy function, test with single cron job, then switch all
6. Deprecation period: Keep old function live for 1 week after new deploy

**Detection:**
- Supabase function logs: 400 errors from cron jobs
- Monitoring: Alert if scheduled reminder count drops to 0
- Cron job status: All jobs show `last_run: error`

**Phase to address:** Every phase modifying Edge Functions — Deployment protocol

---

### Pitfall 14: AI Writes Bypass Existing Message Deduplication

**What goes wrong:** AI suggests "Send reminder to 50 participants". Manager approves. AI inserts 50 rows into `messages` table. System dedup is based on `(participant_id, message_type, event_id)` unique constraint. AI doesn't set `message_type`, leaves NULL. Constraint doesn't fire. All 50 messages sent, even if reminder already sent manually today.

**Why it happens:**
- AI insert bypasses application-layer dedup logic
- Unique constraint assumes `message_type NOT NULL`
- AI doesn't understand existing business rules (8 reminder types)
- No validation layer between AI write and DB

**Consequences:**
- Duplicate messages sent (participant annoyance)
- WhatsApp rate limit hit (messages queued or failed)
- Manager loses trust in AI (it caused spam)

**Prevention:**
1. **AI writes must use same service layer as manual writes**
2. Create shared function: `insertMessage()` with dedup logic
3. AI Edge Function calls this function, not raw Supabase insert
4. DB constraint: `message_type` NOT NULL + unique constraint
5. Pre-insert validation: Check for existing message before AI write
6. Test: AI send reminder → manually send same reminder → second should fail

**Detection:**
- `messages` table shows duplicate `(participant_id, event_id)` entries with same timestamp
- Green API rate limit errors increase after AI writes
- Audit log: AI inserts without `message_type` set

**Phase to address:** Phase 1 (AI write foundation) — Integration with existing rules

---

### Pitfall 15: Offline Sync Ignores Existing Rate Limiting

**What goes wrong:** Manager queues 200 check-ins offline. Syncs. Sync loop calls Supabase 200 times in 10 seconds. Hits Supabase connection limit (100/sec). Half the writes fail. System retries, hits WhatsApp rate limit (existing reminder system uses same limit). Entire messaging system stalls.

**Why it happens:**
- Offline sync doesn't respect existing 2.1s throttle (from send-reminder v14)
- Batch sync uses parallel writes, not sequential
- No shared rate limit state between sync and reminders
- Resource contention: Both systems hit same DB pool

**Consequences:**
- Check-in sync fails, participants not marked present
- Reminder system stalls (collateral damage)
- Supabase connection pool exhausted
- Manual intervention required to clear queues

**Prevention:**
1. **Shared rate limit state**: Redis or Supabase table with `last_write_at`
2. Sync respects 2.1s throttle: Sequential writes, not parallel
3. Batch upsert: Single API call with 50 rows, not 50 calls
4. Priority queue: Reminders prioritized over offline sync backfill
5. Circuit breaker: If sync hits rate limit, pause for 60 seconds
6. Monitoring: Alert if DB connection pool >80% full

**Detection:**
- Supabase logs: 429 Too Many Requests errors during sync
- Reminder system logs: Throttle exceeded
- Analytics: Spike in API calls during sync window

**Phase to address:** Phase 2 (Offline check-in) — Resource management

---

## Phase-Specific Warnings

| Phase | Likely Pitfall | Mitigation |
|-------|----------------|------------|
| Phase 1: AI Write Access | RLS bypass (Pitfall 1), Wrong event context (Pitfall 10), Message dedup bypass (Pitfall 14) | Use user JWT for writes, explicit event_id validation, shared service layer |
| Phase 2: Offline Check-In | Duplicate participants (Pitfall 2), Unbounded queue (Pitfall 7), Rate limit contention (Pitfall 15), Stale cache (Pitfall 11) | Conflict resolution, queue limits, shared rate limiter, cache freshness UI |
| Phase 3: Networking Engine | Privacy violation (Pitfall 4), Socially awkward tables (Pitfall 9) | Track visibility flags, diversity constraints, connector seating |
| Phase 4: Day Simulation | Impossible room assignment (Pitfall 5), Non-reproducible results (Pitfall 12) | Validation layer, deterministic mode, snapshot inputs |
| Phase 5: Vendor Intelligence | Currency comparison errors (Pitfall 8) | Currency normalization, exchange rate API |
| All Schema Changes | Cron jobs fire during migration (Pitfall 3), Breaking Edge Function changes (Pitfall 13) | Disable cron during deploy, backward-compatible APIs, integration tests |

---

## Red Flags (Early Warning Signs)

**Watch for these signals that a pitfall is happening:**

| Signal | Indicates | Action |
|--------|-----------|--------|
| RLS errors in Supabase logs | Pitfall 1: AI bypassing security | Audit all AI writes, add org validation |
| Duplicate participant records | Pitfall 2: Offline sync conflict | Implement conflict resolution immediately |
| Cron job failures after deploy | Pitfall 3 or 13: Breaking changes | Rollback, add migration protocol |
| Tables with all same track | Pitfall 4: Privacy design flaw | Add visibility flags, audit exports |
| Room double-booking errors | Pitfall 5: AI validation gap | Add constraint, force validation |
| Users avoid AI feature | Pitfall 6: Confirmation fatigue | Simplify approval flow, risk-based UX |
| IndexedDB >10MB | Pitfall 7: Queue growth | Clear old items, add expiration |
| Wrong vendor selected | Pitfall 8: Currency math error | Normalize currencies, show rates |
| Low networking NPS score | Pitfall 9: Algorithm misses social factors | Add diversity constraints, survey |
| "AI added to wrong event" tickets | Pitfall 10: Context management bug | Fix event_id scoping |
| "Not on list" at check-in | Pitfall 11: Stale cache | Show cache age, auto-refresh |
| "Results change every time" | Pitfall 12: Non-deterministic sim | Use temperature=0, seed inputs |
| 429 errors during sync | Pitfall 15: Rate limit hit | Batch writes, respect throttle |

---

## Testing Requirements Per Pitfall

**To prevent these pitfalls, add these tests:**

1. **Multi-tenant isolation test**: User from Org A attempts AI write to Org B event → RLS error
2. **Offline conflict test**: Two managers check in same participant offline → Sync detects conflict
3. **Schema migration test**: Run migration while cron job active → Job pauses and resumes
4. **Privacy export test**: Export table assignments → Private tracks not included
5. **Room conflict test**: AI suggests double-booked room → Validation fails
6. **Currency comparison test**: Compare quotes in USD and ILS → Normalized correctly
7. **Queue expiration test**: Queued write >24h old → Auto-deleted on sync
8. **Context switch test**: Change event mid-chat → AI detects and warns
9. **Edge Function versioning test**: Deploy new function version → Old cron callers still work
10. **Rate limit test**: Sync 200 writes → Respects 2.1s throttle, no reminder stall

---

## Sources

**Analysis based on:**
- EventFlow AI codebase review (send-reminder/index.ts v14, ai-chat.ts, CheckinPage.tsx)
- Existing RLS policies (001_complete_rls_policies.sql)
- Multi-tenant architecture with 30+ tables
- 8 active pg_cron jobs for automated reminders
- CONCERNS.md architectural issues
- INTEGRATIONS.md external dependencies
- Domain knowledge: Event management + AI agent patterns + offline-first PWA design

**Confidence levels:**
- RLS bypass, offline conflicts, cron interference: **HIGH** (observed in codebase structure)
- Privacy violations, currency errors, queue growth: **HIGH** (common domain pitfalls)
- Social dynamics, context switching: **MEDIUM** (UX design challenges)

---

*Pitfalls research complete for EventFlow AI v2.0 milestone.*
*These are specific to ADDING features to EXISTING production system — not generic warnings.*
