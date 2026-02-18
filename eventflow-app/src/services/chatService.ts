// EventFlow AI Chat Service - Gemini-First Architecture
// ALL messages go to Gemini AI for real conversations.
// Only /help is handled locally.

import type {
  ChatRequest,
  ChatResponse,
  ChatAction,
  ChatMessage,
  PageContext,
  AIRoutingResult,
  SkillType,
  AIWriteAction
} from '../types/chat'
import { SLASH_COMMANDS } from '../hooks/usePageContext'
import { supabase } from '../lib/supabase'

// ============================================================================
// Slash Command to Natural Language Mapping
// ============================================================================

// Convert slash commands to natural language so they go through the AI
const SLASH_TO_NATURAL: Record<string, string> = {
  '/event': 'אני רוצה ליצור אירוע חדש, עזור לי לתכנן אותו',
  '/create': 'אני רוצה ליצור משהו חדש, עזור לי',
  '/guest': 'אני רוצה לנהל את רשימת האורחים, עזור לי',
  '/import': 'אני רוצה לייבא נתונים, עזור לי',
  '/vendor': 'אני רוצה לנהל ספקים לאירוע, עזור לי',
  '/quote': 'אני רוצה לקבל הצעת מחיר מספק, עזור לי',
  '/task': 'אני רוצה לנהל את המשימות לאירוע, עזור לי',
  '/done': 'סיימתי משימה, מה הצעד הבא?',
  '/message': 'אני רוצה לשלוח הודעה למשתתפים, עזור לי',
  '/template': 'אני רוצה ליצור תבנית הודעה, עזור לי',
  '/session': 'אני רוצה להוסיף פעילות לתוכנייה, עזור לי',
  '/speaker': 'אני רוצה להוסיף דובר/מרצה, עזור לי',
  '/export': 'אני רוצה לייצא נתונים, עזור לי',
  '/status': 'מה הסטטוס הנוכחי של האירוע?',
  '/go': 'לאיזה דף כדאי לי לעבור עכשיו?'
}

// ============================================================================
// Skill Triggers (only for explicit tool commands)
// ============================================================================

const SKILL_TRIGGERS: Record<string, SkillType> = {
  'pdf': 'pdf-export',
  'csv': 'csv-export',
  'סי-אס-וי': 'csv-export',
  'וואטסאפ': 'whatsapp-send',
  'whatsapp': 'whatsapp-send',
  'qr': 'qr-generate',
  'קיוארקוד': 'qr-generate',
  'יומן': 'calendar-sync',
  'calendar': 'calendar-sync',
  'דוח': 'report-generate',
  'report': 'report-generate'
}

// ============================================================================
// Intent Analysis - Gemini First
// ============================================================================

/**
 * Analyze user message to determine routing
 * PRINCIPLE: Everything goes to Gemini AI for real conversation.
 * Only /help and explicit skill triggers are handled locally.
 */
function analyzeIntent(message: string): AIRoutingResult {
  const normalizedMessage = message.toLowerCase().trim()

  // /help is the only command handled fully locally
  if (normalizedMessage.startsWith('/help')) {
    return {
      provider: 'claude',
      reason: 'Help command',
      isAction: true,
      command: '/help'
    }
  }

  // Check for slash commands → convert to natural language for AI
  if (normalizedMessage.startsWith('/')) {
    const command = normalizedMessage.split(' ')[0]
    if (SLASH_TO_NATURAL[command]) {
      return {
        provider: 'gemini',
        reason: `Slash command converted to AI conversation: ${command}`,
        isAction: false,
        command // Keep reference for metadata
      }
    }
  }

  // Check for explicit skill triggers in short messages (≤3 words)
  const wordCount = normalizedMessage.split(/\s+/).length
  if (wordCount <= 3) {
    for (const [trigger, skill] of Object.entries(SKILL_TRIGGERS)) {
      if (normalizedMessage.includes(trigger)) {
        return {
          provider: 'claude',
          reason: `Skill trigger: ${skill}`,
          isAction: true,
          skillRequired: skill
        }
      }
    }
  }

  // EVERYTHING else goes to Gemini AI
  return {
    provider: 'gemini',
    reason: 'AI conversation',
    isAction: false
  }
}

// ============================================================================
// Local Handler (only /help and skills)
// ============================================================================

class LocalHandler {
  /**
   * Handle the few things that stay local
   */
  async handle(
    _message: string,
    intent: AIRoutingResult,
    context: PageContext
  ): Promise<ChatResponse> {
    // /help command
    if (intent.command === '/help') {
      return this.handleHelp(context)
    }

    // Skill triggers
    if (intent.skillRequired) {
      return this.handleSkill(intent.skillRequired, context)
    }

    // Fallback (shouldn't reach here)
    return {
      content: 'איך אפשר לעזור?',
      metadata: {}
    }
  }

  private handleHelp(context: PageContext): ChatResponse {
    const availableCommands = SLASH_COMMANDS.filter(c =>
      c.availableOn.includes(context.currentPage)
    )

    const commandList = availableCommands
      .map(c => `**${c.command}** - ${c.descriptionHebrew}`)
      .join('\n')

    return {
      content: `## פקודות זמינות בדף זה:\n\n${commandList}\n\nאפשר גם פשוט לכתוב מה שאתה צריך ואני אעזור!`,
      metadata: { command: '/help' }
    }
  }

  private handleSkill(skill: SkillType, context: PageContext): ChatResponse {
    const skillNames: Record<SkillType, string> = {
      'pdf-export': 'ייצוא PDF',
      'csv-import': 'ייבוא CSV',
      'csv-export': 'ייצוא CSV',
      'whatsapp-send': 'שליחת WhatsApp',
      'qr-generate': 'יצירת QR',
      'email-send': 'שליחת אימייל',
      'calendar-sync': 'סנכרון יומן',
      'report-generate': 'יצירת דוח'
    }

    const action: ChatAction = {
      id: `skill-${Date.now()}`,
      type: 'run_skill',
      label: `Run ${skill}`,
      labelHebrew: skillNames[skill],
      data: { skill, context: context.currentPage }
    }

    return {
      content: `מוכן להפעיל: ${skillNames[skill]}`,
      actions: [action],
      metadata: { skillUsed: skill }
    }
  }
}

// ============================================================================
// Gemini AI Service (the real brain)
// ============================================================================

class GeminiService {
  /**
   * Chat using Gemini via Supabase Edge Function
   * This is the main AI - handles ALL conversations
   */
  async chat(
    message: string,
    context: PageContext,
    conversationHistory: ChatMessage[],
    slashCommand?: string
  ): Promise<ChatResponse> {
    try {
      // If this was a slash command, convert to natural language
      const actualMessage = slashCommand && SLASH_TO_NATURAL[slashCommand]
        ? SLASH_TO_NATURAL[slashCommand]
        : message

      // Build context message for Gemini
      const systemContext = this.buildSystemContext(context)
      const historyText = this.formatHistory(conversationHistory)

      // Ensure fresh session before calling edge function (prevents 401 Invalid JWT)
      await supabase.auth.getSession()

      const invokeBody = {
        message: actualMessage,
        context: systemContext,
        history: historyText,
        page: context.currentPage,
        eventId: context.eventId,
        eventName: context.eventName
      }

      let { data, error } = await supabase.functions.invoke('ai-chat', {
        body: invokeBody
      })

      // Retry once on 401 after refreshing session
      if (error && String(error).includes('401')) {
        console.warn('[EventFlow AI] Got 401, refreshing session and retrying...')
        await supabase.auth.refreshSession()
        const retry = await supabase.functions.invoke('ai-chat', {
          body: invokeBody
        })
        data = retry.data
        error = retry.error
      }

      if (error) {
        console.error('[EventFlow AI] Edge function error:', error)
        let errorDetail = 'שגיאה לא ידועה'
        try {
          // FunctionsHttpError in Supabase JS v2 has a context.json() method
          if (error && typeof error === 'object' && 'context' in error) {
            const ctx = (error as Record<string, unknown>).context
            if (ctx && typeof ctx === 'object' && 'json' in ctx && typeof (ctx as Record<string, unknown>).json === 'function') {
              const errorBody = await (ctx as { json: () => Promise<unknown> }).json()
              console.error('[EventFlow AI] Error body:', errorBody)
              errorDetail = (errorBody as Record<string, string>).error || JSON.stringify(errorBody)
            } else {
              errorDetail = (error as Record<string, unknown>).message as string || JSON.stringify(error)
            }
          } else if (error instanceof Error) {
            errorDetail = error.message
          } else {
            errorDetail = String(error)
          }
        } catch {
          errorDetail = error instanceof Error ? error.message : String(error)
        }
        return {
          content: `אירעה שגיאה בתקשורת עם העוזר:\n\n**${errorDetail}**\n\nנסה שוב או בדוק את הגדרות המערכת.`,
          metadata: { page: context.currentPage }
        }
      }

      if (!data) {
        console.error('[EventFlow AI] No data returned from edge function')
        return {
          content: 'לא התקבלה תשובה מהשרת. ייתכן שה-Edge Function לא פרוסה. בדוק את לוח הבקרה של Supabase.',
          metadata: { page: context.currentPage }
        }
      }

      // Check for error in response body
      if (data.error) {
        console.error('[EventFlow AI] Edge function returned error:', data.error)
        return {
          content: `שגיאה מהשרת: **${data.error}**${data.details ? `\n\n${data.details}` : ''}`,
          metadata: { page: context.currentPage }
        }
      }

      const aiContent = data.response || data.message || 'לא הצלחתי לקבל תשובה.'

      // Merge backend actions (from function calling) with frontend-detected actions
      const backendActions: ChatAction[] = (data.actions || []).map((a: Record<string, unknown>, i: number) => ({
        id: `backend-action-${Date.now()}-${i}`,
        type: a.type || 'navigate',
        label: a.label || String(a.type),
        labelHebrew: a.labelHebrew || a.label || String(a.type),
        data: a.data || {},
        targetPage: a.targetPage,
      }))

      // Also detect actions from response text (for backwards compatibility)
      const detectedActions = this.detectActionsFromResponse(aiContent, actualMessage)

      // Deduplicate: prefer backend actions, add detected ones that don't overlap
      const backendTypes = new Set(backendActions.map((a: ChatAction) => a.type))
      const uniqueDetected = detectedActions.filter(a => !backendTypes.has(a.type))
      const allActions = [...backendActions, ...uniqueDetected]

      // Detect pending_approval actions (Phase 6: AI Write Operations)
      const pendingApprovalActions: AIWriteAction[] = []
      if (data.pending_actions && Array.isArray(data.pending_actions)) {
        for (const action of data.pending_actions) {
          if (action.status === 'pending_approval') {
            pendingApprovalActions.push(action as AIWriteAction)
          }
        }
      }

      return {
        content: aiContent,
        actions: allActions.length > 0 ? allActions : undefined,
        suggestions: data.suggestions,
        pendingApprovalActions: pendingApprovalActions.length > 0 ? pendingApprovalActions : undefined,
        metadata: {
          page: context.currentPage,
          ...(slashCommand ? { command: slashCommand } : {})
        }
      }
    } catch (error) {
      console.error('[EventFlow AI] Unexpected service error:', error)
      const errorMsg = error instanceof Error ? error.message : 'שגיאה לא צפויה'
      return {
        content: `אירעה שגיאה בלתי צפויה: **${errorMsg}**\n\nבדוק שה-Supabase URL וה-Anon Key מוגדרים נכון בקובץ .env`,
        metadata: { page: context.currentPage }
      }
    }
  }

  /**
   * Detect relevant actions from AI response text
   * Adds action buttons alongside the AI conversation
   */
  private detectActionsFromResponse(aiResponse: string, userMessage: string): ChatAction[] {
    const actions: ChatAction[] = []
    const combined = `${aiResponse} ${userMessage}`

    // If AI suggests creating an event
    if (
      combined.includes('ליצור את האירוע') || combined.includes('לפתוח אירוע') ||
      combined.includes('ניצור אירוע') || combined.includes('אצור לך אירוע') ||
      combined.includes('ליצור אירוע')
    ) {
      actions.push({
        id: `action-${Date.now()}-create`,
        type: 'create_event',
        label: 'Create Event',
        labelHebrew: 'צור אירוע',
        data: { source: 'ai-suggestion' }
      })
    }

    // If AI talks about checklist/tasks
    if (combined.includes('צ\'קליסט') || combined.includes('רשימת משימות') || combined.includes('checklist')) {
      actions.push({
        id: `action-${Date.now()}-checklist`,
        type: 'navigate',
        label: 'Go to Checklist',
        labelHebrew: 'עבור לצ\'קליסט',
        targetPage: 'checklist',
        data: { source: 'ai-suggestion' }
      })
    }

    // If AI talks about guests/participants
    if (combined.includes('רשימת אורחים') || combined.includes('רשימת משתתפים') || combined.includes('מוזמנים')) {
      actions.push({
        id: `action-${Date.now()}-guests`,
        type: 'navigate',
        label: 'Manage Guests',
        labelHebrew: 'ניהול אורחים',
        targetPage: 'guests',
        data: { source: 'ai-suggestion' }
      })
    }

    // If AI talks about vendors/suppliers
    if (combined.includes('ספקים') || combined.includes('קייטרינג') || combined.includes('מקום אירוע')) {
      actions.push({
        id: `action-${Date.now()}-vendors`,
        type: 'navigate',
        label: 'Manage Vendors',
        labelHebrew: 'ניהול ספקים',
        targetPage: 'vendors',
        data: { source: 'ai-suggestion' }
      })
    }

    // If AI talks about schedule/program
    if (combined.includes('תוכנייה') || combined.includes('לוח זמנים') || combined.includes('סדר יום')) {
      actions.push({
        id: `action-${Date.now()}-program`,
        type: 'navigate',
        label: 'Build Program',
        labelHebrew: 'בנה תוכנייה',
        targetPage: 'program',
        data: { source: 'ai-suggestion' }
      })
    }

    return actions
  }

  /**
   * Build system context for the AI
   */
  private buildSystemContext(context: PageContext): string {
    const pageDescriptions: Record<string, string> = {
      'dashboard': 'לוח הבקרה הראשי של מערכת ניהול האירועים',
      'events': 'דף רשימת האירועים',
      'event-detail': `דף פרטי האירוע${context.eventName ? `: ${context.eventName}` : ''}`,
      'guests': 'דף ניהול האורחים',
      'vendors': 'דף ניהול הספקים',
      'checklist': 'דף רשימת המשימות',
      'messages': 'מרכז ההודעות',
      'program': 'בונה התוכנית',
      'budget': 'ניהול התקציב',
      'settings': 'הגדרות המערכת',
      'timeline': 'ציר הזמן'
    }

    return `
את שותפה אמיתית לתכנון אירועים במערכת EventFlow.
המשתמש נמצא כרגע ב: ${pageDescriptions[context.currentPage] || context.currentPage}
${context.eventName ? `אירוע נוכחי: ${context.eventName}` : ''}

התנהגי כשותפה מקצועית להפקת אירועים:
- שאלי שאלות חכמות כדי להבין מה המשתמש צריך
- הציעי רעיונות, תוכניות, ופתרונות יצירתיים
- בני תוכניות מפורטות עם לוחות זמנים
- התריעי על דברים חסרים או בעיות פוטנציאליות
- ענה בעברית באופן ידידותי, מקצועי ומפורט
- שאלי שאלת המשך בסוף כל תשובה כדי לקדם את התכנון
    `.trim()
  }

  /**
   * Format conversation history for context (JSON format preserves multi-line content)
   */
  private formatHistory(messages: ChatMessage[]): string {
    return JSON.stringify(
      messages
        .slice(-10) // Last 10 messages for COV confirmation flows
        .map(m => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content
        }))
    )
  }
}

// ============================================================================
// Main Chat Service
// ============================================================================

class ChatService {
  private localHandler = new LocalHandler()
  private geminiService = new GeminiService()

  /**
   * Process user message - Gemini first, always
   */
  async processMessage(request: ChatRequest): Promise<ChatResponse> {
    const { message, context, conversationHistory } = request

    // Analyze intent
    const intent = analyzeIntent(message)

    // Local handling: only /help and explicit skill triggers
    if (intent.provider === 'claude') {
      return this.localHandler.handle(message, intent, context)
    }

    // Everything else → Gemini AI for real conversation
    return this.geminiService.chat(
      message,
      context,
      conversationHistory,
      intent.command // Pass slash command reference if applicable
    )
  }

  /**
   * Get routing decision for a message (for debugging/analytics)
   */
  getRoutingDecision(message: string): AIRoutingResult {
    return analyzeIntent(message)
  }
}

// ============================================================================
// Export Singleton
// ============================================================================

export const chatService = new ChatService()
export default chatService
