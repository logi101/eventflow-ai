import type { SimulationResult, SuggestedFix } from '../types'
import { groupIssuesBySeverity } from '../services'
import { SimulationSummary } from './SimulationSummary'
import { IssueSection } from './IssueSection'

interface SimulationReportProps {
  result: SimulationResult
  onFixClick?: (fix: SuggestedFix) => void
  onScheduleClick?: (scheduleId: string) => void
}

export function SimulationReport({
  result,
  onFixClick,
  onScheduleClick,
}: SimulationReportProps) {
  const grouped = groupIssuesBySeverity(result.issues)

  return (
    <div className="space-y-4" dir="rtl">
      {/* Summary */}
      <SimulationSummary
        total={result.total_issues}
        critical={result.critical}
        warnings={result.warnings}
        info={result.info}
        durationMs={result.duration_ms}
      />

      {/* Issues by severity */}
      <div className="space-y-4">
        <IssueSection
          severity="critical"
          issues={grouped.critical}
          onFixClick={onFixClick}
          onScheduleClick={onScheduleClick}
          defaultExpanded={true}
        />
        <IssueSection
          severity="warning"
          issues={grouped.warning}
          onFixClick={onFixClick}
          onScheduleClick={onScheduleClick}
          defaultExpanded={grouped.critical.length === 0}
        />
        <IssueSection
          severity="info"
          issues={grouped.info}
          onFixClick={onFixClick}
          onScheduleClick={onScheduleClick}
          defaultExpanded={grouped.critical.length === 0 && grouped.warning.length === 0}
        />
      </div>

      {/* Run timestamp */}
      <div className="text-xs text-gray-400 text-center">
        סימולציה בוצעה: {new Date(result.run_at).toLocaleString('he-IL')}
      </div>
    </div>
  )
}
