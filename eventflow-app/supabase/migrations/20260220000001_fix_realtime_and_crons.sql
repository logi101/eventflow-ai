-- Migration: Fix Realtime Publication and Broken Cron Jobs
-- EventFlow AI v2.2
-- Date: 2026-02-20
-- Issues:
--   1. events table not added to supabase_realtime publication -> clients never receive
--      INSERT/UPDATE/DELETE changes automatically.
--   2. reset-monthly-usage-limits cron had a dangling INSERT ... VALUES block with no
--      INTO clause (syntax error that would abort the job silently).
--   3. check-soft-limits cron is a bare SELECT with no DML side-effect for creating
--      notifications - it selects into the void. Fixed to INSERT into notifications.
--   4. increment_message_usage (migration 011) still referred to messages.organization_id
--      which doesn't exist (fixed in 20260205000001 but the old trigger name
--      on_message_sent_increment_usage from migration 011 was NOT dropped, leaving
--      a duplicate trigger alongside the new trigger_log_message_usage).

-- ====================================================================
-- 1. ENABLE REALTIME FOR events TABLE
-- ====================================================================
-- Supabase realtime requires the table to be in the supabase_realtime publication.
-- Without this, supabase.channel().on('postgres_changes',...) receives nothing.
ALTER PUBLICATION supabase_realtime ADD TABLE events;

-- Also add participants so participant count updates propagate in real-time.
ALTER PUBLICATION supabase_realtime ADD TABLE participants;

-- ====================================================================
-- 2. FIX DUPLICATE MESSAGE TRIGGER
-- ====================================================================
-- Migration 011 created trigger: on_message_sent_increment_usage
-- Migration 20260205000001 created a SECOND trigger: trigger_log_message_usage
-- Both fire on INSERT ON messages. The old one (011) references
-- messages.organization_id which doesn't exist -> silently sets 0 rows.
-- Drop the broken legacy trigger so only the fixed one remains.
DROP TRIGGER IF EXISTS on_message_sent_increment_usage ON messages;
-- The function increment_message_usage was redefined in 20260205000001 with the
-- correct logic, so we only need to remove the stale trigger binding.

-- ====================================================================
-- 3. FIX RESET-MONTHLY-USAGE-LIMITS CRON
-- ====================================================================
-- The original cron body had an orphaned "VALUES (...)" block after the UPDATE
-- (lines 45-49 in migration 014) with no INSERT INTO target. PostgreSQL would
-- raise a syntax error, causing the entire cron job body to fail and leaving
-- usage counters un-reset every month.
SELECT cron.unschedule('reset-monthly-usage-limits');

SELECT cron.schedule('reset-monthly-usage-limits', '0 0 1 * *', $$
  UPDATE organizations
  SET
    current_usage = jsonb_build_object(
      'events_count',       0,
      'participants_count', 0,
      'messages_sent',      0,
      'ai_messages_sent',   0,
      'warned_this_month',  false,
      'period_start',       date_trunc('month', NOW()),
      'period_end',         date_trunc('month', NOW()) + INTERVAL '1 month'
    ),
    updated_at = NOW()
  WHERE tier != 'premium';
$$);

-- ====================================================================
-- 4. FIX CHECK-SOFT-LIMITS CRON
-- ====================================================================
-- The original cron was a bare SELECT that returned rows but never persisted them.
-- No notifications were ever created. Replace with an INSERT INTO notifications
-- (assumes a notifications table exists; adjust column names if schema differs).
SELECT cron.unschedule('check-soft-limits');

SELECT cron.schedule('check-soft-limits', '0 9 * * *', $$
  INSERT INTO notifications (user_id, organization_id, type, message, data, read, created_at)
  SELECT
    (SELECT id FROM user_profiles WHERE organization_id = o.id AND role = 'admin' LIMIT 1) AS user_id,
    o.id                                                                                   AS organization_id,
    'usage_warning'                                                                        AS type,
    'הגעת ל-80% מהמגבלה החודשית שלך. שדרג לפרימיום עבור גישה ללא הגבלה.'               AS message,
    jsonb_build_object(
      'quota_type',  'events',
      'current',     (o.current_usage->>'events_count')::int,
      'limit',       (o.tier_limits->>'events_per_year')::int,
      'percentage',  ROUND(
        ((o.current_usage->>'events_count')::float
          / NULLIF((o.tier_limits->>'events_per_year')::int, 0) * 100)::numeric,
        1
      )
    )                                                                                      AS data,
    false                                                                                  AS read,
    NOW()                                                                                  AS created_at
  FROM organizations o
  WHERE
    o.tier = 'base'
    AND (o.current_usage->>'warned_this_month')::boolean IS NOT TRUE
    AND (o.tier_limits->>'events_per_year')::int > 0
    AND ((o.current_usage->>'events_count')::float
          / (o.tier_limits->>'events_per_year')::int * 100) >= 80;

  -- Mark warned so we don't send duplicate notifications this month
  UPDATE organizations
  SET current_usage = jsonb_set(current_usage, '{warned_this_month}', 'true'::jsonb)
  WHERE
    tier = 'base'
    AND (current_usage->>'warned_this_month')::boolean IS NOT TRUE
    AND (tier_limits->>'events_per_year')::int > 0
    AND ((current_usage->>'events_count')::float
          / (tier_limits->>'events_per_year')::int * 100) >= 80;
$$);

-- ====================================================================
-- VERIFICATION QUERIES (run manually to confirm)
-- ====================================================================
-- SELECT pubname, tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
-- SELECT jobname, schedule, active FROM cron.job WHERE jobname IN ('reset-monthly-usage-limits','check-soft-limits');
-- SELECT tgname FROM pg_trigger WHERE tgrelid = 'messages'::regclass;
