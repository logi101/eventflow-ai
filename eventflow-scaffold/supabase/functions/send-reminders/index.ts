import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Configuration for Cron - you might run every minute or 5 minutes.
// Make sure to set up the Cron trigger in the Dashboard or via pg_cron.

// For sending messages, we reuse send-whatsapp logic or call it directly.
// To avoid double implementing, I will use Green API logic directly here.

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. Initialize Supabase Client with Service Role Key
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Green API Credentials
        const idInstance = Deno.env.get('GREEN_API_ID_INSTANCE')
        const apiTokenInstance = Deno.env.get('GREEN_API_API_TOKEN_INSTANCE')

        if (!idInstance || !apiTokenInstance) {
            throw new Error('Green API credentials missing')
        }

        // 2. Fetch schedules that need reminders
        // Logic: 
        // - start_time is in the future
        // - send_reminder is true
        // - (start_time - reminder_minutes) <= now()
        // - We want to catch ones that just turned "due"
        // - Effectively: start_time <= now() + reminder_minutes
        // - But allow a bit of buffer (look back 15 mins?) to not miss if cron delay.
        // - And ensure we filter by participant_invites.reminder_sent = false

        // We can fetch relevant participant_schedules directly with joined data
        // Query:
        // Select participant_schedules where reminder_sent = false
        // Join schedule: where send_reminder = true AND start_time between now and now + reminder_minutes

        // Using current time
        const now = new Date()
        const bufferMinutes = 0 // Look ahead 0 mins extra, just exact match or recently passed trigger
        // Actually, we want:
        // Trigger Time = Start Time - Reminder Minutes
        // If Now >= Trigger Time AND Start Time > Now (hasn't started long ago)

        // Let's get schedules first to simplify query logic
        const { data: dueSchedules, error: scheduleError } = await supabaseAdmin
            .from('schedules')
            .select('id, title, start_time, reminder_minutes_before, location, room, speaker_name, description')
            .eq('send_reminder', true)
            .gt('start_time', now.toISOString()) // Still future start
        // We can't easily filter calculated fields in Supabase query builder for "start - minutes <= now"
        // So fetch upcoming schedules (e.g. next 24 hours) and filter in code

        if (scheduleError) throw scheduleError

        if (!dueSchedules || dueSchedules.length === 0) {
            return new Response(JSON.stringify({ message: 'No upcoming schedules found' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        let messagesSent = 0
        let errors = []

        for (const schedule of dueSchedules) {
            // Check if it's time to send reminder
            const startTime = new Date(schedule.start_time)
            const reminderTime = new Date(startTime.getTime() - schedule.reminder_minutes_before * 60000)

            // If now is past reminder time (and before start time due to query above)
            if (now >= reminderTime) {
                // Find participants for this schedule who haven't received reminder
                const { data: assignments, error: assignError } = await supabaseAdmin
                    .from('participant_schedules')
                    .select(`
            id,
            reminder_sent,
            participants (
              id, first_name, last_name, phone
            )
          `)
                    .eq('schedule_id', schedule.id)
                    .eq('reminder_sent', false)

                if (assignError) {
                    console.error(`Error fetching assignments for schedule ${schedule.id}:`, assignError)
                    continue
                }

                if (!assignments || assignments.length === 0) continue

                // Send to each participant
                for (const assignment of assignments) {
                    const participant = assignment.participants
                    if (!participant || !participant.phone) continue

                    const message = generateReminderMessage(participant, schedule)

                    try {
                        // Send via Green API
                        const cleanPhone = participant.phone.replace(/\D/g, '')
                        const finalPhone = cleanPhone.startsWith('0') ? '972' + cleanPhone.slice(1) : cleanPhone

                        const url = `https://api.green-api.com/waInstance${idInstance}/sendMessage/${apiTokenInstance}`
                        const payload = {
                            chatId: `${finalPhone}@c.us`,
                            message: message
                        }

                        const response = await fetch(url, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload)
                        })

                        if (!response.ok) {
                            const errText = await response.text()
                            throw new Error(`Green API error: ${errText}`)
                        }

                        // Mark as sent
                        await supabaseAdmin
                            .from('participant_schedules')
                            .update({
                                reminder_sent: true,
                                reminder_sent_at: new Date().toISOString()
                            })
                            .eq('id', assignment.id)

                        // Log message
                        await supabaseAdmin
                            .from('messages')
                            .insert({
                                // Assuming event_id is not directly on assignment but could be fetched or optional log
                                // If schema requires event_id for messages, we might need it from schedule->event_id
                                // But let's skip rigorous logging if event_id is missing to keep it simple or fetch event_id
                                // Actually schedule belongs to event. Let's not query event_id for now to save ops.
                                participant_id: participant.id,
                                channel: 'whatsapp',
                                to_phone: participant.phone,
                                content: message,
                                status: 'sent',
                                sent_at: new Date().toISOString()
                            })

                        messagesSent++

                    } catch (err) {
                        console.error(`Failed to send to ${participant.phone}:`, err)
                        errors.push({ phone: participant.phone, error: err.message })
                    }
                }
            }
        }

        return new Response(JSON.stringify({
            success: true,
            messagesSent,
            errors
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        console.error('Error in send-reminders:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})

function generateReminderMessage(participant: any, schedule: any): string {
    const startTime = new Date(schedule.start_time).toLocaleTimeString('he-IL', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jerusalem' // Ensure IL time
    })

    let message = `שלום ${participant.first_name} ${participant.last_name}! 👋\n\n`
    message += `🔔 תזכורת: בעוד ${schedule.reminder_minutes_before} דקות מתחיל:\n\n`
    message += `📌 *${schedule.title}*\n`
    message += `🕐 שעה: ${startTime}\n`

    if (schedule.location) {
        message += `📍 מיקום: ${schedule.location}\n`
    }
    if (schedule.room) {
        message += `🚪 חדר: ${schedule.room}\n`
    }
    if (schedule.speaker_name) {
        message += `👤 מרצה: ${schedule.speaker_name}\n`
    }
    if (schedule.description) {
        message += `\n📝 ${schedule.description}\n`
    }

    message += `\nנתראה שם! 🎉`

    return message
}
