# Project Research Summary

**Project:** EventFlow AI v2.0 - Intelligent Production & Networking Engine
**Domain:** Event Management System (Luxury/Complex Events, 100-500+ attendees)
**Researched:** 2026-02-02
**Confidence:** HIGH

## Executive Summary

EventFlow AI v2.0 adds intelligent automation to a working event management system by extending the existing Gemini AI integration with database write capabilities, offline-first check-in, networking/seating algorithms, day simulation, and vendor intelligence. The research confirms that all features can be implemented with **zero new external services** — only 6 library additions (Dexie.js for IndexedDB, Workbox for Service Workers, optional helpers).

The recommended approach follows a "suggest + confirm" pattern where AI provides recommendations but humans retain final decision authority. This is critical for high-stakes luxury events where autonomous AI writes would violate trust and safety requirements. All changes are **additive only** — new database tables, new AI tools, new UI components — preserving the existing v1.0 production system (automated reminders, WhatsApp integration, template engine).

Key risks center on multi-tenant security (AI must respect RLS policies), offline sync conflicts (duplicate check-ins), and integration fragility (cron jobs firing during migrations). All risks have clear mitigation strategies and can be addressed through careful phase ordering: AI write foundation first (establishes security patterns), then offline capabilities (isolated failure domain), finally advanced features (networking, simulation).

## Key Findings

### Recommended Stack

**Key Finding:** All v2.0 features can be implemented with ZERO new external services — only library additions to the existing Supabase + React 19 architecture.

**Stack additions (required):**
- **Dexie.js v4.0** — IndexedDB wrapper for offline check-in queue (TypeScript-native, handles versioning cleanly)
- **Workbox v7.0** — Service Worker framework for offline capabilities (Google's official SW tooling, industry standard)
- **vite-plugin-pwa v0.19** — Vite integration for PWA + Workbox (simplifies config in Vite projects)

**Stack additions (optional):**
- **zod-to-json-schema v3.22** — Convert Zod schemas to JSON Schema for Gemini tool definitions (type-safe tool definitions from existing schemas)

**No new dependencies needed for:**
- AI write access (Gemini native function calling already integrated)
- Networking/seating algorithm (custom TypeScript, 200 lines)
- Day simulation (TypeScript logic in Edge Function, date arithmetic + SQL)
- Vendor intelligence (basic statistics, 20 lines of math)

**Why this stack works:** Gemini function calling is already integrated via ai-chat Edge Function. Existing Supabase Edge Functions support DB writes. The only missing piece is offline capability (Service Worker + IndexedDB), which requires standard PWA libraries.

### Expected Features

**Must have (table stakes):**
- AI suggestions with human approval — industry standard post-2023, no autonomous writes
- Real-time conflict detection — prevents scheduling disasters (double-booking, capacity)
- Networking opt-in/out — privacy requirement (GDPR compliance)
- VIP priority handling — table stakes for luxury events
- Manual override capability — AI recommendations must be overridable by manager
- Audit trail for AI actions — managers need to see what AI suggested/changed
- Preview before send — any auto-generated message must show preview first

**Should have (differentiators):**
- Day simulation / stress testing — biggest differentiator, proactive issue detection before event day
- Contextual networking (interests + tracks) — goes beyond basic seating, creates meaningful connections
- Vendor intelligence (quote analysis) — budget optimization with AI insights
- Offline-first check-in with sync — not just offline-capable, but sync-on-reconnect
- Manager-controlled AI write access — enable/disable AI DB writes per action type

**Defer to v2+:**
- Multi-event dashboard for attendees (out of scope, feature bloat)
- Full offline mode (too expensive, check-in only for MVP)
- Social media integration (brand risk, needs approval workflow)
- Video conferencing (Zoom/Teams do this well, just embed links)
- Real-time budget sync with accounting (scope creep, export to Excel instead)

**Anti-features (explicitly avoid):**
- Fully autonomous AI agent (too risky for high-stakes events)
- Public self-service track selection (creates chaos)
- Gamification (wrong fit for luxury/professional events)

### Architecture Approach

All v2.0 changes are **additive only** — no breaking changes to existing v1.0 functionality. The architecture extends the existing ai-chat Edge Function (7 tools, 3 already write to DB) with 11 new tools for schedule management, room assignments, networking, vendor analysis, and simulation. Two new database tables (table_assignments, ai_insights_log) and two new fields (participants.networking_opt_in, checklist_items.vendor_id) support new features without affecting existing queries.

**Major components:**
1. **AI Enhanced Tools (extend ai-chat/index.ts)** — Add 11 new tool declarations following existing pattern (create_event_draft, add_checklist_items, assign_vendors already write to DB)
2. **Offline Service (new)** — Service Worker + Dexie.js for offline check-in, IndexedDB queue syncs when connection returns
3. **Networking Engine (new)** — TypeScript algorithm for table seating based on shared interests/tracks, VIP priority, diversity constraints
4. **Simulation Engine (new)** — Timeline analysis in Edge Function, detects room conflicts, speaker overlaps, capacity issues
5. **Vendor Intelligence (new)** — Statistical analysis (mean, median, outliers) + AI insights via existing ai-chat

**Integration pattern:** All AI writes use same validation as manual edits (RLS policies, unique constraints, foreign keys). No bypass layer. AI suggestions return to frontend for confirmation, then execute via same Supabase client as human actions.

### Critical Pitfalls

1. **AI Bypasses Row-Level Security** — Service role key bypasses RLS, multi-tenant isolation breaks. **Prevention:** Use user JWT for AI writes, validate organization_id on every action, add ai_actions audit log. **Phase 1 critical.**

2. **Offline Sync Creates Duplicate Participants** — Two managers check in same person (one offline, one online), both succeed, duplicate records. **Prevention:** UPSERT with conflict check on (event_id, participant_id), deterministic timestamp resolution, sync queue processes sequentially. **Phase 2 critical.**

3. **pg_cron Jobs Fire During Schema Migration** — Automated reminder cron fires mid-migration, crashes, leaves partial messages. **Prevention:** Disable cron before migrations via pg_cron.unschedule(), re-enable after verify, add schema version check to Edge Functions. **Every phase with schema changes.**

4. **Seating Algorithm Exposes Sensitive Preferences** — Track names (e.g., "LGBTQ+ Leadership") exported to vendor, participant safety compromised. **Prevention:** Track visibility flags (is_public), export sanitization, participant opt-out mechanism, use hashed IDs for grouping. **Phase 3 critical.**

5. **AI Simulation Recommends Impossible Room Assignment** — AI suggests room already booked (time block conflict), manager approves, chaos on event day. **Prevention:** AI suggestions go through same validation as manual edits, DB constraint UNIQUE (room_id, time_block_id), show conflict warnings before approval. **Phase 4 critical.**

## Implications for Roadmap

Based on research, suggested **4-phase structure over 4 weeks**:

### Phase 1: AI Write Foundation (Week 1)
**Rationale:** Establish security patterns and confirmation flows before any advanced features. Extends existing ai-chat pattern (3 tools already write to DB), no schema changes needed.

**Delivers:** AI can manage schedules, room assignments, participant tracks via chat with human confirmation.

**Addresses Features:**
- AI suggestions with human approval (table stakes)
- Manual override capability (table stakes)
- Audit trail for AI actions (table stakes)

**Avoids Pitfalls:**
- Pitfall 1: Use user JWT, validate organization_id on every write
- Pitfall 10: Explicit event context management (URL parameter)
- Pitfall 14: AI uses same service layer as manual writes (message dedup)

**Stack:** Existing Gemini function calling, no new dependencies

**Research Flag:** LOW — Pattern established with create_event_draft, add_checklist_items tools. Standard extension.

---

### Phase 2: Database Schema + Networking Engine (Week 2)
**Rationale:** Add new tables for networking and vendor intelligence. Networking algorithm is standalone (no dependencies on other v2.0 features).

**Delivers:** Table seating based on shared interests, VIP priority, diversity constraints. Manager can review and override.

**Addresses Features:**
- Contextual networking (differentiator)
- VIP priority handling (table stakes)
- Networking opt-in/out (table stakes, privacy)

**Avoids Pitfalls:**
- Pitfall 4: Track visibility flags, export sanitization, opt-in mechanism
- Pitfall 9: Diversity constraints, connector seating, not just interest matching

**Stack:** Custom TypeScript algorithm (200 lines, no dependencies)

**Schema Changes:**
- ADD participants.networking_opt_in (DEFAULT FALSE)
- CREATE table_assignments (new)
- CREATE ai_insights_log (new)
- ADD checklist_items.vendor_id (nullable)

**Research Flag:** MEDIUM — Algorithm needs tuning with domain knowledge (interest weights, diversity metrics). Standard graph optimization but event-specific constraints.

---

### Phase 3: Offline Check-In + Vendor Intelligence (Week 3)
**Rationale:** Offline check-in is isolated from other features (separate Service Worker + IndexedDB). Vendor intelligence uses ai_insights_log table from Phase 2.

**Delivers:** Check-in works without internet, syncs when connection returns. Budget alerts when quotes exceed allocation.

**Addresses Features:**
- Offline-first check-in (differentiator)
- Vendor intelligence (differentiator)
- Preview before send (table stakes)

**Avoids Pitfalls:**
- Pitfall 2: UPSERT with conflict resolution, deterministic timestamp
- Pitfall 7: Queue size limit (100 max), expiration policy (24h)
- Pitfall 8: Currency normalization, exchange rate API
- Pitfall 11: Cache freshness UI, manual refresh button
- Pitfall 15: Shared rate limiter, batch upsert (not 200 individual calls)

**Stack:** Dexie.js, Workbox, vite-plugin-pwa (required installations)

**Research Flag:** MEDIUM — Service Worker patterns well-documented, but conflict resolution needs testing with real devices. Currency API integration adds complexity.

---

### Phase 4: Day Simulation + Polish (Week 4)
**Rationale:** Simulation is read-only analysis (no schema changes), biggest differentiator, requires Phase 1-3 features to be useful (schedules, rooms, participants).

**Delivers:** Pre-event stress test identifies room conflicts, speaker overlaps, capacity issues. AI suggests fixes.

**Addresses Features:**
- Day simulation (biggest differentiator)
- Real-time conflict detection (table stakes)

**Avoids Pitfalls:**
- Pitfall 5: Validation layer, DB constraint UNIQUE (room_id, time_block_id)
- Pitfall 12: Deterministic mode (temperature=0), snapshot inputs for reproducibility

**Stack:** TypeScript logic in Edge Function, no new dependencies

**Schema Changes:** None (read-only analysis)

**Research Flag:** LOW — Timeline analysis is date arithmetic + SQL queries. Standard validation patterns.

---

### Phase Ordering Rationale

**Why this order:**
1. **AI Write Foundation first** — Establishes security patterns (RLS validation, audit logs) and confirmation flows that all other features depend on. Avoids Pitfall 1 (multi-tenant isolation) from day 1.

2. **Networking Engine before Offline** — Networking is pure algorithm (no external dependencies), isolated failure domain. Offline check-in requires Service Worker (new infrastructure), higher risk if bugs occur.

3. **Vendor Intelligence with Offline** — Both are "nice-to-have" features, can be developed in parallel. Vendor intelligence uses ai_insights_log table created in Phase 2.

4. **Simulation last** — Requires schedules, rooms, participants to be managed by AI (Phase 1), networking engine to suggest room assignments (Phase 2). Pure read-only analysis, no schema changes, lowest risk.

**Grouping rationale:**
- **Phase 1** = Foundation (AI writes, security)
- **Phase 2** = Data model extensions (new tables, networking algorithm)
- **Phase 3** = Progressive enhancements (offline, budget alerts)
- **Phase 4** = Intelligence layer (simulation, validation)

**Pitfall avoidance:**
- Pitfall 3 (cron jobs during migration) addressed in Phase 2 deployment: Disable cron → migrate → verify → re-enable
- Pitfall 13 (breaking Edge Function changes) addressed in all phases: Backward-compatible APIs, optional params with defaults
- Pitfall 6 (confirmation fatigue) addressed in Phase 1 UX: Risk-based confirmations, batch approval

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 2 (Networking Engine)** — Algorithm tuning requires user research or A/B testing. Interest weights, diversity constraints, VIP priority levels need validation with real event managers.
- **Phase 3 (Offline Check-In)** — Service Worker background sync reliability on iOS needs real-device testing. Conflict resolution strategy (last-write-wins vs manual resolution) needs UX validation.
- **Phase 3 (Vendor Intelligence)** — Currency API integration (exchange rates) needs research. Recommended provider, rate limits, error handling.

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (AI Write Foundation)** — Pattern established with existing tools (create_event_draft, add_checklist_items). Extend existing ai-chat/index.ts. Well-documented Gemini function calling.
- **Phase 4 (Day Simulation)** — Timeline analysis is date arithmetic + SQL queries. Standard validation patterns. No complex dependencies.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All additions are well-established libraries (Dexie, Workbox) or existing integration (Gemini). No experimental dependencies. |
| Features | HIGH | Based on existing EventFlow codebase analysis (schema.sql, ai-chat.ts, send-reminder v14) + domain knowledge. Table stakes validated against CLAUDE.md requirements. |
| Architecture | HIGH | All changes additive, no breaking changes. Integration points clearly identified. Build order validated against existing codebase structure. |
| Pitfalls | HIGH | Based on codebase review (RLS policies, cron jobs, message deduplication) + domain expertise. All pitfalls have concrete prevention strategies. |

**Overall confidence:** HIGH

### Gaps to Address

**Gaps identified during research:**

1. **Gemini function calling rate limits** — Documented that Gemini 1.5 Pro supports function calling, but specific rate limits (calls/minute, concurrent functions) unclear. **How to handle:** Test with production API key during Phase 1, implement retry logic with exponential backoff.

2. **iOS Service Worker background sync support** — iOS 16.4+ supports Background Sync API, but reliability in low-battery mode and time limits for sync events unclear. **How to handle:** Test on real iOS devices at event venue with poor connectivity during Phase 3.

3. **Networking algorithm scale** — Greedy + backtracking works for <500 participants, but performance with 1,000+ participants unclear. **How to handle:** Implement greedy first, profile with production data during Phase 2, optimize if needed (move to pg function for parallelization).

4. **Currency API provider** — Need to choose currency exchange rate API (e.g., exchangerate-api.io, fixer.io). **How to handle:** Research during Phase 3 planning, evaluate rate limits, error handling, cache strategy.

5. **Simulation scenarios count** — Day simulation can test many scenarios (room capacity, vendor no-show, schedule conflicts, weather, traffic). Unclear which scenarios to prioritize. **How to handle:** User research with event managers during Phase 4 planning, start with room/schedule conflicts (highest ROI).

**No validation needed:**
- Supabase RLS enforcement (verified in existing 001_complete_rls_policies.sql)
- pg_cron reliability (8 jobs running in production for v1.0)
- Gemini API Hebrew support (verified in existing ai-chat.ts)
- WhatsApp integration (verified in send-reminder v14, Green API active)

## Sources

### Primary (HIGH confidence)
- EventFlow AI existing codebase — schema.sql (30+ tables), ai-chat/index.ts (7 tools, 3 write to DB), send-reminder/index.ts v14 (1,375 lines, 10 reminder types), CheckinPage.tsx (QR scan, manual entry)
- Supabase documentation — Edge Functions, pg_cron, RLS policies, background sync
- Gemini API documentation — Function calling patterns, tool declarations (official Google AI docs)
- Dexie.js documentation — IndexedDB wrapper patterns (official docs, widely used)
- Workbox documentation — Service Worker strategies (official Google docs)

### Secondary (MEDIUM confidence)
- Training data on event management systems (Eventbrite, Bizzabo, Cvent patterns)
- Offline-first PWA patterns (Jake Archibald's work, Google I/O examples)
- React 19 patterns — State management, hooks (official React docs)
- Graph algorithms for matching/optimization (stable marriage problem, Hungarian algorithm)

### Tertiary (LOW confidence - needs validation)
- Gemini function calling rate limits (not explicitly documented in training data, needs production testing)
- iOS Background Sync reliability (anecdotal reports, needs real-device testing)
- Algorithm performance at scale (theoretical complexity, needs profiling with real data)
- Specific 2026 event management trends (could not verify with WebSearch due to tool restrictions)

---
*Research completed: 2026-02-02*
*Ready for roadmap: yes*
*Total estimated time: 4 weeks with 1 developer*
