-- Create audit_trail table for tier change logging
-- Migration: 20260204000017_create_audit_trail.sql
-- Date: 2026-02-04
-- Description: Audit trail for admin actions (tier changes, etc)

CREATE TABLE IF NOT EXISTS audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  action_details JSONB NOT NULL,
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_email TEXT,
  admin_name TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster organization_id queries
CREATE INDEX IF NOT EXISTS idx_audit_trail_org_action_type ON audit_trail(organization_id, action_type, created_at DESC);

-- Create index for faster admin_id queries
CREATE INDEX IF NOT EXISTS idx_audit_trail_admin_id ON audit_trail(admin_id, created_at DESC);

COMMENT ON TABLE audit_trail IS 'Audit trail for admin actions including tier changes';
COMMENT ON COLUMN audit_trail.organization_id IS 'ID of the organization affected';
COMMENT ON COLUMN audit_trail.action_type IS 'Type of action (e.g., tier_change)';
COMMENT ON COLUMN audit_trail.action_details IS 'JSON details of the action including old/new values and reason';
COMMENT ON COLUMN audit_trail.admin_id IS 'ID of the admin who performed the action';
COMMENT ON COLUMN audit_trail.admin_email IS 'Email of the admin who performed the action';
COMMENT ON COLUMN audit_trail.admin_name IS 'Name of the admin who performed the action';
COMMENT ON COLUMN audit_trail.ip_address IS 'IP address of the admin';
COMMENT ON COLUMN audit_trail.user_agent IS 'User agent string';
COMMENT ON COLUMN audit_trail.created_at IS 'Timestamp when the action was performed';
