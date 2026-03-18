-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  SECURITY FIX: Program Management RLS                                       ║
-- ║  Migration: 20260315000002_fix_program_management_rls.sql                   ║
-- ║  Fixes: Migration 20260120_program_management.sql open policies             ║
-- ║  Tables: program_days, tracks, rooms, time_blocks, speakers,                ║
-- ║           session_speakers, contingencies, schedule_changes,                ║
-- ║           participant_tracks, room_bookings                                  ║
-- ║  Also fixes: check_org_tier() information disclosure                         ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

-- ============================================================================
-- SECTION 1: DROP ALL OPEN POLICIES FROM 20260120_program_management.sql
-- ============================================================================

-- program_days
DROP POLICY IF EXISTS "public_program_days_select" ON program_days;
DROP POLICY IF EXISTS "public_program_days_insert" ON program_days;
DROP POLICY IF EXISTS "public_program_days_update" ON program_days;
DROP POLICY IF EXISTS "public_program_days_delete" ON program_days;

-- tracks
DROP POLICY IF EXISTS "public_tracks_select" ON tracks;
DROP POLICY IF EXISTS "public_tracks_insert" ON tracks;
DROP POLICY IF EXISTS "public_tracks_update" ON tracks;
DROP POLICY IF EXISTS "public_tracks_delete" ON tracks;

-- rooms
DROP POLICY IF EXISTS "public_rooms_select" ON rooms;
DROP POLICY IF EXISTS "public_rooms_insert" ON rooms;
DROP POLICY IF EXISTS "public_rooms_update" ON rooms;
DROP POLICY IF EXISTS "public_rooms_delete" ON rooms;

-- time_blocks
DROP POLICY IF EXISTS "public_time_blocks_select" ON time_blocks;
DROP POLICY IF EXISTS "public_time_blocks_insert" ON time_blocks;
DROP POLICY IF EXISTS "public_time_blocks_update" ON time_blocks;
DROP POLICY IF EXISTS "public_time_blocks_delete" ON time_blocks;

-- speakers
DROP POLICY IF EXISTS "public_speakers_select" ON speakers;
DROP POLICY IF EXISTS "public_speakers_insert" ON speakers;
DROP POLICY IF EXISTS "public_speakers_update" ON speakers;
DROP POLICY IF EXISTS "public_speakers_delete" ON speakers;

-- session_speakers
DROP POLICY IF EXISTS "public_session_speakers_select" ON session_speakers;
DROP POLICY IF EXISTS "public_session_speakers_insert" ON session_speakers;
DROP POLICY IF EXISTS "public_session_speakers_update" ON session_speakers;
DROP POLICY IF EXISTS "public_session_speakers_delete" ON session_speakers;

-- contingencies
DROP POLICY IF EXISTS "public_contingencies_select" ON contingencies;
DROP POLICY IF EXISTS "public_contingencies_insert" ON contingencies;
DROP POLICY IF EXISTS "public_contingencies_update" ON contingencies;
DROP POLICY IF EXISTS "public_contingencies_delete" ON contingencies;

-- schedule_changes
DROP POLICY IF EXISTS "public_schedule_changes_select" ON schedule_changes;
DROP POLICY IF EXISTS "public_schedule_changes_insert" ON schedule_changes;
DROP POLICY IF EXISTS "public_schedule_changes_update" ON schedule_changes;
DROP POLICY IF EXISTS "public_schedule_changes_delete" ON schedule_changes;

-- participant_tracks
DROP POLICY IF EXISTS "public_participant_tracks_select" ON participant_tracks;
DROP POLICY IF EXISTS "public_participant_tracks_insert" ON participant_tracks;
DROP POLICY IF EXISTS "public_participant_tracks_update" ON participant_tracks;
DROP POLICY IF EXISTS "public_participant_tracks_delete" ON participant_tracks;

-- room_bookings
DROP POLICY IF EXISTS "public_room_bookings_select" ON room_bookings;
DROP POLICY IF EXISTS "public_room_bookings_insert" ON room_bookings;
DROP POLICY IF EXISTS "public_room_bookings_update" ON room_bookings;
DROP POLICY IF EXISTS "public_room_bookings_delete" ON room_bookings;

-- ============================================================================
-- SECTION 2: HELPER — org-scoped event subquery
-- Reusable pattern: events that belong to the authenticated user's organization
-- ============================================================================
-- NOTE: No function created here; inline subquery keeps SECURITY DEFINER
-- chain short and prevents function execution permission leaks.
-- Pattern used throughout:
--   event_id IN (
--     SELECT e.id FROM events e
--     WHERE e.organization_id = (
--       SELECT organization_id FROM user_profiles WHERE id = auth.uid()
--     )
--   )

-- ============================================================================
-- SECTION 3: PROPER ORG-SCOPED POLICIES
-- Anon role: zero access (no policies = deny by default when RLS is enabled)
-- Authenticated role: only their own organization's data
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- program_days  (event_id direct)
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "program_days_org_select"
ON program_days FOR SELECT
TO authenticated
USING (
  event_id IN (
    SELECT e.id FROM events e
    WHERE e.organization_id = (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "program_days_org_insert"
ON program_days FOR INSERT
TO authenticated
WITH CHECK (
  event_id IN (
    SELECT e.id FROM events e
    WHERE e.organization_id = (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "program_days_org_update"
ON program_days FOR UPDATE
TO authenticated
USING (
  event_id IN (
    SELECT e.id FROM events e
    WHERE e.organization_id = (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  )
)
WITH CHECK (
  event_id IN (
    SELECT e.id FROM events e
    WHERE e.organization_id = (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "program_days_org_delete"
ON program_days FOR DELETE
TO authenticated
USING (
  event_id IN (
    SELECT e.id FROM events e
    WHERE e.organization_id = (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  )
);

-- ────────────────────────────────────────────────────────────────────────────
-- tracks  (event_id direct)
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "tracks_org_select"
ON tracks FOR SELECT
TO authenticated
USING (
  event_id IN (
    SELECT e.id FROM events e
    WHERE e.organization_id = (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "tracks_org_insert"
ON tracks FOR INSERT
TO authenticated
WITH CHECK (
  event_id IN (
    SELECT e.id FROM events e
    WHERE e.organization_id = (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "tracks_org_update"
ON tracks FOR UPDATE
TO authenticated
USING (
  event_id IN (
    SELECT e.id FROM events e
    WHERE e.organization_id = (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  )
)
WITH CHECK (
  event_id IN (
    SELECT e.id FROM events e
    WHERE e.organization_id = (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "tracks_org_delete"
ON tracks FOR DELETE
TO authenticated
USING (
  event_id IN (
    SELECT e.id FROM events e
    WHERE e.organization_id = (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  )
);

-- ────────────────────────────────────────────────────────────────────────────
-- rooms  (event_id direct)
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "rooms_org_select"
ON rooms FOR SELECT
TO authenticated
USING (
  event_id IN (
    SELECT e.id FROM events e
    WHERE e.organization_id = (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "rooms_org_insert"
ON rooms FOR INSERT
TO authenticated
WITH CHECK (
  event_id IN (
    SELECT e.id FROM events e
    WHERE e.organization_id = (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "rooms_org_update"
ON rooms FOR UPDATE
TO authenticated
USING (
  event_id IN (
    SELECT e.id FROM events e
    WHERE e.organization_id = (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  )
)
WITH CHECK (
  event_id IN (
    SELECT e.id FROM events e
    WHERE e.organization_id = (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "rooms_org_delete"
ON rooms FOR DELETE
TO authenticated
USING (
  event_id IN (
    SELECT e.id FROM events e
    WHERE e.organization_id = (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  )
);

-- ────────────────────────────────────────────────────────────────────────────
-- time_blocks  (program_day_id -> program_days.event_id)
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "time_blocks_org_select"
ON time_blocks FOR SELECT
TO authenticated
USING (
  program_day_id IN (
    SELECT pd.id FROM program_days pd
    WHERE pd.event_id IN (
      SELECT e.id FROM events e
      WHERE e.organization_id = (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  )
);

CREATE POLICY "time_blocks_org_insert"
ON time_blocks FOR INSERT
TO authenticated
WITH CHECK (
  program_day_id IN (
    SELECT pd.id FROM program_days pd
    WHERE pd.event_id IN (
      SELECT e.id FROM events e
      WHERE e.organization_id = (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  )
);

CREATE POLICY "time_blocks_org_update"
ON time_blocks FOR UPDATE
TO authenticated
USING (
  program_day_id IN (
    SELECT pd.id FROM program_days pd
    WHERE pd.event_id IN (
      SELECT e.id FROM events e
      WHERE e.organization_id = (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  )
)
WITH CHECK (
  program_day_id IN (
    SELECT pd.id FROM program_days pd
    WHERE pd.event_id IN (
      SELECT e.id FROM events e
      WHERE e.organization_id = (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  )
);

CREATE POLICY "time_blocks_org_delete"
ON time_blocks FOR DELETE
TO authenticated
USING (
  program_day_id IN (
    SELECT pd.id FROM program_days pd
    WHERE pd.event_id IN (
      SELECT e.id FROM events e
      WHERE e.organization_id = (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  )
);

-- ────────────────────────────────────────────────────────────────────────────
-- speakers  (event_id direct)
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "speakers_org_select"
ON speakers FOR SELECT
TO authenticated
USING (
  event_id IN (
    SELECT e.id FROM events e
    WHERE e.organization_id = (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "speakers_org_insert"
ON speakers FOR INSERT
TO authenticated
WITH CHECK (
  event_id IN (
    SELECT e.id FROM events e
    WHERE e.organization_id = (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "speakers_org_update"
ON speakers FOR UPDATE
TO authenticated
USING (
  event_id IN (
    SELECT e.id FROM events e
    WHERE e.organization_id = (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  )
)
WITH CHECK (
  event_id IN (
    SELECT e.id FROM events e
    WHERE e.organization_id = (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "speakers_org_delete"
ON speakers FOR DELETE
TO authenticated
USING (
  event_id IN (
    SELECT e.id FROM events e
    WHERE e.organization_id = (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  )
);

-- ────────────────────────────────────────────────────────────────────────────
-- session_speakers  (schedule_id -> schedules.event_id)
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "session_speakers_org_select"
ON session_speakers FOR SELECT
TO authenticated
USING (
  schedule_id IN (
    SELECT s.id FROM schedules s
    WHERE s.event_id IN (
      SELECT e.id FROM events e
      WHERE e.organization_id = (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  )
);

CREATE POLICY "session_speakers_org_insert"
ON session_speakers FOR INSERT
TO authenticated
WITH CHECK (
  schedule_id IN (
    SELECT s.id FROM schedules s
    WHERE s.event_id IN (
      SELECT e.id FROM events e
      WHERE e.organization_id = (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  )
);

CREATE POLICY "session_speakers_org_update"
ON session_speakers FOR UPDATE
TO authenticated
USING (
  schedule_id IN (
    SELECT s.id FROM schedules s
    WHERE s.event_id IN (
      SELECT e.id FROM events e
      WHERE e.organization_id = (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  )
)
WITH CHECK (
  schedule_id IN (
    SELECT s.id FROM schedules s
    WHERE s.event_id IN (
      SELECT e.id FROM events e
      WHERE e.organization_id = (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  )
);

CREATE POLICY "session_speakers_org_delete"
ON session_speakers FOR DELETE
TO authenticated
USING (
  schedule_id IN (
    SELECT s.id FROM schedules s
    WHERE s.event_id IN (
      SELECT e.id FROM events e
      WHERE e.organization_id = (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  )
);

-- ────────────────────────────────────────────────────────────────────────────
-- contingencies  (event_id direct)
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "contingencies_org_select"
ON contingencies FOR SELECT
TO authenticated
USING (
  event_id IN (
    SELECT e.id FROM events e
    WHERE e.organization_id = (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "contingencies_org_insert"
ON contingencies FOR INSERT
TO authenticated
WITH CHECK (
  event_id IN (
    SELECT e.id FROM events e
    WHERE e.organization_id = (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "contingencies_org_update"
ON contingencies FOR UPDATE
TO authenticated
USING (
  event_id IN (
    SELECT e.id FROM events e
    WHERE e.organization_id = (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  )
)
WITH CHECK (
  event_id IN (
    SELECT e.id FROM events e
    WHERE e.organization_id = (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "contingencies_org_delete"
ON contingencies FOR DELETE
TO authenticated
USING (
  event_id IN (
    SELECT e.id FROM events e
    WHERE e.organization_id = (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  )
);

-- ────────────────────────────────────────────────────────────────────────────
-- schedule_changes  (schedule_id -> schedules.event_id)
-- Audit log: authenticated users in the org can select and insert;
-- no update/delete allowed (immutable audit trail).
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "schedule_changes_org_select"
ON schedule_changes FOR SELECT
TO authenticated
USING (
  schedule_id IN (
    SELECT s.id FROM schedules s
    WHERE s.event_id IN (
      SELECT e.id FROM events e
      WHERE e.organization_id = (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  )
);

CREATE POLICY "schedule_changes_org_insert"
ON schedule_changes FOR INSERT
TO authenticated
WITH CHECK (
  schedule_id IN (
    SELECT s.id FROM schedules s
    WHERE s.event_id IN (
      SELECT e.id FROM events e
      WHERE e.organization_id = (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  )
);

-- No update or delete policies for schedule_changes: audit records are immutable.

-- ────────────────────────────────────────────────────────────────────────────
-- participant_tracks  (participant_id -> participants.event_id)
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "participant_tracks_org_select"
ON participant_tracks FOR SELECT
TO authenticated
USING (
  participant_id IN (
    SELECT p.id FROM participants p
    WHERE p.event_id IN (
      SELECT e.id FROM events e
      WHERE e.organization_id = (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  )
);

CREATE POLICY "participant_tracks_org_insert"
ON participant_tracks FOR INSERT
TO authenticated
WITH CHECK (
  participant_id IN (
    SELECT p.id FROM participants p
    WHERE p.event_id IN (
      SELECT e.id FROM events e
      WHERE e.organization_id = (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  )
);

CREATE POLICY "participant_tracks_org_update"
ON participant_tracks FOR UPDATE
TO authenticated
USING (
  participant_id IN (
    SELECT p.id FROM participants p
    WHERE p.event_id IN (
      SELECT e.id FROM events e
      WHERE e.organization_id = (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  )
)
WITH CHECK (
  participant_id IN (
    SELECT p.id FROM participants p
    WHERE p.event_id IN (
      SELECT e.id FROM events e
      WHERE e.organization_id = (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  )
);

CREATE POLICY "participant_tracks_org_delete"
ON participant_tracks FOR DELETE
TO authenticated
USING (
  participant_id IN (
    SELECT p.id FROM participants p
    WHERE p.event_id IN (
      SELECT e.id FROM events e
      WHERE e.organization_id = (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  )
);

-- ────────────────────────────────────────────────────────────────────────────
-- room_bookings  (program_day_id -> program_days.event_id)
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "room_bookings_org_select"
ON room_bookings FOR SELECT
TO authenticated
USING (
  program_day_id IN (
    SELECT pd.id FROM program_days pd
    WHERE pd.event_id IN (
      SELECT e.id FROM events e
      WHERE e.organization_id = (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  )
);

CREATE POLICY "room_bookings_org_insert"
ON room_bookings FOR INSERT
TO authenticated
WITH CHECK (
  program_day_id IN (
    SELECT pd.id FROM program_days pd
    WHERE pd.event_id IN (
      SELECT e.id FROM events e
      WHERE e.organization_id = (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  )
);

CREATE POLICY "room_bookings_org_update"
ON room_bookings FOR UPDATE
TO authenticated
USING (
  program_day_id IN (
    SELECT pd.id FROM program_days pd
    WHERE pd.event_id IN (
      SELECT e.id FROM events e
      WHERE e.organization_id = (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  )
)
WITH CHECK (
  program_day_id IN (
    SELECT pd.id FROM program_days pd
    WHERE pd.event_id IN (
      SELECT e.id FROM events e
      WHERE e.organization_id = (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  )
);

CREATE POLICY "room_bookings_org_delete"
ON room_bookings FOR DELETE
TO authenticated
USING (
  program_day_id IN (
    SELECT pd.id FROM program_days pd
    WHERE pd.event_id IN (
      SELECT e.id FROM events e
      WHERE e.organization_id = (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  )
);

-- ============================================================================
-- SECTION 4: FIX check_org_tier() INFORMATION DISCLOSURE
-- Any authenticated user could call check_org_tier(any_uuid, 'premium') to
-- probe whether an arbitrary organization is on the premium tier.
-- Fix: revoke EXECUTE from authenticated and public; only SECURITY DEFINER
-- callers (RLS policies and internal functions) can invoke it.
-- ============================================================================

-- Revoke from the roles that should never call it directly.
REVOKE EXECUTE ON FUNCTION check_org_tier(UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION check_org_tier(UUID, TEXT) FROM authenticated;
REVOKE EXECUTE ON FUNCTION check_org_tier(UUID, TEXT) FROM anon;

-- check_event_org_tier wraps check_org_tier and has the same exposure risk.
REVOKE EXECUTE ON FUNCTION check_event_org_tier(UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION check_event_org_tier(UUID, TEXT) FROM authenticated;
REVOKE EXECUTE ON FUNCTION check_event_org_tier(UUID, TEXT) FROM anon;

-- RLS policies run as the table owner (postgres/superuser), which retains
-- EXECUTE on all functions by default, so existing premium-gate policies
-- on simulations, ai_chat_sessions, and vendor_analysis continue to work.

-- ============================================================================
-- SECTION 5: VERIFICATION QUERIES
-- Run these manually after applying the migration to confirm correctness.
-- ============================================================================

DO $$
DECLARE
  v_open_policies INTEGER;
  v_table_name    TEXT;
  v_tables        TEXT[] := ARRAY[
    'program_days', 'tracks', 'rooms', 'time_blocks', 'speakers',
    'session_speakers', 'contingencies', 'schedule_changes',
    'participant_tracks', 'room_bookings'
  ];
BEGIN
  -- 1. Confirm no open (USING true) policies remain on the 10 tables
  SELECT COUNT(*) INTO v_open_policies
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = ANY(v_tables)
    AND (qual = '(true)' OR with_check = '(true)');

  IF v_open_policies > 0 THEN
    RAISE WARNING 'SECURITY: % open policy/policies still present on program management tables', v_open_policies;
  ELSE
    RAISE NOTICE 'OK: No open (true) policies on program management tables';
  END IF;

  -- 2. Confirm all 10 tables have RLS enabled
  FOR v_table_name IN SELECT unnest(v_tables) LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = v_table_name
        AND c.relrowsecurity = TRUE
    ) THEN
      RAISE WARNING 'SECURITY: RLS not enabled on table: %', v_table_name;
    END IF;
  END LOOP;

  -- 3. Confirm check_org_tier is not callable by authenticated/anon
  IF EXISTS (
    SELECT 1
    FROM information_schema.routine_privileges
    WHERE routine_name = 'check_org_tier'
      AND grantee IN ('authenticated', 'anon', 'PUBLIC', 'public')
      AND privilege_type = 'EXECUTE'
  ) THEN
    RAISE WARNING 'SECURITY: check_org_tier() still has EXECUTE grant for authenticated/anon';
  ELSE
    RAISE NOTICE 'OK: check_org_tier() not directly callable by authenticated or anon';
  END IF;

  RAISE NOTICE 'Verification complete. Review any WARNING lines above.';
END $$;

-- ============================================================================
-- Manual spot-check queries (run as anon/authenticated test users to confirm):
-- ============================================================================
--
-- As anon (should return 0 rows for all tables):
--   SET ROLE anon;
--   SELECT COUNT(*) FROM program_days;   -- expect 0
--   SELECT COUNT(*) FROM speakers;       -- expect 0
--   SELECT COUNT(*) FROM contingencies;  -- expect 0
--
-- As authenticated user from org A (should not see org B data):
--   SET ROLE authenticated;
--   SET request.jwt.claims TO '{"sub":"<user_a_uuid>"}';
--   SELECT COUNT(*) FROM speakers;  -- should only count org A speakers
--
-- check_org_tier information disclosure (should fail with permission denied):
--   SELECT check_org_tier('<any_org_uuid>', 'premium');  -- expect ERROR
-- ============================================================================
