-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║           EventFlow AI - Budget Alert System                                 ║
-- ║           Two-tier alerts: 80% warning, 100% critical                        ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

-- ════════════════════════════════════════════════════════════════════════════════
-- ADD BUDGET ALLOCATION TO CHECKLIST ITEMS
-- ════════════════════════════════════════════════════════════════════════════════

-- Add budget_allocation column to checklist_items (idempotent)
ALTER TABLE checklist_items
ADD COLUMN IF NOT EXISTS budget_allocation DECIMAL(12,2);

-- Add comment for documentation
COMMENT ON COLUMN checklist_items.budget_allocation IS 'Allocated budget for this checklist item (pulled from event budget or manually set)';

-- ════════════════════════════════════════════════════════════════════════════════
-- NOTE: event_vendors.approved_amount already exists in schema
-- No need to add it again (already present from initial schema)
-- ════════════════════════════════════════════════════════════════════════════════

-- ════════════════════════════════════════════════════════════════════════════════
-- BUDGET ALERT HISTORY TABLE
-- ════════════════════════════════════════════════════════════════════════════════

-- Create alert type enum if not exists
DO $$ BEGIN
  CREATE TYPE budget_alert_type AS ENUM ('warning', 'critical');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create sent via enum if not exists
DO $$ BEGIN
  CREATE TYPE alert_sent_via AS ENUM ('app', 'whatsapp', 'both');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create budget_alert_history table (idempotent)
CREATE TABLE IF NOT EXISTS budget_alert_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  checklist_item_id UUID NOT NULL REFERENCES checklist_items(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Alert details
  alert_type budget_alert_type NOT NULL,
  threshold_percentage INTEGER NOT NULL CHECK (threshold_percentage IN (80, 100)),
  current_amount DECIMAL(12,2) NOT NULL,
  budget_amount DECIMAL(12,2) NOT NULL,

  -- Notification tracking
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_via alert_sent_via NOT NULL DEFAULT 'both',

  -- Acknowledgment tracking
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES user_profiles(id),
  acknowledgment_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════════════════════════
-- INDEXES
-- ════════════════════════════════════════════════════════════════════════════════

-- Index for quick lookup of alerts by checklist item and type
CREATE INDEX IF NOT EXISTS idx_budget_alert_history_item_type
ON budget_alert_history(checklist_item_id, alert_type);

-- Index for organization isolation
CREATE INDEX IF NOT EXISTS idx_budget_alert_history_org
ON budget_alert_history(organization_id);

-- Index for finding unacknowledged alerts
CREATE INDEX IF NOT EXISTS idx_budget_alert_history_unacknowledged
ON budget_alert_history(event_id, acknowledged_at)
WHERE acknowledged_at IS NULL;

-- ════════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ════════════════════════════════════════════════════════════════════════════════

-- Enable RLS on budget_alert_history
ALTER TABLE budget_alert_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see alerts from their organization
CREATE POLICY budget_alert_history_select_policy ON budget_alert_history
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
);

-- Policy: Users can insert alerts for their organization's events
CREATE POLICY budget_alert_history_insert_policy ON budget_alert_history
FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
);

-- Policy: Users can update alerts (acknowledge) for their organization
CREATE POLICY budget_alert_history_update_policy ON budget_alert_history
FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
);

-- ════════════════════════════════════════════════════════════════════════════════
-- VALIDATION FUNCTION
-- ════════════════════════════════════════════════════════════════════════════════

-- Function to prevent duplicate active alerts for same item+type
CREATE OR REPLACE FUNCTION prevent_duplicate_alerts()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if there's already an unacknowledged alert of same type for this item
  IF EXISTS (
    SELECT 1 FROM budget_alert_history
    WHERE checklist_item_id = NEW.checklist_item_id
      AND alert_type = NEW.alert_type
      AND acknowledged_at IS NULL
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
  ) THEN
    RAISE EXCEPTION 'Unacknowledged alert of type % already exists for this checklist item', NEW.alert_type;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce no duplicate alerts
DROP TRIGGER IF EXISTS budget_alert_duplicate_check ON budget_alert_history;
CREATE TRIGGER budget_alert_duplicate_check
  BEFORE INSERT ON budget_alert_history
  FOR EACH ROW
  EXECUTE FUNCTION prevent_duplicate_alerts();

-- ════════════════════════════════════════════════════════════════════════════════
-- COMMENTS
-- ════════════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE budget_alert_history IS 'Tracks budget alert notifications (80% warning, 100% critical) to prevent duplicate alerts';
COMMENT ON COLUMN budget_alert_history.threshold_percentage IS 'Alert threshold: 80 for warning, 100 for critical';
COMMENT ON COLUMN budget_alert_history.acknowledged_at IS 'When manager acknowledged the alert (null = unacknowledged)';
COMMENT ON COLUMN budget_alert_history.sent_via IS 'Alert delivery method: app badge, WhatsApp, or both';
