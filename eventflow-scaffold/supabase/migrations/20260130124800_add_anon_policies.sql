-- Add policies for anon access (fallback for when session issues occur)
DO $$ 
BEGIN
    -- Schedules
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'schedules' AND policyname = 'Enable all access for anon'
    ) THEN
        CREATE POLICY "Enable all access for anon" ON "public"."schedules" AS PERMISSIVE FOR ALL TO anon USING (true) WITH CHECK (true);
    END IF;

    -- Participants
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'participants' AND policyname = 'Enable all access for anon'
    ) THEN
        CREATE POLICY "Enable all access for anon" ON "public"."participants" AS PERMISSIVE FOR ALL TO anon USING (true) WITH CHECK (true);
    END IF;

    -- Participant Schedules
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'participant_schedules' AND policyname = 'Enable all access for anon'
    ) THEN
        CREATE POLICY "Enable all access for anon" ON "public"."participant_schedules" AS PERMISSIVE FOR ALL TO anon USING (true) WITH CHECK (true);
    END IF;
END
$$;
