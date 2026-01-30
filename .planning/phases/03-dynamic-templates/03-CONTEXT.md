# Phase 3: Dynamic Template System - Context

**Gathered:** 2026-01-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire the existing `message_templates` table to the `send-reminder` Edge Function. Templates fetched from DB with variable substitution instead of hardcoded messages. All 8 reminder types already have seeded templates in the database — this phase replaces hardcoded logic with dynamic template resolution.

</domain>

<decisions>
## Implementation Decisions

### Template content & tone
- 8 templates already seeded in DB migration (`20260128000002_seed_reminder_templates.sql`) — confirmed as good
- Tone: warm & friendly, Hebrew RTL, emoji-rich, "rich card feel" (full details per message)
- Each template uses `{{variable_name}}` syntax for substitution
- Variables documented in `variables` JSONB column per template
- User originally wanted tone to vary by event type — deferred (see below)

### Template matching
- Templates matched by `message_type` enum column (one template per reminder type)
- `is_system = true` for default templates, `is_active = true` to enable
- Organization-scoped via `organization_id` column (already in schema)

### Claude's Discretion
- Variable fallback behavior (what happens when {{venue_name}} is missing)
- Template caching strategy (fetch per send vs cache per batch)
- Error handling when template not found for a type
- WhatsApp formatting details (bold, line breaks, RTL mixed content)
- How to handle the transition from hardcoded to dynamic (remove old builders vs keep as fallback)

</decisions>

<specifics>
## Specific Ideas

- Two sources currently exist: DB templates (seeded, not used yet) and hardcoded builders in send-reminder.ts
- The DB templates closely match the hardcoded versions — transition should be straightforward
- Templates include actionable keywords like "send 'schedule'" (שלח "לוז") for WhatsApp bot interaction
- Variables per template type are documented in the `variables` JSONB array column

### Key files to modify
- `send-reminder.ts` — replace hardcoded `buildDayBeforeMessage()`, `buildMorningMessage()` etc. with DB template fetch + substitution
- `20260128000002_seed_reminder_templates.sql` — already has all 8 templates seeded

</specifics>

<deferred>
## Deferred Ideas

- **Tone varies by event type** — User wants the ability to choose template tone when creating an event (corporate=professional, social=warm). This is a new capability beyond wiring existing templates. Capture for Phase 4 or backlog.
- **Per-event template overrides** — Managers customizing templates per event (beyond org-level defaults). Capture for backlog.

</deferred>

---

*Phase: 03-dynamic-templates*
*Context gathered: 2026-01-30*
