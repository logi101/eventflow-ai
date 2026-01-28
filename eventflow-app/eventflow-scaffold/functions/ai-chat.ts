// supabase/functions/ai-chat/index.ts
// Edge Function לשיחה עם AI (Gemini) לתכנון אירועים

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ChatRequest {
  organization_id: string
  user_id: string
  session_id?: string
  message: string
  event_id?: string
}

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { organization_id, user_id, session_id, message, event_id }: ChatRequest = await req.json()

    if (!organization_id || !user_id || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Gemini API key for organization
    const { data: credentials, error: credError } = await supabase
      .from('api_credentials')
      .select('credentials_encrypted')
      .eq('organization_id', organization_id)
      .eq('service', 'gemini')
      .eq('is_active', true)
      .single()

    if (credError || !credentials) {
      return new Response(
        JSON.stringify({ error: 'Gemini API not configured for this organization' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Decrypt API key
    let geminiApiKey: string
    try {
      const decrypted = JSON.parse(atob(credentials.credentials_encrypted))
      geminiApiKey = decrypted.api_key
    } catch {
      return new Response(
        JSON.stringify({ error: 'Failed to decrypt credentials' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get or create chat session
    let currentSessionId = session_id
    if (!currentSessionId) {
      const { data: newSession, error: sessionError } = await supabase
        .from('ai_chat_sessions')
        .insert({
          user_id,
          event_id,
          title: message.substring(0, 50),
          context: { organization_id },
        })
        .select()
        .single()

      if (sessionError) throw sessionError
      currentSessionId = newSession.id
    }

    // Get conversation history
    const { data: history } = await supabase
      .from('ai_chat_messages')
      .select('role, content')
      .eq('session_id', currentSessionId)
      .order('created_at', { ascending: true })
      .limit(20)

    // Save user message
    await supabase
      .from('ai_chat_messages')
      .insert({
        session_id: currentSessionId,
        role: 'user',
        content: message,
      })

    // Build messages for Gemini
    const messages = [
      { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
      { role: 'model', parts: [{ text: 'הבנתי! אני כאן לעזור לך לתכנן אירועים. איך אוכל לעזור?' }] },
    ]

    // Add history
    for (const msg of history || []) {
      messages.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      })
    }

    // Add current message
    messages.push({
      role: 'user',
      parts: [{ text: message }],
    })

    // Call Gemini API
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

    const geminiResult = await geminiResponse.json()

    if (!geminiResult.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error('Gemini error:', geminiResult)
      return new Response(
        JSON.stringify({ error: 'Failed to get response from AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const aiResponse = geminiResult.candidates[0].content.parts[0].text
    const tokensUsed = geminiResult.usageMetadata?.totalTokenCount || 0

    // Detect if AI identified event details
    const actions = detectActions(aiResponse, message)

    // Save AI response
    await supabase
      .from('ai_chat_messages')
      .insert({
        session_id: currentSessionId,
        role: 'assistant',
        content: aiResponse,
        actions,
        tokens_used: tokensUsed,
      })

    // Update session
    await supabase
      .from('ai_chat_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', currentSessionId)

    return new Response(
      JSON.stringify({
        success: true,
        session_id: currentSessionId,
        response: aiResponse,
        actions,
        tokens_used: tokensUsed,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in ai-chat function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

interface AIAction {
  type: string
  data?: Record<string, unknown>
  status: 'suggested' | 'pending_approval'
}

// Detect suggested actions from AI response
function detectActions(response: string, userMessage: string): AIAction[] {
  const actions: AIAction[] = []

  // Detect event type identification
  const eventTypes = ['כנס', 'גיבוש', 'חתונה', 'יום עיון', 'אירוע חברה', 'בר מצווה', 'בת מצווה', 'השקה']
  for (const type of eventTypes) {
    if (response.includes(type) && userMessage.toLowerCase().includes(type.toLowerCase())) {
      actions.push({
        type: 'identify_event_type',
        data: { event_type: type },
        status: 'suggested',
      })
      break
    }
  }

  // Detect date mentions
  const dateMatch = response.match(/(\d{1,2})[/-./](\d{1,2})[/-./](\d{2,4})/)
  if (dateMatch) {
    actions.push({
      type: 'set_date',
      data: { date: dateMatch[0] },
      status: 'suggested',
    })
  }

  // Detect participant count
  const participantMatch = response.match(/(\d+)\s*(משתתפים|אנשים|מוזמנים)/)
  if (participantMatch) {
    actions.push({
      type: 'set_participants',
      data: { count: parseInt(participantMatch[1]) },
      status: 'suggested',
    })
  }

  // Detect event creation suggestion
  if (response.includes('ליצור את האירוע') || response.includes('לפתוח אירוע')) {
    actions.push({
      type: 'suggest_create_event',
      status: 'pending_approval',
    })
  }

  return actions
}
