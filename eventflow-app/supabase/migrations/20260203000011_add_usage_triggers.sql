-- Migration 011: Add Usage Counter Triggers
-- EventFlow AI v2.1 - SaaS Tier Structure
-- Date: 2026-02-03

-- ====================================================================
-- FUNCTION: Increment Event Usage
-- ====================================================================
CREATE OR REPLACE FUNCTION increment_event_usage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE organizations
  SET current_usage = jsonb_set(
    current_usage,
    '{events_count}',
    to_jsonb(COALESCE((current_usage->>'events_count')::int, 0) + 1)
  )
  WHERE id = NEW.organization_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for event creation
DROP TRIGGER IF EXISTS on_event_created_increment_usage ON events;
CREATE TRIGGER on_event_created_increment_usage
AFTER INSERT ON events
FOR EACH ROW
EXECUTE FUNCTION increment_event_usage();

-- ====================================================================
-- FUNCTION: Increment Participant Usage
-- ====================================================================
CREATE OR REPLACE FUNCTION increment_participant_usage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE organizations
  SET current_usage = jsonb_set(
    current_usage,
    '{participants_count}',
    to_jsonb(COALESCE((current_usage->>'participants_count')::int, 0) + 1)
  )
  WHERE id = (
    SELECT e.organization_id
    FROM events e
    WHERE e.id = NEW.event_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for participant creation
DROP TRIGGER IF EXISTS on_participant_created_increment_usage ON participants;
CREATE TRIGGER on_participant_created_increment_usage
AFTER INSERT ON participants
FOR EACH ROW
EXECUTE FUNCTION increment_participant_usage();

-- ====================================================================
-- FUNCTION: Increment Message Usage
-- ====================================================================
CREATE OR REPLACE FUNCTION increment_message_usage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE organizations
  SET current_usage = jsonb_set(
    current_usage,
    '{messages_sent}',
    to_jsonb(COALESCE((current_usage->>'messages_sent')::int, 0) + 1)
  )
  WHERE id = (
    SELECT m.organization_id
    FROM messages m
    WHERE m.id = NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for message sending
DROP TRIGGER IF EXISTS on_message_sent_increment_usage ON messages;
CREATE TRIGGER on_message_sent_increment_usage
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION increment_message_usage();

-- ====================================================================
-- FUNCTION: Increment AI Message Usage
-- ====================================================================
CREATE OR REPLACE FUNCTION increment_ai_message_usage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE organizations
  SET current_usage = jsonb_set(
    current_usage,
    '{ai_messages_sent}',
    to_jsonb(COALESCE((current_usage->>'ai_messages_sent')::int, 0) + 1)
  )
  WHERE id = (
    SELECT acs.organization_id
    FROM ai_chat_sessions acs
    WHERE acs.id = NEW.session_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for AI message sending
DROP TRIGGER IF EXISTS on_ai_message_sent_increment_usage ON ai_chat_messages;
CREATE TRIGGER on_ai_message_sent_increment_usage
AFTER INSERT ON ai_chat_messages
FOR EACH ROW
EXECUTE FUNCTION increment_ai_message_usage();

-- ====================================================================
-- COMMENTS
-- ====================================================================
COMMENT ON FUNCTION increment_event_usage() IS 'Auto-increment events_count in organizations.current_usage when event is created';

COMMENT ON FUNCTION increment_participant_usage() IS 'Auto-increment participants_count in organizations.current_usage when participant is added';

COMMENT ON FUNCTION increment_message_usage() IS 'Auto-increment messages_sent in organizations.current_usage when message is sent';

COMMENT ON FUNCTION increment_ai_message_usage() IS 'Auto-increment ai_messages_sent in organizations.current_usage when AI message is sent';
