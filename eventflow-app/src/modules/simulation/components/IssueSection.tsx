import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { SimulationIssue, SuggestedFix } from '../types'
import { severityConfig } from '../types'
import { SimulationIssueCard } from './SimulationIssueCard'

interface IssueSectionProps {
  severity: 'critical' | 'warning' | 'info'
  issues: SimulationIssue[]
  onFixClick?: (fix: SuggestedFix) => void
  onScheduleClick?: (scheduleId: string) => void
  defaultExpanded?: boolean
}

export function IssueSection({
  severity,
  issues,
  onFixClick,
  onScheduleClick,
  defaultExpanded = true,
}: IssueSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const config = severityConfig[severity]

  if (issues.length === 0) return null

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Section header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          w-full flex items-center justify-between p-3
          ${config.bgColor} ${config.borderColor} border-b
        `}
      >
        <div className="flex items-center gap-2">
          <span className={`font-medium ${config.textColor}`}>
            {config.label}
          </span>
          <span className={`
            px-2 py-0.5 rounded-full text-xs font-medium
            ${config.bgColor} ${config.textColor}
          `}>
            {issues.length}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        )}
      </button>

      {/* Section description */}
      {isExpanded && (
        <div className="p-2 bg-gray-50 border-b border-gray-200">
          <p className="text-xs text-gray-500">{config.description}</p>
        </div>
      )}

      {/* Issues list */}
      {isExpanded && (
        <div className="p-3 space-y-3 bg-white">
          {issues.map((issue) => (
            <SimulationIssueCard
              key={issue.id}
              issue={issue}
              onFixClick={onFixClick}
              onScheduleClick={onScheduleClick}
            />
          ))}
        </div>
      )}
    </div>
  )
}
