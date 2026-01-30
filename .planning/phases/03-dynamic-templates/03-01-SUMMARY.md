---
phase: 03-dynamic-templates
plan: 01
status: complete
completed: 2026-01-30
---

# 03-01 Summary: Template Engine + Wiring

## What Was Done

The deployed send-reminder Edge Function (v13) already includes the full dynamic template system. Source was synced from Supabase deployment to local repo.

## Template Engine Functions

| Function | Purpose |
|----------|---------|
| `getMessageTemplate()` | Fetches template from DB — org-specific first, then system fallback |
| `substituteVariables()` | Replaces `{{var}}` placeholders via regex with `\|\|` empty string fallback |
| `buildEventVariableMap()` | Maps event+participant data to template variables |
| `buildScheduleVariableMap()` | Maps schedule+participant data for 15_min type |

## Handlers Wired (All 8)

Each handler follows the pattern:
```
const template = await getMessageTemplate(supabase, orgId, 'reminder_TYPE')
const message = template
  ? substituteVariables(template, buildEventVariableMap(event, participant))
  : buildFallbackMessage(event, participant)
```

1. activation — `getMessageTemplate(..., 'reminder_activation')`
2. week_before — `getMessageTemplate(..., 'reminder_week_before')`
3. day_before — `getMessageTemplate(..., 'reminder_day_before')` + companion support
4. morning — `getMessageTemplate(..., 'reminder_morning')`
5. 15_min — `getMessageTemplate(..., 'reminder_15min')` with `buildScheduleVariableMap`
6. event_end — `getMessageTemplate(..., 'reminder_event_end')`
7. follow_up_3mo — `getMessageTemplate(..., 'reminder_follow_up_3mo')`
8. follow_up_6mo — `getMessageTemplate(..., 'reminder_follow_up_6mo')`

## Variable Mapping

### Event-level variables
- `participant_name` -> `participant.first_name`
- `event_name` -> `event.name`
- `event_date` -> formatted via `toLocaleDateString('he-IL')`
- `event_time` -> formatted via `toLocaleTimeString('he-IL', { timeZone: 'Asia/Jerusalem' })`
- `event_location` -> `venue_name + venue_address`

### Session-level variables (15_min only)
- `participant_name` -> `first_name + last_name`
- `session_title`, `session_location`, `session_room`
- `session_start_time`, `session_end_time`
- `session_speaker`

## Additional Features

- **Test mode**: `body.mode === 'test'` sends single test message to manager's phone using same template engine
- **Org-specific templates**: `getMessageTemplate` tries org template first, falls back to system
- **Fallback**: All 8 hardcoded builders preserved as emergency fallback

## Files Modified

- `eventflow-scaffold/functions/send-reminder.ts` — synced from deployed v13 (1011 lines)
