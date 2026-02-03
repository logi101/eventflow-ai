import { AlertTriangle, AlertCircle } from 'lucide-react'
import { useBudgetAlertCount } from '../hooks/useBudgetAlerts'

interface BudgetAlertBadgeProps {
  eventId: string | undefined
  onClick?: () => void
  className?: string
}

export function BudgetAlertBadge({ eventId, onClick, className = '' }: BudgetAlertBadgeProps) {
  const { count, hasCritical } = useBudgetAlertCount(eventId)

  if (count === 0) return null

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
        hasCritical
          ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
          : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
      } ${className}`}
    >
      {hasCritical ? (
        <AlertCircle className="w-3.5 h-3.5" />
      ) : (
        <AlertTriangle className="w-3.5 h-3.5" />
      )}
      <span>{count} התראות תקציב</span>
    </button>
  )
}

// Simplified dot badge for sidebar/nav
export function BudgetAlertDot({ eventId }: { eventId: string | undefined }) {
  const { count, hasCritical } = useBudgetAlertCount(eventId)

  if (count === 0) return null

  return (
    <span
      className={`w-2 h-2 rounded-full ${
        hasCritical ? 'bg-red-500 animate-pulse' : 'bg-amber-500'
      }`}
      title={`${count} התראות תקציב`}
    />
  )
}
