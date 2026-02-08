import React from 'react'
import { MessageSquare, Mail, Phone } from 'lucide-react'
import type { MessageChannel } from '../../../schemas/messages'
import { messageChannelLabels } from '../../../schemas/messages'

interface ChannelIconProps {
  channel: MessageChannel
}

export const ChannelIcon = React.memo(function ChannelIcon({ channel }: ChannelIconProps) {
  const icons: Record<MessageChannel, React.ReactNode> = {
    whatsapp: <MessageSquare size={16} className="text-green-600" />,
    email: <Mail size={16} className="text-blue-600" />,
    sms: <Phone size={16} className="text-purple-600" />
  }

  return (
    <span className="flex items-center gap-1">
      {icons[channel]}
      <span className="text-sm">{messageChannelLabels[channel]}</span>
    </span>
  )
})
