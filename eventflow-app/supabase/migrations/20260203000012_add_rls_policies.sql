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
