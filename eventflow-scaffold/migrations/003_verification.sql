-- ============================================================================
-- 003_verification.sql
-- EventFlow AI - Post-Migration Verification Queries
-- Date: 2026-03-15
--
-- PURPOSE: Pure read-only SELECT queries to verify that 003_comprehensive_fix.sql
--          applied correctly. No writes. Safe to run at any time.
--
-- HOW TO USE:
--   Run each numbered block in the Supabase SQL editor as the postgres role
--   (or authenticated user where noted). Each query includes an "Expected"
--   comment describing the pass condition.
--
-- PASS/FAIL indicators: Each query includes a 'pass_fail' column where
--   possible.  A result of 'PASS' means the check is green.
-- ============================================================================


-- ============================================================================
-- V01: Org-resolver functions exist and are SECURITY DEFINER
-- ============================================================================
-- Expected: 3 rows. All have security_definer = true.
-- ============================================================================
SELECT
    n.nspname                       AS schema,
    p.proname                       AS function_name,
    p.prosecdef                     AS security_definer,
    pg_get_function_result(p.oid)   AS return_type,
    CASE
        WHEN p.prosecdef = true THEN 'PASS'
        ELSE 'FAIL - not SECURITY DEFINER'
    END                             AS pass_fail
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname IN ('user_org_id', 'get_user_org_id', 'user_organization_id')
ORDER BY n.nspname, p.proname;


-- ============================================================================
-- V02: All three functions return the same non-null UUID for the current user
-- ============================================================================
-- Expected: One row, all three values identical, diagnosis = 'PASS'.
-- Run as an authenticated user (not postgres superuser).
-- ============================================================================
SELECT
    auth.user_org_id()              AS auth_user_org_id,
    auth.user_organization_id()     AS auth_user_organization_id,
    public.get_user_org_id()        AS public_get_user_org_id,
    CASE
        WHEN auth.user_org_id() IS NULL
            THEN 'FAIL - auth.user_org_id() is NULL (orphaned user profile?)'
        WHEN auth.user_org_id() != auth.user_organization_id()
            THEN 'FAIL - user_org_id and user_organization_id disagree'
        WHEN auth.user_org_id() != public.get_user_org_id()
            THEN 'FAIL - auth and public versions disagree'
        ELSE 'PASS'
    END                             AS pass_fail;


-- ============================================================================
-- V03: Events table RLS policies — correct count and names
-- ============================================================================
-- Expected: 2 or 3 rows depending on whether public_rsvp_enabled column exists.
--   Always present: authenticated_all_own_org_events, authenticated_select_own_org_events
--   Optional:       anon_select_public_rsvp_events
-- No stale policies (e.g. "Users can view events...", "Public can view active events...")
-- ============================================================================
SELECT
    policyname,
    roles,
    cmd,
    qual        AS using_expression,
    with_check  AS with_check_expression,
    CASE
        WHEN policyname IN (
            'authenticated_all_own_org_events',
            'authenticated_select_own_org_events',
            'anon_select_public_rsvp_events'
        ) THEN 'PASS - expected policy'
        ELSE 'FAIL - unexpected/stale policy found'
    END         AS pass_fail
FROM pg_policies
WHERE tablename  = 'events'
  AND schemaname = 'public'
ORDER BY policyname;


-- ============================================================================
-- V04: Organizations table RLS policies — no data-leaking policies
-- ============================================================================
-- Expected: org_insert_service_role, org_select_own, org_update_admin_only
-- FAIL if "Users can view trial status" (uid IS NOT NULL) still exists.
-- ============================================================================
SELECT
    policyname,
    roles,
    cmd,
    CASE
        WHEN policyname = 'Users can view trial status'
            THEN 'FAIL - leaky policy still present (exposes all orgs to all users)'
        WHEN policyname IN ('org_select_own', 'org_update_admin_only', 'org_insert_service_role')
            THEN 'PASS'
        ELSE 'WARN - unknown policy, review manually'
    END         AS pass_fail
FROM pg_policies
WHERE tablename  = 'organizations'
  AND schemaname = 'public'
ORDER BY policyname;


-- ============================================================================
-- V05: user_profiles — INSERT policy exists (critical for sign-up)
-- ============================================================================
-- Expected: At minimum profiles_insert_own with cmd = 'INSERT' must exist.
-- Without this new users cannot create their profile → organization_id stays NULL.
-- ============================================================================
SELECT
    policyname,
    roles,
    cmd,
    CASE
        WHEN cmd = 'INSERT' THEN 'PASS - INSERT policy present'
        ELSE 'INFO'
    END         AS pass_fail
FROM pg_policies
WHERE tablename  = 'user_profiles'
  AND schemaname = 'public'
ORDER BY cmd, policyname;


-- ============================================================================
-- V06: event_status enum includes 'archived'
-- ============================================================================
-- Expected: A row with enum_value = 'archived'.
-- ============================================================================
SELECT
    t.typname       AS enum_type,
    e.enumlabel     AS enum_value,
    e.enumsortorder AS sort_order,
    CASE
        WHEN e.enumlabel = 'archived' THEN 'PASS - archived present'
        ELSE 'INFO'
    END             AS pass_fail
FROM pg_type t
JOIN pg_enum e ON e.enumtypid = t.oid
WHERE t.typname = 'event_status'
ORDER BY e.enumsortorder;

-- Summary check
SELECT
    CASE
        WHEN EXISTS (
            SELECT 1
            FROM pg_enum e
            JOIN pg_type t ON t.oid = e.enumtypid
            WHERE t.typname = 'event_status' AND e.enumlabel = 'archived'
        ) THEN 'PASS - archived in event_status'
        ELSE 'FAIL - archived missing from event_status'
    END AS archived_enum_check;


-- ============================================================================
-- V07: Orphaned user profiles (NULL organization_id)
-- ============================================================================
-- Expected: 0 rows.  Any row here means that user sees ZERO events.
-- ============================================================================
SELECT
    id          AS user_id,
    email,
    role,
    created_at,
    'FAIL - organization_id is NULL, this user sees no events' AS pass_fail
FROM public.user_profiles
WHERE organization_id IS NULL;

-- Summary
SELECT
    COUNT(*) AS orphaned_profiles,
    CASE
        WHEN COUNT(*) = 0 THEN 'PASS - no orphaned profiles'
        ELSE 'FAIL - ' || COUNT(*) || ' users have NULL organization_id'
    END AS pass_fail
FROM public.user_profiles
WHERE organization_id IS NULL;


-- ============================================================================
-- V08: Cron jobs registered and active
-- ============================================================================
-- Expected: 2 rows, both active = true.
-- ============================================================================
SELECT
    jobname,
    schedule,
    active,
    CASE
        WHEN active = true THEN 'PASS'
        ELSE 'FAIL - cron job is inactive'
    END AS pass_fail
FROM cron.job
WHERE jobname IN ('reset-monthly-usage-limits', 'check-soft-limits')
ORDER BY jobname;

-- Count check
SELECT
    COUNT(*) AS registered_jobs,
    CASE
        WHEN COUNT(*) = 2 THEN 'PASS - both cron jobs registered'
        ELSE 'FAIL - expected 2 cron jobs, found ' || COUNT(*)
    END AS pass_fail
FROM cron.job
WHERE jobname IN ('reset-monthly-usage-limits', 'check-soft-limits');


-- ============================================================================
-- V09: increment_message_usage trigger references correct column
-- ============================================================================
-- Expected: The function body should NOT contain "FROM messages m WHERE m.id = NEW.id"
--           (that was the broken version). It SHOULD contain "FROM events e WHERE e.id = NEW.event_id".
-- ============================================================================
SELECT
    p.proname   AS function_name,
    CASE
        WHEN pg_get_functiondef(p.oid) LIKE '%FROM public.events e%WHERE e.id = NEW.event_id%'
            THEN 'PASS - uses correct event join'
        WHEN pg_get_functiondef(p.oid) LIKE '%FROM messages m WHERE m.id = NEW.id%'
            THEN 'FAIL - still has broken self-join on messages'
        ELSE 'WARN - function body differs from expected, review manually'
    END         AS pass_fail
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'increment_message_usage';


-- ============================================================================
-- V10: increment_ai_message_usage trigger references user_profiles (not org col)
-- ============================================================================
-- Expected: Function body joins user_profiles to resolve org, not
--           ai_chat_sessions.organization_id which doesn't exist.
-- ============================================================================
SELECT
    p.proname   AS function_name,
    CASE
        WHEN pg_get_functiondef(p.oid) LIKE '%JOIN public.user_profiles up%'
            THEN 'PASS - resolves org via user_profiles join'
        WHEN pg_get_functiondef(p.oid) LIKE '%acs.organization_id%'
            THEN 'FAIL - still references non-existent ai_chat_sessions.organization_id'
        ELSE 'WARN - function body differs, review manually'
    END         AS pass_fail
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'increment_ai_message_usage';


-- ============================================================================
-- V11: Table-level GRANTs exist for authenticated role on events
-- ============================================================================
-- Expected: SELECT, INSERT, UPDATE, DELETE all present.
-- ============================================================================
SELECT
    privilege_type,
    grantee,
    CASE
        WHEN privilege_type IN ('SELECT','INSERT','UPDATE','DELETE')
          AND grantee = 'authenticated'
        THEN 'PASS'
        ELSE 'INFO'
    END AS pass_fail
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name   = 'events'
  AND grantee IN ('authenticated', 'anon')
ORDER BY grantee, privilege_type;


-- ============================================================================
-- V12: check_soft_limits() function executes without error
-- ============================================================================
-- Expected: Returns rows or empty set with no runtime error.
-- ============================================================================
SELECT * FROM public.check_soft_limits() LIMIT 1;


-- ============================================================================
-- V13: Events are visible to the current user
-- ============================================================================
-- Run as authenticated user (not postgres superuser).
-- Expected: All events belonging to the current user's org.
--           If 0 rows and the org has events, RLS is still misconfigured.
-- ============================================================================
SELECT
    e.id,
    e.name,
    e.status,
    e.organization_id,
    CASE
        WHEN e.organization_id = auth.user_org_id()
        THEN 'PASS - visible to current user'
        ELSE 'FAIL - org mismatch (should not appear here under correct RLS)'
    END AS pass_fail
FROM public.events e
ORDER BY e.created_at DESC
LIMIT 20;


-- ============================================================================
-- V14: participants and schedules queries return data (not silently empty)
-- ============================================================================
-- Run as authenticated user.
-- Expected: If events have participants, participant_count > 0.
-- ============================================================================
SELECT
    e.id           AS event_id,
    e.name         AS event_name,
    COUNT(p.id)    AS participant_count,
    CASE
        WHEN COUNT(p.id) > 0 THEN 'PASS - participants visible'
        ELSE 'WARN - 0 participants (may be correct if event truly has none)'
    END            AS pass_fail
FROM public.events e
LEFT JOIN public.participants p ON p.event_id = e.id
GROUP BY e.id, e.name
ORDER BY participant_count DESC
LIMIT 10;


-- ============================================================================
-- V15: Overall health summary
-- ============================================================================
SELECT
    'Functions'       AS check_area,
    (
        SELECT COUNT(*)
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE p.proname IN ('user_org_id', 'get_user_org_id', 'user_organization_id')
    )::TEXT           AS result,
    CASE
        WHEN (
            SELECT COUNT(*)
            FROM pg_proc p
            JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE p.proname IN ('user_org_id', 'get_user_org_id', 'user_organization_id')
        ) = 3 THEN 'PASS'
        ELSE 'FAIL'
    END               AS pass_fail

UNION ALL

SELECT
    'event_status archived',
    CASE
        WHEN EXISTS (
            SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
            WHERE t.typname = 'event_status' AND e.enumlabel = 'archived'
        ) THEN 'present' ELSE 'missing'
    END,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
            WHERE t.typname = 'event_status' AND e.enumlabel = 'archived'
        ) THEN 'PASS' ELSE 'FAIL'
    END

UNION ALL

SELECT
    'events policies',
    (SELECT COUNT(*)::TEXT FROM pg_policies WHERE tablename = 'events' AND schemaname = 'public'),
    CASE
        WHEN (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'events' AND schemaname = 'public')
            BETWEEN 2 AND 3 THEN 'PASS'
        ELSE 'FAIL - unexpected policy count'
    END

UNION ALL

SELECT
    'orphaned profiles',
    (SELECT COUNT(*)::TEXT FROM public.user_profiles WHERE organization_id IS NULL),
    CASE
        WHEN (SELECT COUNT(*) FROM public.user_profiles WHERE organization_id IS NULL) = 0
        THEN 'PASS' ELSE 'FAIL'
    END

UNION ALL

SELECT
    'cron jobs',
    (SELECT COUNT(*)::TEXT FROM cron.job WHERE jobname IN ('reset-monthly-usage-limits','check-soft-limits')),
    CASE
        WHEN (SELECT COUNT(*) FROM cron.job WHERE jobname IN ('reset-monthly-usage-limits','check-soft-limits')) = 2
        THEN 'PASS' ELSE 'FAIL'
    END

ORDER BY check_area;
