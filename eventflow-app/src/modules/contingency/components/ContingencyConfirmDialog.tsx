import { X, AlertTriangle, Loader2, Check, XCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ContingencySuggestion } from '../types'
import { actionTypeLabels } from '../types'
import { ImpactPreview } from './ImpactPreview'

interface ContingencyConfirmDialogProps {
  isOpen: boolean
  suggestion: ContingencySuggestion | null
  onApprove: () => void
  onReject: () => void
  onClose: () => void
  isExecuting?: boolean
}

export function ContingencyConfirmDialog({
  isOpen,
  suggestion,
  onApprove,
  onReject,
  onClose,
  isExecuting = false,
}: ContingencyConfirmDialogProps) {
  if (!suggestion) return null

  const hasVIPImpact = (suggestion.impact.vip_affected ?? 0) > 0

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-auto"
              dir="rtl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">
                  אישור פעולה
                </h2>
                <button
                  onClick={onClose}
                  className="p-1 rounded-lg hover:bg-gray-100"
                  disabled={isExecuting}
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 space-y-4">
                {/* Action type badge */}
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-sm font-medium">
                    {actionTypeLabels[suggestion.type]}
                  </span>
                </div>

                {/* Action label */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="font-medium text-gray-900">{suggestion.label}</p>
                  {suggestion.reason && (
                    <p className="text-sm text-gray-600 mt-1">
                      סיבה: {suggestion.reason}
                    </p>
                  )}
                </div>

                {/* Impact preview */}
                <ImpactPreview impact={suggestion.impact} />

                {/* VIP warning */}
                {hasVIPImpact && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-800">השפעה על VIP</p>
                      <p className="text-sm text-yellow-700">
                        שינוי זה ישפיע על {suggestion.impact.vip_affected} משתתפי VIP.
                        ודא שזו הפעולה הנכונה.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 p-4 border-t bg-gray-50">
                <button
                  onClick={onReject}
                  disabled={isExecuting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                >
                  <XCircle className="h-4 w-4" />
                  ביטול
                </button>
                <button
                  onClick={onApprove}
                  disabled={isExecuting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isExecuting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      מבצע...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      אשר ובצע
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
