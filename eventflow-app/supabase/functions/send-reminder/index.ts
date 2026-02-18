// supabase/functions/send-reminder/index.ts
// Edge Function לשליחת תזכורות אוטומטיות - מופעל על ידי Cron Job
// Phase 3: Dynamic template system with fallback to hardcoded builders
// Phase 4 v9: Fixed test mode — phone normalization, sendWhatsApp helper, correct columns
// Phase 5 v14: Throttle (2.1s between sends), one retry for transient failures, retry_count tracking

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { checkOrgQuota } from '../_shared/quota-check.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ReminderJob {
  type: 'activation' | 'week_before' | 'day_before' | 'morning' | '15_min'
       | 'event_end' | 'follow_up_3mo' | 'follow_up_6mo'
       | 'process_scheduled' | 'process_changes'
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jerusalem' })
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Jerusalem' })
}

// ─────────────────────────────────────────────────────────
// Template System Utilities
// ─────────────────────────────────────────────────────────

async function getMessageTemplate(
  supabase: any,
  organizationId: string,
  messageType: string
): Promise<string | null> {
  try {
    // Try org-specific template first
    const { data: orgTemplate } = await supabase
      .from('message_templates')
      .select('content')
      .eq('organization_id', organizationId)
      .eq('message_type', messageType)
      .eq('is_active', true)
      .maybeSingle()

    if (orgTemplate?.content) return orgTemplate.content

    // Fall back to system template
    const { data: sysTemplate } = await supabase
      .from('message_templates')
      .select('content')
      .is('organization_id', null)
      .eq('message_type', messageType)
      .eq('is_active', true)
      .eq('is_system', true)
      .maybeSingle()

    return sysTemplate?.content || null
  } catch (error) {
    console.error(`Template fetch error for ${messageType}:`, error)
    return null  // Fallback to hardcoded
  }
}

function substituteVariables(
  template: string,
  variables: Record<string, string>
): string {
  return Object.entries(variables).reduce(
    (result, [key, value]) => {
      return result.replace(
        new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
        value || ''
      )
    },
    template
  )
}

function buildEventVariableMap(event: any, participant: any): Record<string, string> {
  return {
    participant_name: participant.first_name || '',
    event_name: event.name || '',
    event_date: formatDate(event.start_date),
    event_time: formatTime(event.start_date),
    event_location: [event.venue_name, event.venue_address].filter(Boolean).join(' '),
  }
}

function buildScheduleVariableMap(
  participant: any,
  schedule: any,
  roomInfo?: any
): Record<string, string> {
  return {
    participant_name: `${participant.first_name} ${participant.last_name || ''}`.trim(),
    session_title: schedule.title || '',
    session_location: schedule.location || '',
    session_room: roomInfo?.room_number || schedule.room || '',
    session_start_time: formatTime(schedule.start_time),
    session_end_time: formatTime(schedule.end_time),
    session_speaker: schedule.speaker_name || '',
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Verify cron secret to prevent unauthorized invocation
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (cronSecret) {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()

    // ─────────────────────────────────────────────────────────
    // TEST MODE — send single test message to manager's phone
    // ─────────────────────────────────────────────────────────
    if (body.mode === 'test') {
      const { event_id, test_phone, type: reminderType } = body

      if (!event_id || !test_phone) {
        return new Response(JSON.stringify({ success: false, message: 'Missing event_id or test_phone' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        })
      }

      // Normalize phone number: 05X → 972X
      const normalizedPhone = test_phone.startsWith('0')
        ? '972' + test_phone.slice(1)
        : test_phone

      // Fetch event data
      const { data: event } = await supabase
        .from('events')
        .select('id, name, start_date, venue_name, venue_address, organization_id')
        .eq('id', event_id)
        .single()

      if (!event) {
        return new Response(JSON.stringify({ success: false, message: 'Event not found' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404
        })
      }

      // Fetch template (same as production)
      const template = await getMessageTemplate(supabase, event.organization_id, `reminder_${reminderType || 'activation'}`)

      // Build test message
      const testParticipant = { first_name: 'בדיקה' }
      const variableMap = buildEventVariableMap(event, testParticipant)
      const message = template
        ? substituteVariables(template, variableMap)
        : `הודעת בדיקה עבור אירוע: ${event.name}`

      // Log test message to messages table
      const { data: msgData } = await supabase.from('messages').insert({
        event_id: event.id,
        participant_id: null,
        message_type: `reminder_${reminderType || 'activation'}`,
        subject: `test_reminder_${reminderType || 'activation'}`,
        content: message,
        to_phone: normalizedPhone,
        status: 'pending',
        channel: 'whatsapp',
      }).select().single()

      // Send via sendWhatsApp helper (same as production, but skip quota for test mode)
      const sendResult = await sendWhatsApp(
        supabase,
        event.organization_id,
        normalizedPhone,
        message,
        msgData?.id,
        true  // skipQuotaCheck for test mode
      )

      return new Response(JSON.stringify({
        success: sendResult.success,
        message: sendResult.success ? 'Test message sent' : 'Failed to send test message'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ─────────────────────────────────────────────────────────
    // PRODUCTION MODE — existing reminder logic
    // ─────────────────────────────────────────────────────────
    const { type }: ReminderJob = body
    const now = new Date()
    const results = { processed: 0, sent: 0, errors: 0, quotaExceeded: 0 }

    // Track orgs that have exceeded quota this run (skip further sends)
    const quotaExceededOrgs = new Set<string>()

    // ─────────────────────────────────────────────────────────
    // 1. ACTIVATION — when event becomes active
    // ─────────────────────────────────────────────────────────
    if (type === 'activation') {
      const { data: events } = await supabase
        .from('events')
        .select(`
          id, name, start_date, venue_name, venue_address, organization_id,
          settings,
          participants (
            id, first_name, phone_normalized, status
          )
        `)
        .eq('status', 'active')

      if (events) {
        for (const event of events) {
          if (!event.settings?.reminder_activation) continue

          // Skip if this org has already exceeded quota
          if (quotaExceededOrgs.has(event.organization_id)) continue

          const template = await getMessageTemplate(supabase, event.organization_id, 'reminder_activation')

          for (const participant of event.participants || []) {
            if (participant.status !== 'confirmed') continue

            // Skip if quota exceeded for this org (from previous participant)
            if (quotaExceededOrgs.has(event.organization_id)) break

            results.processed++

            const { data: existingMsg } = await supabase
              .from('messages')
              .select('id')
              .eq('event_id', event.id)
              .eq('participant_id', participant.id)
              .eq('message_type', 'reminder_activation')
              .maybeSingle()

            if (existingMsg) continue

            const message = template
              ? substituteVariables(template, buildEventVariableMap(event, participant))
              : buildActivationMessage(event, participant)

            const { data: msgData, error: msgError } = await supabase
              .from('messages')
              .insert({
                event_id: event.id,
                participant_id: participant.id,
                message_type: 'reminder_activation',
                subject: 'reminder_activation',
                channel: 'whatsapp',
                to_phone: participant.phone_normalized,
                content: message,
                status: 'pending',
              })
              .select()
              .single()

            if (msgError) {
              results.errors++
              continue
            }

            const sendResult = await sendWhatsApp(
              supabase,
              event.organization_id,
              participant.phone_normalized,
              message,
              msgData.id
            )

            if (sendResult.success) results.sent++
            else if (sendResult.quotaExceeded) {
              quotaExceededOrgs.add(event.organization_id)
              results.quotaExceeded++
            }
            else results.errors++
          }
        }
      }
    }

    // ─────────────────────────────────────────────────────────
    // 2. WEEK BEFORE — 7 days before event
    // ─────────────────────────────────────────────────────────
    if (type === 'week_before') {
      const in7days = new Date(now)
      in7days.setDate(in7days.getDate() + 7)
      in7days.setHours(0, 0, 0, 0)

      const in8days = new Date(in7days)
      in8days.setDate(in8days.getDate() + 1)

      const { data: events } = await supabase
        .from('events')
        .select(`
          id, name, start_date, venue_name, venue_address, organization_id,
          settings,
          participants (
            id, first_name, phone_normalized, status
          )
        `)
        .gte('start_date', in7days.toISOString())
        .lt('start_date', in8days.toISOString())
        .eq('status', 'active')

      if (events) {
        for (const event of events) {
          if (!event.settings?.reminder_week_before) continue

          // Skip if this org has already exceeded quota
          if (quotaExceededOrgs.has(event.organization_id)) continue

          const template = await getMessageTemplate(supabase, event.organization_id, 'reminder_week_before')

          for (const participant of event.participants || []) {
            if (participant.status !== 'confirmed') continue

            // Skip if quota exceeded for this org
            if (quotaExceededOrgs.has(event.organization_id)) break

            results.processed++

            const { data: existingMsg } = await supabase
              .from('messages')
              .select('id')
              .eq('event_id', event.id)
              .eq('participant_id', participant.id)
              .eq('message_type', 'reminder_week_before')
              .maybeSingle()

            if (existingMsg) continue

            const message = template
              ? substituteVariables(template, buildEventVariableMap(event, participant))
              : buildWeekBeforeMessage(event, participant)

            const { data: msgData, error: msgError } = await supabase
              .from('messages')
              .insert({
                event_id: event.id,
                participant_id: participant.id,
                message_type: 'reminder_week_before',
                subject: 'reminder_week_before',
                channel: 'whatsapp',
                to_phone: participant.phone_normalized,
                content: message,
                status: 'pending',
              })
              .select()
              .single()

            if (msgError) {
              results.errors++
              continue
            }

            const sendResult = await sendWhatsApp(
              supabase,
              event.organization_id,
              participant.phone_normalized,
              message,
              msgData.id
            )

            if (sendResult.success) results.sent++
            else if (sendResult.quotaExceeded) {
              quotaExceededOrgs.add(event.organization_id)
              results.quotaExceeded++
            }
            else results.errors++
          }
        }
      }
    }

    // ─────────────────────────────────────────────────────────
    // 3. DAY BEFORE — evening before event
    // ─────────────────────────────────────────────────────────
    if (type === 'day_before') {
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)

      const dayAfterTomorrow = new Date(tomorrow)
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1)

      const { data: events } = await supabase
        .from('events')
        .select(`
          id, name, start_date, venue_name, venue_address, organization_id,
          settings,
          participants (
            id, first_name, phone_normalized, status,
            has_companion, companion_name, companion_phone_normalized
          )
        `)
        .gte('start_date', tomorrow.toISOString())
        .lt('start_date', dayAfterTomorrow.toISOString())
        .eq('status', 'active')

      if (events) {
        for (const event of events) {
          if (!event.settings?.reminder_day_before) continue

          // Skip if this org has already exceeded quota
          if (quotaExceededOrgs.has(event.organization_id)) continue

          const template = await getMessageTemplate(supabase, event.organization_id, 'reminder_day_before')

          for (const participant of event.participants || []) {
            if (participant.status !== 'confirmed') continue

            // Skip if quota exceeded for this org
            if (quotaExceededOrgs.has(event.organization_id)) break

            results.processed++

            const { data: existingMsg } = await supabase
              .from('messages')
              .select('id')
              .eq('event_id', event.id)
              .eq('participant_id', participant.id)
              .eq('message_type', 'reminder_day_before')
              .maybeSingle()

            if (existingMsg) continue

            const message = template
              ? substituteVariables(template, buildEventVariableMap(event, participant))
              : buildDayBeforeMessage(event, participant)

            const { data: msgData, error: msgError } = await supabase
              .from('messages')
              .insert({
                event_id: event.id,
                participant_id: participant.id,
                message_type: 'reminder_day_before',
                subject: 'reminder_day_before',
                channel: 'whatsapp',
                to_phone: participant.phone_normalized,
                content: message,
                status: 'pending',
              })
              .select()
              .single()

            if (msgError) {
              results.errors++
              continue
            }

            const sendResult = await sendWhatsApp(
              supabase,
              event.organization_id,
              participant.phone_normalized,
              message,
              msgData.id
            )

            if (sendResult.success) {
              results.sent++
            } else if (sendResult.quotaExceeded) {
              quotaExceededOrgs.add(event.organization_id)
              results.quotaExceeded++
            } else {
              results.errors++
            }

            // Send to companion if exists (skip if quota exceeded)
            if (participant.has_companion && participant.companion_phone_normalized && !quotaExceededOrgs.has(event.organization_id)) {
              const companionMessage = template
                ? substituteVariables(template, buildEventVariableMap(event, {
                    first_name: participant.companion_name || 'אורח/ת',
                  }))
                : buildDayBeforeMessage(event, {
                    first_name: participant.companion_name || 'אורח/ת',
                  })

              await supabase
                .from('messages')
                .insert({
                  event_id: event.id,
                  participant_id: participant.id,
                  message_type: 'reminder_day_before',
                  subject: 'reminder_day_before',
                  channel: 'whatsapp',
                  to_phone: participant.companion_phone_normalized,
                  content: companionMessage,
                  status: 'pending',
                })

              const companionResult = await sendWhatsApp(
                supabase,
                event.organization_id,
                participant.companion_phone_normalized,
                companionMessage
              )
              if (companionResult.quotaExceeded) {
                quotaExceededOrgs.add(event.organization_id)
                results.quotaExceeded++
              }
            }
          }
        }
      }
    }

    // ─────────────────────────────────────────────────────────
    // 4. MORNING — day of event
    // ─────────────────────────────────────────────────────────
    if (type === 'morning') {
      const today = new Date(now)
      today.setHours(0, 0, 0, 0)

      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const { data: events } = await supabase
        .from('events')
        .select(`
          id, name, start_date, venue_name, venue_address, organization_id,
          settings,
          participants (
            id, first_name, phone_normalized, status
          )
        `)
        .gte('start_date', today.toISOString())
        .lt('start_date', tomorrow.toISOString())
        .eq('status', 'active')

      if (events) {
        for (const event of events) {
          if (!event.settings?.reminder_morning) continue

          // Skip if this org has already exceeded quota
          if (quotaExceededOrgs.has(event.organization_id)) continue

          const template = await getMessageTemplate(supabase, event.organization_id, 'reminder_morning')

          for (const participant of event.participants || []) {
            if (participant.status !== 'confirmed') continue

            // Skip if quota exceeded for this org
            if (quotaExceededOrgs.has(event.organization_id)) break

            results.processed++

            const { data: existingMsg } = await supabase
              .from('messages')
              .select('id')
              .eq('event_id', event.id)
              .eq('participant_id', participant.id)
              .eq('message_type', 'reminder_morning')
              .maybeSingle()

            if (existingMsg) continue

            const message = template
              ? substituteVariables(template, buildEventVariableMap(event, participant))
              : buildMorningMessage(event, participant)

            const { data: msgData } = await supabase
              .from('messages')
              .insert({
                event_id: event.id,
                participant_id: participant.id,
                message_type: 'reminder_morning',
                subject: 'reminder_morning',
                channel: 'whatsapp',
                to_phone: participant.phone_normalized,
                content: message,
                status: 'pending',
              })
              .select()
              .single()

            const sendResult = await sendWhatsApp(
              supabase,
              event.organization_id,
              participant.phone_normalized,
              message,
              msgData?.id
            )

            if (sendResult.success) results.sent++
            else if (sendResult.quotaExceeded) {
              quotaExceededOrgs.add(event.organization_id)
              results.quotaExceeded++
            }
            else results.errors++
          }
        }
      }
    }

    // ─────────────────────────────────────────────────────────
    // 5. 15-MINUTE — before each session
    // ─────────────────────────────────────────────────────────
    if (type === '15_min') {
      const in15min = new Date(now.getTime() + 15 * 60 * 1000)
      const in20min = new Date(now.getTime() + 20 * 60 * 1000)

      const { data: schedules } = await supabase
        .from('schedules')
        .select(`
          id, title, location, room, start_time, end_time,
          description, speaker_name, track,
          event_id,
          events!inner (organization_id, name, settings),
          participant_schedules (
            id, participant_id, reminder_sent,
            participants (id, first_name, last_name, phone_normalized, event_id)
          )
        `)
        .gte('start_time', in15min.toISOString())
        .lt('start_time', in20min.toISOString())
        .eq('send_reminder', true)

      if (schedules) {
        for (const schedule of schedules) {
          if (!schedule.events?.settings?.reminder_15min) continue

          // Skip if this org has already exceeded quota
          if (quotaExceededOrgs.has(schedule.events.organization_id)) continue

          const template15 = await getMessageTemplate(supabase, schedule.events.organization_id, 'reminder_15min')

          for (const ps of schedule.participant_schedules || []) {
            if (ps.reminder_sent) continue

            // Skip if quota exceeded for this org
            if (quotaExceededOrgs.has(schedule.events.organization_id)) break

            results.processed++

            const participant = ps.participants

            // Dedup: check if scheduleMessageSync already created a message for this schedule+participant
            const { data: existingScheduleMsg } = await supabase
              .from('messages')
              .select('id, status')
              .eq('schedule_id', schedule.id)
              .eq('participant_id', participant.id)
              .in('status', ['scheduled', 'sent', 'delivered'])
              .maybeSingle()

            if (existingScheduleMsg) {
              // Already handled by scheduleMessageSync — skip to avoid double WhatsApp
              continue
            }

            const { data: roomInfo } = await supabase
              .from('participant_rooms')
              .select('room_number, building, floor')
              .eq('participant_id', participant.id)
              .eq('event_id', schedule.event_id)
              .maybeSingle()

            const message = template15
              ? substituteVariables(template15, buildScheduleVariableMap(participant, schedule, roomInfo))
              : build15MinReminder(participant, schedule, roomInfo)

            const { data: msgData } = await supabase
              .from('messages')
              .insert({
                event_id: schedule.event_id,
                participant_id: participant.id,
                message_type: 'reminder_15min',
                subject: `תזכורת: ${schedule.title}`,
                channel: 'whatsapp',
                to_phone: participant.phone_normalized,
                content: message,
                status: 'pending',
              })
              .select()
              .single()

            const sendResult = await sendWhatsApp(
              supabase,
              schedule.events.organization_id,
              participant.phone_normalized,
              message,
              msgData?.id
            )

            if (sendResult.success) {
              results.sent++
              await supabase
                .from('participant_schedules')
                .update({ reminder_sent: true, reminder_sent_at: now.toISOString() })
                .eq('id', ps.id)
            } else if (sendResult.quotaExceeded) {
              quotaExceededOrgs.add(schedule.events.organization_id)
              results.quotaExceeded++
            } else {
              results.errors++
            }
          }
        }
      }
    }

    // ─────────────────────────────────────────────────────────
    // 6. EVENT END — thank you after event concludes
    // ─────────────────────────────────────────────────────────
    if (type === 'event_end') {
      const { data: events } = await supabase
        .from('events')
        .select(`
          id, name, start_date, end_date, venue_name, venue_address, organization_id,
          settings,
          participants (
            id, first_name, phone_normalized, status
          )
        `)
        .lte('end_date', now.toISOString())
        .in('status', ['active', 'completed'])

      if (events) {
        for (const event of events) {
          if (!event.settings?.reminder_event_end) continue

          // Skip if this org has already exceeded quota
          if (quotaExceededOrgs.has(event.organization_id)) continue

          const template = await getMessageTemplate(supabase, event.organization_id, 'reminder_event_end')

          for (const participant of event.participants || []) {
            if (participant.status !== 'confirmed' && participant.status !== 'checked_in') continue

            // Skip if quota exceeded for this org
            if (quotaExceededOrgs.has(event.organization_id)) break

            results.processed++

            const { data: existingMsg } = await supabase
              .from('messages')
              .select('id')
              .eq('event_id', event.id)
              .eq('participant_id', participant.id)
              .eq('message_type', 'reminder_event_end')
              .maybeSingle()

            if (existingMsg) continue

            const message = template
              ? substituteVariables(template, buildEventVariableMap(event, participant))
              : buildEventEndMessage(event, participant)

            const { data: msgData, error: msgError } = await supabase
              .from('messages')
              .insert({
                event_id: event.id,
                participant_id: participant.id,
                message_type: 'reminder_event_end',
                subject: 'reminder_event_end',
                channel: 'whatsapp',
                to_phone: participant.phone_normalized,
                content: message,
                status: 'pending',
              })
              .select()
              .single()

            if (msgError) {
              results.errors++
              continue
            }

            const sendResult = await sendWhatsApp(
              supabase,
              event.organization_id,
              participant.phone_normalized,
              message,
              msgData.id
            )

            if (sendResult.success) results.sent++
            else if (sendResult.quotaExceeded) {
              quotaExceededOrgs.add(event.organization_id)
              results.quotaExceeded++
            }
            else results.errors++
          }
        }
      }
    }

    // ─────────────────────────────────────────────────────────
    // 7. FOLLOW-UP 3 MONTHS — manager approval required
    // ─────────────────────────────────────────────────────────
    if (type === 'follow_up_3mo') {
      const days92ago = new Date(now)
      days92ago.setDate(days92ago.getDate() - 92)

      const days88ago = new Date(now)
      days88ago.setDate(days88ago.getDate() - 88)

      const { data: events } = await supabase
        .from('events')
        .select(`
          id, name, start_date, end_date, venue_name, venue_address, organization_id,
          settings,
          participants (
            id, first_name, phone_normalized, status
          )
        `)
        .gte('end_date', days92ago.toISOString())
        .lte('end_date', days88ago.toISOString())
        .eq('status', 'completed')

      if (events) {
        for (const event of events) {
          if (!event.settings?.reminder_follow_up_3mo) continue

          // Skip if this org has already exceeded quota
          if (quotaExceededOrgs.has(event.organization_id)) continue

          const template = await getMessageTemplate(supabase, event.organization_id, 'reminder_follow_up_3mo')

          for (const participant of event.participants || []) {
            if (participant.status !== 'confirmed' && participant.status !== 'checked_in') continue

            // Skip if quota exceeded for this org
            if (quotaExceededOrgs.has(event.organization_id)) break

            results.processed++

            const { data: existingMsg } = await supabase
              .from('messages')
              .select('id')
              .eq('event_id', event.id)
              .eq('participant_id', participant.id)
              .eq('message_type', 'reminder_follow_up_3mo')
              .maybeSingle()

            if (existingMsg) continue

            const message = template
              ? substituteVariables(template, buildEventVariableMap(event, participant))
              : buildFollowUp3moMessage(event, participant)

            const { data: msgData, error: msgError } = await supabase
              .from('messages')
              .insert({
                event_id: event.id,
                participant_id: participant.id,
                message_type: 'reminder_follow_up_3mo',
                subject: 'reminder_follow_up_3mo',
                channel: 'whatsapp',
                to_phone: participant.phone_normalized,
                content: message,
                status: 'pending',
              })
              .select()
              .single()

            if (msgError) {
              results.errors++
              continue
            }

            const sendResult = await sendWhatsApp(
              supabase,
              event.organization_id,
              participant.phone_normalized,
              message,
              msgData.id
            )

            if (sendResult.success) results.sent++
            else if (sendResult.quotaExceeded) {
              quotaExceededOrgs.add(event.organization_id)
              results.quotaExceeded++
            }
            else results.errors++
          }
        }
      }
    }

    // ─────────────────────────────────────────────────────────
    // 8. FOLLOW-UP 6 MONTHS — manager approval required
    // ─────────────────────────────────────────────────────────
    if (type === 'follow_up_6mo') {
      const days182ago = new Date(now)
      days182ago.setDate(days182ago.getDate() - 182)

      const days178ago = new Date(now)
      days178ago.setDate(days178ago.getDate() - 178)

      const { data: events } = await supabase
        .from('events')
        .select(`
          id, name, start_date, end_date, venue_name, venue_address, organization_id,
          settings,
          participants (
            id, first_name, phone_normalized, status
          )
        `)
        .gte('end_date', days182ago.toISOString())
        .lte('end_date', days178ago.toISOString())
        .eq('status', 'completed')

      if (events) {
        for (const event of events) {
          if (!event.settings?.reminder_follow_up_6mo) continue

          // Skip if this org has already exceeded quota
          if (quotaExceededOrgs.has(event.organization_id)) continue

          const template = await getMessageTemplate(supabase, event.organization_id, 'reminder_follow_up_6mo')

          for (const participant of event.participants || []) {
            if (participant.status !== 'confirmed' && participant.status !== 'checked_in') continue

            // Skip if quota exceeded for this org
            if (quotaExceededOrgs.has(event.organization_id)) break

            results.processed++

            const { data: existingMsg } = await supabase
              .from('messages')
              .select('id')
              .eq('event_id', event.id)
              .eq('participant_id', participant.id)
              .eq('message_type', 'reminder_follow_up_6mo')
              .maybeSingle()

            if (existingMsg) continue

            const message = template
              ? substituteVariables(template, buildEventVariableMap(event, participant))
              : buildFollowUp6moMessage(event, participant)

            const { data: msgData, error: msgError } = await supabase
              .from('messages')
              .insert({
                event_id: event.id,
                participant_id: participant.id,
                message_type: 'reminder_follow_up_6mo',
                subject: 'reminder_follow_up_6mo',
                channel: 'whatsapp',
                to_phone: participant.phone_normalized,
                content: message,
                status: 'pending',
              })
              .select()
              .single()

            if (msgError) {
              results.errors++
              continue
            }

            const sendResult = await sendWhatsApp(
              supabase,
              event.organization_id,
              participant.phone_normalized,
              message,
              msgData.id
            )

            if (sendResult.success) results.sent++
            else if (sendResult.quotaExceeded) {
              quotaExceededOrgs.add(event.organization_id)
              results.quotaExceeded++
            }
            else results.errors++
          }
        }
      }
    }

    // ─────────────────────────────────────────────────────────
    // 9. PROCESS SCHEDULED — send messages when scheduled_for arrives
    // Cron: every 2 minutes
    // ─────────────────────────────────────────────────────────
    if (type === 'process_scheduled') {
      // 9a. Send scheduled reminders whose time has arrived
      const { data: scheduledMsgs } = await supabase
        .from('messages')
        .select('id, event_id, participant_id, to_phone, content, schedule_id')
        .eq('status', 'scheduled')
        .lte('scheduled_for', now.toISOString())
        .order('scheduled_for', { ascending: true })
        .limit(50)

      if (scheduledMsgs) {
        for (const msg of scheduledMsgs) {
          results.processed++

          // Get organization_id from event
          const { data: event } = await supabase
            .from('events')
            .select('organization_id')
            .eq('id', msg.event_id)
            .single()

          if (!event) {
            await supabase.from('messages').update({
              status: 'failed',
              error_message: 'Event not found',
              updated_at: now.toISOString()
            }).eq('id', msg.id)
            results.errors++
            continue
          }

          // Skip if this org has already exceeded quota
          if (quotaExceededOrgs.has(event.organization_id)) {
            results.quotaExceeded++
            continue
          }

          const sendResult = await sendWhatsApp(
            supabase,
            event.organization_id,
            msg.to_phone,
            msg.content,
            msg.id
          )

          if (sendResult.success) {
            results.sent++
          } else if (sendResult.quotaExceeded) {
            quotaExceededOrgs.add(event.organization_id)
            results.quotaExceeded++
          } else {
            results.errors++
            await supabase.from('messages').update({
              status: 'failed',
              error_message: sendResult.error || 'Send failed',
              updated_at: now.toISOString()
            }).eq('id', msg.id)
          }
        }
      }

      // 9b. Send pending immediate notifications (schedule change alerts)
      const tenSecondsAgo = new Date(now.getTime() - 10 * 1000).toISOString()
      const { data: pendingMsgs } = await supabase
        .from('messages')
        .select('id, event_id, participant_id, to_phone, content, schedule_id')
        .eq('status', 'pending')
        .eq('message_type', 'update')
        .lte('created_at', tenSecondsAgo)
        .order('created_at', { ascending: true })
        .limit(50)

      if (pendingMsgs) {
        for (const msg of pendingMsgs) {
          results.processed++

          const { data: event } = await supabase
            .from('events')
            .select('organization_id')
            .eq('id', msg.event_id)
            .single()

          if (!event) {
            await supabase.from('messages').update({
              status: 'failed',
              error_message: 'Event not found',
              updated_at: now.toISOString()
            }).eq('id', msg.id)
            results.errors++
            continue
          }

          // Skip if this org has already exceeded quota
          if (quotaExceededOrgs.has(event.organization_id)) {
            results.quotaExceeded++
            continue
          }

          const sendResult = await sendWhatsApp(
            supabase,
            event.organization_id,
            msg.to_phone,
            msg.content,
            msg.id
          )

          if (sendResult.success) {
            results.sent++
          } else if (sendResult.quotaExceeded) {
            quotaExceededOrgs.add(event.organization_id)
            results.quotaExceeded++
          } else {
            results.errors++
            await supabase.from('messages').update({
              status: 'failed',
              error_message: sendResult.error || 'Send failed',
              updated_at: now.toISOString()
            }).eq('id', msg.id)
          }
        }
      }
    }

    // ─────────────────────────────────────────────────────────
    // 10. PROCESS CHANGES — safety net for browser-close scenarios
    // Cron: every 3 minutes. Only processes entries older than 90s
    // that were NOT handled by the frontend or cancelled.
    // ─────────────────────────────────────────────────────────
    if (type === 'process_changes') {
      const ninetySecondsAgo = new Date(now.getTime() - 90 * 1000).toISOString()

      const { data: unprocessedChanges } = await supabase
        .from('schedule_change_log')
        .select('*')
        .eq('processed', false)
        .lte('created_at', ninetySecondsAgo)
        .order('created_at', { ascending: true })
        .limit(20)

      if (unprocessedChanges) {
        for (const change of unprocessedChanges) {
          results.processed++

          try {
            if (change.change_type === 'create' && change.new_data?.send_reminder) {
              // Check if messages already exist for this schedule (frontend may have handled it)
              const { data: existingMsgs } = await supabase
                .from('messages')
                .select('id')
                .eq('schedule_id', change.schedule_id)
                .eq('message_type', 'reminder')
                .in('status', ['pending', 'scheduled'])
                .limit(1)

              if (!existingMsgs || existingMsgs.length === 0) {
                // Create messages for all participants
                const { data: participants } = await supabase
                  .from('participants')
                  .select('id, full_name, first_name, last_name, phone')
                  .eq('event_id', change.event_id)

                if (participants) {
                  const schedule = change.new_data
                  const scheduledFor = new Date(schedule.start_time)
                  scheduledFor.setMinutes(scheduledFor.getMinutes() - (schedule.reminder_minutes_before || 30))

                  const messageBatch = participants
                    .filter((p: any) => p.phone)
                    .map((p: any) => {
                      const name = p.full_name || `${p.first_name} ${p.last_name}`
                      const time = new Date(schedule.start_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
                      const date = new Date(schedule.start_time).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })
                      let content = `שלום ${name}! תזכורת: "${schedule.title}" ב${date} בשעה ${time}`
                      if (schedule.location) content += ` | ${schedule.location}`
                      if (schedule.room) content += ` - ${schedule.room}`

                      return {
                        event_id: change.event_id,
                        participant_id: p.id,
                        schedule_id: change.schedule_id,
                        channel: 'whatsapp',
                        to_phone: p.phone,
                        content,
                        status: 'scheduled',
                        direction: 'outgoing',
                        subject: `תזכורת: ${schedule.title}`,
                        message_type: 'reminder',
                        scheduled_for: scheduledFor.toISOString()
                      }
                    })

                  // Insert one by one — skip duplicates (dedup index handles conflicts)
                  let inserted = 0
                  for (const msg of messageBatch) {
                    const { error: insertErr } = await supabase.from('messages').insert(msg)
                    if (insertErr) {
                      if (insertErr.code === '23505') continue // duplicate — already exists
                      console.error('Error creating message:', insertErr)
                    } else {
                      inserted++
                    }
                  }
                  results.sent += inserted
                }
              }
            }

            if (change.change_type === 'update' && change.new_data) {
              const schedule = change.new_data
              if (schedule.send_reminder) {
                // Update existing reminder messages with new content/time
                const { data: existingMsgs } = await supabase
                  .from('messages')
                  .select('id, participant_id')
                  .eq('schedule_id', change.schedule_id)
                  .eq('message_type', 'reminder')
                  .in('status', ['pending', 'scheduled'])

                if (existingMsgs && existingMsgs.length > 0) {
                  const scheduledFor = new Date(schedule.start_time)
                  scheduledFor.setMinutes(scheduledFor.getMinutes() - (schedule.reminder_minutes_before || 30))

                  const { data: participants } = await supabase
                    .from('participants')
                    .select('id, full_name, first_name, last_name')
                    .eq('event_id', change.event_id)

                  for (const msg of existingMsgs) {
                    const participant = participants?.find((p: any) => p.id === msg.participant_id)
                    if (!participant) continue
                    const name = participant.full_name || `${participant.first_name} ${participant.last_name}`
                    const time = new Date(schedule.start_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
                    const date = new Date(schedule.start_time).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })
                    let content = `שלום ${name}! תזכורת: "${schedule.title}" ב${date} בשעה ${time}`
                    if (schedule.location) content += ` | ${schedule.location}`
                    if (schedule.room) content += ` - ${schedule.room}`

                    await supabase.from('messages').update({
                      content,
                      scheduled_for: scheduledFor.toISOString(),
                      updated_at: now.toISOString()
                    }).eq('id', msg.id)
                  }
                  results.sent += existingMsgs.length
                } else {
                  // No existing messages but reminders enabled — create them
                  const { data: participants } = await supabase
                    .from('participants')
                    .select('id, full_name, first_name, last_name, phone')
                    .eq('event_id', change.event_id)

                  if (participants) {
                    const scheduledFor = new Date(schedule.start_time)
                    scheduledFor.setMinutes(scheduledFor.getMinutes() - (schedule.reminder_minutes_before || 30))

                    const messageBatch = participants
                      .filter((p: any) => p.phone)
                      .map((p: any) => {
                        const name = p.full_name || `${p.first_name} ${p.last_name}`
                        const time = new Date(schedule.start_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
                        const date = new Date(schedule.start_time).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })
                        let content = `שלום ${name}! תזכורת: "${schedule.title}" ב${date} בשעה ${time}`
                        if (schedule.location) content += ` | ${schedule.location}`
                        if (schedule.room) content += ` - ${schedule.room}`

                        return {
                          event_id: change.event_id,
                          participant_id: p.id,
                          schedule_id: change.schedule_id,
                          channel: 'whatsapp',
                          to_phone: p.phone,
                          content,
                          status: 'scheduled',
                          direction: 'outgoing',
                          subject: `תזכורת: ${schedule.title}`,
                          message_type: 'reminder',
                          scheduled_for: scheduledFor.toISOString()
                        }
                      })

                    let inserted = 0
                    for (const msg of messageBatch) {
                      const { error: insertErr } = await supabase.from('messages').insert(msg)
                      if (insertErr) {
                        if (insertErr.code === '23505') continue
                        console.error('Error creating message:', insertErr)
                      } else {
                        inserted++
                      }
                    }
                    results.sent += inserted
                  }
                }
              } else {
                // Reminders disabled — delete existing pending messages
                await supabase
                  .from('messages')
                  .delete()
                  .eq('schedule_id', change.schedule_id)
                  .in('status', ['pending', 'scheduled'])
                results.sent++
              }
            }

            if (change.change_type === 'delete') {
              // Delete all pending/scheduled messages for this schedule
              await supabase
                .from('messages')
                .delete()
                .eq('schedule_id', change.schedule_id)
                .in('status', ['pending', 'scheduled'])
              results.sent++
            }

            // Mark as processed by server cron
            await supabase
              .from('schedule_change_log')
              .update({
                processed: true,
                processed_at: now.toISOString(),
                processed_by: 'server_cron'
              })
              .eq('id', change.id)

          } catch (changeError) {
            console.error(`Error processing schedule change ${change.id}:`, changeError)
            results.errors++
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error in send-reminder function:', error)
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// ─────────────────────────────────────────────────────────
// Message Builders (fallback when template not in DB)
// ─────────────────────────────────────────────────────────

function buildActivationMessage(event: any, participant: any): string {
  const dateStr = formatDate(event.start_date)
  const timeStr = formatTime(event.start_date)

  return `היי ${participant.first_name}! 🎉\n\nנרשמת בהצלחה לאירוע: ${event.name}\n\n📅 ${dateStr}\n🕐 ${timeStr}\n📍 ${event.venue_name || ''} ${event.venue_address || ''}\n\n📋 שלח "לוז" לצפייה בתוכנית האישית\n\nנתראה שם! 👋`
}

function buildWeekBeforeMessage(event: any, participant: any): string {
  const dateStr = formatDate(event.start_date)
  const timeStr = formatTime(event.start_date)

  return `היי ${participant.first_name}! ⏰\n\nעוד שבוע ל-${event.name}\n\n📅 ${dateStr}\n🕐 ${timeStr}\n📍 ${event.venue_name || ''} ${event.venue_address || ''}\n\n📋 שלח "לוז" לצפייה בתוכנית האישית\n\nמצפים לראותך! ✨`
}

function buildDayBeforeMessage(event: any, participant: any): string {
  const dateStr = formatDate(event.start_date)
  const timeStr = formatTime(event.start_date)

  return `היי ${participant.first_name}! 🔔\n\nתזכורת: מחר ${event.name}\n\n📅 ${dateStr}\n🕐 ${timeStr}\n📍 ${event.venue_name || ''} ${event.venue_address || ''}\n\n📋 שלח "לוז" לצפייה בתוכנית האישית\n\nנתראה מחר! 👋`
}

function buildMorningMessage(event: any, participant: any): string {
  const timeStr = formatTime(event.start_date)

  return `בוקר טוב ${participant.first_name}! ☀️\n\nהיום זה הזמן - ${event.name}\n\n🕐 ${timeStr}\n📍 ${event.venue_name || ''} ${event.venue_address || ''}\n\n📋 שלח "לוז" לצפייה בתוכנית האישית\n\nיום מעולה! 🎯`
}

function build15MinReminder(
  participant: { first_name: string; last_name: string },
  schedule: {
    title: string; description?: string; location?: string;
    room?: string; start_time: string; end_time: string;
    speaker_name?: string; track?: string
  },
  roomInfo?: { room_number: string; building?: string; floor?: string } | null
): string {
  const startTime = formatTime(schedule.start_time)
  const endTime = formatTime(schedule.end_time)

  let msg = `שלום ${participant.first_name} ${participant.last_name}! 👋\n\n`
  msg += `🔔 *בעוד 15 דקות:*\n\n`
  msg += `📌 *${schedule.title}*\n`
  msg += `🕐 ${startTime} - ${endTime}\n`

  if (schedule.location) {
    msg += `📍 ${schedule.location}`
    if (schedule.room) msg += ` - ${schedule.room}`
    msg += `\n`
  } else if (schedule.room) {
    msg += `🚪 ${schedule.room}\n`
  }

  if (schedule.speaker_name) {
    msg += `👤 ${schedule.speaker_name}\n`
  }

  if (schedule.description) {
    msg += `🎯 ${schedule.description}\n`
  }

  if (roomInfo) {
    msg += `\n🏨 *החדר שלך:* ${roomInfo.room_number}`
    if (roomInfo.building) msg += ` | ${roomInfo.building}`
    if (roomInfo.floor) msg += ` | קומה ${roomInfo.floor}`
    msg += `\n`
  }

  msg += `\n📋 שלח "לוז" לצפייה בתוכנית המלאה שלך`

  return msg
}

function buildEventEndMessage(event: any, participant: any): string {
  return `${participant.first_name} היקר/ה, 🙏\n\nתודה רבה על ההשתתפות ב-${event.name}!\n\nנשמח לשמוע מה חשבת על האירוע 💭\nמשוב שלך חשוב לנו ומשפר את האירועים הבאים.\n\nמקווים לראותך באירועים הבאים שלנו! ✨`
}

function buildFollowUp3moMessage(event: any, participant: any): string {
  return `שלום ${participant.first_name}! 👋\n\nעברו 3 חודשים מאז ${event.name}\n\nאיך אתה מרגיש/ה? האם יישמת משהו מהאירוע? 🌱\n\nנשמח לשמוע איך הלך לך 💬`
}

function buildFollowUp6moMessage(event: any, participant: any): string {
  return `היי ${participant.first_name}! 🌟\n\nחצי שנה עברה מאז ${event.name}\n\nנשמח לדעת מה השתנה מאז ✨\nיש לך משוב או רעיונות לאירועים הבאים? 💡\n\nתמיד טוב לשמוע ממך! 🙂`
}

async function sendWhatsApp(
  supabase: any,
  organizationId: string,
  phone: string,
  message: string,
  messageId?: string,
  skipQuotaCheck = false  // For test mode
): Promise<{ success: boolean; error?: string; quotaExceeded?: boolean }> {
  // Phase 2.1: Check tier quota before sending (unless skipped for test mode)
  if (!skipQuotaCheck) {
    const quotaResult = await checkOrgQuota(supabase, organizationId, 'whatsapp_messages')
    if (!quotaResult.allowed) {
      console.log(`WhatsApp quota exceeded for org ${organizationId}, tier: ${quotaResult.tier}, remaining: ${quotaResult.remaining}`)
      // Update message status to quota_exceeded if we have a messageId
      if (messageId) {
        await supabase.from('messages').update({
          status: 'failed',
          error_message: `Quota exceeded: ${quotaResult.remaining ?? 0} messages remaining in this period`,
          updated_at: new Date().toISOString()
        }).eq('id', messageId)
      }
      return { success: false, error: 'quota_exceeded', quotaExceeded: true }
    }
  }

  // Phase 5: Throttle — 2.1s between sends (~28 msgs/min, safely under 30/min limit)
  await new Promise(r => setTimeout(r, 2100))

  const doSend = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-whatsapp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({
          organization_id: organizationId,
          phone,
          message,
          message_id: messageId,
        }),
      })

      const result = await response.json()
      return result
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  let result = await doSend()

  // Phase 5: One retry for transient failures (network, rate limit, timeout)
  if (!result.success) {
    const err = (result.error || '').toLowerCase()
    const isTransient = err.includes('rate') || err.includes('timeout') || err.includes('network') || err.includes('fetch') || err.includes('429')

    if (isTransient) {
      // Wait 3s before retry
      await new Promise(r => setTimeout(r, 3000))

      // Track retry in database
      if (messageId) {
        await supabase.from('messages').update({
          retry_count: 1,
          last_retry_at: new Date().toISOString(),
        }).eq('id', messageId)
      }

      result = await doSend()
    }
  }

  return result
}
