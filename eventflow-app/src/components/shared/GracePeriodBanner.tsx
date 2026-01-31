// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - Grace Period Floating Countdown Banner
// Persists across page navigation, shows pending changes with cancel option
// ═══════════════════════════════════════════════════════════════════════════

import { X, XCircle } from 'lucide-react'
import { useGracePeriod } from '../../contexts/GracePeriodContext'

// ────────────────────────────────────────────────────────────────────────────
// Countdown Ring (SVG)
// ────────────────────────────────────────────────────────────────────────────

function CountdownRing({ seconds, total = 60 }: { seconds: number; total?: number }) {
  const radius = 18
  const circumference = 2 * Math.PI * radius
  const progress = seconds / total
  const offset = circumference * (1 - progress)

  return (
    <div className="relative w-11 h-11 shrink-0">
      <svg className="w-11 h-11 -rotate-90" viewBox="0 0 44 44">
        {/* Background ring */}
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke="rgb(63 63 70)"
          strokeWidth="3"
        />
        {/* Progress ring */}
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke={seconds <= 10 ? 'rgb(239 68 68)' : 'rgb(245 158 11)'}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-linear"
        />
      </svg>
      <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${
        seconds <= 10 ? 'text-red-400' : 'text-amber-400'
      }`}>
        {seconds}
      </span>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Main Banner
// ────────────────────────────────────────────────────────────────────────────

export function GracePeriodBanner() {
  const { pendingChanges, cancelChange, cancelAllChanges, getRemainingSeconds } = useGracePeriod()

  if (pendingChanges.length === 0) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-[420px] z-50 flex flex-col gap-2">
      {/* Cancel All button (when multiple) */}
      {pendingChanges.length > 1 && (
        <div className="flex justify-end">
          <button
            onClick={cancelAllChanges}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-900/60 text-red-300 rounded-lg text-sm font-medium hover:bg-red-900/80 transition-colors border border-red-700/50"
          >
            <XCircle size={14} />
            ביטול הכל ({pendingChanges.length})
          </button>
        </div>
      )}

      {/* Pending change items */}
      {pendingChanges.map(change => {
        const remaining = getRemainingSeconds(change.id)
        return (
          <div
            key={change.id}
            className="bg-zinc-900/95 backdrop-blur-sm border border-amber-700/50 rounded-xl p-3 shadow-2xl shadow-amber-900/20 animate-in slide-in-from-bottom-4"
          >
            <div className="flex items-center gap-3">
              <CountdownRing seconds={remaining} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {change.description}
                </p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {remaining > 0
                    ? `ייכנס לתוקף בעוד ${remaining} שניות`
                    : 'מבצע...'
                  }
                </p>
              </div>
              <button
                onClick={() => cancelChange(change.id)}
                className="flex items-center gap-1 px-3 py-1.5 bg-zinc-700 text-zinc-300 rounded-lg text-sm hover:bg-zinc-600 transition-colors shrink-0"
                title="ביטול שינוי"
              >
                <X size={14} />
                ביטול
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
