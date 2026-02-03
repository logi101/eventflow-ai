import { Users, Star, Bell, AlertTriangle } from 'lucide-react'
import type { ImpactSummary } from '../types'

interface ImpactPreviewProps {
  impact: ImpactSummary
  showWarning?: boolean
}

export function ImpactPreview({ impact, showWarning = true }: ImpactPreviewProps) {
  const hasVIPs = (impact.vip_affected ?? 0) > 0

  return (
    <div className="space-y-3" dir="rtl">
      {/* Warning banner for VIPs */}
      {showWarning && hasVIPs && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-700">
            שינוי זה ישפיע על {impact.vip_affected} משתתפי VIP
          </p>
        </div>
      )}

      {/* Impact stats */}
      <div className="grid grid-cols-2 gap-3">
        {/* Affected participants */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <Users className="h-4 w-4" />
            <span className="text-xs">משתתפים מושפעים</span>
          </div>
          <span className="text-xl font-bold text-gray-900">
            {impact.affected_participants}
          </span>
        </div>

        {/* VIPs affected */}
        <div className="bg-purple-50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-purple-600 mb-1">
            <Star className="h-4 w-4" />
            <span className="text-xs">VIP מושפעים</span>
          </div>
          <span className="text-xl font-bold text-purple-700">
            {impact.vip_affected ?? 0}
          </span>
        </div>

        {/* Notifications to send */}
        <div className="bg-blue-50 rounded-lg p-3 col-span-2">
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <Bell className="h-4 w-4" />
            <span className="text-xs">הודעות WhatsApp שיישלחו</span>
          </div>
          <span className="text-xl font-bold text-blue-700">
            {impact.affected_participants}
          </span>
        </div>
      </div>

      {/* Affected sessions */}
      {impact.affected_sessions.length > 0 && (
        <div className="text-xs text-gray-500">
          סשנים מושפעים: {impact.affected_sessions.length}
        </div>
      )}
    </div>
  )
}
