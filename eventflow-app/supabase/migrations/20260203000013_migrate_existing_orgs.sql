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
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_logs') THEN
    INSERT INTO admin_logs (action, details, organization_id, created_at)
    SELECT
      'migration_010_tier_columns',
      'Migrated organization ' || o.id || ' to base tier',
      o.id,
      NOW()
    FROM organizations o
    WHERE o.tier = 'base'
    AND o.created_at < '2026-02-03';
  END IF;
END $$;

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
