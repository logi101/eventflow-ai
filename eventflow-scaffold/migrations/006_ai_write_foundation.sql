-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║              Phase 6: AI Write Foundation - Database Layer                  ║
-- ║              תשתית בסיס נתונים לפעולות כתיבה של AI                         ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝
--
-- Purpose: Create database foundation for AI write operations with audit logging,
--          schedule conflict detection, and speaker overlap detection.
--
-- Components:
--   1. btree_gist extension for exclusion constraints
--   2. ai_insights_log table for audit trail (suggested -> approved/rejected -> executed/failed)
--   3. Schedule room conflict constraint (atomic double-booking prevention)
--   4. Speaker conflict detection function (application-level overlap detection)
--
-- Migration: 006
-- Created: 2026-02-02
-- Author: Claude (GSD Phase 6, Plan 01)

-- ════════════════════════════════════════════════════════════════════════════════
-- 1. EXTENSION: btree_gist for GIST-based exclusion constraints
-- ════════════════════════════════════════════════════════════════════════════════

-- Enable btree_gist extension for range-based exclusion constraints on schedules
-- Required for preventing room double-booking via PostgreSQL exclusion constraint
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ════════════════════════════════════════════════════════════════════════════════
-- 2. AI INSIGHTS LOG: Full audit trail for AI write operations
-- יומן ביקורת למעקב אחר פעולות כתיבה של AI
-- ════════════════════════════════════════════════════════════════════════════════

-- Audit log for AI-suggested actions: tracks full lifecycle from suggestion to execution
-- Pattern: AI suggests → User approves/rejects → System executes → Log result
CREATE TABLE IF NOT EXISTS ai_insights_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Who triggered the action
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

  -- Event context (NULL for org-level actions)
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,

  -- Action type: schedule_create, schedule_update, schedule_delete, room_assign, track_assign, etc.
  action_type TEXT NOT NULL,

  -- Full action details (JSONB for flexibility)
  -- Structure: {
  --   current_state: {...},        -- State before action
  --   proposed_state: {...},       -- AI's suggested state
  --   conflicts_detected: [...],   -- Any conflicts found
  --   vip_affected: boolean,       -- Whether VIP participants affected
  --   reasoning: "...",            -- AI's explanation
  --   ... (other action-specific fields)
  -- }
  action_data JSONB NOT NULL,

  -- Lifecycle timestamps
  suggested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ,

  -- Execution status tracking
  execution_status TEXT NOT NULL DEFAULT 'suggested'
    CHECK (execution_status IN ('suggested', 'approved', 'rejected', 'executed', 'failed')),

  -- Error tracking for failed executions
  execution_error TEXT,

  -- Audit trail
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comment for clarity
COMMENT ON TABLE ai_insights_log IS 'Audit log for AI write operations: tracks suggestion, approval, and execution lifecycle';
COMMENT ON COLUMN ai_insights_log.action_type IS 'Type of action: schedule_create, schedule_update, schedule_delete, room_assign, etc.';
COMMENT ON COLUMN ai_insights_log.action_data IS 'Full action details including current_state, proposed_state, conflicts, VIP impact, and reasoning';
COMMENT ON COLUMN ai_insights_log.execution_status IS 'Lifecycle: suggested → approved/rejected → executed/failed';

-- ════════════════════════════════════════════════════════════════════════════════
-- 3. RLS POLICIES: Multi-tenant isolation for ai_insights_log
-- מדיניות אבטחה ברמת שורה לבידוד רב-דייר
-- ════════════════════════════════════════════════════════════════════════════════

ALTER TABLE ai_insights_log ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view audit logs for events in their organization
CREATE POLICY "Users can view ai_insights_log for their organization"
  ON ai_insights_log
  FOR SELECT
  USING (
    -- Allow viewing own logs
    user_id = auth.uid()
    OR
    -- Allow viewing logs for events in same organization
    (event_id IS NOT NULL AND event_id IN (
      SELECT id FROM events WHERE organization_id = auth.user_organization_id()
    ))
    OR
    -- Allow viewing org-level logs (event_id IS NULL) for same organization
    (event_id IS NULL AND user_id IN (
      SELECT id FROM user_profiles WHERE organization_id = auth.user_organization_id()
    ))
  );

-- INSERT: Users can insert audit logs for events in their organization
CREATE POLICY "Users can insert ai_insights_log for their organization"
  ON ai_insights_log
  FOR INSERT
  WITH CHECK (
    -- Must be for current user
    user_id = auth.uid()
    AND (
      -- Event-level actions: event must be in user's organization
      (event_id IS NOT NULL AND event_id IN (
        SELECT id FROM events WHERE organization_id = auth.user_organization_id()
      ))
      OR
      -- Org-level actions: user must be in organization
      (event_id IS NULL)
    )
  );

-- UPDATE: Users can update audit logs they created or for events in their organization
CREATE POLICY "Users can update ai_insights_log for their organization"
  ON ai_insights_log
  FOR UPDATE
  USING (
    -- Own logs
    user_id = auth.uid()
    OR
    -- Logs for events in same organization (for approval workflow)
    (event_id IS NOT NULL AND event_id IN (
      SELECT id FROM events WHERE organization_id = auth.user_organization_id()
    ))
  );

-- ════════════════════════════════════════════════════════════════════════════════
-- 4. INDEXES: Performance optimization for ai_insights_log queries
-- אינדקסים לביצועים מיטביים
-- ════════════════════════════════════════════════════════════════════════════════

-- Query by event (most common: show all AI actions for this event)
CREATE INDEX idx_ai_insights_log_event_id ON ai_insights_log(event_id);

-- Query by user (who triggered this action?)
CREATE INDEX idx_ai_insights_log_user_id ON ai_insights_log(user_id);

-- Query by status (find pending approvals)
CREATE INDEX idx_ai_insights_log_status ON ai_insights_log(execution_status);

-- Query by time (recent actions, chronological order)
CREATE INDEX idx_ai_insights_log_created_at ON ai_insights_log(created_at DESC);

-- Composite index for common query: pending actions for specific event
CREATE INDEX idx_ai_insights_log_event_status ON ai_insights_log(event_id, execution_status);

-- ════════════════════════════════════════════════════════════════════════════════
-- 5. SCHEDULE CONFLICT CONSTRAINT: Atomic room double-booking prevention
-- מניעת הזמנת חדר כפולה ברמת בסיס הנתונים
-- ════════════════════════════════════════════════════════════════════════════════

-- Add exclusion constraint to prevent overlapping time ranges for same event+room
-- This provides ATOMIC conflict detection at database level (not just application level)
-- Pattern: EXCLUDE USING GIST (...) enforces that no two rows can satisfy the overlap condition

DO $$
BEGIN
  -- Check if constraint already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'no_room_overlap'
    AND conrelid = 'schedules'::regclass
  ) THEN
    -- Add exclusion constraint: prevent same room + overlapping time for same event
    ALTER TABLE schedules ADD CONSTRAINT no_room_overlap
      EXCLUDE USING GIST (
        event_id WITH =,           -- Same event
        room WITH =,               -- Same room
        tstzrange(start_time, end_time) WITH &&  -- Overlapping time ranges
      )
      WHERE (room IS NOT NULL);    -- Only enforce when room is specified
  END IF;
END $$;

COMMENT ON CONSTRAINT no_room_overlap ON schedules IS
  'Prevents room double-booking: same room cannot be scheduled for overlapping times within an event';

-- ════════════════════════════════════════════════════════════════════════════════
-- 6. SPEAKER OVERLAP INDEX: Application-level conflict detection
-- אינדקס לזיהוי התנגשויות מרצים
-- ════════════════════════════════════════════════════════════════════════════════

-- Index to support fast speaker conflict detection queries
-- While room conflicts are enforced at DB level, speaker conflicts are application-level
-- (same speaker can theoretically be in two places, but AI should warn about it)
CREATE INDEX IF NOT EXISTS idx_schedules_speaker_time ON schedules (
  event_id,
  speaker_name,
  start_time,
  end_time
) WHERE speaker_name IS NOT NULL;

COMMENT ON INDEX idx_schedules_speaker_time IS
  'Supports fast speaker conflict detection: finds overlapping schedules for same speaker';

-- ════════════════════════════════════════════════════════════════════════════════
-- 7. SPEAKER CONFLICT DETECTION FUNCTION: Application-level overlap detection
-- פונקציה לזיהוי התנגשויות מרצים
-- ════════════════════════════════════════════════════════════════════════════════

-- Function to check if a speaker has conflicting schedules
-- Returns all schedules that overlap with the proposed time slot
-- Used by AI chat and frontend to warn before creating/updating schedules
CREATE OR REPLACE FUNCTION check_speaker_conflicts(
  p_event_id UUID,                    -- Event to check within
  p_speaker_name TEXT,                -- Speaker name (case-insensitive)
  p_start_time TIMESTAMPTZ,           -- Proposed start time
  p_end_time TIMESTAMPTZ,             -- Proposed end time
  p_exclude_schedule_id UUID DEFAULT NULL  -- Schedule ID to exclude (for updates)
)
RETURNS TABLE (
  conflict_id UUID,
  conflict_title TEXT,
  conflict_start TIMESTAMPTZ,
  conflict_end TIMESTAMPTZ
) AS $$
BEGIN
  -- Find all schedules for this speaker that overlap with the proposed time
  -- Overlap condition: existing.start < proposed.end AND existing.end > proposed.start
  RETURN QUERY
  SELECT
    s.id,
    s.title,
    s.start_time,
    s.end_time
  FROM schedules s
  WHERE s.event_id = p_event_id
    AND s.speaker_name ILIKE p_speaker_name  -- Case-insensitive match
    AND s.id IS DISTINCT FROM p_exclude_schedule_id  -- Exclude current schedule (for updates)
    AND s.start_time < p_end_time            -- Overlap check
    AND s.end_time > p_start_time            -- Overlap check
  ORDER BY s.start_time;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION check_speaker_conflicts IS
  'Detects speaker scheduling conflicts: returns all overlapping schedules for the same speaker';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_speaker_conflicts TO authenticated;

-- ════════════════════════════════════════════════════════════════════════════════
-- 8. VALIDATION QUERIES: Verify migration success
-- שאילתות ווידוא
-- ════════════════════════════════════════════════════════════════════════════════

-- Verify extension exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'btree_gist') THEN
    RAISE EXCEPTION 'btree_gist extension not installed';
  END IF;
END $$;

-- Verify table exists with correct columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'ai_insights_log'
  ) THEN
    RAISE EXCEPTION 'ai_insights_log table not created';
  END IF;

  -- Verify critical columns exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_insights_log' AND column_name = 'execution_status'
  ) THEN
    RAISE EXCEPTION 'ai_insights_log.execution_status column missing';
  END IF;
END $$;

-- Verify constraint exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'no_room_overlap'
  ) THEN
    RAISE EXCEPTION 'no_room_overlap constraint not created';
  END IF;
END $$;

-- Verify function exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'check_speaker_conflicts'
  ) THEN
    RAISE EXCEPTION 'check_speaker_conflicts function not created';
  END IF;
END $$;

-- ════════════════════════════════════════════════════════════════════════════════
-- Migration complete! ✓
-- ════════════════════════════════════════════════════════════════════════════════
--
-- What was created:
--   ✓ btree_gist extension enabled
--   ✓ ai_insights_log table with RLS policies and indexes
--   ✓ no_room_overlap exclusion constraint on schedules
--   ✓ check_speaker_conflicts function for application-level detection
--   ✓ Performance indexes on schedules for speaker/time queries
--
-- Next steps:
--   1. Run this migration in Supabase SQL Editor
--   2. Verify validation queries passed (no exceptions raised)
--   3. Test room conflict: try inserting overlapping schedules (should fail)
--   4. Test speaker conflict: call check_speaker_conflicts() with overlapping times
--   5. Proceed to Plan 06-02: Extend ai-chat Edge Function with write tools
