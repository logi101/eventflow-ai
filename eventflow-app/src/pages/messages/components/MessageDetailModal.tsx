import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import { X, Calendar, Loader2, RotateCcw } from 'lucide-react'
import { useRetryMessage } from '../../../hooks/useMessages'
import type { MessageWithRelations } from '../../../schemas/messages'
import { StatusBadge } from './StatusBadge'
import { ChannelIcon } from './ChannelIcon'
import { DirectionBadge } from './DirectionBadge'

interface MessageDetailModalProps {
  message: MessageWithRelations | null
  onClose: () => void
}

export function MessageDetailModal({ message, onClose }: MessageDetailModalProps) {
  const retryMessage = useRetryMessage()

  if (!message) return null

  const handleRetry = async () => {
    try {
      await retryMessage.mutateAsync(message.id)
    } catch (error) {
      console.error('Retry failed:', error)
    }
  }

  // Get recipient name from participant relation or show phone
  const recipientName = message.participants
    ? (message.participants.full_name || `${message.participants.first_name} ${message.participants.last_name}`)
    : message.to_phone

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="message-detail-title">
      <div className="bg-zinc-900 rounded-lg p-6 w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto border border-zinc-700">
        <div className="flex items-center justify-between mb-4">
          <h2 id="message-detail-title" className="text-xl font-bold text-white">פרטי הודעה</h2>
          <button onClick={onClose} className="p-1 hover:bg-zinc-700 rounded" aria-label="סגור פרטי הודעה">
            <X size={20} className="text-white" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <DirectionBadge direction={message.direction || 'outgoing'} autoReply={message.auto_reply} />
            <StatusBadge status={message.status} />
            <ChannelIcon channel={message.channel} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-zinc-400">נמען</label>
              <p className="font-medium text-white">{recipientName}</p>
            </div>
            <div>
              <label className="text-sm text-zinc-400">טלפון</label>
              <p className="font-medium text-white" dir="ltr">{message.to_phone || '-'}</p>
            </div>
            {message.subject && (
              <div className="col-span-2">
                <label className="text-sm text-zinc-400">נושא</label>
                <p className="font-medium text-white">{message.subject}</p>
              </div>
            )}
            <div>
              <label className="text-sm text-zinc-400">אירוע</label>
              <p className="font-medium text-white">{message.events?.name || '-'}</p>
            </div>
          </div>

          <div>
            <label className="text-sm text-zinc-400">תוכן ההודעה</label>
            <div className="mt-1 p-3 bg-zinc-800 rounded-lg whitespace-pre-wrap text-white">
              {message.content}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <label className="text-zinc-400">נוצרה</label>
              <p className="text-white">{format(new Date(message.created_at), 'dd/MM/yyyy HH:mm', { locale: he })}</p>
            </div>
            {message.scheduled_for && (
              <div>
                <label className="text-zinc-400 flex items-center gap-1"><Calendar size={12} /> מתוזמנת ל</label>
                <p className="text-amber-300 font-medium">{format(new Date(message.scheduled_for), 'dd/MM/yyyy HH:mm', { locale: he })}</p>
              </div>
            )}
            {message.sent_at && (
              <div>
                <label className="text-zinc-400">נשלחה</label>
                <p className="text-white">{format(new Date(message.sent_at), 'dd/MM/yyyy HH:mm', { locale: he })}</p>
              </div>
            )}
            {message.delivered_at && (
              <div>
                <label className="text-zinc-400">נמסרה</label>
                <p className="text-white">{format(new Date(message.delivered_at), 'dd/MM/yyyy HH:mm', { locale: he })}</p>
              </div>
            )}
            {message.read_at && (
              <div>
                <label className="text-zinc-400">נקראה</label>
                <p className="text-white">{format(new Date(message.read_at), 'dd/MM/yyyy HH:mm', { locale: he })}</p>
              </div>
            )}
          </div>

          {message.error_message && (
            <div className="p-3 bg-red-900/40 border border-red-700 rounded-lg">
              <label className="text-sm text-red-400 font-medium">שגיאה</label>
              <p className="text-red-300">{message.error_message}</p>
            </div>
          )}

          {message.status === 'failed' && (
            <button
              onClick={handleRetry}
              disabled={retryMessage.isPending}
              className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {retryMessage.isPending ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <RotateCcw size={18} />
              )}
              נסה שוב
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
