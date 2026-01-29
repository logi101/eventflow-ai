// EventFlow AI Chat System - Global Context

import { createContext, useContext, useReducer, useCallback, useEffect, type ReactNode } from 'react'
import type {
  ChatState,
  ChatMessage,
  ChatAction,
  ChatSettings,
  ChatWindowState,
  PageContext,
  PageType,
  AgentType
} from '../types/chat'
import { DEFAULT_CHAT_SETTINGS } from '../types/chat'
import { getSlashCommands } from '../hooks/usePageContext'

// ============================================================================
// Initial State
// ============================================================================

const STORAGE_KEY = 'eventflow-chat-settings'
const MESSAGES_KEY = 'eventflow-chat-messages'

const loadSettings = (): ChatSettings => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return { ...DEFAULT_CHAT_SETTINGS, ...JSON.parse(stored) }
    }
  } catch {
    // Ignore parsing errors
  }
  return DEFAULT_CHAT_SETTINGS
}

const loadMessages = (): ChatMessage[] => {
  try {
    const stored = localStorage.getItem(MESSAGES_KEY)
    if (stored) {
      const messages = JSON.parse(stored)
      // Convert timestamp strings back to Date objects
      return messages.map((m: ChatMessage) => ({
        ...m,
        timestamp: new Date(m.timestamp)
      }))
    }
  } catch {
    // Ignore parsing errors
  }
  return []
}

const createInitialState = (): ChatState => ({
  windowState: 'closed',
  messages: loadMessages(),
  isLoading: false,
  currentAgent: 'general',
  settings: loadSettings(),
  unreadCount: 0,
  pageContext: {
    currentPage: 'dashboard',
    availableCommands: []
  }
})

// ============================================================================
// Actions
// ============================================================================

type ChatActionTypes =
  | { type: 'SET_WINDOW_STATE'; payload: ChatWindowState }
  | { type: 'ADD_MESSAGE'; payload: ChatMessage }
  | { type: 'UPDATE_MESSAGE'; payload: { id: string; updates: Partial<ChatMessage> } }
  | { type: 'CLEAR_MESSAGES' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_AGENT'; payload: AgentType }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<ChatSettings> }
  | { type: 'SET_PAGE_CONTEXT'; payload: Partial<PageContext> }
  | { type: 'MARK_ACTION_COMPLETED'; payload: { messageId: string; actionId: string } }
  | { type: 'RESET_UNREAD' }
  | { type: 'INCREMENT_UNREAD' }

// ============================================================================
// Reducer
// ============================================================================

function chatReducer(state: ChatState, action: ChatActionTypes): ChatState {
  switch (action.type) {
    case 'SET_WINDOW_STATE':
      return {
        ...state,
        windowState: action.payload,
        unreadCount: action.payload === 'open' ? 0 : state.unreadCount
      }

    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload],
        unreadCount: state.windowState !== 'open' && action.payload.role === 'assistant'
          ? state.unreadCount + 1
          : state.unreadCount
      }

    case 'UPDATE_MESSAGE':
      return {
        ...state,
        messages: state.messages.map(m =>
          m.id === action.payload.id ? { ...m, ...action.payload.updates } : m
        )
      }

    case 'CLEAR_MESSAGES':
      return {
        ...state,
        messages: []
      }

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      }

    case 'SET_AGENT':
      return {
        ...state,
        currentAgent: action.payload
      }

    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.payload }
      }

    case 'SET_PAGE_CONTEXT':
      return {
        ...state,
        pageContext: { ...state.pageContext, ...action.payload }
      }

    case 'MARK_ACTION_COMPLETED':
      return {
        ...state,
        messages: state.messages.map(m => {
          if (m.id === action.payload.messageId && m.actions) {
            return {
              ...m,
              actions: m.actions.map(a =>
                a.id === action.payload.actionId ? { ...a, completed: true } : a
              )
            }
          }
          return m
        })
      }

    case 'RESET_UNREAD':
      return {
        ...state,
        unreadCount: 0
      }

    case 'INCREMENT_UNREAD':
      return {
        ...state,
        unreadCount: state.unreadCount + 1
      }

    default:
      return state
  }
}

// ============================================================================
// Context
// ============================================================================

interface ChatContextValue {
  state: ChatState
  // Window actions
  openChat: () => void
  closeChat: () => void
  minimizeChat: () => void
  toggleChat: () => void
  // Message actions
  sendMessage: (content: string) => Promise<void>
  addSystemMessage: (content: string, actions?: ChatAction[]) => void
  clearMessages: () => void
  // Action handling
  executeAction: (action: ChatAction) => void
  markActionCompleted: (messageId: string, actionId: string) => void
  // Agent/Settings
  switchAgent: (agent: AgentType) => void
  updateSettings: (settings: Partial<ChatSettings>) => void
  // Page context
  setPageContext: (page: PageType, eventId?: string, eventName?: string) => void
}

const ChatContext = createContext<ChatContextValue | null>(null)

// ============================================================================
// Provider
// ============================================================================

interface ChatProviderProps {
  children: ReactNode
}

export function ChatProvider({ children }: ChatProviderProps) {
  const [state, dispatch] = useReducer(chatReducer, undefined, createInitialState)

  // Persist settings to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.settings))
  }, [state.settings])

  // Persist messages to localStorage (limit to last 50 messages)
  useEffect(() => {
    const messagesToStore = state.messages.slice(-50)
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(messagesToStore))
  }, [state.messages])

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const shortcut = state.settings.shortcutKey
      const keys = shortcut.toLowerCase().split('+')

      const ctrlRequired = keys.includes('ctrl')
      const altRequired = keys.includes('alt')
      const shiftRequired = keys.includes('shift')
      const key = keys[keys.length - 1]

      if (
        (ctrlRequired ? e.ctrlKey || e.metaKey : true) &&
        (altRequired ? e.altKey : true) &&
        (shiftRequired ? e.shiftKey : true) &&
        e.key.toLowerCase() === key
      ) {
        e.preventDefault()
        toggleChat()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [state.settings.shortcutKey])

  // Window actions
  const openChat = useCallback(() => {
    dispatch({ type: 'SET_WINDOW_STATE', payload: 'open' })
  }, [])

  const closeChat = useCallback(() => {
    dispatch({ type: 'SET_WINDOW_STATE', payload: 'closed' })
  }, [])

  const minimizeChat = useCallback(() => {
    dispatch({ type: 'SET_WINDOW_STATE', payload: 'minimized' })
  }, [])

  const toggleChat = useCallback(() => {
    const newState = state.windowState === 'open' ? 'closed' : 'open'
    dispatch({ type: 'SET_WINDOW_STATE', payload: newState })
  }, [state.windowState])

  // Generate unique ID
  const generateId = () => `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  // Message actions
  const sendMessage = useCallback(async (content: string) => {
    // Add user message
    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: new Date(),
      metadata: {
        page: state.pageContext.currentPage
      }
    }
    dispatch({ type: 'ADD_MESSAGE', payload: userMessage })
    dispatch({ type: 'SET_LOADING', payload: true })

    try {
      // Import chatService dynamically to avoid circular dependency
      const { chatService } = await import('../services/chatService')

      const response = await chatService.processMessage({
        message: content,
        context: state.pageContext,
        agent: state.currentAgent,
        conversationHistory: state.messages.slice(-10)
      })

      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        actions: response.actions,
        metadata: response.metadata
      }
      dispatch({ type: 'ADD_MESSAGE', payload: assistantMessage })

      // Play notification sound if enabled and window not open
      if (state.settings.soundEnabled && state.windowState !== 'open') {
        // Sound will be played by the component
      }
    } catch (error) {
      console.error('[EventFlow Chat] sendMessage error:', error)
      const errorDetail = error instanceof Error ? error.message : 'שגיאה בלתי צפויה'
      const errorMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: `שגיאה בשליחת ההודעה: **${errorDetail}**\n\nבדוק את חיבור האינטרנט ונסה שוב.`,
        timestamp: new Date()
      }
      dispatch({ type: 'ADD_MESSAGE', payload: errorMessage })
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [state.pageContext, state.currentAgent, state.messages, state.settings.soundEnabled, state.windowState])

  const addSystemMessage = useCallback((content: string, actions?: ChatAction[]) => {
    const message: ChatMessage = {
      id: generateId(),
      role: 'system',
      content,
      timestamp: new Date(),
      actions
    }
    dispatch({ type: 'ADD_MESSAGE', payload: message })
  }, [])

  const clearMessages = useCallback(() => {
    dispatch({ type: 'CLEAR_MESSAGES' })
    localStorage.removeItem(MESSAGES_KEY)
  }, [])

  // Action handling
  const executeAction = useCallback((action: ChatAction) => {
    // Dispatch custom event for page to handle
    const event = new CustomEvent('chat-action', { detail: action })
    window.dispatchEvent(event)

    // Handle navigation actions directly
    if (action.type === 'navigate' && action.targetPage) {
      const navEvent = new CustomEvent('chat-navigate', {
        detail: {
          page: action.targetPage,
          params: action.data as Record<string, string>
        }
      })
      window.dispatchEvent(navEvent)
    }
  }, [])

  const markActionCompleted = useCallback((messageId: string, actionId: string) => {
    dispatch({ type: 'MARK_ACTION_COMPLETED', payload: { messageId, actionId } })
  }, [])

  // Agent/Settings
  const switchAgent = useCallback((agent: AgentType) => {
    dispatch({ type: 'SET_AGENT', payload: agent })

    // Add system message about agent switch
    const agentNames: Record<AgentType, string> = {
      'general': 'עוזר כללי',
      'event-planner': 'מתכנן אירועים',
      'guest-manager': 'מנהל אורחים',
      'vendor-coordinator': 'רכז ספקים',
      'task-assistant': 'עוזר משימות',
      'budget-advisor': 'יועץ תקציב'
    }

    addSystemMessage(`עברת לסוכן: ${agentNames[agent]}`)
  }, [addSystemMessage])

  const updateSettings = useCallback((settings: Partial<ChatSettings>) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: settings })
  }, [])

  // Page context
  const setPageContext = useCallback((page: PageType, eventId?: string, eventName?: string) => {
    const availableCommands = getSlashCommands(page)
    dispatch({
      type: 'SET_PAGE_CONTEXT',
      payload: {
        currentPage: page,
        eventId,
        eventName,
        availableCommands
      }
    })
  }, [])

  const value: ChatContextValue = {
    state,
    openChat,
    closeChat,
    minimizeChat,
    toggleChat,
    sendMessage,
    addSystemMessage,
    clearMessages,
    executeAction,
    markActionCompleted,
    switchAgent,
    updateSettings,
    setPageContext
  }

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  )
}

// ============================================================================
// Hook
// ============================================================================

export function useChatContext(): ChatContextValue {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider')
  }
  return context
}

export { ChatContext }
