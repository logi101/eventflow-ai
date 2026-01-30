import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { phone, message } = await req.json()

        if (!phone || !message) {
            throw new Error('Missing phone or message')
        }

        // Green API Credentials from Supabase Secrets
        const idInstance = Deno.env.get('GREEN_API_ID_INSTANCE')
        const apiTokenInstance = Deno.env.get('GREEN_API_API_TOKEN_INSTANCE')

        if (!idInstance || !apiTokenInstance) {
            throw new Error('Green API credentials not configured in Supabase Secrets')
        }

        // Helper: Normalize phone to international format without +
        const cleanPhone = phone.replace(/\D/g, '')
        // Assume 972 default if starts with 0
        const finalPhone = cleanPhone.startsWith('0') ? '972' + cleanPhone.slice(1) : cleanPhone

        const url = `https://api.green-api.com/waInstance${idInstance}/sendMessage/${apiTokenInstance}`

        console.log(`Sending message to ${finalPhone}...`)

        const payload = {
            chatId: `${finalPhone}@c.us`,
            message: message
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })

        const result = await response.json()

        if (!response.ok) {
            throw new Error(`Green API Error: ${JSON.stringify(result)}`)
        }

        return new Response(JSON.stringify({ success: true, data: result }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (error) {
        console.error('Error sending WhatsApp:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
