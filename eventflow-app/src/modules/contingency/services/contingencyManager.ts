import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  ContingencyActionData,
  ContingencyActionType,
  ContingencySuggestion,
  ContingencyExecutionResult,
  ImpactSummary,
  AuditEntry,
} from '../types'
import { notifyParticipants, generateChangeNotification } from './notificationService'

/**
 * Suggests a contingency action without executing it.
 * Follows Phase 6 suggest+confirm pattern.
 */
export async function suggestContingencyAction(
  supabase: SupabaseClient,
  eventId: string,
  actionType: ContingencyActionType,
  actionData: ContingencyActionData,
  reason: string,
  userId: string
): Promise<ContingencySuggestion> {
  // 1. Calculate impact BEFORE suggesting
  const impact = await calculateImpact(supabase, actionData)

  // 2. Generate Hebrew label for UI
  const label = generateActionLabel(actionType, actionData)

  // 3. Log suggestion to audit table
  const { data: auditLog, error } = await supabase
    .from('contingency_audit_log')
    .insert({
      event_id: eventId,
      action_type: actionType,
      action_data: actionData,
      execution_status: 'suggested',
      suggested_by: userId,
      suggested_at: new Date().toISOString(),
      reason,
      impact_summary: impact,
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(`Failed to log contingency suggestion: ${error.message}`)
  }

  // 4. Return as pending_approval action
  return {
    action_id: auditLog.id,
    type: actionType,
    status: 'pending_approval',
    data: actionData,
    impact,
    label,
    reason,
  }
}

/**
 * Executes an approved contingency action.
 * Updates schedule, logs execution, and triggers notifications.
 */
export async function executeContingencyAction(
  supabase: SupabaseClient,
  actionId: string,
  userId: string
): Promise<ContingencyExecutionResult> {
  // 1. Get action from audit log
  const { data: action, error: fetchError } = await supabase
    .from('contingency_audit_log')
    .select('*')
    .eq('id', actionId)
    .single()

  if (fetchError || !action) {
    return {
      success: false,
      action_id: actionId,
      execution_status: 'failed',
      error_message: 'Action not found',
    }
  }

  // 2. Verify action is in correct state
  if (action.execution_status !== 'suggested' && action.execution_status !== 'approved') {
    return {
      success: false,
      action_id: actionId,
      execution_status: action.execution_status,
      error_message: `Cannot execute action in status: ${action.execution_status}`,
    }
  }

  try {
    // 3. Execute database changes based on action type
    await executeActionByType(supabase, action.action_type, action.action_data)

    // 4. Get affected participants for notifications
    const participants = await getAffectedParticipants(
      supabase,
      action.action_data.schedule_id
    )

    // 5. Send notifications immediately
    const notificationResult = await notifyParticipants(
      supabase,
      action.event_id,
      participants,
      {
        type: 'schedule_change',
        message: generateChangeNotification(action.action_type, action.action_data),
      }
    )

    // 6. Update impact summary with actual notification counts
    const finalImpact: ImpactSummary = {
      affected_participants: participants.length,
      notifications_sent: notificationResult.sent,
      notifications_failed: notificationResult.failed,
      affected_sessions: [action.action_data.schedule_id],
      vip_affected: participants.filter(p => p.is_vip).length,
    }

    // 7. Update audit log to executed status
    // Note: We insert a new row since audit log is append-only
    // But for execution status, we need to use service_role to update
    const { error: updateError } = await supabase
      .from('contingency_audit_log')
      .update({
        execution_status: 'executed',
        executed_by: userId,
        executed_at: new Date().toISOString(),
        impact_summary: finalImpact,
      })
      .eq('id', actionId)

    // Note: If using strict append-only, insert a new row instead of update
    // For now, allowing status updates on same row for simplicity

    if (updateError) {
      console.error('Failed to update audit log:', updateError)
      // Continue anyway - action was executed
    }

    return {
      success: true,
      action_id: actionId,
      execution_status: 'executed',
      impact_summary: finalImpact,
    }
  } catch (error) {
    // Log failure to audit log
    await supabase
      .from('contingency_audit_log')
      .update({
        execution_status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('id', actionId)

    return {
      success: false,
      action_id: actionId,
      execution_status: 'failed',
      error_message: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Rejects a suggested contingency action.
 */
export async function rejectContingencyAction(
  supabase: SupabaseClient,
  actionId: string,
  userId: string,
  rejectionReason?: string
): Promise<ContingencyExecutionResult> {
  const { error } = await supabase
    .from('contingency_audit_log')
    .update({
      execution_status: 'rejected',
      rejected_by: userId,
      rejected_at: new Date().toISOString(),
      error_message: rejectionReason,
    })
    .eq('id', actionId)

  if (error) {
    return {
      success: false,
      action_id: actionId,
      execution_status: 'failed',
      error_message: `Failed to reject action: ${error.message}`,
    }
  }

  return {
    success: true,
    action_id: actionId,
    execution_status: 'rejected',
  }
}

/**
 * Gets contingency history for an event.
 */
export async function getContingencyHistory(
  supabase: SupabaseClient,
  eventId: string
): Promise<AuditEntry[]> {
  const { data, error } = await supabase
    .from('contingency_audit_log')
    .select('*')
    .eq('event_id', eventId)
    .order('suggested_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch contingency history:', error)
    return []
  }

  return data as AuditEntry[]
}

// ============================================================================
// Helper Functions
// ============================================================================

async function calculateImpact(
  supabase: SupabaseClient,
  actionData: ContingencyActionData
): Promise<ImpactSummary> {
  const participants = await getAffectedParticipants(supabase, actionData.schedule_id)

  return {
    affected_participants: participants.length,
    notifications_sent: 0, // Will be updated after execution
    affected_sessions: [actionData.schedule_id],
    vip_affected: participants.filter(p => p.is_vip).length,
  }
}

interface AffectedParticipant {
  id: string
  first_name: string
  last_name: string
  phone_normalized: string | null
  is_vip: boolean
  organization_id: string
}

async function getAffectedParticipants(
  supabase: SupabaseClient,
  scheduleId: string
): Promise<AffectedParticipant[]> {
  // Get participants enrolled in this session
  const { data, error } = await supabase
    .from('participant_schedules')
    .select(`
      participants!inner(
        id,
        first_name,
        last_name,
        phone_normalized,
        is_vip,
        organization_id
      )
    `)
    .eq('schedule_id', scheduleId)

  if (error || !data) {
    console.error('Failed to get affected participants:', error)
    return []
  }

  // The query returns an array where each item has a 'participants' property
  // which is an object (single join, not array)
  return data
    .map(d => {
      const p = d.participants as unknown as AffectedParticipant
      return p
    })
    .filter(p => p && p.id)
}

async function executeActionByType(
  supabase: SupabaseClient,
  actionType: string,
  actionData: ContingencyActionData
): Promise<void> {
  switch (actionType) {
    case 'backup_speaker_activate':
      await supabase
        .from('schedules')
        .update({
          speaker_id: actionData.backup_speaker_id,
          original_speaker_id: actionData.original_speaker_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', actionData.schedule_id)
      break

    case 'room_change':
      await supabase
        .from('schedules')
        .update({
          room_id: actionData.new_room_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', actionData.schedule_id)
      break

    case 'time_change':
      await supabase
        .from('schedules')
        .update({
          start_time: actionData.new_start_time,
          end_time: actionData.new_end_time,
          updated_at: new Date().toISOString(),
        })
        .eq('id', actionData.schedule_id)
      break

    case 'session_cancel':
      await supabase
        .from('schedules')
        .update({
          is_deleted: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', actionData.schedule_id)
      break

    default:
      throw new Error(`Unknown action type: ${actionType}`)
  }
}

function generateActionLabel(
  actionType: ContingencyActionType,
  actionData: ContingencyActionData
): string {
  switch (actionType) {
    case 'backup_speaker_activate':
      return `החלפת דובר לסשן "${actionData.schedule_title}"`
    case 'room_change':
      return `העברת "${actionData.schedule_title}" לאולם ${actionData.new_room_name}`
    case 'time_change':
      return `שינוי שעות לסשן "${actionData.schedule_title}"`
    case 'session_cancel':
      return `ביטול סשן "${actionData.schedule_title}"`
    default:
      return `פעולה על "${actionData.schedule_title}"`
  }
}
