-- Migration 010: Add Tier Columns to Organizations Table
-- EventFlow AI v2.1 - SaaS Tier Structure
-- Date: 2026-02-03

-- Add tier column with CHECK constraint (dedicated TEXT, NOT JSONB for RLS performance)
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'base'
CHECK (tier IN ('base', 'premium', 'legacy_premium'));

-- Add index on tier column for RLS query performance
CREATE INDEX IF NOT EXISTS idx_organizations_tier ON organizations(tier);

-- Add tier_limits JSONB column to store limits per tier
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS tier_limits JSONB DEFAULT '{
  "events_per_year": 5,
  "participants_per_event": 100,
  "messages_per_month": 200,
  "ai_chat_messages_per_month": 50
}';

-- Add current_usage JSONB column to track consumption
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS current_usage JSONB DEFAULT '{
  "events_count": 0,
  "participants_count": 0,
  "messages_sent": 0,
  "ai_messages_sent": 0,
  "period_start": "2026-02-01T00:00:00Z",
  "period_end": "2026-03-01T00:00:00Z",
  "warned_this_month": false
}';

-- Add tier_updated_at timestamp for audit trail
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS tier_updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add tier_updated_by UUID to track who changed the tier
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS tier_updated_by UUID REFERENCES user_profiles(id);

-- Add comment explaining the tier column
COMMENT ON COLUMN organizations.tier IS 'Subscription tier: base (free), premium (paid), legacy_premium (grandfathered existing users)';

COMMENT ON COLUMN organizations.tier_limits IS 'Usage limits per tier (events_per_year, participants_per_event, messages_per_month, ai_chat_messages_per_month)';

COMMENT ON COLUMN organizations.current_usage IS 'Current usage counters tracked by triggers (events_count, participants_count, messages_sent, ai_messages_sent)';

-- Update comment for organizations table to include tier structure
COMMENT ON TABLE organizations IS 'Organization profile with tier configuration (Base: 5 events/yr, 100 participants/event, 200 messages/mo; Premium: unlimited)';
