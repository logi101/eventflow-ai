
-- Migration Safe: Day Simulation, Real-Time Contingency & Simulations

-- 1. Create Simulations Table (if not exists)
CREATE TABLE IF NOT EXISTS simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  scenarios JSONB DEFAULT '[]',
  results JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add columns to Schedules
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS backup_speaker_id UUID REFERENCES speakers(id);
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS original_speaker_id UUID REFERENCES speakers(id);
CREATE INDEX IF NOT EXISTS idx_schedules_backup_speaker ON schedules(backup_speaker_id) WHERE backup_speaker_id IS NOT NULL;

-- 3. Create contingency_audit_log table if not exists
CREATE TABLE IF NOT EXISTS contingency_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, 
  action_data JSONB NOT NULL,
  execution_status TEXT NOT NULL DEFAULT 'suggested',
  suggested_by UUID NOT NULL REFERENCES user_profiles(id),
  suggested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_by UUID REFERENCES user_profiles(id),
  approved_at TIMESTAMPTZ,
  executed_by UUID REFERENCES user_profiles(id),
  executed_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES user_profiles(id),
  rejected_at TIMESTAMPTZ,
  reason TEXT NOT NULL, 
  impact_summary JSONB, 
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_execution_status CHECK (execution_status IN ('suggested', 'approved', 'executed', 'rejected', 'failed')),
  CONSTRAINT valid_action_type CHECK (action_type IN ('backup_speaker_activate', 'room_change', 'schedule_adjust', 'time_change', 'session_cancel'))
);

-- 4. Create vendor_analysis table if not exists
CREATE TABLE IF NOT EXISTS vendor_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  vendor_id UUID REFERENCES vendors(id),
  analysis_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_contingency_audit_event ON contingency_audit_log(event_id);
CREATE INDEX IF NOT EXISTS idx_simulations_event ON simulations(event_id);
CREATE INDEX IF NOT EXISTS idx_vendor_analysis_org ON vendor_analysis(organization_id);

-- 6. RLS
ALTER TABLE contingency_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_analysis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert contingency audit logs" ON contingency_audit_log;
CREATE POLICY "Users can insert contingency audit logs" ON contingency_audit_log FOR INSERT WITH CHECK (
    event_id IN (SELECT e.id FROM events e WHERE e.organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()))
);

DROP POLICY IF EXISTS "Users can view contingency audit logs" ON contingency_audit_log;
CREATE POLICY "Users can view contingency audit logs" ON contingency_audit_log FOR SELECT USING (
    event_id IN (SELECT e.id FROM events e WHERE e.organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()))
);

-- 7. Add message_type enum value
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_type') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'schedule_update' AND enumtypid = 'message_type'::regtype) THEN
      ALTER TYPE message_type ADD VALUE 'schedule_update';
    END IF;
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    RAISE NOTICE 'message_type enum does not exist, skipping';
END $$;

-- 8. Add Tier Columns (from Migration 010)
DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE organizations ADD COLUMN tier TEXT DEFAULT 'base';
        ALTER TABLE organizations ADD CONSTRAINT organizations_tier_check CHECK (tier IN ('base', 'premium', 'legacy_premium'));
    EXCEPTION
        WHEN duplicate_column THEN RAISE NOTICE 'tier column already exists';
        WHEN duplicate_object THEN RAISE NOTICE 'tier check constraint already exists';
    END;
END $$;

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS tier_limits JSONB DEFAULT '{"events_per_year": 5, "participants_per_event": 100, "messages_per_month": 200, "ai_chat_messages_per_month": 50}';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS current_usage JSONB DEFAULT '{"events_count": 0, "participants_count": 0, "messages_sent": 0, "ai_messages_sent": 0, "warned_this_month": false}';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS tier_updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS tier_updated_by UUID REFERENCES user_profiles(id);

-- 9. Add RLS Policies for Premium Features
CREATE OR REPLACE FUNCTION check_org_tier(org_id UUID, required_tier TEXT) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
BEGIN
  RETURN (SELECT tier >= required_tier FROM organizations WHERE id = org_id);
END;
$$;

DROP POLICY IF EXISTS "simulations_premium_only" ON simulations;
-- FIX: Removed reference to NEW/OLD in subquery for initial POLICY setup to simple check
CREATE POLICY "simulations_premium_only" ON simulations FOR ALL TO authenticated
USING (
   EXISTS (
     SELECT 1 FROM events e 
     WHERE (e.id = simulations.event_id) 
     AND check_org_tier(e.organization_id, 'premium')
   )
)
WITH CHECK (
   EXISTS (
     SELECT 1 FROM events e 
     WHERE (e.id = event_id) 
     AND check_org_tier(e.organization_id, 'premium')
   )
);

DROP POLICY IF EXISTS "vendor_analysis_premium_only" ON vendor_analysis;
CREATE POLICY "vendor_analysis_premium_only" ON vendor_analysis FOR ALL TO authenticated
USING (check_org_tier(organization_id, 'premium'))
WITH CHECK (check_org_tier(organization_id, 'premium'));

-- 10. Update existing orgs
UPDATE organizations SET tier = 'base' WHERE tier IS NULL;
