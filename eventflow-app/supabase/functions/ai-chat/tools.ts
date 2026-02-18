// supabase/functions/ai-chat/tools.ts
// Tool implementations for EventFlow AI Chat
// Extracted from index.ts to reduce file size

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface ToolResult {
  success: boolean
  data?: unknown
  error?: string
}

export interface ActionItem {
  type: string
  data?: Record<string, unknown>
  status: 'completed' | 'suggested' | 'pending_approval' | 'failed'
  label?: string
}


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

    // Helper: Priority mapping for sorting
    const tierPriority: Record<string, number> = { 'vip': 3, 'premium': 2, 'regular': 1 }
    const sortedParticipants = (participants || []).sort((a, b) => 
      (tierPriority[b.ticket_tier] || 0) - (tierPriority[a.tier] || 0)
    )

    // 2. Assign to tables starting from table 1 (Stage proximity)
    const suggestions = []
    let currentTable = 1
    let currentSeat = 1
    const seatsPerTable = 8

    for (const participant of sortedParticipants) {
      suggestions.push({
        participant_id: participant.id,
        participant_name: `${participant.first_name} ${participant.last_name}`,
        ticket_tier: participant.ticket_tier,
        table_number: currentTable,
        seat_number: currentSeat,
        reason: participant.ticket_tier === 'vip' ? 'עדיפות VIP - קרוב לבמה' : 'שיבוץ לפי דרגת כרטיס'
      })

      currentSeat++
      if (currentSeat > seatsPerTable) {
        currentSeat = 1
        currentTable++
      }
    }

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

export async function executeTool(
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

export function extractActions(toolCallLog: Array<{ name: string; args: Record<string, unknown>; result: ToolResult }>): ActionItem[] {
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
