-- Missing table: participant_schedules
-- Links participants to specific schedule items

CREATE TABLE IF NOT EXISTS participant_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  reminder_sent BOOLEAN DEFAULT false,
  reminder_sent_at TIMESTAMPTZ,
  checked_in BOOLEAN DEFAULT false,
  checked_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(participant_id, schedule_id)
);

-- Enable RLS
ALTER TABLE participant_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Users can view participant_schedules for their events" ON participant_schedules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM schedules s
      JOIN events e ON e.id = s.event_id
      WHERE s.id = participant_schedules.schedule_id
      AND e.organization_id = auth.user_org_id()
    )
  );

CREATE POLICY "Users can manage participant_schedules for their events" ON participant_schedules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM schedules s
      JOIN events e ON e.id = s.event_id
      WHERE s.id = participant_schedules.schedule_id
      AND e.organization_id = auth.user_org_id()
    )
  );

-- Indexes
CREATE INDEX idx_participant_schedules_participant ON participant_schedules(participant_id);
CREATE INDEX idx_participant_schedules_schedule ON participant_schedules(schedule_id);
CREATE INDEX idx_participant_schedules_reminder ON participant_schedules(reminder_sent) WHERE NOT reminder_sent;
