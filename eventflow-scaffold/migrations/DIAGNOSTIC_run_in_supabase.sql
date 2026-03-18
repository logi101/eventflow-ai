-- ============================================================
-- EVENTFLOW RLS DIAGNOSTIC SCRIPT
-- Purpose: Diagnose why users are not seeing all their events
-- How to use: Copy-paste each section into the Supabase SQL
--             editor and review the results.
-- Safe to run: All queries are read-only SELECT statements.
-- ============================================================


-- ============================================================
-- SECTION 1: Current user's profile and organization_id
-- Expected: One row for the logged-in user with a non-null
--           organization_id. If organization_id is NULL the
--           auth.user_org_id() function will return NULL and
--           every RLS check will fail, hiding all events.
-- ============================================================
SELECT
    id                AS user_id,
    email,
    role,
    organization_id,
    created_at,
    CASE
        WHEN organization_id IS NULL
        THEN 'WARNING: organization_id is NULL - this user will see NO events'
        ELSE 'OK'
    END               AS diagnosis
FROM user_profiles
WHERE id = auth.uid();


-- ============================================================
-- SECTION 2: All events and their organization_ids
-- Expected: Rows whose organization_id matches the value
--           returned in Section 1. Events belonging to a
--           different organization_id will not be visible to
--           this user under the current RLS policies.
-- ============================================================
SELECT
    id,
    title,
    status,
    organization_id,
    public_rsvp_enabled,
    created_at,
    CASE
        WHEN organization_id = public.get_user_org_id()
        THEN 'VISIBLE to current user'
        ELSE 'HIDDEN from current user (org mismatch)'
    END               AS visibility
FROM events
ORDER BY created_at DESC;


-- ============================================================
-- SECTION 3: RLS policies that exist on the events table
-- Expected: A small, non-overlapping set of policies.
-- Watch for: duplicate or conflicting policies that cover the
--            same command (e.g. two SELECT policies where one
--            is too restrictive), or a missing anon SELECT
--            policy for public RSVP pages.
-- ============================================================
SELECT
    schemaname,
    tablename,
    policyname,
    roles,
    cmd,
    qual       AS using_expression,
    with_check AS with_check_expression
FROM pg_policies
WHERE tablename = 'events'
ORDER BY cmd, policyname;


-- ============================================================
-- SECTION 4: Verify auth.user_org_id() and
--            public.get_user_org_id() exist and return a value
-- Expected: Both functions should exist. The result column
--           should be a non-null UUID matching Section 1.
--           NULL means the function exists but found no
--           matching profile row (orphaned auth user).
-- ============================================================

-- 4a. Check both functions exist in pg_proc
SELECT
    n.nspname  AS schema,
    p.proname  AS function_name,
    pg_get_function_result(p.oid) AS return_type,
    p.prosecdef AS security_definer
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname IN ('user_org_id', 'get_user_org_id')
ORDER BY n.nspname, p.proname;

-- 4b. Call both functions as the current user
SELECT
    auth.user_org_id()       AS auth_user_org_id,
    public.get_user_org_id() AS public_get_user_org_id,
    CASE
        WHEN auth.user_org_id() IS NULL
        THEN 'PROBLEM: function returns NULL - check user_profiles row'
        WHEN auth.user_org_id() != public.get_user_org_id()
        THEN 'PROBLEM: the two aliases return different values'
        ELSE 'OK: both functions agree'
    END AS diagnosis;


-- ============================================================
-- SECTION 5: Mismatch report between user org and events
-- Expected: Zero rows. Any rows returned represent events
--           the current user owns by some other identifier
--           but cannot see because organization_id differs.
--           This is the most common root cause of missing
--           events after a data migration or org reassignment.
-- ============================================================
SELECT
    e.id            AS event_id,
    e.title,
    e.organization_id AS event_org_id,
    public.get_user_org_id() AS my_org_id,
    up.id           AS profile_user_id,
    up.organization_id AS profile_org_id
FROM events e
-- Find events created by users in this auth session's org
CROSS JOIN (
    SELECT organization_id
    FROM user_profiles
    WHERE id = auth.uid()
) AS my_profile
WHERE e.organization_id != my_profile.organization_id
-- Also surface any user_profiles row for the current uid
LEFT JOIN user_profiles up ON up.id = auth.uid()
ORDER BY e.created_at DESC;


-- ============================================================
-- SECTION 6: event_status enum values defined in the database
-- Expected: A list including at least: draft, active,
--           completed. If 'archived' is missing the application
--           cannot use that status without an ALTER TYPE first.
-- ============================================================
SELECT
    t.typname     AS enum_type,
    e.enumlabel   AS enum_value,
    e.enumsortorder AS sort_order
FROM pg_type t
JOIN pg_enum e ON e.enumtypid = t.oid
WHERE t.typname = 'event_status'
ORDER BY e.enumsortorder;


-- ============================================================
-- SECTION 7: Event count per organization
-- Expected: The current user's organization should have a
--           count matching what they expect to see in the app.
--           Other organizations' counts should be 0 from the
--           user's perspective (RLS hides them at query time;
--           this query bypasses RLS and runs as the SQL editor
--           role so it shows all orgs for a superuser session).
-- NOTE: This query requires superuser / postgres role to see
--       all orgs. Regular authenticated users will only see
--       their own org's events due to RLS.
-- ============================================================
SELECT
    o.id             AS organization_id,
    o.name           AS organization_name,
    COUNT(e.id)      AS total_events,
    COUNT(e.id) FILTER (WHERE e.status = 'active')    AS active_events,
    COUNT(e.id) FILTER (WHERE e.status = 'draft')     AS draft_events,
    COUNT(e.id) FILTER (WHERE e.status = 'completed') AS completed_events,
    COUNT(e.id) FILTER (WHERE e.public_rsvp_enabled = true) AS rsvp_enabled_events
FROM organizations o
LEFT JOIN events e ON e.organization_id = o.id
GROUP BY o.id, o.name
ORDER BY total_events DESC;
