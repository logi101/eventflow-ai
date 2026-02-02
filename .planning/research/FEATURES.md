# Feature Landscape: Intelligent Event Production & Networking

**Domain:** Event Management — Luxury/Complex Events (100-500+ attendees)
**Researched:** 2026-02-02
**Context:** Subsequent milestone adding intelligent automation to existing event management app

## Executive Summary

This research examines how intelligent production features (AI assistants with DB access, simulation, networking optimization, vendor intelligence, offline capabilities) typically work in modern event management systems.

**Key Finding:** These features follow a "suggest + confirm" pattern where AI/automation provides recommendations but humans retain final decision authority — especially critical for high-stakes luxury events.

**Confidence Level:** MEDIUM — Based on training data knowledge (Jan 2025) of event management patterns, SaaS architectures, and offline-first systems. Could not verify with 2026 sources due to tool restrictions.

---

## Table Stakes

Features that attendees/managers expect when "intelligent event production" is promised. Missing = product feels incomplete or misleading.

| Feature | Why Expected | Complexity | Dependencies |
|---------|--------------|------------|--------------|
| **AI suggestions with human approval** | Industry standard post-2023; no autonomous writes | Medium | Existing AI chat, DB permissions model |
| **Real-time conflict detection** | Schedulers expect auto-validation (double-booking, capacity) | Low-Medium | Existing schedules table |
| **Basic offline check-in** | Venues often have poor connectivity; check-in is time-critical | Medium | Service Worker, local IndexedDB |
| **Networking opt-in/out** | Privacy expectations; not all attendees want matchmaking | Low | participants.networking_opt_in flag |
| **VIP priority handling** | Luxury events require special attention; must be explicit | Low | Existing is_vip flag |
| **Manual override capability** | AI recommendations MUST be overridable by manager | Low | Permission checks, UI toggles |
| **Audit trail for AI actions** | Managers need to see what AI suggested/changed | Medium | ai_actions_log table |
| **Preview before send** | Any auto-generated message must show preview first | Low | Existing template preview pattern |

**Notes:**
- These are hygiene factors — users will complain loudly if missing
- The "suggest + confirm" pattern is NON-NEGOTIABLE for event management (high stakes, reputation risk)
- Privacy controls (opt-in/out) are legally required in many jurisdictions (GDPR, CCPA)

---

## Differentiators

Features that set the product apart. Not expected, but highly valued when present.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Day simulation / stress testing** | Proactive issue detection before event day | High | Unique in market; requires multi-scenario modeling |
| **Contextual networking (interests + proximity)** | Goes beyond basic table assignment → meaningful connections | High | Algorithm design, preference weighting |
| **Vendor intelligence (quote analysis)** | Budget optimization with AI insights | Medium | Requires structured quote data |
| **Automatic contingency activation** | Backup speaker auto-notify on cancellation | Medium | Dependent on real-time status tracking |
| **Smart room assignment** | Auto-assign based on preferences + accessibility | Medium | Existing participant_rooms table |
| **Manager-controlled AI write access** | Enable/disable AI DB writes per action type | Medium | Fine-grained permission system |
| **Offline-first check-in with sync** | Not just offline-capable, but sync-on-reconnect | High | Service Worker + conflict resolution |
| **Progressive disclosure for AI** | Show reasoning behind suggestions, not just results | Medium | Improves trust and adoption |

**Key Differentiator Strategy:**
- **Day simulation** is the biggest differentiator — competitors don't offer proactive stress testing
- **Contextual networking** (not just seating) creates memorable participant experiences
- **Manager-controlled AI** respects power users while enabling automation

---

## Anti-Features

Features to explicitly NOT build. Common mistakes in this domain.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Fully autonomous AI agent** | Too risky for high-stakes events; manager loses control | Suggest + confirm pattern with preview |
| **Public self-service track selection** | Creates chaos, reduces networking quality | Manager assigns tracks based on participant data |
| **Real-time budget sync with accounting systems** | Scope creep; every org uses different software | Export to Excel, manual import to QuickBooks/etc |
| **Multi-event dashboard for attendees** | Feature bloat; attendees care about ONE event at a time | Event-scoped views only |
| **Gamification (leaderboards, badges)** | Wrong fit for luxury/professional events | Focus on meaningful networking, not game mechanics |
| **Social media auto-posting** | Brand risk; requires approval workflows | Manual sharing with suggested copy |
| **Video conferencing integration** | Out of scope; Zoom/Teams do this well | Embed meeting links, don't reinvent |
| **Full offline mode (all features)** | Expensive to build; only check-in is truly critical | Offline check-in only; rest requires connection |

**Key Insight:** EventFlow is an event PRODUCTION system for managers, not a social network for attendees. Avoid feature creep that serves attendees at the expense of manager workflow efficiency.

---

## Feature Dependencies

How new features connect to existing architecture:

```
EXISTING FOUNDATION:
├── AI Chat (read-only Gemini)
│   ├── [NEW] Add DB write capability with confirmation
│   ├── [NEW] Add action history log
│   └── [NEW] Add rollback capability
│
├── Schedules (schedules + participant_schedules)
│   ├── [NEW] Real-time conflict detection
│   ├── [NEW] Capacity warnings
│   └── [NEW] Contingency plan activation
│
├── Participants (with companions, rooms, VIP flags)
│   ├── [NEW] networking_opt_in BOOLEAN
│   ├── [NEW] interests JSONB
│   └── [NEW] table_assignments table
│
├── Vendors (with quotes)
│   ├── [NEW] AI quote analysis
│   ├── [NEW] Budget alerts
│   └── [NEW] Vendor assignment to checklist items
│
├── Check-in (QR, manual entry)
│   ├── [NEW] Service Worker for offline
│   ├── [NEW] Local IndexedDB cache
│   └── [NEW] Sync queue on reconnect
│
└── WhatsApp Messaging (8 reminder types)
    ├── [NEW] Dynamic variables (room_number, table_number)
    └── [NEW] Contingency templates
```

**Critical Path:**
1. AI write access → enables automation features
2. Table assignments table → enables networking engine
3. Service Worker → enables offline check-in
4. AI insights log → enables simulation

---

## Interaction Patterns

How users typically interact with intelligent features:

### Pattern 1: AI Suggest + Confirm

**Flow:**
1. AI analyzes data → generates suggestion
2. Shows preview with reasoning ("מה השתנה?")
3. User reviews → approves/rejects/modifies
4. System executes → logs action
5. Rollback option available (5-10 min window)

**Example:**
```
AI: "זיהיתי התנגשות בלוח הזמנים — הצעתי פתרון"
    Preview: [Shows proposed schedule changes]
    Reasoning: "אולם A מלא בשעה 14:00, העברתי את הסדנה לאולם B"
Manager: [Approve] / [Reject] / [Modify]
```

**Why this works:** Manager stays in control, AI reduces cognitive load

---

### Pattern 2: Simulation / Stress Testing

**Flow:**
1. Manager triggers simulation (button or chat command)
2. AI runs scenarios (vendor no-show, room capacity, schedule conflicts)
3. Generates report with risk scores + mitigation suggestions
4. Manager reviews → takes preventive action
5. Re-run simulation after fixes

**Example:**
```
Manager: "/simulate event-day"
AI: "מריץ סימולציה... 45 תרחישים"
    [30s later]
    "נמצאו 3 בעיות בעדיפות גבוהה:"
    1. אולם A: צפוף ב-15% (אישרת 120 אורחים, תפוסה מקסימלית 100)
    2. ספק קייטרינג: לא אישר הגעה (deadline: מחר)
    3. מרצה ראשי: טיסה נוחתת 2 שעות לפני האירוע (סיכון גבוה לאיחור)
    [Suggested fixes]
```

**Why this works:** Proactive issue detection reduces day-of-event panic

---

### Pattern 3: Networking Engine

**Flow:**
1. Manager enables networking for event
2. Participants fill profile (interests, bio) — optional, opt-in
3. Algorithm assigns tables/seating based on shared interests + diversity
4. Manager reviews assignments → can manually override
5. Participants notified of table/room assignments

**Example Algorithm:**
- **Input:** participants with interests, company, role, opt-in status
- **Constraints:** Table capacity, dietary restrictions, accessibility
- **Optimization:** Maximize shared interests, minimize same-company clustering
- **Output:** table_assignments with reasoning

**Why this works:** Creates serendipitous connections, increases event value

---

### Pattern 4: Vendor Intelligence

**Flow:**
1. Vendor submits quote (manual entry or upload)
2. AI analyzes quote vs budget + historical data
3. Flags anomalies (price spike, missing items, over-budget)
4. Suggests negotiation points or alternatives
5. Manager reviews → takes action

**Example:**
```
AI: "קיבלת הצעת מחיר מספק פרחים: ₪12,500"
    Alert: "20% מעל התקציב המוקצה (₪10,000)"
    Insight: "במאורעות דומים שילמת ממוצע ₪9,200"
    Suggestion: "נסה לנהל מחדש או חפש ספק חלופי"
```

**Why this works:** Saves money, prevents budget surprises

---

### Pattern 5: Offline Check-in

**Flow:**
1. Check-in device loads event data (participants, rooms, VIP status)
2. Goes offline (poor venue WiFi)
3. Staff scans QR or enters name → check-in succeeds locally
4. Device reconnects → syncs check-ins to server
5. Conflict resolution (same person checked in twice on different devices)

**Technical Details:**
- **Service Worker** intercepts API calls, serves from IndexedDB if offline
- **Sync queue** retries failed requests on reconnect
- **Conflict strategy:** Last-write-wins (check-in timestamp as tiebreaker)

**Why this works:** Check-in is time-critical; can't fail due to venue WiFi issues

---

## MVP Recommendations

For v2.0 milestone, prioritize features with highest impact/effort ratio:

### Must Have (MVP Core)
1. **AI write access with suggest+confirm** — enables all automation features
2. **Conflict detection** — prevents scheduling disasters
3. **Networking opt-in flag** — privacy requirement
4. **VIP priority handling** — table stakes for luxury events
5. **Preview before send** — prevents message mistakes

### Should Have (High Value)
6. **Day simulation** — biggest differentiator, justifies premium pricing
7. **Smart table assignment** — improves participant experience
8. **Offline check-in** — solves real pain point

### Could Have (Lower Priority)
9. **Vendor intelligence** — nice-to-have, not critical path
10. **Automatic contingency** — requires more infrastructure
11. **Advanced networking algorithm** — can start with simple version

### Defer to Post-MVP
- Multi-event dashboard for attendees (out of scope)
- Full offline mode (too expensive; check-in only for now)
- Social media integration (brand risk, needs approval workflow)

---

## Technical Complexity Assessment

| Feature | Frontend | Backend | Algorithm | Infrastructure | Overall |
|---------|----------|---------|-----------|----------------|---------|
| AI write access | Medium | Medium | Low | Low | Medium |
| Day simulation | Low | Medium | High | Low | High |
| Networking engine | Low | Medium | High | Low | High |
| Vendor intelligence | Medium | Low | Medium | Low | Medium |
| Offline check-in | High | Medium | Low | Medium | High |
| VIP handling | Low | Low | Low | Low | Low |
| Conflict detection | Medium | Medium | Medium | Low | Medium |

**Complexity Drivers:**
- **Algorithm design** (simulation, networking) requires domain expertise
- **Offline-first** requires Service Worker + sync queue + conflict resolution
- **AI write access** requires careful permission model + audit trail

---

## Dependencies on Existing Features

| New Feature | Depends On | Status | Notes |
|-------------|-----------|--------|-------|
| AI write access | ai-chat Edge Function | ✅ Exists | Add DB write permissions |
| Day simulation | events, schedules, participants, vendors | ✅ Exists | All data available |
| Networking engine | participants, table_assignments | ⚠️ Partial | Need table_assignments table |
| Vendor intelligence | vendors, event_vendors (quotes) | ✅ Exists | Quote data in JSONB |
| Offline check-in | checkin/CheckinPage.tsx | ✅ Exists | Add Service Worker |
| VIP handling | participants.is_vip | ✅ Exists | Add UI priority indicators |
| Conflict detection | schedules, participant_schedules | ✅ Exists | Add validation logic |

**Key Insight:** Most dependencies exist — v2.0 is mostly additive (new tables, new logic), not architectural changes.

---

## Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| Suggest+Confirm Pattern | HIGH | Industry standard post-2023; documented in Gemini function calling |
| Offline Check-in | HIGH | Service Worker + IndexedDB is well-established pattern |
| Networking Algorithms | MEDIUM | Standard graph optimization; specific weights need validation |
| Day Simulation | LOW | Novel feature; implementation approach needs research |
| Vendor Intelligence | MEDIUM | Quote analysis is common; specific insights need domain knowledge |

---

## Open Questions for Planner

1. **Day simulation scope:** How many scenarios to test? (room capacity, vendor no-show, schedule conflicts, weather, traffic) — affects complexity significantly

2. **Networking algorithm weights:** How to balance shared interests vs diversity vs dietary restrictions vs accessibility? — needs user research or A/B testing

3. **Offline sync conflicts:** What if two devices check in the same person at different times? Last-write-wins or manual resolution? — affects UX

4. **AI write permissions:** Which actions require confirmation, which are auto-approved? (e.g., schedule conflict resolution = confirm; reminder send time adjustment = auto) — affects trust and adoption

5. **VIP vs standard priorities:** How much priority do VIPs get? (first in queue, better seating, more reminders) — affects implementation

---

## Sources

### Primary (HIGH confidence)
- EventFlow AI existing codebase (schema.sql, chat types, chatService.ts)
- Supabase documentation (Service Workers, Edge Functions, RLS)
- Gemini API function calling patterns

### Secondary (MEDIUM confidence)
- Training data on event management systems (Eventbrite, Bizzabo, Cvent patterns)
- Offline-first PWA patterns (Jake Archibald's work, Google I/O examples)
- Graph algorithms for matching/optimization (stable marriage problem, Hungarian algorithm)

### Tertiary (LOW confidence)
- Specific 2026 event management trends (could not verify with WebSearch)
- Exact competitor feature sets (would need market research)
- Legal requirements for AI decision-making in EU/Israel (would need legal review)

---

## Metadata

**Research date:** 2026-02-02
**Confidence:** MEDIUM — Based on training data (Jan 2025) and existing codebase analysis. Could not verify 2026-specific trends due to tool restrictions.
**Valid until:** 2026-03-15 (event management domain is relatively stable; 6-week validity)

**Limitations:**
- No 2026 competitor analysis (WebSearch unavailable)
- No user research data (would need surveys/interviews)
- No A/B testing data (would need production deployment)

**Recommendation:** These features are low-risk additions to existing architecture. Suggest + confirm pattern mitigates AI risk. Start with MVP core (AI write access + conflict detection + networking opt-in) to validate approach before building complex features (simulation, advanced networking).
