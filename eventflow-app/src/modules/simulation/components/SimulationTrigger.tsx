import { Play, Loader2, RefreshCw } from 'lucide-react'
import { useSimulation } from '../hooks'
import { SimulationReport } from './SimulationReport'
import type { SuggestedFix } from '../types'

interface SimulationTriggerProps {
  eventId: string
  onFixClick?: (fix: SuggestedFix) => void
  onScheduleClick?: (scheduleId: string) => void
}

export function SimulationTrigger({
  eventId,
  onFixClick,
  onScheduleClick,
}: SimulationTriggerProps) {
  const {
    runSimulation,
    isLoading,
    isError,
    error,
    result,
    hasResult,
    hasCriticalIssues,
  } = useSimulation(eventId)

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header with trigger button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            סימולציית יום האירוע
          </h3>
          <p className="text-sm text-gray-500">
            בדיקה מקיפה לזיהוי בעיות פוטנציאליות לפני האירוע
          </p>
        </div>

        <button
          onClick={() => runSimulation()}
          disabled={isLoading}
          className={`
            inline-flex items-center gap-2 px-4 py-2 rounded-lg
            font-medium text-sm transition-colors
            ${isLoading
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : hasResult
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }
          `}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              מריץ סימולציה...
            </>
          ) : hasResult ? (
            <>
              <RefreshCw className="h-4 w-4" />
              הרץ שוב
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              הרץ סימולציה
            </>
          )}
        </button>
      </div>

      {/* Error state */}
      {isError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">
            שגיאה בהרצת הסימולציה: {error?.message || 'שגיאה לא ידועה'}
          </p>
        </div>
      )}

      {/* Critical issues warning banner */}
      {hasResult && hasCriticalIssues && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-4 flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <span className="text-xl">!</span>
          </div>
          <div>
            <h4 className="font-medium text-red-800">נמצאו בעיות קריטיות</h4>
            <p className="text-sm text-red-700 mt-1">
              מומלץ לטפל בבעיות הקריטיות לפני יום האירוע.
              ניתן להמשיך, אבל ייתכנו בעיות במהלך האירוע.
            </p>
          </div>
        </div>
      )}

      {/* Results */}
      {hasResult && result && (
        <SimulationReport
          result={result}
          onFixClick={onFixClick}
          onScheduleClick={onScheduleClick}
        />
      )}
    </div>
  )
}
