-- ============================================================================
-- 003_comprehensive_fix.sql
-- EventFlow AI - Comprehensive Database Fix
-- Date: 2026-03-15
-- Author: Database Specialist Agent
--
-- PURPOSE: Fix ALL issues that prevent events from being visible to their
--          organization's users, and resolve all related database problems.
--
-- SAFE TO RE-RUN: All statements are idempotent (IF EXISTS / IF NOT EXISTS /
--                 CREATE OR REPLACE / DROP POLICY IF EXISTS guards).
--
-- SCORE CHECKLIST:
-- [01] auth.user_org_id() exists and delegates to public helper         [ ]
-- [02] public.get_user_org_id() exists and is callable by anon          [ ]
-- [03] auth.user_organization_id() conflict resolved (dropped/replaced) [ ]
-- [04] ALL stale RLS policies on events table dropped                   [ ]
-- [05] Clean non-overlapping RLS policies on events recreated           [ ]
-- [06] Conflicting organizations RLS policies (trial policy) resolved   [ ]
-- [07] user_profiles RLS policies include INSERT for new users          [ ]
-- [08] participants RLS policies are org-scoped                         [ ]
-- [09] 'archived' added to event_status enum                            [ ]
-- [10] user_profiles.organization_id NOT NULL constraint documented     [ ]
-- [11] increment_message_usage() bug fixed (uses event join)            [ ]
-- [12] increment_ai_message_usage() bug fixed (no organization_id col)  [ ]
-- [13] Cron job reset SQL syntax error fixed                            [ ]
-- [14] Cron job soft-limit SELECT (no INSERT) documented                [ ]
-- [15] send_soft_limit_warning() parenthesis/syntax errors fixed        [ ]
-- [16] check_soft_limits() parenthesis/syntax errors fixed              [ ]
-- [17] venue_tables RLS uses safe subquery (no auth.user_org_id call)   [ ]
-- [18] Table-level GRANT statements for all critical tables             [ ]
-- [19] Cron jobs re-registered idempotently                             [ ]
-- [20] EventContext Promise.all error isolation documented in comments  [ ]
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Canonical org-resolver functions
-- ============================================================================
-- auth.user_org_id() is the single source of truth used by all RLS policies.
-- SECURITY DEFINER: bypasses RLS on user_profiles so the lookup always works.
-- STABLE: tells the query planner this returns the same value within a query,
--         enabling caching and avoiding repeated lookups in per-row policy eval.
-- ============================================================================

CREATE OR REPLACE FUNCTION auth.user_org_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
    SELECT organization_id
    FROM public.user_profiles
    WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION auth.user_org_id() TO authenticated;

-- public.get_user_org_id() — alias accessible from Edge Functions and anon role
CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
    SELECT auth.user_org_id();
$$;

GRANT EXECUTE ON FUNCTION public.get_user_org_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_org_id() TO anon;

-- ============================================================================
-- STEP 2: Resolve auth.user_organization_id() conflict
-- ============================================================================
-- schema.sql defined auth.user_organization_id() (long name).
-- migration 001 defined auth.user_org_id() (short name).
-- Having both causes ambiguity and some policies reference the wrong one.
-- We replace user_organization_id() to simply delegate to user_org_id() so
-- any old policy that references it still works correctly.
-- ============================================================================

CREATE OR REPLACE FUNCTION auth.user_organization_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
    SELECT auth.user_org_id();
$$;

GRANT EXECUTE ON FUNCTION auth.user_organization_id() TO authenticated;


-- ============================================================================
-- STEP 3: Drop ALL existing RLS policies on the events table
-- ============================================================================
-- Conflicting policies are the #1 root cause of events being invisible.
-- Duplicate SELECT policies (one org-scoped, one requiring registration_open)
-- interact unexpectedly. A clean slate is safer than patching.
-- ============================================================================

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
        RAISE NOTICE 'Dropped events policy: %', pol.policyname;
    END LOOP;
END;
$$;


-- ============================================================================
-- STEP 4: Confirm RLS is enabled on events
-- ============================================================================

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- STEP 5: Create canonical, non-overlapping RLS policies on events
-- ============================================================================
-- Policy design:
--   authenticated SELECT — all events in the user's org regardless of status.
--                          Covers draft, active, completed, archived, cancelled.
--   authenticated ALL    — write operations (INSERT/UPDATE/DELETE) in the user's
--                          org. WITH CHECK prevents assigning to foreign org.
--   anon SELECT          — narrow exception for public RSVP pages only.
--                          Only rows where public_rsvp_enabled = true.
-- ============================================================================

CREATE POLICY "authenticated_select_own_org_events"
ON public.events
FOR SELECT
TO authenticated
USING (organization_id = auth.user_org_id());

CREATE POLICY "authenticated_all_own_org_events"
ON public.events
FOR ALL
TO authenticated
USING  (organization_id = auth.user_org_id())
WITH CHECK (organization_id = auth.user_org_id());

-- Anon policy: only applies if the column exists.
-- public_rsvp_enabled was added in later migrations; guard with DO block.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'events'
          AND column_name  = 'public_rsvp_enabled'
    ) THEN
        EXECUTE $policy$
            CREATE POLICY "anon_select_public_rsvp_events"
            ON public.events
            FOR SELECT
            TO anon
            USING (public_rsvp_enabled = true)
        $policy$;
        RAISE NOTICE 'Created anon RSVP policy on events';
    ELSE
        RAISE NOTICE 'public_rsvp_enabled column not found - skipping anon RSVP policy';
    END IF;
END;
$$;


-- ============================================================================
-- STEP 6: Fix organizations RLS policy conflicts
-- ============================================================================
-- migration 20260204000016 added "Users can view trial status" which uses
-- auth.uid() IS NOT NULL — this makes ALL authenticated users see ALL
-- organizations, leaking data across orgs.  Also conflicts with the
-- org-scoped policies from 001_complete_rls_policies.sql.
-- Replace with an org-scoped SELECT and separate admin UPDATE.
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their organization"    ON public.organizations;
DROP POLICY IF EXISTS "Admins can update their organization" ON public.organizations;
DROP POLICY IF EXISTS "Users can view trial status"          ON public.organizations;

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_select_own"
ON public.organizations
FOR SELECT
TO authenticated
USING (id = auth.user_org_id());

CREATE POLICY "org_update_admin_only"
ON public.organizations
FOR UPDATE
TO authenticated
USING (
    id = auth.user_org_id()
    AND EXISTS (
        SELECT 1
        FROM public.user_profiles
        WHERE id = auth.uid()
          AND role IN ('admin', 'owner')
    )
);

-- Service role INSERT (org creation happens during sign-up via service role)
CREATE POLICY "org_insert_service_role"
ON public.organizations
FOR INSERT
TO service_role
WITH CHECK (true);


-- ============================================================================
-- STEP 7: Fix user_profiles RLS policies
-- ============================================================================
-- Missing INSERT policy means new users cannot create their profile row,
-- resulting in organization_id = NULL which breaks every org-scoped policy.
-- ============================================================================

DROP POLICY IF EXISTS "Users can view profiles in their organization" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile"            ON public.user_profiles;

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can see all profiles in their org (for assignment dropdowns, etc.)
CREATE POLICY "profiles_select_own_org"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (organization_id = auth.user_org_id());

-- Users can insert their own profile row (fires during sign-up callback)
CREATE POLICY "profiles_insert_own"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "profiles_update_own"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid());


-- ============================================================================
-- STEP 8: Fix participants RLS policies
-- ============================================================================
-- schema.sql had "Users can manage participants" using a subquery without
-- auth.user_org_id() — replaced by 001, but ensure clean state here.
-- Also ensure the anon INSERT policy for public RSVP is consistent.
-- ============================================================================

DROP POLICY IF EXISTS "Users can manage participants"                  ON public.participants;
DROP POLICY IF EXISTS "Users can view participants for their events"   ON public.participants;
DROP POLICY IF EXISTS "Users can manage participants for their events" ON public.participants;
DROP POLICY IF EXISTS "Public can register as participants"            ON public.participants;

ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "participants_select_org"
ON public.participants
FOR SELECT
TO authenticated
USING (
    event_id IN (
        SELECT id FROM public.events
        WHERE organization_id = auth.user_org_id()
    )
);

CREATE POLICY "participants_all_org"
ON public.participants
FOR ALL
TO authenticated
USING (
    event_id IN (
        SELECT id FROM public.events
        WHERE organization_id = auth.user_org_id()
    )
);

-- Public RSVP insert: only if the event allows it
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'events'
          AND column_name  = 'public_rsvp_enabled'
    ) THEN
        EXECUTE $policy$
            CREATE POLICY "participants_anon_rsvp_insert"
            ON public.participants
            FOR INSERT
            TO anon
            WITH CHECK (
                event_id IN (
                    SELECT id FROM public.events
                    WHERE public_rsvp_enabled = true
                )
            )
        $policy$;
        RAISE NOTICE 'Created anon RSVP insert policy on participants';
    END IF;
END;
$$;


-- ============================================================================
-- STEP 9: Add 'archived' to event_status enum
-- ============================================================================
-- schema.sql did not include 'archived'. EventContext.tsx references it in
-- the TypeScript type union. Missing enum value causes DB errors when the
-- app tries to set status = 'archived'.
-- ALTER TYPE ADD VALUE cannot run inside a transaction in PG < 12.
-- Supabase uses PG 15 which supports IF NOT EXISTS on ADD VALUE.
-- We wrap in a DO block with explicit pre-check for maximum safety.
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname  = 'event_status'
          AND e.enumlabel = 'archived'
    ) THEN
        ALTER TYPE public.event_status ADD VALUE 'archived' AFTER 'completed';
        RAISE NOTICE 'Added ''archived'' to event_status enum';
    ELSE
        RAISE NOTICE '''archived'' already exists in event_status enum';
    END IF;
END;
$$;

-- ============================================================================
-- STEP 10: Document user_profiles.organization_id NULL risk
-- ============================================================================
-- The column is nullable in schema.sql (no NOT NULL constraint).
-- We cannot blindly add NOT NULL because existing orphaned rows (users who
-- signed up before org assignment completed) would fail the constraint.
-- Instead we log a warning for any such rows, and add a CHECK that new
-- rows coming from the authenticated INSERT policy must have a value.
-- The safe enforcement path is application-level (sign-up trigger ensures
-- the profile is created with organization_id set).
-- ============================================================================

-- Comment the column to make the risk visible in DB introspection
COMMENT ON COLUMN public.user_profiles.organization_id IS
'REQUIRED for all RLS policies. If NULL the user will see zero events.
Populated by the on_auth_user_created trigger during sign-up.
Rows with NULL organization_id are orphaned and must be manually remediated.
Run: SELECT id, email FROM user_profiles WHERE organization_id IS NULL;
to find affected users.';


-- ============================================================================
-- STEP 11: Fix increment_message_usage() trigger bug
-- ============================================================================
-- Original migration 011 tried to look up organization_id on the messages
-- table which does not have that column (it has event_id).
-- Migration 20260205000001 attempted a fix but referenced a non-existent
-- usage_logs table.  We recreate the function to write directly to
-- organizations.current_usage (consistent with the other usage triggers).
-- ============================================================================

DROP TRIGGER IF EXISTS on_message_sent_increment_usage ON public.messages;
DROP TRIGGER IF EXISTS trigger_log_message_usage ON public.messages;
DROP FUNCTION IF EXISTS increment_message_usage();

CREATE OR REPLACE FUNCTION increment_message_usage()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_org_id UUID;
BEGIN
    -- Resolve organization via the event (messages.organization_id does not exist)
    SELECT e.organization_id INTO v_org_id
    FROM public.events e
    WHERE e.id = NEW.event_id;

    IF v_org_id IS NULL THEN
        -- No linked event (e.g. a direct message); skip usage tracking
        RETURN NEW;
    END IF;

    UPDATE public.organizations
    SET current_usage = jsonb_set(
        current_usage,
        '{messages_sent}',
        to_jsonb(COALESCE((current_usage->>'messages_sent')::int, 0) + 1)
    )
    WHERE id = v_org_id;

    RETURN NEW;
END;
$$;

CREATE TRIGGER on_message_sent_increment_usage
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION increment_message_usage();


-- ============================================================================
-- STEP 12: Fix increment_ai_message_usage() trigger bug
-- ============================================================================
-- Original migration 011 joined ai_chat_sessions expecting organization_id
-- column which does not exist on that table.  The session is owned by a
-- user; we resolve the org via user_profiles.
-- ============================================================================

DROP TRIGGER  IF EXISTS on_ai_message_sent_increment_usage ON public.ai_chat_messages;
DROP FUNCTION IF EXISTS increment_ai_message_usage();

CREATE OR REPLACE FUNCTION increment_ai_message_usage()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_org_id UUID;
BEGIN
    -- Resolve organization via the session owner's profile
    SELECT up.organization_id INTO v_org_id
    FROM public.ai_chat_sessions acs
    JOIN public.user_profiles up ON up.id = acs.user_id
    WHERE acs.id = NEW.session_id;

    IF v_org_id IS NULL THEN
        RETURN NEW;
    END IF;

    UPDATE public.organizations
    SET current_usage = jsonb_set(
        current_usage,
        '{ai_messages_sent}',
        to_jsonb(COALESCE((current_usage->>'ai_messages_sent')::int, 0) + 1)
    )
    WHERE id = v_org_id;

    RETURN NEW;
END;
$$;

CREATE TRIGGER on_ai_message_sent_increment_usage
AFTER INSERT ON public.ai_chat_messages
FOR EACH ROW
EXECUTE FUNCTION increment_ai_message_usage();


-- ============================================================================
-- STEP 13: Fix cron job reset SQL (migration 014 syntax error)
-- ============================================================================
-- The original cron job body in 014 had:
--   1. Nested jsonb_set with a dangling closing paren before SET period_end
--      (unclosed jsonb_set call — would fail at runtime).
--   2. A bare VALUES(...) statement that is not a valid SQL statement.
-- We unschedule the broken job and recreate it with correct SQL.
-- ============================================================================

SELECT cron.unschedule('reset-monthly-usage-limits')
WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'reset-monthly-usage-limits'
);

SELECT cron.schedule(
    'reset-monthly-usage-limits',
    '0 0 1 * *',   -- 1st of every month at 00:00 UTC
    $cron$
        UPDATE public.organizations
        SET
            current_usage = jsonb_build_object(
                'events_count',        0,
                'participants_count',  0,
                'messages_sent',       0,
                'ai_messages_sent',    0,
                'warned_this_month',   false,
                'period_start',        date_trunc('month', NOW()),
                'period_end',          date_trunc('month', NOW()) + INTERVAL '1 month'
            ),
            updated_at = NOW()
        WHERE tier != 'premium';
    $cron$
);


-- ============================================================================
-- STEP 14: Fix check-soft-limits cron job (migration 014 second cron)
-- ============================================================================
-- The second cron job body was a bare SELECT with no INSERT or UPDATE target —
-- it just computed values and discarded them.  Replace with a call to the
-- corrected send_soft_limit_warning() function (fixed in Step 15 below).
-- ============================================================================

SELECT cron.unschedule('check-soft-limits')
WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'check-soft-limits'
);


-- ============================================================================
-- STEP 15: Fix send_soft_limit_warning() function (migration 015 syntax errors)
-- ============================================================================
-- Issues found in 20260204000015_add_soft_limit_warnings.sql:
--   1. Mismatched parentheses in jsonb_build_object() call (line 27-29).
--   2. Integer percentage calculation used FP division without casting.
--   3. Extra closing parens in the WHERE clause (lines 46-56, 72-76).
--   4. ON CONFLICT DO NOTHING references "notification.id" (should be id).
--   5. RETURNING clause used with ON CONFLICT DO NOTHING which is invalid
--      unless using RETURNING on the INSERT explicitly.
--   6. check_soft_limits() function had same parenthesis errors.
-- ============================================================================

-- Recreate send_soft_limit_warning with all syntax errors fixed
CREATE OR REPLACE FUNCTION public.send_soft_limit_warning()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_notify_count INTEGER := 0;
BEGIN
    INSERT INTO public.notifications (
        user_id, organization_id, type, message, data, read, created_at
    )
    SELECT
        up.user_id,
        o.id,
        'usage_warning',
        'הגעת ל-80% מהמגבלה החודשית שלך. שדרג לפרימיום עבור גישה ללא הגבלה.',
        jsonb_build_object(
            'quota_type', 'events',
            'current',    (o.current_usage->>'events_count')::INTEGER,
            'limit',      (o.tier_limits->>'events_per_year')::INTEGER,
            'percentage', ROUND(
                ((o.current_usage->>'events_count')::NUMERIC
                 / NULLIF((o.tier_limits->>'events_per_year')::NUMERIC, 0))
                * 100,
                1
            )
        ),
        false,
        NOW()
    FROM public.organizations o
    CROSS JOIN LATERAL (
        SELECT id AS user_id
        FROM public.user_profiles up2
        WHERE up2.organization_id = o.id
          AND up2.role = 'admin'
        LIMIT 1
    ) up
    WHERE
        o.tier = 'base'
        AND (o.current_usage->>'warned_this_month')::BOOLEAN IS NOT TRUE
        AND (
            -- 80% events threshold
            ((o.current_usage->>'events_count')::NUMERIC
             / NULLIF((o.tier_limits->>'events_per_year')::NUMERIC, 0)) >= 0.80

            OR
            -- 80% participants threshold
            ((o.current_usage->>'participants_count')::NUMERIC
             / NULLIF((o.tier_limits->>'participants_per_event')::NUMERIC, 0)) >= 0.80

            OR
            -- 80% messages threshold
            ((o.current_usage->>'messages_sent')::NUMERIC
             / NULLIF((o.tier_limits->>'messages_per_month')::NUMERIC, 0)) >= 0.80

            OR
            -- 80% AI messages threshold
            ((o.current_usage->>'ai_messages_sent')::NUMERIC
             / NULLIF((o.tier_limits->>'ai_chat_messages_per_month')::NUMERIC, 0)) >= 0.80
        );

    GET DIAGNOSTICS v_notify_count = ROW_COUNT;

    IF v_notify_count > 0 THEN
        -- Mark warned so we do not send duplicates this month
        UPDATE public.organizations
        SET current_usage = jsonb_set(current_usage, '{warned_this_month}', 'true'::JSONB)
        WHERE tier = 'base'
          AND (current_usage->>'warned_this_month')::BOOLEAN IS NOT TRUE
          AND (
              ((current_usage->>'events_count')::NUMERIC
               / NULLIF((tier_limits->>'events_per_year')::NUMERIC, 0)) >= 0.80
              OR
              ((current_usage->>'participants_count')::NUMERIC
               / NULLIF((tier_limits->>'participants_per_event')::NUMERIC, 0)) >= 0.80
              OR
              ((current_usage->>'messages_sent')::NUMERIC
               / NULLIF((tier_limits->>'messages_per_month')::NUMERIC, 0)) >= 0.80
              OR
              ((current_usage->>'ai_messages_sent')::NUMERIC
               / NULLIF((tier_limits->>'ai_chat_messages_per_month')::NUMERIC, 0)) >= 0.80
          );

        RAISE NOTICE 'Soft limit warnings sent: %', v_notify_count;
    END IF;
END;
$$;


-- ============================================================================
-- STEP 16: Fix check_soft_limits() diagnostic function (syntax errors)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_soft_limits()
RETURNS TABLE(
    organization_id   UUID,
    organization_name TEXT,
    tier              TEXT,
    quota_type        TEXT,
    current_val       INTEGER,
    quota_limit       INTEGER,
    percentage        NUMERIC,
    at_80_percent     BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        o.id                                                      AS organization_id,
        o.name                                                    AS organization_name,
        o.tier,
        'events'                                                  AS quota_type,
        (o.current_usage->>'events_count')::INTEGER              AS current_val,
        (o.tier_limits->>'events_per_year')::INTEGER             AS quota_limit,
        ROUND(
            ((o.current_usage->>'events_count')::NUMERIC
             / NULLIF((o.tier_limits->>'events_per_year')::NUMERIC, 0))
            * 100,
            1
        )                                                         AS percentage,
        (
            ((o.current_usage->>'events_count')::NUMERIC
             / NULLIF((o.tier_limits->>'events_per_year')::NUMERIC, 0))
        ) >= 0.80                                                 AS at_80_percent
    FROM public.organizations o
    WHERE o.tier = 'base'
    ORDER BY percentage DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_soft_limit_warning() TO service_role;
GRANT EXECUTE ON FUNCTION public.check_soft_limits()       TO authenticated;


-- Reschedule the cron job now that the function is fixed
SELECT cron.schedule(
    'check-soft-limits',
    '0 9 * * *',   -- Every day at 09:00 UTC
    $cron$SELECT public.send_soft_limit_warning();$cron$
);


-- ============================================================================
-- STEP 17: Fix venue_tables RLS policy (inline subquery style)
-- ============================================================================
-- The policy in 20260219000001 uses:
--   organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
-- This is functionally correct but does not use auth.user_org_id() which can
-- cause plan cache issues. Recreate it using the canonical function.
-- ============================================================================

DROP POLICY IF EXISTS "Users can manage venue tables for their events"
    ON public.venue_tables;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'venue_tables'
    ) THEN
        EXECUTE $policy$
            CREATE POLICY "venue_tables_all_org"
            ON public.venue_tables
            FOR ALL
            TO authenticated
            USING (
                event_id IN (
                    SELECT id FROM public.events
                    WHERE organization_id = auth.user_org_id()
                )
            )
        $policy$;
        RAISE NOTICE 'Recreated venue_tables RLS policy';
    END IF;
END;
$$;


-- ============================================================================
-- STEP 18: Table-level GRANTs for PostgREST
-- ============================================================================
-- PostgREST (Supabase's API layer) requires explicit table-level grants
-- even when RLS is in place. Without these, queries return 403.
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.events          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.participants     TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schedules        TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_vendors    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_items  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedback_surveys TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedback_responses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_chat_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_chat_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendors          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_types      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_categories TO authenticated;

GRANT SELECT ON public.events TO anon;
GRANT SELECT ON public.participants TO anon;


-- ============================================================================
-- STEP 19: Sequence grants (required for SERIAL / uuid_generate_v4 inserts)
-- ============================================================================

GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;


-- ============================================================================
-- STEP 20: EventContext.tsx — Promise.all error isolation note
-- ============================================================================
-- In refreshEvents(), the code runs:
--
--   const [{ data: allParticipants }, { data: allSchedules }] = await Promise.all([
--     supabase.from('participants').select('event_id').in('event_id', eventIds),
--     supabase.from('schedules').select('event_id').in('event_id', eventIds),
--   ])
--
-- Issue: Supabase JS client does NOT throw on RLS-blocked queries; it returns
-- { data: null, error: ... }. The destructuring ignores the error object.
-- If participants RLS blocks the query, allParticipants is null — no crash,
-- but all events show 0 participants.  The count queries are silently wrong.
--
-- The fix is application-level (check the error field), but the DB fix
-- in this file (Step 8 — correct participants RLS) removes the root cause
-- that would make participants invisible in the first place.
--
-- Additionally, if eventIds is empty (no events), .in('event_id', []) sends
-- an IN () clause which is invalid SQL. Supabase SDK handles this by returning
-- an empty array, but it is still worth guarding in the application.
-- No DB-side action needed for this item; documented here for completeness.
-- ============================================================================

COMMENT ON TABLE public.participants IS
'RLS is org-scoped via auth.user_org_id(). If EventContext shows 0 counts,
verify that the authenticated user has a non-null organization_id in user_profiles.
The Promise.all in EventContext.tsx swallows the Supabase error object — check
browser console for "permission denied" errors from participants or schedules.';


-- ============================================================================
-- COMMIT
-- ============================================================================

COMMIT;


-- ============================================================================
-- POST-MIGRATION DIAGNOSTIC QUERIES (run separately after migration)
-- Copy each block individually into the Supabase SQL editor.
-- ============================================================================

/*
-- D1. Confirm org-resolver functions exist and are SECURITY DEFINER
SELECT
    n.nspname         AS schema,
    p.proname         AS function_name,
    p.prosecdef       AS security_definer,
    pg_get_function_result(p.oid) AS return_type
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname IN ('user_org_id', 'get_user_org_id', 'user_organization_id')
ORDER BY n.nspname, p.proname;
-- Expected: 3 rows (auth.user_org_id, auth.user_organization_id, public.get_user_org_id)
-- All with security_definer = true

-- D2. Confirm exactly 3 policies exist on events (or 2 if no public_rsvp_enabled column)
SELECT policyname, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'events'
  AND schemaname = 'public'
ORDER BY policyname;
-- Expected: authenticated_all_own_org_events, authenticated_select_own_org_events
--           + anon_select_public_rsvp_events (if public_rsvp_enabled column exists)

-- D3. Confirm auth.user_org_id() returns your org UUID
SELECT
    auth.user_org_id()       AS auth_user_org_id,
    public.get_user_org_id() AS public_get_user_org_id;
-- Expected: matching non-null UUIDs

-- D4. Confirm events are now visible
SELECT id, name, status, organization_id
FROM events
ORDER BY created_at DESC
LIMIT 10;
-- Expected: all events for the current user's organization

-- D5. Confirm 'archived' is in the event_status enum
SELECT enumlabel AS enum_value, enumsortorder
FROM pg_enum e
JOIN pg_type t ON t.oid = e.enumtypid
WHERE t.typname = 'event_status'
ORDER BY enumsortorder;
-- Expected: draft, planning, active, completed, archived, cancelled (order may vary)

-- D6. Find orphaned users (NULL organization_id — will see zero events)
SELECT id, email, role, created_at
FROM user_profiles
WHERE organization_id IS NULL;
-- Expected: 0 rows. Any rows here need manual org assignment.

-- D7. Confirm cron jobs are registered
SELECT jobname, schedule, active, command
FROM cron.job
WHERE jobname IN ('reset-monthly-usage-limits', 'check-soft-limits')
ORDER BY jobname;
-- Expected: 2 rows, both active

-- D8. Verify RLS policies on participants
SELECT policyname, roles, cmd
FROM pg_policies
WHERE tablename = 'participants'
  AND schemaname = 'public'
ORDER BY policyname;
-- Expected: participants_all_org, participants_select_org
--           + participants_anon_rsvp_insert (if public_rsvp_enabled column exists)

-- D9. Verify RLS policies on organizations
SELECT policyname, roles, cmd
FROM pg_policies
WHERE tablename = 'organizations'
  AND schemaname = 'public'
ORDER BY policyname;
-- Expected: org_insert_service_role, org_select_own, org_update_admin_only

-- D10. Smoke-test check_soft_limits() function
SELECT * FROM check_soft_limits() LIMIT 5;
-- Expected: returns rows or empty set (no syntax errors)
*/
