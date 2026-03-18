-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║   EventFlow AI - Performance Indexes                                         ║
-- ║   Missing indexes identified in performance audit (2026-03-15)               ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

-- ════════════════════════════════════════════════════════════════════════════════
-- EVENTS TABLE
-- Core table — no initial schema.sql found; these are the high-priority indexes.
-- ════════════════════════════════════════════════════════════════════════════════

-- Composite index for the most common RLS + list query pattern:
--   WHERE organization_id = ? ORDER BY start_date DESC
CREATE INDEX IF NOT EXISTS idx_events_org_start_date
  ON events(organization_id, start_date DESC);

-- Status is used heavily for filtering on both EventsPage and HomePage
CREATE INDEX IF NOT EXISTS idx_events_status
  ON events(status);

-- Composite covering filter + sort used in refreshEvents()
CREATE INDEX IF NOT EXISTS idx_events_org_status_start
  ON events(organization_id, status, start_date DESC);

-- ════════════════════════════════════════════════════════════════════════════════
-- PARTICIPANTS TABLE
-- Batch-fetched by event_id in EventContext AND EventsPage (after N+1 fix).
-- ════════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_participants_event_id
  ON participants(event_id);

-- ════════════════════════════════════════════════════════════════════════════════
-- SCHEDULES TABLE
-- Batch-fetched by event_id in EventContext.
-- ════════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_schedules_event_id
  ON schedules(event_id);

-- start_time used for ORDER BY in schedule views and get_participant_schedule()
CREATE INDEX IF NOT EXISTS idx_schedules_event_start_time
  ON schedules(event_id, start_time);

-- ════════════════════════════════════════════════════════════════════════════════
-- CHECKLIST_ITEMS TABLE
-- Batch-fetched by event_id in EventsPage (after N+1 fix).
-- ════════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_checklist_items_event_id
  ON checklist_items(event_id);

-- Composite index supports progress calculation (event_id + status filter)
CREATE INDEX IF NOT EXISTS idx_checklist_items_event_status
  ON checklist_items(event_id, status);

-- ════════════════════════════════════════════════════════════════════════════════
-- EVENT_VENDORS TABLE
-- Batch-fetched by event_id in EventsPage (after N+1 fix).
-- ════════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_event_vendors_event_id
  ON event_vendors(event_id);

-- ════════════════════════════════════════════════════════════════════════════════
-- PUSH_SUBSCRIPTIONS TABLE (from 20260129000001_push_subscriptions.sql)
-- user_id is the primary lookup key.
-- ════════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
  ON push_subscriptions(user_id);

-- ════════════════════════════════════════════════════════════════════════════════
-- USER_PROFILES TABLE
-- organization_id is the join key in RLS policies across many tables.
-- ════════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_user_profiles_organization_id
  ON user_profiles(organization_id);
