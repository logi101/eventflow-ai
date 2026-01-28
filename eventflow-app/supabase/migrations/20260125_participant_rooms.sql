-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: Participant Room Assignments
-- Description: Add table for assigning individual rooms to participants
-- Date: 2026-01-25
-- ═══════════════════════════════════════════════════════════════════════════

-- Participant Room Assignments Table
-- Allows assigning specific rooms to participants for conferences/events
CREATE TABLE IF NOT EXISTS participant_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  room_number VARCHAR(50) NOT NULL,
  building VARCHAR(100),
  floor VARCHAR(20),
  room_type VARCHAR(50) DEFAULT 'standard', -- standard, suite, accessible, vip
  check_in_date DATE,
  check_out_date DATE,
  bed_configuration VARCHAR(50), -- single, double, twin, king
  special_requests TEXT,
  notes TEXT,
  is_confirmed BOOLEAN DEFAULT false,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique room assignment per participant per event
  UNIQUE(participant_id, event_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_participant_rooms_event ON participant_rooms(event_id);
CREATE INDEX IF NOT EXISTS idx_participant_rooms_participant ON participant_rooms(participant_id);
CREATE INDEX IF NOT EXISTS idx_participant_rooms_room ON participant_rooms(room_number, building);

-- Enable RLS
ALTER TABLE participant_rooms ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view rooms for their organization's events
CREATE POLICY "Users can view participant rooms for their events"
  ON participant_rooms FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events e
      JOIN user_profiles up ON up.organization_id = e.organization_id
      WHERE e.id = participant_rooms.event_id
      AND up.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can manage rooms for their organization's events
CREATE POLICY "Users can manage participant rooms for their events"
  ON participant_rooms FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM events e
      JOIN user_profiles up ON up.organization_id = e.organization_id
      WHERE e.id = participant_rooms.event_id
      AND up.user_id = auth.uid()
    )
  );

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_participant_rooms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_participant_rooms_updated_at
  BEFORE UPDATE ON participant_rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_participant_rooms_updated_at();

-- Function to get participant's room assignment with full details
CREATE OR REPLACE FUNCTION get_participant_room(p_participant_id UUID)
RETURNS TABLE (
  room_number VARCHAR(50),
  building VARCHAR(100),
  floor VARCHAR(20),
  room_type VARCHAR(50),
  check_in_date DATE,
  check_out_date DATE,
  bed_configuration VARCHAR(50),
  special_requests TEXT,
  is_confirmed BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pr.room_number,
    pr.building,
    pr.floor,
    pr.room_type,
    pr.check_in_date,
    pr.check_out_date,
    pr.bed_configuration,
    pr.special_requests,
    pr.is_confirmed
  FROM participant_rooms pr
  WHERE pr.participant_id = p_participant_id
  ORDER BY pr.check_in_date DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate room assignment message for WhatsApp
CREATE OR REPLACE FUNCTION generate_room_message(p_participant_id UUID, p_language VARCHAR DEFAULT 'he')
RETURNS TEXT AS $$
DECLARE
  v_participant RECORD;
  v_room RECORD;
  v_message TEXT;
BEGIN
  -- Get participant info
  SELECT first_name, last_name INTO v_participant
  FROM participants WHERE id = p_participant_id;

  -- Get room info
  SELECT * INTO v_room
  FROM participant_rooms WHERE participant_id = p_participant_id
  ORDER BY check_in_date DESC LIMIT 1;

  IF v_room IS NULL THEN
    RETURN NULL;
  END IF;

  -- Generate message in Hebrew
  IF p_language = 'he' THEN
    v_message := format(
      E'🏨 פרטי החדר שלך:\n\n' ||
      '👤 שם: %s %s\n' ||
      '🚪 חדר: %s\n' ||
      '🏢 בניין: %s\n' ||
      '📍 קומה: %s\n' ||
      '🛏️ סוג חדר: %s\n' ||
      '📅 צ׳ק-אין: %s\n' ||
      '📅 צ׳ק-אאוט: %s',
      v_participant.first_name,
      v_participant.last_name,
      v_room.room_number,
      COALESCE(v_room.building, '-'),
      COALESCE(v_room.floor, '-'),
      COALESCE(v_room.room_type, 'standard'),
      COALESCE(v_room.check_in_date::TEXT, '-'),
      COALESCE(v_room.check_out_date::TEXT, '-')
    );
  ELSE
    -- English version
    v_message := format(
      E'🏨 Your Room Details:\n\n' ||
      '👤 Name: %s %s\n' ||
      '🚪 Room: %s\n' ||
      '🏢 Building: %s\n' ||
      '📍 Floor: %s\n' ||
      '🛏️ Room Type: %s\n' ||
      '📅 Check-in: %s\n' ||
      '📅 Check-out: %s',
      v_participant.first_name,
      v_participant.last_name,
      v_room.room_number,
      COALESCE(v_room.building, '-'),
      COALESCE(v_room.floor, '-'),
      COALESCE(v_room.room_type, 'standard'),
      COALESCE(v_room.check_in_date::TEXT, '-'),
      COALESCE(v_room.check_out_date::TEXT, '-')
    );
  END IF;

  RETURN v_message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE participant_rooms IS 'Room assignments for participants at events/conferences';
COMMENT ON FUNCTION get_participant_room IS 'Get room assignment details for a participant';
COMMENT ON FUNCTION generate_room_message IS 'Generate WhatsApp message with room details';
