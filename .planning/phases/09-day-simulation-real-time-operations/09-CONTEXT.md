# Phase 9: Day Simulation & Real-Time Operations - Context

**Gathered:** 2026-02-03
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers two capabilities:
1. **Pre-event simulation** — Run comprehensive day simulation to detect issues before they happen (room conflicts, speaker overlaps, capacity, timing, equipment, VIP conflicts, catering gaps)
2. **Real-time contingency** — Activate backup speakers or adjust schedules when issues arise during the event, with immediate participant notification

</domain>

<decisions>
## Implementation Decisions

### Simulation Trigger & Scope
- Trigger via dedicated button on event detail page (not AI chat)
- Full day simulation by default, with optional filtering of results by time
- Manual only — no automatic pre-event runs
- Comprehensive detection: room conflicts, speaker overlaps, capacity exceeded, short transitions, back-to-back sessions for same speaker, missing equipment assignments, VIP schedule conflicts, catering gaps

### Issue Reporting & Severity
- Three severity levels: Critical / Warning / Info
- Report grouped by severity (critical issues first, then warnings, then info)
- Full context per issue: problem description + affected entities + link to schedule item + one-click fix action
- Critical issues warn strongly but allow manager to override (no hard blocking)

### Contingency Activation
- Pre-assigned backup speakers per session + ability to pick anyone ad-hoc
- AI suggests changes, manager approves (follows Phase 6 suggest+confirm pattern)
- Full audit log: who activated, when, what changed, reason for change
- Contingency changes follow existing RLS and organization isolation

### Participant Notifications
- Immediately on contingency activation (no batching)
- Simple notification content: what changed (e.g., "Session X moved to Room Y")
- Use existing WhatsApp integration via send-whatsapp Edge Function

### Claude's Discretion
- Original speaker handling when backup is activated (cancelled vs standby)
- Definition of "affected participant" scope (session attendees vs broader)
- VIP notification priority and personalization
- Simulation determinism implementation approach

</decisions>

<specifics>
## Specific Ideas

- Simulation should feel like a "pre-flight checklist" — catch everything before the event day
- One-click fix actions should be quick wins, not complex multi-step processes
- Follows Phase 6 suggest+confirm pattern for contingency changes — AI suggests, manager approves
- Audit log is important for accountability when things change during live events

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 09-day-simulation-real-time-operations*
*Context gathered: 2026-02-03*
