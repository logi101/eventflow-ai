-- ══════════════════════════════════════════════════════════════════════════════
-- Migration: Seating Assignment Message
-- Description: Updated function to generate WhatsApp messages with table and seat info
-- Date: 2026-02-05
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION generate_seating_message(p_participant_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_participant RECORD;
  v_assignment RECORD;
  v_message TEXT;
BEGIN
  -- Get participant info
  SELECT first_name, last_name INTO v_participant
  FROM participants WHERE id = p_participant_id;

  -- Get table assignment
  SELECT table_number, seat_number INTO v_assignment
  FROM table_assignments WHERE participant_id = p_participant_id
  LIMIT 1;

  IF v_assignment IS NULL THEN
    RETURN NULL;
  END IF;

  -- Generate privacy-aware message (Only location, no neighbors)
  v_message := format(
    E'שלום %s! 👋

' ||
    'שמחים שהגעת! מקום הישיבה שלך מוכן:
' ||
    '🍽️ שולחן: %s
' ||
    '🪑 כיסא: %s

' ||
    'נתראה באולם! ✨',
    v_participant.first_name,
    v_assignment.table_number,
    COALESCE(v_assignment.seat_number::TEXT, 'לפי בחירה בשולחן')
  );

  RETURN v_message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION generate_seating_message IS 'Generates a privacy-aware WhatsApp message with seating assignment details.';
