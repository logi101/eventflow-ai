-- Migration 015: Add Soft Limit Warnings (pg_cron Job)
-- EventFlow AI v2.1 - SaaS Tier Structure
-- Date: 2026-02-04

-- ====================================================================
-- 1. FUNCTION: Send Soft Limit Warning
-- ====================================================================

-- Function to check if Base tier organization is at 80% usage and send warning
CREATE OR REPLACE FUNCTION send_soft_limit_warning()
RETURNS void AS $$
DECLARE
  v_notify_count INTEGER;
  v_notification_id UUID;
BEGIN
  -- Check all Base tier organizations
  INSERT INTO notifications (user_id, organization_id, type, message, data, read, created_at)
  SELECT
    up.user_id,
    o.id,
    'usage_warning',
    jsonb_build_object(
      'quota_type', 'events',
      'current', (o.current_usage->>'events_count')::INTEGER,
      'limit', (o.tier_limits->>'events_per_year')::INTEGER,
      'percentage', ROUND(
        ((o.current_usage->>'events_count')::NUMERIC / (o.tier_limits->>'events_per_year')::NUMERIC) * 100)::NUMERIC,
        1
      )
    ) AS data,
    false,
    NOW()
  FROM organizations o
  CROSS JOIN LATERAL (
    SELECT id AS user_id
    FROM user_profiles up
    WHERE up.organization_id = o.id
    AND up.role = 'admin'
    LIMIT 1
  ) up
  WHERE
    o.tier = 'base'
    AND (o.current_usage->>'warned_this_month')::BOOLEAN IS NOT TRUE
    AND (
      -- Check events quota (80% threshold)
      ((o.current_usage->>'events_count')::INTEGER * 100) / (o.tier_limits->>'events_per_year')::INTEGER) >= 80
      
      -- Check participants quota (80% threshold)
      OR ((o.current_usage->>'participants_count')::INTEGER * 100) / (o.tier_limits->>'participants_per_event')::INTEGER) >= 80
      
      -- Check messages quota (80% threshold)
      OR ((o.current_usage->>'messages_sent')::INTEGER * 100) / (o.tier_limits->>'messages_per_month')::INTEGER) >= 80
      
      -- Check AI messages quota (80% threshold)
      OR ((o.current_usage->>'ai_messages_sent')::INTEGER * 100) / (o.tier_limits->>'ai_chat_messages_per_month')::INTEGER) >= 80
    )
  ON CONFLICT DO NOTHING
  RETURNING notification.id;

  -- Update organizations to mark as warned
  GET DIAGNOSTICS v_notify_count = ROW_COUNT;
  
  IF v_notify_count > 0 THEN
    UPDATE organizations
    SET current_usage = jsonb_set(current_usage, '{warned_this_month}', 'true'::JSONB)
    WHERE id IN (
      SELECT DISTINCT o.id
      FROM organizations o
      WHERE o.tier = 'base'
      AND (o.current_usage->>'warned_this_month')::BOOLEAN IS NOT TRUE
      AND (
        ((o.current_usage->>'events_count')::INTEGER * 100) / (o.tier_limits->>'events_per_year')::INTEGER) >= 80
        OR ((o.current_usage->>'participants_count')::INTEGER * 100) / (o.tier_limits->>'participants_per_event')::INTEGER) >= 80
        OR ((o.current_usage->>'messages_sent')::INTEGER * 100) / (o.tier_limits->>'messages_per_month')::INTEGER) >= 80
        OR ((o.current_usage->>'ai_messages_sent')::INTEGER * 100) / (o.tier_limits->>'ai_chat_messages_per_month')::INTEGER) >= 80
      )
    );
    
    -- Log to admin_logs
    INSERT INTO admin_logs (action, details, created_at)
    VALUES (
      'soft_limit_warnings_sent',
      jsonb_build_object(
        'warnings_sent', v_notify_count,
        'quota_type', 'soft_limit_80_percent',
        'timestamp', NOW()
      ),
      NOW()
    );
    
    RAISE NOTICE 'Soft limit warnings sent to % organizations', v_notify_count;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ====================================================================
-- 2. FUNCTION: Check Soft Limits (for manual testing)
-- ====================================================================

-- Function to manually check soft limits without sending notifications
CREATE OR REPLACE FUNCTION check_soft_limits()
RETURNS TABLE(
  organization_id UUID,
  organization_name TEXT,
  tier TEXT,
  quota_type TEXT,
  current_usage INTEGER,
  limit INTEGER,
  percentage NUMERIC,
  at_80_percent BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id AS organization_id,
    o.name AS organization_name,
    o.tier,
    'events' AS quota_type,
    (o.current_usage->>'events_count')::INTEGER AS current_usage,
    (o.tier_limits->>'events_per_year')::INTEGER AS "limit",
    ROUND(
      ((o.current_usage->>'events_count')::NUMERIC / (o.tier_limits->>'events_per_year')::NUMERIC) * 100)::NUMERIC,
      1
    ) AS percentage,
    ((o.current_usage->>'events_count')::INTEGER * 100) / (o.tier_limits->>'events_per_year')::INTEGER) >= 80 AS at_80_percent
  FROM organizations o
  WHERE o.tier = 'base'
  ORDER BY percentage DESC;
END;
$$ LANGUAGE plpgsql;

-- ====================================================================
-- 3. SCHEDULE PG_CRON JOB
-- ====================================================================

-- Schedule soft limit warning check to run daily at 09:00 UTC
SELECT cron.schedule(
  'check-soft-limits',
  '0 9 * * *',  -- Every day at 09:00 UTC
  $$SELECT send_soft_limit_warning();$$
);

-- ====================================================================
-- 4. VERIFICATION QUERIES
-- ====================================================================

-- Query 1: Check if cron job is scheduled
SELECT * FROM cron.job WHERE jobname = 'check-soft-limits';

-- Query 2: Check next run time
SELECT jobname, next_run FROM cron.job_run_details 
WHERE jobname = 'check-soft-limits'
ORDER BY next_run ASC
LIMIT 1;

-- Query 3: Get all Base tier organizations with current usage
SELECT
  id,
  name,
  tier,
  (current_usage->>'events_count')::INTEGER as events_used,
  (tier_limits->>'events_per_year')::INTEGER as events_limit,
  (current_usage->>'participants_count')::INTEGER as participants_used,
  (tier_limits->>'participants_per_event')::INTEGER as participants_limit,
  (current_usage->>'messages_sent')::INTEGER as messages_used,
  (tier_limits->>'messages_per_month')::INTEGER as messages_limit,
  (current_usage->>'ai_messages_sent')::INTEGER as ai_messages_used,
  (tier_limits->>'ai_chat_messages_per_month')::INTEGER as ai_messages_limit,
  (current_usage->>'warned_this_month')::BOOLEAN as warned
FROM organizations
WHERE tier = 'base';

-- Query 4: Check soft limits (80% threshold)
SELECT * FROM check_soft_limits();

-- Query 5: Check notifications for warnings
SELECT
  n.id,
  n.type,
  n.message,
  n.data,
  n.read,
  n.created_at
FROM notifications n
WHERE n.type = 'usage_warning'
ORDER BY n.created_at DESC
LIMIT 20;

-- ====================================================================
-- 5. COMMENTS
-- ====================================================================

COMMENT ON FUNCTION send_soft_limit_warning() IS 'Checks Base tier organizations for 80% usage threshold and sends in-app notifications. Sets warned_this_month = true to prevent duplicate warnings. Runs via pg_cron daily at 09:00 UTC.';

COMMENT ON FUNCTION check_soft_limits() IS 'Manually checks soft limits (80% threshold) for Base tier organizations. Returns table with org_id, name, tier, quota_type, current_usage, limit, percentage, at_80_percent. For testing only.';

COMMENT ON TABLE organizations IS 'Organization profile with tier configuration. Soft limit warnings (80% threshold) sent via pg_cron job "check-soft-limits" at 09:00 UTC daily. Sets warned_this_month flag to prevent duplicate warnings.';

-- ====================================================================
-- 6. DEPLOYMENT CHECKLIST
-- ====================================================================

/*
Pre-Deployment:
[ ] Test send_soft_limit_warning() function manually
[ ] Test check_soft_limits() function
[ ] Verify notifications table exists with proper schema
[ ] Verify organizations have tier_limits and current_usage
[ ] Check current Base tier usage before running cron
[ ] Schedule deployment for 09:00 UTC (non-disruptive)

Deployment:
[ ] Run migration in Supabase SQL Editor
[ ] Verify cron job is scheduled: SELECT * FROM cron.job WHERE jobname = 'check-soft-limits'
[ ] Check next run time: SELECT next_run FROM cron.job_run_details WHERE jobname = 'check-soft-limits'
[ ] Monitor first run logs
[ ] Verify notifications sent to admin users
[ ] Verify warned_this_month flag set

Post-Deployment:
[ ] Test manual check: SELECT * FROM check_soft_limits()
[ ] Verify warnings appear in UI
[ ] Check notifications table for usage_warning entries
[ ] Verify admin_logs entry created
[ ] Monitor next day (should not send duplicate warnings)
[ ] Verify monthly reset clears warned_this_month (migration 014)

Rollback Plan (if issues):
-- To disable cron job: SELECT cron.unschedule('check-soft-limits')
-- To manually reset warned_this_month: UPDATE organizations SET current_usage = jsonb_set(current_usage, '{warned_this_month}', 'false'::JSONB) WHERE tier = 'base'
-- To remove sent notifications: DELETE FROM notifications WHERE type = 'usage_warning' AND created_at >= '2026-02-04'
*/

-- ====================================================================
-- 7. MIGRATION COMPLETE
-- ====================================================================

DO $$
BEGIN
  RAISE NOTICE '✓ Migration 015 complete: Soft limit warnings system added';
  RAISE NOTICE '  - send_soft_limit_warning() function created';
  RAISE NOTICE '  - check_soft_limits() testing function created';
  RAISE NOTICE '  - pg_cron job scheduled: check-soft-limits at 09:00 UTC daily';
  RAISE NOTICE '  - Checks 80% threshold for Base tier';
  RAISE NOTICE '  - Sets warned_this_month = true to prevent duplicates';
  RAISE NOTICE '  - Integration with notifications table';
  RAISE NOTICE '  - Admin logging for audit trail';
  RAISE NOTICE '';
  RAISE NOTICE '  Manual testing:';
  RAISE NOTICE '    SELECT * FROM check_soft_limits();';
  RAISE NOTICE '';
  RAISE NOTICE '  Verification:';
  RAISE NOTICE '    SELECT * FROM cron.job WHERE jobname = ''check-soft-limits'';';
  RAISE NOTICE '    SELECT * FROM notifications WHERE type = ''usage_warning'' ORDER BY created_at DESC LIMIT 10;';
END $$;
