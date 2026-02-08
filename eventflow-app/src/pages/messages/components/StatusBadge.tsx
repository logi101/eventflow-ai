import React from 'react'
import {
  Clock,
  Calendar,
  Loader2,
  Send,
  CheckCircle,
  CheckCheck,
  XCircle,
  X
} from 'lucide-react'
import type { MessageStatus } from '../../../schemas/messages'
import { messageStatusLabels, messageStatusColors } from '../../../schemas/messages'

interface StatusBadgeProps {
  status: MessageStatus
}

export const StatusBadge = React.memo(function StatusBadge({ status }: StatusBadgeProps) {
  const icons: Record<MessageStatus, React.ReactNode> = {
    pending: <Clock size={14} />,
    scheduled: <Calendar size={14} />,
    sending: <Loader2 size={14} className="animate-spin" />,
    sent: <Send size={14} />,
    delivered: <CheckCircle size={14} />,
    read: <CheckCheck size={14} />,
    failed: <XCircle size={14} />,
    expired: <Clock size={14} />,
    cancelled: <X size={14} />
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${messageStatusColors[status]}`}>
      {icons[status]}
      {messageStatusLabels[status]}
    </span>
  )
})
