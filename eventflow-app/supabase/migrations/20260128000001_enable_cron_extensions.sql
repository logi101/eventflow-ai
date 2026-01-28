-- =====================================================
-- Enable PostgreSQL Extensions for Scheduler System
-- =====================================================
--
-- IMPORTANT: Extensions must be enabled via Supabase Dashboard BEFORE running this migration
--
-- Required Steps (Dashboard -> Database -> Extensions):
-- 1. Enable pg_cron   - PostgreSQL job scheduler
-- 2. Enable pg_net    - Async HTTP requests for webhooks
-- 3. Enable vault     - Encrypted secret storage
--
-- This migration grants necessary permissions and verifies extensions are enabled.
-- =====================================================

-- Grant cron schema permissions to postgres user
-- Needed for creating and managing scheduled jobs
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Grant net schema permissions for HTTP requests
GRANT USAGE ON SCHEMA net TO postgres;

-- Grant vault permissions for secure credential storage
GRANT USAGE ON SCHEMA vault TO postgres;

-- =====================================================
-- Verification: Extensions must be enabled
-- =====================================================
-- This block will FAIL with helpful error if extensions are missing
-- Run extension enablement via Dashboard before executing this migration

DO $$
BEGIN
  -- Check pg_cron extension
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE EXCEPTION 'pg_cron extension not enabled. Enable via Supabase Dashboard: Database -> Extensions -> pg_cron';
  END IF;

  -- Check pg_net extension
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    RAISE EXCEPTION 'pg_net extension not enabled. Enable via Supabase Dashboard: Database -> Extensions -> pg_net';
  END IF;

  -- Check vault extension
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vault') THEN
    RAISE EXCEPTION 'vault extension not enabled. Enable via Supabase Dashboard: Database -> Extensions -> vault';
  END IF;

  RAISE NOTICE 'All required extensions verified: pg_cron, pg_net, vault';
END $$;

-- =====================================================
-- Verification Queries (run after migration)
-- =====================================================
-- Check extensions are enabled:
-- SELECT extname, extversion FROM pg_extension WHERE extname IN ('pg_cron', 'pg_net', 'vault');
--
-- Check cron schema access:
-- SELECT has_schema_privilege('postgres', 'cron', 'USAGE');
