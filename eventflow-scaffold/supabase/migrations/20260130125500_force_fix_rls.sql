-- Force reset of policies to ensure access
-- DROP existing policies to clean slate
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON "public"."schedules";
DROP POLICY IF EXISTS "Enable all access for anon" ON "public"."schedules";
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON "public"."participants";
DROP POLICY IF EXISTS "Enable all access for anon" ON "public"."participants";
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON "public"."participant_schedules";
DROP POLICY IF EXISTS "Enable all access for anon" ON "public"."participant_schedules";

-- Ensure RLS is enabled
ALTER TABLE "public"."schedules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."participants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."participant_schedules" ENABLE ROW LEVEL SECURITY;

-- Re-create permissive policies for schedules
CREATE POLICY "Enable all access for authenticated users" ON "public"."schedules"
AS PERMISSIVE FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable all access for anon" ON "public"."schedules"
AS PERMISSIVE FOR ALL TO anon
USING (true)
WITH CHECK (true);

-- Re-create permissive policies for participants
CREATE POLICY "Enable all access for authenticated users" ON "public"."participants"
AS PERMISSIVE FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable all access for anon" ON "public"."participants"
AS PERMISSIVE FOR ALL TO anon
USING (true)
WITH CHECK (true);

-- Re-create permissive policies for participant_schedules
CREATE POLICY "Enable all access for authenticated users" ON "public"."participant_schedules"
AS PERMISSIVE FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable all access for anon" ON "public"."participant_schedules"
AS PERMISSIVE FOR ALL TO anon
USING (true)
WITH CHECK (true);
