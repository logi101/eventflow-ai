// EventFlow AI Chat - Main Floating Chat Component

import { useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, X, Minus, Maximize2 } from 'lucide-react'
import { useChatContext } from '../../contexts/ChatContext'
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

  const { windowState, settings, unreadCount } = state
  const containerRef = useRef<HTMLDivElement>(null)

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
            className="relative flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-colors"
            style={{
              background: `linear-gradient(135deg, ${settings.accentColor} 0%, ${settings.accentColor}dd 100%)`,
              boxShadow: `0 4px 20px ${settings.accentColor}40`
            }}
            data-testid="chat-open-button"
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
            className="overflow-hidden rounded-xl border shadow-2xl"
            style={{
              width: dimensions.width,
              height: windowState === 'minimized' ? 56 : dimensions.height,
              backgroundColor: '#0f1117',
              borderColor: `${settings.accentColor}33`
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
                  <p className="text-xs text-gray-500">עוזר חכם לאירועים</p>
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
