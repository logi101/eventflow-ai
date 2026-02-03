import { History, Clock, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react'
import type { AuditEntry } from '../types'
import { actionTypeLabels, statusLabels, statusColors } from '../types'

interface ContingencyHistoryProps {
  history: AuditEntry[]
  isLoading?: boolean
}

export function ContingencyHistory({ history, isLoading }: ContingencyHistoryProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500">
        <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>אין היסטוריית פעולות</p>
      </div>
    )
  }

  return (
    <div className="space-y-3" dir="rtl">
      <h3 className="font-medium text-gray-900 flex items-center gap-2">
        <History className="h-4 w-4" />
        היסטוריית פעולות
      </h3>

      <div className="space-y-2">
        {history.map((entry) => (
          <ContingencyHistoryItem key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  )
}

function ContingencyHistoryItem({ entry }: { entry: AuditEntry }) {
  const statusConfig = statusColors[entry.execution_status]

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900">
            {actionTypeLabels[entry.action_type as keyof typeof actionTypeLabels] || entry.action_type}
          </span>
          <span className={`
            inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
            ${statusConfig.bg} ${statusConfig.text}
          `}>
            {renderStatusIcon(entry.execution_status)}
            {statusLabels[entry.execution_status]}
          </span>
        </div>
      </div>

      {/* Action details */}
      <p className="text-sm text-gray-600 mt-1">
        {entry.action_data.schedule_title}
      </p>

      {/* Reason */}
      {entry.reason && (
        <p className="text-xs text-gray-500 mt-1">
          סיבה: {entry.reason}
        </p>
      )}

      {/* Impact summary */}
      {entry.impact_summary && entry.execution_status === 'executed' && (
        <div className="flex gap-4 mt-2 text-xs text-gray-500">
          <span>משתתפים: {entry.impact_summary.affected_participants}</span>
          <span>הודעות: {entry.impact_summary.notifications_sent}</span>
          {(entry.impact_summary.vip_affected ?? 0) > 0 && (
            <span className="text-purple-600">VIP: {entry.impact_summary.vip_affected}</span>
          )}
        </div>
      )}

      {/* Error message */}
      {entry.error_message && (
        <p className="text-xs text-red-600 mt-1">
          שגיאה: {entry.error_message}
        </p>
      )}

      {/* Metadata */}
      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {new Date(entry.suggested_at).toLocaleString('he-IL')}
        </span>
        {entry.executed_at && (
          <span className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            בוצע: {new Date(entry.executed_at).toLocaleString('he-IL')}
          </span>
        )}
      </div>
    </div>
  )
}

function renderStatusIcon(status: string) {
  switch (status) {
    case 'executed':
      return <CheckCircle className="h-3 w-3" />
    case 'rejected':
    case 'failed':
      return <XCircle className="h-3 w-3" />
    default:
      return <AlertCircle className="h-3 w-3" />
  }
}
