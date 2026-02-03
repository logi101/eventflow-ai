-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║         Phase 7: Networking & VIP Infrastructure - Database Layer            ║
-- ║         תשתית בסיס נתונים למנוע נטוורקינג ומערכת שיבוץ שולחנות              ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝
--
-- Purpose: Create database foundation for networking engine and table seating system
--          with opt-in networking, table assignments, and track statistics.
--
-- Components:
--   1. networking_opt_in column on participants table (opt-in networking consent)
--   2. table_assignments table for seating plan with VIP designation
--   3. track_statistics view for participant distribution analysis
--   4. RLS policies for multi-tenant table assignment isolation
--   5. Performance indexes for table queries
--
-- Migration: 007
-- Created: 2026-02-03
-- Author: Claude (GSD Phase 7, Plan 01)

-- ════════════════════════════════════════════════════════════════════════════════
-- 1. ADD NETWORKING OPT-IN: Participant networking consent
-- הוספת עמודת הסכמה לנטוורקינג
-- ════════════════════════════════════════════════════════════════════════════════

-- Add networking_opt_in column to participants table
-- Default: false (opt-in behavior - participants must explicitly consent)
-- Event-level default can be stored in events.settings JSONB as: default_networking_opt_in
ALTER TABLE participants
ADD COLUMN IF NOT EXISTS networking_opt_in BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN participants.networking_opt_in IS
  'Participant consent for networking features (sharing contact info, business card, etc.). Default false - explicit opt-in required.';

-- ════════════════════════════════════════════════════════════════════════════════
-- 2. TABLE ASSIGNMENTS: Seating plan and table management
-- שיבוץ שולחנות - תכנון ישיבה
-- ════════════════════════════════════════════════════════════════════════════════

-- Table for managing seating assignments
-- Tracks who sits at which table, with VIP designation and assignment source
CREATE TABLE IF NOT EXISTS table_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Event and participant references
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,

  -- Table assignment details
  table_number INTEGER NOT NULL,
  seat_number INTEGER, -- Optional: specific seat at table (e.g., seat 1-8)

  -- VIP and assignment metadata
  is_vip_table BOOLEAN DEFAULT FALSE, -- Is this a VIP-designated table?
  assigned_by TEXT DEFAULT 'ai', -- Source: 'ai' | 'manager' | 'auto'
  assigned_at TIMESTAMPTZ DEFAULT NOW(),

  -- Additional notes
  notes TEXT, -- Table-specific notes (e.g., "near AV booth", "kosher table")

  -- Audit timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints: One participant per event (can't be assigned to multiple tables)
  UNIQUE(event_id, participant_id)
);

-- Comments for clarity
COMMENT ON TABLE table_assignments IS
  'Seating plan: tracks table and seat assignments for participants with VIP designation';
COMMENT ON COLUMN table_assignments.table_number IS
  'Table number in the venue (e.g., Table 1, Table 2)';
COMMENT ON COLUMN table_assignments.seat_number IS
  'Optional: specific seat number at the table (e.g., seats 1-8 for an 8-person table)';
COMMENT ON COLUMN table_assignments.is_vip_table IS
  'Designates VIP tables for premium seating arrangements';
COMMENT ON COLUMN table_assignments.assigned_by IS
  'Assignment source: ai (AI suggestion), manager (manual), auto (automatic algorithm)';

-- ════════════════════════════════════════════════════════════════════════════════
-- 3. INDEXES: Performance optimization for table assignment queries
-- אינדקסים לביצועים מיטביים
-- ════════════════════════════════════════════════════════════════════════════════

-- Query by event (most common: show all table assignments for this event)
CREATE INDEX IF NOT EXISTS idx_table_assignments_event
  ON table_assignments(event_id);

-- Query by table (group participants by table number)
CREATE INDEX IF NOT EXISTS idx_table_assignments_table
  ON table_assignments(event_id, table_number);

-- Query by participant (find which table a participant is assigned to)
CREATE INDEX IF NOT EXISTS idx_table_assignments_participant
  ON table_assignments(participant_id);

-- Query VIP tables (filter VIP table assignments)
CREATE INDEX IF NOT EXISTS idx_table_assignments_vip
  ON table_assignments(event_id, is_vip_table) WHERE is_vip_table = TRUE;

-- ════════════════════════════════════════════════════════════════════════════════
-- 4. RLS POLICIES: Multi-tenant isolation for table_assignments
-- מדיניות אבטחה ברמת שורה לבידוד רב-דייר
-- ════════════════════════════════════════════════════════════════════════════════

ALTER TABLE table_assignments ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view table assignments for events in their organization
CREATE POLICY "Users can view table_assignments for their organization"
  ON table_assignments
  FOR SELECT
  USING (
    event_id IN (
      SELECT id FROM events
      WHERE organization_id = auth.user_organization_id()
    )
  );

-- INSERT: Users can create table assignments for events in their organization
CREATE POLICY "Users can insert table_assignments for their organization"
  ON table_assignments
  FOR INSERT
  WITH CHECK (
    event_id IN (
      SELECT id FROM events
      WHERE organization_id = auth.user_organization_id()
    )
  );

-- UPDATE: Users can update table assignments for events in their organization
CREATE POLICY "Users can update table_assignments for their organization"
  ON table_assignments
  FOR UPDATE
  USING (
    event_id IN (
      SELECT id FROM events
      WHERE organization_id = auth.user_organization_id()
    )
  );

-- DELETE: Users can delete table assignments for events in their organization
CREATE POLICY "Users can delete table_assignments for their organization"
  ON table_assignments
  FOR DELETE
  USING (
    event_id IN (
      SELECT id FROM events
      WHERE organization_id = auth.user_organization_id()
    )
  );

-- ════════════════════════════════════════════════════════════════════════════════
-- 5. UPDATE TRIGGER: Auto-update updated_at timestamp
-- טריגר עדכון אוטומטי
-- ════════════════════════════════════════════════════════════════════════════════

-- Create trigger to auto-update updated_at column
CREATE TRIGGER update_table_assignments_updated_at
  BEFORE UPDATE ON table_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ════════════════════════════════════════════════════════════════════════════════
-- 6. TRACK STATISTICS VIEW: Participant distribution per track
-- תצוגה סטטיסטית של התפלגות משתתפים לפי מסלול
-- ════════════════════════════════════════════════════════════════════════════════

-- View to show participant distribution across tracks
-- Provides: participant count, VIP count, primary track count, and percentage per track
CREATE OR REPLACE VIEW track_statistics AS
SELECT
  t.id AS track_id,
  t.event_id,
  t.name AS track_name,
  t.name_en AS track_name_en,
  t.color AS track_color,

  -- Participant counts
  COUNT(pt.participant_id) AS participant_count,
  COUNT(pt.participant_id) FILTER (WHERE p.is_vip) AS vip_count,
  COUNT(pt.participant_id) FILTER (WHERE pt.is_primary) AS primary_count,

  -- Percentage calculation: this track's participants / total event participants
  ROUND(
    COUNT(pt.participant_id)::numeric / NULLIF(
      (SELECT COUNT(DISTINCT participant_id)
       FROM participant_tracks
       WHERE track_id IN (SELECT id FROM tracks WHERE event_id = t.event_id)
      ),
      0
    ) * 100,
    1
  ) AS percentage_of_total

FROM tracks t
LEFT JOIN participant_tracks pt ON t.id = pt.track_id
LEFT JOIN participants p ON pt.participant_id = p.id
WHERE t.is_active = TRUE  -- Only count active tracks
GROUP BY t.id, t.event_id, t.name, t.name_en, t.color
ORDER BY t.event_id, t.sort_order, t.name;

-- Comments for clarity
COMMENT ON VIEW track_statistics IS
  'Track statistics: participant count, VIP count, primary count, and percentage distribution per track';

-- ════════════════════════════════════════════════════════════════════════════════
-- 7. VALIDATION QUERIES: Verify migration success
-- שאילתות ווידוא
-- ════════════════════════════════════════════════════════════════════════════════

-- Verify networking_opt_in column exists on participants table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'participants'
    AND column_name = 'networking_opt_in'
  ) THEN
    RAISE EXCEPTION 'participants.networking_opt_in column not created';
  END IF;
END $$;

-- Verify table_assignments table exists with correct columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'table_assignments'
  ) THEN
    RAISE EXCEPTION 'table_assignments table not created';
  END IF;

  -- Verify critical columns exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'table_assignments' AND column_name = 'table_number'
  ) THEN
    RAISE EXCEPTION 'table_assignments.table_number column missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'table_assignments' AND column_name = 'is_vip_table'
  ) THEN
    RAISE EXCEPTION 'table_assignments.is_vip_table column missing';
  END IF;
END $$;

-- Verify track_statistics view exists and works
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_name = 'track_statistics'
  ) THEN
    RAISE EXCEPTION 'track_statistics view not created';
  END IF;
END $$;

-- Test query: table_assignments should be accessible (empty table, no error)
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM table_assignments;
  -- Should return 0 (empty table) without error
END $$;

-- Test query: track_statistics view should work without error
DO $$
DECLARE
  v_record RECORD;
BEGIN
  SELECT * INTO v_record FROM track_statistics LIMIT 1;
  -- Should execute without error (may return NULL if no tracks exist)
END $$;

-- ════════════════════════════════════════════════════════════════════════════════
-- Migration complete! ✓
-- ════════════════════════════════════════════════════════════════════════════════
--
-- What was created:
--   ✓ networking_opt_in column on participants (default false, opt-in)
--   ✓ table_assignments table with event/participant/table tracking
--   ✓ RLS policies for multi-tenant table assignment isolation
--   ✓ Performance indexes on event_id, table_number, participant_id, VIP
--   ✓ track_statistics view for participant distribution analysis
--   ✓ Auto-update trigger for updated_at timestamp
--
-- Next steps:
--   1. Run this migration in Supabase SQL Editor
--   2. Verify validation queries passed (no exceptions raised)
--   3. Test table assignment: INSERT a sample table_assignments row
--   4. Test track_statistics: SELECT * FROM track_statistics (requires tracks + participant_tracks data)
--   5. Proceed to Plan 07-02: Implement table assignment UI components
--
