-- ══════════════════════════════════════════════════════════════════════════════
-- Migration: Networking & VIP Infrastructure
-- Description: Adds track assignment statistics, table seating, and opt-in flags
-- Date: 2026-02-05
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Add networking_opt_in to participants
ALTER TABLE participants
ADD COLUMN IF NOT EXISTS networking_opt_in BOOLEAN DEFAULT FALSE;

-- 2. Create table_assignments table
CREATE TABLE IF NOT EXISTS table_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  table_number INTEGER NOT NULL,
  seat_number INTEGER, -- Optional: specific seat at table
  is_vip_table BOOLEAN DEFAULT FALSE,
  assigned_by TEXT DEFAULT 'ai', -- 'ai' | 'manager' | 'auto'
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, participant_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_table_assignments_event ON table_assignments(event_id);
CREATE INDEX IF NOT EXISTS idx_table_assignments_table ON table_assignments(event_id, table_number);
CREATE INDEX IF NOT EXISTS idx_participants_opt_in ON participants(event_id) WHERE networking_opt_in = TRUE;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_table_assignments_updated_at ON table_assignments;
CREATE TRIGGER trigger_table_assignments_updated_at
  BEFORE UPDATE ON table_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 3. RLS Policies for table_assignments
ALTER TABLE table_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view table assignments for their events" ON table_assignments;
CREATE POLICY "Users can view table assignments for their events"
  ON table_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events e
      JOIN user_profiles up ON up.organization_id = e.organization_id
      WHERE e.id = table_assignments.event_id
      AND up.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage table assignments for their events" ON table_assignments;
CREATE POLICY "Users can manage table assignments for their events"
  ON table_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM events e
      JOIN user_profiles up ON up.organization_id = e.organization_id
      WHERE e.id = table_assignments.event_id
      AND up.user_id = auth.uid()
    )
  );

-- 4. Track Statistics View
CREATE OR REPLACE VIEW track_statistics AS
SELECT
  t.id AS track_id,
  t.event_id,
  t.name AS track_name,
  t.color,
  COUNT(pt.participant_id) AS participant_count,
  COUNT(pt.participant_id) FILTER (WHERE p.is_vip) AS vip_count,
  COUNT(pt.participant_id) FILTER (WHERE pt.is_primary) AS primary_count
FROM tracks t
LEFT JOIN participant_tracks pt ON t.id = pt.track_id
LEFT JOIN participants p ON pt.participant_id = p.id
GROUP BY t.id, t.event_id, t.name, t.color;

-- Grant access to view
GRANT SELECT ON track_statistics TO authenticated;
