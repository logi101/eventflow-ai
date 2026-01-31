// EventFlow AI Chat - Chat Window Component

import { useRef, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, Settings, Bot } from 'lucide-react'
import { useChatContext } from '../../contexts/ChatContext'
import { useEvent } from '../../contexts/EventContext'
import { PAGE_WELCOME_MESSAGES } from '../../hooks/usePageContext'
import ChatMessage from './ChatMessage'
import ChatInput from './ChatInput'
import ChatSettings from './ChatSettings'

// ============================================================================
// Types
// ============================================================================

interface ChatWindowProps {
  height: number
}

// ============================================================================
// Chat Window Component
// ============================================================================

export function ChatWindow({ height }: ChatWindowProps) {
  const {
    state,
    clearMessages,
    switchAgent
  } = useChatContext()
  const { selectedEvent } = useEvent()

  const { messages, isLoading, pageContext, currentAgent, settings } = state
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [showSettings, setShowSettings] = useState(false)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Get welcome message for current page
  const welcomeMessage = PAGE_WELCOME_MESSAGES[pageContext.currentPage]

  // Agent display info
  const agentInfo: Record<string, { name: string; emoji: string }> = {
    'general': { name: 'עוזר כללי', emoji: '🤖' },
    'event-planner': { name: 'מתכנן אירועים', emoji: '📅' },
    'guest-manager': { name: 'מנהל אורחים', emoji: '👥' },
    'vendor-coordinator': { name: 'רכז ספקים', emoji: '🏢' },
    'task-assistant': { name: 'עוזר משימות', emoji: '✅' },
    'budget-advisor': { name: 'יועץ תקציב', emoji: '💰' }
  }

  return (
    <div
      className="flex flex-col"
      style={{ height }}
      data-testid="chat-window-content"
    >
      {/* Toolbar */}
      <div
        className="flex items-center justify-between border-b px-3 py-2"
        style={{ borderColor: `${settings.accentColor}15` }}
      >
        {/* Agent Selector */}
        <div className="flex items-center gap-2">
          <span className="text-lg">{agentInfo[currentAgent]?.emoji}</span>
          <select
            value={currentAgent}
            onChange={(e) => switchAgent(e.target.value as typeof currentAgent)}
            className="rounded-md border-none bg-transparent text-xs text-gray-300 focus:outline-none focus:ring-0"
            data-testid="agent-selector"
          >
            {Object.entries(agentInfo).map(([id, info]) => (
              <option key={id} value={id} className="bg-gray-900">
                {info.emoji} {info.name}
              </option>
            ))}
          </select>
        </div>

        {/* Event Context Badge + Actions */}
        <div className="flex items-center gap-1">
          {selectedEvent && (
            <span className="flex items-center gap-1 rounded-md bg-red-500/10 px-2 py-1 text-[10px] text-red-400 border border-red-500/20">
              <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
              {selectedEvent.name}
            </span>
          )}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowSettings(!showSettings)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-800 hover:text-gray-300"
            data-testid="chat-settings-button"
          >
            <Settings className="h-3.5 w-3.5" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={clearMessages}
            className="flex h-7 w-7 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-800 hover:text-red-400"
            title="נקה היסטוריה"
            data-testid="clear-messages-button"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </motion.button>
        </div>
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b"
            style={{ borderColor: `${settings.accentColor}15` }}
          >
            <ChatSettings onClose={() => setShowSettings(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages Area */}
      <div
        className="flex-1 overflow-y-auto px-3 py-4"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: `${settings.accentColor}40 transparent`
        }}
        data-testid="messages-container"
      >
        {/* Empty State / Welcome */}
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-8 text-center"
          >
            <div
              className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{ backgroundColor: `${settings.accentColor}20` }}
            >
              <Bot className="h-8 w-8" style={{ color: settings.accentColor }} />
            </div>
            <h4 className="mb-2 text-sm font-medium text-gray-200">
              שלום! אני EventFlow AI
            </h4>
            <p className="max-w-[260px] text-xs leading-relaxed text-gray-500" dir="rtl">
              {welcomeMessage}
            </p>
            <p className="mt-3 text-xs text-gray-600">
              הקלד <span style={{ color: settings.accentColor }}>/help</span> לרשימת הפקודות
            </p>
          </motion.div>
        )}

        {/* Messages List */}
        <AnimatePresence mode="popLayout">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
        </AnimatePresence>

        {/* Loading Indicator */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-3 flex justify-start"
          >
            <div
              className="rounded-xl rounded-tl-sm px-4 py-3"
              style={{ backgroundColor: '#1a1d24' }}
            >
              <div className="flex items-center gap-1.5">
                <motion.span
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: settings.accentColor }}
                />
                <motion.span
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: settings.accentColor }}
                />
                <motion.span
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: settings.accentColor }}
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Scroll Anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <ChatInput />
    </div>
  )
}

export default ChatWindow
