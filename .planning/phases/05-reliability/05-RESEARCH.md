---
phase: 05-reliability
type: research
status: complete
created: 2026-01-30
method: audit-based (no external research needed)
---

# Phase 5 Research: Reliability & Production Readiness

## Audit-Based Research

Phase 5 research was conducted via direct codebase and live database audit rather than external research. All findings are based on verified production state.

## Current State

### REL-01: Deduplication

**Application-level deduplication EXISTS** in all 8 handlers of `send-reminder.ts`. Each handler follows the pattern:

```typescript
const { data: existingMsg } = await supabase
  .from('messages')
  .select('id')
  .eq('event_id', event.id)
  .eq('participant_id', participant.id)
  .eq('message_type', 'reminder_activation')
  .maybeSingle()

if (existingMsg) continue
```

**Database-level unique constraint MISSING.** No `UNIQUE(event_id, participant_id, message_type)` constraint exists on the messages table.

**Risk:** If two cron invocations overlap (unlikely but possible under load), both could pass the SELECT check and INSERT duplicate messages.

**Live DB verification:** The `message_type` column has USER-DEFINED enum with all 17 values including `reminder_activation`, `reminder_week_before`, `reminder_event_end`, `reminder_follow_up_3mo`, `reminder_follow_up_6mo`.

### REL-02: Error Logging

**Messages table columns (live DB):**
- `error_message` TEXT - exists
- `failed_at` TIMESTAMPTZ - exists
- `status` ENUM includes `failed` - exists
- `retry_count` - DOES NOT EXIST
- `last_retry_at` - DOES NOT EXIST

**send-whatsapp.ts error handling:** When `message_id` is provided, updates messages table with `status: 'failed'` and `error_message`. This works for reminders because send-reminder passes `messageId`.

**send-reminder.ts error handling:** Checks `sendResult.success === false` and increments in-memory `results.errors` counter. Does NOT separately update the messages table (send-whatsapp handles that).

### REL-03: Retry Logic

**COMPLETELY MISSING.** No retry mechanism exists anywhere.

**message_queue table exists** with retry fields:
- `attempts` INT DEFAULT 0
- `max_attempts` INT DEFAULT 3
- `last_attempt_at` TIMESTAMPTZ
- `next_attempt_at` TIMESTAMPTZ
- `error_log` JSONB DEFAULT '[]'
- `status` message_status ENUM

**Currently 0 rows** - table is unused. It was created as schema infrastructure but never wired.

### REL-04: Rate Limiting

**send-whatsapp has rate limiting** via `_shared/rate-limiter.ts`:
- `RATE_LIMITS.WHATSAPP = { maxRequests: 30, windowMs: 60000 }`
- Rate check per `organization_id`
- Returns 429 with Retry-After header when exceeded

**send-reminder calls send-whatsapp** via `sendWhatsApp()` helper (line 983):
- Calls `/functions/v1/send-whatsapp` via fetch
- So rate limiting IS applied
- BUT: sends in tight loop, doesn't handle 429 responses
- If rate limited, just sees `{success: false}` and counts as error
- No delay/throttle/backoff between sends

## Architecture Notes

### Message Flow
```
pg_cron → trigger_reminder_job(type) → send-reminder Edge Function → sendWhatsApp() → send-whatsapp Edge Function → Green API
```

### Key Constraints
- Edge Functions have 60s wall-clock timeout (Supabase default)
- pg_net calls have 30s timeout (configured)
- Green API: no official rate limit published, but 30/min is conservative safe limit
- Messages table has 405 rows currently (37 participants across 2 events)

### What Doesn't Need Changing
- Application-level dedup in send-reminder.ts: Already working, proven in Phase 2 testing
- send-whatsapp rate limiter: Already working, database-backed
- Error logging via send-whatsapp: Already works when message_id provided
- Message type enum: All 17 values present in live DB

## Implementation Gaps (Prioritized)

### Priority 1: Database-Level Dedup Safety Net
- Add unique constraint on `(event_id, participant_id, message_type)`
- Use `ON CONFLICT DO NOTHING` or partial unique index (messages may be nullable on participant_id)
- Low risk, high value — prevents edge case duplicates

### Priority 2: Retry Infrastructure
- Add `retry_count` and `last_retry_at` columns to messages table
- Or: wire existing `message_queue` table for retry processing
- Decision needed: inline retry vs queue-based retry

### Priority 3: Rate Limit Handling in send-reminder
- Add delay between sends (e.g., 2-second gap = 30/min)
- Or: detect 429 response and implement back-off
- Must work within Edge Function timeout

### Priority 4: Retry Logic Implementation
- Exponential backoff for transient failures
- Classify errors: transient (network, rate limit) vs permanent (invalid phone)
- Cron job or queue processor for retrying failed messages

## Recommended Approach

**Simple and pragmatic** (matching user's direction to not over-engineer):

1. **Migration:** Add unique constraint + retry columns
2. **send-reminder update:** Add sleep between sends + basic retry (1 retry with delay)
3. **Skip:** Full queue-based retry system (message_queue table). Overkill for current scale (37 participants, 2 events). Can add later if needed.

This keeps changes minimal while addressing all 4 REL requirements.
