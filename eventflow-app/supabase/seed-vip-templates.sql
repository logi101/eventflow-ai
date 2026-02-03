-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║           EventFlow AI - VIP Message Templates Seed                         ║
-- ║           Phase 07, Plan 02: VIP-specific WhatsApp templates                ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

-- Purpose: Seed VIP-specific message templates with room and table variables
-- Requirements: VIP-02 (VIP messages), ROOM-03 (room detail variables)

-- Insert VIP check-in template with room details
INSERT INTO message_templates (
  organization_id,
  name,
  message_type,
  channel,
  subject,
  content,
  variables,
  is_system,
  is_active
) VALUES (
  NULL, -- system template
  'צ׳ק-אין VIP עם פרטי חדר',
  'custom',
  'whatsapp',
  'ברוכים הבאים - VIP',
  'שלום {{first_name}}! 👋💎

ברוכים הבאים ל{{event_name}}!

כמשתתף VIP, אנחנו שמחים לארח אותך.

📍 פרטי הלינה שלך:
🏨 בניין: {{room_building}}
🚪 חדר: {{room_number}}
🔢 קומה: {{room_floor}}
⏰ צ׳ק-אין: {{checkin_time}}

🪑 שולחן ארוחת הערב: {{table_number}}

הצוות שלנו ימתין לקבל את פניך בלובי.

נתראה בקרוב! ✨',
  '["first_name", "event_name", "room_building", "room_number", "room_floor", "checkin_time", "table_number"]'::jsonb,
  true,
  true
)
ON CONFLICT (organization_id, name)
WHERE organization_id IS NULL
DO UPDATE SET
  content = EXCLUDED.content,
  variables = EXCLUDED.variables,
  updated_at = NOW();

-- Insert VIP departure reminder template
INSERT INTO message_templates (
  organization_id,
  name,
  message_type,
  channel,
  subject,
  content,
  variables,
  is_system,
  is_active
) VALUES (
  NULL,
  'תזכורת יציאה - VIP',
  'custom',
  'whatsapp',
  'תזכורת צ׳ק-אאוט - VIP',
  'שלום {{first_name}}! 👋💎

תודה רבה על ההשתתפות ב{{event_name}}!

מקווים שנהנית מהאירוע ושהשהייה הייתה נעימה.

🏨 תזכורת - פרטי צ׳ק-אאוט:
🚪 חדר: {{room_number}}
⏰ שעת צ׳ק-אאוט: {{checkout_time}}

אנא אשר שכל החפצים האישיים הוצאו מהחדר.

נשמח לארח אותך גם באירועים הבאים! ✨

תודה ושלום,
צוות {{event_name}}',
  '["first_name", "event_name", "room_number", "checkout_time"]'::jsonb,
  true,
  true
)
ON CONFLICT (organization_id, name)
WHERE organization_id IS NULL
DO UPDATE SET
  content = EXCLUDED.content,
  variables = EXCLUDED.variables,
  updated_at = NOW();

-- Insert standard check-in template with room variables (non-VIP)
INSERT INTO message_templates (
  organization_id,
  name,
  message_type,
  channel,
  subject,
  content,
  variables,
  is_system,
  is_active
) VALUES (
  NULL,
  'צ׳ק-אין עם פרטי חדר',
  'custom',
  'whatsapp',
  'ברוכים הבאים',
  'שלום {{first_name}}! 👋

ברוכים הבאים ל{{event_name}}!

📍 פרטי הלינה שלך:
🏨 בניין: {{room_building}}
🚪 חדר: {{room_number}}
🔢 קומה: {{room_floor}}
⏰ צ׳ק-אין: {{checkin_time}}

🪑 שולחן ארוחת הערב: {{table_number}}

נתראה בקרוב!',
  '["first_name", "event_name", "room_building", "room_number", "room_floor", "checkin_time", "table_number"]'::jsonb,
  true,
  true
)
ON CONFLICT (organization_id, name)
WHERE organization_id IS NULL
DO UPDATE SET
  content = EXCLUDED.content,
  variables = EXCLUDED.variables,
  updated_at = NOW();

-- Insert VIP welcome with table assignment template
INSERT INTO message_templates (
  organization_id,
  name,
  message_type,
  channel,
  subject,
  content,
  variables,
  is_system,
  is_active
) VALUES (
  NULL,
  'הודעת הצבה לשולחן - VIP',
  'custom',
  'whatsapp',
  'הצבת שולחן VIP',
  'שלום {{first_name}}! 💎

שמחים שאתה איתנו ב{{event_name}}!

🪑 הוצבת לשולחן מספר: {{table_number}}
{{#is_vip_table}}
✨ זהו שולחן VIP מיוחד
{{/is_vip_table}}

📍 מיקום: {{table_location}}
👥 משתתפים נוספים בשולחן: {{table_companions}}

{{#has_dietary_restrictions}}
⚠️ הבקשות התזונתיות שלך נרשמו: {{dietary_restrictions}}
{{/has_dietary_restrictions}}

בתיאבון! 🍽️',
  '["first_name", "event_name", "table_number", "is_vip_table", "table_location", "table_companions", "has_dietary_restrictions", "dietary_restrictions"]'::jsonb,
  true,
  true
)
ON CONFLICT (organization_id, name)
WHERE organization_id IS NULL
DO UPDATE SET
  content = EXCLUDED.content,
  variables = EXCLUDED.variables,
  updated_at = NOW();

-- Insert VIP session notification template
INSERT INTO message_templates (
  organization_id,
  name,
  message_type,
  channel,
  subject,
  content,
  variables,
  is_system,
  is_active
) VALUES (
  NULL,
  'הודעת מפגש מיוחד - VIP',
  'custom',
  'whatsapp',
  'מפגש VIP מיוחד',
  'שלום {{first_name}}! 💎

כמשתתף VIP, נשמח לארח אותך במפגש מיוחד:

📌 {{session_title}}
🕐 {{session_start_time}} - {{session_end_time}}
📍 חדר: {{room_number}}
🏨 בניין: {{room_building}}
👤 מנחה: {{session_speaker}}

{{#session_description}}
📝 פרטים:
{{session_description}}
{{/session_description}}

מצפים לראותך! ✨',
  '["first_name", "session_title", "session_start_time", "session_end_time", "room_number", "room_building", "session_speaker", "session_description"]'::jsonb,
  true,
  true
)
ON CONFLICT (organization_id, name)
WHERE organization_id IS NULL
DO UPDATE SET
  content = EXCLUDED.content,
  variables = EXCLUDED.variables,
  updated_at = NOW();
