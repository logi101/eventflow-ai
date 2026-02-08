import { useState } from 'react'
import { Loader2, Trash2, AlertTriangle, Shield } from 'lucide-react'

interface DeleteAllConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  isPending: boolean
  messageCount: number
  eventName?: string
}

export function DeleteAllConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  isPending,
  messageCount,
  eventName
}: DeleteAllConfirmModalProps) {
  const [confirmText, setConfirmText] = useState('')
  const CONFIRM_WORD = 'מחק הכל'

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="delete-all-title">
      <div className="bg-zinc-900 rounded-lg p-6 w-full max-w-md mx-4 border border-red-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-900/40 rounded-full">
            <AlertTriangle size={24} className="text-red-400" />
          </div>
          <h2 id="delete-all-title" className="text-xl font-bold text-white">מחיקת כל ההודעות</h2>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-2 p-3 bg-red-900/30 border border-red-800 rounded-lg">
            <Shield size={18} className="text-red-400 shrink-0" />
            <p className="text-red-300 text-sm">
              פעולה זו דורשת אישור מנהל - מחיקה בלתי הפיכה
            </p>
          </div>

          <p className="text-zinc-300">
            {eventName ? (
              <>פעולה זו תמחק <strong className="text-white">{messageCount}</strong> הודעות מהאירוע <strong className="text-orange-400">{eventName}</strong></>
            ) : (
              <>פעולה זו תמחק <strong className="text-white">{messageCount}</strong> הודעות מכל האירועים</>
            )}
          </p>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              הקלד "<span className="text-red-400 font-bold">{CONFIRM_WORD}</span>" לאישור
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-white"
              placeholder={CONFIRM_WORD}
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              dir="rtl"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => { onClose(); setConfirmText('') }}
            className="flex-1 px-4 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600"
          >
            ביטול
          </button>
          <button
            onClick={() => { onConfirm(); setConfirmText('') }}
            disabled={confirmText !== CONFIRM_WORD || isPending}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isPending ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Trash2 size={18} />
            )}
            מחק הכל
          </button>
        </div>
      </div>
    </div>
  )
}
