// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - Admin Confirmation Popup for Grace Period Changes
// ═══════════════════════════════════════════════════════════════════════════

import { AlertTriangle, Shield, X, Check, Plus, Pencil, Trash2 } from 'lucide-react'
import { useGracePeriod } from '../../contexts/GracePeriodContext'

export function GracePeriodConfirmationPopup() {
  const { confirmationState, dismissConfirmation } = useGracePeriod()

  if (!confirmationState.isOpen || !confirmationState.details) return null

  const { details, onConfirm } = confirmationState

  const handleConfirm = () => {
    if (onConfirm) onConfirm()
    // Don't dismiss here - the onConfirm callback handles closing
  }

  const handleCancel = () => {
    dismissConfirmation()
  }

  const hasChanges = details.changes.some(c => c.count > 0)
  const hasDeletions = details.deletions.some(d => d.count > 0)

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60]">
      <div className="bg-zinc-900 rounded-2xl p-6 w-full max-w-md mx-4 border border-zinc-700 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-900/40 rounded-xl">
              <AlertTriangle size={24} className="text-amber-400" />
            </div>
            <h2 className="text-xl font-bold text-white">{details.title}</h2>
          </div>
          <button onClick={handleCancel} className="p-1.5 hover:bg-zinc-700 rounded-xl transition-colors">
            <X size={20} className="text-zinc-400" />
          </button>
        </div>

        {/* Description */}
        <p className="text-zinc-300 mb-4">{details.description}</p>

        {/* Admin Warning */}
        <div className="flex items-center gap-2 p-3 bg-amber-900/20 border border-amber-700/50 rounded-xl mb-4">
          <Shield size={18} className="text-amber-400 shrink-0" />
          <p className="text-amber-300 text-sm">
            פעולה זו דורשת אישור מנהל - שינויים ייכנסו לתוקף בעוד 60 שניות
          </p>
        </div>

        {/* Changes Summary */}
        <div className="space-y-3 mb-5">
          {/* Messages to create */}
          {hasChanges && (
            <div className="space-y-2">
              {details.changes.filter(c => c.count > 0).map((change, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-zinc-800 rounded-xl">
                  <div className="p-1.5 bg-blue-900/40 rounded-lg">
                    {change.label.includes('יעודכנו') || change.label.includes('ישתנו') ? (
                      <Pencil size={16} className="text-blue-400" />
                    ) : (
                      <Plus size={16} className="text-green-400" />
                    )}
                  </div>
                  <span className="text-zinc-300 flex-1">{change.label}</span>
                  <span className="text-lg font-bold text-white">{change.count}</span>
                </div>
              ))}
            </div>
          )}

          {/* Messages to delete */}
          {hasDeletions && (
            <div className="space-y-2">
              {details.deletions.filter(d => d.count > 0).map((deletion, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-red-900/20 border border-red-800/50 rounded-xl">
                  <div className="p-1.5 bg-red-900/40 rounded-lg">
                    <Trash2 size={16} className="text-red-400" />
                  </div>
                  <span className="text-red-300 flex-1">{deletion.label}</span>
                  <span className="text-lg font-bold text-red-300">{deletion.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Warning Text */}
        {details.warningText && (
          <p className="text-zinc-400 text-sm mb-4">{details.warningText}</p>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleCancel}
            className="flex-1 px-5 py-2.5 bg-zinc-700 text-zinc-300 rounded-xl font-medium hover:bg-zinc-600 transition-all"
          >
            ביטול
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
          >
            <Check size={18} />
            אישור
          </button>
        </div>
      </div>
    </div>
  )
}
