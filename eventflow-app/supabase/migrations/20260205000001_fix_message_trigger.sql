-- Fix: Message trigger function was trying to access non-existent organization_id column on messages table
-- Root cause: messages table has event_id, but organization_id is in events table
-- This caused UPDATE to silently fail (UPDATE 0 rows), leaving messages stuck in 'pending' status

-- Drop the broken trigger and function
DROP TRIGGER IF EXISTS trigger_log_message_usage ON messages;
DROP FUNCTION IF EXISTS increment_message_usage();

-- Create corrected trigger function
CREATE OR REPLACE FUNCTION increment_message_usage()
RETURNS TRIGGER AS $$
DECLARE
    v_organization_id UUID;
    v_message_type TEXT;
BEGIN
    -- Get organization_id from the related event
    SELECT events.organization_id INTO v_organization_id
    FROM events
    WHERE events.id = NEW.event_id;

    -- Return early if event not found
    IF v_organization_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Determine message type for quota tracking
    v_message_type := COALESCE(NEW.type, 'whatsapp');

    -- Log this message usage for quota tracking
    INSERT INTO usage_logs (organization_id, user_id, message_count, ai_message_count, created_at)
    VALUES (
        v_organization_id,
        NULL,
        CASE WHEN v_message_type IN ('whatsapp', 'sms', 'email') THEN 1 ELSE 0 END,
        CASE WHEN v_message_type = 'ai_chat' THEN 1 ELSE 0 END,
        NOW()
    )
    ON CONFLICT (organization_id, created_at::DATE) DO UPDATE
    SET
        message_count = usage_logs.message_count + EXCLUDED.message_count,
        ai_message_count = usage_logs.ai_message_count + EXCLUDED.ai_message_count,
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER trigger_log_message_usage
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION increment_message_usage();
