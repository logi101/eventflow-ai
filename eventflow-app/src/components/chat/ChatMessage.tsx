// EventFlow AI Chat - Message Bubble Component

import { motion } from 'framer-motion'
import { Bot, Info } from 'lucide-react'
import DOMPurify from 'dompurify'
import type { ChatMessage as ChatMessageType } from '../../types/chat'
import { useChatContext } from '../../contexts/ChatContext'
import ChatActions from './ChatActions'

// ============================================================================
// Types
// ============================================================================

interface ChatMessageProps {
  message: ChatMessageType
}

// ============================================================================
// Chat Message Component
// ============================================================================

export function ChatMessage({ message }: ChatMessageProps) {
  const { state } = useChatContext()
  const { settings } = state

  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'

  // Format timestamp
  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('he-IL', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  // Animation variants
  const messageVariants = {
    hidden: {
      opacity: 0,
      y: 10,
      scale: 0.95
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.2 }
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      transition: { duration: 0.1 }
    }
  }

  // Parse markdown-like content (basic)
  const parseContent = (content: string) => {
    // Handle headers
    let parsed = content.replace(/^## (.+)$/gm, '<h3 class="text-sm font-semibold text-gray-200 mb-2">$1</h3>')
    parsed = parsed.replace(/^### (.+)$/gm, '<h4 class="text-xs font-semibold text-gray-300 mb-1">$1</h4>')

    // Handle bold
    parsed = parsed.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-gray-200">$1</strong>')

    // Handle inline code
    parsed = parsed.replace(/`(.+?)`/g, `<code class="rounded bg-gray-800 px-1 py-0.5 text-xs" style="color: ${settings.accentColor}">$1</code>`)

    // Handle line breaks
    parsed = parsed.replace(/\n/g, '<br />')

    return parsed
  }

  return (
    <motion.div
      variants={messageVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
      className={`mb-3 flex ${isUser ? 'justify-end' : 'justify-start'}`}
      data-testid={`message-${message.role}`}
    >
      <div
        className={`max-w-[85%] ${isUser ? 'order-1' : 'order-2'}`}
      >
        {/* Message Bubble */}
        <div
          className={`rounded-xl px-4 py-2.5 ${
            isUser
              ? 'rounded-br-sm'
              : isSystem
              ? 'rounded-tl-sm border border-blue-500/30 bg-blue-500/10'
              : 'rounded-tl-sm'
          }`}
          style={{
            backgroundColor: isUser
              ? settings.accentColor
              : isSystem
              ? undefined
              : '#1a1d24'
          }}
        >
          {/* Icon for non-user messages */}
          {!isUser && (
            <div className="mb-1.5 flex items-center gap-1.5">
              {isSystem ? (
                <Info className="h-3.5 w-3.5 text-blue-400" />
              ) : (
                <Bot
                  className="h-3.5 w-3.5"
                  style={{ color: settings.accentColor }}
                />
              )}
              <span className="text-xs text-gray-500">
                {isSystem ? 'מערכת' : 'EventFlow AI'}
              </span>
            </div>
          )}

          {/* Message Content */}
          <div
            className={`text-sm leading-relaxed ${
              isUser ? 'text-white' : 'text-gray-300'
            }`}
            dir="auto"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(parseContent(message.content)) }}
          />

          {/* Timestamp */}
          <div
            className={`mt-1.5 text-right text-[10px] ${
              isUser ? 'text-white/60' : 'text-gray-600'
            }`}
          >
            {formatTime(message.timestamp)}
          </div>
        </div>

        {/* Action Buttons */}
        {message.actions && message.actions.length > 0 && (
          <ChatActions actions={message.actions} messageId={message.id} />
        )}

        {/* Metadata Badge */}
        {message.metadata?.command && (
          <div className="mt-1 flex items-center gap-1.5">
            <span
              className="rounded-md px-2 py-0.5 text-[10px]"
              style={{
                backgroundColor: `${settings.accentColor}20`,
                color: settings.accentColor
              }}
            >
              {message.metadata.command}
            </span>
          </div>
        )}

        {message.metadata?.skillUsed && (
          <div className="mt-1 flex items-center gap-1.5">
            <span
              className="rounded-md px-2 py-0.5 text-[10px]"
              style={{
                backgroundColor: '#10b98120',
                color: '#10b981'
              }}
            >
              Skill: {message.metadata.skillUsed}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default ChatMessage
