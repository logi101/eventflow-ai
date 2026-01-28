-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║                         EventFlow AI - Seed Data                             ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

-- ════════════════════════════════════════════════════════════════════════════════
-- VENDOR CATEGORIES
-- ════════════════════════════════════════════════════════════════════════════════

INSERT INTO vendor_categories (name, name_en, icon, is_system, sort_order) VALUES
('קייטרינג', 'Catering', '🍽️', TRUE, 1),
('אולם/מקום', 'Venue', '🏛️', TRUE, 2),
('צילום', 'Photography', '📷', TRUE, 3),
('וידאו', 'Videography', '🎥', TRUE, 4),
('DJ/מוזיקה', 'DJ/Music', '🎵', TRUE, 5),
('הגברה ותאורה', 'Sound & Light', '🔊', TRUE, 6),
('הסעות', 'Transportation', '🚌', TRUE, 7),
('קישוט ועיצוב', 'Decoration', '🎨', TRUE, 8),
('הפקה', 'Production', '🎬', TRUE, 9),
('מנחה/קריין', 'MC/Host', '🎤', TRUE, 10),
('אטרקציות', 'Entertainment', '🎪', TRUE, 11),
('דפוס והזמנות', 'Print', '🖨️', TRUE, 12),
('אחר', 'Other', '📦', TRUE, 99);

-- ════════════════════════════════════════════════════════════════════════════════
-- EVENT TYPES WITH CHECKLIST TEMPLATES
-- ════════════════════════════════════════════════════════════════════════════════

INSERT INTO event_types (name, name_en, icon, description, is_system, default_checklist, default_settings) VALUES

('כנס', 'Conference', '🎤', 'כנס מקצועי עם הרצאות ומושבים', TRUE,
'[
  {"title": "הזמנת אולם", "category": "מקום", "priority": "critical", "days_before": 90},
  {"title": "אישור כיבוי אש", "category": "מקום", "priority": "critical", "days_before": 30},
  {"title": "אישור משטרה (מעל 500)", "category": "מקום", "priority": "high", "days_before": 30},
  {"title": "בחירת קייטרינג", "category": "קייטרינג", "priority": "high", "days_before": 60},
  {"title": "אישור תפריט סופי", "category": "קייטרינג", "priority": "high", "days_before": 7},
  {"title": "איסוף העדפות תזונתיות", "category": "קייטרינג", "priority": "medium", "days_before": 14},
  {"title": "אישור מרצים", "category": "תוכן", "priority": "critical", "days_before": 30},
  {"title": "קבלת מצגות מרצים", "category": "תוכן", "priority": "high", "days_before": 7},
  {"title": "הכנת לוח זמנים", "category": "תוכן", "priority": "high", "days_before": 21},
  {"title": "הזמנת ציוד הגברה", "category": "טכני", "priority": "high", "days_before": 14},
  {"title": "בדיקת מערכת הגברה", "category": "טכני", "priority": "critical", "days_before": 1},
  {"title": "בדיקת מערכת הקרנה", "category": "טכני", "priority": "critical", "days_before": 1},
  {"title": "הכנת תגי שם", "category": "לוגיסטיקה", "priority": "medium", "days_before": 3},
  {"title": "שליחת הזמנות", "category": "תקשורת", "priority": "high", "days_before": 30},
  {"title": "שליחת תזכורת", "category": "תקשורת", "priority": "medium", "days_before": 7}
]',
'{"allow_plus_one": false, "require_dietary_info": true, "send_reminders": true, "invitation_type": "registration"}'),

('גיבוש', 'Team Building', '🏕️', 'פעילות גיבוש לצוות או חברה', TRUE,
'[
  {"title": "בחירת מיקום", "category": "מקום", "priority": "critical", "days_before": 60},
  {"title": "תיאום הסעות", "category": "לוגיסטיקה", "priority": "high", "days_before": 14},
  {"title": "תכנון פעילויות", "category": "תוכן", "priority": "high", "days_before": 30},
  {"title": "הזמנת מנחה פעילות", "category": "ספקים", "priority": "high", "days_before": 30},
  {"title": "הזמנת קייטרינג", "category": "קייטרינג", "priority": "high", "days_before": 21},
  {"title": "הכנת ציוד", "category": "לוגיסטיקה", "priority": "medium", "days_before": 7},
  {"title": "שליחת פרטים למשתתפים", "category": "תקשורת", "priority": "high", "days_before": 7}
]',
'{"allow_plus_one": false, "require_dietary_info": true, "send_reminders": true, "invitation_type": "rsvp"}'),

('חתונה', 'Wedding', '💒', 'אירוע חתונה', TRUE,
'[
  {"title": "הזמנת אולם", "category": "מקום", "priority": "critical", "days_before": 180},
  {"title": "בחירת קייטרינג", "category": "קייטרינג", "priority": "critical", "days_before": 120},
  {"title": "הזמנת צלם", "category": "ספקים", "priority": "high", "days_before": 90},
  {"title": "הזמנת צלם וידאו", "category": "ספקים", "priority": "high", "days_before": 90},
  {"title": "הזמנת DJ", "category": "ספקים", "priority": "high", "days_before": 60},
  {"title": "הזמנת רב/עורך טקס", "category": "טקס", "priority": "critical", "days_before": 60},
  {"title": "הכנת ושליחת הזמנות", "category": "תקשורת", "priority": "high", "days_before": 60},
  {"title": "סידורי פרחים", "category": "עיצוב", "priority": "medium", "days_before": 30},
  {"title": "אישור תפריט סופי", "category": "קייטרינג", "priority": "high", "days_before": 14},
  {"title": "סגירת רשימת מוזמנים", "category": "ארגון", "priority": "critical", "days_before": 14},
  {"title": "סידורי הושבה", "category": "ארגון", "priority": "high", "days_before": 7}
]',
'{"allow_plus_one": true, "require_dietary_info": true, "send_reminders": true, "invitation_type": "rsvp"}'),

('יום עיון', 'Seminar', '📚', 'יום עיון או סמינר מקצועי', TRUE,
'[
  {"title": "הזמנת חדר/אולם", "category": "מקום", "priority": "critical", "days_before": 30},
  {"title": "אישור מרצים", "category": "תוכן", "priority": "critical", "days_before": 21},
  {"title": "הכנת חומרים", "category": "תוכן", "priority": "high", "days_before": 7},
  {"title": "הזמנת כיבוד", "category": "קייטרינג", "priority": "medium", "days_before": 7},
  {"title": "שליחת הזמנות", "category": "תקשורת", "priority": "high", "days_before": 14}
]',
'{"allow_plus_one": false, "require_dietary_info": false, "send_reminders": true, "invitation_type": "registration"}'),

('אירוע חברה', 'Company Event', '🎉', 'אירוע חברה - ראש השנה, חנוכה, פורים וכו׳', TRUE,
'[
  {"title": "בחירת תאריך", "category": "תכנון", "priority": "critical", "days_before": 60},
  {"title": "בחירת מקום", "category": "מקום", "priority": "critical", "days_before": 45},
  {"title": "תכנון תוכן/נושא", "category": "תוכן", "priority": "high", "days_before": 30},
  {"title": "הזמנת קייטרינג", "category": "קייטרינג", "priority": "high", "days_before": 21},
  {"title": "הזמנת אטרקציות", "category": "ספקים", "priority": "medium", "days_before": 21},
  {"title": "שליחת הזמנות", "category": "תקשורת", "priority": "high", "days_before": 21}
]',
'{"allow_plus_one": true, "require_dietary_info": true, "send_reminders": true, "invitation_type": "rsvp"}'),

('בר/בת מצווה', 'Bar/Bat Mitzvah', '✡️', 'אירוע בר/בת מצווה', TRUE,
'[
  {"title": "הזמנת אולם", "category": "מקום", "priority": "critical", "days_before": 120},
  {"title": "בחירת קייטרינג", "category": "קייטרינג", "priority": "critical", "days_before": 90},
  {"title": "הזמנת DJ", "category": "ספקים", "priority": "high", "days_before": 60},
  {"title": "הזמנת צלם", "category": "ספקים", "priority": "high", "days_before": 60},
  {"title": "הכנת הזמנות", "category": "תקשורת", "priority": "high", "days_before": 45},
  {"title": "סידורי פרחים ועיצוב", "category": "עיצוב", "priority": "medium", "days_before": 14}
]',
'{"allow_plus_one": true, "require_dietary_info": true, "send_reminders": true, "invitation_type": "rsvp"}'),

('השקת מוצר', 'Product Launch', '🚀', 'אירוע השקת מוצר או שירות', TRUE,
'[
  {"title": "בחירת מקום", "category": "מקום", "priority": "critical", "days_before": 45},
  {"title": "הכנת מצגת השקה", "category": "תוכן", "priority": "critical", "days_before": 14},
  {"title": "הזמנת מדיה ועיתונאים", "category": "יחסי ציבור", "priority": "high", "days_before": 21},
  {"title": "הכנת דוכני תצוגה", "category": "עיצוב", "priority": "high", "days_before": 7},
  {"title": "הזמנת קייטרינג", "category": "קייטרינג", "priority": "medium", "days_before": 14},
  {"title": "בדיקת ציוד טכני", "category": "טכני", "priority": "critical", "days_before": 1}
]',
'{"allow_plus_one": false, "require_dietary_info": false, "send_reminders": true, "invitation_type": "registration"}');

-- ════════════════════════════════════════════════════════════════════════════════
-- MESSAGE TEMPLATES
-- ════════════════════════════════════════════════════════════════════════════════

INSERT INTO message_templates (name, type, channel, content_template, auto_send, auto_send_trigger, is_system) VALUES

('הזמנה לאירוע', 'invitation', 'whatsapp',
'שלום {{participant_name}}! 👋

את/ה מוזמן/ת ל{{event_name}}

📅 תאריך: {{event_date}}
🕐 שעה: {{event_time}}
📍 מיקום: {{event_location}}

{{#if registration_link}}
לאישור הגעה: {{registration_link}}
{{else}}
נשמח לראותך!
{{/if}}

בברכה,
{{organizer_name}}',
FALSE, NULL, TRUE),

('תזכורת יום לפני', 'reminder_day_before', 'whatsapp',
'היי {{participant_name}}! 🔔

תזכורת: מחר {{event_name}}

📅 {{event_date}}
🕐 {{event_time}}
📍 {{event_location}}

{{#if schedule_link}}
התוכנית האישית שלך: {{schedule_link}}
{{/if}}

נתראה מחר! 👋',
TRUE, '1_day_before', TRUE),

('תזכורת בוקר האירוע', 'reminder_morning', 'whatsapp',
'בוקר טוב {{participant_name}}! ☀️

היום זה הזמן - {{event_name}}

🕐 {{event_time}}
📍 {{event_location}}

{{#if schedule_link}}
התוכנית שלך: {{schedule_link}}
{{/if}}

יום מעולה! 🎯',
TRUE, 'morning_of', TRUE),

('תזכורת 15 דקות', 'reminder_15min', 'whatsapp',
'{{participant_name}}, בעוד 15 דקות: {{session_title}} 📍{{session_location}}',
TRUE, '15_min_before', TRUE),

('עדכון שינוי', 'update', 'whatsapp',
'⚠️ עדכון חשוב - {{event_name}}

{{update_content}}

אנו מתנצלים על אי הנוחות.',
FALSE, NULL, TRUE),

('שליחת תוכנית אישית', 'schedule', 'whatsapp',
'היי {{participant_name}}! 📋

הנה התוכנית האישית שלך ל{{event_name}}:

{{personal_schedule}}

נתראה! 🎯',
FALSE, NULL, TRUE),

('תודה אחרי האירוע', 'thank_you', 'whatsapp',
'היי {{participant_name}},

תודה שהשתתפת ב{{event_name}}! 🙏

היה לנו כיף, ונשמח לשמוע ממך.

{{#if feedback_link}}
נשמח למשוב קצר: {{feedback_link}}
{{/if}}

להתראות באירוע הבא! 👋',
TRUE, 'after_event', TRUE),

('בקשת הצעת מחיר', 'quote_request', 'whatsapp',
'שלום {{vendor_contact}},

אנו מפיקים {{event_type}} בתאריך {{event_date}} ל-{{participant_count}} משתתפים.

{{quote_details}}

נשמח לקבל הצעת מחיר עד {{quote_deadline}}.

תודה!
{{organizer_name}}
{{organizer_phone}}',
FALSE, NULL, TRUE),

('תזכורת לספק', 'vendor_reminder', 'whatsapp',
'שלום {{vendor_contact}},

תזכורת: {{event_name}} ב-{{event_date}}

🕐 שעת הגעה: {{arrival_time}}
📍 מיקום: {{event_location}}

אנא אשר/י הגעה.

תודה!',
TRUE, '1_day_before_vendor', TRUE),

('בקשת משוב', 'feedback_request', 'whatsapp',
'היי {{participant_name}},

נשמח לשמוע מה חשבת על {{event_name}}! 📝

{{feedback_link}}

תודה רבה! 🙏',
TRUE, 'after_event', TRUE);
