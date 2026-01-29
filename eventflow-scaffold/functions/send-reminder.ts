// supabase/functions/send-reminder/index.ts
// Edge Function לשליחת תזכורות אוטומטיות - מופעל על ידי Cron Job

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS - only allow internal calls (from Supabase cron)
const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('SUPABASE_URL') || '',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ReminderJob {
  mode?: 'test'
  type: 'day_before' | 'morning' | '15_min'
  test_phone?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { mode, type, test_phone }: ReminderJob = await req.json()
    const now = new Date()
    let results = { processed: 0, sent: 0, errors: 0 }

    // Handle test mode
    if (mode === 'test') {
      // Fetch event
      const { data: event } = await supabase
        .from('events')
        .select('id, name, start_date, venue_name, venue_address')
        .eq('id', test_phone)
        .single()

      if (!event) {
        return new Response(
          JSON.stringify({ success: false, error: 'Event not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Build message based on type
      const eventDate = new Date(event.start_date)
      const formattedDate = eventDate.toLocaleDateString('he-IL', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      })
      const formattedTime = eventDate.toLocaleTimeString('he-IL', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })

      const location = [event.venue_name, event.venue_address]
        .filter(Boolean)
        .join(', ')
        .trim() || 'לא צוין מיקום'

      let message = ''
      const messageType = `reminder_${type}`

      // Try to get template from database
      const { data: template } = await supabase
        .from('message_templates')
        .select('content')
        .eq('message_type', messageType)
        .eq('is_active', true)
        .maybeSingle()

      if (template?.content) {
        // Substitute variables in template
        message = template.content
        const variables = {
          participant_name: 'דוגמה משתתף/ת',
          event_name: event.name,
          event_date: formattedDate,
          event_time: formattedTime,
          event_location: location
        }
        Object.entries(variables).forEach(([key, value]) => {
          message = message.replace(new RegExp(`{{${key}}}`, 'g'), value)
        })
      } else {
        // Build fallback message
        const participantName = 'דוגמה משתתף/ת'

        const messages: Record<string, string> = {
          activation: `היי ${participantName}! 🎉

נרשמת בהצלחה לאירוע: ${event.name}

📅 ${formattedDate}
🕐 ${formattedTime}
📍 ${location}

אנחנו מתרגשים לראות אותך!`,

          day_before: `היי ${participantName}! 🔔

תזכורת: מחר ${event.name}!

📅 ${formattedDate}
🕐 ${formattedTime}
📍 ${location}

אל תשכח להגיע בזמן!`,

          morning: `בוקר טוב ${participantName}! ☀️

היום זה הזמן - ${event.name}!

🕐 ${formattedTime}
📍 ${location}

תזכורת אחרונה - אל תפספס את האירוע המיוחד!`,

          '15_min': `שלום ${participantName}! 👋

🔔 בעוד 15 דקות נפתח את ${event.name}!

📍 ${location}

אנחנו מחכים לך!`,

          event_end: `${participantName} היקר/ה, 🙏

תודה רבה על ההשתתפות ב-${event.name}!

היינו שמחים לראות אותך ומקווים שהאירוע עמד בציפיות שלך. נשמח לראות אותך שוב באירועים הבאים!`,

          follow_up_3mo: `שלום ${participantName}! 👋

עברו 3 חודשים מאז ${event.name}.

אנחנו מקווים שהאירוע היה מוצלח ומקווים לראות אותך שוב באירועים הבאים שלנו!`,

          follow_up_6mo: `היי ${participantName}! 🌟

חצי שנה עברה מאז ${event.name}.

אנחנו מקווים שהאירוע היה מוצלח ומקווים לראות אותך שוב באירועים הבאים שלנו!`
        }

        message = messages[type] || messages.activation
      }

      // Send the test message
      const sendResult = await sendWhatsApp(
        supabase,
        event.organization_id || '',
        test_phone,
        message
      )

      return new Response(
        JSON.stringify({ success: sendResult.success, message }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Continue with normal reminder processing

    if (type === 'day_before') {
      // Find events happening tomorrow
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

          for (const participant of event.participants || []) {
            if (participant.status !== 'confirmed') continue

            results.processed++

            // Check if reminder already sent - FIXED: use maybeSingle
            const { data: existingMsg } = await supabase
              .from('messages')
              .select('id')
              .eq('event_id', event.id)
              .eq('participant_id', participant.id)
              .eq('type', 'reminder_day_before')
              .maybeSingle()

            if (existingMsg) continue

            // Create message
            const message = buildDayBeforeMessage(event, participant)
            
            const { data: msgData, error: msgError } = await supabase
              .from('messages')
              .insert({
                event_id: event.id,
                participant_id: participant.id,
                type: 'reminder_day_before',
                channel: 'whatsapp',
                recipient_name: participant.first_name,
                recipient_phone: participant.phone_normalized,
                content: message,
                status: 'pending',
              })
              .select()
              .maybeSingle()

            if (msgError || !msgData) {
              results.errors++
              continue
            }

            // Send via WhatsApp
            const sendResult = await sendWhatsApp(
              supabase,
              event.organization_id,
              participant.phone_normalized,
              message,
              msgData.id
            )

            if (sendResult.success) {
              results.sent++
            } else {
              results.errors++
            }

            // Send to companion if exists
            if (participant.has_companion && participant.companion_phone_normalized) {
              const companionMessage = buildDayBeforeMessage(event, {
                first_name: participant.companion_name || 'אורח/ת',
              })

              await supabase
                .from('messages')
                .insert({
                  event_id: event.id,
                  participant_id: participant.id,
                  type: 'reminder_day_before',
                  channel: 'whatsapp',
                  recipient_name: participant.companion_name,
                  recipient_phone: participant.companion_phone_normalized,
                  content: companionMessage,
                  is_companion: true,
                  status: 'pending',
                })

              await sendWhatsApp(
                supabase,
                event.organization_id,
                participant.companion_phone_normalized,
                companionMessage
              )
            }
          }
        }
      }
    }

    if (type === 'morning') {
      // Find events happening today
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

          for (const participant of event.participants || []) {
            if (participant.status !== 'confirmed') continue

            results.processed++

            // FIXED: use maybeSingle
            const { data: existingMsg } = await supabase
              .from('messages')
              .select('id')
              .eq('event_id', event.id)
              .eq('participant_id', participant.id)
              .eq('type', 'reminder_morning')
              .maybeSingle()

            if (existingMsg) continue

            const message = buildMorningMessage(event, participant)
            
            const { data: msgData } = await supabase
              .from('messages')
              .insert({
                event_id: event.id,
                participant_id: participant.id,
                type: 'reminder_morning',
                channel: 'whatsapp',
                recipient_name: participant.first_name,
                recipient_phone: participant.phone_normalized,
                content: message,
                status: 'pending',
              })
              .select()
              .maybeSingle()

            if (!msgData) {
              results.errors++
              continue
            }

            const sendResult = await sendWhatsApp(
              supabase,
              event.organization_id,
              participant.phone_normalized,
              message,
              msgData?.id
            )

            if (sendResult.success) results.sent++
            else results.errors++
          }
        }
      }
    }

    if (type === '15_min') {
      // Find sessions starting in 15-20 minutes
      const in15min = new Date(now.getTime() + 15 * 60 * 1000)
      const in20min = new Date(now.getTime() + 20 * 60 * 1000)

      const { data: schedules } = await supabase
        .from('schedules')
        .select(`
          id, title, location, start_time, event_id,
          events!inner (organization_id, settings),
          participant_schedules (
            id, participant_id, reminder_sent,
            participants (id, first_name, phone_normalized)
          )
        `)
        .gte('start_time', in15min.toISOString())
        .lt('start_time', in20min.toISOString())
        .eq('send_reminder', true)

      if (schedules) {
        for (const schedule of schedules) {
          if (!schedule.events?.settings?.reminder_15min) continue

          for (const ps of schedule.participant_schedules || []) {
            if (ps.reminder_sent) continue

            results.processed++

            const message = `${ps.participants.first_name}, בעוד 15 דקות: ${schedule.title} 📍${schedule.location || ''}`

            const sendResult = await sendWhatsApp(
              supabase,
              schedule.events.organization_id,
              ps.participants.phone_normalized,
              message
            )

            if (sendResult.success) {
              results.sent++
              await supabase
                .from('participant_schedules')
                .update({ reminder_sent: true, reminder_sent_at: now.toISOString() })
                .eq('id', ps.id)
            } else {
              results.errors++
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in send-reminder function:', error)
    // FIXED: Type-safe error handling
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Helper functions
function buildDayBeforeMessage(event: any, participant: any): string {
  const eventDate = new Date(event.start_date)
  const dateStr = eventDate.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })
  const timeStr = eventDate.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })

  return `היי ${participant.first_name}! 🔔

תזכורת: מחר ${event.name}

📅 ${dateStr}
🕐 ${timeStr}
📍 ${event.venue_name || ''} ${event.venue_address || ''}

נתראה מחר! 👋`
}

function buildMorningMessage(event: any, participant: any): string {
  const eventDate = new Date(event.start_date)
  const timeStr = eventDate.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })

  return `בוקר טוב ${participant.first_name}! ☀️

היום זה הזמן - ${event.name}

🕐 ${timeStr}
📍 ${event.venue_name || ''} ${event.venue_address || ''}

יום מעולה! 🎯`
}

async function sendWhatsApp(
  supabase: any,
  organizationId: string,
  phone: string,
  message: string,
  messageId?: string
): Promise<{ success: boolean; error?: string }> {
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
    // FIXED: Type-safe error handling
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: errorMessage }
  }
}
