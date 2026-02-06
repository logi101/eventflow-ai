import { AlertTriangle } from 'lucide-react'

interface DeleteTarget {
  type: string
  id: string
  name: string
}

interface DeleteConfirmModalProps {
  deleteTarget: DeleteTarget
  onConfirm: () => void
  onClose: () => void
}

export function DeleteConfirmModal({
  deleteTarget,
  onConfirm,
  onClose
}: DeleteConfirmModalProps) {
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-modal w-full max-w-sm">
        <div className="p-6 text-center">
          <AlertTriangle className="mx-auto mb-4 text-red-500" size={48} />
          <h3 className="text-xl font-bold mb-2">אישור מחיקה</h3>
          <p className="text-zinc-400 mb-4">האם למחוק את &quot;{deleteTarget.name}&quot;?</p>
          <div className="flex gap-2 justify-center">
            <button onClick={onClose} className="btn-secondary">ביטול</button>
            <button onClick={onConfirm} className="btn-primary bg-red-500 hover:bg-red-600" data-testid="confirm-delete-button">
              מחק
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
