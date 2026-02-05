# Verification Steps - Messages Pending Bug Fix

## Pre-Deployment Verification

Run these queries in Supabase SQL editor BEFORE deploying the migrations to baseline the issue:

```sql
-- Check how many messages are stuck in pending
SELECT
  COUNT(*) as total_pending,
  COUNT(CASE WHEN external_message_id IS NOT NULL THEN 1 END) as pending_with_external_id,
  COUNT(CASE WHEN external_message_id IS NULL THEN 1 END) as pending_without_external_id
FROM messages
WHERE status = 'pending'
AND created_at >= '2026-02-03'::date;

-- Show sample pending messages
SELECT id, status, sent_at, external_message_id, created_at, content
FROM messages
WHERE status = 'pending'
AND created_at >= '2026-02-03'::date
ORDER BY created_at DESC
LIMIT 10;
```

Expected Result: Multiple messages with status='pending' and external_message_id populated (but status never updated to 'delivered')

---

## Post-Migration Verification

After applying migrations `20260205000001` and `20260205000002`:

### 1. Verify Trigger Function is Fixed

```sql
-- Check the trigger function definition
SELECT pg_get_functiondef(p.oid)
FROM pg_proc p
WHERE p.proname = 'increment_message_usage';

-- Should now join through events table, NOT query messages.organization_id
-- Output should contain: "SELECT e.organization_id FROM events e WHERE e.id = NEW.event_id"
```

### 2. Verify Stuck Messages Are Fixed

```sql
-- Check if messages were updated to 'delivered'
SELECT
  status,
  COUNT(*) as count
FROM messages
WHERE created_at >= '2026-02-03'::date
GROUP BY status
ORDER BY count DESC;

-- Check specific messages that should now be 'delivered'
SELECT id, status, external_message_id, sent_at, delivered_at, created_at
FROM messages
WHERE external_message_id IS NOT NULL
AND created_at >= '2026-02-03'::date
LIMIT 10;

-- Expected: Status should be 'delivered', sent_at and delivered_at should be populated
```

### 3. Verify Usage Counter Works

```sql
-- Check that organizations.current_usage is incrementing
SELECT
  id,
  name,
  tier,
  current_usage->>'messages_sent' as messages_sent,
  current_usage->>'period_start' as period_start,
  updated_at
FROM organizations
WHERE tier IN ('base', 'premium')
LIMIT 5;

-- Messages count should be incrementing correctly now
```

---

## Post-Deploy Testing

After redeploying Edge Functions (send-whatsapp, whatsapp-webhook):

### 1. Test Send-Reminder Test Mode

```bash
# Call send-reminder test mode to send a test message
curl -X POST https://[YOUR_SUPABASE_URL]/functions/v1/send-reminder \
  -H "Authorization: Bearer [SERVICE_ROLE_KEY]" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "test",
    "event_id": "[TEST_EVENT_ID]",
    "test_phone": "05XXXXXXXXX",
    "type": "activation"
  }'
```

### 2. Verify Message Flow

```sql
-- Check the new test message
SELECT id, status, external_message_id, sent_at, created_at, content
FROM messages
WHERE created_at > NOW() - INTERVAL '5 minutes'
AND status IN ('pending', 'sent', 'delivered')
ORDER BY created_at DESC
LIMIT 1;

-- Expected:
-- - Message created immediately (status='pending')
-- - After webhook receives 'sent' status: external_message_id set, status='sent'
-- - After webhook receives 'delivered' status: delivered_at set, status='delivered'
```

### 3. Monitor Webhook Logs

In Supabase Edge Functions dashboard, check send-whatsapp and whatsapp-webhook logs for:

```
[webhook-v8] Status [external_message_id] → delivered (1 rows)
[webhook-v8] Auto-reply sent to [phone]: [intent] ([external_message_id])
```

Should NOT see:
```
DB update error: column "organization_id" does not exist
unknown column "external_id"
```

---

## Rollback Plan

If issues arise after deployment:

1. **Revert migrations:**
   ```bash
   # In Supabase, delete migrations 20260205000001 and 20260205000002
   # The trigger will revert to the broken state but won't crash
   ```

2. **Revert function changes:**
   ```bash
   # Redeploy previous versions of send-whatsapp and whatsapp-webhook
   # (before column name fixes)
   ```

3. **Restore messages:**
   ```sql
   -- Reset messages back to pending if needed
   UPDATE messages
   SET status = 'pending'
   WHERE created_at >= '2026-02-05'::date
   AND status = 'delivered'
   AND external_message_id IS NOT NULL;
   ```

---

## Expected Outcomes

### Before Fix
- Messages stuck in 'pending' forever
- trigger function errors on INSERT (silent failure)
- webhook updates fail to find messages (column name mismatch)
- Usage counters not incrementing

### After Fix
- New messages transition: pending → sent → delivered → read
- Trigger function runs without errors
- Webhook updates correctly find and update messages
- Usage counters increment properly
- Stuck messages from 2026-02-03 onwards show correct status

---

## Timeline

- **Migration 20260205000001:** ~1 second (trigger function update)
- **Migration 20260205000002:** ~2-5 seconds (bulk update ~1000+ messages)
- **Function redeploy:** ~30-60 seconds (Supabase deployment)
- **Total downtime:** ~2 minutes

Messages created during migrations will be queued and will flow normally after deployment.

---

## Support

If verification shows issues:

1. Check **Edge Functions logs** in Supabase dashboard
2. Run the **Pre-Deployment Verification** queries again to compare results
3. Look for database errors in **Supabase Logs** → **Edge Functions**
4. Check that **migrations were applied** in Supabase → Migrations tab
