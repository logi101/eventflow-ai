// EventFlow AI Chat - Settings Panel Component

import { motion } from 'framer-motion'
import { X, Volume2, VolumeX, Keyboard } from 'lucide-react'
import type { ChatPosition, ChatSize } from '../../types/chat'
import { useChatContext } from '../../contexts/ChatContext'

// ============================================================================
// Types
// ============================================================================

interface ChatSettingsProps {
  onClose: () => void
}

// ============================================================================
// Constants
// ============================================================================

const POSITION_OPTIONS: { value: ChatPosition; label: string; icon: string }[] = [
  { value: 'bottom-left', label: 'שמאל למטה', icon: '↙' },
  { value: 'bottom-right', label: 'ימין למטה', icon: '↘' },
  { value: 'top-left', label: 'שמאל למעלה', icon: '↖' },
  { value: 'top-right', label: 'ימין למעלה', icon: '↗' }
]

const SIZE_OPTIONS: { value: ChatSize; label: string }[] = [
  { value: 'small', label: 'קטן' },
  { value: 'medium', label: 'בינוני' },
  { value: 'large', label: 'גדול' }
]

const COLOR_PRESETS = [
  '#f97316', // Orange (default)
  '#3b82f6', // Blue
  '#10b981', // Green
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#f59e0b', // Amber
  '#06b6d4', // Cyan
  '#ef4444'  // Red
]

// ============================================================================
// Chat Settings Component
// ============================================================================

export function ChatSettings({ onClose }: ChatSettingsProps) {
  const { state, updateSettings } = useChatContext()
  const { settings } = state

  return (
    <div className="p-3" data-testid="chat-settings-panel">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-xs font-medium text-gray-300">הגדרות צ'אט</h4>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded text-gray-500 hover:bg-gray-800 hover:text-gray-300"
        >
          <X className="h-3.5 w-3.5" />
        </motion.button>
      </div>

      {/* Position */}
      <div className="mb-3">
        <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-gray-500">
          מיקום החלון
        </label>
        <div className="grid grid-cols-4 gap-1.5">
          {POSITION_OPTIONS.map((option) => (
            <motion.button
              key={option.value}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => updateSettings({ position: option.value })}
              className={`flex flex-col items-center gap-0.5 rounded-lg border p-2 text-center transition-colors ${
                settings.position === option.value
                  ? 'border-opacity-50'
                  : 'border-gray-700 hover:border-gray-600'
              }`}
              style={{
                borderColor: settings.position === option.value ? settings.accentColor : undefined,
                backgroundColor: settings.position === option.value ? `${settings.accentColor}15` : undefined
              }}
            >
              <span className="text-base">{option.icon}</span>
              <span className="text-[9px] text-gray-400">{option.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Size */}
      <div className="mb-3">
        <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-gray-500">
          גודל החלון
        </label>
        <div className="flex gap-1.5">
          {SIZE_OPTIONS.map((option) => (
            <motion.button
              key={option.value}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => updateSettings({ size: option.value })}
              className={`flex-1 rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                settings.size === option.value
                  ? 'border-opacity-50'
                  : 'border-gray-700 text-gray-400 hover:border-gray-600'
              }`}
              style={{
                borderColor: settings.size === option.value ? settings.accentColor : undefined,
                backgroundColor: settings.size === option.value ? `${settings.accentColor}15` : undefined,
                color: settings.size === option.value ? settings.accentColor : undefined
              }}
            >
              {option.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Accent Color */}
      <div className="mb-3">
        <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-gray-500">
          צבע מבטא
        </label>
        <div className="flex flex-wrap gap-1.5">
          {COLOR_PRESETS.map((color) => (
            <motion.button
              key={color}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => updateSettings({ accentColor: color })}
              className={`h-6 w-6 rounded-full transition-all ${
                settings.accentColor === color
                  ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900'
                  : 'hover:ring-1 hover:ring-white hover:ring-offset-1 hover:ring-offset-gray-900'
              }`}
              style={{ backgroundColor: color }}
              data-testid={`color-${color}`}
            />
          ))}
        </div>
      </div>

      {/* Sound Toggle */}
      <div className="mb-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
          className="flex w-full items-center justify-between rounded-lg border border-gray-700 px-3 py-2 text-xs transition-colors hover:border-gray-600"
        >
          <div className="flex items-center gap-2">
            {settings.soundEnabled ? (
              <Volume2 className="h-4 w-4 text-green-400" />
            ) : (
              <VolumeX className="h-4 w-4 text-gray-500" />
            )}
            <span className="text-gray-300">צלילי התראה</span>
          </div>
          <div
            className={`h-5 w-9 rounded-full p-0.5 transition-colors ${
              settings.soundEnabled ? 'bg-green-500' : 'bg-gray-600'
            }`}
          >
            <motion.div
              animate={{ x: settings.soundEnabled ? 16 : 0 }}
              className="h-4 w-4 rounded-full bg-white shadow"
            />
          </div>
        </motion.button>
      </div>

      {/* Keyboard Shortcut */}
      <div className="mb-2">
        <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-gray-500">
          קיצור מקלדת
        </label>
        <div className="flex items-center gap-2 rounded-lg border border-gray-700 px-3 py-2">
          <Keyboard className="h-4 w-4 text-gray-500" />
          <span className="text-xs text-gray-300">{settings.shortcutKey}</span>
          <span className="mr-auto text-[10px] text-gray-600">לפתיחה/סגירה</span>
        </div>
      </div>

      {/* Info */}
      <p className="text-center text-[10px] text-gray-600">
        ההגדרות נשמרות אוטומטית
      </p>
    </div>
  )
}

export default ChatSettings
