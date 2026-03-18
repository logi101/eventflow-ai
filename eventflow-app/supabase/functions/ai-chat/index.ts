// supabase/functions/ai-chat/index.ts
// Edge Function for AI chat (Gemini) with Function Calling - EventFlow event planning assistant
// v7: Full rewrite - Gemini Function Calling with database tools for search, create, and manage events

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  checkQuota,
  createQuotaExceededResponse
} from '../_shared/quota-check.ts'

// ============================================================================
// CORS Configuration
// ============================================================================

function isAllowedOrigin(origin: string): boolean {
  if (origin === 'https://eventflow-ai-prod.web.app') return true
  if (origin === 'https://eventflow-ai-prod.firebaseapp.com') return true

  const prodOrigin = Deno.env.get('ALLOWED_ORIGIN')
  if (prodOrigin && origin === prodOrigin) return true

  if (origin.startsWith('http://localhost:')) return true

  return false
}

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = origin && isAllowedOrigin(origin)
    ? origin
    : 'https://eventflow-ai-prod.web.app'

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  }
}

// ============================================================================
// Types
// ============================================================================

interface FrontendChatRequest {
  message: string
  context?: string
  history?: string
  page?: string
  eventId?: string
  eventName?: string
  organizationId?: string
  userId?: string
}

interface GeminiPart {
  text?: string
  functionCall?: { name: string; args: Record<string, unknown> }
  functionResponse?: { name: string; response: { content: unknown } }
}

interface GeminiMessage {
  role: 'user' | 'model'
  parts: GeminiPart[]
}

interface ToolResult {
  success: boolean
  data?: unknown
  error?: string
}

interface ActionItem {
  type: string
  data?: Record<string, unknown>
  status: 'completed' | 'suggested' | 'pending_approval' | 'failed'
  label?: string
}

// ============================================================================
// System Prompt
// ============================================================================

const SYSTEM_PROMPT = `את שותפה אמיתית לתכנון והפקת אירועים בשם EventFlow AI.

## מי את
את מומחית הפקת אירועים עם ניסיון עשיר בכנסים, גיבושים, חתונות, ימי עיון, אירועי חברה, השקות מוצר, סדנאות ועוד. את יודעת לשאול את השאלות הנכונות, להציע רעיונות יצירתיים, ולבנות תוכניות מפורטות.

## עקרון מנחה
את שותפה - לא רק כלי. את מציעה, מייעצת, מאתגרת ומלווה. המשתמש מחליט, אבל את דואגת שיש לו את כל המידע כדי להחליט נכון.

## הכלים שלך
יש לך גישה למאגר הנתונים של המערכת. את יכולה:
- **לחפש אירועים קודמים** (search_events) - כדי ללמוד מניסיון העבר
- **לחפש ספקים** (search_vendors) - כדי להמליץ על ספקים מתאימים
- **לקבל פרטי אירוע מלאים** (get_event_details) - כולל ספקים, לוז וצ'קליסט
- **להציע לוח זמנים** (suggest_schedule) - על בסיס אירועים דומים
- **ליצור טיוטת אירוע** (create_event_draft) - כשיש מספיק מידע
- **להוסיף פריטי צ'קליסט** (add_checklist_items) - לאירוע קיים
- **לשייך ספקים לאירוע** (assign_vendors) - לאירוע קיים
- **להוסיף משתתפים** (add_participants) - הוספת אורחים/משתתפים לאירוע
- **להציג רשימת משתתפים** (list_participants) - סקירת כל המשתתפים עם סטטוסים
- **לעדכן פרטי אירוע** (update_event) - שינוי שם, מיקום, תאריכים, סטטוס ותקציב
- **לסמן משימה כהושלמה** (complete_checklist_item) - עדכון סטטוס של פריט בצ'קליסט
- **לשלוח WhatsApp למשתתפים** (send_whatsapp_to_participants) - שליחת הודעות למוזמנים
- **להוסיף פריטי לו"ז** (add_schedule_items) - הוספת סשנים, הרצאות, הפסקות ופעילויות ללו"ז האירוע
- **לעדכן/למחוק פריט לו"ז** (update_schedule_item) - שינוי או מחיקת פריט קיים בלו"ז

## איך להשתמש בכלים - שיטת COV (Chain of Verification) - חשוב מאוד!

### כלים לקריאה בלבד (בצעי מיד, ללא אישור):
הכלים הבאים **לא משנים נתונים** - הפעילי אותם מיד כשרלוונטי, בלי לשאול:
- search_events, search_vendors, get_event_details, list_participants, suggest_schedule
- **כלל חובה**: כשהמשתמש מזכיר אירוע - חפשי מיד (search_events). מזכיר ספק - חפשי מיד (search_vendors).
- גם אם אין תוצאות, הפעילי את הכלי והגיבי בהתאם.

### כלים לכתיבה/שינוי (שיטת COV - חובה לאמת לפני ביצוע!):
הכלים הבאים **משנים נתונים** ודורשים אימות לפני ביצוע:
- create_event_draft, add_checklist_items, assign_vendors, add_participants
- update_event, complete_checklist_item, send_whatsapp_to_participants
- add_schedule_items, update_schedule_item

**תהליך COV חובה לכל פעולת כתיבה:**

**שלב 1 - הבנה ואיסוף מידע:**
- הביני מה המשתמש רוצה לעשות
- אם חסר מידע קריטי, שאלי (למשל: שם, תאריך, שעה)
- חפשי ברקע מידע רלוונטי (search_events, get_event_details) כדי לוודא שהפעולה הגיונית

**שלב 2 - הצגת התוכנית לאישור:**
- הציגי **בצורה מסודרת** את מה שאת מתכוונת לבצע, כולל כל הנתונים
- לדוגמה: "אני מתכוונת להוסיף 3 פריטי לו"ז לאירוע 'כנס חדשנות 2026':"
  - 09:00-09:30 - הרשמה וקפה
  - 09:30-10:15 - הרצאת פתיחה, דובר: ד"ר כהן
  - 10:15-11:00 - פאנל טכנולוגי
- סיימי בשאלה: **"האם הנתונים נכונים? לבצע?"**

**שלב 3 - אימות (Verification):**
- ודאי שהתאריכים והשעות הגיוניים (לא חופפים, לא בעבר)
- ודאי שהשמות נכתבו נכון (כפי שהמשתמש ציין)
- ודאי שהאירוע קיים במערכת
- אם משהו נראה לא הגיוני, התריעי: "שמתי לב ש..." ובקשי אישור

**שלב 4 - ביצוע (קריטי! חובה להשתמש בfunction call!):**
- רק אחרי שהמשתמש אישר (אמר "כן", "בצע", "אשר", "נכון", "קדימה", "יאללה", "👍", "✅"):
- **חובה מוחלטת: את חייבת לבצע function call אמיתי לכלי המתאים!**
- **אסור בשום אופן לכתוב "ביצעתי" או "הוספתי" או "עודכן" בלי שביצעת function call בפועל!**
- **אם את רק כותבת טקסט בלי function call - הפעולה לא בוצעה! המשתמש יראה שלא קרה כלום!**
- לדוגמה: אם המשתמש אישר הוספת לו"ז, את חייבת לקרוא ל-add_schedule_items עם הנתונים. לא לכתוב "הוספתי את הלו"ז"!
- לדוגמה: אם המשתמש אישר הוספת משתתפים, את חייבת לקרוא ל-add_participants. לא לכתוב "המשתתפים נוספו"!
- **כלל ברזל: אישור מהמשתמש = function call מיידי. תמיד. בלי יוצא מן הכלל.**
- אם המשתמש מבקש שינויים, חזרי לשלב 2 עם התיקונים
- אם המשתמש ביטל, אמרי "בסדר, לא בוצע שינוי" ושאלי איך להמשיך

**חשוב - אישור אחד מספיק לפעולה שלמה:**
- כשמוסיפים לו"ז עם 10 פריטים: הציגי את כל 10, בקשי אישור **אחד**, ואז שלחי הכל ב-add_schedule_items **בקריאה אחת** (מערך של כל הפריטים). **אל תשאלי אישור על כל פריט בנפרד!**
- כשמוסיפים 5 משתתפים: הציגי את כולם, אישור **אחד**, ואז add_participants **בקריאה אחת**
- כשמוסיפים צ'קליסט עם 8 פריטים: הציגי, אישור **אחד**, add_checklist_items **בקריאה אחת**
- אותו הדבר ליצירת אירוע + צ'קליסט + ספקים: אישור **אחד** ואז בצעי הכל

**חריגים - מתי מותר לדלג על COV:**
- כשהמשתמש אומר במפורש "בצע ישר" / "בלי לשאול" / "פשוט תעשה את זה"
- כשהמשתמש מאשר תוכנית ויש בה כמה צעדים - אחרי אישור אחד בצעי את כולם ברצף

## איך לנהל שיחה
1. **שאלי שאלות חכמות** - אל תחכי שהמשתמש יספר הכל. שאלי באופן יזום (אבל זכרי - לפני כל פעולת כתיבה, הציגי תוכנית ובקשי אישור!):
   - מה המטרה המרכזית של האירוע?
   - מי קהל היעד?
   - מה התקציב המשוער?
   - האם יש תאריך שקבוע?
   - מה הציפיות של הלקוח / המזמין?

2. **הצע רעיונות ותכנים** - כשמתכננים כנס, למשל:
   - הצע נושאים רלוונטיים להרצאות
   - הצע מבנה תוכנייה (פתיחה, הרצאות, פאנלים, הפסקות, נטוורקינג, סיום)
   - הצע סוגי פעילויות (סדנאות, חדרי בריחה, האקתון, שולחנות עגולים)
   - הצע ספקים מומלצים לפי סוג (קייטרינג, צילום, הגברה, מקום)
   - הצע לוגיסטיקה (הסעות, חניה, שילוט, ערכות מתנה)

3. **בנה תוכנייה מפורטת** - כשיש מספיק מידע:
   - פרט שעות ופעילויות
   - הצע דוברים/מרצים מומלצים בתחום
   - חשוב על חוויית המשתתף מא' עד ת'

4. **התריע על חסרים** - נסי תמיד לזהות:
   - דברים שהמשתמש שכח (ביטוח, רישיונות, נגישות, תוכנית B לגשם)
   - בעיות פוטנציאליות (תזמון צפוף, תקציב לא ריאלי)
   - הזדמנויות (ספונסרים, שיתופי פעולה, מיתוג)

## פורמט תשובות
- ענה בעברית בצורה ידידותית, מקצועית וישירה
- השתמש בכותרות ורשימות כשמתאים
- כשמציעה תוכנייה, השתמש בפורמט מסודר עם שעות
- תני תשובות מלאות ומפורטות - אל תקצרי יותר מדי
- שאלי שאלת המשך אחת בסוף כל תשובה כדי לקדם את התכנון
- כשמשתמשת בכלים ומוצאת תוצאות, שלבי אותן בתשובה שלך בצורה טבעית

## אזור זמן - חשוב מאוד!
- **כל השעות במערכת הן בשעון ישראל (Asia/Jerusalem)**
- כשאת שולחת שעות בכלים (start_time, end_time), **חובה** לכלול את אזור הזמן הישראלי: **+02:00** (חורף, אוקטובר-מרץ) או **+03:00** (קיץ, מרץ-אוקטובר)
- דוגמה: אם המשתמש אומר "09:00", שלחי: 2026-02-15T09:00:00+02:00
- **לעולם אל תשלחי שעה בלי +02:00 או +03:00!** אחרת השעות יהיו שגויות
- כרגע (ינואר-פברואר 2026) = חורף = **+02:00**

## זיהוי פרטי אירוע
כאשר המשתמש מתאר אירוע, זהי:
- סוג האירוע (כנס, גיבוש, חתונה, יום עיון, אירוע חברה, השקה, בר/בת מצווה, סדנה)
- תאריך ומיקום
- מספר משתתפים משוער
- תקציב (אם הוזכר)
- דרישות מיוחדות
- קהל יעד ומטרות

## אזהרה קריטית - MUST USE FUNCTION CALLS
**זוהי ההנחיה הכי חשובה:**
- כשהמשתמש מאשר פעולה (אומר "כן", "בצע", "אשר", וכו'), את **חייבת** להגיב עם function call (functionCall) - לא עם טקסט!
- אם את כותבת "הוספתי", "ביצעתי", "עודכן", "נשלח" בלי function call - **את משקרת למשתמש**. הפעולה לא בוצעה!
- **הדרך היחידה לבצע פעולה במערכת היא דרך function call.** טקסט לבד לא עושה כלום.
- אחרי שהמשתמש מאשר, התגובה שלך חייבת להכיל functionCall עם שם הכלי והפרמטרים. רק אחרי שתקבלי את תוצאת הכלי, תוכלי לכתוב הודעה למשתמש.`

// ============================================================================
// Gemini Function Declarations (Tool Definitions)
// ============================================================================

const TOOL_DECLARATIONS = [
  {
    name: 'search_events',
    description: 'חיפוש אירועים קודמים במערכת לפי מילת מפתח, סוג, סטטוס או טווח תאריכים. שימושי כדי ללמוד מאירועים דומים בעבר.',
    parameters: {
      type: 'OBJECT',
      properties: {
        keyword: {
          type: 'STRING',
          description: 'מילת מפתח לחיפוש בשם או תיאור האירוע (למשל: "כנס", "גיבוש", "חתונה")',
        },
        status: {
          type: 'STRING',
          description: 'סטטוס האירוע לסינון',
          enum: ['draft', 'planning', 'active', 'completed', 'cancelled'],
        },
        from_date: {
          type: 'STRING',
          description: 'תאריך התחלה לסינון בפורמט ISO (YYYY-MM-DD)',
        },
        to_date: {
          type: 'STRING',
          description: 'תאריך סיום לסינון בפורמט ISO (YYYY-MM-DD)',
        },
        limit: {
          type: 'INTEGER',
          description: 'מספר תוצאות מרבי (ברירת מחדל: 10)',
        },
      },
      required: [],
    },
  },
  {
    name: 'search_vendors',
    description: 'חיפוש ספקים זמינים לפי קטגוריה, מילת מפתח, או דירוג. מחזיר ספקים פעילים עם פרטי קשר ודירוג.',
    parameters: {
      type: 'OBJECT',
      properties: {
        keyword: {
          type: 'STRING',
          description: 'מילת מפתח לחיפוש בשם או תיאור הספק',
        },
        category: {
          type: 'STRING',
          description: 'שם קטגוריית הספק (למשל: "קייטרינג", "צילום", "הגברה", "מקום", "DJ")',
        },
        preferred_only: {
          type: 'BOOLEAN',
          description: 'האם להציג רק ספקים מועדפים',
        },
        min_rating: {
          type: 'NUMBER',
          description: 'דירוג מינימלי (1-5)',
        },
        limit: {
          type: 'INTEGER',
          description: 'מספר תוצאות מרבי (ברירת מחדל: 10)',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_event_details',
    description: 'קבלת פרטים מלאים של אירוע ספציפי כולל ספקים משויכים, לוח זמנים, ופריטי צ\'קליסט.',
    parameters: {
      type: 'OBJECT',
      properties: {
        event_id: {
          type: 'STRING',
          description: 'מזהה האירוע (UUID)',
        },
      },
      required: ['event_id'],
    },
  },
  {
    name: 'suggest_schedule',
    description: 'הצעת לוח זמנים לאירוע על בסיס אירועים דומים מהעבר. מנתח לוחות זמנים של אירועים דומים ומציע תבנית.',
    parameters: {
      type: 'OBJECT',
      properties: {
        event_type: {
          type: 'STRING',
          description: 'סוג האירוע (למשל: "כנס", "גיבוש", "חתונה", "יום עיון")',
        },
        duration_hours: {
          type: 'NUMBER',
          description: 'משך האירוע בשעות',
        },
        start_time: {
          type: 'STRING',
          description: 'שעת התחלה מבוקשת בפורמט HH:MM (למשל: "09:00")',
        },
      },
      required: ['event_type'],
    },
  },
  {
    name: 'create_event_draft',
    description: 'יצירת טיוטת אירוע חדש במערכת. השתמש רק כשיש מספיק מידע (לפחות שם ותאריך) ולאחר שהמשתמש אישר.',
    parameters: {
      type: 'OBJECT',
      properties: {
        name: {
          type: 'STRING',
          description: 'שם האירוע',
        },
        description: {
          type: 'STRING',
          description: 'תיאור האירוע',
        },
        start_date: {
          type: 'STRING',
          description: 'תאריך ושעת התחלה בפורמט ISO (YYYY-MM-DDTHH:MM:SS)',
        },
        end_date: {
          type: 'STRING',
          description: 'תאריך ושעת סיום בפורמט ISO (YYYY-MM-DDTHH:MM:SS)',
        },
        venue_name: {
          type: 'STRING',
          description: 'שם המקום',
        },
        venue_address: {
          type: 'STRING',
          description: 'כתובת המקום',
        },
        venue_city: {
          type: 'STRING',
          description: 'עיר',
        },
        max_participants: {
          type: 'INTEGER',
          description: 'מספר משתתפים מרבי',
        },
        budget: {
          type: 'NUMBER',
          description: 'תקציב בשקלים',
        },
      },
      required: ['name', 'start_date'],
    },
  },
  {
    name: 'add_checklist_items',
    description: 'הוספת פריטי צ\'קליסט לאירוע קיים. ניתן להוסיף מספר פריטים בבת אחת עם קטגוריה, עדיפות ותאריך יעד.',
    parameters: {
      type: 'OBJECT',
      properties: {
        event_id: {
          type: 'STRING',
          description: 'מזהה האירוע (UUID)',
        },
        items: {
          type: 'ARRAY',
          description: 'רשימת פריטי צ\'קליסט להוספה',
          items: {
            type: 'OBJECT',
            properties: {
              title: {
                type: 'STRING',
                description: 'כותרת הפריט',
              },
              description: {
                type: 'STRING',
                description: 'תיאור הפריט',
              },
              category: {
                type: 'STRING',
                description: 'קטגוריה (למשל: "לוגיסטיקה", "ספקים", "תוכן", "שיווק", "מנהלה")',
              },
              priority: {
                type: 'STRING',
                description: 'עדיפות',
                enum: ['low', 'medium', 'high', 'critical'],
              },
              due_days_before: {
                type: 'INTEGER',
                description: 'מספר ימים לפני האירוע שבהם הפריט צריך להיות מוכן',
              },
            },
            required: ['title'],
          },
        },
      },
      required: ['event_id', 'items'],
    },
  },
  {
    name: 'assign_vendors',
    description: 'שיוך ספקים לאירוע קיים. ניתן לשייך מספר ספקים בבת אחת.',
    parameters: {
      type: 'OBJECT',
      properties: {
        event_id: {
          type: 'STRING',
          description: 'מזהה האירוע (UUID)',
        },
        vendor_ids: {
          type: 'ARRAY',
          description: 'רשימת מזהי ספקים (UUIDs) לשיוך',
          items: {
            type: 'STRING',
          },
        },
      },
      required: ['event_id', 'vendor_ids'],
    },
  },
  {
    name: 'add_participants',
    description: 'הוספת משתתפים לאירוע קיים. ניתן להוסיף משתתף אחד או יותר עם שם, טלפון, אימייל וסטטוס.',
    parameters: {
      type: 'OBJECT',
      properties: {
        event_id: {
          type: 'STRING',
          description: 'מזהה האירוע (UUID)',
        },
        participants: {
          type: 'ARRAY',
          description: 'רשימת משתתפים להוספה',
          items: {
            type: 'OBJECT',
            properties: {
              first_name: {
                type: 'STRING',
                description: 'שם פרטי',
              },
              last_name: {
                type: 'STRING',
                description: 'שם משפחה',
              },
              phone: {
                type: 'STRING',
                description: 'מספר טלפון (פורמט ישראלי: 05XXXXXXXX)',
              },
              email: {
                type: 'STRING',
                description: 'כתובת אימייל',
              },
              status: {
                type: 'STRING',
                description: 'סטטוס המשתתף',
                enum: ['invited', 'confirmed', 'declined', 'maybe'],
              },
              is_vip: {
                type: 'BOOLEAN',
                description: 'האם המשתתף VIP',
              },
            },
            required: ['first_name'],
          },
        },
      },
      required: ['event_id', 'participants'],
    },
  },
  {
    name: 'list_participants',
    description: 'הצגת רשימת המשתתפים של אירוע, כולל סטטיסטיקות לפי סטטוס. שימושי לקבלת תמונת מצב על המוזמנים.',
    parameters: {
      type: 'OBJECT',
      properties: {
        event_id: {
          type: 'STRING',
          description: 'מזהה האירוע (UUID)',
        },
        status: {
          type: 'STRING',
          description: 'סינון לפי סטטוס ספציפי',
          enum: ['invited', 'confirmed', 'declined', 'maybe', 'checked_in', 'no_show'],
        },
        limit: {
          type: 'INTEGER',
          description: 'מספר תוצאות מרבי (ברירת מחדל: 50)',
        },
      },
      required: ['event_id'],
    },
  },
  {
    name: 'update_event',
    description: 'עדכון פרטי אירוע קיים - שם, תיאור, תאריכים, מיקום, תקציב, סטטוס ועוד.',
    parameters: {
      type: 'OBJECT',
      properties: {
        event_id: {
          type: 'STRING',
          description: 'מזהה האירוע (UUID)',
        },
        name: {
          type: 'STRING',
          description: 'שם חדש לאירוע',
        },
        description: {
          type: 'STRING',
          description: 'תיאור חדש',
        },
        start_date: {
          type: 'STRING',
          description: 'תאריך התחלה חדש בפורמט ISO',
        },
        end_date: {
          type: 'STRING',
          description: 'תאריך סיום חדש בפורמט ISO',
        },
        venue_name: {
          type: 'STRING',
          description: 'שם מקום חדש',
        },
        venue_address: {
          type: 'STRING',
          description: 'כתובת חדשה',
        },
        venue_city: {
          type: 'STRING',
          description: 'עיר חדשה',
        },
        max_participants: {
          type: 'INTEGER',
          description: 'מספר משתתפים מרבי חדש',
        },
        budget: {
          type: 'NUMBER',
          description: 'תקציב חדש בשקלים',
        },
        status: {
          type: 'STRING',
          description: 'סטטוס חדש',
          enum: ['draft', 'planning', 'active', 'completed', 'cancelled'],
        },
      },
      required: ['event_id'],
    },
  },
  {
    name: 'complete_checklist_item',
    description: 'סימון פריט צ\'קליסט כהושלם לפי כותרת או מזהה. ניתן גם לעדכן סטטוס לכל ערך אחר.',
    parameters: {
      type: 'OBJECT',
      properties: {
        event_id: {
          type: 'STRING',
          description: 'מזהה האירוע (UUID)',
        },
        item_title: {
          type: 'STRING',
          description: 'כותרת הפריט (חיפוש חלקי)',
        },
        item_id: {
          type: 'STRING',
          description: 'מזהה הפריט (UUID) - אם ידוע',
        },
        new_status: {
          type: 'STRING',
          description: 'הסטטוס החדש (ברירת מחדל: completed)',
          enum: ['pending', 'in_progress', 'completed', 'blocked', 'cancelled'],
        },
      },
      required: ['event_id'],
    },
  },
  {
    name: 'send_whatsapp_to_participants',
    description: 'שליחת הודעת WhatsApp למשתתפי אירוע. ניתן לסנן לפי סטטוס (כל המשתתפים, רק מאושרים, רק מוזמנים).',
    parameters: {
      type: 'OBJECT',
      properties: {
        event_id: {
          type: 'STRING',
          description: 'מזהה האירוע (UUID)',
        },
        message_text: {
          type: 'STRING',
          description: 'תוכן ההודעה לשליחה',
        },
        recipient_filter: {
          type: 'STRING',
          description: 'סינון נמענים',
          enum: ['all', 'confirmed', 'invited', 'maybe'],
        },
      },
      required: ['event_id', 'message_text'],
    },
  },
  {
    name: 'add_schedule_items',
    description: 'הוספת פריטי לו"ז (תוכנייה) לאירוע קיים - הרצאות, סדנאות, הפסקות, פעילויות ועוד. ניתן להוסיף מספר פריטים בבת אחת.',
    parameters: {
      type: 'OBJECT',
      properties: {
        event_id: {
          type: 'STRING',
          description: 'מזהה האירוע (UUID)',
        },
        items: {
          type: 'ARRAY',
          description: 'רשימת פריטי לו"ז להוספה',
          items: {
            type: 'OBJECT',
            properties: {
              title: {
                type: 'STRING',
                description: 'כותרת הפריט (למשל: "הרצאת פתיחה", "הפסקת קפה", "סדנה")',
              },
              description: {
                type: 'STRING',
                description: 'תיאור הפריט',
              },
              start_time: {
                type: 'STRING',
                description: 'שעת התחלה בפורמט ISO **עם אזור זמן ישראלי**. דוגמה: 2026-02-15T09:00:00+02:00. חובה לכלול +02:00 (חורף) או +03:00 (קיץ). אם לא ידוע התאריך, השתמש בתאריך האירוע.',
              },
              end_time: {
                type: 'STRING',
                description: 'שעת סיום בפורמט ISO **עם אזור זמן ישראלי**. דוגמה: 2026-02-15T10:30:00+02:00. חובה לכלול +02:00 (חורף) או +03:00 (קיץ).',
              },
              location: {
                type: 'STRING',
                description: 'מיקום/אולם (למשל: "אולם ראשי", "חדר 3", "לובי")',
              },
              speaker_name: {
                type: 'STRING',
                description: 'שם הדובר/מנחה',
              },
              speaker_title: {
                type: 'STRING',
                description: 'תפקיד הדובר',
              },
              is_mandatory: {
                type: 'BOOLEAN',
                description: 'האם חובה להשתתף',
              },
              is_break: {
                type: 'BOOLEAN',
                description: 'האם זו הפסקה (קפה, ארוחה, וכו\')',
              },
              max_capacity: {
                type: 'INTEGER',
                description: 'מספר משתתפים מרבי (רלוונטי לסדנאות)',
              },
              track: {
                type: 'STRING',
                description: 'שם הטראק/מסלול (למשל: "טכנולוגי", "עסקי", "כללי")',
              },
            },
            required: ['title', 'start_time', 'end_time'],
          },
        },
      },
      required: ['event_id', 'items'],
    },
  },
  {
    name: 'update_schedule_item',
    description: 'עדכון או מחיקה של פריט קיים בלו"ז לפי כותרת או מזהה.',
    parameters: {
      type: 'OBJECT',
      properties: {
        event_id: {
          type: 'STRING',
          description: 'מזהה האירוע (UUID)',
        },
        item_id: {
          type: 'STRING',
          description: 'מזהה פריט הלו"ז (UUID) - אם ידוע',
        },
        item_title: {
          type: 'STRING',
          description: 'כותרת הפריט לחיפוש (חיפוש חלקי)',
        },
        action: {
          type: 'STRING',
          description: 'הפעולה לבצע',
          enum: ['update', 'delete'],
        },
        title: {
          type: 'STRING',
          description: 'כותרת חדשה',
        },
        description: {
          type: 'STRING',
          description: 'תיאור חדש',
        },
        start_time: {
          type: 'STRING',
          description: 'שעת התחלה חדשה בפורמט ISO עם אזור זמן ישראלי (למשל: 2026-02-15T09:00:00+02:00)',
        },
        end_time: {
          type: 'STRING',
          description: 'שעת סיום חדשה בפורמט ISO עם אזור זמן ישראלי (למשל: 2026-02-15T10:30:00+02:00)',
        },
        location: {
          type: 'STRING',
          description: 'מיקום חדש',
        },
        speaker_name: {
          type: 'STRING',
          description: 'שם דובר חדש',
        },
      },
      required: ['event_id'],
    },
  },
  {
    name: 'suggest_room_assignments',
    description: 'הצעת שיוך חדרים אוטומטית למשתתפים לפי עדיפויות VIP, נגישות והעדפות מיטה. מחזיר הצעה לאישור המנהל.',
    parameters: {
      type: 'OBJECT',
      properties: {
        event_id: {
          type: 'STRING',
          description: 'מזהה האירוע (UUID)',
        },
      },
      required: ['event_id'],
    },
  },
]

// ============================================================================
// Tool Execution Functions
// ============================================================================

async function executeSearchEvents(
  supabase: SupabaseClient,
  args: Record<string, unknown>,
  organizationId?: string
): Promise<ToolResult> {
  try {
    let query = supabase
      .from('events')
      .select(`
        id,
        name,
        description,
        status,
        start_date,
        end_date,
        venue_name,
        venue_city,
        max_participants,
        budget,
        currency,
        event_types ( name, name_en, icon )
      `)
      .order('start_date', { ascending: false })

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    if (args.keyword && typeof args.keyword === 'string') {
      query = query.or(`name.ilike.%${args.keyword}%,description.ilike.%${args.keyword}%`)
    }

    if (args.status && typeof args.status === 'string') {
      query = query.eq('status', args.status)
    }

    if (args.from_date && typeof args.from_date === 'string') {
      query = query.gte('start_date', args.from_date)
    }

    if (args.to_date && typeof args.to_date === 'string') {
      query = query.lte('start_date', args.to_date)
    }

    const limit = typeof args.limit === 'number' ? Math.min(args.limit, 20) : 10
    query = query.limit(limit)

    const { data, error } = await query

    if (error) {
      console.error('search_events error:', error)
      return { success: false, error: `שגיאה בחיפוש אירועים: ${error.message}` }
    }

    return {
      success: true,
      data: {
        events: data || [],
        count: data?.length || 0,
        message: data?.length
          ? `נמצאו ${data.length} אירועים`
          : 'לא נמצאו אירועים תואמים',
      },
    }
  } catch (err) {
    console.error('search_events exception:', err)
    return { success: false, error: 'שגיאה פנימית בחיפוש אירועים' }
  }
}

async function executeSearchVendors(
  supabase: SupabaseClient,
  args: Record<string, unknown>,
  organizationId?: string
): Promise<ToolResult> {
  try {
    let query = supabase
      .from('vendors')
      .select(`
        id,
        name,
        description,
        contact_name,
        phone,
        email,
        category_id,
        organization_id,
        vendor_categories ( id, name, name_en, icon )
      `)
      .order('name', { ascending: true })

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    if (args.keyword && typeof args.keyword === 'string') {
      query = query.or(`name.ilike.%${args.keyword}%,description.ilike.%${args.keyword}%`)
    }

    if (args.category && typeof args.category === 'string') {
      // First find the category ID by name
      const { data: categories } = await supabase
        .from('vendor_categories')
        .select('id')
        .ilike('name', `%${args.category}%`)

      if (categories && categories.length > 0) {
        const categoryIds = categories.map((c: { id: string }) => c.id)
        query = query.in('category_id', categoryIds)
      }
    }

    const limit = typeof args.limit === 'number' ? Math.min(args.limit, 20) : 10
    query = query.limit(limit)

    const { data, error } = await query

    if (error) {
      console.error('search_vendors error:', error)
      return { success: false, error: `שגיאה בחיפוש ספקים: ${error.message}` }
    }

    return {
      success: true,
      data: {
        vendors: data || [],
        count: data?.length || 0,
        message: data?.length
          ? `נמצאו ${data.length} ספקים`
          : 'לא נמצאו ספקים תואמים',
      },
    }
  } catch (err) {
    console.error('search_vendors exception:', err)
    return { success: false, error: 'שגיאה פנימית בחיפוש ספקים' }
  }
}

async function executeGetEventDetails(
  supabase: SupabaseClient,
  args: Record<string, unknown>
): Promise<ToolResult> {
  try {
    const eventId = args.event_id as string
    if (!eventId) {
      return { success: false, error: 'חסר מזהה אירוע' }
    }

    // Fetch event with related data in parallel
    const [eventResult, vendorsResult, schedulesResult, checklistResult] = await Promise.all([
      supabase
        .from('events')
        .select(`
          *,
          event_types ( name, name_en, icon )
        `)
        .eq('id', eventId)
        .single(),

      supabase
        .from('event_vendors')
        .select(`
          id,
          status,
          quoted_amount,
          approved_amount,
          vendors ( id, name, contact_name, phone, email, rating_average ),
          vendor_categories ( name, icon )
        `)
        .eq('event_id', eventId),

      supabase
        .from('schedules')
        .select('*')
        .eq('event_id', eventId)
        .order('sort_order', { ascending: true })
        .order('start_time', { ascending: true }),

      supabase
        .from('checklist_items')
        .select('*')
        .eq('event_id', eventId)
        .order('sort_order', { ascending: true }),
    ])

    if (eventResult.error) {
      console.error('get_event_details event error:', eventResult.error)
      return { success: false, error: `האירוע לא נמצא: ${eventResult.error.message}` }
    }

    return {
      success: true,
      data: {
        event: eventResult.data,
        vendors: vendorsResult.data || [],
        schedules: schedulesResult.data || [],
        checklist: checklistResult.data || [],
        summary: {
          vendor_count: vendorsResult.data?.length || 0,
          schedule_items: schedulesResult.data?.length || 0,
          checklist_total: checklistResult.data?.length || 0,
          checklist_completed: checklistResult.data?.filter(
            (item: { status: string }) => item.status === 'completed'
          ).length || 0,
        },
      },
    }
  } catch (err) {
    console.error('get_event_details exception:', err)
    return { success: false, error: 'שגיאה פנימית בקריאת פרטי האירוע' }
  }
}

async function executeSuggestSchedule(
  supabase: SupabaseClient,
  args: Record<string, unknown>,
  organizationId?: string
): Promise<ToolResult> {
  try {
    const eventType = args.event_type as string
    if (!eventType) {
      return { success: false, error: 'חסר סוג אירוע' }
    }

    // Find similar events by type name
    let eventsQuery = supabase
      .from('events')
      .select(`
        id,
        name,
        start_date,
        end_date,
        event_types ( name )
      `)
      .in('status', ['completed', 'active'])
      .order('start_date', { ascending: false })
      .limit(5)

    if (organizationId) {
      eventsQuery = eventsQuery.eq('organization_id', organizationId)
    }

    const { data: events } = await eventsQuery

    // Find events whose type matches the keyword
    const matchingEventIds: string[] = []
    if (events) {
      for (const event of events) {
        const typeName = (event.event_types as { name: string } | null)?.name || ''
        if (typeName.includes(eventType) || (event.name && event.name.includes(eventType))) {
          matchingEventIds.push(event.id)
        }
      }
    }

    // Fetch schedules from matching events
    let pastSchedules: unknown[] = []
    if (matchingEventIds.length > 0) {
      const { data: schedules } = await supabase
        .from('schedules')
        .select('*')
        .in('event_id', matchingEventIds)
        .order('sort_order', { ascending: true })
        .order('start_time', { ascending: true })

      pastSchedules = schedules || []
    }

    const durationHours = typeof args.duration_hours === 'number' ? args.duration_hours : null
    const startTime = typeof args.start_time === 'string' ? args.start_time : null

    return {
      success: true,
      data: {
        similar_events_found: matchingEventIds.length,
        past_schedules: pastSchedules,
        request: {
          event_type: eventType,
          duration_hours: durationHours,
          start_time: startTime,
        },
        message: matchingEventIds.length > 0
          ? `נמצאו ${matchingEventIds.length} אירועים דומים מסוג "${eventType}" עם ${pastSchedules.length} פריטי לוח זמנים. בנה על בסיסם הצעה מותאמת.`
          : `לא נמצאו אירועים דומים מסוג "${eventType}" במערכת. בנה הצעת לוח זמנים כללית על בסיס הניסיון שלך.`,
      },
    }
  } catch (err) {
    console.error('suggest_schedule exception:', err)
    return { success: false, error: 'שגיאה פנימית ביצירת הצעת לוח זמנים' }
  }
}

async function executeCreateEventDraft(
  supabase: SupabaseClient,
  args: Record<string, unknown>,
  organizationId?: string,
  userId?: string
): Promise<ToolResult> {
  try {
    const name = args.name as string
    const startDate = args.start_date as string

    if (!name || !startDate) {
      return { success: false, error: 'חסרים שדות חובה: שם האירוע ותאריך התחלה' }
    }

    // Validate start_date is a valid date
    const parsedDate = new Date(startDate)
    if (isNaN(parsedDate.getTime())) {
      return { success: false, error: 'תאריך ההתחלה אינו תקין. השתמש בפורמט ISO: YYYY-MM-DDTHH:MM:SS' }
    }

    const eventData: Record<string, unknown> = {
      name,
      start_date: startDate,
      status: 'draft',
    }

    if (organizationId) eventData.organization_id = organizationId
    if (userId) eventData.created_by = userId
    if (args.description) eventData.description = args.description
    if (args.end_date) eventData.end_date = args.end_date
    if (args.venue_name) eventData.venue_name = args.venue_name
    if (args.venue_address) eventData.venue_address = args.venue_address
    if (args.venue_city) eventData.venue_city = args.venue_city
    if (typeof args.max_participants === 'number') eventData.max_participants = args.max_participants
    if (typeof args.budget === 'number') eventData.budget = args.budget

    const { data, error } = await supabase
      .from('events')
      .insert(eventData)
      .select('id, name, status, start_date, venue_name, max_participants, budget')
      .single()

    if (error) {
      console.error('create_event_draft error:', error)
      return { success: false, error: `שגיאה ביצירת האירוע: ${error.message}` }
    }

    return {
      success: true,
      data: {
        event: data,
        message: `האירוע "${data.name}" נוצר בהצלחה כטיוטה! מזהה: ${data.id}`,
      },
    }
  } catch (err) {
    console.error('create_event_draft exception:', err)
    return { success: false, error: 'שגיאה פנימית ביצירת האירוע' }
  }
}

async function executeAddChecklistItems(
  supabase: SupabaseClient,
  args: Record<string, unknown>
): Promise<ToolResult> {
  try {
    const eventId = args.event_id as string
    const items = args.items as Array<{
      title: string
      description?: string
      category?: string
      priority?: string
      due_days_before?: number
    }>

    if (!eventId) {
      return { success: false, error: 'חסר מזהה אירוע' }
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return { success: false, error: 'חסרים פריטי צ\'קליסט להוספה' }
    }

    // Verify event exists
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, start_date')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return { success: false, error: 'האירוע לא נמצא' }
    }

    // Prepare items for insertion
    const eventStartDate = new Date(event.start_date)
    const insertItems = items.map((item, index) => {
      const record: Record<string, unknown> = {
        event_id: eventId,
        title: item.title,
        sort_order: index,
      }

      if (item.description) record.description = item.description
      // Note: category column may not exist in DB yet, skip it
      if (item.priority) record.priority = item.priority

      // Calculate due_date from due_days_before
      if (typeof item.due_days_before === 'number' && item.due_days_before > 0) {
        const dueDate = new Date(eventStartDate)
        dueDate.setDate(dueDate.getDate() - item.due_days_before)
        record.due_date = dueDate.toISOString()
      }

      return record
    })

    const { data, error } = await supabase
      .from('checklist_items')
      .insert(insertItems)
      .select('id, title, priority, due_date, status')

    if (error) {
      console.error('add_checklist_items error:', error)
      return { success: false, error: `שגיאה בהוספת פריטי צ'קליסט: ${error.message}` }
    }

    return {
      success: true,
      data: {
        items: data,
        count: data?.length || 0,
        message: `נוספו ${data?.length || 0} פריטי צ'קליסט לאירוע בהצלחה`,
      },
    }
  } catch (err) {
    console.error('add_checklist_items exception:', err)
    return { success: false, error: 'שגיאה פנימית בהוספת פריטי צ\'קליסט' }
  }
}

async function executeAssignVendors(
  supabase: SupabaseClient,
  args: Record<string, unknown>
): Promise<ToolResult> {
  try {
    const eventId = args.event_id as string
    const vendorIds = args.vendor_ids as string[]

    if (!eventId) {
      return { success: false, error: 'חסר מזהה אירוע' }
    }

    if (!vendorIds || !Array.isArray(vendorIds) || vendorIds.length === 0) {
      return { success: false, error: 'חסרים מזהי ספקים לשיוך' }
    }

    // Verify event exists
    const { error: eventError } = await supabase
      .from('events')
      .select('id')
      .eq('id', eventId)
      .single()

    if (eventError) {
      return { success: false, error: 'האירוע לא נמצא' }
    }

    // Fetch vendor details to get category_id
    const { data: vendors, error: vendorError } = await supabase
      .from('vendors')
      .select('id, name, category_id')
      .in('id', vendorIds)

    if (vendorError || !vendors || vendors.length === 0) {
      return { success: false, error: 'הספקים לא נמצאו' }
    }

    // Check for existing assignments to avoid duplicates
    const { data: existing } = await supabase
      .from('event_vendors')
      .select('vendor_id')
      .eq('event_id', eventId)
      .in('vendor_id', vendorIds)

    const existingVendorIds = new Set(
      (existing || []).map((e: { vendor_id: string }) => e.vendor_id)
    )

    // Only insert vendors not already assigned
    const newAssignments = vendors
      .filter((v: { id: string }) => !existingVendorIds.has(v.id))
      .map((v: { id: string; category_id: string | null }) => ({
        event_id: eventId,
        vendor_id: v.id,
        category_id: v.category_id,
        status: 'pending',
      }))

    if (newAssignments.length === 0) {
      return {
        success: true,
        data: {
          assigned: [],
          skipped: vendorIds.length,
          message: 'כל הספקים כבר משויכים לאירוע הזה',
        },
      }
    }

    const { data, error } = await supabase
      .from('event_vendors')
      .insert(newAssignments)
      .select(`
        id,
        status,
        vendors ( id, name, contact_name, phone ),
        vendor_categories ( name )
      `)

    if (error) {
      console.error('assign_vendors error:', error)
      return { success: false, error: `שגיאה בשיוך ספקים: ${error.message}` }
    }

    return {
      success: true,
      data: {
        assigned: data,
        count: data?.length || 0,
        skipped: existingVendorIds.size,
        message: `שויכו ${data?.length || 0} ספקים לאירוע בהצלחה${existingVendorIds.size > 0 ? ` (${existingVendorIds.size} כבר היו משויכים)` : ''}`,
      },
    }
  } catch (err) {
    console.error('assign_vendors exception:', err)
    return { success: false, error: 'שגיאה פנימית בשיוך ספקים' }
  }
}

// ============================================================================
// New Tool Executors (Phase 4)
// ============================================================================

async function executeAddParticipants(
  supabase: SupabaseClient,
  args: Record<string, unknown>
): Promise<ToolResult> {
  try {
    const eventId = args.event_id as string
    const participants = args.participants as Array<{
      first_name: string
      last_name?: string
      phone?: string
      email?: string
      status?: string
      is_vip?: boolean
    }>

    if (!eventId) return { success: false, error: 'חסר מזהה אירוע' }
    if (!participants || !Array.isArray(participants) || participants.length === 0) {
      return { success: false, error: 'חסרים משתתפים להוספה' }
    }

    // Verify event exists
    const { error: eventError } = await supabase
      .from('events')
      .select('id')
      .eq('id', eventId)
      .single()

    if (eventError) return { success: false, error: 'האירוע לא נמצא' }

    // Normalize phone numbers (Israeli format)
    const normalizePhone = (phone: string): string => {
      const cleaned = phone.replace(/[\s\-()]/g, '')
      if (cleaned.startsWith('0')) return '972' + cleaned.substring(1)
      if (cleaned.startsWith('+972')) return cleaned.substring(1)
      return cleaned
    }

    const insertData = participants.map(p => ({
      event_id: eventId,
      first_name: p.first_name,
      last_name: p.last_name || '',
      phone: p.phone ? normalizePhone(p.phone) : null,
      email: p.email || null,
      status: p.status || 'invited',
      is_vip: p.is_vip || false,
    }))

    const { data, error } = await supabase
      .from('participants')
      .insert(insertData)
      .select('id, first_name, last_name, phone, email, status, is_vip')

    if (error) {
      console.error('add_participants error:', error)
      return { success: false, error: `שגיאה בהוספת משתתפים: ${error.message}` }
    }

    return {
      success: true,
      data: {
        participants: data,
        count: data?.length || 0,
        message: `נוספו ${data?.length || 0} משתתפים לאירוע בהצלחה`,
      },
    }
  } catch (err) {
    console.error('add_participants exception:', err)
    return { success: false, error: 'שגיאה פנימית בהוספת משתתפים' }
  }
}

async function executeListParticipants(
  supabase: SupabaseClient,
  args: Record<string, unknown>
): Promise<ToolResult> {
  try {
    const eventId = args.event_id as string
    if (!eventId) return { success: false, error: 'חסר מזהה אירוע' }

    let query = supabase
      .from('participants')
      .select('id, first_name, last_name, phone, email, status, is_vip, has_companion, dietary_restrictions')
      .eq('event_id', eventId)
      .order('first_name', { ascending: true })

    if (args.status && typeof args.status === 'string') {
      query = query.eq('status', args.status)
    }

    const limit = typeof args.limit === 'number' ? Math.min(args.limit, 100) : 50
    query = query.limit(limit)

    const { data, error } = await query

    if (error) {
      console.error('list_participants error:', error)
      return { success: false, error: `שגיאה בטעינת משתתפים: ${error.message}` }
    }

    // Compute status counts
    const statusCounts: Record<string, number> = {}
    for (const p of (data || [])) {
      statusCounts[p.status] = (statusCounts[p.status] || 0) + 1
    }

    const statusHebrew: Record<string, string> = {
      invited: 'הוזמנו',
      confirmed: 'אישרו',
      declined: 'סירבו',
      maybe: 'אולי',
      checked_in: 'עשו צ\'ק-אין',
      no_show: 'לא הגיעו',
    }

    return {
      success: true,
      data: {
        participants: data || [],
        total: data?.length || 0,
        status_counts: statusCounts,
        status_summary: Object.entries(statusCounts)
          .map(([status, count]) => `${statusHebrew[status] || status}: ${count}`)
          .join(', '),
        vip_count: data?.filter((p: { is_vip: boolean }) => p.is_vip).length || 0,
        message: `נמצאו ${data?.length || 0} משתתפים`,
      },
    }
  } catch (err) {
    console.error('list_participants exception:', err)
    return { success: false, error: 'שגיאה פנימית בטעינת משתתפים' }
  }
}

async function executeUpdateEvent(
  supabase: SupabaseClient,
  args: Record<string, unknown>
): Promise<ToolResult> {
  try {
    const eventId = args.event_id as string
    if (!eventId) return { success: false, error: 'חסר מזהה אירוע' }

    const updateData: Record<string, unknown> = {}

    if (args.name) updateData.name = args.name
    if (args.description) updateData.description = args.description
    if (args.start_date) updateData.start_date = args.start_date
    if (args.end_date) updateData.end_date = args.end_date
    if (args.venue_name) updateData.venue_name = args.venue_name
    if (args.venue_address) updateData.venue_address = args.venue_address
    if (args.venue_city) updateData.venue_city = args.venue_city
    if (typeof args.max_participants === 'number') updateData.max_participants = args.max_participants
    if (typeof args.budget === 'number') updateData.budget = args.budget
    if (args.status) updateData.status = args.status

    if (Object.keys(updateData).length === 0) {
      return { success: false, error: 'לא צוינו שדות לעדכון' }
    }

    const { data, error } = await supabase
      .from('events')
      .update(updateData)
      .eq('id', eventId)
      .select('id, name, status, start_date, end_date, venue_name, budget')
      .single()

    if (error) {
      console.error('update_event error:', error)
      return { success: false, error: `שגיאה בעדכון האירוע: ${error.message}` }
    }

    const updatedFields = Object.keys(updateData).join(', ')
    return {
      success: true,
      data: {
        event: data,
        updated_fields: updatedFields,
        message: `האירוע "${data.name}" עודכן בהצלחה (שדות: ${updatedFields})`,
      },
    }
  } catch (err) {
    console.error('update_event exception:', err)
    return { success: false, error: 'שגיאה פנימית בעדכון האירוע' }
  }
}

async function executeCompleteChecklistItem(
  supabase: SupabaseClient,
  args: Record<string, unknown>
): Promise<ToolResult> {
  try {
    const eventId = args.event_id as string
    if (!eventId) return { success: false, error: 'חסר מזהה אירוע' }

    const newStatus = (args.new_status as string) || 'completed'
    let itemId = args.item_id as string | undefined
    const itemTitle = args.item_title as string | undefined

    // If no ID, search by title
    if (!itemId && itemTitle) {
      const { data: items, error: searchError } = await supabase
        .from('checklist_items')
        .select('id, title, status')
        .eq('event_id', eventId)
        .ilike('title', `%${itemTitle}%`)
        .limit(1)

      if (searchError || !items || items.length === 0) {
        return { success: false, error: `לא נמצא פריט צ'קליסט עם הכותרת "${itemTitle}"` }
      }

      itemId = items[0].id
    }

    if (!itemId) {
      return { success: false, error: 'חסר מזהה או כותרת של פריט הצ\'קליסט' }
    }

    const updateData: Record<string, unknown> = { status: newStatus }
    if (newStatus === 'completed') {
      updateData.completed_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('checklist_items')
      .update(updateData)
      .eq('id', itemId)
      .eq('event_id', eventId)
      .select('id, title, status')
      .single()

    if (error) {
      console.error('complete_checklist_item error:', error)
      return { success: false, error: `שגיאה בעדכון הפריט: ${error.message}` }
    }

    const statusHebrew: Record<string, string> = {
      pending: 'ממתין',
      in_progress: 'בביצוע',
      completed: 'הושלם',
      blocked: 'חסום',
      cancelled: 'בוטל',
    }

    return {
      success: true,
      data: {
        item: data,
        message: `הפריט "${data.title}" עודכן לסטטוס: ${statusHebrew[newStatus] || newStatus}`,
      },
    }
  } catch (err) {
    console.error('complete_checklist_item exception:', err)
    return { success: false, error: 'שגיאה פנימית בעדכון פריט הצ\'קליסט' }
  }
}

async function executeSendWhatsAppToParticipants(
  supabase: SupabaseClient,
  args: Record<string, unknown>
): Promise<ToolResult> {
  try {
    const eventId = args.event_id as string
    const messageText = args.message_text as string
    const recipientFilter = (args.recipient_filter as string) || 'all'

    if (!eventId) return { success: false, error: 'חסר מזהה אירוע' }
    if (!messageText) return { success: false, error: 'חסר תוכן הודעה' }

    // Fetch participants with phone numbers
    let query = supabase
      .from('participants')
      .select('id, first_name, last_name, phone, status')
      .eq('event_id', eventId)
      .not('phone', 'is', null)

    if (recipientFilter !== 'all') {
      query = query.eq('status', recipientFilter)
    }

    const { data: participants, error: fetchError } = await query

    if (fetchError) {
      return { success: false, error: `שגיאה בטעינת משתתפים: ${fetchError.message}` }
    }

    if (!participants || participants.length === 0) {
      return {
        success: true,
        data: {
          sent: 0,
          message: 'לא נמצאו משתתפים עם מספר טלפון לשליחה',
        },
      }
    }

    // Create message records in the messages table
    const messageRecords = participants.map((p: { id: string; phone: string }) => ({
      event_id: eventId,
      participant_id: p.id,
      type: 'custom',
      channel: 'whatsapp',
      content: messageText,
      recipient_phone: p.phone,
      status: 'pending',
    }))

    const { data: insertedMessages, error: insertError } = await supabase
      .from('messages')
      .insert(messageRecords)
      .select('id')

    if (insertError) {
      console.error('send_whatsapp insert error:', insertError)
      return { success: false, error: `שגיאה ביצירת הודעות: ${insertError.message}` }
    }

    const filterHebrew: Record<string, string> = {
      all: 'כל המשתתפים',
      confirmed: 'מאושרים',
      invited: 'מוזמנים',
      maybe: 'אולי',
    }

    return {
      success: true,
      data: {
        queued: insertedMessages?.length || 0,
        recipients: participants.length,
        filter: filterHebrew[recipientFilter] || recipientFilter,
        message: `${insertedMessages?.length || 0} הודעות WhatsApp נוצרו ומחכות לשליחה (${filterHebrew[recipientFilter] || recipientFilter})`,
      },
    }
  } catch (err) {
    console.error('send_whatsapp exception:', err)
    return { success: false, error: 'שגיאה פנימית בשליחת הודעות WhatsApp' }
  }
}

// ============================================================================
// Schedule Tool Executors
// ============================================================================

async function executeAddScheduleItems(
  supabase: SupabaseClient,
  args: Record<string, unknown>
): Promise<ToolResult> {
  try {
    const eventId = args.event_id as string
    const items = args.items as Array<{
      title: string
      description?: string
      start_time: string
      end_time: string
      location?: string
      speaker_name?: string
      speaker_title?: string
      is_mandatory?: boolean
      is_break?: boolean
      max_capacity?: number
      track?: string
    }>

    if (!eventId) return { success: false, error: 'חסר מזהה אירוע' }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return { success: false, error: 'חסרים פריטי לו"ז להוספה' }
    }

    // Verify event exists
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, name, start_date')
      .eq('id', eventId)
      .single()

    if (eventError || !event) return { success: false, error: 'האירוע לא נמצא' }

    // Get current max sort_order
    const { data: existingSchedules } = await supabase
      .from('schedules')
      .select('sort_order')
      .eq('event_id', eventId)
      .order('sort_order', { ascending: false })
      .limit(1)

    let nextSortOrder = (existingSchedules?.[0]?.sort_order ?? -1) + 1

    // Helper: ensure timezone is included (default to Israel +02:00 if missing)
    const ensureTimezone = (timeStr: string): string => {
      if (!timeStr) return timeStr
      // Check if already has timezone offset (+XX:XX, -XX:XX, or Z)
      if (/[+-]\d{2}:\d{2}$/.test(timeStr) || timeStr.endsWith('Z')) {
        return timeStr
      }
      // No timezone - assume Israel time (UTC+2 winter, UTC+3 summer)
      // Use +02:00 as default (Israel Standard Time)
      return timeStr + '+02:00'
    }

    const insertData = items.map((item) => {
      const record: Record<string, unknown> = {
        event_id: eventId,
        title: item.title,
        start_time: ensureTimezone(item.start_time),
        end_time: ensureTimezone(item.end_time),
        sort_order: nextSortOrder++,
      }

      if (item.description) record.description = item.description
      if (item.location) record.location = item.location
      if (item.speaker_name) record.speaker_name = item.speaker_name
      if (item.speaker_title) record.speaker_title = item.speaker_title
      if (typeof item.is_mandatory === 'boolean') record.is_mandatory = item.is_mandatory
      if (typeof item.is_break === 'boolean') record.is_break = item.is_break
      if (typeof item.max_capacity === 'number') record.max_capacity = item.max_capacity
      if (item.track) record.track = item.track

      return record
    })

    const { data, error } = await supabase
      .from('schedules')
      .insert(insertData)
      .select('id, title, start_time, end_time, location, speaker_name, is_break, sort_order')

    if (error) {
      console.error('add_schedule_items error:', error)
      return { success: false, error: `שגיאה בהוספת פריטי לו"ז: ${error.message}` }
    }

    // ── Auto-create participant_schedules + reminder messages ──
    let assignmentsCreated = 0
    let messagesCreated = 0

    const createdSchedules = data || []
    if (createdSchedules.length > 0) {
      // Fetch all participants for this event (with phone for messages)
      const { data: participants } = await supabase
        .from('participants')
        .select('id, full_name, first_name, last_name, phone')
        .eq('event_id', eventId)

      if (participants && participants.length > 0) {
        // 1. Create participant_schedules entries
        const psEntries = createdSchedules.flatMap((schedule: { id: string }) =>
          participants.map((p: { id: string }) => ({
            participant_id: p.id,
            schedule_id: schedule.id,
            status: 'registered',
          }))
        )

        // Insert in batches of 100
        for (let i = 0; i < psEntries.length; i += 100) {
          const batch = psEntries.slice(i, i + 100)
          const { error: psError } = await supabase
            .from('participant_schedules')
            .insert(batch)
          if (!psError) assignmentsCreated += batch.length
          else console.error('participant_schedules insert error:', psError)
        }

        // 2. Create reminder messages for schedules (send_reminder defaults to true)
        const reminderMessages = createdSchedules.flatMap((schedule: { id: string; title: string; start_time: string; location?: string }) =>
          participants
            .filter((p: { phone?: string }) => p.phone)
            .map((p: { id: string; full_name?: string; first_name?: string; last_name?: string; phone: string }) => {
              const name = p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim()
              const time = new Date(schedule.start_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
              const date = new Date(schedule.start_time).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })
              let content = `שלום ${name}! תזכורת: "${schedule.title}" ב${date} בשעה ${time}`
              if (schedule.location) content += ` | ${schedule.location}`

              // scheduled_for = start_time - 15 minutes (default reminder)
              const scheduledFor = new Date(schedule.start_time)
              scheduledFor.setMinutes(scheduledFor.getMinutes() - 15)

              return {
                event_id: eventId,
                participant_id: p.id,
                schedule_id: schedule.id,
                channel: 'whatsapp',
                to_phone: p.phone,
                content,
                status: 'scheduled',
                direction: 'outgoing',
                subject: `תזכורת: ${schedule.title}`,
                message_type: 'reminder',
                scheduled_for: scheduledFor.toISOString(),
              }
            })
        )

        // Insert messages in batches of 50
        for (let i = 0; i < reminderMessages.length; i += 50) {
          const batch = reminderMessages.slice(i, i + 50)
          const { error: msgError } = await supabase
            .from('messages')
            .insert(batch)
          if (!msgError) messagesCreated += batch.length
          else console.error('messages insert error:', msgError)
        }
      }
    }

    // Build readable summary
    const itemsSummary = (data || []).map((s: { title: string; start_time: string; end_time: string }) => {
      const startTime = new Date(s.start_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
      const endTime = new Date(s.end_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
      return `${startTime}-${endTime}: ${s.title}`
    }).join('\n')

    // Build message with full chain info
    let resultMessage = `נוספו ${data?.length || 0} פריטי לו"ז לאירוע "${event.name}" בהצלחה`
    if (assignmentsCreated > 0) resultMessage += ` | ${assignmentsCreated} שיוכי משתתפים`
    if (messagesCreated > 0) resultMessage += ` | ${messagesCreated} הודעות תזכורת`

    return {
      success: true,
      data: {
        items: data,
        count: data?.length || 0,
        event_name: event.name,
        summary: itemsSummary,
        message: resultMessage,
        assignments_created: assignmentsCreated,
        messages_created: messagesCreated,
      },
    }
  } catch (err) {
    console.error('add_schedule_items exception:', err)
    return { success: false, error: 'שגיאה פנימית בהוספת פריטי לו"ז' }
  }
}

async function executeUpdateScheduleItem(
  supabase: SupabaseClient,
  args: Record<string, unknown>
): Promise<ToolResult> {
  try {
    const eventId = args.event_id as string
    if (!eventId) return { success: false, error: 'חסר מזהה אירוע' }

    const action = (args.action as string) || 'update'
    let itemId = args.item_id as string | undefined
    const itemTitle = args.item_title as string | undefined

    // Find item by title if no ID provided
    if (!itemId && itemTitle) {
      const { data: items, error: searchError } = await supabase
        .from('schedules')
        .select('id, title')
        .eq('event_id', eventId)
        .ilike('title', `%${itemTitle}%`)
        .limit(1)

      if (searchError || !items || items.length === 0) {
        return { success: false, error: `לא נמצא פריט לו"ז עם הכותרת "${itemTitle}"` }
      }

      itemId = items[0].id
    }

    if (!itemId) {
      return { success: false, error: 'חסר מזהה או כותרת של פריט הלו"ז' }
    }

    // Delete action
    if (action === 'delete') {
      const { data: deletedItem } = await supabase
        .from('schedules')
        .select('title')
        .eq('id', itemId)
        .eq('event_id', eventId)
        .single()

      const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('id', itemId)
        .eq('event_id', eventId)

      if (error) {
        console.error('delete schedule item error:', error)
        return { success: false, error: `שגיאה במחיקת פריט: ${error.message}` }
      }

      return {
        success: true,
        data: {
          action: 'deleted',
          title: deletedItem?.title,
          message: `הפריט "${deletedItem?.title || itemId}" נמחק מהלו"ז בהצלחה`,
        },
      }
    }

    // Helper: ensure timezone is included (default to Israel +02:00 if missing)
    const ensureTimezone = (timeStr: string): string => {
      if (!timeStr) return timeStr
      if (/[+-]\d{2}:\d{2}$/.test(timeStr) || timeStr.endsWith('Z')) return timeStr
      return timeStr + '+02:00'
    }

    // Update action
    const updateData: Record<string, unknown> = {}
    if (args.title) updateData.title = args.title
    if (args.description) updateData.description = args.description
    if (args.start_time) updateData.start_time = ensureTimezone(args.start_time as string)
    if (args.end_time) updateData.end_time = ensureTimezone(args.end_time as string)
    if (args.location) updateData.location = args.location
    if (args.speaker_name) updateData.speaker_name = args.speaker_name

    if (Object.keys(updateData).length === 0) {
      return { success: false, error: 'לא צוינו שדות לעדכון' }
    }

    const { data, error } = await supabase
      .from('schedules')
      .update(updateData)
      .eq('id', itemId)
      .eq('event_id', eventId)
      .select('id, title, start_time, end_time, location, speaker_name')
      .single()

    if (error) {
      console.error('update schedule item error:', error)
      return { success: false, error: `שגיאה בעדכון פריט: ${error.message}` }
    }

    return {
      success: true,
      data: {
        action: 'updated',
        item: data,
        updated_fields: Object.keys(updateData).join(', '),
        message: `הפריט "${data.title}" עודכן בהצלחה`,
      },
    }
  } catch (err) {
    console.error('update_schedule_item exception:', err)
    return { success: false, error: 'שגיאה פנימית בעדכון פריט לו"ז' }
  }
}

async function executeSuggestRoomAssignments(
  supabase: SupabaseClient,
  args: Record<string, unknown>
): Promise<ToolResult> {
  try {
    const eventId = args.event_id as string
    if (!eventId) {
      return { success: false, error: 'חסר מזהה אירוע' }
    }

    // 1. Fetch unassigned participants with their ticket tiers
    const { data: participants, error: pError } = await supabase
      .from('participants')
      .select('id, first_name, last_name, phone, is_vip, ticket_tier, requires_accessibility')
      .eq('event_id', eventId)
      .eq('status', 'confirmed')
      .is('participant_rooms.participant_id', null) // For rooms, use similar logic for tables
      .order('ticket_tier', { ascending: false }) // VIP > Premium > Regular (alphabetical hack or explicit mapping)

    if (pError) {
      console.error('fetch participants error:', pError)
      return { success: false, error: `שגיאה בטעינת משתתפים: ${pError.message}` }
    }

    if (!participants || participants.length === 0) {
      return {
        success: true,
        data: {
          message: 'כל המשתתפים כבר משויכים לחדרים',
          unassigned_count: 0,
        },
      }
    }

    // Fetch available rooms
    const { data: rooms, error: rError } = await supabase
      .from('rooms')
      .select('id, name, building, floor, room_type, bed_configuration, capacity')
      .eq('event_id', eventId)
      .eq('is_available', true)
      .order('room_type', { ascending: false }) // VIP rooms first
      .order('name', { ascending: true })

    if (rError) {
      console.error('fetch rooms error:', rError)
      return { success: false, error: `שגיאה בטעינת חדרים: ${rError.message}` }
    }

    if (!rooms || rooms.length === 0) {
      return { success: false, error: 'אין חדרים זמינים לאירוע זה' }
    }

    // Match participants to rooms
    const suggestions = []
    const usedRoomIds = new Set<string>()

    for (const participant of participants) {
      // Find suitable room
      let room = null

      // VIP participant → prefer VIP rooms
      if (participant.is_vip) {
        room = rooms.find(r => !usedRoomIds.has(r.id) && r.room_type === 'vip')
      }

      // Accessibility needs → prefer accessible rooms
      if (!room && participant.requires_accessibility) {
        room = rooms.find(r => !usedRoomIds.has(r.id) && r.room_type === 'accessible')
      }

      // Otherwise → any available room
      if (!room) {
        room = rooms.find(r => !usedRoomIds.has(r.id))
      }

      if (room) {
        suggestions.push({
          participant_id: participant.id,
          participant_name: `${participant.first_name} ${participant.last_name}`,
          is_vip: participant.is_vip,
          room_id: room.id,
          room_number: room.name,
          building: room.building,
          floor: room.floor,
          room_type: room.room_type,
        })
        usedRoomIds.add(room.id)
      } else {
        // No room available
        suggestions.push({
          participant_id: participant.id,
          participant_name: `${participant.first_name} ${participant.last_name}`,
          is_vip: participant.is_vip,
          status: 'no_room_available',
        })
      }
    }

    // Log to ai_insights_log for tracking
    const { error: logError } = await supabase
      .from('ai_insights_log')
      .insert({
        event_id: eventId,
        action_type: 'suggest_room_assignments',
        action_data: {
          suggestions,
          total_participants: participants.length,
          assigned_count: suggestions.filter(s => !s.status).length,
          unassigned_count: suggestions.filter(s => s.status === 'no_room_available').length,
        },
        execution_status: 'pending_approval',
      })

    if (logError) {
      console.error('ai_insights_log insert error:', logError)
    }

    return {
      success: true,
      data: {
        suggestions,
        summary: {
          total_participants: participants.length,
          assigned: suggestions.filter(s => !s.status).length,
          unassigned: suggestions.filter(s => s.status === 'no_room_available').length,
          available_rooms: rooms.length,
        },
        status: 'pending_approval',
        message: `הוצעו ${suggestions.filter(s => !s.status).length} שיוכי חדרים. יש לאשר את ההצעה כדי לבצע את השיוך.`,
      },
    }
  } catch (err) {
    console.error('suggest_room_assignments exception:', err)
    return { success: false, error: 'שגיאה פנימית בהצעת שיוך חדרים' }
  }
}

// ============================================================================
// Tool Dispatcher
// ============================================================================

async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  supabase: SupabaseClient,
  organizationId?: string,
  userId?: string
): Promise<ToolResult> {
  switch (toolName) {
    case 'search_events':
      return executeSearchEvents(supabase, args, organizationId)
    case 'search_vendors':
      return executeSearchVendors(supabase, args, organizationId)
    case 'get_event_details':
      return executeGetEventDetails(supabase, args)
    case 'suggest_schedule':
      return executeSuggestSchedule(supabase, args, organizationId)
    case 'create_event_draft':
      return executeCreateEventDraft(supabase, args, organizationId, userId)
    case 'add_checklist_items':
      return executeAddChecklistItems(supabase, args)
    case 'assign_vendors':
      return executeAssignVendors(supabase, args)
    case 'add_participants':
      return executeAddParticipants(supabase, args)
    case 'list_participants':
      return executeListParticipants(supabase, args)
    case 'update_event':
      return executeUpdateEvent(supabase, args)
    case 'complete_checklist_item':
      return executeCompleteChecklistItem(supabase, args)
    case 'send_whatsapp_to_participants':
      return executeSendWhatsAppToParticipants(supabase, args)
    case 'add_schedule_items':
      return executeAddScheduleItems(supabase, args)
    case 'update_schedule_item':
      return executeUpdateScheduleItem(supabase, args)
    case 'suggest_room_assignments':
      return executeSuggestRoomAssignments(supabase, args)
    default:
      return { success: false, error: `כלי לא מוכר: ${toolName}` }
  }
}

// ============================================================================
// Gemini API Key Resolution
// ============================================================================

async function getGeminiApiKey(): Promise<string | null> {
  // Priority 1: GEMINI_API_KEY environment variable (simplest)
  const envKey = Deno.env.get('GEMINI_API_KEY')
  if (envKey) return envKey

  // Priority 2: Credentials in database (base64 or AES-GCM encrypted)
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: credentials, error } = await supabase
      .from('api_credentials')
      .select('credentials_encrypted')
      .eq('service', 'gemini')
      .eq('is_active', true)
      .maybeSingle()

    if (error || !credentials?.credentials_encrypted) return null

    const encrypted = credentials.credentials_encrypted

    // Try base64-encoded JSON first (no encryption key needed)
    try {
      const decoded = JSON.parse(atob(encrypted))
      if (decoded.api_key) return decoded.api_key
    } catch {
      // Not simple base64, try AES-GCM below
    }

    // Try AES-GCM decryption (requires ENCRYPTION_KEY env var)
    const encryptionKey = Deno.env.get('ENCRYPTION_KEY')
    if (!encryptionKey || encryptionKey.length < 16) return null

    // AES-GCM format: iv_base64:ciphertext_base64
    const [ivBase64, ciphertextBase64] = encrypted.split(':')
    if (!ivBase64 || !ciphertextBase64) return null

    const encoder = new TextEncoder()
    const decoder = new TextDecoder()

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(encryptionKey.padEnd(32, '0').slice(0, 32)),
      'AES-GCM',
      false,
      ['decrypt']
    )

    const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0))
    const ciphertext = Uint8Array.from(atob(ciphertextBase64), c => c.charCodeAt(0))

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      keyMaterial,
      ciphertext
    )

    const parsed = JSON.parse(decoder.decode(decrypted))
    return parsed.api_key || null
  } catch (err) {
    console.error('Failed to get Gemini API key from DB:', err)
    return null
  }
}

// ============================================================================
// Gemini API Call with Tool Support
async function callGemini(
  apiKey: string,
  messages: GeminiMessage[],
  systemInstruction: string,
  tools: typeof TOOL_DECLARATIONS = TOOL_DECLARATIONS
): Promise<{ parts: GeminiPart[]; usageMetadata?: { totalTokenCount?: number } }> {
  const requestBody: Record<string, unknown> = {
    contents: messages,
    tools: [{ functionDeclarations: tools }],
    toolConfig: {
      functionCallingConfig: {
        mode: 'AUTO',
      },
    },
    generationConfig: {
      temperature: 0.8,
      maxOutputTokens: 4000,
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
    ],
  }

  // Add system instruction if provided (much stronger than embedding in user message)
  if (systemInstruction) {
    requestBody.system_instruction = {
      parts: [{ text: systemInstruction }],
    }
  }

  const response = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(requestBody),
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`Gemini API error ${response.status}:`, errorText)
    throw new Error(`Gemini API returned HTTP ${response.status}: ${errorText}`)
  }

  const result = await response.json()

  if (!result.candidates?.[0]?.content?.parts) {
    console.error('Gemini returned no valid candidates:', JSON.stringify(result))
    throw new Error('Gemini did not return a valid response')
  }

  return {
    parts: result.candidates[0].content.parts,
    usageMetadata: result.usageMetadata,
  }
}

// ============================================================================
// Extract Actions from Tool Results
// ============================================================================

function extractActions(toolCallLog: Array<{ name: string; args: Record<string, unknown>; result: ToolResult }>): ActionItem[] {
  const actions: ActionItem[] = []

  for (const call of toolCallLog) {
    switch (call.name) {
      case 'create_event_draft': {
        if (call.result.success) {
          const eventData = (call.result.data as { event: { id: string; name: string } })?.event
          actions.push({
            type: 'event_created',
            data: { event_id: eventData?.id, event_name: eventData?.name },
            status: 'completed',
            label: `האירוע "${eventData?.name}" נוצר`,
          })
        } else {
          actions.push({
            type: 'event_creation_failed',
            data: { error: call.result.error },
            status: 'failed',
            label: 'יצירת האירוע נכשלה',
          })
        }
        break
      }
      case 'add_checklist_items': {
        if (call.result.success) {
          const countData = (call.result.data as { count: number })?.count || 0
          actions.push({
            type: 'checklist_added',
            data: { count: countData, event_id: call.args.event_id },
            status: 'completed',
            label: `נוספו ${countData} פריטי צ'קליסט`,
          })
        }
        break
      }
      case 'assign_vendors': {
        if (call.result.success) {
          const assignData = call.result.data as { count: number }
          actions.push({
            type: 'vendors_assigned',
            data: { count: assignData?.count || 0, event_id: call.args.event_id },
            status: 'completed',
            label: `שויכו ${assignData?.count || 0} ספקים`,
          })
        }
        break
      }
      case 'search_events': {
        if (call.result.success) {
          const searchData = call.result.data as { count: number }
          if (searchData?.count > 0) {
            actions.push({
              type: 'events_found',
              data: { count: searchData.count },
              status: 'completed',
              label: `נמצאו ${searchData.count} אירועים דומים`,
            })
          }
        }
        break
      }
      case 'search_vendors': {
        if (call.result.success) {
          const vendorData = call.result.data as { count: number; vendors: Array<{ id: string; name: string }> }
          if (vendorData?.count > 0) {
            actions.push({
              type: 'vendors_found',
              data: {
                count: vendorData.count,
                vendor_ids: vendorData.vendors?.map(
                  (v: { id: string }) => v.id
                ),
              },
              status: 'suggested',
              label: `נמצאו ${vendorData.count} ספקים רלוונטיים`,
            })
          }
        }
        break
      }
      case 'suggest_schedule': {
        if (call.result.success) {
          actions.push({
            type: 'schedule_suggested',
            data: call.result.data as Record<string, unknown>,
            status: 'suggested',
            label: 'הוצע לוח זמנים',
          })
        }
        break
      }
      case 'add_participants': {
        if (call.result.success) {
          const pData = call.result.data as { count: number }
          actions.push({
            type: 'participants_added',
            data: { count: pData?.count || 0, event_id: call.args.event_id },
            status: 'completed',
            label: `נוספו ${pData?.count || 0} משתתפים`,
          })
        }
        break
      }
      case 'list_participants': {
        if (call.result.success) {
          const lpData = call.result.data as { total: number; status_summary: string }
          actions.push({
            type: 'participants_listed',
            data: { total: lpData?.total || 0 },
            status: 'completed',
            label: `${lpData?.total || 0} משתתפים (${lpData?.status_summary || ''})`,
          })
        }
        break
      }
      case 'update_event': {
        if (call.result.success) {
          const ueData = call.result.data as { event: { name: string }; updated_fields: string }
          actions.push({
            type: 'event_updated',
            data: { event_name: ueData?.event?.name, updated_fields: ueData?.updated_fields },
            status: 'completed',
            label: `האירוע "${ueData?.event?.name}" עודכן`,
          })
        }
        break
      }
      case 'complete_checklist_item': {
        if (call.result.success) {
          const ccData = call.result.data as { item: { title: string } }
          actions.push({
            type: 'checklist_completed',
            data: { title: ccData?.item?.title },
            status: 'completed',
            label: `"${ccData?.item?.title}" - הושלם`,
          })
        }
        break
      }
      case 'send_whatsapp_to_participants': {
        if (call.result.success) {
          const swData = call.result.data as { queued: number; filter: string }
          actions.push({
            type: 'whatsapp_sent',
            data: { queued: swData?.queued || 0, filter: swData?.filter },
            status: 'completed',
            label: `${swData?.queued || 0} הודעות WhatsApp נשלחו`,
          })
        }
        break
      }
      case 'add_schedule_items': {
        if (call.result.success) {
          const siData = call.result.data as { count: number; event_name: string }
          actions.push({
            type: 'schedule_items_added',
            data: { count: siData?.count || 0, event_id: call.args.event_id },
            status: 'completed',
            label: `נוספו ${siData?.count || 0} פריטי לו"ז`,
          })
        }
        break
      }
      case 'update_schedule_item': {
        if (call.result.success) {
          const usData = call.result.data as { action: string; title?: string; item?: { title: string } }
          const itemTitle = usData?.item?.title || usData?.title || ''
          const actionLabel = usData?.action === 'deleted' ? 'נמחק' : 'עודכן'
          actions.push({
            type: 'schedule_item_updated',
            data: { action: usData?.action, title: itemTitle },
            status: 'completed',
            label: `"${itemTitle}" - ${actionLabel}`,
          })
        }
        break
      }
    }
  }

  return actions
}

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Parse request body
    let body: FrontendChatRequest
    try {
      body = await req.json()
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError)
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    console.log('ai-chat request:', JSON.stringify({ message: body.message?.substring(0, 50), page: body.page, hasContext: !!body.context, hasHistory: !!body.history }))
    // SECURITY: organizationId is intentionally NOT destructured from body here.
    // It is derived server-side from the authenticated user's profile after JWT verification.
    const { message, context, history, page, eventId, eventName } = body

    if (!message || !message.trim()) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ========================================================================
    // AUTHENTICATION — require a valid JWT; derive userId from token, not body
    // ========================================================================
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client with service role key for database access
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const userToken = authHeader.replace('Bearer ', '')
    const { data: { user: authedUser }, error: authError } = await supabase.auth.getUser(userToken)
    if (authError || !authedUser) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    // SECURITY: always use the server-verified user ID, never trust the client-supplied one
    const userId = authedUser.id

    // SECURITY: derive organizationId from the verified user profile, never from the request body
    const { data: callerProfile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', userId)
      .single()
    const organizationId: string | null = callerProfile?.organization_id ?? null

    // Get Gemini API key
    const geminiApiKey = await getGeminiApiKey()
    if (!geminiApiKey) {
      console.error('No Gemini API key available (checked GEMINI_API_KEY env and api_credentials table)')
      return new Response(
        JSON.stringify({ error: 'AI service not configured. Set GEMINI_API_KEY in Supabase Edge Function secrets.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ========================================================================
    // TIER CHECK - AI Chat is a Premium feature for unlimited use
    // Base tier gets limited AI messages per month
    // ========================================================================
    let userTier: 'base' | 'premium' | 'legacy_premium' = 'base'
    {
      const quotaResult = await checkQuota(supabase, userId, 'ai_messages')

      if (!quotaResult.allowed) {
        console.log(`AI chat quota exceeded for user ${userId}, tier: ${quotaResult.tier}`)
        return createQuotaExceededResponse('ai_messages', quotaResult)
      }

      userTier = quotaResult.tier
      console.log(`AI chat allowed for user ${userId}, tier: ${quotaResult.tier}, remaining: ${quotaResult.remaining ?? 'unlimited'}`)
    }
    // ========================================================================

    // Build system instruction (separate from messages - Gemini processes this as true system prompt)
    let systemInstruction = SYSTEM_PROMPT

    // Add tier-specific instructions
    if (userTier === 'base') {
      systemInstruction += `\n\n--- מגבלות התוכנית (Base Tier) ---\n`
      systemInstruction += `הנך על גרסת ה-Basic של EventFlow AI. יש לך גישה מוגבלת לתכונות מסוימות:\n\n`
      systemInstruction += `**תכונות Premium שאינן זמינות:**\n`
      systemInstruction += `- סימולציית יום האירוע (Day Simulation)\n`
      systemInstruction += `- מנוע הנטוורקינג (Networking Engine)\n`
      systemInstruction += `- התראות תקציב (Budget Alerts)\n`
      systemInstruction += `- ניתוח ספקים (Vendor Analysis)\n\n`
      systemInstruction += `**הנחיות חשובות:**\n`
      systemInstruction += `- אל תציעי פתרונות הקשורים לתכונות Premium הללו\n`
      systemInstruction += `- אם המשתמש מבקש תכונת Premium, תודיעי לו בנימוס שזו תכונת Premium\n`
      systemInstruction += `- הציעי לו לשדרג ל-Premium אם הוא מעוניין\n\n`
    } else if (userTier === 'premium' || userTier === 'legacy_premium') {
      systemInstruction += `\n\n--- מצב Premium ---\n`
      systemInstruction += `הנך על גרסת ה-Premium של EventFlow AI. יש לך גישה מלאה לכל התכונות, כולל:\n`
      systemInstruction += `- סימולציית יום האירוע\n`
      systemInstruction += `- מנוע הנטוורקינג\n`
      systemInstruction += `- התראות תקציב\n`
      systemInstruction += `- ניתוח ספקים\n\n`
    }

    if (context) {
      systemInstruction += `\n\n--- הקשר נוכחי ---\n${context}`
    }
    if (eventId) {
      systemInstruction += `\n\n--- אירוע נוכחי ---\nמזהה אירוע: ${eventId}`
      if (eventName) systemInstruction += `\nשם האירוע: ${eventName}`
      systemInstruction += `\n\n**חשוב מאוד:** המשתמש כרגע עובד על האירוע הזה. כשהוא מבקש לבצע פעולות (הוספת משתתפים, עדכון, שליחת הודעות, סימון משימות, צ'קליסט וכו'), השתמשי במזהה האירוע הזה (${eventId}) אוטומטית - אל תשאלי אותו מהו מזהה האירוע.`
    }

    // Build messages - start clean, system prompt is in system_instruction
    const messages: GeminiMessage[] = []

    // Add conversation history if provided
    if (history && history.trim()) {
      // Try JSON format first (new format - preserves multi-line content)
      try {
        const parsed = JSON.parse(history)
        if (Array.isArray(parsed)) {
          for (const msg of parsed) {
            if (msg.content && msg.content.trim()) {
              const role: 'user' | 'model' = msg.role === 'user' ? 'user' : 'model'
              messages.push({ role, parts: [{ text: msg.content }] })
            }
          }
        }
      } catch {
        // Fallback: old line-by-line format (backwards compatibility)
        const historyLines = history.split('\n')
        for (const line of historyLines) {
          if (line.startsWith('משתמש:')) {
            messages.push({ role: 'user', parts: [{ text: line.replace('משתמש:', '').trim() }] })
          } else if (line.startsWith('עוזר:')) {
            messages.push({ role: 'model', parts: [{ text: line.replace('עוזר:', '').trim() }] })
          }
        }
      }
    }

    // Add current message
    messages.push({ role: 'user', parts: [{ text: message }] })

    // ====================================================================
    // Filter tools based on tier (Base tier can't access Premium features)
    // ====================================================================

    const PREMIUM_ONLY_TOOLS = new Set([
      'suggest_room_assignments',  // Networking Engine - Premium only
    ])

    let availableTools = TOOL_DECLARATIONS
    if (userTier === 'base') {
      // Filter out Premium-only tools
      availableTools = TOOL_DECLARATIONS.filter(tool => !PREMIUM_ONLY_TOOLS.has(tool.name))
      console.log(`Base tier: filtered ${TOOL_DECLARATIONS.length} tools to ${availableTools.length} (removed ${TOOL_DECLARATIONS.length - availableTools.length} Premium tools)`)
    } else {
      console.log(`Premium tier: all ${TOOL_DECLARATIONS.length} tools available`)
    }

    // ====================================================================
    // Tool Call Loop (max 3 iterations to prevent infinite loops)
    // ====================================================================

    const MAX_TOOL_ITERATIONS = 3
    let totalTokens = 0
    const toolCallLog: Array<{ name: string; args: Record<string, unknown>; result: ToolResult }> = []
    let finalTextResponse = ''

    console.log('Starting Gemini call loop. Messages count:', messages.length, 'System instruction length:', systemInstruction.length)

    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS + 1; iteration++) {
      console.log(`Tool call iteration ${iteration}/${MAX_TOOL_ITERATIONS}`)
      const geminiResult = await callGemini(geminiApiKey, messages, systemInstruction, availableTools)

      if (geminiResult.usageMetadata?.totalTokenCount) {
        totalTokens += geminiResult.usageMetadata.totalTokenCount
      }

      const parts = geminiResult.parts

      // Check if the response contains function calls
      const functionCalls = parts.filter(
        (p: GeminiPart) => p.functionCall !== undefined
      )

      if (functionCalls.length === 0) {
        // No function calls - extract text response and we're done
        const textParts = parts
          .filter((p: GeminiPart) => p.text !== undefined)
          .map((p: GeminiPart) => p.text)

        finalTextResponse = textParts.join('\n')
        break
      }

      // Safety check: don't exceed max iterations for tool calls
      if (iteration >= MAX_TOOL_ITERATIONS) {
        console.warn(`Reached max tool call iterations (${MAX_TOOL_ITERATIONS}). Forcing text response.`)
        // Add the model's function call to messages, execute tools, but then
        // ask Gemini to respond with text only by adding an instruction
        const modelParts = parts.map((p: GeminiPart) => {
          if (p.functionCall) {
            return { functionCall: p.functionCall }
          }
          return p
        })
        messages.push({ role: 'model', parts: modelParts })

        // Execute remaining tool calls
        for (const fc of functionCalls) {
          const call = fc.functionCall!
          const result = await executeTool(
            call.name,
            call.args as Record<string, unknown>,
            supabase,
            organizationId,
            userId
          )
          toolCallLog.push({
            name: call.name,
            args: call.args as Record<string, unknown>,
            result,
          })
          messages.push({
            role: 'user',
            parts: [{
              functionResponse: {
                name: call.name,
                response: {
                  content: result.success ? result.data : { error: result.error },
                },
              },
            }],
          })
        }

        // Force a final text-only call
        messages.push({
          role: 'user',
          parts: [{ text: 'אנא סכם את כל המידע שאספת ותן תשובה מלאה בעברית.' }],
        })

        const finalResult = await callGemini(geminiApiKey, messages, systemInstruction)
        if (finalResult.usageMetadata?.totalTokenCount) {
          totalTokens += finalResult.usageMetadata.totalTokenCount
        }
        const finalTextParts = finalResult.parts
          .filter((p: GeminiPart) => p.text !== undefined)
          .map((p: GeminiPart) => p.text)
        finalTextResponse = finalTextParts.join('\n')
        break
      }

      // Process function calls: add model response, execute tools, add results
      const modelParts = parts.map((p: GeminiPart) => {
        if (p.functionCall) {
          return { functionCall: p.functionCall }
        }
        return p
      })
      messages.push({ role: 'model', parts: modelParts })

      // Execute each function call and collect responses
      const functionResponseParts: GeminiPart[] = []

      for (const fc of functionCalls) {
        const call = fc.functionCall!
        console.log(`Executing tool: ${call.name}`, JSON.stringify(call.args))

        const result = await executeTool(
          call.name,
          call.args as Record<string, unknown>,
          supabase,
          organizationId,
          userId
        )

        toolCallLog.push({
          name: call.name,
          args: call.args as Record<string, unknown>,
          result,
        })

        functionResponseParts.push({
          functionResponse: {
            name: call.name,
            response: {
              content: result.success ? result.data : { error: result.error },
            },
          },
        })

        console.log(`Tool ${call.name} result: success=${result.success}`)
      }

      // Add all function responses as a single user message
      messages.push({ role: 'user', parts: functionResponseParts })

      // Continue the loop - Gemini will process tool results and may call more tools
    }

    // Fallback if no text was collected
    if (!finalTextResponse) {
      finalTextResponse = 'מצטערת, לא הצלחתי לעבד את הבקשה. אנא נסה שוב.'
    }

    // Extract structured actions from tool calls
    const actions = extractActions(toolCallLog)

    // Build suggestions based on page context and what happened
    const suggestions: string[] = []

    // If we created an event, suggest next steps
    const createdEvent = toolCallLog.find(
      (tc) => tc.name === 'create_event_draft' && tc.result.success
    )
    const addedSchedule = toolCallLog.find(
      (tc) => tc.name === 'add_schedule_items' && tc.result.success
    )
    if (addedSchedule) {
      suggestions.push('הוסף עוד פריטים ללו"ז')
      suggestions.push('הצג את הלו"ז המלא')
      suggestions.push('הוסף משתתפים לאירוע')
    } else if (createdEvent) {
      suggestions.push('הוסף צ\'קליסט לאירוע')
      suggestions.push('חפש ספקים מתאימים')
      suggestions.push('הוסף לו"ז לאירוע')
    } else if (page === 'events' || page === 'dashboard') {
      suggestions.push('חפש אירועים קודמים')
      suggestions.push('צור אירוע חדש')
      suggestions.push('מה הצעדים הראשונים לתכנון אירוע?')
    } else if (page === 'guests') {
      suggestions.push('איך לייבא רשימת אורחים מאקסל?')
      suggestions.push('כמה אורחים מומלץ להזמין?')
    } else if (page === 'vendors') {
      suggestions.push('חפש ספקי קייטרינג')
      suggestions.push('חפש צלמים מומלצים')
      suggestions.push('מה חשוב לבדוק אצל ספק?')
    } else if (page === 'schedule' || page === 'program' || page === 'timeline') {
      suggestions.push('הוסף פריטי לו"ז לאירוע')
      suggestions.push('הצע לוח זמנים לכנס')
      suggestions.push('הצע לוח זמנים ליום גיבוש')
    } else {
      suggestions.push('עזרי לי לתכנן אירוע חדש')
      suggestions.push('חפשי ספקים מומלצים')
      suggestions.push('הציעי לוח זמנים')
    }

    return new Response(
      JSON.stringify({
        success: true,
        response: finalTextResponse,
        message: finalTextResponse, // Alias for frontend compatibility
        actions,
        suggestions,
        tokens_used: totalTokens,
        tools_used: toolCallLog.map((tc) => ({
          tool: tc.name,
          success: tc.result.success,
        })),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in ai-chat function:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error('Error stack:', errorStack)
    // NOTE: errorStack is logged server-side only — never sent to client
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
