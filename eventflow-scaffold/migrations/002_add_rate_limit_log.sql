-- ═══════════════════════════════════════════════════════════════════════════
-- Rate Limit Log Table
-- Used for tracking API request rates
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS rate_limit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  endpoint text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for efficient querying by identifier, endpoint, and time
CREATE INDEX IF NOT EXISTS idx_rate_limit_log_lookup
  ON rate_limit_log (identifier, endpoint, created_at);

-- Auto-cleanup: Delete old rate limit entries (keep only last 1 hour)
CREATE OR REPLACE FUNCTION cleanup_rate_limit_log()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM rate_limit_log
  WHERE created_at < now() - interval '1 hour';
END;
$$;

-- Schedule cleanup (run every 5 minutes via pg_cron if available)
-- Note: pg_cron must be enabled in Supabase dashboard
-- SELECT cron.schedule('cleanup-rate-limit', '*/5 * * * *', 'SELECT cleanup_rate_limit_log()');

-- Grant access to service role only (internal use)
ALTER TABLE rate_limit_log ENABLE ROW LEVEL SECURITY;

-- Only service role can access (Edge Functions use service role)
DROP POLICY IF EXISTS "Service role only" ON rate_limit_log;
CREATE POLICY "Service role only" ON rate_limit_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Comment
COMMENT ON TABLE rate_limit_log IS 'Tracks API requests for rate limiting purposes';
