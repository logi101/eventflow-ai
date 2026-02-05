-- Migration 013: Migrate Existing Organizations to Base Tier
-- EventFlow AI v2.1 - SaaS Tier Structure
-- Date: 2026-02-04

-- ====================================================================
-- DECISION POINT: Grandfathering Strategy
-- ====================================================================
-- OPTION 1: Simple Migration (All orgs → Base) - DEFAULT
-- UPDATE organizations SET tier = 'base' WHERE tier IS NULL;

-- OPTION 2: Grandfathering (Old orgs → Legacy Premium for 6-12 months)
-- Uncomment the following lines for grandfathering strategy:
-- UPDATE organizations SET tier = 'legacy_premium' WHERE tier IS NULL AND created_at < '2026-02-03';
-- UPDATE organizations SET tier = 'base' WHERE tier IS NULL AND created_at >= '2026-02-03';
-- ALTER TABLE organizations ADD COLUMN IF NOT EXISTS legacy_expires_at TIMESTAMPTZ;
-- UPDATE organizations SET legacy_expires_at = NOW() + INTERVAL '6 months' WHERE tier = 'legacy_premium';

-- ====================================================================
-- DEFAULT: Simple Migration (OPTION 1)
-- ====================================================================
-- Set all existing organizations without a tier to 'base'
UPDATE organizations
SET
  tier = 'base',
  tier_updated_at = NOW()
WHERE tier IS NULL;

-- ====================================================================
-- MIGRATION LOGGING
-- ====================================================================
-- Log migration completion to admin_logs (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_logs') THEN
    INSERT INTO admin_logs (action, details, created_at)
    SELECT
      'migration_013_tier_base_migration',
      'Migrated organization ' || o.id || ' to base tier. Total orgs migrated: ' || (SELECT COUNT(*) FROM organizations WHERE tier = 'base'),
      NOW()
    FROM organizations o
    WHERE o.tier = 'base'
    AND o.created_at < '2026-02-04';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not log migration: %', SQLERRM;
END $$;

-- ====================================================================
-- VERIFICATION QUERY
-- ====================================================================
-- This query should return 0 after migration completes
SELECT
  COUNT(*) AS orgs_without_tier
FROM organizations
WHERE tier IS NULL;

-- ====================================================================
-- ADMIN QUERIES (Post-Migration Tracking)
-- ====================================================================

-- Query 1: Count Base tier organizations
-- מספר ארגונים בתוכנית בסיס
SELECT
  COUNT(*) AS base_tier_count
FROM organizations
WHERE tier = 'base';

-- Query 2: Count Legacy Premium organizations (if grandfathering enabled)
-- מספר ארגונים בפרימיום לגיטסי
SELECT
  COUNT(*) AS legacy_premium_count,
  MIN(legacy_expires_at) AS earliest_expiration,
  MAX(legacy_expires_at) AS latest_expiration
FROM organizations
WHERE tier = 'legacy_premium';

-- Query 3: Find grandfathered orgs approaching expiration (within 30 days)
-- ארגונים שתוקף הפרימיום שלהם עומדת לפוג (30 ימים)
SELECT
  id,
  name,
  legacy_expires_at,
  legacy_expires_at - NOW() AS days_remaining
FROM organizations
WHERE
  tier = 'legacy_premium'
  AND legacy_expires_at - NOW() < INTERVAL '30 days'
ORDER BY legacy_expires_at ASC;

-- Query 4: Identify expired legacy Premium orgs
-- ארגונים שתוקף הפרימיום שלהם פגה
SELECT
  id,
  name,
  legacy_expires_at,
  NOW() - legacy_expires_at AS days_expired
FROM organizations
WHERE
  tier = 'legacy_premium'
  AND legacy_expires_at < NOW()
ORDER BY legacy_expires_at DESC;

-- ====================================================================
-- EMAIL TEMPLATE: Tier Structure Announcement
-- ====================================================================

/*
Subject: חדש ב-EventFlow: תכנית פרימיום חדשה 🎉

שלום {user_name},

אנחנו שמחים להודיע על השקת תכניות מנוי חדשות ב-EventFlow!

📦 תכנית בסיס:
- 5 אירועים בשנה
- 100 משתתפים לאירוע
- 200 הודעות בחודש
- ניהול אירועים בסיסי

⭐ תכנית פרימיום:
- אירועים ללא הגבלה
- משתתפים ללא הגבלה
- הודעות ללא הגבלה
- צ'אט AI חכם
- סימולציית יום
- נטוורקינג חכם
- מנוע תקציב
- התראות תקציב
- ניתוח ספקים

🎁 התוכנית שלך קיבלה גישה לתוכנית בסיס עכשיו!

לשדרוג לפרימיום, יש לפנות לצורת התקשרות התמיכה:
support@eventflow.ai

בתודה,
צוות EventFlow
*/

-- ====================================================================
-- DEPLOYMENT CHECKLIST
-- ====================================================================

/*
Pre-Deployment:
[ ] Test migration on staging database
[ ] Count current organizations: SELECT COUNT(*) FROM organizations;
[ ] Backup organizations table: pg_dump -t organizations
[ ] Choose migration option (simple vs grandfathering)
[ ] Prepare email campaign (optional: send after migration)
[ ] Schedule maintenance window (non-peak hours recommended)

Deployment:
[ ] Deploy during non-peak hours (e.g., 2-4 AM)
[ ] Run migration in Supabase SQL Editor
[ ] Verify no NULL tiers: SELECT COUNT(*) FROM organizations WHERE tier IS NULL;
[ ] Check Base tier count: SELECT COUNT(*) FROM organizations WHERE tier = 'base';
[ ] Check Legacy Premium count (if applicable): SELECT COUNT(*) FROM organizations WHERE tier = 'legacy_premium';
[ ] Monitor application logs for errors
[ ] Verify application loads without errors

Post-Deployment:
[ ] Test Base tier user (should see upgrade prompts for Premium features)
[ ] Test Premium tier user (should see all features)
[ ] Send email announcement (optional)
[ ] Create ticket in support system for tier-related questions
[ ] Monitor user feedback and support tickets
[ ] Update documentation with tier structure info

Rollback Plan (if issues):
[ ] If migration causes production outage, run immediately:
[ ] UPDATE organizations SET tier = 'premium' WHERE created_at < '2026-02-03';
[ ] This temporarily grants Premium to all existing users while investigating
[ ] Contact engineering team for assistance
[ ] Document issues and resolution steps
*/

-- ====================================================================
-- COMMENTS
-- ====================================================================
COMMENT ON TABLE organizations IS 'Organization profile with tier configuration. Existing organizations migrated to "base" tier on 2026-02-04. Grandfathering option available (legacy_premium) by uncommenting OPTION 2 in this migration.';

-- ====================================================================
-- MIGRATION COMPLETE
-- ====================================================================

DO $$
BEGIN
  RAISE NOTICE '✓ Migration 013 complete: Existing organizations migrated to Base tier';
  RAISE NOTICE '  - All organizations with NULL tier set to "base"';
  RAISE NOTICE '  - Migration logged to admin_logs table';
  RAISE NOTICE '  - Admin queries provided for tracking';
  RAISE NOTICE '  - Email template provided for announcement';
  RAISE NOTICE '  - Deployment checklist provided';
  RAISE NOTICE '';
  RAISE NOTICE '  Grandfathering option available (legacy_premium with 6-month expiration)';
  RAISE NOTICE '  - Uncomment OPTION 2 section for grandfathering strategy';
  RAISE NOTICE '  - Adds legacy_expires_at column for expiration tracking';
END $$;
