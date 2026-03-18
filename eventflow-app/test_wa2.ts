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


serve(async (req) => { return new Response(JSON.stringify({ reply: "whatsapp-only ok" }), { status: 200, headers: { "Content-Type": "application/json" } }) })
