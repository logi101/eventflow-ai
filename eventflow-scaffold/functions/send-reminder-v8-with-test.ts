// supabase/functions/send-reminder/index.ts
// Edge Function v8 - Added test mode support
// Version: v8 (test mode + templates from v7)
// Deploy via: MCP deploy_edge_function with project_id: byhohetafnhlakqbydbj

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ReminderJob {
  type: 'activation' | 'week_before' | 'day_before' | 'morning' | '15min' | 'event_end' | 'follow_up_3mo' | 'follow_up_6mo'
}

// Template utility functions (from v7)
async function getMessageTemplate(supabase: any, organizationId: string | null, messageType: string) {
  // Try org-specific template first
  if (organizationId) {
    const { data } = await supabase
      .from('message_templates')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('message_type', messageType)
      .eq('is_active', true)
      .maybeSingle()

    if (data) return data.content
  }

  // Fall back to system template
  const { data } = await supabase
    .from('message_templates')
    .select('*')
    .is('organization_id', null)
    .eq('message_type', messageType)
    .eq('is_active', true)
    .eq('is_system', true)
    .maybeSingle()

  return data?.content || null
}

function substituteVariables(template: string, variables: Record<string, string>): string {
  let result = template
  Object.entries(variables).forEach(([key, value]) => {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value)
  })
  return result
}

function buildEventVariableMap(event: any, participant: any): Record<string, string> {
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

  return {
    participant_name: participant.first_name || 'משתתף/ת',
    event_name: event.name,
    event_date: formattedDate,
    event_time: formattedTime,
    event_location: location
  }
}

function buildScheduleVariableMap(schedule: any, participant: any): Record<string, string> {
  const startTime = new Date(schedule.start_time)
  const formattedTime = startTime.toLocaleTimeString('he-IL', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })

  return {
    participant_name: participant.first_name || 'משתתף/ת',
    session_name: schedule.title,
    session_time: formattedTime,
    session_location: schedule.location || 'לא צוין מיקום'
  }
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

    const body = await req.json()

    // ═══════════════════════════════════════════════════════════════════════════
    // TEST MODE HANDLER (NEW in v8)
    // ═══════════════════════════════════════════════════════════════════════════
    if (body.mode === 'test') {
      const { event_id, test_phone, type: reminderType } = body

      if (!event_id || !test_phone) {
        return new Response(JSON.stringify({ success: false, message: 'Missing event_id or test_phone' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        })
      }

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

      // Send via send-whatsapp function
      const whatsappResponse = await fetch(
        `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-whatsapp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
          },
          body: JSON.stringify({
            to: test_phone,
            message: message,
            organization_id: event.organization_id
          })
        }
      )

      // Log test message to messages table with is_test flag
      await supabase.from('messages').insert({
        event_id: event.id,
        participant_id: null,
        message_type: `reminder_${reminderType || 'activation'}`,
        subject: `test_reminder_${reminderType || 'activation'}`,
        content: message,
        recipient_phone: test_phone,
        status: whatsappResponse.ok ? 'sent' : 'failed',
        channel: 'whatsapp',
        metadata: { is_test: true }
      })

      return new Response(JSON.stringify({
        success: whatsappResponse.ok,
        message: whatsappResponse.ok ? 'Test message sent' : 'Failed to send test message'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PRODUCTION MODE (existing v7 logic continues below)
    // ═══════════════════════════════════════════════════════════════════════════
    const { type }: ReminderJob = body
    const now = new Date()
    let results = { processed: 0, sent: 0, errors: 0 }

    // [... rest of v7 production reminder logic would continue here ...]
    // This file is a reference implementation showing where test mode inserts

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in send-reminder function:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
