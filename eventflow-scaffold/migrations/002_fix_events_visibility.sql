-- ============================================================
-- MIGRATION: 002_fix_events_visibility.sql
-- Purpose:   Fix events not visible to authenticated users
--            by ensuring the org-resolver functions exist,
--            replacing all events RLS policies with a clean
--            non-overlapping set, and adding the 'archived'
--            enum value if it is missing.
--
-- Safe to re-run: All DDL uses CREATE OR REPLACE / IF NOT
--                 EXISTS / IF EXISTS guards.
-- Supabase role required: postgres (run as project owner or
--                         via the SQL editor which runs as
--                         the postgres superuser).
-- ============================================================

BEGIN;

-- ============================================================
-- STEP 1: Ensure auth.user_org_id() exists
-- This is the canonical function called inside every RLS
-- policy on the events table. It reads the organization_id
-- from user_profiles for the currently authenticated uid.
-- SECURITY DEFINER lets it bypass RLS on user_profiles so
-- the lookup always succeeds even before profile policies
-- are satisfied.
-- ============================================================
CREATE OR REPLACE FUNCTION auth.user_org_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
    SELECT organization_id
    FROM user_profiles
    WHERE id = auth.uid();
$$;

-- Grant execute to the authenticated role so Supabase
-- PostgREST can call this inside policy evaluation.
GRANT EXECUTE ON FUNCTION auth.user_org_id() TO authenticated;


-- ============================================================
-- STEP 2: Ensure public.get_user_org_id() exists as an alias
-- Edge Functions and client-side SQL run in the public schema
-- context. This alias delegates to the auth-schema version so
-- there is a single source of truth.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
    SELECT auth.user_org_id();
$$;

-- Grant to both roles: authenticated users and anon (the anon
-- role calls this when evaluating the public RSVP policy).
GRANT EXECUTE ON FUNCTION public.get_user_org_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_org_id() TO anon;


-- ============================================================
-- STEP 3: Drop ALL existing RLS policies on events
-- Conflicting or duplicate policies are the most common
-- reason events become invisible. For example, a SELECT
-- policy that requires registration_open = true AND status =
-- 'active' combined with an ALL policy using org_id means
-- Supabase evaluates both and a row must satisfy either one
-- for SELECT (policies are OR-combined per command). However
-- stale policies with wrong column names or enum values
-- silently break everything. Dropping all and recreating
-- from scratch is safer than patching individual policies.
-- ============================================================
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'events'
          AND schemaname = 'public'
    LOOP
        EXECUTE format(
            'DROP POLICY IF EXISTS %I ON public.events',
            pol.policyname
        );
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
END;
$$;


-- ============================================================
-- STEP 4: Confirm RLS is enabled on the events table
-- If RLS is disabled all rows are visible to everyone, but
-- enabling it without correct policies locks everyone out.
-- This ensures the table is in the expected state before we
-- add the new policies.
-- ============================================================
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- STEP 5: Create the canonical RLS policy set for events
--
-- Policy design decisions:
--   - Authenticated SELECT: org-scoped. Covers all statuses
--     including draft and archived so staff see everything.
--   - Authenticated ALL: org-scoped for INSERT/UPDATE/DELETE.
--     The SELECT above already handles reads; ALL covers the
--     write commands. Supabase applies policies per-command
--     so having both is correct and non-redundant.
--   - Anon SELECT: only rows where public_rsvp_enabled = true.
--     This is the narrow exception that enables the public
--     RSVP feature (/rsvp/:eventId route) without exposing
--     internal events. No INSERT/UPDATE/DELETE for anon.
-- ============================================================

-- 5a. Authenticated users: read any event in their org
CREATE POLICY "authenticated_select_own_org_events"
ON public.events
FOR SELECT
TO authenticated
USING (organization_id = auth.user_org_id());

-- 5b. Authenticated users: write (insert/update/delete) events
--     in their org. WITH CHECK mirrors USING so new/updated
--     rows cannot be assigned to a foreign org.
CREATE POLICY "authenticated_all_own_org_events"
ON public.events
FOR ALL
TO authenticated
USING (organization_id = auth.user_org_id())
WITH CHECK (organization_id = auth.user_org_id());

-- 5c. Anon users: read-only access to public RSVP events
--     No WITH CHECK needed for SELECT-only policies.
CREATE POLICY "anon_select_public_rsvp_events"
ON public.events
FOR SELECT
TO anon
USING (public_rsvp_enabled = true);


-- ============================================================
-- STEP 6: Add 'archived' to the event_status enum
-- ALTER TYPE ... ADD VALUE cannot run inside a multi-statement
-- transaction in older Postgres versions, so we use a DO
-- block with a pre-check. In Postgres 14+ (used by Supabase)
-- IF NOT EXISTS is supported directly on ADD VALUE.
-- ============================================================
DO $$
BEGIN
    -- Check whether 'archived' already exists in the enum
    IF NOT EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'event_status'
          AND e.enumlabel = 'archived'
    ) THEN
        ALTER TYPE public.event_status ADD VALUE 'archived' AFTER 'completed';
        RAISE NOTICE 'Added ''archived'' value to event_status enum';
    ELSE
        RAISE NOTICE '''archived'' already exists in event_status enum - skipped';
    END IF;
END;
$$;


-- ============================================================
-- STEP 7: Grant table-level permissions
-- PostgREST requires explicit grants even when RLS is in
-- place. These are additive and safe to re-run.
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT SELECT                          ON public.events TO anon;


COMMIT;


-- ============================================================
-- POST-MIGRATION VERIFICATION (copy-paste separately after
-- the migration completes to confirm everything is correct)
-- ============================================================

-- V1. Confirm exactly 3 policies exist on events
-- Expected result: 3 rows (authenticated_select, authenticated_all, anon_select)
/*
SELECT policyname, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'events'
ORDER BY policyname;
*/

-- V2. Confirm auth.user_org_id() returns a non-null value
-- Expected result: a UUID matching your user_profiles.organization_id
/*
SELECT auth.user_org_id() AS my_org_id;
*/

-- V3. Confirm events are now visible to the current user
-- Expected result: all events belonging to the user's org
/*
SELECT id, title, status, organization_id
FROM events
ORDER BY created_at DESC;
*/

-- V4. Confirm 'archived' exists in the event_status enum
-- Expected result: row with enum_value = 'archived'
/*
SELECT enumlabel AS enum_value
FROM pg_enum e
JOIN pg_type t ON t.oid = e.enumtypid
WHERE t.typname = 'event_status'
ORDER BY enumsortorder;
*/

-- V5. Confirm anon can only see public_rsvp_enabled events
-- Run this as the anon role or use: SET role anon;
/*
SELECT id, title, public_rsvp_enabled
FROM events;
-- Should return ONLY rows where public_rsvp_enabled = true
*/
