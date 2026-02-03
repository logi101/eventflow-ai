import type { SupabaseClient } from '@supabase/supabase-js'
import type { ContingencyActionType, ContingencyActionData } from '../types'

interface Participant {
  id: string
  first_name: string
  last_name: string
  phone_normalized: string | null
  is_vip: boolean
  organization_id: string
}

interface NotificationPayload {
  type: 'schedule_change'
  message: string
}

interface NotificationResult {
  sent: number
  failed: number
  details: Array<{
    participant_id: string
    success: boolean
    error?: string
  }>
}

/**
 * Sends WhatsApp notifications to affected participants immediately.
 * Uses Promise.allSettled for graceful failure handling.
 * Logs all attempts to messages table.
 */
export async function notifyParticipants(
  supabase: SupabaseClient,
  eventId: string,
  participants: Participant[],
  payload: NotificationPayload
): Promise<NotificationResult> {
  // Filter to participants with phone numbers
  const withPhone = participants.filter(p => p.phone_normalized)

  if (withPhone.length === 0) {
    return { sent: 0, failed: 0, details: [] }
  }

  // Sort VIPs first for priority sending
  const sorted = [...withPhone].sort((a, b) => {
    if (a.is_vip && !b.is_vip) return -1
    if (!a.is_vip && b.is_vip) return 1
    return 0
  })

  // Send notifications in parallel using Promise.allSettled
  const results = await Promise.allSettled(
    sorted.map(async (participant) => {
      try {
        // Personalize message for VIPs
        const personalizedMessage = participant.is_vip
          ? `${participant.first_name}, ${payload.message}`
          : payload.message

        // Call send-whatsapp Edge Function
        const { error } = await supabase.functions.invoke('send-whatsapp', {
          body: {
            organization_id: participant.organization_id,
            phone: participant.phone_normalized,
            message: personalizedMessage,
            participant_id: participant.id,
          },
        })

        if (error) throw error

        // Log successful send to messages table
        await logMessage(supabase, eventId, participant, personalizedMessage, 'sent')

        return { participant_id: participant.id, success: true }
      } catch (error) {
        // Log failed send to messages table
        await logMessage(
          supabase,
          eventId,
          participant,
          payload.message,
          'failed',
          error instanceof Error ? error.message : 'Unknown error'
        )

        return {
          participant_id: participant.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    })
  )

  // Aggregate results
  const details = results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value
    } else {
      return {
        participant_id: sorted[index].id,
        success: false,
        error: result.reason?.message || 'Promise rejected',
      }
    }
  })

  return {
    sent: details.filter(d => d.success).length,
    failed: details.filter(d => !d.success).length,
    details,
  }
}

/**
 * Generates notification message based on action type.
 */
export function generateChangeNotification(
  actionType: ContingencyActionType,
  actionData: ContingencyActionData
): string {
  switch (actionType) {
    case 'backup_speaker_activate':
      return `עדכון: הסשן "${actionData.schedule_title}" יועבר לדובר ${actionData.backup_speaker_name || 'חלופי'}. הזמן והמיקום נותרים זהים.`

    case 'room_change':
      return `עדכון: הסשן "${actionData.schedule_title}" הועבר לאולם ${actionData.new_room_name}.`

    case 'time_change': {
      // Format time for Hebrew display
      const newStart = actionData.new_start_time
        ? new Date(actionData.new_start_time).toLocaleTimeString('he-IL', {
            hour: '2-digit',
            minute: '2-digit',
          })
        : ''
      return `עדכון: הסשן "${actionData.schedule_title}" הועבר לשעה ${newStart}.`
    }

    case 'session_cancel':
      return `עדכון: הסשן "${actionData.schedule_title}" בוטל. אנו מתנצלים על אי הנוחות.`

    case 'schedule_adjust':
      return `עדכון: חל שינוי בסשן "${actionData.schedule_title}". אנא בדקו את הלו"ז המעודכן.`

    default:
      return `עדכון: חל שינוי בלו"ז האירוע. אנא בדקו את הלו"ז המעודכן.`
  }
}

/**
 * Logs notification attempt to messages table.
 */
async function logMessage(
  supabase: SupabaseClient,
  eventId: string,
  participant: Participant,
  content: string,
  status: 'sent' | 'failed',
  errorMessage?: string
): Promise<void> {
  try {
    await supabase.from('messages').insert({
      event_id: eventId,
      participant_id: participant.id,
      channel: 'whatsapp',
      to_phone: participant.phone_normalized,
      content,
      message_type: 'schedule_update',
      status,
      sent_at: status === 'sent' ? new Date().toISOString() : null,
      error_message: errorMessage,
    })
  } catch (error) {
    // Log but don't throw - message logging shouldn't fail the notification
    console.error('Failed to log message:', error)
  }
}
