// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - Schedule-to-Message Sync Logic
// ═══════════════════════════════════════════════════════════════════════════

import { supabase } from '../lib/supabase'
import type { MessageImpact } from '../types/gracePeriod'

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

interface ScheduleData {
  id?: string
  title: string
  start_time: string
  end_time: string
  location?: string | null
  room?: string | null
  send_reminder: boolean
  reminder_minutes_before: number
}

interface MessageToCreate {
  event_id: string
  participant_id: string
  schedule_id: string | null
  channel: 'whatsapp'
  to_phone: string
  content: string
  status: 'scheduled'
  direction: 'outgoing'
  subject: string | null
  message_type: 'reminder'
  scheduled_for: string | null
}

interface MessageToUpdate {
  id: string
  content: string
  scheduled_for?: string | null
}

interface MessageToDelete {
  id: string
}

export interface MessageSyncPlan {
  messagesToCreate: MessageToCreate[]
  messagesToUpdate: MessageToUpdate[]
  messagesToDelete: MessageToDelete[]
  impact: MessageImpact
}

// ────────────────────────────────────────────────────────────────────────────
// Content Generation
// ────────────────────────────────────────────────────────────────────────────

function computeScheduledFor(startTime: string, reminderMinutesBefore: number): string {
  const dt = new Date(startTime)
  dt.setMinutes(dt.getMinutes() - reminderMinutesBefore)
  return dt.toISOString()
}

function generateReminderContent(
  participantName: string,
  scheduleTitle: string,
  startTime: string,
  location: string | null | undefined,
  room: string | null | undefined
): string {
  const time = new Date(startTime).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
  const date = new Date(startTime).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })
  let content = `שלום ${participantName}! תזכורת: "${scheduleTitle}" ב${date} בשעה ${time}`
  if (location) content += ` | ${location}`
  if (room) content += ` - ${room}`
  return content
}

// ────────────────────────────────────────────────────────────────────────────
// Compute Sync Plan
// ────────────────────────────────────────────────────────────────────────────

export async function computeScheduleMessageSync(
  eventId: string,
  changeType: 'create' | 'update' | 'delete' | 'delete_all',
  scheduleData?: ScheduleData
): Promise<MessageSyncPlan> {
  const plan: MessageSyncPlan = {
    messagesToCreate: [],
    messagesToUpdate: [],
    messagesToDelete: [],
    impact: {
      messagesToCreate: 0,
      messagesToUpdate: 0,
      messagesToDelete: 0,
      affectedParticipants: 0
    }
  }

  // Fetch participants for this event
  const { data: participants } = await supabase
    .from('participants')
    .select('id, full_name, first_name, last_name, phone')
    .eq('event_id', eventId)

  if (!participants || participants.length === 0) return plan

  const participantCount = participants.length

  if (changeType === 'create' && scheduleData?.send_reminder) {
    // Create reminder messages for all participants
    for (const p of participants) {
      const name = p.full_name || `${p.first_name} ${p.last_name}`
      const phone = p.phone || ''
      if (!phone) continue

      plan.messagesToCreate.push({
        event_id: eventId,
        participant_id: p.id,
        schedule_id: scheduleData.id || null,
        channel: 'whatsapp',
        to_phone: phone,
        content: generateReminderContent(name, scheduleData.title, scheduleData.start_time, scheduleData.location, scheduleData.room),
        status: 'scheduled',
        direction: 'outgoing',
        subject: `תזכורת: ${scheduleData.title}`,
        message_type: 'reminder',
        scheduled_for: computeScheduledFor(scheduleData.start_time, scheduleData.reminder_minutes_before)
      })
    }
    plan.impact.messagesToCreate = plan.messagesToCreate.length
    plan.impact.affectedParticipants = participantCount
  }

  if (changeType === 'update' && scheduleData?.id) {
    // Find existing messages linked to this schedule
    const { data: existingMessages } = await supabase
      .from('messages')
      .select('id, participant_id, content')
      .eq('schedule_id', scheduleData.id)
      .in('status', ['pending', 'scheduled'])

    if (existingMessages && existingMessages.length > 0) {
      if (scheduleData.send_reminder) {
        // Update existing messages with new content
        for (const msg of existingMessages) {
          const participant = participants.find(p => p.id === msg.participant_id)
          if (!participant) continue
          const name = participant.full_name || `${participant.first_name} ${participant.last_name}`

          plan.messagesToUpdate.push({
            id: msg.id,
            content: generateReminderContent(name, scheduleData.title, scheduleData.start_time, scheduleData.location, scheduleData.room),
            scheduled_for: computeScheduledFor(scheduleData.start_time, scheduleData.reminder_minutes_before)
          })
        }
        plan.impact.messagesToUpdate = plan.messagesToUpdate.length
      } else {
        // Reminders disabled - delete existing messages
        for (const msg of existingMessages) {
          plan.messagesToDelete.push({ id: msg.id })
        }
        plan.impact.messagesToDelete = plan.messagesToDelete.length
      }
    } else if (scheduleData.send_reminder) {
      // No existing messages but reminders enabled - create new ones
      for (const p of participants) {
        const name = p.full_name || `${p.first_name} ${p.last_name}`
        const phone = p.phone || ''
        if (!phone) continue

        plan.messagesToCreate.push({
          event_id: eventId,
          participant_id: p.id,
          schedule_id: scheduleData.id,
          channel: 'whatsapp',
          to_phone: phone,
          content: generateReminderContent(name, scheduleData.title, scheduleData.start_time, scheduleData.location, scheduleData.room),
          status: 'scheduled',
          direction: 'outgoing',
          subject: `תזכורת: ${scheduleData.title}`,
          message_type: 'reminder',
          scheduled_for: computeScheduledFor(scheduleData.start_time, scheduleData.reminder_minutes_before)
        })
      }
      plan.impact.messagesToCreate = plan.messagesToCreate.length
    }
    plan.impact.affectedParticipants = participantCount
  }

  if (changeType === 'delete' && scheduleData?.id) {
    // Delete all messages linked to this schedule
    const { data: existingMessages } = await supabase
      .from('messages')
      .select('id')
      .eq('schedule_id', scheduleData.id)

    if (existingMessages) {
      for (const msg of existingMessages) {
        plan.messagesToDelete.push({ id: msg.id })
      }
      plan.impact.messagesToDelete = plan.messagesToDelete.length
      plan.impact.affectedParticipants = participantCount
    }
  }

  if (changeType === 'delete_all') {
    // Delete all schedule-linked messages for this event
    const { data: allSchedules } = await supabase
      .from('schedules')
      .select('id')
      .eq('event_id', eventId)

    if (allSchedules) {
      const scheduleIds = allSchedules.map(s => s.id)
      if (scheduleIds.length > 0) {
        const { data: existingMessages } = await supabase
          .from('messages')
          .select('id')
          .in('schedule_id', scheduleIds)

        if (existingMessages) {
          for (const msg of existingMessages) {
            plan.messagesToDelete.push({ id: msg.id })
          }
          plan.impact.messagesToDelete = plan.messagesToDelete.length
          plan.impact.affectedParticipants = participantCount
        }
      }
    }
  }

  return plan
}

// ────────────────────────────────────────────────────────────────────────────
// Execute Sync Plan
// ────────────────────────────────────────────────────────────────────────────

export async function executeScheduleMessageSync(plan: MessageSyncPlan): Promise<void> {
  // Batch create
  if (plan.messagesToCreate.length > 0) {
    // Insert in batches of 50
    for (let i = 0; i < plan.messagesToCreate.length; i += 50) {
      const batch = plan.messagesToCreate.slice(i, i + 50)
      const { error } = await supabase.from('messages').insert(batch)
      if (error) {
        console.error('Error creating messages batch:', error)
        throw error
      }
    }
  }

  // Batch update
  if (plan.messagesToUpdate.length > 0) {
    for (const update of plan.messagesToUpdate) {
      const { error } = await supabase
        .from('messages')
        .update({
          content: update.content,
          updated_at: new Date().toISOString(),
          ...(update.scheduled_for !== undefined && { scheduled_for: update.scheduled_for })
        })
        .eq('id', update.id)

      if (error) {
        console.error('Error updating message:', error)
      }
    }
  }

  // Batch delete
  if (plan.messagesToDelete.length > 0) {
    const deleteIds = plan.messagesToDelete.map(m => m.id)
    // Delete in batches of 50
    for (let i = 0; i < deleteIds.length; i += 50) {
      const batch = deleteIds.slice(i, i + 50)
      const { error } = await supabase
        .from('messages')
        .delete()
        .in('id', batch)

      if (error) {
        console.error('Error deleting messages batch:', error)
      }
    }
  }
}
