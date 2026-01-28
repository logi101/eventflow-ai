// supabase/functions/send-whatsapp/index.ts
// Edge Function לשליחת הודעות WhatsApp דרך Green API
// FIXED: Proper AES encryption, CORS, input validation, error handling, rate limiting

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { checkRateLimit, getClientIdentifier, rateLimitExceededResponse, RATE_LIMITS, getRateLimitHeaders } from '../_shared/rate-limiter.ts'

// FIXED: Strict CORS - reject unknown origins
function getAllowedOrigins(): string[] {
  const origins: string[] = []
  const prodOrigin = Deno.env.get('ALLOWED_ORIGIN')
  if (prodOrigin) origins.push(prodOrigin)
  // Only allow localhost in development
  if (Deno.env.get('ENVIRONMENT') === 'development') {
    origins.push('http://localhost:5173')
  }
  return origins
}

function getCorsHeaders(origin: string | null): Record<string, string> | null {
  const allowedOrigins = getAllowedOrigins()
  if (!origin || !allowedOrigins.includes(origin)) {
    return null // Reject unknown origins
  }
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  }
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

// AES-GCM Decryption (proper encryption)
async function decryptCredentials(encryptedData: string, key: string): Promise<GreenApiCredentials> {
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  // Import key
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key.padEnd(32, '0').slice(0, 32)), // Ensure 256-bit key
    'AES-GCM',
    false,
    ['decrypt']
  )

  // Parse encrypted data (format: iv:ciphertext, both base64)
  const [ivBase64, ciphertextBase64] = encryptedData.split(':')
  if (!ivBase64 || !ciphertextBase64) {
    throw new Error('Invalid encrypted data format')
  }

  const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0))
  const ciphertext = Uint8Array.from(atob(ciphertextBase64), c => c.charCodeAt(0))

  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    keyMaterial,
    ciphertext
  )

  return JSON.parse(decoder.decode(decrypted))
}

// Input validation
function validatePhone(phone: string): boolean {
  // Israeli phone: 972 + 9 digits
  return /^972[0-9]{9}$/.test(phone)
}

function sanitizeMessage(message: string): string {
  // Remove any control characters except newlines
  return message.replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, '').trim()
}

serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  // FIXED: Reject unknown origins
  if (!corsHeaders) {
    return new Response(
      JSON.stringify({ error: 'CORS origin not allowed' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Verify encryption key exists
    const encryptionKey = Deno.env.get('ENCRYPTION_KEY')
    if (!encryptionKey || encryptionKey.length < 16) {
      console.error('ENCRYPTION_KEY not configured or too short')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body: SendMessageRequest = await req.json()
    const { organization_id, phone, message, message_id } = body

    // Rate limiting - check before processing
    const rateLimitResult = await checkRateLimit(supabase, {
      ...RATE_LIMITS.WHATSAPP,
      identifier: organization_id || getClientIdentifier(req),
      endpoint: 'send-whatsapp'
    })

    if (!rateLimitResult.allowed) {
      return rateLimitExceededResponse(rateLimitResult, corsHeaders)
    }

    // Validate required fields
    if (!organization_id || !phone || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: organization_id, phone, message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate UUID format for organization_id
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(organization_id)) {
      return new Response(
        JSON.stringify({ error: 'Invalid organization_id format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate phone format
    if (!validatePhone(phone)) {
      return new Response(
        JSON.stringify({ error: 'Invalid phone format. Expected: 972XXXXXXXXX' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Sanitize message
    const sanitizedMessage = sanitizeMessage(message)
    if (!sanitizedMessage) {
      return new Response(
        JSON.stringify({ error: 'Message cannot be empty' }),
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
      .maybeSingle() // FIXED: Use maybeSingle instead of single

    if (credError) {
      console.error('Failed to get Green API credentials:', credError)
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!credentials) {
      return new Response(
        JSON.stringify({ error: 'Green API not configured for this organization' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Decrypt credentials with AES-GCM
    let greenApiCreds: GreenApiCredentials
    try {
      greenApiCreds = await decryptCredentials(credentials.credentials_encrypted, encryptionKey)
    } catch (err) {
      console.error('Failed to decrypt credentials:', err)
      return new Response(
        JSON.stringify({ error: 'Failed to decrypt credentials' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const apiUrl = greenApiCreds.api_url || 'https://api.green-api.com'
    const endpoint = `${apiUrl}/waInstance${greenApiCreds.instance_id}/sendMessage/${greenApiCreds.api_token}`

    // Send message via Green API with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout

    let greenApiResponse: Response
    try {
      greenApiResponse = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: `${phone}@c.us`,
          message: sanitizedMessage,
        }),
        signal: controller.signal,
      })
    } catch (fetchError) {
      clearTimeout(timeoutId)
      console.error('Green API fetch error:', fetchError)

      // Update message status to failed
      if (message_id) {
        await supabase
          .from('messages')
          .update({
            status: 'failed',
            error_message: 'Network error: Failed to reach Green API',
          })
          .eq('id', message_id)
      }

      return new Response(
        JSON.stringify({ error: 'Failed to connect to Green API' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    clearTimeout(timeoutId)

    let greenApiResult: { idMessage?: string; message?: string }
    try {
      greenApiResult = await greenApiResponse.json()
    } catch {
      greenApiResult = { message: 'Invalid response from Green API' }
    }

    // Update message status in database if message_id provided
    if (message_id && uuidRegex.test(message_id)) {
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
        // FIXED: Direct update instead of broken RPC
        const { data: currentMsg } = await supabase
          .from('messages')
          .select('retry_count')
          .eq('id', message_id)
          .maybeSingle()

        await supabase
          .from('messages')
          .update({
            status: 'failed',
            error_message: greenApiResult.message || 'Unknown error',
            retry_count: (currentMsg?.retry_count || 0) + 1,
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
        { status: 200, headers: { ...corsHeaders, ...getRateLimitHeaders(rateLimitResult), 'Content-Type': 'application/json' } }
      )
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: greenApiResult.message || 'Failed to send message',
        }),
        { status: 400, headers: { ...corsHeaders, ...getRateLimitHeaders(rateLimitResult), 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('Error in send-whatsapp function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
