import { useEffect, useRef } from 'react'
import { Wifi, WifiOff, RefreshCw } from 'lucide-react'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { useSyncQueue } from '../hooks/useSyncQueue'

interface ConnectionStatusProps {
  eventId?: string
  showPendingWhenOnline?: boolean  // Default false per CONTEXT.md
}

export function ConnectionStatus({
  eventId,
  showPendingWhenOnline = false
}: ConnectionStatusProps) {
  const { isOnline, lastChange } = useOnlineStatus()
  const { pendingCount } = useSyncQueue(eventId)
  const toastRef = useRef<HTMLDivElement>(null)
  const prevOnlineRef = useRef(isOnline)

  // Show toast on connection change
  useEffect(() => {
    if (prevOnlineRef.current !== isOnline && lastChange) {
      // Show toast
      const toast = toastRef.current
      if (toast) {
        toast.classList.remove('opacity-0', 'translate-y-2')
        toast.classList.add('opacity-100', 'translate-y-0')

        // Auto-hide after 3 seconds
        setTimeout(() => {
          toast.classList.add('opacity-0', 'translate-y-2')
          toast.classList.remove('opacity-100', 'translate-y-0')
        }, 3000)
      }
    }
    prevOnlineRef.current = isOnline
  }, [isOnline, lastChange])

  // Pending count badge - only show when offline (per CONTEXT.md)
  const showPending = pendingCount > 0 && (!isOnline || showPendingWhenOnline)

  return (
    <>
      {/* Status Badge (always visible) */}
      <div className="flex items-center gap-2">
        {isOnline ? (
          <span className="flex items-center gap-1.5 text-xs text-emerald-400">
            <Wifi className="w-3.5 h-3.5" />
            <span>מחובר</span>
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-amber-400">
            <WifiOff className="w-3.5 h-3.5" />
            <span>לא מחובר</span>
          </span>
        )}

        {showPending && (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">
            <RefreshCw className="w-3 h-3" />
            <span>{pendingCount} ממתינים</span>
          </span>
        )}
      </div>

      {/* Toast for connection changes */}
      <div
        ref={toastRef}
        className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-xl shadow-lg transition-all duration-300 opacity-0 translate-y-2 ${
          isOnline
            ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
            : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
        }`}
      >
        <div className="flex items-center gap-2">
          {isOnline ? (
            <>
              <Wifi className="w-4 h-4" />
              <span>חיבור שוחזר - מסנכרן...</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4" />
              <span>אין חיבור - מצב לא מקוון</span>
            </>
          )}
        </div>
      </div>
    </>
  )
}
