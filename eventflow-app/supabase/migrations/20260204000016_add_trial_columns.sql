-- Add trial support to organizations table
-- Migration: 20260204000016_add_trial_columns.sql
-- Date: 2026-02-04
-- Description: Add trial_ends_at and trial_started_at columns for 7-day Premium trial

-- Add trial columns
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ;

-- Add index for trial expiration queries
CREATE INDEX IF NOT EXISTS idx_organizations_trial_ends_at ON organizations(trial_ends_at);

-- RLS Policy: Allow authenticated users to read trial status
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view trial status" ON organizations
FOR SELECT USING (auth.uid() IS NOT NULL);

COMMENT ON COLUMN organizations.trial_ends_at IS 'End date for 7-day Premium trial';
COMMENT ON COLUMN organizations.trial_started_at IS 'Start date for 7-day Premium trial';
