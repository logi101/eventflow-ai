-- Migration 009: Day Simulation & Real-Time Contingency Foundation
-- Phase 9, Plan 1: Database & Types Foundation
-- Purpose: Add contingency audit logging and backup speaker tracking

-- ============================================================================
-- 1. Add backup speaker tracking to schedules
-- ============================================================================

-- Add backup_speaker_id column for contingency planning
ALTER TABLE schedules
ADD COLUMN IF NOT EXISTS backup_speaker_id UUID REFERENCES speakers(id);

-- Add original_speaker_id to track speaker changes
ALTER TABLE schedules
ADD COLUMN IF NOT EXISTS original_speaker_id UUID REFERENCES speakers(id);

-- Create index for backup speaker queries
CREATE INDEX IF NOT EXISTS idx_schedules_backup_speaker
ON schedules(backup_speaker_id) WHERE backup_speaker_id IS NOT NULL;

-- ============================================================================
-- 2. Create contingency_audit_log table (append-only)
-- ============================================================================

CREATE TABLE IF NOT EXISTS contingency_audit_log (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,

  -- Action details
  action_type TEXT NOT NULL, -- 'backup_speaker_activate', 'room_change', 'schedule_adjust', 'time_change', 'session_cancel'
  action_data JSONB NOT NULL, -- Full action details (schedule_id, original values, new values)

  -- Execution lifecycle
  execution_status TEXT NOT NULL DEFAULT 'suggested', -- 'suggested', 'approved', 'executed', 'rejected', 'failed'

  -- Audit trail - Suggested
  suggested_by UUID NOT NULL REFERENCES user_profiles(id),
  suggested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Audit trail - Approved
  approved_by UUID REFERENCES user_profiles(id),
  approved_at TIMESTAMPTZ,

  -- Audit trail - Executed
  executed_by UUID REFERENCES user_profiles(id),
  executed_at TIMESTAMPTZ,

  -- Audit trail - Rejected
  rejected_by UUID REFERENCES user_profiles(id),
  rejected_at TIMESTAMPTZ,

  -- Context
  reason TEXT NOT NULL, -- Why this action was taken
  impact_summary JSONB, -- { affected_participants: N, notifications_sent: N, notifications_failed: N, affected_sessions: [...], vip_affected: N }
  error_message TEXT, -- If execution failed

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_execution_status CHECK (execution_status IN ('suggested', 'approved', 'executed', 'rejected', 'failed')),
  CONSTRAINT valid_action_type CHECK (action_type IN ('backup_speaker_activate', 'room_change', 'schedule_adjust', 'time_change', 'session_cancel')),
  CONSTRAINT approved_requires_approver CHECK (
    (execution_status IN ('approved', 'executed') AND approved_by IS NOT NULL AND approved_at IS NOT NULL) OR
    (execution_status NOT IN ('approved', 'executed'))
  ),
  CONSTRAINT executed_requires_executor CHECK (
    (execution_status = 'executed' AND executed_by IS NOT NULL AND executed_at IS NOT NULL) OR
    (execution_status != 'executed')
  ),
  CONSTRAINT rejected_requires_rejector CHECK (
    (execution_status = 'rejected' AND rejected_by IS NOT NULL AND rejected_at IS NOT NULL) OR
    (execution_status != 'rejected')
  )
);

-- ============================================================================
-- 3. Indexes for query performance
-- ============================================================================

-- Event-based queries
CREATE INDEX IF NOT EXISTS idx_contingency_audit_event
ON contingency_audit_log(event_id);

-- Status-based queries (active actions)
CREATE INDEX IF NOT EXISTS idx_contingency_audit_status
ON contingency_audit_log(execution_status);

-- Time-based queries (recent actions)
CREATE INDEX IF NOT EXISTS idx_contingency_audit_suggested_at
ON contingency_audit_log(suggested_at DESC);

-- Action type queries
CREATE INDEX IF NOT EXISTS idx_contingency_audit_action_type
ON contingency_audit_log(action_type);

-- Composite index for event + status queries
CREATE INDEX IF NOT EXISTS idx_contingency_audit_event_status
ON contingency_audit_log(event_id, execution_status);

-- ============================================================================
-- 4. Row Level Security (RLS) - APPEND-ONLY enforcement
-- ============================================================================

-- Enable RLS
ALTER TABLE contingency_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert audit logs for their organization's events
CREATE POLICY "Users can insert contingency audit logs"
  ON contingency_audit_log FOR INSERT
  WITH CHECK (
    event_id IN (
      SELECT e.id FROM events e
      WHERE e.organization_id = (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- Policy: Users can view audit logs for their organization's events
CREATE POLICY "Users can view contingency audit logs"
  ON contingency_audit_log FOR SELECT
  USING (
    event_id IN (
      SELECT e.id FROM events e
      WHERE e.organization_id = (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- NO UPDATE OR DELETE POLICIES
-- This enforces append-only behavior - any attempt to UPDATE or DELETE will be denied by RLS

-- ============================================================================
-- 5. Add message_type enum value for schedule updates
-- ============================================================================

-- Add 'schedule_update' to message_type enum if it doesn't exist
DO $$
BEGIN
  -- Check if message_type enum exists
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_type') THEN
    -- Check if 'schedule_update' value doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum
      WHERE enumlabel = 'schedule_update'
      AND enumtypid = 'message_type'::regtype
    ) THEN
      ALTER TYPE message_type ADD VALUE 'schedule_update';
    END IF;
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    -- message_type enum doesn't exist, skip
    RAISE NOTICE 'message_type enum does not exist, skipping schedule_update value addition';
END $$;

-- ============================================================================
-- 6. Validation queries
-- ============================================================================

-- Verify backup_speaker_id column exists
SELECT
  'backup_speaker_id column' AS check_name,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schedules' AND column_name = 'backup_speaker_id'
  ) AS exists;

-- Verify original_speaker_id column exists
SELECT
  'original_speaker_id column' AS check_name,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schedules' AND column_name = 'original_speaker_id'
  ) AS exists;

-- Verify contingency_audit_log table exists
SELECT
  'contingency_audit_log table' AS check_name,
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'contingency_audit_log'
  ) AS exists;

-- Verify RLS is enabled
SELECT
  'RLS enabled on contingency_audit_log' AS check_name,
  rowsecurity AS enabled
FROM pg_tables
WHERE tablename = 'contingency_audit_log';

-- Count RLS policies (should be exactly 2: INSERT and SELECT)
SELECT
  'RLS policy count' AS check_name,
  COUNT(*) AS policy_count
FROM pg_policies
WHERE tablename = 'contingency_audit_log';

-- Verify no UPDATE or DELETE policies exist (append-only enforcement)
SELECT
  'No UPDATE policies' AS check_name,
  COUNT(*) = 0 AS verified
FROM pg_policies
WHERE tablename = 'contingency_audit_log' AND cmd = 'UPDATE';

SELECT
  'No DELETE policies' AS check_name,
  COUNT(*) = 0 AS verified
FROM pg_policies
WHERE tablename = 'contingency_audit_log' AND cmd = 'DELETE';

-- Verify indexes were created
SELECT
  'Index count on contingency_audit_log' AS check_name,
  COUNT(*) AS index_count
FROM pg_indexes
WHERE tablename = 'contingency_audit_log';

-- ============================================================================
-- Migration complete
-- ============================================================================

-- Display summary
DO $$
BEGIN
  RAISE NOTICE '✓ Migration 009 complete: Contingency audit logging foundation ready';
  RAISE NOTICE '  - backup_speaker_id and original_speaker_id added to schedules';
  RAISE NOTICE '  - contingency_audit_log table created with append-only enforcement';
  RAISE NOTICE '  - 5 indexes created for query performance';
  RAISE NOTICE '  - RLS policies: INSERT and SELECT only (no UPDATE/DELETE)';
  RAISE NOTICE '  - message_type enum extended with schedule_update value';
END $$;
