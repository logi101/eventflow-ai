-- Migration: seed_reminder_templates
-- Purpose: Prepare message_templates table and seed 8 default system reminder templates
-- Phase: 03-dynamic-template-system, Plan: 01

-- Step 1: Add message_type column if it doesn't exist (may already exist from phase 2)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'message_templates' AND column_name = 'message_type'
  ) THEN
    -- Rename 'type' to 'message_type' if 'type' exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'message_templates' AND column_name = 'type'
    ) THEN
      ALTER TABLE message_templates RENAME COLUMN type TO message_type;
    ELSE
      -- Add message_type column if neither exists
      ALTER TABLE message_templates ADD COLUMN message_type message_type NOT NULL;
    END IF;
  END IF;
END $$;

-- Step 2: Add variables column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'message_templates' AND column_name = 'variables'
  ) THEN
    ALTER TABLE message_templates ADD COLUMN variables JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Step 3: Rename content_template to content if needed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'message_templates' AND column_name = 'content_template'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'message_templates' AND column_name = 'content'
  ) THEN
    ALTER TABLE message_templates RENAME COLUMN content_template TO content;
  END IF;
END $$;

-- Step 4: Delete existing system templates to make migration idempotent
DELETE FROM message_templates WHERE is_system = true;

-- Step 5: Insert 8 system reminder templates
-- Template 1: reminder_activation
INSERT INTO message_templates (
  organization_id, name, message_type, channel, content, variables, is_system, is_active
) VALUES (
  NULL,
  'הודעת אישור הרשמה',
  'reminder_activation',
  'whatsapp',
  'היי {{participant_name}}! 🎉

נרשמת בהצלחה לאירוע: {{event_name}}

📅 {{event_date}}
🕐 {{event_time}}
📍 {{event_location}}

📋 שלח "לוז" לצפייה בתוכנית האישית

נתראה שם! 👋',
  '["participant_name", "event_name", "event_date", "event_time", "event_location"]'::jsonb,
  true,
  true
);

-- Template 2: reminder_week_before
INSERT INTO message_templates (
  organization_id, name, message_type, channel, content, variables, is_system, is_active
) VALUES (
  NULL,
  'תזכורת שבוע לפני',
  'reminder_week_before',
  'whatsapp',
  'היי {{participant_name}}! ⏰

עוד שבוע ל-{{event_name}}

📅 {{event_date}}
🕐 {{event_time}}
📍 {{event_location}}

📋 שלח "לוז" לצפייה בתוכנית האישית

מצפים לראותך! ✨',
  '["participant_name", "event_name", "event_date", "event_time", "event_location"]'::jsonb,
  true,
  true
);

-- Template 3: reminder_day_before
INSERT INTO message_templates (
  organization_id, name, message_type, channel, content, variables, is_system, is_active
) VALUES (
  NULL,
  'תזכורת יום לפני',
  'reminder_day_before',
  'whatsapp',
  'היי {{participant_name}}! 🔔

תזכורת: מחר {{event_name}}

📅 {{event_date}}
🕐 {{event_time}}
📍 {{event_location}}

📋 שלח "לוז" לצפייה בתוכנית האישית

נתראה מחר! 👋',
  '["participant_name", "event_name", "event_date", "event_time", "event_location"]'::jsonb,
  true,
  true
);

-- Template 4: reminder_morning
INSERT INTO message_templates (
  organization_id, name, message_type, channel, content, variables, is_system, is_active
) VALUES (
  NULL,
  'תזכורת בוקר האירוע',
  'reminder_morning',
  'whatsapp',
  'בוקר טוב {{participant_name}}! ☀️

היום זה הזמן - {{event_name}}

🕐 {{event_time}}
📍 {{event_location}}

📋 שלח "לוז" לצפייה בתוכנית האישית

יום מעולה! 🎯',
  '["participant_name", "event_name", "event_time", "event_location"]'::jsonb,
  true,
  true
);

-- Template 5: reminder_15min
INSERT INTO message_templates (
  organization_id, name, message_type, channel, content, variables, is_system, is_active
) VALUES (
  NULL,
  'תזכורת 15 דקות לפני',
  'reminder_15min',
  'whatsapp',
  'שלום {{participant_name}} {{participant_last_name}}! 👋

🔔 *בעוד 15 דקות:*

📌 *{{session_title}}*
🕐 {{session_start_time}} - {{session_end_time}}
📍 {{session_location}}
🚪 {{session_room}}
👤 {{session_speaker}}

📋 שלח "לוז" לצפייה בתוכנית המלאה שלך',
  '["participant_name", "participant_last_name", "session_title", "session_start_time", "session_end_time", "session_location", "session_room", "session_speaker"]'::jsonb,
  true,
  true
);

-- Template 6: reminder_event_end
INSERT INTO message_templates (
  organization_id, name, message_type, channel, content, variables, is_system, is_active
) VALUES (
  NULL,
  'תודה אחרי האירוע',
  'reminder_event_end',
  'whatsapp',
  '{{participant_name}} היקר/ה, 🙏

תודה רבה על ההשתתפות ב-{{event_name}}!

נשמח לשמוע מה חשבת על האירוע 💭
משוב שלך חשוב לנו ומשפר את האירועים הבאים.

מקווים לראותך באירועים הבאים שלנו! ✨',
  '["participant_name", "event_name"]'::jsonb,
  true,
  true
);

-- Template 7: reminder_follow_up_3mo
INSERT INTO message_templates (
  organization_id, name, message_type, channel, content, variables, is_system, is_active
) VALUES (
  NULL,
  'מעקב 3 חודשים',
  'reminder_follow_up_3mo',
  'whatsapp',
  'שלום {{participant_name}}! 👋

עברו 3 חודשים מאז {{event_name}}

איך אתה מרגיש/ה? האם יישמת משהו מהאירוע? 🌱

נשמח לשמוע איך הלך לך 💬',
  '["participant_name", "event_name"]'::jsonb,
  true,
  true
);

-- Template 8: reminder_follow_up_6mo
INSERT INTO message_templates (
  organization_id, name, message_type, channel, content, variables, is_system, is_active
) VALUES (
  NULL,
  'מעקב 6 חודשים',
  'reminder_follow_up_6mo',
  'whatsapp',
  'היי {{participant_name}}! 🌟

חצי שנה עברה מאז {{event_name}}

נשמח לדעת מה השתנה מאז ✨
יש לך משוב או רעיונות לאירועים הבאים? 💡

תמיד טוב לשמוע ממך! 🙂',
  '["participant_name", "event_name"]'::jsonb,
  true,
  true
);
