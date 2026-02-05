-- Migration 014: Add Monthly Usage Reset Cron Job
-- EventFlow AI v2.1 - SaaS Tier Structure
-- Date: 2026-02-04

-- ====================================================================
-- 1. CREATE admin_logs TABLE (if not exists)
-- ====================================================================
CREATE TABLE IF NOT EXISTS admin_logs (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Action details
  action TEXT NOT NULL,  -- 'monthly_reset', 'migration_010', 'tier_change', etc.
  details JSONB,  -- Flexible logging with structured data
  
  -- Audit trail
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES user_profiles(id),
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for querying
CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON admin_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_logs_organization ON admin_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at DESC);

-- ====================================================================
-- 2. RESET MONTHLY USAGE FUNCTION
-- ====================================================================

-- Function: Reset monthly usage counters for all organizations
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS void AS $$
DECLARE
  v_org_count INTEGER;
  v_period_start TEXT;
  v_period_end TEXT;
BEGIN
  -- Calculate new billing period
  v_period_start := date_trunc('month', NOW())::TEXT;
  v_period_end := (date_trunc('month', NOW()) + INTERVAL '1 month')::TEXT;
  
  -- Reset usage counters for ALL organizations (including Premium for consistency)
  UPDATE organizations
  SET
    current_usage = jsonb_build_object(
      'events_count', 0,
      'participants_count', 0,
      'messages_sent', 0,
      'ai_messages_sent', 0,
      'period_start', v_period_start,
      'period_end', v_period_end,
      'warned_this_month', false
    ),
    updated_at = NOW()
  WHERE tier IS NOT NULL;
  
  -- Get count of updated organizations
  GET DIAGNOSTICS v_org_count = ROW_COUNT;
  
  -- Log reset operation
  INSERT INTO admin_logs (action, details, created_at)
  VALUES (
    'monthly_reset',
    jsonb_build_object(
      'organizations_reset', v_org_count,
      'period_start', v_period_start,
      'period_end', v_period_end
    ),
    NOW()
  );
  
  RAISE NOTICE 'Monthly usage reset completed for % organizations', v_org_count;
END;
$$ LANGUAGE plpgsql;

-- ====================================================================
-- 3. SCHEDULE PG_CRON JOB
-- ====================================================================

-- Schedule monthly reset for 1st of each month at 00:00 UTC
SELECT cron.schedule(
  'reset-monthly-usage-limits',
  '0 0 1 * *',  -- minute=0, hour=0, day=1, every month, every weekday
  $$SELECT reset_monthly_usage();$$
);

-- ====================================================================
-- 4. MANUAL TESTING FUNCTION
-- ====================================================================

-- Function: Test reset logic without waiting for cron
CREATE OR REPLACE FUNCTION test_monthly_reset()
RETURNS TABLE(
  id UUID,
  name TEXT,
  events_count INTEGER,
  participants_count INTEGER,
  messages_sent INTEGER,
  ai_messages_sent INTEGER,
  period_start TEXT,
  period_end TEXT
) AS $$
BEGIN
  -- Run reset
  PERFORM reset_monthly_usage();
  
  -- Return updated organizations for verification
  RETURN QUERY
  SELECT
    o.id,
    o.name,
    (o.current_usage->>'events_count')::INTEGER as events_count,
    (o.current_usage->>'participants_count')::INTEGER as participants_count,
    (o.current_usage->>'messages_sent')::INTEGER as messages_sent,
    (o.current_usage->>'ai_messages_sent')::INTEGER as ai_messages_sent,
    o.current_usage->>'period_start' as period_start,
    o.current_usage->>'period_end' as period_end
  FROM organizations o
  ORDER BY o.created_at DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- ====================================================================
-- 5. MONITORING QUERIES
-- ====================================================================

-- Query 1: Check if monthly reset ran this month
-- בדוק אם איפוס חודשי רץ החודש
SELECT
  action,
  details->>'organizations_reset' as orgs_reset,
  details->>'period_start' as period_start,
  created_at
FROM admin_logs
WHERE
  action = 'monthly_reset'
  AND created_at >= date_trunc('month', NOW())
ORDER BY created_at DESC
LIMIT 1;

-- Query 2: Check cron job status
-- בדוק סטטוס משימות cron
SELECT * FROM cron.job WHERE jobname = 'reset-monthly-usage-limits';

-- Query 3: Check cron job run history
-- היסטורית ריצת משימות cron
SELECT
  jobname,
  start_time,
  end_time,
  status,
  return_message
FROM cron.job_run_details
WHERE jobname = 'reset-monthly-usage-limits'
ORDER BY start_time DESC
LIMIT 5;

-- Query 4: Identify organizations with stale period dates (reset didn't run)
-- ארגונים עם תאריכי תקופה ישנים (איפוס לא רץ)
SELECT
  id,
  name,
  tier,
  current_usage->>'period_start' as period_start,
  current_usage->>'period_end' as period_end,
  (current_usage->>'period_end')::TIMESTAMPTZ < date_trunc('month', NOW()) as is_stale
FROM organizations
WHERE
  (current_usage->>'period_end')::TIMESTAMPTZ < date_trunc('month', NOW())
ORDER BY created_at DESC
LIMIT 20;

-- Query 5: Count organizations by tier with current usage
-- ספירת ארגונים לפי טיר עם שימוש נוכחי
SELECT
  tier,
  COUNT(*) as count,
  AVG((current_usage->>'events_count')::INTEGER) as avg_events,
  AVG((current_usage->>'participants_count')::INTEGER) as avg_participants,
  AVG((current_usage->>'messages_sent')::INTEGER) as avg_messages,
  AVG((current_usage->>'ai_messages_sent')::INTEGER) as avg_ai_messages
FROM organizations
GROUP BY tier
ORDER BY tier;

-- ====================================================================
-- 6. VERIFICATION QUERIES
-- ====================================================================

-- Verify 1: Check cron job is scheduled
-- וודא שמשימת cron מתוזמנת
SELECT * FROM cron.job WHERE jobname = 'reset-monthly-usage-limits';

-- Verify 2: Check next run time
-- וודא זמן הריצה הבא
SELECT jobname, next_run FROM cron.job_run_details
WHERE jobname = 'reset-monthly-usage-limits'
ORDER BY next_run ASC
LIMIT 1;

-- Verify 3: Manual test (returns 10 orgs with zeroed counters)
-- בדיקה ידנית (מחזיר 10 ארגונים עם נתונים מאופסים)
-- SELECT * FROM test_monthly_reset();

-- ====================================================================
-- 7. COMMENTS
-- ====================================================================

COMMENT ON FUNCTION reset_monthly_usage() IS 'Resets monthly usage counters for all organizations. Sets events_count, participants_count, messages_sent, ai_messages_sent to 0. Updates period_start and period_end to new billing cycle. Resets warned_this_month to false. Logs operation to admin_logs.';

COMMENT ON FUNCTION test_monthly_reset() IS 'Test function for monthly reset. Runs reset_monthly_usage() and returns updated organizations for verification. Safe to run for testing without waiting for scheduled cron.';

COMMENT ON TABLE admin_logs IS 'Audit trail for admin operations and automated jobs. Monthly reset cron logs here. Tracks action, details, organization, and timestamp.';

COMMENT ON TABLE organizations IS 'Organization profile with tier configuration. current_usage JSONB contains monthly counters reset by pg_cron on 1st of each month.';

-- ====================================================================
-- 8. DEPLOYMENT CHECKLIST
-- ====================================================================

/*
Pre-Deployment:
[ ] Verify pg_cron extension is enabled: SELECT * FROM pg_extension WHERE extname = 'pg_cron';
[ ] Test reset_monthly_usage() function manually on staging
[ ] Verify current_usage structure is correct: SELECT current_usage FROM organizations LIMIT 1;
[ ] Test test_monthly_usage() returns correct results
[ ] Choose deployment time (non-peak hours recommended)
[ ] Backup admin_logs table: pg_dump -t admin_logs

Deployment:
[ ] Run migration in Supabase SQL Editor
[ ] Verify cron job is scheduled: SELECT * FROM cron.job WHERE jobname = 'reset-monthly-usage-limits';
[ ] Check next run time: SELECT next_run FROM cron.job_run_details WHERE jobname = 'reset-monthly-usage-limits';
[ ] Monitor application logs for errors
[ ] Verify admin_logs table is created and has indexes

Post-Deployment:
[ ] Test manual reset: SELECT * FROM test_monthly_reset();
[ ] Verify counters are zeroed for all orgs
[ ] Verify period dates are updated to current month
[ ] Verify reset is logged to admin_logs
[ ] Monitor first scheduled run (1st of next month)
[ ] Check admin_logs for reset entry
[ ] Verify next month's run is scheduled

Rollback Plan (if issues):
-- To disable cron job: SELECT cron.unschedule('reset-monthly-usage-limits');
-- To manually reset: UPDATE organizations SET current_usage = jsonb_set(current_usage, '{events_count}', 0);
-- To restore previous period: UPDATE organizations SET current_usage = '...' (backup needed)
*/

-- ====================================================================
-- 9. MIGRATION COMPLETE
-- ====================================================================

DO $$
BEGIN
  RAISE NOTICE '✓ Migration 014 complete: Monthly usage reset cron job created';
  RAISE NOTICE '  - admin_logs table created for audit trail';
  RAISE NOTICE '  - reset_monthly_usage() function created';
  RAISE NOTICE '  - test_monthly_reset() function created for manual testing';
  RAISE NOTICE '  - pg_cron job scheduled: 1st of each month at 00:00 UTC';
  RAISE NOTICE '  - All organizations reset (including Premium for consistency)';
  RAISE NOTICE '  - Monitoring queries provided for tracking';
  RAISE NOTICE '';
  RAISE NOTICE '  Manual testing:';
  RAISE NOTICE '    SELECT * FROM test_monthly_reset();';
  RAISE NOTICE '';
  RAISE NOTICE '  Verification:';
  RAISE NOTICE '    SELECT * FROM cron.job WHERE jobname = ''reset-monthly-usage-limits'';';
  RAISE NOTICE '    SELECT next_run FROM cron.job_run_details WHERE jobname = ''reset-monthly-usage-limits'';';
END $$;
