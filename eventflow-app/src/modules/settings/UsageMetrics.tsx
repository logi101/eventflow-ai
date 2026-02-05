import { useEffect } from 'react'
import { useTier } from '../../contexts/TierContext'
import { RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react'

export function UsageMetrics() {
  const { tier, usage, limits, loading, refreshQuota } = useTier()

  const isPremium = tier === 'premium' || tier === 'legacy_premium'

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshQuota()
    }, 30000)

    return () => clearInterval(interval)
  }, [refreshQuota])

  if (loading || !usage || !limits) {
    return (
      <div className="p-6 text-center text-zinc-500">
        <RefreshCw className="animate-spin mx-auto mb-2" size={24} />
        <p>טוען נתוני שימוש...</p>
      </div>
    )
  }

  const getUsagePercentage = (used: number, limit: number): number => {
    if (limit === -1) return 0 // Unlimited
    return Math.min((used / limit) * 100, 100)
  }

  const getProgressBarColor = (percentage: number): string => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 80) return 'bg-amber-500'
    return 'bg-green-500'
  }

  const getWarningIcon = (percentage: number) => {
    if (percentage >= 90) return <AlertTriangle size={16} className="text-red-500" />
    if (percentage >= 80) return <AlertTriangle size={16} className="text-amber-500" />
    return <CheckCircle size={16} className="text-green-500" />
  }

  const eventsUsed = usage.events_count || 0
  const eventsLimit = limits.events_per_year
  const eventsPercent = getUsagePercentage(eventsUsed, eventsLimit)

  const participantsUsed = usage.participants_count || 0
  const participantsLimit = limits.participants_per_event
  const participantsPercent = getUsagePercentage(participantsUsed, participantsLimit)

  const messagesUsed = usage.messages_sent || 0
  const messagesLimit = limits.messages_per_month
  const messagesPercent = getUsagePercentage(messagesUsed, messagesLimit)

  const aiMessagesUsed = usage.ai_messages_sent || 0
  const aiMessagesLimit = limits.ai_chat_messages_per_month
  const aiMessagesPercent = getUsagePercentage(aiMessagesUsed, aiMessagesLimit)

  if (isPremium) {
    return (
      <div className="space-y-6">
        <div className="text-center p-8 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl border border-amber-200">
          <div className="text-4xl mb-3">💎</div>
          <h2 className="text-xl font-bold text-amber-800 mb-2">תוכנית פרימיום</h2>
          <p className="text-amber-700">כל המגבלות ללא הגבלה</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">אירועים השנה</span>
              <CheckCircle size={16} className="text-green-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">ללא הגבלה</p>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">משתתפים באירוע</span>
              <CheckCircle size={16} className="text-green-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">ללא הגבלה</p>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">הודעות החודש</span>
              <CheckCircle size={16} className="text-green-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">ללא הגבלה</p>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">הודעות AI החודש</span>
              <CheckCircle size={16} className="text-green-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">ללא הגבלה</p>
          </div>
        </div>

        <div className="text-xs text-gray-500 text-center mt-4">
          הנתונים מתעדכנים אוטומטית
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">שימוש המגבלות</h2>
        <button
          onClick={refreshQuota}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="רענן נתונים"
        >
          <RefreshCw size={16} className="text-gray-600" />
        </button>
      </div>

      {/* Events per Year */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">אירועים השנה</span>
          {getWarningIcon(eventsPercent)}
        </div>
        <div className="flex items-end gap-2 mb-2">
          <span className="text-2xl font-bold text-gray-900">{eventsUsed}</span>
          <span className="text-sm text-gray-500 mb-1">/ {eventsLimit} אירועים</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(eventsPercent)}`}
            style={{ width: `${eventsPercent}%` }}
          />
        </div>
      </div>

      {/* Participants per Event */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">משתתפים באירוע</span>
          {getWarningIcon(participantsPercent)}
        </div>
        <div className="flex items-end gap-2 mb-2">
          <span className="text-2xl font-bold text-gray-900">{participantsUsed}</span>
          <span className="text-sm text-gray-500 mb-1">/ {participantsLimit} משתתפים</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(participantsPercent)}`}
            style={{ width: `${participantsPercent}%` }}
          />
        </div>
      </div>

      {/* Messages per Month */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">הודעות החודש</span>
          {getWarningIcon(messagesPercent)}
        </div>
        <div className="flex items-end gap-2 mb-2">
          <span className="text-2xl font-bold text-gray-900">{messagesUsed}</span>
          <span className="text-sm text-gray-500 mb-1">/ {messagesLimit} הודעות</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(messagesPercent)}`}
            style={{ width: `${messagesPercent}%` }}
          />
        </div>
      </div>

      {/* AI Messages per Month */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">הודעות AI החודש</span>
          {getWarningIcon(aiMessagesPercent)}
        </div>
        <div className="flex items-end gap-2 mb-2">
          <span className="text-2xl font-bold text-gray-900">{aiMessagesUsed}</span>
          <span className="text-sm text-gray-500 mb-1">/ {aiMessagesLimit} הודעות</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(aiMessagesPercent)}`}
            style={{ width: `${aiMessagesPercent}%` }}
          />
        </div>
      </div>

      {/* Period Info */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <p className="text-sm text-gray-600">
          תקופת המדידה: <strong className="text-gray-900">
            {new Date(usage.period_start).toLocaleDateString('he-IL')} - {new Date(usage.period_end).toLocaleDateString('he-IL')}
          </strong>
        </p>
      </div>

      <div className="text-xs text-gray-500 text-center mt-4">
        הנתונים מתעדכנים אוטומטית כל 30 שניות
      </div>
    </div>
  )
}
