-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║           EventFlow AI - Program Management Enhancement                      ║
-- ║           Multi-day events, tracks, rooms, speakers, contingencies           ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

-- ════════════════════════════════════════════════════════════════════════════════
-- ENUMS
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TYPE speaker_role AS ENUM ('main', 'backup', 'moderator', 'panelist');
CREATE TYPE contingency_type AS ENUM ('speaker_no_show', 'room_unavailable', 'equipment_failure', 'overcapacity', 'weather', 'vendor_issue', 'technical', 'other');
CREATE TYPE contingency_status AS ENUM ('prepared', 'activated', 'resolved', 'not_needed');
CREATE TYPE risk_level AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE block_type AS ENUM ('session', 'break', 'meal', 'networking', 'registration', 'keynote', 'workshop', 'panel', 'other');

-- ════════════════════════════════════════════════════════════════════════════════
-- PROGRAM DAYS - Multi-day event support
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE program_days (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  date DATE NOT NULL,
  title TEXT, -- e.g., "יום פתיחה", "יום הסיום"
  description TEXT,
  start_time TIME NOT NULL DEFAULT '08:00',
  end_time TIME NOT NULL DEFAULT '18:00',
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, day_number),
  UNIQUE(event_id, date)
);

-- ════════════════════════════════════════════════════════════════════════════════
-- TRACKS - Parallel session tracks
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE tracks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., "טכנולוגיה", "עסקים", "סטארטאפים"
  name_en TEXT,
  description TEXT,
  color TEXT DEFAULT '#f97316', -- Track color for UI
  icon TEXT, -- Icon identifier
  target_audience TEXT, -- Who should attend this track
  max_participants INTEGER,
  is_premium BOOLEAN DEFAULT FALSE, -- Requires special registration
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════════════════════════
-- ROOMS - Venue room management
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., "אולם ראשי", "חדר 101"
  building TEXT, -- Building name if multi-building venue
  floor TEXT,
  capacity INTEGER NOT NULL,
  setup_type TEXT, -- 'theater', 'classroom', 'boardroom', 'banquet', 'cocktail'
  equipment JSONB DEFAULT '[]', -- ["projector", "microphone", "whiteboard", "video_conf"]
  accessibility_features JSONB DEFAULT '[]', -- ["wheelchair", "hearing_loop", "sign_language"]
  notes TEXT,
  backup_room_id UUID REFERENCES rooms(id), -- Fallback room
  contact_name TEXT, -- Room coordinator
  contact_phone TEXT,
  is_available BOOLEAN DEFAULT TRUE,
  hourly_cost DECIMAL(10,2),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════════════════════════
-- TIME BLOCKS - Structured time slots
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE time_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  program_day_id UUID NOT NULL REFERENCES program_days(id) ON DELETE CASCADE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  block_type block_type DEFAULT 'session',
  title TEXT, -- e.g., "הרשמה וקפה", "ארוחת צהריים"
  description TEXT,
  is_parallel BOOLEAN DEFAULT FALSE, -- Multiple sessions can run in this block
  is_mandatory BOOLEAN DEFAULT FALSE, -- All participants should attend
  allow_registration BOOLEAN DEFAULT TRUE, -- Can participants register for sessions?
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- ════════════════════════════════════════════════════════════════════════════════
-- SPEAKERS - Speaker management
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE speakers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  full_name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
  title TEXT, -- Professional title
  organization TEXT,
  bio TEXT,
  photo_url TEXT,
  email TEXT,
  phone TEXT,
  phone_normalized TEXT,
  linkedin_url TEXT,
  twitter_handle TEXT,
  website_url TEXT,
  topics TEXT[], -- Areas of expertise
  languages TEXT[] DEFAULT ARRAY['he'], -- Languages they can present in
  special_requirements TEXT, -- AV needs, dietary, etc.
  travel_arranged BOOLEAN DEFAULT FALSE,
  accommodation_arranged BOOLEAN DEFAULT FALSE,
  confirmation_status TEXT DEFAULT 'pending', -- pending, confirmed, declined
  confirmed_at TIMESTAMPTZ,
  notes TEXT,
  is_vip BOOLEAN DEFAULT FALSE,
  is_available BOOLEAN DEFAULT TRUE, -- Available as backup
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════════════════════════
-- ENHANCED SCHEDULES - Add references to new tables
-- ════════════════════════════════════════════════════════════════════════════════

-- Add new columns to existing schedules table
ALTER TABLE schedules
  ADD COLUMN IF NOT EXISTS program_day_id UUID REFERENCES program_days(id),
  ADD COLUMN IF NOT EXISTS time_block_id UUID REFERENCES time_blocks(id),
  ADD COLUMN IF NOT EXISTS track_id UUID REFERENCES tracks(id),
  ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES rooms(id),
  ADD COLUMN IF NOT EXISTS backup_room_id UUID REFERENCES rooms(id),
  ADD COLUMN IF NOT EXISTS session_type TEXT DEFAULT 'presentation', -- presentation, workshop, panel, keynote, networking
  ADD COLUMN IF NOT EXISTS difficulty_level TEXT, -- beginner, intermediate, advanced
  ADD COLUMN IF NOT EXISTS prerequisites TEXT,
  ADD COLUMN IF NOT EXISTS learning_outcomes TEXT[],
  ADD COLUMN IF NOT EXISTS tags TEXT[],
  ADD COLUMN IF NOT EXISTS backup_content_url TEXT, -- Pre-recorded backup content
  ADD COLUMN IF NOT EXISTS backup_content_type TEXT, -- video, slides, document
  ADD COLUMN IF NOT EXISTS livestream_url TEXT,
  ADD COLUMN IF NOT EXISTS recording_url TEXT,
  ADD COLUMN IF NOT EXISTS allow_questions BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS q_and_a_minutes INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- ════════════════════════════════════════════════════════════════════════════════
-- SESSION SPEAKERS - Link sessions to speakers with roles
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE session_speakers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  speaker_id UUID NOT NULL REFERENCES speakers(id) ON DELETE CASCADE,
  role speaker_role DEFAULT 'main',
  presentation_title TEXT, -- Speaker's specific part title (for panels)
  presentation_order INTEGER DEFAULT 0, -- Order for multi-speaker sessions
  duration_minutes INTEGER, -- Allocated time for this speaker
  confirmed BOOLEAN DEFAULT FALSE,
  confirmed_at TIMESTAMPTZ,
  declined_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(schedule_id, speaker_id, role)
);

-- ════════════════════════════════════════════════════════════════════════════════
-- CONTINGENCIES - Risk management & backup plans
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE contingencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES schedules(id) ON DELETE CASCADE, -- Specific session or null for event-wide
  contingency_type contingency_type NOT NULL,
  risk_level risk_level DEFAULT 'medium',
  probability INTEGER CHECK (probability >= 1 AND probability <= 5), -- 1-5 scale
  impact INTEGER CHECK (impact >= 1 AND impact <= 5), -- 1-5 scale
  risk_score INTEGER GENERATED ALWAYS AS (probability * impact) STORED,
  title TEXT NOT NULL, -- Brief description of the risk
  description TEXT, -- Detailed risk description
  trigger_conditions TEXT, -- When to activate this plan
  backup_plan TEXT NOT NULL, -- What to do if risk materializes
  backup_speaker_id UUID REFERENCES speakers(id),
  backup_room_id UUID REFERENCES rooms(id),
  backup_content_url TEXT,
  responsible_person TEXT, -- Who handles this contingency
  responsible_phone TEXT,
  notification_list JSONB DEFAULT '[]', -- Who to notify if activated
  status contingency_status DEFAULT 'prepared',
  activated_at TIMESTAMPTZ,
  activated_by UUID REFERENCES user_profiles(id),
  resolved_at TIMESTAMPTZ,
  resolved_notes TEXT,
  lessons_learned TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════════════════════════
-- SCHEDULE CHANGES - Audit trail for program changes
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE schedule_changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES user_profiles(id),
  change_type TEXT NOT NULL, -- 'time', 'room', 'speaker', 'cancelled', 'content', 'other'
  field_changed TEXT,
  old_value TEXT,
  new_value TEXT,
  reason TEXT,
  notify_participants BOOLEAN DEFAULT TRUE,
  notification_sent BOOLEAN DEFAULT FALSE,
  notification_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════════════════════════
-- PARTICIPANT TRACK ASSIGNMENTS - Which tracks each participant follows
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE participant_tracks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT FALSE, -- Main track for this participant
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(participant_id, track_id)
);

-- ════════════════════════════════════════════════════════════════════════════════
-- ROOM BOOKINGS - Track room reservations
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE room_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES schedules(id) ON DELETE CASCADE,
  program_day_id UUID NOT NULL REFERENCES program_days(id) ON DELETE CASCADE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  setup_time_minutes INTEGER DEFAULT 15, -- Time before for setup
  teardown_time_minutes INTEGER DEFAULT 15, -- Time after for teardown
  purpose TEXT,
  equipment_needed JSONB DEFAULT '[]',
  catering_needed BOOLEAN DEFAULT FALSE,
  catering_notes TEXT,
  status TEXT DEFAULT 'confirmed', -- tentative, confirmed, cancelled
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_booking_time CHECK (end_time > start_time)
);

-- ════════════════════════════════════════════════════════════════════════════════
-- FUNCTIONS
-- ════════════════════════════════════════════════════════════════════════════════

-- Function to check for schedule conflicts
CREATE OR REPLACE FUNCTION check_schedule_conflicts(
  p_event_id UUID,
  p_schedule_id UUID,
  p_speaker_id UUID,
  p_room_id UUID,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ
) RETURNS TABLE (
  conflict_type TEXT,
  conflicting_schedule_id UUID,
  conflicting_title TEXT,
  message TEXT
) AS $$
BEGIN
  -- Check speaker conflicts
  IF p_speaker_id IS NOT NULL THEN
    RETURN QUERY
    SELECT
      'speaker'::TEXT,
      s.id,
      s.title,
      'המרצה כבר משובץ לסשן אחר באותו זמן: ' || s.title
    FROM schedules s
    JOIN session_speakers ss ON s.id = ss.schedule_id
    WHERE s.event_id = p_event_id
      AND s.id != COALESCE(p_schedule_id, uuid_nil())
      AND ss.speaker_id = p_speaker_id
      AND ss.role IN ('main', 'moderator')
      AND (s.start_time, s.end_time) OVERLAPS (p_start_time, p_end_time);
  END IF;

  -- Check room conflicts
  IF p_room_id IS NOT NULL THEN
    RETURN QUERY
    SELECT
      'room'::TEXT,
      s.id,
      s.title,
      'החדר כבר תפוס לסשן אחר באותו זמן: ' || s.title
    FROM schedules s
    WHERE s.event_id = p_event_id
      AND s.id != COALESCE(p_schedule_id, uuid_nil())
      AND s.room_id = p_room_id
      AND (s.start_time, s.end_time) OVERLAPS (p_start_time, p_end_time);
  END IF;

  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Function to get personalized schedule for a participant
CREATE OR REPLACE FUNCTION get_participant_schedule(p_participant_id UUID)
RETURNS TABLE (
  schedule_id UUID,
  day_number INTEGER,
  day_date DATE,
  day_title TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  title TEXT,
  description TEXT,
  room_name TEXT,
  track_name TEXT,
  track_color TEXT,
  speaker_names TEXT[],
  is_mandatory BOOLEAN,
  is_registered BOOLEAN,
  current_count INTEGER,
  max_capacity INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    pd.day_number,
    pd.date,
    pd.title,
    s.start_time,
    s.end_time,
    s.title,
    s.description,
    r.name,
    t.name,
    t.color,
    ARRAY_AGG(DISTINCT sp.full_name) FILTER (WHERE sp.id IS NOT NULL),
    s.is_mandatory,
    ps.id IS NOT NULL,
    s.current_count,
    s.max_capacity
  FROM schedules s
  LEFT JOIN program_days pd ON s.program_day_id = pd.id
  LEFT JOIN rooms r ON s.room_id = r.id
  LEFT JOIN tracks t ON s.track_id = t.id
  LEFT JOIN session_speakers ss ON s.id = ss.schedule_id AND ss.role = 'main'
  LEFT JOIN speakers sp ON ss.speaker_id = sp.id
  LEFT JOIN participant_schedules ps ON s.id = ps.schedule_id AND ps.participant_id = p_participant_id
  LEFT JOIN participant_tracks pt ON t.id = pt.track_id AND pt.participant_id = p_participant_id
  WHERE s.event_id = (SELECT event_id FROM participants WHERE id = p_participant_id)
    AND s.is_published = TRUE
    AND (s.is_mandatory = TRUE OR pt.id IS NOT NULL OR ps.id IS NOT NULL)
  GROUP BY s.id, pd.day_number, pd.date, pd.title, r.name, t.name, t.color, ps.id
  ORDER BY pd.day_number, s.start_time;
END;
$$ LANGUAGE plpgsql;

-- Function to activate contingency plan
CREATE OR REPLACE FUNCTION activate_contingency(
  p_contingency_id UUID,
  p_activated_by UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_contingency RECORD;
BEGIN
  -- Get contingency details
  SELECT * INTO v_contingency FROM contingencies WHERE id = p_contingency_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Update contingency status
  UPDATE contingencies
  SET status = 'activated',
      activated_at = NOW(),
      activated_by = p_activated_by
  WHERE id = p_contingency_id;

  -- If there's a backup speaker, swap them in
  IF v_contingency.backup_speaker_id IS NOT NULL AND v_contingency.schedule_id IS NOT NULL THEN
    -- Mark main speaker as backup
    UPDATE session_speakers
    SET role = 'backup'
    WHERE schedule_id = v_contingency.schedule_id AND role = 'main';

    -- Add backup speaker as main (or update existing)
    INSERT INTO session_speakers (schedule_id, speaker_id, role, confirmed)
    VALUES (v_contingency.schedule_id, v_contingency.backup_speaker_id, 'main', TRUE)
    ON CONFLICT (schedule_id, speaker_id, role)
    DO UPDATE SET role = 'main', confirmed = TRUE;
  END IF;

  -- If there's a backup room, swap it
  IF v_contingency.backup_room_id IS NOT NULL AND v_contingency.schedule_id IS NOT NULL THEN
    UPDATE schedules
    SET room_id = v_contingency.backup_room_id
    WHERE id = v_contingency.schedule_id;

    -- Log the change
    INSERT INTO schedule_changes (schedule_id, changed_by, change_type, field_changed, reason)
    VALUES (v_contingency.schedule_id, p_activated_by, 'room', 'room_id', 'Contingency activated: ' || v_contingency.title);
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ════════════════════════════════════════════════════════════════════════════════
-- TRIGGERS
-- ════════════════════════════════════════════════════════════════════════════════

-- Auto-update speaker phone normalization
CREATE TRIGGER speakers_normalize_phone
  BEFORE INSERT OR UPDATE ON speakers
  FOR EACH ROW
  EXECUTE FUNCTION trigger_normalize_phones();

-- Track schedule changes
CREATE OR REPLACE FUNCTION log_schedule_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Log time changes
    IF OLD.start_time != NEW.start_time OR OLD.end_time != NEW.end_time THEN
      INSERT INTO schedule_changes (schedule_id, change_type, field_changed, old_value, new_value)
      VALUES (NEW.id, 'time', 'time',
              OLD.start_time::TEXT || ' - ' || OLD.end_time::TEXT,
              NEW.start_time::TEXT || ' - ' || NEW.end_time::TEXT);
    END IF;

    -- Log room changes
    IF OLD.room_id IS DISTINCT FROM NEW.room_id THEN
      INSERT INTO schedule_changes (schedule_id, change_type, field_changed, old_value, new_value)
      VALUES (NEW.id, 'room', 'room_id', OLD.room_id::TEXT, NEW.room_id::TEXT);
    END IF;

    -- Log title changes
    IF OLD.title != NEW.title THEN
      INSERT INTO schedule_changes (schedule_id, change_type, field_changed, old_value, new_value)
      VALUES (NEW.id, 'content', 'title', OLD.title, NEW.title);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER schedule_change_logger
  AFTER UPDATE ON schedules
  FOR EACH ROW EXECUTE FUNCTION log_schedule_change();

-- Update timestamps
CREATE TRIGGER update_program_days_updated_at BEFORE UPDATE ON program_days FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_tracks_updated_at BEFORE UPDATE ON tracks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_speakers_updated_at BEFORE UPDATE ON speakers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_contingencies_updated_at BEFORE UPDATE ON contingencies FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ════════════════════════════════════════════════════════════════════════════════
-- INDEXES
-- ════════════════════════════════════════════════════════════════════════════════

CREATE INDEX idx_program_days_event ON program_days(event_id);
CREATE INDEX idx_program_days_date ON program_days(date);
CREATE INDEX idx_tracks_event ON tracks(event_id);
CREATE INDEX idx_rooms_event ON rooms(event_id);
CREATE INDEX idx_time_blocks_day ON time_blocks(program_day_id);
CREATE INDEX idx_speakers_event ON speakers(event_id);
CREATE INDEX idx_speakers_name ON speakers(full_name);
CREATE INDEX idx_session_speakers_schedule ON session_speakers(schedule_id);
CREATE INDEX idx_session_speakers_speaker ON session_speakers(speaker_id);
CREATE INDEX idx_contingencies_event ON contingencies(event_id);
CREATE INDEX idx_contingencies_schedule ON contingencies(schedule_id);
CREATE INDEX idx_contingencies_status ON contingencies(status);
CREATE INDEX idx_schedule_changes_schedule ON schedule_changes(schedule_id);
CREATE INDEX idx_participant_tracks_participant ON participant_tracks(participant_id);
CREATE INDEX idx_participant_tracks_track ON participant_tracks(track_id);
CREATE INDEX idx_room_bookings_room ON room_bookings(room_id);
CREATE INDEX idx_room_bookings_day ON room_bookings(program_day_id);

-- ════════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ════════════════════════════════════════════════════════════════════════════════

ALTER TABLE program_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE speakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_speakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE contingencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE participant_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_bookings ENABLE ROW LEVEL SECURITY;

-- Public read policies for published content
CREATE POLICY "public_program_days_select" ON program_days FOR SELECT USING (true);
CREATE POLICY "public_tracks_select" ON tracks FOR SELECT USING (true);
CREATE POLICY "public_rooms_select" ON rooms FOR SELECT USING (true);
CREATE POLICY "public_time_blocks_select" ON time_blocks FOR SELECT USING (true);
CREATE POLICY "public_speakers_select" ON speakers FOR SELECT USING (true);
CREATE POLICY "public_session_speakers_select" ON session_speakers FOR SELECT USING (true);
CREATE POLICY "public_contingencies_select" ON contingencies FOR SELECT USING (true);
CREATE POLICY "public_schedule_changes_select" ON schedule_changes FOR SELECT USING (true);
CREATE POLICY "public_participant_tracks_select" ON participant_tracks FOR SELECT USING (true);
CREATE POLICY "public_room_bookings_select" ON room_bookings FOR SELECT USING (true);

-- Insert/Update/Delete policies
CREATE POLICY "public_program_days_insert" ON program_days FOR INSERT WITH CHECK (true);
CREATE POLICY "public_program_days_update" ON program_days FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "public_program_days_delete" ON program_days FOR DELETE USING (true);

CREATE POLICY "public_tracks_insert" ON tracks FOR INSERT WITH CHECK (true);
CREATE POLICY "public_tracks_update" ON tracks FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "public_tracks_delete" ON tracks FOR DELETE USING (true);

CREATE POLICY "public_rooms_insert" ON rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "public_rooms_update" ON rooms FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "public_rooms_delete" ON rooms FOR DELETE USING (true);

CREATE POLICY "public_time_blocks_insert" ON time_blocks FOR INSERT WITH CHECK (true);
CREATE POLICY "public_time_blocks_update" ON time_blocks FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "public_time_blocks_delete" ON time_blocks FOR DELETE USING (true);

CREATE POLICY "public_speakers_insert" ON speakers FOR INSERT WITH CHECK (true);
CREATE POLICY "public_speakers_update" ON speakers FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "public_speakers_delete" ON speakers FOR DELETE USING (true);

CREATE POLICY "public_session_speakers_insert" ON session_speakers FOR INSERT WITH CHECK (true);
CREATE POLICY "public_session_speakers_update" ON session_speakers FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "public_session_speakers_delete" ON session_speakers FOR DELETE USING (true);

CREATE POLICY "public_contingencies_insert" ON contingencies FOR INSERT WITH CHECK (true);
CREATE POLICY "public_contingencies_update" ON contingencies FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "public_contingencies_delete" ON contingencies FOR DELETE USING (true);

CREATE POLICY "public_schedule_changes_insert" ON schedule_changes FOR INSERT WITH CHECK (true);

CREATE POLICY "public_participant_tracks_insert" ON participant_tracks FOR INSERT WITH CHECK (true);
CREATE POLICY "public_participant_tracks_update" ON participant_tracks FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "public_participant_tracks_delete" ON participant_tracks FOR DELETE USING (true);

CREATE POLICY "public_room_bookings_insert" ON room_bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "public_room_bookings_update" ON room_bookings FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "public_room_bookings_delete" ON room_bookings FOR DELETE USING (true);
