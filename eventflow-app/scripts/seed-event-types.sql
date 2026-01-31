-- ════════════════════════════════════════════════════════════════════════════════
-- EVENT TYPES SEED DATA
-- Run this in Supabase SQL Editor to populate event types
-- ════════════════════════════════════════════════════════════════════════════════

-- Clear existing event types (optional - remove if you want to keep existing data)
-- DELETE FROM event_types WHERE is_system = TRUE;

-- Insert event types with default checklists and settings
INSERT INTO event_types (name, name_en, icon, description, is_system, default_checklist, default_settings, sort_order) VALUES

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
'{"allow_plus_one": false, "require_dietary_info": true, "send_reminders": true, "invitation_type": "registration"}', 1),

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
'{"allow_plus_one": false, "require_dietary_info": true, "send_reminders": true, "invitation_type": "rsvp"}', 2),

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
'{"allow_plus_one": true, "require_dietary_info": true, "send_reminders": true, "invitation_type": "rsvp"}', 3),

('יום עיון', 'Seminar', '📚', 'יום עיון או סמינר מקצועי', TRUE,
'[
  {"title": "הזמנת חדר/אולם", "category": "מקום", "priority": "critical", "days_before": 30},
  {"title": "אישור מרצים", "category": "תוכן", "priority": "critical", "days_before": 21},
  {"title": "הכנת חומרים", "category": "תוכן", "priority": "high", "days_before": 7},
  {"title": "הזמנת כיבוד", "category": "קייטרינג", "priority": "medium", "days_before": 7},
  {"title": "שליחת הזמנות", "category": "תקשורת", "priority": "high", "days_before": 14}
]',
'{"allow_plus_one": false, "require_dietary_info": false, "send_reminders": true, "invitation_type": "registration"}', 4),

('אירוע חברה', 'Company Event', '🎉', 'אירוע חברה - ראש השנה, חנוכה, פורים וכו׳', TRUE,
'[
  {"title": "בחירת תאריך", "category": "תכנון", "priority": "critical", "days_before": 60},
  {"title": "בחירת מקום", "category": "מקום", "priority": "critical", "days_before": 45},
  {"title": "תכנון תוכן/נושא", "category": "תוכן", "priority": "high", "days_before": 30},
  {"title": "הזמנת קייטרינג", "category": "קייטרינג", "priority": "high", "days_before": 21},
  {"title": "הזמנת אטרקציות", "category": "ספקים", "priority": "medium", "days_before": 21},
  {"title": "שליחת הזמנות", "category": "תקשורת", "priority": "high", "days_before": 21}
]',
'{"allow_plus_one": true, "require_dietary_info": true, "send_reminders": true, "invitation_type": "rsvp"}', 5),

('בר/בת מצווה', 'Bar/Bat Mitzvah', '✡️', 'אירוע בר/בת מצווה', TRUE,
'[
  {"title": "הזמנת אולם", "category": "מקום", "priority": "critical", "days_before": 120},
  {"title": "בחירת קייטרינג", "category": "קייטרינג", "priority": "critical", "days_before": 90},
  {"title": "הזמנת DJ", "category": "ספקים", "priority": "high", "days_before": 60},
  {"title": "הזמנת צלם", "category": "ספקים", "priority": "high", "days_before": 60},
  {"title": "הכנת הזמנות", "category": "תקשורת", "priority": "high", "days_before": 45},
  {"title": "סידורי פרחים ועיצוב", "category": "עיצוב", "priority": "medium", "days_before": 14}
]',
'{"allow_plus_one": true, "require_dietary_info": true, "send_reminders": true, "invitation_type": "rsvp"}', 6),

('השקת מוצר', 'Product Launch', '🚀', 'אירוע השקת מוצר או שירות', TRUE,
'[
  {"title": "בחירת מקום", "category": "מקום", "priority": "critical", "days_before": 45},
  {"title": "הכנת מצגת השקה", "category": "תוכן", "priority": "critical", "days_before": 14},
  {"title": "הזמנת מדיה ועיתונאים", "category": "יחסי ציבור", "priority": "high", "days_before": 21},
  {"title": "הכנת דוכני תצוגה", "category": "עיצוב", "priority": "high", "days_before": 7},
  {"title": "הזמנת קייטרינג", "category": "קייטרינג", "priority": "medium", "days_before": 14},
  {"title": "בדיקת ציוד טכני", "category": "טכני", "priority": "critical", "days_before": 1}
]',
'{"allow_plus_one": false, "require_dietary_info": false, "send_reminders": true, "invitation_type": "registration"}', 7)

ON CONFLICT (id) DO NOTHING;

-- Verify the insert
SELECT id, name, name_en, icon, is_active FROM event_types ORDER BY sort_order;
