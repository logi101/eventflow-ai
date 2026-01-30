import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { eventId, target } = await req.json()

        if (!eventId) {
            throw new Error('Event ID is required')
        }

        let table = ''
        if (target === 'schedule') {
            table = 'schedules'
        } else if (target === 'participants') {
            table = 'participants'
        } else {
            throw new Error('Invalid target. Must be "schedule" or "participants"')
        }

        // First delete dependent records if needed (assignments)
        if (target === 'schedule') {
            // Delete assignments linked to schedules of this event
            // This requires a more complex query or relying on cascade delete
            // Assuming cascade delete is set up on FKs, simple delete on schedules is enough
            // But to be safe:
            // Identify schedules to delete
            const { data: schedules } = await supabaseClient
                .from('schedules')
                .select('id')
                .eq('event_id', eventId)

            const scheduleIds = schedules?.map(s => s.id) || []

            if (scheduleIds.length > 0) {
                await supabaseClient
                    .from('participant_schedules')
                    .delete()
                    .in('schedule_id', scheduleIds)
            }
        } else if (target === 'participants') {
            // Delete assignments linked to participants of this event
            const { data: parts } = await supabaseClient
                .from('participants')
                .select('id')
                .eq('event_id', eventId)

            const partIds = parts?.map(p => p.id) || []

            if (partIds.length > 0) {
                await supabaseClient
                    .from('participant_schedules')
                    .delete()
                    .in('participant_id', partIds)
            }
        }

        // Now delete the main records
        const { error } = await supabaseClient
            .from(table)
            .delete()
            .eq('event_id', eventId)

        if (error) throw error

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
