-- ══════════════════════════════════════════════════════════════════════════════
-- Migration: Update Rooms Schema for AI
-- Description: Adds room_type and bed_configuration to match AI logic
-- Date: 2026-02-05
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE rooms
ADD COLUMN IF NOT EXISTS room_type VARCHAR(50) DEFAULT 'standard', -- standard, suite, accessible, vip
ADD COLUMN IF NOT EXISTS bed_configuration VARCHAR(50); -- single, double, twin, king
