// supabase/functions/execute-ai-action/index.ts
// Edge Function for executing approved AI actions with full RLS enforcement
// Phase 6 Plan 3: Authenticated action executor for suggest -> confirm -> execute pattern

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ============================================================================
// CORS Configuration (reused from ai-chat)
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

interface ExecuteActionRequest {
  action_id: string
}

interface AIInsightsLog {
  id: string
  action_type: string
  action_data: Record<string, unknown>
  execution_status: string
  event_id?: string
  organization_id: string
}

interface ScheduleConflict {
  room_conflict?: boolean
  speaker_conflict?: boolean
  severity: 'error' | 'warning'
  message: string
}

// ============================================================================
// Conflict Re-check Functions
// ============================================================================

/**
 * Re-check for room conflicts before executing schedule_create or schedule_update
 * Uses database constraint check_speaker_conflicts function for speaker conflicts
 */
async function recheckConflicts(
  supabase: SupabaseClient,
  actionType: string,
  actionData: Record<string, unknown>,
  eventId?: string
): Promise<ScheduleConflict | null> {
  // Only check conflicts for schedule operations
  if (!actionType.startsWith('schedule_')) {
    return null
  }

  const { room_id, start_time, end_time, schedule_id } = actionData as {
    room_id?: string
    start_time?: string
    end_time?: string
    schedule_id?: string
  }

  // Need room, start_time, and end_time to check conflicts
  if (!room_id || !start_time || !end_time || !eventId) {
    return null
  }

  // Check for room conflicts using the database constraint logic
  // Query schedules table for overlapping time ranges in the same room
  let conflictQuery = supabase
    .from('schedules')
    .select('id, title, start_time, end_time, room_id')
    .eq('event_id', eventId)
    .eq('room_id', room_id)
    .neq('is_deleted', true)

  // If updating, exclude the schedule being updated
  if (actionType === 'schedule_update' && schedule_id) {
    conflictQuery = conflictQuery.neq('id', schedule_id)
  }

  const { data: existingSchedules, error: conflictError } = await conflictQuery

  if (conflictError) {
    console.error('Error checking conflicts:', conflictError)
    return {
      severity: 'error',
      message: 'שגיאה בבדיקת התנגשויות',
    }
  }

  // Check for time overlaps
  // Two time ranges overlap if: start1 < end2 AND start2 < end1
  const newStart = new Date(start_time)
  const newEnd = new Date(end_time)

  for (const schedule of existingSchedules || []) {
    const existingStart = new Date(schedule.start_time)
    const existingEnd = new Date(schedule.end_time)

    if (newStart < existingEnd && existingStart < newEnd) {
      // Room conflict found
      return {
        room_conflict: true,
        severity: 'error',
        message: `התנגשות בחדר: "${schedule.title}" משתמש באותו חדר בין ${existingStart.toLocaleTimeString('he-IL')} ל-${existingEnd.toLocaleTimeString('he-IL')}`,
      }
    }
  }

  // Speaker conflicts are handled by database trigger (check_speaker_conflicts)
  // We'll catch those errors during INSERT/UPDATE

  return null
}

// ============================================================================
// Action Execution Functions
// ============================================================================

/**
 * Execute schedule_create action
 * Creates a new schedule entry with user JWT (RLS enforced)
 */
async function executeScheduleCreate(
  userClient: SupabaseClient,
  actionData: Record<string, unknown>
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const { event_id, title, description, start_time, end_time, room_id, track_id, speaker_ids } = actionData

    if (!event_id || !title || !start_time || !end_time) {
      return { success: false, error: 'חסרים שדות חובה: event_id, title, start_time, end_time' }
    }

    const insertData: Record<string, unknown> = {
      event_id,
      title,
      start_time,
      end_time,
    }

    if (description) insertData.description = description
    if (room_id) insertData.room_id = room_id
    if (track_id) insertData.track_id = track_id

    // Insert schedule (RLS enforced via user JWT)
    const { data: schedule, error: insertError } = await userClient
      .from('schedules')
      .insert(insertData)
      .select('id, title, start_time, end_time')
      .single()

    if (insertError) {
      console.error('schedule_create error:', insertError)
      // Check if it's a constraint violation (room or speaker conflict)
      if (insertError.message?.includes('no_room_overlap') || insertError.code === '23P01') {
        return { success: false, error: 'התנגשות בחדר: אירוע אחר משתמש באותו חדר באותו זמן' }
      }
      if (insertError.message?.includes('speaker_conflict')) {
        return { success: false, error: 'התנגשות דובר: אחד הדוברים משוייך לאירוע אחר באותו זמן' }
      }
      return { success: false, error: `שגיאה ביצירת פריט לוח זמנים: ${insertError.message}` }
    }

    // If speaker_ids provided, assign speakers
    if (speaker_ids && Array.isArray(speaker_ids) && speaker_ids.length > 0) {
      const speakerAssignments = speaker_ids.map((speaker_id: string) => ({
        schedule_id: schedule.id,
        speaker_id,
      }))

      const { error: speakerError } = await userClient
        .from('schedule_speakers')
        .insert(speakerAssignments)

      if (speakerError) {
        console.error('speaker assignment error:', speakerError)
        // Speaker conflict - delete the schedule and return error
        await userClient.from('schedules').delete().eq('id', schedule.id)
        return { success: false, error: 'התנגשות דובר: אחד הדוברים משוייך לאירוע אחר באותו זמן' }
      }
    }

    return {
      success: true,
      data: {
        schedule,
        message: `פריט לוח זמנים "${title}" נוצר בהצלחה`,
      },
    }
  } catch (err) {
    console.error('executeScheduleCreate exception:', err)
    return { success: false, error: 'שגיאה פנימית ביצירת פריט לוח זמנים' }
  }
}

/**
 * Execute schedule_update action
 * Updates an existing schedule entry with user JWT (RLS enforced)
 */
async function executeScheduleUpdate(
  userClient: SupabaseClient,
  actionData: Record<string, unknown>
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const { schedule_id, title, description, start_time, end_time, room_id, track_id, speaker_ids } = actionData

    if (!schedule_id) {
      return { success: false, error: 'חסר schedule_id' }
    }

    const updateData: Record<string, unknown> = {}

    if (title) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (start_time) updateData.start_time = start_time
    if (end_time) updateData.end_time = end_time
    if (room_id !== undefined) updateData.room_id = room_id
    if (track_id !== undefined) updateData.track_id = track_id

    // Update schedule (RLS enforced via user JWT)
    const { data: schedule, error: updateError } = await userClient
      .from('schedules')
      .update(updateData)
      .eq('id', schedule_id)
      .select('id, title, start_time, end_time')
      .single()

    if (updateError) {
      console.error('schedule_update error:', updateError)
      // Check if it's a constraint violation
      if (updateError.message?.includes('no_room_overlap') || updateError.code === '23P01') {
        return { success: false, error: 'התנגשות בחדר: אירוע אחר משתמש באותו חדר באותו זמן' }
      }
      if (updateError.message?.includes('speaker_conflict')) {
        return { success: false, error: 'התנגשות דובר: אחד הדוברים משוייך לאירוע אחר באותו זמן' }
      }
      return { success: false, error: `שגיאה בעדכון פריט לוח זמנים: ${updateError.message}` }
    }

    // If speaker_ids provided, update speaker assignments
    if (speaker_ids && Array.isArray(speaker_ids)) {
      // Delete existing assignments
      await userClient.from('schedule_speakers').delete().eq('schedule_id', schedule_id)

      // Insert new assignments if any
      if (speaker_ids.length > 0) {
        const speakerAssignments = speaker_ids.map((speaker_id: string) => ({
          schedule_id,
          speaker_id,
        }))

        const { error: speakerError } = await userClient
          .from('schedule_speakers')
          .insert(speakerAssignments)

        if (speakerError) {
          console.error('speaker assignment error:', speakerError)
          return { success: false, error: 'התנגשות דובר: אחד הדוברים משוייך לאירוע אחר באותו זמן' }
        }
      }
    }

    return {
      success: true,
      data: {
        schedule,
        message: `פריט לוח זמנים עודכן בהצלחה`,
      },
    }
  } catch (err) {
    console.error('executeScheduleUpdate exception:', err)
    return { success: false, error: 'שגיאה פנימית בעדכון פריט לוח זמנים' }
  }
}

/**
 * Execute schedule_delete action
 * Soft-deletes a schedule entry with user JWT (RLS enforced)
 */
async function executeScheduleDelete(
  userClient: SupabaseClient,
  actionData: Record<string, unknown>
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const { schedule_id } = actionData

    if (!schedule_id) {
      return { success: false, error: 'חסר schedule_id' }
    }

    // Soft delete (set is_deleted = true)
    const { data: schedule, error: deleteError } = await userClient
      .from('schedules')
      .update({ is_deleted: true })
      .eq('id', schedule_id)
      .select('id, title')
      .single()

    if (deleteError) {
      console.error('schedule_delete error:', deleteError)
      return { success: false, error: `שגיאה במחיקת פריט לוח זמנים: ${deleteError.message}` }
    }

    return {
      success: true,
      data: {
        schedule,
        message: `פריט לוח זמנים "${schedule.title}" נמחק בהצלחה`,
      },
    }
  } catch (err) {
    console.error('executeScheduleDelete exception:', err)
    return { success: false, error: 'שגיאה פנימית במחיקת פריט לוח זמנים' }
  }
}

// ============================================================================
// Action Dispatcher
// ============================================================================

async function executeAction(
  userClient: SupabaseClient,
  actionType: string,
  actionData: Record<string, unknown>
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  switch (actionType) {
    case 'schedule_create':
      return executeScheduleCreate(userClient, actionData)
    case 'schedule_update':
      return executeScheduleUpdate(userClient, actionData)
    case 'schedule_delete':
      return executeScheduleDelete(userClient, actionData)
    default:
      return { success: false, error: `סוג פעולה לא נתמך: ${actionType}` }
  }
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
    // ========================================================================
    // AUTHENTICATION - Extract user JWT from Authorization header
    // ========================================================================
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'חסר אימות: נדרש Authorization header עם Bearer token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userToken = authHeader.replace('Bearer ', '')

    // Create Supabase client with ANON KEY + user JWT for RLS enforcement
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

    // SECURITY BOUNDARY: This client uses user JWT - all operations go through RLS
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      },
    })

    // Create service role client ONLY for audit log updates
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey)

    // ========================================================================
    // REQUEST VALIDATION
    // ========================================================================
    let body: ExecuteActionRequest
    try {
      body = await req.json()
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError)
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { action_id } = body

    if (!action_id) {
      return new Response(
        JSON.stringify({ error: 'חסר action_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('execute-ai-action request:', { action_id })

    // ========================================================================
    // FETCH AND VALIDATE AUDIT ENTRY
    // ========================================================================
    // Use userClient to ensure RLS (user can only execute actions in their org)
    const { data: auditEntry, error: fetchError } = await userClient
      .from('ai_insights_log')
      .select('*')
      .eq('id', action_id)
      .single()

    if (fetchError || !auditEntry) {
      console.error('audit entry fetch error:', fetchError)
      return new Response(
        JSON.stringify({ error: 'הפעולה לא נמצאה או שאין לך הרשאה לגשת אליה' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify execution_status is 'approved'
    if (auditEntry.execution_status !== 'approved') {
      return new Response(
        JSON.stringify({
          error: 'הפעולה לא אושרה לביצוע',
          current_status: auditEntry.execution_status,
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const typedAudit = auditEntry as unknown as AIInsightsLog

    // ========================================================================
    // RE-CHECK CONFLICTS AT EXECUTION TIME
    // ========================================================================
    const conflict = await recheckConflicts(
      userClient,
      typedAudit.action_type,
      typedAudit.action_data,
      typedAudit.event_id
    )

    if (conflict && conflict.severity === 'error') {
      console.error('Conflict detected at execution time:', conflict)

      // Update audit log to 'failed' with conflict details
      await serviceClient
        .from('ai_insights_log')
        .update({
          execution_status: 'failed',
          result: {
            error: conflict.message,
            conflict_type: conflict.room_conflict ? 'room' : 'speaker',
            detected_at: 'execution_time',
          },
          executed_at: new Date().toISOString(),
        })
        .eq('id', action_id)

      return new Response(
        JSON.stringify({
          success: false,
          error: conflict.message,
          conflict: true,
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ========================================================================
    // EXECUTE ACTION
    // ========================================================================
    const executionResult = await executeAction(
      userClient, // Uses user JWT - RLS enforced
      typedAudit.action_type,
      typedAudit.action_data
    )

    // ========================================================================
    // UPDATE AUDIT LOG WITH EXECUTION RESULT
    // ========================================================================
    const newStatus = executionResult.success ? 'executed' : 'failed'

    // Use serviceClient ONLY for audit log update (not for schedule operations)
    await serviceClient
      .from('ai_insights_log')
      .update({
        execution_status: newStatus,
        result: executionResult.success ? executionResult.data : { error: executionResult.error },
        executed_at: new Date().toISOString(),
      })
      .eq('id', action_id)

    // ========================================================================
    // RESPONSE
    // ========================================================================
    const statusCode = executionResult.success ? 200 : 400

    return new Response(
      JSON.stringify({
        success: executionResult.success,
        data: executionResult.data,
        error: executionResult.error,
        action_type: typedAudit.action_type,
        execution_status: newStatus,
      }),
      { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in execute-ai-action function:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    console.error('Error stack:', error instanceof Error ? error.stack : undefined)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
