// EventFlow AI Chat - Main Floating Chat Component

import { useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, X, Minus, Maximize2 } from 'lucide-react'
import { useChatContext } from '../../contexts/ChatContext'
import { useEvent } from '../../contexts/EventContext'
import { CHAT_SIZES } from '../../types/chat'
import ChatWindow from './ChatWindow'

// ============================================================================
// Floating Chat Component
// ============================================================================

export function FloatingChat() {
  const {
    state,
    openChat,
    closeChat,
    minimizeChat
  } = useChatContext()
  const { selectedEvent } = useEvent()

  const { windowState, settings, unreadCount } = state
  const containerRef = useRef<HTMLDivElement>(null)
  const hasEventContext = !!selectedEvent

  // Get position classes based on settings
  const getPositionClasses = () => {
    switch (settings.position) {
      case 'bottom-left':
        return 'bottom-4 left-4'
      case 'bottom-right':
        return 'bottom-4 right-4'
      case 'top-left':
        return 'top-4 left-4'
      case 'top-right':
        return 'top-4 right-4'
      default:
        return 'bottom-4 left-4' // RTL default
    }
  }

  // Get window dimensions
  const dimensions = CHAT_SIZES[settings.size]

  // Animation variants
  const buttonVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: { type: 'spring' as const, stiffness: 300, damping: 20 }
    },
    hover: { scale: 1.1 },
    tap: { scale: 0.95 }
  }

  const windowVariants = {
    hidden: {
      opacity: 0,
      y: 20,
      scale: 0.95
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: 'spring' as const, stiffness: 300, damping: 25 }
    },
    minimized: {
      opacity: 1,
      y: 0,
      scale: 1,
      height: 56,
      transition: { type: 'spring' as const, stiffness: 400, damping: 30 }
    },
    exit: {
      opacity: 0,
      y: 20,
      scale: 0.95,
      transition: { duration: 0.2 }
    }
  }

  return (
    <div
      ref={containerRef}
      className={`fixed z-50 ${getPositionClasses()}`}
      data-testid="floating-chat-container"
    >
      <AnimatePresence mode="wait">
        {/* Closed State - Floating Button */}
        {windowState === 'closed' && (
          <motion.button
            key="chat-button"
            variants={buttonVariants}
            initial="hidden"
            animate="visible"
            whileHover="hover"
            whileTap="tap"
            onClick={openChat}
            className={`relative flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-colors ${hasEventContext ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-[#0f1117]' : ''}`}
            style={{
              background: hasEventContext
                ? `linear-gradient(135deg, ${settings.accentColor} 0%, #ef4444dd 100%)`
                : `linear-gradient(135deg, ${settings.accentColor} 0%, ${settings.accentColor}dd 100%)`,
              boxShadow: hasEventContext
                ? `0 4px 20px rgba(239, 68, 68, 0.4)`
                : `0 4px 20px ${settings.accentColor}40`
            }}
            data-testid="chat-open-button"
            aria-label="פתח צ'אט AI"
          >
            <MessageCircle className="h-6 w-6 text-white" />

            {/* Unread Badge */}
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </motion.span>
            )}
          </motion.button>
        )}

        {/* Open or Minimized State - Chat Window */}
        {(windowState === 'open' || windowState === 'minimized') && (
          <motion.div
            key="chat-window"
            variants={windowVariants}
            initial="hidden"
            animate={windowState === 'minimized' ? 'minimized' : 'visible'}
            exit="exit"
            className={`overflow-hidden rounded-xl shadow-2xl ${hasEventContext ? 'border-2 border-red-500/70' : 'border'}`}
            style={{
              width: dimensions.width,
              height: windowState === 'minimized' ? 56 : dimensions.height,
              backgroundColor: '#0f1117',
              ...(hasEventContext ? {} : { borderColor: `${settings.accentColor}33` })
            }}
            data-testid="chat-window"
          >
            {/* Window Header */}
            <div
              className="flex h-14 items-center justify-between border-b px-4"
              style={{ borderColor: `${settings.accentColor}20` }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${settings.accentColor}20` }}
                >
                  <MessageCircle
                    className="h-4 w-4"
                    style={{ color: settings.accentColor }}
                  />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-100">
                    EventFlow AI
                  </h3>
                  {hasEventContext ? (
                    <p className="text-xs text-red-400/80 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
                      {selectedEvent.name}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500">עוזר חכם לאירועים</p>
                  )}
                </div>
              </div>

              {/* Window Controls */}
              <div className="flex items-center gap-1">
                {windowState === 'minimized' ? (
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={openChat}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-800 hover:text-gray-200"
                    data-testid="chat-maximize-button"
                    aria-label="הגדל חלון צ'אט"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </motion.button>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={minimizeChat}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-800 hover:text-gray-200"
                    data-testid="chat-minimize-button"
                    aria-label="מזער חלון צ'אט"
                  >
                    <Minus className="h-4 w-4" />
                  </motion.button>
                )}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={closeChat}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-800 hover:text-red-400"
                  data-testid="chat-close-button"
                  aria-label="סגור צ'אט"
                >
                  <X className="h-4 w-4" />
                </motion.button>
              </div>
            </div>

            {/* Chat Content (only when open) */}
            {windowState === 'open' && (
              <ChatWindow height={dimensions.height - 56} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default FloatingChat
