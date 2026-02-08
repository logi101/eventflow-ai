import { Loader2, Trash2 } from 'lucide-react'
import type { MessageWithRelations } from '../../../schemas/messages'

interface DeleteConfirmModalProps {
  message: MessageWithRelations | null
  onClose: () => void
  onConfirm: () => void
  isPending: boolean
}

export function DeleteConfirmModal({ message, onClose, onConfirm, isPending }: DeleteConfirmModalProps) {
  if (!message) return null

  const recipientName = message.participants
    ? (message.participants.full_name || `${message.participants.first_name} ${message.participants.last_name}`)
    : message.to_phone

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="delete-message-title">
      <div className="bg-zinc-900 rounded-lg p-6 w-full max-w-sm mx-4 border border-red-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-900/40 rounded-full">
            <Trash2 size={24} className="text-red-400" />
          </div>
          <h2 id="delete-message-title" className="text-xl font-bold text-white">מחיקת הודעה</h2>
        </div>

        <p className="text-zinc-300 mb-2">
          האם למחוק את ההודעה ל<strong className="text-white">{recipientName}</strong>?
        </p>
        <div className="p-3 bg-zinc-800 rounded-lg text-sm text-zinc-400 mb-4 max-h-[80px] overflow-hidden">
          {message.content}
        </div>
        <p className="text-red-400 text-sm mb-4">פעולה זו אינה הפיכה</p>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600"
          >
            ביטול
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isPending ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Trash2 size={18} />
            )}
            מחק
          </button>
        </div>
      </div>
    </div>
  )
}
