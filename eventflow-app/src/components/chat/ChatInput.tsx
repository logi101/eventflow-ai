// EventFlow AI Chat - Input Component with Slash Commands

import { useState, useRef, useEffect, type KeyboardEvent, type ChangeEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Sparkles } from 'lucide-react'
import { useChatContext } from '../../contexts/ChatContext'
import SlashCommandMenu from './SlashCommandMenu'

// ============================================================================
// Chat Input Component
// ============================================================================

export function ChatInput() {
  const { state, sendMessage } = useChatContext()
  const { isLoading, settings } = state

  const [inputValue, setInputValue] = useState('')
  const [showCommands, setShowCommands] = useState(false)
  const [commandFilter, setCommandFilter] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`
    }
  }, [inputValue])

  // Handle input change
  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setInputValue(value)

    // Check for slash command
    if (value.startsWith('/')) {
      setShowCommands(true)
      setCommandFilter(value.slice(1).split(' ')[0])
    } else {
      setShowCommands(false)
      setCommandFilter('')
    }
  }

  // Handle command selection
  const handleCommandSelect = (command: string) => {
    setInputValue(command + ' ')
    setShowCommands(false)
    inputRef.current?.focus()
  }

  // Handle send
  const handleSend = async () => {
    const trimmedValue = inputValue.trim()
    if (!trimmedValue || isLoading) return

    setInputValue('')
    setShowCommands(false)
    await sendMessage(trimmedValue)
    inputRef.current?.focus()
  }

  // Handle keyboard events
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }

    // Close command menu on Escape
    if (e.key === 'Escape') {
      setShowCommands(false)
    }

    // Navigate command menu with arrows
    if (showCommands && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault()
      // Let SlashCommandMenu handle navigation via its own state
    }
  }

  // Suggestions for quick actions - natural language so they go through AI
  const quickSuggestions = [
    { text: 'עזור לי לתכנן את האירוע', label: 'עזרה' },
    { text: 'אני רוצה לתכנן אירוע חדש, עזור לי', label: 'אירוע' },
    { text: 'עזור לי לנהל את רשימת האורחים', label: 'אורח' }
  ]

  return (
    <div
      className="border-t p-3"
      style={{ borderColor: `${settings.accentColor}15` }}
    >
      {/* Quick Suggestions */}
      {inputValue.length === 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {quickSuggestions.map((suggestion) => (
            <motion.button
              key={suggestion.text}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                sendMessage(suggestion.text)
              }}
              className="flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs text-gray-400 transition-colors hover:border-gray-600 hover:text-gray-300"
              style={{ borderColor: `${settings.accentColor}30` }}
            >
              <Sparkles className="h-3 w-3" style={{ color: settings.accentColor }} />
              {suggestion.label}
            </motion.button>
          ))}
        </div>
      )}

      {/* Slash Command Menu */}
      <AnimatePresence>
        {showCommands && (
          <SlashCommandMenu
            filter={commandFilter}
            onSelect={handleCommandSelect}
            onClose={() => setShowCommands(false)}
          />
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div
        className="flex items-end gap-2 rounded-xl border p-2 transition-colors focus-within:border-opacity-50"
        style={{
          backgroundColor: '#161922',
          borderColor: showCommands ? settings.accentColor : `${settings.accentColor}30`
        }}
      >
        <textarea
          ref={inputRef}
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="הקלד הודעה או / לפקודות..."
          disabled={isLoading}
          rows={1}
          className="max-h-[120px] min-h-[36px] flex-1 resize-none border-none bg-transparent px-2 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-0"
          style={{ scrollbarWidth: 'thin' }}
          dir="auto"
          data-testid="chat-input"
        />

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleSend}
          disabled={!inputValue.trim() || isLoading}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-all disabled:opacity-40"
          style={{
            backgroundColor: inputValue.trim() ? settings.accentColor : 'transparent',
            color: inputValue.trim() ? 'white' : '#6b7280'
          }}
          data-testid="send-button"
        >
          <Send className="h-4 w-4" />
        </motion.button>
      </div>

      {/* Character Count & Hint */}
      <div className="mt-1.5 flex items-center justify-between px-1 text-[10px] text-gray-600">
        <span>Shift+Enter לשורה חדשה</span>
        <span>{inputValue.length}/500</span>
      </div>
    </div>
  )
}

export default ChatInput
