-- ══════════════════════════════════════════════════════════════════════════════
-- Migration: Participant Ticket Tiers
-- Description: Adds ticket tier classification for participants (Regular, Premium, VIP)
-- Date: 2026-02-05
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Add ticket_tier to participants
ALTER TABLE participants
ADD COLUMN IF NOT EXISTS ticket_tier TEXT DEFAULT 'regular'
CHECK (ticket_tier IN ('regular', 'premium', 'vip'));

-- 2. Add index for AI optimization queries
CREATE INDEX IF NOT EXISTS idx_participants_ticket_tier ON participants(event_id, ticket_tier);

-- 3. Update comments
COMMENT ON COLUMN participants.ticket_tier IS 'Classification of the participant ticket: regular, premium, or vip. Used for automated seating logic.';
