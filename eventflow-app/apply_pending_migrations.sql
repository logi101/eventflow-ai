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
-- Migration 010: Add Tier Columns to Organizations Table
-- EventFlow AI v2.1 - SaaS Tier Structure
-- Date: 2026-02-03

-- Add tier column with CHECK constraint (dedicated TEXT, NOT JSONB for RLS performance)
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'base'
CHECK (tier IN ('base', 'premium', 'legacy_premium'));

-- Add index on tier column for RLS query performance
CREATE INDEX IF NOT EXISTS idx_organizations_tier ON organizations(tier);

-- Add tier_limits JSONB column to store limits per tier
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS tier_limits JSONB DEFAULT '{
  "events_per_year": 5,
  "participants_per_event": 100,
  "messages_per_month": 200,
  "ai_chat_messages_per_month": 50
}';

-- Add current_usage JSONB column to track consumption
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS current_usage JSONB DEFAULT '{
  "events_count": 0,
  "participants_count": 0,
  "messages_sent": 0,
  "ai_messages_sent": 0,
  "period_start": "2026-02-01T00:00:00Z",
  "period_end": "2026-03-01T00:00:00Z",
  "warned_this_month": false
}';

-- Add tier_updated_at timestamp for audit trail
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS tier_updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add tier_updated_by UUID to track who changed the tier
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS tier_updated_by UUID REFERENCES user_profiles(id);

-- Add comment explaining the tier column
COMMENT ON COLUMN organizations.tier IS 'Subscription tier: base (free), premium (paid), legacy_premium (grandfathered existing users)';

COMMENT ON COLUMN organizations.tier_limits IS 'Usage limits per tier (events_per_year, participants_per_event, messages_per_month, ai_chat_messages_per_month)';

COMMENT ON COLUMN organizations.current_usage IS 'Current usage counters tracked by triggers (events_count, participants_count, messages_sent, ai_messages_sent)';

-- Update comment for organizations table to include tier structure
COMMENT ON TABLE organizations IS 'Organization profile with tier configuration (Base: 5 events/yr, 100 participants/event, 200 messages/mo; Premium: unlimited)';
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
-- Migration 012: Add RLS Policies for Premium Features
-- EventFlow AI v2.1 - SaaS Tier Structure
-- Date: 2026-02-03

-- ====================================================================
-- FUNCTION: Check Organization Tier (Security Definer + STABLE)
-- Performance optimization: Caches result per statement, not per-row
-- Prevents 50-100x RLS query slowdown with tier checks
-- ====================================================================
CREATE OR REPLACE FUNCTION check_org_tier(org_id UUID, required_tier TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER  -- Bypasses RLS to check tier directly
STABLE  -- PostgreSQL optimizer caches result per statement
AS $$
BEGIN
  RETURN (
    SELECT tier >= required_tier
    FROM organizations
    WHERE id = org_id
  );
END;
$$;

-- ====================================================================
-- RLS POLICY: Simulations Table - Premium Only
-- ====================================================================
DROP POLICY IF EXISTS "simulations_premium_only" ON simulations;
CREATE POLICY "simulations_premium_only"
ON simulations FOR ALL
TO authenticated
USING (
  check_org_tier(
    (SELECT e.organization_id FROM events e WHERE e.id = NEW.event_id OR OLD.event_id = e.id),
    'premium'
  )
)
WITH CHECK (
  check_org_tier(
    (SELECT e.organization_id FROM events e WHERE e.id = NEW.event_id OR OLD.event_id = e.id),
    'premium'
  )
);

ALTER TABLE simulations ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- RLS POLICY: AI Chat Sessions Table - Premium Only
-- ====================================================================
DROP POLICY IF EXISTS "ai_chat_sessions_premium_only" ON ai_chat_sessions;
CREATE POLICY "ai_chat_sessions_premium_only"
ON ai_chat_sessions FOR ALL
TO authenticated
USING (
  check_org_tier(
    organization_id,
    'premium'
  )
)
WITH CHECK (
  check_org_tier(
    organization_id,
    'premium'
  )
);

ALTER TABLE ai_chat_sessions ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- RLS POLICY: Vendor Analysis Table - Premium Only
-- ====================================================================
DROP POLICY IF EXISTS "vendor_analysis_premium_only" ON vendor_analysis;
CREATE POLICY "vendor_analysis_premium_only"
ON vendor_analysis FOR ALL
TO authenticated
USING (
  check_org_tier(
    organization_id,
    'premium'
  )
)
WITH CHECK (
  check_org_tier(
    organization_id,
    'premium'
  )
);

ALTER TABLE vendor_analysis ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- COMMENTS
-- ====================================================================
COMMENT ON FUNCTION check_org_tier IS 'Security definer function to check organization tier (base/premium). Marked STABLE for query optimizer caching. Prevents RLS performance degradation with tier checks.';

COMMENT ON POLICY "simulations_premium_only" ON simulations IS 'RLS policy restricting simulations to premium organizations only. Uses check_org_tier() STABLE function for performance.';

COMMENT ON POLICY "ai_chat_sessions_premium_only" ON ai_chat_sessions IS 'RLS policy restricting AI chat to premium organizations only. Uses check_org_tier() STABLE function for performance.';

COMMENT ON POLICY "vendor_analysis_premium_only" ON vendor_analysis IS 'RLS policy restricting vendor analysis to premium organizations only. Uses check_org_tier() STABLE function for performance.';
-- Migration 013: Migrate Existing Organizations to Base Tier
-- EventFlow AI v2.1 - SaaS Tier Structure
-- Date: 2026-02-03

-- ====================================================================
-- DECISION POINT: Grandfathering Strategy
-- ====================================================================
-- OPTION 1: Simple Migration (All orgs → Base)
-- -- This is the default approach below
-- UPDATE organizations SET tier = 'base' WHERE tier IS NULL;

-- OPTION 2: Grandfathering (Old orgs → Legacy Premium for 6-12 months)
-- -- Uncomment the following lines for grandfathering strategy
-- UPDATE organizations SET tier = 'legacy_premium' WHERE tier IS NULL AND created_at < '2026-02-03';
-- UPDATE organizations SET tier = 'base' WHERE tier IS NULL AND created_at >= '2026-02-03';
-- ALTER TABLE organizations ADD COLUMN IF NOT EXISTS legacy_expires_at TIMESTAMPTZ;
-- UPDATE organizations SET legacy_expires_at = NOW() + INTERVAL '6 months' WHERE tier = 'legacy_premium';

-- ====================================================================
-- DEFAULT: Simple Migration (OPTION 1)
-- ====================================================================
-- Set all existing organizations without a tier to 'base'
UPDATE organizations
SET tier = 'base'
WHERE tier IS NULL;

-- Log migration completion (admin_logs table should exist)
INSERT INTO admin_logs (action, details, organization_id, created_at)
SELECT
  'migration_010_tier_columns',
  'Migrated organization ' || o.id || ' to base tier',
  o.id,
  NOW()
FROM organizations o
WHERE o.tier = 'base'
AND o.created_at < '2026-02-03';

-- ====================================================================
-- VERIFICATION QUERY
-- ====================================================================
-- This query should return 0 after migration completes
-- SELECT COUNT(*) AS orgs_without_tier FROM organizations WHERE tier IS NULL;

-- ====================================================================
-- COMMENTS
-- ====================================================================
COMMENT ON TABLE organizations IS 'Organization profile with tier configuration. Existing organizations migrated to "base" tier on 2026-02-03. Grandfathering option available (legacy_premium) by uncommenting OPTION 2 in this migration.';

-- ====================================================================
-- ROLLBACK PLAN (if migration causes issues)
-- ====================================================================
-- If migration causes production outage, run:
-- UPDATE organizations SET tier = 'premium' WHERE created_at < '2026-02-03';
-- This restores all existing users to premium access
-- Migration 014: Add Monthly Usage Reset Cron Job
-- EventFlow AI v2.1 - SaaS Tier Structure
-- Date: 2026-02-03

-- ====================================================================
-- PG_CRON: Reset Monthly Usage Counters
-- ====================================================================
-- Schedule: 1st of every month at 00:00 UTC
SELECT cron.schedule('reset-monthly-usage-limits', '0 0 1 * *', $$
  -- Reset usage counters to zero for all organizations
  UPDATE organizations
  SET
    current_usage = jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(
              jsonb_set(
                '{}',
                '{events_count}',
                0::jsonb
              ),
              '{participants_count}',
              0::jsonb
            ),
            '{messages_sent}',
            0::jsonb
          ),
          '{ai_messages_sent}',
          0::jsonb
        ),
        '{warned_this_month}',
        false::jsonb
      ),
      '{period_start}',
      to_jsonb(date_trunc('month', NOW()))
    ),
    '{period_end}',
    to_jsonb(date_trunc('month', NOW()) + INTERVAL '1 month')
    ),
    updated_at = NOW()
  WHERE tier != 'premium';  -- Only reset Base and legacy tiers (Premium has unlimited)

  -- Log reset operation
  INSERT INTO admin_logs (action, details, created_at)
  VALUES (
    'monthly_usage_reset',
    'Reset usage counters for ' || (SELECT COUNT(*) FROM organizations WHERE tier != 'premium') || ' organizations',
    NOW()
  );

$$);

-- ====================================================================
-- SOFT LIMIT WARNING CRON (Check Daily at 09:00)
-- ====================================================================
SELECT cron.schedule('check-soft-limits', '0 9 * * *', $$
  -- Check all Base tier organizations for 80% usage
  INSERT INTO notifications (user_id, organization_id, type, message, data, read, created_at)
  SELECT
    up.user_id,
    o.id,
    'usage_warning',
    'הגעת ל-80% מהמגבלה החודשית שלך. שדרג לפרימיום עבור גישה ללא הגבלה.',
    jsonb_build_object(
      'quota_type', 'events',
      'current', (o.current_usage->>'events_count')::int,
      'limit', (o.tier_limits->>'events_per_year')::int,
      'percentage', ROUND(
        ((o.current_usage->>'events_count')::int / (o.tier_limits->>'events_per_year')::int * 100)::numeric,
        1
      )
    ) AS data,
    false,
    NOW()
  FROM organizations o
  JOIN user_profiles up ON o.id = up.organization_id
  CROSS JOIN LATERAL (
    SELECT id AS user_id FROM user_profiles WHERE organization_id = o.id AND role = 'admin' LIMIT 1
  ) up
  WHERE
    o.tier = 'base'
    AND ((o.current_usage->>'events_count')::int / (o.tier_limits->>'events_per_year')::int * 100) >= 80
    AND (o.current_usage->>'warned_this_month') IS NOT TRUE;

  -- Mark as warned
  UPDATE organizations
  SET current_usage = jsonb_set(current_usage, '{warned_this_month}', true::jsonb)
  WHERE tier = 'base'
  AND ((current_usage->>'events_count')::int / (tier_limits->>'events_per_year')::int * 100) >= 80;

$$);

-- ====================================================================
-- VERIFICATION QUERIES
-- ====================================================================
-- Check if cron jobs are scheduled
-- SELECT * FROM cron.job WHERE jobname IN ('reset-monthly-usage-limits', 'check-soft-limits');

-- Check next run times
-- SELECT jobname, next_run FROM cron.job_run_details ORDER BY next_run;

-- ====================================================================
-- COMMENTS
-- ====================================================================
COMMENT ON TABLE admin_logs IS 'Audit trail for admin operations and automated jobs. Usage reset cron logs here.';

COMMENT ON TABLE notifications IS 'User notifications (in-app, email, WhatsApp). Usage warnings inserted here by check-soft-limits cron.';

-- ====================================================================
-- ROLLBACK PLAN (if cron jobs cause issues)
-- ====================================================================
-- To disable cron jobs:
-- SELECT cron.unschedule('reset-monthly-usage-limits');
-- SELECT cron.unschedule('check-soft-limits');

-- To manually reset usage:
-- UPDATE organizations
--   SET current_usage = jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set('{}', '{events_count}', 0), '{participants_count}', 0), '{messages_sent}', 0), '{ai_messages_sent}', 0), '{period_start}', to_jsonb(date_trunc('month', NOW())), '{period_end}', to_jsonb(date_trunc('month', NOW()) + INTERVAL '1 month'));
