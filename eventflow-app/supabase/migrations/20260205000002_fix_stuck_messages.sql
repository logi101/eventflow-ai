-- Fix: Update all messages that were stuck in 'pending' status due to trigger bug
-- Root cause: Trigger function failed silently, so message status never updated to 'delivered'
-- Impact: ~1000-5000 messages sent Feb 3-5 are stuck with status='pending'

-- Update all messages created after the bug was introduced
-- They should be marked as 'delivered' since Green API webhook confirmed delivery
UPDATE messages
SET
    status = 'delivered',
    updated_at = NOW()
WHERE
    status = 'pending'
    AND created_at >= '2026-02-03'::timestamp
    AND external_message_id IS NOT NULL
    AND type IN ('whatsapp', 'sms', 'email');

-- Verify the update count in logs
DO $$
DECLARE
    v_updated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_updated_count
    FROM messages
    WHERE status = 'delivered' AND created_at >= '2026-02-03'::timestamp;
    
    RAISE NOTICE 'Fixed % messages stuck in pending status', v_updated_count;
END
$$;
