// supabase/functions/ai-chat/index.ts
// Edge Function for AI chat (Gemini) with Function Calling - EventFlow event planning assistant
// v7: Full rewrite - Gemini Function Calling with database tools for search, create, and manage events

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

## איך להשתמש בכלים - חשוב מאוד!
- **תמיד השתמשי בכלים באופן יזום** - אל תשאלי אם להשתמש, פשוט השתמשי. אם המשתמש מזכיר אירוע, חפשי מיד (search_events). אם מזכיר ספק, חפשי מיד (search_vendors).
- אם המשתמש מבקש ליצור אירוע, חפשי קודם אירועים דומים בעבר (search_events) כדי ללמוד מהניסיון.
- חפשי ספקים רלוונטיים (search_vendors) והציעי אותם.
- כשיש מספיק מידע (שם, תאריך, סוג), הציעי ליצור את האירוע (create_event_draft).
- כשהמשתמש מאשר, הוסיפי צ'קליסט (add_checklist_items) ושייכי ספקים (assign_vendors).
- **כלל חובה**: כשהמשתמש מבקש לחפש משהו, חפשי מיד בלי לשאול שאלות נוספות. הפעילי את הכלי ותני תשובה עם התוצאות.
- גם אם אין תוצאות, הפעילי את הכלי והגיבי בהתאם (למשל: "חיפשתי במערכת ולא מצאתי אירועים דומים, אז נתחיל מאפס!").

## איך לנהל שיחה
1. **שאלי שאלות חכמות** - אל תחכי שהמשתמש יספר הכל. שאלי באופן יזום:
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

## זיהוי פרטי אירוע
כאשר המשתמש מתאר אירוע, זהי:
- סוג האירוע (כנס, גיבוש, חתונה, יום עיון, אירוע חברה, השקה, בר/בת מצווה, סדנה)
- תאריך ומיקום
- מספר משתתפים משוער
- תקציב (אם הוזכר)
- דרישות מיוחדות
- קהל יעד ומטרות`

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
// ============================================================================

async function callGemini(
  apiKey: string,
  messages: GeminiMessage[],
  systemInstruction?: string
): Promise<{ parts: GeminiPart[]; usageMetadata?: { totalTokenCount?: number } }> {
  const requestBody: Record<string, unknown> = {
    contents: messages,
    tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
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
    const { message, context, history, page, eventId, eventName, organizationId, userId } = body

    if (!message || !message.trim()) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Gemini API key
    const geminiApiKey = await getGeminiApiKey()
    if (!geminiApiKey) {
      console.error('No Gemini API key available (checked GEMINI_API_KEY env and api_credentials table)')
      return new Response(
        JSON.stringify({ error: 'AI service not configured. Set GEMINI_API_KEY in Supabase Edge Function secrets.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client with service role key for database access
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Build system instruction (separate from messages - Gemini processes this as true system prompt)
    let systemInstruction = SYSTEM_PROMPT
    if (context) {
      systemInstruction += `\n\n--- הקשר נוכחי ---\n${context}`
    }
    if (eventId) {
      systemInstruction += `\n\n--- אירוע נוכחי ---\nמזהה אירוע: ${eventId}`
      if (eventName) systemInstruction += `\nשם האירוע: ${eventName}`
    }

    // Build messages - start clean, system prompt is in system_instruction
    const messages: GeminiMessage[] = []

    // Add conversation history if provided
    if (history && history.trim()) {
      const historyLines = history.split('\n')
      for (const line of historyLines) {
        if (line.startsWith('משתמש:')) {
          messages.push({ role: 'user', parts: [{ text: line.replace('משתמש:', '').trim() }] })
        } else if (line.startsWith('עוזר:')) {
          messages.push({ role: 'model', parts: [{ text: line.replace('עוזר:', '').trim() }] })
        }
      }
    }

    // Add current message
    messages.push({ role: 'user', parts: [{ text: message }] })

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
      const geminiResult = await callGemini(geminiApiKey, messages, systemInstruction)

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
    if (createdEvent) {
      suggestions.push('הוסף צ\'קליסט לאירוע')
      suggestions.push('חפש ספקים מתאימים')
      suggestions.push('הצע לוח זמנים')
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
    } else if (page === 'schedule') {
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
    return new Response(
      JSON.stringify({ error: errorMessage, details: errorStack }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
