import { AlertTriangle, AlertCircle, Info, ChevronLeft, Wrench } from 'lucide-react'
import type { SimulationIssue, SuggestedFix } from '../types'
import { severityConfig } from '../types'

interface SimulationIssueCardProps {
  issue: SimulationIssue
  onFixClick?: (fix: SuggestedFix) => void
  onScheduleClick?: (scheduleId: string) => void
}

const severityIcons = {
  critical: AlertTriangle,
  warning: AlertCircle,
  info: Info,
}

export function SimulationIssueCard({
  issue,
  onFixClick,
  onScheduleClick,
}: SimulationIssueCardProps) {
  const config = severityConfig[issue.severity]
  const Icon = severityIcons[issue.severity]

  return (
    <div
      className={`border rounded-lg p-4 ${config.bgColor} ${config.borderColor}`}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${config.iconColor}`} />
        <div className="flex-1 min-w-0">
          <h4 className={`font-medium ${config.textColor}`}>
            {issue.title}
          </h4>
          <p className="text-sm text-gray-600 mt-1">
            {issue.description}
          </p>
        </div>
      </div>

      {/* Affected entities links */}
      {issue.affectedEntities.schedule_ids && issue.affectedEntities.schedule_ids.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {issue.affectedEntities.schedule_ids.map((scheduleId) => (
            <button
              key={scheduleId}
              onClick={() => onScheduleClick?.(scheduleId)}
              className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 underline"
            >
              <ChevronLeft className="h-3 w-3" />
              עבור לסשן
            </button>
          ))}
        </div>
      )}

      {/* Fix action */}
      {issue.suggestedFix && onFixClick && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <button
            onClick={() => onFixClick(issue.suggestedFix!)}
            className={`
              inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium
              bg-white border border-gray-300 text-gray-700
              hover:bg-gray-50 hover:border-gray-400
              transition-colors
            `}
          >
            <Wrench className="h-4 w-4" />
            {issue.suggestedFix.label}
          </button>
        </div>
      )}
    </div>
  )
}
