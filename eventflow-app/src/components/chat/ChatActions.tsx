// EventFlow AI Chat - Action Buttons Component

import { motion } from 'framer-motion'
import {
  Calendar,
  Users,
  Building2,
  CheckSquare,
  MessageSquare,
  ArrowRight,
  Download,
  Upload,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  Search,
  ClipboardList,
  Clock,
  AlertCircle,
  Tag,
  UserPlus
} from 'lucide-react'
import type { ChatAction, ActionType } from '../../types/chat'
import { useChatContext } from '../../contexts/ChatContext'

// ============================================================================
// Types
// ============================================================================

interface ChatActionsProps {
  actions: ChatAction[]
  messageId: string
}

// ============================================================================
// Action Icon Map
// ============================================================================

const ACTION_ICONS: Partial<Record<ActionType, typeof Calendar>> = {
  create_event: Calendar,
  create_guest: Users,
  create_vendor: Building2,
  create_task: CheckSquare,
  create_session: Calendar,
  update_event: Calendar,
  update_guest: Users,
  update_vendor: Building2,
  delete_entity: CheckSquare,
  send_message: MessageSquare,
  send_whatsapp: MessageSquare,
  send_email: MessageSquare,
  navigate: ArrowRight,
  open_modal: ExternalLink,
  filter_data: Users,
  export_data: Download,
  import_data: Upload,
  generate_report: Download,
  run_skill: Sparkles,
  switch_agent: Sparkles,
  run_automation: Sparkles,
  // AI agent result actions
  event_created: CheckCircle2,
  event_creation_failed: AlertCircle,
  checklist_added: ClipboardList,
  vendors_assigned: Building2,
  events_found: Search,
  vendors_found: Search,
  schedule_suggested: Clock,
  identify_event_type: Tag,
  set_date: Calendar,
  set_participants: UserPlus,
  suggest_create_event: Calendar,
}

// ============================================================================
// Chat Actions Component
// ============================================================================

export function ChatActions({ actions, messageId }: ChatActionsProps) {
  const { executeAction, markActionCompleted, state } = useChatContext()
  const { settings } = state

  // Handle action click
  const handleActionClick = (action: ChatAction) => {
    if (action.completed || action.disabled) return

    // Execute the action
    executeAction(action)

    // Mark as completed
    markActionCompleted(messageId, action.id)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-2 flex flex-wrap gap-2"
      data-testid="chat-actions"
    >
      {actions.map((action) => {
        const IconComponent = ACTION_ICONS[action.type] || Sparkles
        const isCompleted = action.completed
        const isDisabled = action.disabled

        return (
          <motion.button
            key={action.id}
            whileHover={!isCompleted && !isDisabled ? { scale: 1.05 } : {}}
            whileTap={!isCompleted && !isDisabled ? { scale: 0.95 } : {}}
            onClick={() => handleActionClick(action)}
            disabled={isCompleted || isDisabled}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
              isCompleted
                ? 'border-green-500/30 bg-green-500/10 text-green-400'
                : isDisabled
                ? 'cursor-not-allowed border-gray-700 bg-gray-800/50 text-gray-500'
                : 'border-transparent hover:border-opacity-50'
            }`}
            style={
              !isCompleted && !isDisabled
                ? {
                    backgroundColor: `${settings.accentColor}15`,
                    color: settings.accentColor,
                    borderColor: `${settings.accentColor}30`
                  }
                : undefined
            }
            data-testid={`action-button-${action.type}`}
          >
            {isCompleted ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <IconComponent className="h-3.5 w-3.5" />
            )}
            <span>{action.labelHebrew}</span>
          </motion.button>
        )
      })}
    </motion.div>
  )
}

export default ChatActions
