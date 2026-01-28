// supabase/functions/ai-chat/index.ts
// Edge Function for AI chat (Gemini) - EventFlow event planning assistant
// v6: Fixed CORS, body format, API key sourcing (base64 first), removed rate-limiter dependency

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ============================================================================
// CORS Configuration
// ============================================================================

function getAllowedOrigins(): string[] {
  const origins: string[] = []

  // Production Firebase Hosting
  origins.push('https://eventflow-ai-prod.web.app')
  origins.push('https://eventflow-ai-prod.firebaseapp.com')

  // Custom production origin from env
  const prodOrigin = Deno.env.get('ALLOWED_ORIGIN')
  if (prodOrigin && !origins.includes(prodOrigin)) {
    origins.push(prodOrigin)
  }

  // Development: allow localhost on common Vite ports
  const env = Deno.env.get('ENVIRONMENT') || 'development'
  if (env === 'development') {
    for (const port of [5173, 5174, 5175, 5176, 3000, 4173]) {
      origins.push(`http://localhost:${port}`)
    }
  }

  return origins
}

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigins = getAllowedOrigins()

  // If origin matches, use it; otherwise use first allowed origin
  const allowedOrigin = origin && allowedOrigins.includes(origin)
    ? origin
    : allowedOrigins[0] || '*'

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  }
}

// ============================================================================
// Types
// ============================================================================

// Frontend sends this format
interface FrontendChatRequest {
  message: string
  context?: string      // System context built by frontend
  history?: string      // Formatted conversation history
  page?: string         // Current page name
  eventId?: string      // Current event ID
  eventName?: string    // Current event name
}

// ============================================================================
// System Prompt
// ============================================================================

const SYSTEM_PROMPT = `את עוזרת AI להפקת אירועים בשם EventFlow.

התפקיד שלך:
1. לעזור למשתמש לתכנן אירועים
2. לזהות את סוג האירוע מתוך השיחה
3. להציע צ'קליסט מתאים לסוג האירוע
4. להתריע על פריטים חסרים או חשובים
5. לסכם פרטים ולהציע פעולות

עקרון מנחה: את ממליצה - המשתמש מחליט.
לעולם לא תבצעי פעולות בלי אישור מפורש מהמשתמש.

כאשר המשתמש מתאר אירוע, נסי לזהות:
- סוג האירוע (כנס, גיבוש, חתונה, יום עיון, אירוע חברה וכו')
- תאריך ומיקום
- מספר משתתפים משוער
- תקציב (אם הוזכר)
- דרישות מיוחדות

ענה בעברית בצורה ידידותית ומקצועית.
השתמש באימוג'ים במידה.
שמור על תשובות קצרות וממוקדות.

כאשר יש לך מספיק מידע, הצע ליצור את האירוע עם הפרטים שנאספו.`

// ============================================================================
// Gemini API Key Resolution
// ============================================================================

async function getGeminiApiKey(): Promise<string | null> {
  // Priority 1: GEMINI_API_KEY environment variable (simplest)
  const envKey = Deno.env.get('GEMINI_API_KEY')
  if (envKey) return envKey

  // Priority 2: Credentials in database (base64 or AES-GCM encrypted)
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: credentials, error } = await supabase
      .from('api_credentials')
      .select('credentials_encrypted')
      .eq('service', 'gemini')
      .eq('is_active', true)
      .maybeSingle()

    if (error || !credentials?.credentials_encrypted) return null

    const encrypted = credentials.credentials_encrypted

    // Try base64-encoded JSON first (no encryption key needed)
    try {
      const decoded = JSON.parse(atob(encrypted))
      if (decoded.api_key) return decoded.api_key
    } catch {
      // Not simple base64, try AES-GCM below
    }

    // Try AES-GCM decryption (requires ENCRYPTION_KEY env var)
    const encryptionKey = Deno.env.get('ENCRYPTION_KEY')
    if (!encryptionKey || encryptionKey.length < 16) return null

    // AES-GCM format: iv_base64:ciphertext_base64
    const [ivBase64, ciphertextBase64] = encrypted.split(':')
    if (!ivBase64 || !ciphertextBase64) return null

    const encoder = new TextEncoder()
    const decoder = new TextDecoder()

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(encryptionKey.padEnd(32, '0').slice(0, 32)),
      'AES-GCM',
      false,
      ['decrypt']
    )

    const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0))
    const ciphertext = Uint8Array.from(atob(ciphertextBase64), c => c.charCodeAt(0))

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      keyMaterial,
      ciphertext
    )

    const parsed = JSON.parse(decoder.decode(decrypted))
    return parsed.api_key || null
  } catch (err) {
    console.error('Failed to get Gemini API key from DB:', err)
    return null
  }
}

// ============================================================================
// Action Detection
// ============================================================================

function detectActions(response: string, userMessage: string): any[] {
  const actions: any[] = []

  const eventTypes = ['כנס', 'גיבוש', 'חתונה', 'יום עיון', 'אירוע חברה', 'בר מצווה', 'בת מצווה', 'השקה']
  for (const type of eventTypes) {
    if (response.includes(type) && userMessage.toLowerCase().includes(type.toLowerCase())) {
      actions.push({ type: 'identify_event_type', data: { event_type: type }, status: 'suggested' })
      break
    }
  }

  const dateMatch = response.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/)
  if (dateMatch) {
    actions.push({ type: 'set_date', data: { date: dateMatch[0] }, status: 'suggested' })
  }

  const participantMatch = response.match(/(\d+)\s*(משתתפים|אנשים|מוזמנים)/)
  if (participantMatch) {
    actions.push({ type: 'set_participants', data: { count: parseInt(participantMatch[1]) }, status: 'suggested' })
  }

  if (response.includes('ליצור את האירוע') || response.includes('לפתוח אירוע')) {
    actions.push({ type: 'suggest_create_event', status: 'pending_approval' })
  }

  return actions
}

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

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
    // Parse request body (accepts frontend format)
    const body: FrontendChatRequest = await req.json()
    const { message, context, history, page, eventId, eventName } = body

    if (!message || !message.trim()) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Gemini API key
    const geminiApiKey = await getGeminiApiKey()
    if (!geminiApiKey) {
      console.error('No Gemini API key available (checked GEMINI_API_KEY env and api_credentials table)')
      return new Response(
        JSON.stringify({ error: 'AI service not configured. Set GEMINI_API_KEY in Supabase Edge Function secrets.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build messages for Gemini
    const systemContext = context || SYSTEM_PROMPT
    const messages: Array<{ role: string; parts: Array<{ text: string }> }> = [
      { role: 'user', parts: [{ text: systemContext }] },
      { role: 'model', parts: [{ text: 'הבנתי! אני כאן לעזור לך לתכנן אירועים. איך אוכל לעזור?' }] },
    ]

    // Add conversation history if provided
    if (history && history.trim()) {
      // History comes as formatted text from frontend: "משתמש: ...\nעוזר: ..."
      const historyLines = history.split('\n')
      for (const line of historyLines) {
        if (line.startsWith('משתמש:')) {
          messages.push({ role: 'user', parts: [{ text: line.replace('משתמש:', '').trim() }] })
        } else if (line.startsWith('עוזר:')) {
          messages.push({ role: 'model', parts: [{ text: line.replace('עוזר:', '').trim() }] })
        }
      }
    }

    // Add current message
    messages.push({ role: 'user', parts: [{ text: message }] })

    // Call Gemini API
    const geminiResponse = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': geminiApiKey,
        },
        body: JSON.stringify({
          contents: messages,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000,
          },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          ],
        }),
      }
    )

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text()
      console.error(`Gemini API error ${geminiResponse.status}:`, errorText)
      return new Response(
        JSON.stringify({ error: 'AI service returned an error', details: `HTTP ${geminiResponse.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const geminiResult = await geminiResponse.json()

    if (!geminiResult.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error('Gemini returned no candidates:', JSON.stringify(geminiResult))
      return new Response(
        JSON.stringify({ error: 'AI did not return a valid response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const aiResponse = geminiResult.candidates[0].content.parts[0].text
    const tokensUsed = geminiResult.usageMetadata?.totalTokenCount || 0

    // Detect suggested actions
    const actions = detectActions(aiResponse, message)

    // Build suggestions based on page context
    const suggestions: string[] = []
    if (page === 'events' || page === 'dashboard') {
      suggestions.push('איך ליצור אירוע חדש?')
      suggestions.push('מה הצעדים הראשונים לתכנון אירוע?')
    } else if (page === 'guests') {
      suggestions.push('איך לייבא רשימת אורחים מאקסל?')
      suggestions.push('כמה אורחים מומלץ להזמין?')
    } else if (page === 'vendors') {
      suggestions.push('מה חשוב לבדוק אצל ספק?')
      suggestions.push('איך לנהל משא ומתן על מחירים?')
    }

    return new Response(
      JSON.stringify({
        success: true,
        response: aiResponse,
        message: aiResponse, // Alias for frontend compatibility
        actions,
        suggestions,
        tokens_used: tokensUsed,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in ai-chat function:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
