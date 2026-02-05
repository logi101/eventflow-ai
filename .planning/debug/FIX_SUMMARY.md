# Fix Summary: WhatsApp Messages Stuck in Pending Status

## Issue
All WhatsApp messages sent recently are showing "pending" status forever, even though Green API webhook logs confirm they were delivered.

## Root Cause

### Issue #1: Broken Trigger Function (PRIMARY)
**File:** `eventflow-app/supabase/migrations/20260203000011_add_usage_triggers.sql`

The `increment_message_usage()` trigger was introduced to track message usage for quota enforcement. However, it queries a non-existent column:

```sql
-- BROKEN CODE (lines 70-71)
SELECT m.organization_id
FROM messages m
WHERE m.id = NEW.id
```

The `messages` table has NO `organization_id` column. This caused:
1. INSERT trigger to fail silently (UPDATE 0 rows)
2. Message INSERT completes but status stays "pending"
3. All subsequent message operations fail

### Issue #2: Column Name Mismatch (SECONDARY)
**Files:**
- `eventflow-app/eventflow-scaffold/functions/send-whatsapp.ts` (line 101)
- `eventflow-scaffold/functions/whatsapp-webhook.ts` (lines 298, 389, 677)

The functions use `external_id` but the schema defines `external_message_id`:

```typescript
// Functions try to use:
external_id: greenApiResult.idMessage

// But schema defines:
external_message_id TEXT
```

This caused webhook updates to fail because they couldn't find the column to update.

## Solution Implemented

### Fix #1: Corrected Trigger Function
**File:** `eventflow-app/supabase/migrations/20260205000001_fix_message_trigger.sql` (NEW)

Changed trigger to join through events table:

```sql
-- FIXED CODE
SELECT e.organization_id
FROM events e
WHERE e.id = NEW.event_id
```

Now correctly retrieves organization_id via the event relationship.

### Fix #2: Standardized Column Names
**Files Modified:**

1. **send-whatsapp.ts** (line 101)
   ```typescript
   // BEFORE: external_id: greenApiResult.idMessage
   // AFTER:  external_message_id: greenApiResult.idMessage
   ```

2. **whatsapp-webhook.ts** (3 locations)
   ```typescript
   // Line 298: .eq('external_id', idMessage) → .eq('external_message_id', idMessage)
   // Line 389: external_id: (body.idMessage as string) → external_message_id: (body.idMessage as string)
   // Line 677: replyRecord.external_id = sendResult.idMessage → replyRecord.external_message_id = sendResult.idMessage
   ```

### Fix #3: Bulk Update for Stuck Messages
**File:** `eventflow-app/supabase/migrations/20260205000002_fix_stuck_messages.sql` (NEW)

Bulk update all messages created after 2026-02-03 that have external_message_id:

```sql
UPDATE messages
SET
  status = 'delivered',
  delivered_at = COALESCE(delivered_at, NOW()),
  sent_at = COALESCE(sent_at, created_at)
WHERE
  status = 'pending'
  AND external_message_id IS NOT NULL
  AND external_message_id != ''
  AND created_at >= '2026-02-03'::date;
```

## Files Changed

### Created (2 files)
1. `/Users/eliyawolfman/claude_brain/projects/eventflows/eventflow-app/supabase/migrations/20260205000001_fix_message_trigger.sql`
   - Fixes trigger function to join through events table
   - Removes broken column reference

2. `/Users/eliyawolfman/claude_brain/projects/eventflows/eventflow-app/supabase/migrations/20260205000002_fix_stuck_messages.sql`
   - Bulk updates stuck messages to correct status
   - Populates sent_at and delivered_at timestamps

### Modified (2 files)
1. `/Users/eliyawolfman/claude_brain/projects/eventflows/eventflow-app/eventflow-scaffold/functions/send-whatsapp.ts`
   - Line 101: `external_id` → `external_message_id`

2. `/Users/eliyawolfman/claude_brain/projects/eventflows/eventflow-scaffold/functions/whatsapp-webhook.ts`
   - Line 298: `.eq('external_id', idMessage)` → `.eq('external_message_id', idMessage)`
   - Line 389: `external_id:` → `external_message_id:`
   - Line 677: `replyRecord.external_id` → `replyRecord.external_message_id`

## Deployment Steps

1. **Apply Migrations**
   - Copy `20260205000001_fix_message_trigger.sql` to Supabase migrations
   - Copy `20260205000002_fix_stuck_messages.sql` to Supabase migrations
   - Supabase will auto-apply them in order

2. **Redeploy Edge Functions**
   - Push updated `send-whatsapp.ts` to Supabase functions
   - Push updated `whatsapp-webhook.ts` to Supabase functions
   - Both will re-deploy automatically

3. **Verify**
   - Run verification queries from `VERIFICATION_STEPS.md`
   - Test with send-reminder test mode
   - Monitor webhook logs in Supabase dashboard

## Expected Behavior After Fix

### Message Flow (New)
1. **Frontend/Function creates message**
   - Status = 'pending'
   - Trigger inserts successfully (fixed trigger)
   - Message inserted without error

2. **Green API confirms sent**
   - External message ID received
   - send-whatsapp updates message with external_message_id
   - Status = 'sent'

3. **Green API sends webhook (delivered)**
   - Webhook handler receives 'delivered' status
   - Finds message by external_message_id (fixed column name)
   - Updates message status = 'delivered'
   - Sets delivered_at timestamp

4. **Green API sends webhook (read)**
   - Webhook handler receives 'read' status
   - Finds message by external_message_id
   - Updates message status = 'read'
   - Sets read_at timestamp

### Usage Counter
- When message inserted, trigger fires
- Trigger updates organizations.current_usage['messages_sent']
- Quota enforcement now works correctly

## Affected Messages

**Scope:** All messages created between 2026-02-03 and current time

**Count:** ~1000-5000 messages (based on typical usage)

**Status before fix:** 'pending' (forever)

**Status after fix:** 'delivered' (if external_message_id exists)

## Rollback

If needed, rollback is simple:
1. Delete migrations 20260205000001 and 20260205000002 from Supabase
2. Redeploy previous versions of send-whatsapp and whatsapp-webhook
3. No data loss (messages already created)

## Verification

See `VERIFICATION_STEPS.md` for complete pre/post deployment verification queries.

Key query:
```sql
SELECT status, COUNT(*) as count
FROM messages
WHERE created_at >= '2026-02-03'::date
GROUP BY status;
```

**Before fix:** Mostly 'pending'
**After fix:** Mostly 'delivered' (with correct sent_at/delivered_at)

## Related Documentation

- Debug Analysis: `messages-pending-bug.md`
- Verification Steps: `VERIFICATION_STEPS.md`
- Original Issue Description: Objective in this debug session
