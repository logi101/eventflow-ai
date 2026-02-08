import { useState, useEffect } from 'react'
import { X, Pencil } from 'lucide-react'
import type { MessageWithRelations } from '../../../schemas/messages'

interface EditMessageModalProps {
  message: MessageWithRelations | null
  onClose: () => void
  onSaveWithGrace: (messageId: string, content: string, subject: string | null) => void
}

export function EditMessageModal({ message, onClose, onSaveWithGrace }: EditMessageModalProps) {
  const [content, setContent] = useState(message?.content || '')
  const [subject, setSubject] = useState(message?.subject || '')

  // Reset form when message changes
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      if (message) {
        setContent(message.content || '')
        setSubject(message.subject || '')
      }
    })
    return () => cancelAnimationFrame(raf)
  }, [message])

  if (!message) return null

  const handleSave = () => {
    onSaveWithGrace(message.id, content, subject || null)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="edit-message-title">
      <div className="bg-zinc-900 rounded-lg p-6 w-full max-w-md mx-4 border border-zinc-700">
        <div className="flex items-center justify-between mb-4">
          <h2 id="edit-message-title" className="text-xl font-bold text-white flex items-center gap-2">
            <Pencil size={20} />
            עריכת הודעה
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-zinc-700 rounded" aria-label="סגור עריכת הודעה">
            <X size={20} className="text-white" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">נושא</label>
            <input
              type="text"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white"
              placeholder="נושא ההודעה (אופציונלי)"
              value={subject}
              onChange={e => setSubject(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">תוכן ההודעה</label>
            <textarea
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[120px] text-white"
              placeholder="תוכן ההודעה..."
              value={content}
              onChange={e => setContent(e.target.value)}
            />
          </div>

          <div className="p-3 bg-amber-900/20 border border-amber-700/50 rounded-lg text-amber-300 text-sm">
            השינוי ייכנס לתוקף בעוד 60 שניות - ניתן לבטל
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600"
            >
              ביטול
            </button>
            <button
              onClick={handleSave}
              disabled={!content}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Pencil size={18} />
              שמור
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
