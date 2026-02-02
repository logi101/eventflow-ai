// EventFlow AI Chat - AI Confirmation Dialog
// RTL-first Hebrew UI for confirming AI write operations

import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, AlertCircle, Info, Users, Check, X } from 'lucide-react'
import type { AIWriteAction, ActionRisk } from '../../types/chat'

interface AIConfirmationDialogProps {
  action: AIWriteAction
  risk: ActionRisk
  onApprove: () => void
  onReject: () => void
  isExecuting: boolean
}

export function AIConfirmationDialog({
  action,
  risk,
  onApprove,
  onReject,
  isExecuting
}: AIConfirmationDialogProps) {
  // Risk display configuration
  const riskConfig = {
    critical: {
      icon: AlertTriangle,
      color: 'text-red-500',
      bg: 'bg-red-500/10',
      border: 'border-red-500/30'
    },
    high: {
      icon: AlertCircle,
      color: 'text-orange-500',
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/30'
    },
    medium: {
      icon: Info,
      color: 'text-yellow-500',
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/30'
    },
    low: {
      icon: Check,
      color: 'text-green-500',
      bg: 'bg-green-500/10',
      border: 'border-green-500/30'
    }
  }

  const config = riskConfig[risk]
  const RiskIcon = config.icon

  // Has error-level conflicts that block approval
  const hasBlockingConflicts = action.conflicts.some(c => c.severity === 'error')

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={!isExecuting ? onReject : undefined}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="relative mx-4 w-full max-w-lg overflow-hidden rounded-2xl border border-gray-800 bg-gray-950 shadow-2xl"
          dir="rtl"
        >
          {/* Header */}
          <div className={`flex items-center gap-3 border-b p-4 ${config.border} ${config.bg}`}>
            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${config.bg}`}>
              <RiskIcon className={`h-5 w-5 ${config.color}`} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white">{action.label}</h3>
              <p className="text-xs text-gray-400">
                {risk === 'critical' && 'דורש אישור קריטי'}
                {risk === 'high' && 'דורש אישור עם זהירות'}
                {risk === 'medium' && 'דורש אישור'}
                {risk === 'low' && 'מוכן לאישור'}
              </p>
            </div>
          </div>

          {/* VIP Warning Banner */}
          {action.vip_warning && (
            <div className="border-b border-orange-500/30 bg-orange-500/10 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 text-orange-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-orange-300">השפעה על VIP</p>
                  <p className="mt-1 text-xs text-orange-200/80">{action.vip_warning}</p>
                </div>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
            {/* Conflicts Section */}
            {action.conflicts.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-300">קונפליקטים וסכנות:</h4>
                <div className="space-y-2">
                  {action.conflicts.map((conflict, idx) => {
                    const isError = conflict.severity === 'error'
                    return (
                      <div
                        key={idx}
                        className={`rounded-lg border p-3 ${
                          isError
                            ? 'border-red-500/30 bg-red-500/5'
                            : 'border-yellow-500/30 bg-yellow-500/5'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <AlertCircle
                            className={`h-4 w-4 flex-shrink-0 mt-0.5 ${
                              isError ? 'text-red-500' : 'text-yellow-500'
                            }`}
                          />
                          <div className="flex-1 space-y-1">
                            <p className={`text-sm font-medium ${
                              isError ? 'text-red-300' : 'text-yellow-300'
                            }`}>
                              {conflict.type === 'room_overlap' && 'חפיפה בחדר'}
                              {conflict.type === 'speaker_overlap' && 'חפיפה בדובר'}
                              {conflict.type === 'capacity_overflow' && 'חריגת קיבולת'}
                            </p>
                            <p className="text-xs text-gray-400">{conflict.message}</p>
                            {conflict.conflicting_item && (
                              <div className="mt-2 rounded bg-black/30 p-2 text-xs text-gray-500">
                                <p className="font-medium text-gray-400">
                                  {conflict.conflicting_item.title}
                                </p>
                                <p className="text-gray-500">
                                  {conflict.conflicting_item.start_time} - {conflict.conflicting_item.end_time}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Impact Summary */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-300">השפעת השינוי:</h4>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-3 text-center">
                  <Users className="mx-auto h-5 w-5 text-blue-400 mb-1" />
                  <p className="text-xs text-gray-500">משתתפים</p>
                  <p className="text-lg font-bold text-white">{action.impact.affected_participants}</p>
                </div>
                <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-3 text-center">
                  <AlertCircle className="mx-auto h-5 w-5 text-orange-400 mb-1" />
                  <p className="text-xs text-gray-500">VIP</p>
                  <p className="text-lg font-bold text-white">{action.impact.vip_count}</p>
                </div>
                <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-3 text-center">
                  <Info className="mx-auto h-5 w-5 text-purple-400 mb-1" />
                  <p className="text-xs text-gray-500">התראות</p>
                  <p className="text-lg font-bold text-white">
                    {action.impact.requires_notifications ? 'כן' : 'לא'}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Details */}
            {action.type === 'schedule_update' && 'current' in action.data && 'proposed' in action.data && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-300">השוואת שינויים:</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-3">
                    <p className="mb-2 font-medium text-gray-400">נוכחי:</p>
                    <pre className="whitespace-pre-wrap text-gray-500 overflow-x-auto">
                      {JSON.stringify(action.data.current, null, 2)}
                    </pre>
                  </div>
                  <div className="rounded-lg border border-green-800 bg-green-900/10 p-3">
                    <p className="mb-2 font-medium text-green-400">מוצע:</p>
                    <pre className="whitespace-pre-wrap text-green-300 overflow-x-auto">
                      {JSON.stringify(action.data.proposed, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex gap-2 border-t border-gray-800 p-4">
            <button
              onClick={onReject}
              disabled={isExecuting}
              className="flex-1 rounded-lg border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="inline-block h-4 w-4 ml-1 -mt-0.5" />
              ביטול
            </button>
            <button
              onClick={onApprove}
              disabled={hasBlockingConflicts || isExecuting}
              className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                hasBlockingConflicts
                  ? 'bg-gray-700 cursor-not-allowed'
                  : isExecuting
                  ? 'bg-green-600'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {isExecuting ? (
                <>
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="inline-block ml-1"
                  >
                    ⏳
                  </motion.span>
                  מבצע...
                </>
              ) : (
                <>
                  <Check className="inline-block h-4 w-4 ml-1 -mt-0.5" />
                  {hasBlockingConflicts ? 'חסום - יש קונפליקטים' : 'אישור'}
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
