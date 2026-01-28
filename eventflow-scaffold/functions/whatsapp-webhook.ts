// supabase/functions/whatsapp-webhook/index.ts
// whatsapp-webhook v8 - Keyword Auto-Reply with 8 Safety Layers
//
// ╔══════════════════════════════════════════════════════════════════╗
// ║  8 SAFETY LAYERS (all must pass before any reply is sent):      ║
// ║  1. GROUP FILTER: @g.us → IGNORE immediately                   ║
// ║  2. PHONE VALIDATION: must match /^972[0-9]{9}$/                ║
// ║  3. PARTICIPANT LOOKUP + EVENT ACTIVE check                     ║
// ║  4. OPENING MESSAGE CHECK: prior outgoing message required      ║
// ║  5. KEYWORD MATCH: exact match only (לוז/תוכנית/עזרה/help)     ║
// ║  6. REPLY TARGET = SENDER: always reply to incoming chatId      ║
// ║  7. RATE LIMIT: max 3 auto-replies per participant per hour     ║
// ║  8. CIRCUIT BREAKER: max 20 total auto-replies in 10 min        ║
// ╚══════════════════════════════════════════════════════════════════╝
//
// MODES:
//   PHASE 2 (current): Live + allowlist (972504394292 only)
//   WEBHOOK_DRY_RUN=true        → dry-run (sends nothing)
//   TEST_PHONE_ALLOWLIST=972... → override allowlist (default: 972504394292)
//
// WHAT THIS VERSION DOES:
// - Everything v7 does (outgoing status tracking, incoming message logging)
// - Keyword-based auto-reply to registered participants
// - 8 independent safety layers — all must pass for a reply to be sent
// - If ANY layer fails → silent ignore (message already logged)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─── Configuration ──────────────────────────────────────────────────────────

const WEBHOOK_VERSION = 'v8'
// PHASE 2: Live mode with allowlist — only test phone gets real replies
const DRY_RUN = Deno.env.get('WEBHOOK_DRY_RUN') === 'true'
const WEBHOOK_MODE = DRY_RUN ? 'dry-run' : 'live'

// Test phone allowlist — Phase 2: only this phone receives real auto-replies
// All other participants get would_reply logged but no WhatsApp sent
const HARDCODED_ALLOWLIST = '972556868288,972504394292'
const TEST_PHONE_ALLOWLIST = (Deno.env.get('TEST_PHONE_ALLOWLIST') || HARDCODED_ALLOWLIST)
  .split(',')
  .map((p: string) => p.trim())
  .filter(Boolean)
const ALLOWLIST_ACTIVE = TEST_PHONE_ALLOWLIST.length > 0

// Safety thresholds
const RATE_LIMIT_PER_HOUR = 3
const CIRCUIT_BREAKER_THRESHOLD = 20
const CIRCUIT_BREAKER_WINDOW_MIN = 10

// ─── Types ──────────────────────────────────────────────────────────────────

type KeywordIntent = 'personal_schedule' | 'general_schedule' | 'help'

interface GreenApiCredentials {
  instance_id: string
  api_token: string
  api_url?: string
}

// ─── Response Helper ────────────────────────────────────────────────────────

const RESPONSE_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function ok(data: Record<string, unknown>): Response {
  return new Response(JSON.stringify(data), { status: 200, headers: RESPONSE_HEADERS })
}

// ─── Supabase Client ────────────────────────────────────────────────────────

function getSupabaseClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )
}

// ─── Keyword Matching ───────────────────────────────────────────────────────
// Exact match only after trimming. Longer phrases checked first to prevent
// "לוז כללי" from matching "לוז".

const KEYWORD_MAP: Array<{ keywords: string[]; intent: KeywordIntent }> = [
  { keywords: ['לוז כללי', 'תוכנית כללית'], intent: 'general_schedule' },
  { keywords: ['לוז', 'תוכנית'], intent: 'personal_schedule' },
  { keywords: ['עזרה', 'help'], intent: 'help' },
]

function matchKeyword(text: string): KeywordIntent | null {
  const normalized = text.trim()
  for (const entry of KEYWORD_MAP) {
    for (const kw of entry.keywords) {
      if (normalized === kw) return entry.intent
    }
  }
  return null
}

// ─── Credential Loading ────────────────────────────────────────────────────
// Loads Green API credentials from api_credentials table.
// Supports two storage formats:
//   1. Plain base64 JSON (no colon) — decoded directly
//   2. AES-GCM encrypted (iv:ciphertext) — requires ENCRYPTION_KEY

async function loadCredentials(storedData: string): Promise<GreenApiCredentials> {
  // Format detection: AES-GCM encrypted data has format "iv:ciphertext"
  if (!storedData.includes(':')) {
    // Plain base64 JSON — decode directly
    const json = atob(storedData)
    return JSON.parse(json)
  }

  // AES-GCM encrypted — requires ENCRYPTION_KEY
  const encryptionKey = Deno.env.get('ENCRYPTION_KEY')
  if (!encryptionKey || encryptionKey.length < 16) {
    throw new Error('ENCRYPTION_KEY required for encrypted credentials')
  }

  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(encryptionKey.padEnd(32, '0').slice(0, 32)),
    'AES-GCM',
    false,
    ['decrypt']
  )

  const [ivBase64, ciphertextBase64] = storedData.split(':')
  if (!ivBase64 || !ciphertextBase64) {
    throw new Error('Invalid encrypted data format')
  }

  const iv = Uint8Array.from(atob(ivBase64), (c: string) => c.charCodeAt(0))
  const ciphertext = Uint8Array.from(atob(ciphertextBase64), (c: string) => c.charCodeAt(0))

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    keyMaterial,
    ciphertext
  )

  return JSON.parse(decoder.decode(decrypted))
}

// ─── Time Formatting ────────────────────────────────────────────────────────

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString('he-IL', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Jerusalem',
  })
}

// ─── Response Builders ──────────────────────────────────────────────────────

function buildHelpResponse(): string {
  return [
    '*תפריט עזרה*',
    '',
    'שלחו אחת מהמילים הבאות:',
    '*לוז* - התוכנית האישית שלכם',
    '*לוז כללי* - תוכנית האירוע המלאה',
    '*עזרה* - תפריט זה',
  ].join('\n')
}

function buildPersonalScheduleResponse(
  eventName: string,
  sessions: Array<{ title: string; start_time: string; end_time: string; location?: string; room?: string }>
): string {
  if (sessions.length === 0) {
    return [
      `*${eventName}*`,
      '',
      'לא נמצא לוז אישי עבורך.',
      'נסו לשלוח *לוז כללי* לתוכנית האירוע המלאה.',
    ].join('\n')
  }

  const lines = [`*הלוז האישי שלך - ${eventName}*`, '']
  for (const s of sessions) {
    lines.push(`${formatTime(s.start_time)}-${formatTime(s.end_time)} | ${s.title}`)
    if (s.location || s.room) {
      const loc = [s.location, s.room].filter(Boolean).join(', ')
      lines.push(loc)
    }
    lines.push('')
  }
  return lines.join('\n').trim()
}

function buildGeneralScheduleResponse(
  eventName: string,
  sessions: Array<{ title: string; start_time: string; end_time: string; location?: string; room?: string; speaker_name?: string }>
): string {
  if (sessions.length === 0) {
    return `*${eventName}*\n\nלא נמצאו סשנים לאירוע זה.`
  }

  const lines = [`*תוכנית האירוע - ${eventName}*`, '']
  for (const s of sessions) {
    lines.push(`${formatTime(s.start_time)}-${formatTime(s.end_time)} | ${s.title}`)
    const details: string[] = []
    if (s.location || s.room) {
      details.push([s.location, s.room].filter(Boolean).join(', '))
    }
    if (s.speaker_name) {
      details.push(s.speaker_name)
    }
    if (details.length) lines.push(details.join(' | '))
    lines.push('')
  }
  return lines.join('\n').trim()
}

// ─── Green API Direct Send ──────────────────────────────────────────────────
// Sends a WhatsApp message directly via Green API.
// Layer 6 is enforced by the caller: chatId is ALWAYS the sender's chatId.

async function sendWhatsAppReply(
  chatId: string,
  message: string,
  credentials: GreenApiCredentials
): Promise<{ success: boolean; idMessage?: string; error?: string }> {
  const apiUrl = credentials.api_url || 'https://api.green-api.com'
  const endpoint = `${apiUrl}/waInstance${credentials.instance_id}/sendMessage/${credentials.api_token}`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId, message }),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    const result = await response.json()
    if (result.idMessage) {
      return { success: true, idMessage: result.idMessage }
    }
    return { success: false, error: result.message || 'Unknown Green API error' }
  } catch (err) {
    clearTimeout(timeoutId)
    return { success: false, error: `Fetch error: ${err}` }
  }
}

// ─── Status Update Handler ──────────────────────────────────────────────────
// Unchanged from v7: maps Green API outgoing status to DB.

async function handleOutgoingStatus(body: Record<string, unknown>): Promise<Response> {
  const idMessage = body.idMessage as string | undefined
  const greenStatus = body.status as string | undefined

  if (!idMessage) {
    return ok({ status: 'skipped', reason: 'no-id-message' })
  }

  const STATUS_MAP: Record<string, { dbStatus: string; timestampField?: string }> = {
    'sent':        { dbStatus: 'sent' },
    'delivered':   { dbStatus: 'delivered', timestampField: 'delivered_at' },
    'read':        { dbStatus: 'read',      timestampField: 'read_at' },
    'noAccount':   { dbStatus: 'failed' },
    'notInGroup':  { dbStatus: 'failed' },
  }

  const mapped = greenStatus ? STATUS_MAP[greenStatus] : undefined
  if (!mapped) {
    console.log(`[webhook-${WEBHOOK_VERSION}] Unknown status: ${greenStatus}`)
    return ok({ status: 'skipped', reason: 'unknown-green-status' })
  }

  try {
    const supabase = getSupabaseClient()

    const updateData: Record<string, unknown> = { status: mapped.dbStatus }
    if (mapped.timestampField) {
      updateData[mapped.timestampField] = new Date().toISOString()
    }
    if (mapped.dbStatus === 'failed') {
      updateData.error_message = `Green API status: ${greenStatus}`
      updateData.failed_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('messages')
      .update(updateData)
      .eq('external_id', idMessage)
      .select('id')

    if (error) {
      console.error(`[webhook-${WEBHOOK_VERSION}] DB update error:`, error.message)
    } else {
      const count = data?.length ?? 0
      console.log(`[webhook-${WEBHOOK_VERSION}] Status ${idMessage} → ${mapped.dbStatus} (${count} rows)`)
    }
  } catch (err) {
    console.error(`[webhook-${WEBHOOK_VERSION}] DB exception:`, err)
  }

  return ok({ status: 'processed', type: 'outgoingMessageStatus', greenStatus })
}

// ─── Incoming Message Handler ───────────────────────────────────────────────
// v7 base (log incoming) + v8 keyword auto-reply with 8 safety layers.
// If ANY safety layer fails → message is already logged, no reply sent.

async function handleIncomingMessage(body: Record<string, unknown>): Promise<Response> {
  const senderData = body.senderData as Record<string, unknown> | undefined
  const chatId = (senderData?.chatId as string) || ''

  // ══════════════════════════════════════════════════════════════
  // LAYER 1: GROUP FILTER — @g.us → IGNORE
  // ══════════════════════════════════════════════════════════════
  if (chatId.endsWith('@g.us')) {
    return ok({ status: 'ignored', reason: 'group-message' })
  }

  // ══════════════════════════════════════════════════════════════
  // LAYER 2: PHONE VALIDATION — must match /^972[0-9]{9}$/
  // ══════════════════════════════════════════════════════════════
  const senderPhone = chatId.replace('@c.us', '')
  if (!senderPhone || !/^972[0-9]{9}$/.test(senderPhone)) {
    return ok({ status: 'ignored', reason: 'invalid-phone' })
  }

  // LAYER 6 (locked early): reply target is ALWAYS the sender's chatId.
  // This variable is set here and NEVER overwritten.
  const replyChatId = chatId

  try {
    const supabase = getSupabaseClient()

    // ── Extract message text ──
    const messageData = body.messageData as Record<string, unknown> | undefined
    const textData = messageData?.textMessageData as Record<string, unknown> | undefined
    const extTextData = messageData?.extendedTextMessageData as Record<string, unknown> | undefined

    const messageText =
      (textData?.textMessage as string) ||
      (extTextData?.text as string) ||
      '[non-text message]'

    const senderName = (senderData?.senderName as string) || ''
    const messageType = (messageData?.typeMessage as string) || 'unknown'

    // ── Participant lookup ──
    const { data: participant, error: lookupError } = await supabase
      .from('participants')
      .select('id, event_id, first_name, last_name')
      .eq('phone_normalized', senderPhone)
      .limit(1)
      .maybeSingle()

    if (lookupError) {
      console.error(`[webhook-${WEBHOOK_VERSION}] Participant lookup error:`, lookupError.message)
      return ok({ status: 'error', reason: 'lookup-failed' })
    }

    // Unknown sender = silent ignore (no log, no reply)
    if (!participant) {
      return ok({ status: 'ignored', reason: 'unknown-sender' })
    }

    // ── LOG incoming message to DB (same as v7) ──
    const { error: insertError } = await supabase
      .from('messages')
      .insert({
        event_id: participant.event_id,
        participant_id: participant.id,
        channel: 'whatsapp',
        direction: 'incoming',
        from_phone: senderPhone,
        to_phone: senderPhone,
        to_phone_normalized: senderPhone,
        content: messageText,
        status: 'delivered',
        delivered_at: new Date().toISOString(),
        external_id: (body.idMessage as string) || null,
        auto_reply: false,
        variables_used: {
          sender_name: senderName,
          message_type: messageType,
          webhook_version: WEBHOOK_VERSION,
        },
      })

    if (insertError) {
      console.error(`[webhook-${WEBHOOK_VERSION}] Insert error:`, insertError.message)
    } else {
      console.log(
        `[webhook-${WEBHOOK_VERSION}] Logged incoming from ` +
        `${participant.first_name} ${participant.last_name} (${senderPhone}): "${messageText}"`
      )
    }

    // ══════════════════════════════════════════════════════════════
    // v8 AUTO-REPLY LOGIC — remaining safety layers
    // Any failure from here → return (message already logged above)
    // ══════════════════════════════════════════════════════════════

    // ── LAYER 3: EVENT ACTIVE CHECK ──
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, status, organization_id, name')
      .eq('id', participant.event_id)
      .maybeSingle()

    if (eventError || !event) {
      console.log(`[webhook-${WEBHOOK_VERSION}] Event lookup failed or not found`)
      return ok({ status: 'logged', type: 'incoming-from-participant', auto_reply: 'skipped', reason: 'event-not-found' })
    }

    if (event.status !== 'active') {
      console.log(`[webhook-${WEBHOOK_VERSION}] Event not active (status: ${event.status})`)
      return ok({ status: 'logged', type: 'incoming-from-participant', auto_reply: 'skipped', reason: 'event-not-active' })
    }

    // ── LAYER 4: OPENING MESSAGE CHECK ──
    // Must have at least 1 prior outgoing message to this participant
    // that was human-sent (not an auto-reply). This ensures the participant
    // already received an opening message and knows they're talking to a system.
    const { count: priorOutgoing, error: priorError } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('participant_id', participant.id)
      .in('status', ['sent', 'delivered', 'read'])
      .or('direction.is.null,direction.eq.outgoing')
      .or('auto_reply.is.null,auto_reply.eq.false')

    if (priorError) {
      console.error(`[webhook-${WEBHOOK_VERSION}] Prior message check error:`, priorError.message)
      return ok({ status: 'logged', type: 'incoming-from-participant', auto_reply: 'skipped', reason: 'prior-check-error' })
    }

    if (!priorOutgoing || priorOutgoing === 0) {
      console.log(`[webhook-${WEBHOOK_VERSION}] No prior outgoing message to ${senderPhone}`)
      return ok({ status: 'logged', type: 'incoming-from-participant', auto_reply: 'skipped', reason: 'no-prior-outgoing' })
    }

    // ── LAYER 5: KEYWORD MATCH ──
    const intent = matchKeyword(messageText)
    if (!intent) {
      // No keyword match = silent ignore. Already logged above. No "I don't understand" reply.
      return ok({ status: 'logged', type: 'incoming-from-participant', auto_reply: 'skipped', reason: 'no-keyword-match' })
    }

    console.log(`[webhook-${WEBHOOK_VERSION}] Keyword matched: "${messageText.trim()}" → ${intent}`)

    // ── LAYER 7: RATE LIMIT (3 auto-replies per participant per hour) ──
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count: recentReplies, error: rateLimitError } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('participant_id', participant.id)
      .eq('direction', 'outgoing')
      .eq('auto_reply', true)
      .gte('created_at', oneHourAgo)

    if (rateLimitError) {
      console.error(`[webhook-${WEBHOOK_VERSION}] Rate limit check error:`, rateLimitError.message)
      return ok({ status: 'logged', type: 'incoming-from-participant', auto_reply: 'skipped', reason: 'rate-limit-error' })
    }

    if ((recentReplies ?? 0) >= RATE_LIMIT_PER_HOUR) {
      console.log(
        `[webhook-${WEBHOOK_VERSION}] Rate limit exceeded for ${senderPhone}: ` +
        `${recentReplies}/${RATE_LIMIT_PER_HOUR} per hour`
      )
      return ok({ status: 'logged', type: 'incoming-from-participant', auto_reply: 'skipped', reason: 'rate-limit-exceeded' })
    }

    // ── LAYER 8: CIRCUIT BREAKER (20 total auto-replies in 10 min) ──
    const windowAgo = new Date(Date.now() - CIRCUIT_BREAKER_WINDOW_MIN * 60 * 1000).toISOString()
    const { count: globalReplies, error: circuitError } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('direction', 'outgoing')
      .eq('auto_reply', true)
      .gte('created_at', windowAgo)

    if (circuitError) {
      console.error(`[webhook-${WEBHOOK_VERSION}] Circuit breaker check error:`, circuitError.message)
      return ok({ status: 'logged', type: 'incoming-from-participant', auto_reply: 'skipped', reason: 'circuit-breaker-error' })
    }

    if ((globalReplies ?? 0) >= CIRCUIT_BREAKER_THRESHOLD) {
      console.error(
        `[webhook-${WEBHOOK_VERSION}] CIRCUIT BREAKER TRIPPED: ` +
        `${globalReplies} auto-replies in last ${CIRCUIT_BREAKER_WINDOW_MIN} min. ALL replies disabled.`
      )
      return ok({ status: 'logged', type: 'incoming-from-participant', auto_reply: 'circuit-breaker-tripped' })
    }

    // ══════════════════════════════════════════════════════════════
    // ALL 8 SAFETY LAYERS PASSED — Build response content
    // ══════════════════════════════════════════════════════════════

    let replyText: string

    if (intent === 'help') {
      replyText = buildHelpResponse()

    } else if (intent === 'personal_schedule') {
      // personal/general schedule

      // Step 1: Get schedule IDs assigned to this participant
      const { data: participantSchedules, error: psError } = await supabase
        .from('participant_schedules')
        .select('schedule_id')
        .eq('participant_id', participant.id)

      if (psError) {
        console.error(`[webhook-${WEBHOOK_VERSION}] participant_schedules query error:`, psError.message)
        return ok({ status: 'logged', type: 'incoming-from-participant', auto_reply: 'skipped', reason: 'schedule-query-error' })
      }

      if (!participantSchedules || participantSchedules.length === 0) {
        replyText = buildPersonalScheduleResponse(event.name, [])
      } else {
        // Step 2: Get schedule details, ordered by start_time
        const scheduleIds = participantSchedules.map((ps: { schedule_id: string }) => ps.schedule_id)
        const { data: sessions, error: sessError } = await supabase
          .from('schedules')
          .select('title, start_time, end_time, location, room')
          .in('id', scheduleIds)
          .order('start_time', { ascending: true })

        if (sessError) {
          console.error(`[webhook-${WEBHOOK_VERSION}] schedules query error:`, sessError.message)
          return ok({ status: 'logged', type: 'incoming-from-participant', auto_reply: 'skipped', reason: 'schedule-query-error' })
        }

        replyText = buildPersonalScheduleResponse(event.name, sessions || [])
      }

    } else {
      // general_schedule
      const { data: sessions, error: sessError } = await supabase
        .from('schedules')
        .select('title, start_time, end_time, location, room, speaker_name')
        .eq('event_id', event.id)
        .order('start_time', { ascending: true })

      if (sessError) {
        console.error(`[webhook-${WEBHOOK_VERSION}] General schedule query error:`, sessError.message)
        return ok({ status: 'logged', type: 'incoming-from-participant', auto_reply: 'skipped', reason: 'schedule-query-error' })
      }

      replyText = buildGeneralScheduleResponse(event.name, sessions || [])
    }

    // ── DRY RUN MODE: log would_reply, send nothing ──
    if (DRY_RUN) {
      console.log(`[webhook-${WEBHOOK_VERSION}] DRY RUN — would reply to ${senderPhone}: ${intent}`)

      await supabase.from('messages').insert({
        event_id: event.id,
        participant_id: participant.id,
        channel: 'whatsapp',
        direction: 'outgoing',
        to_phone: senderPhone,
        to_phone_normalized: senderPhone,
        content: replyText,
        status: 'pending',
        auto_reply: true,
        variables_used: {
          intent,
          keyword_matched: messageText.trim(),
          webhook_version: WEBHOOK_VERSION,
          dry_run: true,
          would_reply: true,
        },
      })

      return ok({
        status: 'logged',
        type: 'incoming-from-participant',
        auto_reply: 'would_reply',
        mode: 'dry-run',
        intent,
      })
    }

    // ── ALLOWLIST MODE: phone not in list → log would_reply, send nothing ──
    if (ALLOWLIST_ACTIVE && !TEST_PHONE_ALLOWLIST.includes(senderPhone)) {
      console.log(`[webhook-${WEBHOOK_VERSION}] Phone ${senderPhone} not in allowlist — would reply: ${intent}`)

      await supabase.from('messages').insert({
        event_id: event.id,
        participant_id: participant.id,
        channel: 'whatsapp',
        direction: 'outgoing',
        to_phone: senderPhone,
        to_phone_normalized: senderPhone,
        content: replyText,
        status: 'pending',
        auto_reply: true,
        variables_used: {
          intent,
          keyword_matched: messageText.trim(),
          webhook_version: WEBHOOK_VERSION,
          allowlist_blocked: true,
          would_reply: true,
        },
      })

      return ok({
        status: 'logged',
        type: 'incoming-from-participant',
        auto_reply: 'would_reply',
        mode: 'allowlist-blocked',
        intent,
      })
    }

    // ══════════════════════════════════════════════════════════════
    // SEND REPLY via Green API
    // Layer 6: replyChatId was locked to sender at the top.
    // ══════════════════════════════════════════════════════════════

    const { data: credentials, error: credError } = await supabase
      .from('api_credentials')
      .select('credentials_encrypted')
      .eq('organization_id', event.organization_id)
      .eq('service', 'green_api')
      .eq('is_active', true)
      .maybeSingle()

    if (credError || !credentials) {
      console.error(`[webhook-${WEBHOOK_VERSION}] Green API credentials not found for org ${event.organization_id}`)
      return ok({ status: 'logged', type: 'incoming-from-participant', auto_reply: 'skipped', reason: 'no-green-api-creds' })
    }

    let greenCreds: GreenApiCredentials
    try {
      greenCreds = await loadCredentials(credentials.credentials_encrypted)
    } catch (err) {
      console.error(`[webhook-${WEBHOOK_VERSION}] Failed to load credentials:`, err)
      return ok({ status: 'logged', type: 'incoming-from-participant', auto_reply: 'skipped', reason: 'credentials-load-failed' })
    }

    // LAYER 6 ENFORCED: replyChatId was set to sender's chatId at the top.
    // senderPhone was extracted from chatId, never from DB.
    const sendResult = await sendWhatsAppReply(replyChatId, replyText, greenCreds)

    // Log the auto-reply in messages table
    const replyRecord: Record<string, unknown> = {
      event_id: event.id,
      participant_id: participant.id,
      channel: 'whatsapp',
      direction: 'outgoing',
      to_phone: senderPhone,
      to_phone_normalized: senderPhone,
      content: replyText,
      auto_reply: true,
      variables_used: {
        intent,
        keyword_matched: messageText.trim(),
        webhook_version: WEBHOOK_VERSION,
      },
    }

    if (sendResult.success) {
      replyRecord.status = 'sent'
      replyRecord.sent_at = new Date().toISOString()
      replyRecord.external_id = sendResult.idMessage
      console.log(
        `[webhook-${WEBHOOK_VERSION}] Auto-reply sent to ${senderPhone}: ` +
        `${intent} (${sendResult.idMessage})`
      )
    } else {
      replyRecord.status = 'failed'
      replyRecord.error_message = sendResult.error
      replyRecord.failed_at = new Date().toISOString()
      console.error(
        `[webhook-${WEBHOOK_VERSION}] Auto-reply FAILED to ${senderPhone}: ${sendResult.error}`
      )
    }

    const { error: replyInsertError } = await supabase.from('messages').insert(replyRecord)
    if (replyInsertError) {
      console.error(`[webhook-${WEBHOOK_VERSION}] Reply log insert error:`, replyInsertError.message)
    }

    return ok({
      status: 'logged',
      type: 'incoming-from-participant',
      auto_reply: sendResult.success ? 'sent' : 'failed',
      intent,
    })

  } catch (err) {
    console.error(`[webhook-${WEBHOOK_VERSION}] Incoming handler error:`, err)
    return ok({ status: 'error', reason: 'handler-exception' })
  }
}

// ─── Main Server ────────────────────────────────────────────────────────────

serve(async (req) => {
  // GET = health check / version info
  if (req.method === 'GET') {
    return ok({
      version: WEBHOOK_VERSION,
      mode: WEBHOOK_MODE,
      description: `${WEBHOOK_VERSION} - keyword auto-reply with 8 safety layers`,
      features: [
        'outgoing-status-tracking',
        'incoming-message-logging',
        'keyword-auto-reply',
      ],
      safety: {
        auto_reply: true,
        sends_messages: !DRY_RUN,
        processes_groups: false,
        replies_to_unknown: false,
        dry_run: DRY_RUN,
        allowlist_active: ALLOWLIST_ACTIVE,
        allowlist_count: TEST_PHONE_ALLOWLIST.length,
        rate_limit_per_hour: RATE_LIMIT_PER_HOUR,
        circuit_breaker_threshold: CIRCUIT_BREAKER_THRESHOLD,
        circuit_breaker_window_min: CIRCUIT_BREAKER_WINDOW_MIN,
        layers: [
          '1: group-filter (@g.us → ignore)',
          '2: phone-validation (972XXXXXXXXX)',
          '3: participant-lookup + event-active',
          '4: opening-message-check (prior outgoing required)',
          '5: keyword-match (exact only)',
          '6: reply-target-is-sender (locked from incoming chatId)',
          '7: rate-limit (3/participant/hour)',
          '8: circuit-breaker (20/10min global)',
        ],
      },
    })
  }

  // OPTIONS = CORS preflight
  if (req.method === 'OPTIONS') {
    return ok({ status: 'ok' })
  }

  // Only process POST from here
  if (req.method !== 'POST') {
    return ok({ status: 'ignored', reason: 'method-not-supported' })
  }

  try {
    const body = await req.json()
    const webhookType = body.typeWebhook as string | undefined

    // ── Route by webhook type ──
    if (webhookType === 'outgoingMessageStatus') {
      return await handleOutgoingStatus(body)
    }

    if (webhookType === 'incomingMessageReceived') {
      return await handleIncomingMessage(body)
    }

    // ── Any other type: acknowledge and do nothing ──
    console.log(`[webhook-${WEBHOOK_VERSION}] Ignored type: ${webhookType}`)
    return ok({ status: 'acknowledged', type: webhookType })
  } catch (error) {
    console.error(`[webhook-${WEBHOOK_VERSION}] Unhandled error:`, error)
    // Always return 200 to prevent Green API retries
    return ok({ status: 'error', reason: 'parse-or-handler-error' })
  }
})
