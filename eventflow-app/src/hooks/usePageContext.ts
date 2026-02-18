// EventFlow AI Chat - Page Context Hook

import { useEffect } from 'react'
import {
  Calendar,
  Users,
  Building2,
  CheckSquare,
  MessageSquare,
  Plus,
  FileSpreadsheet,
  HelpCircle,
  BarChart3,
  Clock,
  DollarSign,
  Mic,
  PlayCircle,
  FileText
} from 'lucide-react'
import type { SlashCommand, PageType, ChatAction } from '../types/chat'
import { useChatContext } from '../contexts/ChatContext'

// ============================================================================
// Slash Commands Registry
// ============================================================================

// Helper to create action from command
const createAction = (
  type: ChatAction['type'],
  label: string,
  labelHebrew: string,
  data?: Record<string, unknown>,
  targetPage?: PageType
): ChatAction => ({
  id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  type,
  label,
  labelHebrew,
  data,
  targetPage
})

// All available slash commands
export const SLASH_COMMANDS: SlashCommand[] = [
  // Event commands
  {
    command: '/event',
    description: 'Create or manage events',
    descriptionHebrew: 'יצירה או ניהול אירועים',
    icon: Calendar,
    availableOn: ['dashboard', 'events', 'event-detail'],
    category: 'events',
    handler: async (params) => {
      if (!params) {
        return createAction('open_modal', 'Create Event', 'צור אירוע', { modal: 'create-event' })
      }
      return createAction('create_event', 'Create Event', 'צור אירוע', { name: params })
    }
  },
  {
    command: '/create',
    description: 'Quick create anything',
    descriptionHebrew: 'יצירה מהירה',
    icon: Plus,
    availableOn: ['dashboard', 'events', 'guests', 'vendors', 'checklist'],
    category: 'system',
    handler: async (params, context) => {
      // Smart create based on current page
      const pageActions: Record<PageType, ChatAction['type']> = {
        'events': 'create_event',
        'guests': 'create_guest',
        'vendors': 'create_vendor',
        'checklist': 'create_task',
        'dashboard': 'create_event',
        'event-detail': 'create_session',
        'messages': 'send_message',
        'program': 'create_session',
        'budget': 'open_modal',
        'settings': 'open_modal',
        'timeline': 'create_event'
      }
      const type = pageActions[context.currentPage] || 'open_modal'
      return createAction(type, 'Create', 'צור', { params })
    }
  },

  // Guest commands
  {
    command: '/guest',
    description: 'Add or find guests',
    descriptionHebrew: 'הוסף או חפש אורחים',
    icon: Users,
    availableOn: ['dashboard', 'events', 'event-detail', 'guests'],
    category: 'guests',
    handler: async (params) => {
      if (!params) {
        return createAction('open_modal', 'Add Guest', 'הוסף אורח', { modal: 'add-guest' })
      }
      // Check if searching or creating
      if (params.startsWith('חפש') || params.startsWith('search')) {
        return createAction('filter_data', 'Search Guest', 'חפש אורח', { query: params })
      }
      return createAction('create_guest', 'Add Guest', 'הוסף אורח', { name: params })
    }
  },
  {
    command: '/import',
    description: 'Import guests from CSV',
    descriptionHebrew: 'ייבא אורחים מ-CSV',
    icon: FileSpreadsheet,
    availableOn: ['guests', 'event-detail'],
    category: 'guests',
    handler: async () => {
      return createAction('run_skill', 'Import CSV', 'ייבא CSV', { skill: 'csv-import' })
    }
  },

  // Vendor commands
  {
    command: '/vendor',
    description: 'Manage vendors',
    descriptionHebrew: 'ניהול ספקים',
    icon: Building2,
    availableOn: ['dashboard', 'events', 'event-detail', 'vendors'],
    category: 'vendors',
    handler: async (params) => {
      if (!params) {
        return createAction('open_modal', 'Add Vendor', 'הוסף ספק', { modal: 'add-vendor' })
      }
      return createAction('create_vendor', 'Add Vendor', 'הוסף ספק', { name: params })
    }
  },
  {
    command: '/quote',
    description: 'Request vendor quote',
    descriptionHebrew: 'בקש הצעת מחיר מספק',
    icon: DollarSign,
    availableOn: ['vendors', 'event-detail'],
    category: 'vendors',
    handler: async (params) => {
      return createAction('open_modal', 'Request Quote', 'בקש הצעת מחיר', { modal: 'request-quote', vendor: params })
    }
  },

  // Task commands
  {
    command: '/task',
    description: 'Add checklist task',
    descriptionHebrew: 'הוסף משימה לרשימה',
    icon: CheckSquare,
    availableOn: ['dashboard', 'events', 'event-detail', 'checklist'],
    category: 'tasks',
    handler: async (params) => {
      if (!params) {
        return createAction('open_modal', 'Add Task', 'הוסף משימה', { modal: 'add-task' })
      }
      return createAction('create_task', 'Add Task', 'הוסף משימה', { title: params })
    }
  },
  {
    command: '/done',
    description: 'Mark task as complete',
    descriptionHebrew: 'סמן משימה כהושלמה',
    icon: CheckSquare,
    availableOn: ['checklist', 'event-detail'],
    category: 'tasks',
    handler: async (params) => {
      return createAction('update_event', 'Complete Task', 'השלם משימה', { taskName: params, status: 'completed' })
    }
  },

  // Message commands
  {
    command: '/message',
    description: 'Send WhatsApp message',
    descriptionHebrew: 'שלח הודעת WhatsApp',
    icon: MessageSquare,
    availableOn: ['dashboard', 'events', 'event-detail', 'guests', 'messages'],
    category: 'messages',
    handler: async (params) => {
      return createAction('send_whatsapp', 'Send WhatsApp', 'שלח WhatsApp', { message: params })
    }
  },
  {
    command: '/template',
    description: 'Use message template',
    descriptionHebrew: 'השתמש בתבנית הודעה',
    icon: FileText,
    availableOn: ['messages', 'event-detail'],
    category: 'messages',
    handler: async (params) => {
      return createAction('open_modal', 'Select Template', 'בחר תבנית', { modal: 'message-templates', filter: params })
    }
  },

  // Program commands
  {
    command: '/session',
    description: 'Add program session',
    descriptionHebrew: 'הוסף מושב לתוכנית',
    icon: Clock,
    availableOn: ['program', 'event-detail'],
    category: 'program',
    handler: async (params) => {
      if (!params) {
        return createAction('open_modal', 'Add Session', 'הוסף מושב', { modal: 'add-session' })
      }
      return createAction('create_session', 'Add Session', 'הוסף מושב', { title: params })
    }
  },
  {
    command: '/speaker',
    description: 'Manage speakers',
    descriptionHebrew: 'ניהול מרצים',
    icon: Mic,
    availableOn: ['program', 'event-detail'],
    category: 'program',
    handler: async (params) => {
      return createAction('open_modal', 'Add Speaker', 'הוסף מרצה', { modal: 'add-speaker', name: params })
    }
  },

  // Navigation commands
  {
    command: '/status',
    description: 'Show event status overview',
    descriptionHebrew: 'הצג סטטוס אירוע',
    icon: BarChart3,
    availableOn: ['dashboard', 'events', 'event-detail'],
    category: 'navigation',
    handler: async (_, context) => {
      return createAction('navigate', 'View Status', 'צפה בסטטוס', {}, context.eventId ? 'event-detail' : 'dashboard')
    }
  },
  {
    command: '/go',
    description: 'Navigate to page',
    descriptionHebrew: 'נווט לעמוד',
    icon: PlayCircle,
    availableOn: ['dashboard', 'events', 'event-detail', 'guests', 'vendors', 'checklist', 'messages', 'program', 'budget', 'settings', 'timeline'],
    category: 'navigation',
    handler: async (params) => {
      const pageMap: Record<string, PageType> = {
        'dashboard': 'dashboard',
        'events': 'events',
        'guests': 'guests',
        'vendors': 'vendors',
        'checklist': 'checklist',
        'messages': 'messages',
        'program': 'program',
        'budget': 'budget',
        'settings': 'settings',
        'אירועים': 'events',
        'אורחים': 'guests',
        'ספקים': 'vendors',
        'משימות': 'checklist',
        'הודעות': 'messages',
        'תוכנית': 'program',
        'תקציב': 'budget',
        'הגדרות': 'settings'
      }
      const targetPage = pageMap[params.toLowerCase()] || 'dashboard'
      return createAction('navigate', `Go to ${params}`, `עבור ל${params}`, {}, targetPage)
    }
  },

  // Skill commands
  {
    command: '/export',
    description: 'Export data to file',
    descriptionHebrew: 'ייצא נתונים לקובץ',
    icon: FileSpreadsheet,
    availableOn: ['guests', 'vendors', 'checklist', 'program', 'event-detail'],
    category: 'skills',
    handler: async (params, context) => {
      const format = params?.toLowerCase().includes('pdf') ? 'pdf' : 'csv'
      return createAction('run_skill', `Export ${format.toUpperCase()}`, `ייצא ${format.toUpperCase()}`, {
        skill: format === 'pdf' ? 'pdf-export' : 'csv-export',
        dataType: context.currentPage
      })
    }
  },

  // Help command
  {
    command: '/help',
    description: 'Show available commands',
    descriptionHebrew: 'הצג פקודות זמינות',
    icon: HelpCircle,
    availableOn: ['dashboard', 'events', 'event-detail', 'guests', 'vendors', 'checklist', 'messages', 'program', 'budget', 'settings', 'timeline'],
    category: 'system',
    handler: async () => {
      return null // Handled specially in chat to show command list
    }
  }
]

// ============================================================================
// Get Commands for Page
// ============================================================================

export function getSlashCommands(page: PageType): SlashCommand[] {
  return SLASH_COMMANDS.filter(cmd => cmd.availableOn.includes(page))
}

// ============================================================================
// Page Welcome Messages
// ============================================================================

export const PAGE_WELCOME_MESSAGES: Record<PageType, string> = {
  'dashboard': 'שלום! אני כאן לעזור לך לנהל את האירועים שלך. מה תרצה לעשות?',
  'events': 'ברוך הבא לניהול אירועים. תוכל ליצור אירוע חדש עם /event או לחפש קיים.',
  'event-detail': 'אתה בדף פרטי האירוע. אני יכול לעזור עם אורחים, ספקים, משימות או התוכנית.',
  'guests': 'ניהול אורחים - הוסף אורחים עם /guest או ייבא מ-CSV עם /import.',
  'vendors': 'ניהול ספקים - הוסף ספק עם /vendor או בקש הצעת מחיר עם /quote.',
  'checklist': 'רשימת משימות - הוסף משימה עם /task או סמן כהושלמה עם /done.',
  'messages': 'מרכז הודעות - שלח הודעת WhatsApp עם /message או השתמש בתבנית עם /template.',
  'program': 'בונה התוכנית - הוסף מושב עם /session או מרצה עם /speaker.',
  'budget': 'ניהול תקציב - אני יכול לעזור לך לנתח הוצאות ולתכנן את התקציב.',
  'settings': 'הגדרות המערכת - מה תרצה לשנות?',
  'timeline': 'ציר הזמן - צפה בתזמון האירועים שלך.'
}

// ============================================================================
// Hook
// ============================================================================

export function usePageContext(page: PageType, eventId?: string, eventName?: string) {
  const { setPageContext, state } = useChatContext()

  useEffect(() => {
    setPageContext(page, eventId, eventName)
  }, [page, eventId, eventName, setPageContext])

  return {
    context: state.pageContext,
    availableCommands: state.pageContext.availableCommands,
    welcomeMessage: PAGE_WELCOME_MESSAGES[page]
  }
}

export default usePageContext
