// supabase/functions/send-whatsapp/index.ts
// Internal edge function — sends a WhatsApp message via Green API.
// Called by: send-reminder, budget-alerts, PublicRsvpPage (server-side).
// Auth: service-role JWT  OR  x-cron-secret header (CRON_SECRET env var).
// NOT meant to be called directly from the browser.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// ─── CORS ────────────────────────────────────────────────────────────────────
// This is an internal endpoint; we mirror the same dynamic-origin pattern used
// by budget-alerts so that in-browser fetch (e.g. test-mode) still works.

function isAllowedOrigin(origin: string): boolean {
  if (origin === 'https://eventflow-ai-prod.web.app') return true
  if (origin === 'https://eventflow-ai-prod.firebaseapp.com') return true
  const configured = Deno.env.get('ALLOWED_ORIGIN')
  if (configured && origin === configured) return true
  if (origin.startsWith('http://localhost:')) return true
  return false
}

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin =
    origin && isAllowedOrigin(origin)
      ? origin
      : 'https://eventflow-ai-prod.web.app'
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-cron-secret',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  }
}

// ─── Phone normalisation ─────────────────────────────────────────────────────
// Strips non-digit chars, ensures leading country-code digits.
// Israeli numbers: 05X → 9725X. Numbers already starting with a CC are left as-is.

function normalizePhone(raw: string): string {
  // Remove spaces, dashes, parentheses, plus sign
  let digits = raw.replace(/[\s\-().+]/g, '')

  // Israeli mobile shorthand: 05X… → 9725X…
  if (/^05\d{8}$/.test(digits)) {
    digits = '972' + digits.slice(1) // drop leading 0
  }

  // If no country code yet (8-9 digit number), prepend Israeli CC as fallback
  if (/^\d{8,9}$/.test(digits)) {
    digits = '972' + digits
  }

  return digits
}

// ─── Request body ─────────────────────────────────────────────────────────────
// Accept both call-site conventions:
//   send-reminder → { phone, message, organization_id, message_id? }
//   budget-alerts → { recipientPhone, message, eventId? }

interface SendWhatsAppRequest {
  phone?: string
  recipientPhone?: string   // alias used by budget-alerts
  message: string
  organization_id?: string
  message_id?: string
  instance?: string         // optional override for multi-tenant scenarios
}

// ─── Green API call with retries ──────────────────────────────────────────────

interface GreenApiResult {
  success: boolean
  messageId?: string
  error?: string
}

async function callGreenApi(
  phone: string,
  message: string,
  instance: string,
  token: string,
  maxRetries = 2
): Promise<GreenApiResult> {
  const endpoint = `https://api.green-api.com/waInstance${instance}/sendMessage/${token}`
  const chatId = `${phone}@c.us`

  let lastError = ''

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      // 1 second delay between retries
      await new Promise((r) => setTimeout(r, 1000))
    }

    try {
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, message }),
      })

      // Green API returns 200 on success with { idMessage: "..." }
      if (!resp.ok) {
        lastError = `Green API HTTP ${resp.status}`
        console.error(`[send-whatsapp] attempt ${attempt + 1} failed: ${lastError}`)
        continue
      }

      const json = await resp.json()

      if (json.idMessage) {
        return { success: true, messageId: json.idMessage }
      }

      // Green API error body: { message: "...", code: N }
      lastError = json.message || json.error || 'Unknown Green API error'
      console.error(`[send-whatsapp] attempt ${attempt + 1} Green API error:`, json)

    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
      console.error(`[send-whatsapp] attempt ${attempt + 1} fetch error:`, lastError)
    }
  }

  return { success: false, error: lastError }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // ── Authentication ─────────────────────────────────────────────────────────
  // Accept either:
  //   1. x-cron-secret header matching CRON_SECRET env var
  //   2. Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>  (inter-function calls)

  const cronSecret = Deno.env.get('CRON_SECRET')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

  const xCronSecret = req.headers.get('x-cron-secret')
  const authHeader = req.headers.get('authorization') ?? ''
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

  const isCronAuth = cronSecret ? xCronSecret === cronSecret : false
  const isServiceRole = bearerToken === serviceRoleKey && serviceRoleKey.length > 0

  if (!isCronAuth && !isServiceRole) {
    console.error('[send-whatsapp] Unauthorized request — no valid cron secret or service-role key')
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // ── Parse body ─────────────────────────────────────────────────────────────
  let body: SendWhatsAppRequest
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Resolve phone from either field name
  const rawPhone = body.phone ?? body.recipientPhone ?? ''
  const { message } = body

  if (!rawPhone || !message) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields: phone (or recipientPhone) and message' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // ── Resolve Green API credentials ──────────────────────────────────────────
  // Prefer per-request instance override, then env vars.
  const instance = body.instance ?? Deno.env.get('GREEN_API_INSTANCE') ?? ''
  const token = Deno.env.get('GREEN_API_TOKEN') ?? ''

  if (!instance || !token) {
    console.error('[send-whatsapp] GREEN_API_INSTANCE or GREEN_API_TOKEN not configured')
    return new Response(
      JSON.stringify({ error: 'WhatsApp integration not configured (missing env vars)' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // ── Normalise phone ────────────────────────────────────────────────────────
  const phone = normalizePhone(rawPhone)

  if (!/^\d{7,15}$/.test(phone)) {
    return new Response(
      JSON.stringify({ error: `Invalid phone number after normalisation: ${phone}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // ── Call Green API ─────────────────────────────────────────────────────────
  console.log(`[send-whatsapp] Sending to ${phone.slice(0, 6)}*** (instance ${instance})`)

  const result = await callGreenApi(phone, message, instance, token)

  if (result.success) {
    console.log(`[send-whatsapp] Sent successfully, idMessage=${result.messageId}`)
    return new Response(
      JSON.stringify({ success: true, messageId: result.messageId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  console.error(`[send-whatsapp] All attempts failed: ${result.error}`)
  return new Response(
    JSON.stringify({ success: false, error: result.error }),
    { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
