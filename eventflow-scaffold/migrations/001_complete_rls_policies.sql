-- ============================================
-- COMPLETE RLS POLICIES FOR ALL TABLES
-- Run this IMMEDIATELY on production database
-- ============================================

-- Helper function: Get user's organization (in public schema for Edge Function access)
CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS UUID AS $$
  SELECT organization_id FROM user_profiles WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Alias for convenience
CREATE OR REPLACE FUNCTION auth.user_org_id()
RETURNS UUID AS $$
  SELECT public.get_user_org_id()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================
-- organizations (CRITICAL - was missing!)
-- ============================================
DROP POLICY IF EXISTS "Users can view their organization" ON organizations;
CREATE POLICY "Users can view their organization" ON organizations
  FOR SELECT USING (id = auth.user_org_id());

DROP POLICY IF EXISTS "Admins can update their organization" ON organizations;
CREATE POLICY "Admins can update their organization" ON organizations
  FOR UPDATE USING (
    id = auth.user_org_id()
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- ============================================
-- events (CRITICAL - was missing authenticated user access!)
-- ============================================
DROP POLICY IF EXISTS "Users can view events in their organization" ON events;
CREATE POLICY "Users can view events in their organization" ON events
  FOR SELECT USING (organization_id = auth.user_org_id());

DROP POLICY IF EXISTS "Users can manage events in their organization" ON events;
CREATE POLICY "Users can manage events in their organization" ON events
  FOR ALL USING (organization_id = auth.user_org_id());

-- ============================================
-- participants (CRITICAL - add org-based access)
-- ============================================
DROP POLICY IF EXISTS "Users can view participants for their events" ON participants;
CREATE POLICY "Users can view participants for their events" ON participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = participants.event_id
      AND e.organization_id = auth.user_org_id()
    )
  );

DROP POLICY IF EXISTS "Users can manage participants for their events" ON participants;
CREATE POLICY "Users can manage participants for their events" ON participants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = participants.event_id
      AND e.organization_id = auth.user_org_id()
    )
  );

-- ============================================
-- event_types (CRITICAL - was missing!)
-- ============================================
DROP POLICY IF EXISTS "Users can view event_types" ON event_types;
CREATE POLICY "Users can view event_types" ON event_types
  FOR SELECT USING (
    organization_id = auth.user_org_id() OR is_system = true
  );

DROP POLICY IF EXISTS "Users can manage custom event_types" ON event_types;
CREATE POLICY "Users can manage custom event_types" ON event_types
  FOR ALL USING (
    organization_id = auth.user_org_id() AND is_system = false
  );

-- ============================================
-- vendor_categories (CRITICAL - was missing!)
-- ============================================
DROP POLICY IF EXISTS "Users can view vendor_categories" ON vendor_categories;
CREATE POLICY "Users can view vendor_categories" ON vendor_categories
  FOR SELECT USING (
    organization_id = auth.user_org_id() OR is_system = true
  );

DROP POLICY IF EXISTS "Users can manage custom vendor_categories" ON vendor_categories;
CREATE POLICY "Users can manage custom vendor_categories" ON vendor_categories
  FOR ALL USING (
    organization_id = auth.user_org_id() AND is_system = false
  );

-- ============================================
-- user_profiles
-- ============================================
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON user_profiles;
CREATE POLICY "Users can view profiles in their organization" ON user_profiles
  FOR SELECT USING (organization_id = auth.user_org_id());

DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (id = auth.uid());

-- ============================================
-- api_credentials (CRITICAL - contains encrypted secrets)
-- ============================================
DROP POLICY IF EXISTS "Only admins can view credentials" ON api_credentials;
CREATE POLICY "Only admins can view credentials" ON api_credentials
  FOR SELECT USING (
    organization_id = auth.user_org_id()
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

DROP POLICY IF EXISTS "Only admins can manage credentials" ON api_credentials;
CREATE POLICY "Only admins can manage credentials" ON api_credentials
  FOR ALL USING (
    organization_id = auth.user_org_id()
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- ============================================
-- vendors
-- ============================================
DROP POLICY IF EXISTS "Users can view vendors in their organization" ON vendors;
CREATE POLICY "Users can view vendors in their organization" ON vendors
  FOR SELECT USING (organization_id = auth.user_org_id());

DROP POLICY IF EXISTS "Users can manage vendors in their organization" ON vendors;
CREATE POLICY "Users can manage vendors in their organization" ON vendors
  FOR ALL USING (organization_id = auth.user_org_id());

-- ============================================
-- event_vendors
-- ============================================
DROP POLICY IF EXISTS "Users can view event_vendors for their events" ON event_vendors;
CREATE POLICY "Users can view event_vendors for their events" ON event_vendors
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_vendors.event_id
      AND e.organization_id = auth.user_org_id()
    )
  );

DROP POLICY IF EXISTS "Users can manage event_vendors for their events" ON event_vendors;
CREATE POLICY "Users can manage event_vendors for their events" ON event_vendors
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_vendors.event_id
      AND e.organization_id = auth.user_org_id()
    )
  );

-- ============================================
-- schedules
-- ============================================
DROP POLICY IF EXISTS "Users can view schedules for their events" ON schedules;
CREATE POLICY "Users can view schedules for their events" ON schedules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = schedules.event_id
      AND e.organization_id = auth.user_org_id()
    )
  );

DROP POLICY IF EXISTS "Users can manage schedules for their events" ON schedules;
CREATE POLICY "Users can manage schedules for their events" ON schedules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = schedules.event_id
      AND e.organization_id = auth.user_org_id()
    )
  );

-- ============================================
-- checklist_items
-- ============================================
DROP POLICY IF EXISTS "Users can view checklist for their events" ON checklist_items;
CREATE POLICY "Users can view checklist for their events" ON checklist_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = checklist_items.event_id
      AND e.organization_id = auth.user_org_id()
    )
  );

DROP POLICY IF EXISTS "Users can manage checklist for their events" ON checklist_items;
CREATE POLICY "Users can manage checklist for their events" ON checklist_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = checklist_items.event_id
      AND e.organization_id = auth.user_org_id()
    )
  );

-- ============================================
-- messages
-- ============================================
DROP POLICY IF EXISTS "Users can view messages for their events" ON messages;
CREATE POLICY "Users can view messages for their events" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = messages.event_id
      AND e.organization_id = auth.user_org_id()
    )
  );

DROP POLICY IF EXISTS "Users can manage messages for their events" ON messages;
CREATE POLICY "Users can manage messages for their events" ON messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = messages.event_id
      AND e.organization_id = auth.user_org_id()
    )
  );

-- ============================================
-- message_templates
-- ============================================
DROP POLICY IF EXISTS "Users can view templates in their organization" ON message_templates;
CREATE POLICY "Users can view templates in their organization" ON message_templates
  FOR SELECT USING (organization_id = auth.user_org_id());

DROP POLICY IF EXISTS "Users can manage templates in their organization" ON message_templates;
CREATE POLICY "Users can manage templates in their organization" ON message_templates
  FOR ALL USING (organization_id = auth.user_org_id());

-- ============================================
-- feedback_surveys
-- ============================================
DROP POLICY IF EXISTS "Users can view surveys for their events" ON feedback_surveys;
CREATE POLICY "Users can view surveys for their events" ON feedback_surveys
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = feedback_surveys.event_id
      AND e.organization_id = auth.user_org_id()
    )
  );

DROP POLICY IF EXISTS "Users can manage surveys for their events" ON feedback_surveys;
CREATE POLICY "Users can manage surveys for their events" ON feedback_surveys
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = feedback_surveys.event_id
      AND e.organization_id = auth.user_org_id()
    )
  );

-- ============================================
-- feedback_responses (public insert for participants)
-- ============================================
DROP POLICY IF EXISTS "Anyone can submit feedback response" ON feedback_responses;
CREATE POLICY "Anyone can submit feedback response" ON feedback_responses
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view responses for their surveys" ON feedback_responses;
CREATE POLICY "Users can view responses for their surveys" ON feedback_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM feedback_surveys fs
      JOIN events e ON e.id = fs.event_id
      WHERE fs.id = feedback_responses.survey_id
      AND e.organization_id = auth.user_org_id()
    )
  );

-- ============================================
-- ai_chat_sessions
-- ============================================
DROP POLICY IF EXISTS "Users can view their own chat sessions" ON ai_chat_sessions;
CREATE POLICY "Users can view their own chat sessions" ON ai_chat_sessions
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage their own chat sessions" ON ai_chat_sessions;
CREATE POLICY "Users can manage their own chat sessions" ON ai_chat_sessions
  FOR ALL USING (user_id = auth.uid());

-- ============================================
-- ai_chat_messages
-- ============================================
DROP POLICY IF EXISTS "Users can view messages in their sessions" ON ai_chat_messages;
CREATE POLICY "Users can view messages in their sessions" ON ai_chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM ai_chat_sessions s
      WHERE s.id = ai_chat_messages.session_id
      AND s.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage messages in their sessions" ON ai_chat_messages;
CREATE POLICY "Users can manage messages in their sessions" ON ai_chat_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM ai_chat_sessions s
      WHERE s.id = ai_chat_messages.session_id
      AND s.user_id = auth.uid()
    )
  );

-- ============================================
-- Public access for registration pages
-- ============================================
DROP POLICY IF EXISTS "Public can view active events for registration" ON events;
CREATE POLICY "Public can view active events for registration" ON events
  FOR SELECT USING (
    status = 'active'
    AND registration_open = true
  );

DROP POLICY IF EXISTS "Public can register as participants" ON participants;
CREATE POLICY "Public can register as participants" ON participants
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = participants.event_id
      AND e.registration_open = true
    )
  );

-- Grant execute on helper function
GRANT EXECUTE ON FUNCTION auth.user_org_id() TO authenticated;
