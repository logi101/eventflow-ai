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
