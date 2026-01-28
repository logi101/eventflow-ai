// supabase/functions/send-whatsapp/index.ts
// Edge Function לשליחת הודעות WhatsApp דרך Green API

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SendMessageRequest {
  organization_id: string
  phone: string           // International format: 972501234567
  message: string
  message_id?: string     // Optional: link to messages table
}

interface GreenApiCredentials {
  instance_id: string
  api_token: string
  api_url?: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { organization_id, phone, message, message_id }: SendMessageRequest = await req.json()

    // Validate input
    if (!organization_id || !phone || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: organization_id, phone, message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Green API credentials for this organization
    const { data: credentials, error: credError } = await supabase
      .from('api_credentials')
      .select('credentials_encrypted')
      .eq('organization_id', organization_id)
      .eq('service', 'green_api')
      .eq('is_active', true)
      .single()

    if (credError || !credentials) {
      console.error('Failed to get Green API credentials:', credError)
      return new Response(
        JSON.stringify({ error: 'Green API not configured for this organization' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Decrypt credentials
    // Note: In production, use proper encryption with ENCRYPTION_KEY env var
    let greenApiCreds: GreenApiCredentials
    
    try {
      // Simple decryption - in production use proper AES decryption
      greenApiCreds = JSON.parse(atob(credentials.credentials_encrypted))
    } catch {
      return new Response(
        JSON.stringify({ error: 'Failed to decrypt credentials' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const apiUrl = greenApiCreds.api_url || 'https://api.green-api.com'
    const endpoint = `${apiUrl}/waInstance${greenApiCreds.instance_id}/sendMessage/${greenApiCreds.api_token}`

    // Send message via Green API
    const greenApiResponse = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId: `${phone}@c.us`,
        message: message,
      }),
    })

    const greenApiResult = await greenApiResponse.json()

    // Update message status in database if message_id provided
    if (message_id) {
      if (greenApiResult.idMessage) {
        await supabase
          .from('messages')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            external_message_id: greenApiResult.idMessage,
          })
          .eq('id', message_id)
      } else {
        await supabase
          .from('messages')
          .update({
            status: 'failed',
            error_message: greenApiResult.message || 'Unknown error',
            retry_count: supabase.rpc('increment_retry_count', { msg_id: message_id }),
          })
          .eq('id', message_id)
      }
    }

    if (greenApiResult.idMessage) {
      return new Response(
        JSON.stringify({
          success: true,
          message_id: greenApiResult.idMessage,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: greenApiResult.message || 'Failed to send message',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('Error in send-whatsapp function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
