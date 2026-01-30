-- Enable RLS (idempotent)
ALTER TABLE "public"."schedules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."participants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."participant_schedules" ENABLE ROW LEVEL SECURITY;

-- Create policies if they don't exist
DO $$ 
BEGIN
    -- Schedules
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'schedules' AND policyname = 'Enable all access for authenticated users'
    ) THEN
        CREATE POLICY "Enable all access for authenticated users" ON "public"."schedules" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;

    -- Participants
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'participants' AND policyname = 'Enable all access for authenticated users'
    ) THEN
        CREATE POLICY "Enable all access for authenticated users" ON "public"."participants" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;

    -- Participant Schedules
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'participant_schedules' AND policyname = 'Enable all access for authenticated users'
    ) THEN
        CREATE POLICY "Enable all access for authenticated users" ON "public"."participant_schedules" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
END
$$;
