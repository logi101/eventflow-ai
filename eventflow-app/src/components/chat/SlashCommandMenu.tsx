// EventFlow AI Chat - Slash Command Menu Component

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useChatContext } from '../../contexts/ChatContext'
import type { SlashCommand } from '../../types/chat'

// ============================================================================
// Types
// ============================================================================

interface SlashCommandMenuProps {
  filter: string
  onSelect: (command: string) => void
  onClose: () => void
}

// ============================================================================
// Slash Command Menu Component
// ============================================================================

export function SlashCommandMenu({ filter, onSelect, onClose }: SlashCommandMenuProps) {
  const { state } = useChatContext()
  const { settings, pageContext } = state
  const { availableCommands } = pageContext

  const [selectedIndex, setSelectedIndex] = useState(0)

  // Filter commands based on input
  const filteredCommands = availableCommands.filter((cmd) =>
    cmd.command.slice(1).toLowerCase().startsWith(filter.toLowerCase())
  )

  // Reset selection when filter changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [filter])

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) =>
        prev < filteredCommands.length - 1 ? prev + 1 : 0
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredCommands.length - 1
      )
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      if (filteredCommands[selectedIndex]) {
        onSelect(filteredCommands[selectedIndex].command)
      }
    } else if (e.key === 'Escape') {
      onClose()
    }
  }, [filteredCommands, selectedIndex, onSelect, onClose])

  // Add keyboard listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Don't render if no commands match
  if (filteredCommands.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="mb-2 rounded-lg border p-3 text-center text-xs text-gray-500"
        style={{
          backgroundColor: '#161922',
          borderColor: `${settings.accentColor}20`
        }}
      >
        לא נמצאו פקודות מתאימות
      </motion.div>
    )
  }

  // Group commands by category
  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) {
      acc[cmd.category] = []
    }
    acc[cmd.category].push(cmd)
    return acc
  }, {} as Record<string, SlashCommand[]>)

  // Category labels in Hebrew
  const categoryLabels: Record<string, string> = {
    events: 'אירועים',
    guests: 'אורחים',
    vendors: 'ספקים',
    tasks: 'משימות',
    messages: 'הודעות',
    program: 'תוכנית',
    navigation: 'ניווט',
    skills: 'מיומנויות',
    system: 'מערכת'
  }

  // Calculate flat index for selection
  let flatIndex = 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="mb-2 max-h-[200px] overflow-y-auto rounded-lg border"
      style={{
        backgroundColor: '#161922',
        borderColor: `${settings.accentColor}30`,
        scrollbarWidth: 'thin'
      }}
      data-testid="slash-command-menu"
    >
      {Object.entries(groupedCommands).map(([category, commands]) => (
        <div key={category}>
          {/* Category Header */}
          <div
            className="sticky top-0 border-b px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-gray-500"
            style={{
              backgroundColor: '#161922',
              borderColor: `${settings.accentColor}15`
            }}
          >
            {categoryLabels[category] || category}
          </div>

          {/* Commands */}
          {commands.map((cmd) => {
            const currentIndex = flatIndex++
            const isSelected = currentIndex === selectedIndex
            const IconComponent = cmd.icon

            return (
              <motion.button
                key={cmd.command}
                onClick={() => onSelect(cmd.command)}
                onMouseEnter={() => setSelectedIndex(currentIndex)}
                className={`flex w-full items-center gap-3 px-3 py-2 text-right transition-colors ${
                  isSelected ? 'bg-gray-800' : 'hover:bg-gray-800/50'
                }`}
                style={{
                  backgroundColor: isSelected ? `${settings.accentColor}15` : undefined
                }}
                data-testid={`command-${cmd.command.slice(1)}`}
              >
                <div
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md"
                  style={{
                    backgroundColor: isSelected
                      ? `${settings.accentColor}30`
                      : 'rgba(255,255,255,0.05)'
                  }}
                >
                  <IconComponent
                    className="h-3.5 w-3.5"
                    style={{
                      color: isSelected ? settings.accentColor : '#9ca3af'
                    }}
                  />
                </div>
                <div className="flex-1 text-right">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-medium"
                      style={{ color: isSelected ? settings.accentColor : '#e5e7eb' }}
                    >
                      {cmd.command}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500">
                    {cmd.descriptionHebrew}
                  </p>
                </div>
              </motion.button>
            )
          })}
        </div>
      ))}

      {/* Keyboard Hint */}
      <div
        className="border-t px-3 py-1.5 text-center text-[10px] text-gray-600"
        style={{ borderColor: `${settings.accentColor}15` }}
      >
        ↑↓ לניווט • Enter לבחירה • Esc לביטול
      </div>
    </motion.div>
  )
}

export default SlashCommandMenu
