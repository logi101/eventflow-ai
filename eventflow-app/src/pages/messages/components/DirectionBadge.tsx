import React from 'react'
import { ArrowUpRight, ArrowDownLeft, Bot } from 'lucide-react'
import type { MessageDirection } from '../../../schemas/messages'
import { messageDirectionLabels, messageDirectionColors } from '../../../schemas/messages'

interface DirectionBadgeProps {
  direction: MessageDirection
  autoReply?: boolean
}

export const DirectionBadge = React.memo(function DirectionBadge({ direction, autoReply }: DirectionBadgeProps) {
  const isIncoming = direction === 'incoming'
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${messageDirectionColors[direction]}`}>
      {isIncoming ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
      {messageDirectionLabels[direction]}
      {autoReply && <Bot size={12} className="mr-1 text-purple-500" />}
    </span>
  )
})
