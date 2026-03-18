-- ═══════════════════════════════════════════════════════════════════════════
-- Super Admin Cross-Organization Access (for Impersonation)
-- Allows super_admin to read data from ANY organization
-- ═══════════════════════════════════════════════════════════════════════════

-- Helper in public schema
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  )
$$;

-- ── events ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "super_admin_see_all_events" ON events;
CREATE POLICY "super_admin_see_all_events" ON events
  FOR SELECT TO authenticated
  USING (public.is_super_admin());

-- ── participants (guests) ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "super_admin_see_all_participants" ON participants;
CREATE POLICY "super_admin_see_all_participants" ON participants
  FOR SELECT TO authenticated
  USING (public.is_super_admin());

-- ── schedules ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "super_admin_see_all_schedules" ON schedules;
CREATE POLICY "super_admin_see_all_schedules" ON schedules
  FOR SELECT TO authenticated
  USING (public.is_super_admin());

-- ── vendors ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "super_admin_see_all_vendors" ON vendors;
CREATE POLICY "super_admin_see_all_vendors" ON vendors
  FOR SELECT TO authenticated
  USING (public.is_super_admin());

-- ── checklist_items ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "super_admin_see_all_checklist" ON checklist_items;
CREATE POLICY "super_admin_see_all_checklist" ON checklist_items
  FOR SELECT TO authenticated
  USING (public.is_super_admin());

-- ── messages ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "super_admin_see_all_messages" ON messages;
CREATE POLICY "super_admin_see_all_messages" ON messages
  FOR SELECT TO authenticated
  USING (public.is_super_admin());

-- ── user_profiles ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "super_admin_see_all_profiles" ON user_profiles;
CREATE POLICY "super_admin_see_all_profiles" ON user_profiles
  FOR SELECT TO authenticated
  USING (public.is_super_admin());
