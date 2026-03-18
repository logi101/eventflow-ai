-- ============================================================
-- MIGRATION: 004_fix_user_creation_trigger.sql
-- Purpose:   Create the missing auth.users → user_profiles
--            trigger so that every new Supabase auth signup
--            automatically gets a user_profiles row AND a
--            default organization, ensuring organization_id
--            is never NULL after signup.
--
-- Root cause confirmed: schema.sql defines user_profiles and
--            organizations but contains NO trigger that fires
--            on auth.users INSERT. Consequently any user
--            created via Supabase Auth has no user_profiles
--            row at all (or, if manually inserted, has
--            organization_id = NULL), which causes
--            auth.user_org_id() to return NULL and every RLS
--            policy on events/participants/etc. to block all
--            rows → "events not showing" bug.
--
-- Idempotent: yes. Uses CREATE OR REPLACE for functions,
--             IF NOT EXISTS / DO blocks for data checks.
--             Safe to run multiple times.
--
-- Run as:    Supabase SQL editor (postgres role)
-- ============================================================

BEGIN;

-- ============================================================
-- STEP 1: Function that runs on every auth.users INSERT
--
-- Logic:
--   a) Create a default organization for the new user named
--      after their email prefix (or "My Organization").
--   b) Insert a user_profiles row linked to that org.
--
-- SECURITY DEFINER: required so the function can write to
-- user_profiles and organizations even though those tables
-- have RLS enabled (the trigger runs as the function owner,
-- not as the new user who has no profile yet).
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id   UUID;
  v_org_name TEXT;
  v_email    TEXT;
  v_name     TEXT;
BEGIN
  -- Extract email from the new auth.users row
  v_email := NEW.email;

  -- Derive a human-friendly display name:
  --   1. Try user_metadata.full_name (set during signUp({ data: { full_name } }))
  --   2. Fall back to the part of the email before the @
  v_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'full_name'), ''),
    SPLIT_PART(COALESCE(v_email, 'User'), '@', 1)
  );

  -- Derive an org name from metadata or email prefix
  v_org_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'organization_name'), ''),
    v_name || '''s Organization'
  );

  -- Guard: if a user_profiles row already exists (e.g. manual
  -- seed), do nothing so we don't violate the PK constraint.
  IF EXISTS (SELECT 1 FROM public.user_profiles WHERE id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- Create the default organization
  INSERT INTO public.organizations (name, settings, created_at, updated_at)
  VALUES (v_org_name, '{}', NOW(), NOW())
  RETURNING id INTO v_org_id;

  -- Create the user_profiles row linked to the new org
  INSERT INTO public.user_profiles (
    id,
    organization_id,
    full_name,
    email,
    role,
    preferences,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    v_org_id,
    v_name,
    v_email,
    'admin',   -- first user in an org is the admin
    '{"language": "he", "timezone": "Asia/Jerusalem", "notifications": {"email": true, "whatsapp": true}}',
    NOW(),
    NOW()
  );

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  -- Log the error but do NOT raise — a trigger that raises will
  -- block the entire auth.users INSERT and prevent signup.
  RAISE WARNING 'handle_new_user() failed for user %: % %',
    NEW.id, SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$;

-- ============================================================
-- STEP 2: Attach the trigger to auth.users
--
-- Drop first so re-runs are safe.
-- AFTER INSERT: the auth.users row must be committed before
-- we reference NEW.id as a foreign key in user_profiles.
-- ============================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- STEP 3: Back-fill any existing auth users who have no
--         user_profiles row (orphaned accounts created before
--         this trigger existed).
--
-- For each orphaned auth.users row:
--   - Create a default org
--   - Create a user_profiles row pointing to that org
--
-- Skips users who already have a profile (idempotent).
-- Skips users who already have a profile with a NULL org_id
-- and patches them with a new org (the second DO block).
-- ============================================================

-- 3a. Create profiles for auth users with NO profile row at all
DO $$
DECLARE
  r            RECORD;
  v_org_id     UUID;
  v_name       TEXT;
  v_org_name   TEXT;
BEGIN
  FOR r IN
    SELECT au.id, au.email, au.raw_user_meta_data
    FROM auth.users au
    WHERE NOT EXISTS (
      SELECT 1 FROM public.user_profiles up WHERE up.id = au.id
    )
  LOOP
    v_name := COALESCE(
      NULLIF(TRIM(r.raw_user_meta_data ->> 'full_name'), ''),
      SPLIT_PART(COALESCE(r.email, 'User'), '@', 1)
    );
    v_org_name := COALESCE(
      NULLIF(TRIM(r.raw_user_meta_data ->> 'organization_name'), ''),
      v_name || '''s Organization'
    );

    INSERT INTO public.organizations (name, settings, created_at, updated_at)
    VALUES (v_org_name, '{}', NOW(), NOW())
    RETURNING id INTO v_org_id;

    INSERT INTO public.user_profiles (
      id, organization_id, full_name, email, role,
      preferences, created_at, updated_at
    ) VALUES (
      r.id, v_org_id, v_name, r.email, 'admin',
      '{"language": "he", "timezone": "Asia/Jerusalem", "notifications": {"email": true, "whatsapp": true}}',
      NOW(), NOW()
    );

    RAISE NOTICE 'Back-filled profile for user % (%)', r.id, r.email;
  END LOOP;
END;
$$;

-- 3b. Patch existing profiles that have organization_id = NULL
DO $$
DECLARE
  r            RECORD;
  v_org_id     UUID;
  v_org_name   TEXT;
BEGIN
  FOR r IN
    SELECT up.id, up.full_name, up.email
    FROM public.user_profiles up
    WHERE up.organization_id IS NULL
  LOOP
    v_org_name := COALESCE(
      NULLIF(TRIM(r.full_name), ''),
      SPLIT_PART(COALESCE(r.email, 'User'), '@', 1)
    ) || '''s Organization';

    INSERT INTO public.organizations (name, settings, created_at, updated_at)
    VALUES (v_org_name, '{}', NOW(), NOW())
    RETURNING id INTO v_org_id;

    UPDATE public.user_profiles
    SET organization_id = v_org_id, updated_at = NOW()
    WHERE id = r.id;

    RAISE NOTICE 'Patched NULL org_id for profile % (%)', r.id, r.email;
  END LOOP;
END;
$$;

-- ============================================================
-- STEP 4: Verify the trigger is wired up
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.triggers
    WHERE trigger_name = 'on_auth_user_created'
      AND event_object_schema = 'auth'
      AND event_object_table = 'users'
  ) THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: trigger on_auth_user_created not found on auth.users';
  ELSE
    RAISE NOTICE 'OK: trigger on_auth_user_created is active on auth.users';
  END IF;
END;
$$;

-- ============================================================
-- STEP 5: Verify no orphaned profiles remain
-- ============================================================
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count
  FROM public.user_profiles
  WHERE organization_id IS NULL;

  IF null_count > 0 THEN
    RAISE WARNING '% user_profiles rows still have NULL organization_id after migration', null_count;
  ELSE
    RAISE NOTICE 'OK: zero user_profiles rows with NULL organization_id';
  END IF;
END;
$$;

COMMIT;


-- ============================================================
-- POST-MIGRATION MANUAL CHECKS (run separately in SQL editor)
-- ============================================================

-- Check the trigger exists
/*
SELECT trigger_name, event_manipulation, event_object_schema,
       event_object_table, action_timing
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
*/

-- Confirm all auth users have profiles with non-null org
/*
SELECT
  au.id,
  au.email,
  up.id        AS profile_id,
  up.organization_id,
  CASE
    WHEN up.id IS NULL THEN 'MISSING PROFILE'
    WHEN up.organization_id IS NULL THEN 'NULL ORG - WILL HIDE ALL EVENTS'
    ELSE 'OK'
  END AS diagnosis
FROM auth.users au
LEFT JOIN public.user_profiles up ON up.id = au.id
ORDER BY diagnosis DESC;
*/
