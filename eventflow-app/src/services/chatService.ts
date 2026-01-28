// EventFlow AI Chat Service - Hybrid AI Routing (Claude + Gemini)

import { createClient } from '@supabase/supabase-js'
import type {
  ChatRequest,
  ChatResponse,
  ChatAction,
  ChatMessage,
  PageContext,
  AIRoutingResult,
  SkillType,
  AgentType
} from '../types/chat'
import { SLASH_COMMANDS } from '../hooks/usePageContext'

// ============================================================================
// Supabase Client
// ============================================================================

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ============================================================================
// Intent Analysis
// ============================================================================

// Action keywords in Hebrew and English
const ACTION_KEYWORDS = {
  create: ['צור', 'הוסף', 'חדש', 'create', 'add', 'new'],
  update: ['עדכן', 'שנה', 'ערוך', 'update', 'edit', 'change', 'modify'],
  delete: ['מחק', 'הסר', 'delete', 'remove'],
  export: ['ייצא', 'הורד', 'export', 'download'],
  import: ['ייבא', 'העלה', 'import', 'upload'],
  send: ['שלח', 'send', 'message', 'הודעה'],
  search: ['חפש', 'מצא', 'search', 'find'],
  navigate: ['עבור', 'לך', 'פתח', 'go', 'open', 'navigate']
}

// Skill triggers
const SKILL_TRIGGERS: Record<string, SkillType> = {
  'pdf': 'pdf-export',
  'אקסל': 'excel-export',
  'excel': 'excel-export',
  'ייבא': 'excel-import',
  'import': 'excel-import',
  'וואטסאפ': 'whatsapp-send',
  'whatsapp': 'whatsapp-send',
  'qr': 'qr-generate',
  'קיוארקוד': 'qr-generate',
  'יומן': 'calendar-sync',
  'calendar': 'calendar-sync',
  'דוח': 'report-generate',
  'report': 'report-generate'
}

/**
 * Analyze user message to determine routing
 */
function analyzeIntent(message: string): AIRoutingResult {
  const normalizedMessage = message.toLowerCase().trim()

  // Check for slash commands first
  if (normalizedMessage.startsWith('/')) {
    const commandParts = normalizedMessage.split(' ')
    const command = commandParts[0]
    const matchedCommand = SLASH_COMMANDS.find(c => c.command === command)

    if (matchedCommand) {
      return {
        provider: 'claude',
        reason: 'Slash command detected',
        isAction: true,
        command
      }
    }
  }

  // Check for action keywords
  for (const [actionType, keywords] of Object.entries(ACTION_KEYWORDS)) {
    for (const keyword of keywords) {
      if (normalizedMessage.includes(keyword)) {
        return {
          provider: 'claude',
          reason: `Action keyword detected: ${actionType}`,
          isAction: true
        }
      }
    }
  }

  // Check for skill triggers
  for (const [trigger, skill] of Object.entries(SKILL_TRIGGERS)) {
    if (normalizedMessage.includes(trigger)) {
      return {
        provider: 'claude',
        reason: `Skill trigger detected: ${skill}`,
        isAction: true,
        skillRequired: skill
      }
    }
  }

  // Default to Gemini for Q&A
  return {
    provider: 'gemini',
    reason: 'General question/conversation',
    isAction: false
  }
}

// ============================================================================
// Claude Service (Actions & Skills)
// ============================================================================

class ClaudeService {
  /**
   * Execute action or skill using Claude
   */
  async execute(
    message: string,
    intent: AIRoutingResult,
    context: PageContext,
    agent: AgentType
  ): Promise<ChatResponse> {
    // Handle slash commands locally first
    if (intent.command) {
      return this.handleSlashCommand(message, intent.command, context)
    }

    // For skills, call Supabase Edge Function
    if (intent.skillRequired) {
      return this.executeSkill(intent.skillRequired, message, context)
    }

    // For other actions, generate response with action buttons
    return this.generateActionResponse(message, context, agent)
  }

  /**
   * Handle slash command
   */
  private async handleSlashCommand(
    message: string,
    command: string,
    context: PageContext
  ): Promise<ChatResponse> {
    const slashCommand = SLASH_COMMANDS.find(c => c.command === command)
    if (!slashCommand) {
      return {
        content: `הפקודה ${command} לא נמצאה. הקלד /help לרשימת הפקודות.`,
        metadata: { command }
      }
    }

    // Handle /help specially
    if (command === '/help') {
      const availableCommands = SLASH_COMMANDS.filter(c =>
        c.availableOn.includes(context.currentPage)
      )

      const commandList = availableCommands
        .map(c => `**${c.command}** - ${c.descriptionHebrew}`)
        .join('\n')

      return {
        content: `## פקודות זמינות בדף זה:\n\n${commandList}`,
        metadata: { command }
      }
    }

    // Extract params after the command
    const params = message.slice(command.length).trim()

    // Execute the command handler
    const action = await slashCommand.handler(params, context)

    if (action) {
      return {
        content: `מבצע: ${action.labelHebrew}`,
        actions: [action],
        metadata: { command }
      }
    }

    return {
      content: `הפקודה ${command} הופעלה.`,
      metadata: { command }
    }
  }

  /**
   * Execute a skill
   */
  private async executeSkill(
    skill: SkillType,
    _message: string,
    context: PageContext
  ): Promise<ChatResponse> {
    // For now, return action button to trigger skill
    const skillNames: Record<SkillType, string> = {
      'pdf-export': 'ייצוא PDF',
      'excel-import': 'ייבוא אקסל',
      'excel-export': 'ייצוא אקסל',
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

  /**
   * Generate action response based on intent
   */
  private async generateActionResponse(
    message: string,
    context: PageContext,
    agent: AgentType
  ): Promise<ChatResponse> {
    // Analyze what action the user wants
    const normalizedMessage = message.toLowerCase()

    // Build actions based on detected intent
    const actions: ChatAction[] = []
    let content = ''

    // Check for create actions
    if (ACTION_KEYWORDS.create.some(k => normalizedMessage.includes(k))) {
      if (normalizedMessage.includes('אירוע') || normalizedMessage.includes('event')) {
        actions.push({
          id: `action-${Date.now()}-1`,
          type: 'create_event',
          label: 'Create Event',
          labelHebrew: 'צור אירוע',
          data: { source: 'chat' }
        })
        content = 'אשמח לעזור ליצור אירוע חדש!'
      } else if (normalizedMessage.includes('אורח') || normalizedMessage.includes('guest')) {
        actions.push({
          id: `action-${Date.now()}-1`,
          type: 'create_guest',
          label: 'Add Guest',
          labelHebrew: 'הוסף אורח',
          data: { source: 'chat' }
        })
        content = 'בוא נוסיף אורח חדש!'
      } else if (normalizedMessage.includes('ספק') || normalizedMessage.includes('vendor')) {
        actions.push({
          id: `action-${Date.now()}-1`,
          type: 'create_vendor',
          label: 'Add Vendor',
          labelHebrew: 'הוסף ספק',
          data: { source: 'chat' }
        })
        content = 'בוא נוסיף ספק חדש!'
      } else if (normalizedMessage.includes('משימה') || normalizedMessage.includes('task')) {
        actions.push({
          id: `action-${Date.now()}-1`,
          type: 'create_task',
          label: 'Add Task',
          labelHebrew: 'הוסף משימה',
          data: { source: 'chat' }
        })
        content = 'בוא נוסיף משימה חדשה!'
      }
    }

    // Check for export actions
    if (ACTION_KEYWORDS.export.some(k => normalizedMessage.includes(k))) {
      const format = normalizedMessage.includes('pdf') ? 'pdf' : 'excel'
      actions.push({
        id: `action-${Date.now()}-1`,
        type: 'run_skill',
        label: `Export ${format.toUpperCase()}`,
        labelHebrew: `ייצא ${format.toUpperCase()}`,
        data: { skill: `${format}-export`, dataType: context.currentPage }
      })
      content = `מוכן לייצא ל-${format.toUpperCase()}!`
    }

    // Check for send actions
    if (ACTION_KEYWORDS.send.some(k => normalizedMessage.includes(k))) {
      actions.push({
        id: `action-${Date.now()}-1`,
        type: 'send_whatsapp',
        label: 'Send WhatsApp',
        labelHebrew: 'שלח WhatsApp',
        data: { source: 'chat' }
      })
      content = 'מוכן לשלוח הודעה!'
    }

    // If no specific action detected, provide general help
    if (actions.length === 0) {
      content = 'לא הבנתי בדיוק מה תרצה לעשות. אפשר לנסח מחדש או להקליד /help לעזרה.'
    }

    return {
      content,
      actions: actions.length > 0 ? actions : undefined,
      metadata: { agentType: agent }
    }
  }
}

// ============================================================================
// Gemini Service (Q&A)
// ============================================================================

class GeminiService {
  /**
   * Chat using Gemini via Supabase Edge Function
   */
  async chat(
    message: string,
    context: PageContext,
    conversationHistory: ChatMessage[]
  ): Promise<ChatResponse> {
    try {
      // Build context message for Gemini
      const systemContext = this.buildSystemContext(context)
      const historyText = this.formatHistory(conversationHistory)

      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          message,
          context: systemContext,
          history: historyText,
          page: context.currentPage,
          eventId: context.eventId,
          eventName: context.eventName
        }
      })

      if (error) {
        console.error('Gemini API error:', error)
        return {
          content: 'מצטער, אירעה שגיאה בתקשורת. אנא נסה שוב.',
          metadata: { page: context.currentPage }
        }
      }

      return {
        content: data.response || data.message || 'לא הצלחתי לקבל תשובה.',
        suggestions: data.suggestions,
        metadata: { page: context.currentPage }
      }
    } catch (error) {
      console.error('Gemini service error:', error)
      return {
        content: 'מצטער, אירעה שגיאה. אנא נסה שוב מאוחר יותר.',
        metadata: { page: context.currentPage }
      }
    }
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
אתה עוזר AI במערכת EventFlow לניהול אירועים.
המשתמש נמצא כרגע ב: ${pageDescriptions[context.currentPage] || context.currentPage}
${context.eventName ? `אירוע נוכחי: ${context.eventName}` : ''}

תפקידך:
- לענות על שאלות בנושא תכנון וניהול אירועים
- לתת המלצות וטיפים מקצועיים
- לעזור למשתמש לנווט במערכת
- לענות בעברית באופן ידידותי ומקצועי
- להיות תמציתי אך מקיף

אל תבצע פעולות - רק תן מידע והמלצות. אם המשתמש רוצה לבצע פעולה, הדרך אותו להשתמש בפקודות (/) או בכפתורי הפעולה.
    `.trim()
  }

  /**
   * Format conversation history for context
   */
  private formatHistory(messages: ChatMessage[]): string {
    return messages
      .slice(-5) // Last 5 messages for context
      .map(m => `${m.role === 'user' ? 'משתמש' : 'עוזר'}: ${m.content}`)
      .join('\n')
  }
}

// ============================================================================
// Main Chat Service
// ============================================================================

class ChatService {
  private claudeService = new ClaudeService()
  private geminiService = new GeminiService()

  /**
   * Process user message and route to appropriate AI
   */
  async processMessage(request: ChatRequest): Promise<ChatResponse> {
    const { message, context, agent, conversationHistory } = request

    // Analyze intent to determine routing
    const intent = analyzeIntent(message)

    console.log('Chat routing:', { message, intent })

    // Route to appropriate service
    if (intent.isAction || intent.provider === 'claude') {
      return this.claudeService.execute(message, intent, context, agent)
    } else {
      return this.geminiService.chat(message, context, conversationHistory)
    }
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
