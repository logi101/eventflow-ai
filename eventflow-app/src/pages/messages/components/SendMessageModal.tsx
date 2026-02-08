import { useState } from 'react'
import { X, Loader2, Send } from 'lucide-react'
import { useSendMessage } from '../../../hooks/useMessages'

interface SendMessageModalProps {
  isOpen: boolean
  onClose: () => void
  eventId?: string
}

export function SendMessageModal({ isOpen, onClose, eventId }: SendMessageModalProps) {
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const sendMessage = useSendMessage()

  const handleSend = async () => {
    try {
      await sendMessage.mutateAsync({
        to_phone: phone,
        content: message,
        channel: 'whatsapp',
        event_id: eventId
      })
      onClose()
      setPhone('')
      setMessage('')
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="send-message-title">
      <div className="bg-zinc-900 rounded-lg p-6 w-full max-w-md mx-4 border border-zinc-700">
        <div className="flex items-center justify-between mb-4">
          <h2 id="send-message-title" className="text-xl font-bold text-white">שליחת הודעה חדשה</h2>
          <button onClick={onClose} className="p-1 hover:bg-zinc-700 rounded" aria-label="סגור חלון">
            <X size={20} className="text-white" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">מספר טלפון</label>
            <input
              type="tel"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white"
              placeholder="0501234567"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">תוכן ההודעה</label>
            <textarea
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[100px] text-white"
              placeholder="תוכן ההודעה..."
              value={message}
              onChange={e => setMessage(e.target.value)}
            />
          </div>

          {sendMessage.isError && (
            <div className="p-3 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-sm">
              שגיאה בשליחת ההודעה
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600"
            >
              ביטול
            </button>
            <button
              onClick={handleSend}
              disabled={!phone || !message || sendMessage.isPending}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {sendMessage.isPending ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send size={18} />
              )}
              שלח
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
