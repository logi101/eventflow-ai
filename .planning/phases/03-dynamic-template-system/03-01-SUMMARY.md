---
phase: 03-dynamic-template-system
plan: 01
status: complete
completed: 2026-01-28
---

# Summary: Seed 8 Default Reminder Templates

## What Was Built

Applied Supabase migration `seed_reminder_templates` that inserts 8 system templates into `message_templates` table — one per reminder type.

## Deliverables

| Artifact | Status |
|----------|--------|
| Migration: seed_reminder_templates | Applied via MCP |
| 8 rows in message_templates (is_system=true) | Verified |

## Task Results

### Task 1: Seed 8 default reminder templates via Supabase migration

**Status:** Complete

Applied idempotent migration with DO block guard. All 8 templates seeded:

| message_type | name | var_count |
|-------------|------|-----------|
| reminder_activation | תזכורת הפעלה | 5 |
| reminder_week_before | תזכורת שבוע לפני | 5 |
| reminder_day_before | תזכורת יום לפני | 5 |
| reminder_morning | תזכורת בוקר | 4 |
| reminder_15min | תזכורת 15 דקות | 7 |
| reminder_event_end | תזכורת סיום אירוע | 2 |
| reminder_follow_up_3mo | פולואפ 3 חודשים | 2 |
| reminder_follow_up_6mo | פולואפ 6 חודשים | 2 |

Each template:
- Has `organization_id = NULL` (system template)
- Has `is_system = true`, `is_active = true`
- Contains Hebrew content with `{{variable}}` placeholders matching send-reminder v6 hardcoded messages
- Has `variables` JSONB array listing available placeholders
- Uses `channel = 'whatsapp'`

Template content matches existing hardcoded builders exactly (same emoji patterns, same structure).

## Verification

- `SELECT count(*) FROM message_templates WHERE is_system = true` = 8
- All 8 message_type values match enum
- Each template contains `{{participant_name}}`
- Variable counts: 2-7 per template
- Migration is idempotent (DO block with NOT EXISTS guard)

## Issues

None.

## Decisions

- Used DO block idempotency guard (check for existing reminder_activation system template before inserting all 8)
- Template content matches v6 hardcoded messages exactly for seamless transition

---
*Completed: 2026-01-28*
