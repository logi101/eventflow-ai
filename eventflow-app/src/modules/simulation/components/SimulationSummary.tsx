import { AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react'

interface SimulationSummaryProps {
  total: number
  critical: number
  warnings: number
  info: number
  durationMs?: number
}

export function SimulationSummary({
  total,
  critical,
  warnings,
  info,
  durationMs,
}: SimulationSummaryProps) {
  if (total === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
        <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
        <div>
          <h3 className="font-medium text-green-800">הכל תקין!</h3>
          <p className="text-sm text-green-600">
            לא נמצאו בעיות בסימולציית יום האירוע
            {durationMs && ` (${durationMs}ms)`}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-gray-900">
          נמצאו {total} בעיות
        </h3>
        {durationMs && (
          <span className="text-xs text-gray-400">
            {durationMs}ms
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {/* Critical */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-2xl font-bold text-red-700">{critical}</span>
          </div>
          <span className="text-xs text-red-600">קריטי</span>
        </div>

        {/* Warnings */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <AlertCircle className="h-4 w-4 text-yellow-500" />
            <span className="text-2xl font-bold text-yellow-700">{warnings}</span>
          </div>
          <span className="text-xs text-yellow-600">אזהרות</span>
        </div>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Info className="h-4 w-4 text-blue-500" />
            <span className="text-2xl font-bold text-blue-700">{info}</span>
          </div>
          <span className="text-xs text-blue-600">מידע</span>
        </div>
      </div>
    </div>
  )
}
