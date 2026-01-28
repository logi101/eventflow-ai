-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║                    EventFlow AI - Complete Database Schema                   ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ════════════════════════════════════════════════════════════════════════════════
-- ENUMS
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TYPE event_status AS ENUM ('draft', 'planning', 'active', 'completed', 'cancelled');
CREATE TYPE participant_status AS ENUM ('invited', 'confirmed', 'declined', 'maybe', 'checked_in', 'no_show');
CREATE TYPE vendor_status AS ENUM ('pending', 'quote_requested', 'quoted', 'approved', 'rejected', 'confirmed');
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'blocked', 'cancelled');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE message_type AS ENUM ('invitation', 'reminder', 'reminder_day_before', 'reminder_morning', 'reminder_15min', 'update', 'schedule', 'thank_you', 'feedback_request', 'quote_request', 'vendor_reminder', 'custom');
CREATE TYPE message_status AS ENUM ('pending', 'scheduled', 'sent', 'delivered', 'read', 'failed');
CREATE TYPE message_channel AS ENUM ('whatsapp', 'email', 'sms');
CREATE TYPE invitation_type AS ENUM ('info_only', 'rsvp', 'registration', 'registration_paid');

-- ════════════════════════════════════════════════════════════════════════════════
-- ORGANIZATIONS & USERS
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id),
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  role TEXT DEFAULT 'member',
  avatar_url TEXT,
  preferences JSONB DEFAULT '{"language": "he", "timezone": "Asia/Jerusalem", "notifications": {"email": true, "whatsapp": true}}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- API Credentials (encrypted)
CREATE TABLE api_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  service TEXT NOT NULL, -- 'green_api', 'gemini', 'google_calendar', 'stripe'
  credentials_encrypted TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, service)
);

-- ════════════════════════════════════════════════════════════════════════════════
-- EVENT TYPES & TEMPLATES
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE event_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id),
  name TEXT NOT NULL,
  name_en TEXT,
  icon TEXT,
  description TEXT,
  default_checklist JSONB DEFAULT '[]',
  default_settings JSONB DEFAULT '{"allow_plus_one": false, "require_dietary_info": true, "send_reminders": true}',
  is_system BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════════════════════════
-- EVENTS
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id),
  event_type_id UUID REFERENCES event_types(id),
  created_by UUID REFERENCES user_profiles(id),
  name TEXT NOT NULL,
  description TEXT,
  status event_status DEFAULT 'draft',
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  timezone TEXT DEFAULT 'Asia/Jerusalem',
  venue_name TEXT,
  venue_address TEXT,
  venue_city TEXT,
  venue_coordinates JSONB,
  venue_notes TEXT,
  max_participants INTEGER,
  allow_plus_one BOOLEAN DEFAULT FALSE,
  allow_waitlist BOOLEAN DEFAULT FALSE,
  invitation_type invitation_type DEFAULT 'rsvp',
  registration_deadline TIMESTAMPTZ,
  budget DECIMAL(12,2),
  currency TEXT DEFAULT 'ILS',
  settings JSONB DEFAULT '{"send_reminders": true, "reminder_day_before": true, "reminder_morning": true, "reminder_15min": true}',
  registration_settings JSONB DEFAULT '{"custom_fields": []}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════════════════════════
-- PARTICIPANTS
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  full_name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
  email TEXT,
  phone TEXT NOT NULL,
  phone_normalized TEXT,
  status participant_status DEFAULT 'invited',
  has_companion BOOLEAN DEFAULT FALSE,
  companion_name TEXT,
  companion_phone TEXT,
  companion_phone_normalized TEXT,
  companion_dietary TEXT[],
  dietary_restrictions TEXT[],
  accessibility_needs TEXT,
  needs_transportation BOOLEAN DEFAULT FALSE,
  transportation_location TEXT,
  notes TEXT,
  internal_notes TEXT,
  custom_fields JSONB DEFAULT '{}',
  is_vip BOOLEAN DEFAULT FALSE,
  vip_notes TEXT,
  invited_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  checked_in_at TIMESTAMPTZ,
  checked_in_by UUID REFERENCES user_profiles(id),
  import_source TEXT,
  import_batch_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════════════════════════
-- SCHEDULES
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  location TEXT,
  room TEXT,
  max_capacity INTEGER,
  current_count INTEGER DEFAULT 0,
  is_mandatory BOOLEAN DEFAULT FALSE,
  is_break BOOLEAN DEFAULT FALSE,
  track TEXT,
  track_color TEXT,
  speaker_name TEXT,
  speaker_title TEXT,
  speaker_bio TEXT,
  speaker_image TEXT,
  materials_url TEXT,
  send_reminder BOOLEAN DEFAULT TRUE,
  reminder_minutes_before INTEGER DEFAULT 15,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE participant_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  is_companion BOOLEAN DEFAULT FALSE,
  reminder_sent BOOLEAN DEFAULT FALSE,
  reminder_sent_at TIMESTAMPTZ,
  attended BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(participant_id, schedule_id, is_companion)
);

-- ════════════════════════════════════════════════════════════════════════════════
-- VENDORS
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE vendor_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id),
  name TEXT NOT NULL,
  name_en TEXT,
  icon TEXT,
  is_system BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id),
  category_id UUID REFERENCES vendor_categories(id),
  name TEXT NOT NULL,
  description TEXT,
  contact_name TEXT,
  phone TEXT,
  phone_secondary TEXT,
  email TEXT,
  website TEXT,
  address TEXT,
  facebook_url TEXT,
  instagram_url TEXT,
  business_number TEXT,
  rating_average DECIMAL(3,2),
  rating_count INTEGER DEFAULT 0,
  total_events INTEGER DEFAULT 0,
  tags TEXT[],
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  is_preferred BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE event_vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  category_id UUID REFERENCES vendor_categories(id),
  status vendor_status DEFAULT 'pending',
  quote_requested_at TIMESTAMPTZ,
  quote_request_notes TEXT,
  quote_received_at TIMESTAMPTZ,
  quoted_amount DECIMAL(12,2),
  quote_valid_until TIMESTAMPTZ,
  quote_notes TEXT,
  quote_document_url TEXT,
  approved_amount DECIMAL(12,2),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES user_profiles(id),
  contract_signed BOOLEAN DEFAULT FALSE,
  contract_document_url TEXT,
  payment_terms TEXT,
  deposit_amount DECIMAL(12,2),
  deposit_paid BOOLEAN DEFAULT FALSE,
  final_amount DECIMAL(12,2),
  final_paid BOOLEAN DEFAULT FALSE,
  arrival_time TIMESTAMPTZ,
  arrival_confirmed BOOLEAN DEFAULT FALSE,
  arrival_confirmed_at TIMESTAMPTZ,
  actual_arrival_time TIMESTAMPTZ,
  post_event_rating INTEGER CHECK (post_event_rating >= 1 AND post_event_rating <= 5),
  post_event_notes TEXT,
  would_use_again BOOLEAN,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, vendor_id)
);

-- ════════════════════════════════════════════════════════════════════════════════
-- CHECKLIST
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE checklist_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES checklist_items(id),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  status task_status DEFAULT 'pending',
  priority task_priority DEFAULT 'medium',
  assigned_to UUID REFERENCES user_profiles(id),
  assigned_vendor_id UUID REFERENCES event_vendors(id),
  due_date TIMESTAMPTZ,
  due_days_before INTEGER,
  reminder_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES user_profiles(id),
  depends_on UUID REFERENCES checklist_items(id),
  blocks TEXT[],
  is_from_template BOOLEAN DEFAULT FALSE,
  template_item_id TEXT,
  attachments JSONB DEFAULT '[]',
  comments JSONB DEFAULT '[]',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════════════════════════
-- MESSAGES
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE message_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id),
  name TEXT NOT NULL,
  type message_type NOT NULL,
  channel message_channel DEFAULT 'whatsapp',
  subject TEXT,
  content_template TEXT NOT NULL,
  auto_send BOOLEAN DEFAULT FALSE,
  auto_send_trigger TEXT,
  auto_send_time TIME,
  conditions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES vendors(id),
  schedule_id UUID REFERENCES schedules(id),
  type message_type NOT NULL,
  channel message_channel DEFAULT 'whatsapp',
  template_id UUID REFERENCES message_templates(id),
  recipient_name TEXT,
  recipient_phone TEXT,
  recipient_email TEXT,
  is_companion BOOLEAN DEFAULT FALSE,
  subject TEXT,
  content TEXT NOT NULL,
  status message_status DEFAULT 'pending',
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  external_message_id TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE message_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  scheduled_for TIMESTAMPTZ NOT NULL,
  priority INTEGER DEFAULT 0,
  processing_started_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════════════════════════
-- FEEDBACK
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE feedback_surveys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  questions JSONB NOT NULL DEFAULT '[]',
  is_anonymous BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  send_delay_hours INTEGER DEFAULT 2,
  sent_at TIMESTAMPTZ,
  response_deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE feedback_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  survey_id UUID NOT NULL REFERENCES feedback_surveys(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES participants(id),
  responses JSONB NOT NULL DEFAULT '{}',
  overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5),
  would_recommend INTEGER CHECK (would_recommend >= 0 AND would_recommend <= 10),
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE event_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE UNIQUE,
  created_by UUID REFERENCES user_profiles(id),
  what_worked TEXT,
  what_to_improve TEXT,
  lessons_learned TEXT,
  unexpected_issues TEXT,
  actual_attendance INTEGER,
  expected_attendance INTEGER,
  actual_budget DECIMAL(12,2),
  budget_variance DECIMAL(12,2),
  vendor_assessments JSONB DEFAULT '[]',
  follow_up_needed BOOLEAN DEFAULT FALSE,
  follow_up_date TIMESTAMPTZ,
  follow_up_notes TEXT,
  follow_up_completed BOOLEAN DEFAULT FALSE,
  follow_up_completed_at TIMESTAMPTZ,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE learned_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id),
  event_type_id UUID REFERENCES event_types(id),
  insight_type TEXT NOT NULL,
  insight TEXT NOT NULL,
  context JSONB DEFAULT '{}',
  occurrence_count INTEGER DEFAULT 1,
  suggested_action TEXT,
  applied_to_template BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════════════════════════
-- AI CHAT
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE ai_chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  event_id UUID REFERENCES events(id),
  title TEXT,
  context JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  actions JSONB DEFAULT '[]',
  tokens_used INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════════════════════════
-- CALENDAR SYNC
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE calendar_syncs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  provider TEXT NOT NULL,
  tokens_encrypted TEXT NOT NULL,
  calendar_id TEXT,
  sync_enabled BOOLEAN DEFAULT TRUE,
  last_synced_at TIMESTAMPTZ,
  sync_errors JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  calendar_sync_id UUID NOT NULL REFERENCES calendar_syncs(id) ON DELETE CASCADE,
  external_event_id TEXT NOT NULL,
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, calendar_sync_id)
);

-- ════════════════════════════════════════════════════════════════════════════════
-- FUNCTIONS & TRIGGERS
-- ════════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION normalize_phone(phone TEXT)
RETURNS TEXT AS $$
BEGIN
  phone := regexp_replace(phone, '[^0-9]', '', 'g');
  IF phone LIKE '0%' THEN
    phone := '972' || substring(phone from 2);
  END IF;
  RETURN phone;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_normalize_phones()
RETURNS TRIGGER AS $$
BEGIN
  NEW.phone_normalized := normalize_phone(NEW.phone);
  IF NEW.companion_phone IS NOT NULL THEN
    NEW.companion_phone_normalized := normalize_phone(NEW.companion_phone);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER participants_normalize_phones
  BEFORE INSERT OR UPDATE ON participants
  FOR EACH ROW EXECUTE FUNCTION trigger_normalize_phones();

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_participants_updated_at BEFORE UPDATE ON participants FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_event_vendors_updated_at BEFORE UPDATE ON event_vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_checklist_items_updated_at BEFORE UPDATE ON checklist_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION update_schedule_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE schedules SET current_count = current_count + 1 WHERE id = NEW.schedule_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE schedules SET current_count = current_count - 1 WHERE id = OLD.schedule_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_schedule_count_trigger
  AFTER INSERT OR DELETE ON participant_schedules
  FOR EACH ROW EXECUTE FUNCTION update_schedule_count();

-- ════════════════════════════════════════════════════════════════════════════════
-- INDEXES
-- ════════════════════════════════════════════════════════════════════════════════

CREATE INDEX idx_events_org ON events(organization_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_start_date ON events(start_date);
CREATE INDEX idx_participants_event ON participants(event_id);
CREATE INDEX idx_participants_status ON participants(status);
CREATE INDEX idx_participants_phone ON participants(phone_normalized);
CREATE INDEX idx_schedules_event ON schedules(event_id);
CREATE INDEX idx_schedules_time ON schedules(start_time);
CREATE INDEX idx_vendors_org ON vendors(organization_id);
CREATE INDEX idx_event_vendors_event ON event_vendors(event_id);
CREATE INDEX idx_checklist_event ON checklist_items(event_id);
CREATE INDEX idx_checklist_status ON checklist_items(status);
CREATE INDEX idx_messages_event ON messages(event_id);
CREATE INDEX idx_messages_status ON messages(status);
CREATE INDEX idx_messages_scheduled ON messages(scheduled_for);
CREATE INDEX idx_message_queue_scheduled ON message_queue(scheduled_for, status);

-- ════════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ════════════════════════════════════════════════════════════════════════════════

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE participant_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION auth.user_organization_id()
RETURNS UUID AS $$
  SELECT organization_id FROM user_profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

CREATE POLICY "Users can view their organization" ON organizations FOR SELECT USING (id = auth.user_organization_id());
CREATE POLICY "Users can view events in their organization" ON events FOR ALL USING (organization_id = auth.user_organization_id());
CREATE POLICY "Users can manage participants" ON participants FOR ALL USING (event_id IN (SELECT id FROM events WHERE organization_id = auth.user_organization_id()));
