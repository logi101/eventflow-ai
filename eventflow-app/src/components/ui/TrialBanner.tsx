import { useEffect, useState } from 'react'
import { X, Sparkles } from 'lucide-react'
import { useTier } from '../../contexts/TierContext'
import { supabase } from '../../lib/supabase'

export function TrialBanner() {
  const { tier, loading } = useTier()
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null)
  const [dismissed, setDismissed] = useState(false)

  // Check if user is on trial
  const isTrial = tier === 'premium' && !loading && daysRemaining !== null && daysRemaining > 0

  // Calculate days remaining from TierContext
  useEffect(() => {
    if (!loading && tier === 'premium') {
      // Check if trial_ends_at exists in usage data
      const checkTrialStatus = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single()

        if (!profile?.organization_id) return

        const { data: org } = await supabase
          .from('organizations')
          .select('trial_ends_at, trial_started_at')
          .eq('id', profile.organization_id)
          .single()

        if (!org?.trial_ends_at) return

        const now = new Date()
        const trialEnd = new Date(org.trial_ends_at)
        const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

        setDaysRemaining(daysLeft)
      }

      checkTrialStatus()
    }
  }, [loading, tier])

  // Dismiss for session
  const handleDismiss = () => {
    setDismissed(true)
  }

  if (loading || dismissed || !isTrial || daysRemaining === null || daysRemaining <= 0) {
    return null
  }

  const getUrgencyColor = () => {
    if (daysRemaining <= 2) return 'from-red-500 to-red-600'
    if (daysRemaining <= 5) return 'from-amber-500 to-orange-600'
    return 'from-purple-500 to-indigo-600'
  }

  const getUrgencyText = () => {
    if (daysRemaining <= 2) return 'התמלף עוד יומים ספורים!'
    if (daysRemaining <= 5) return 'הניסיון נגמר לסופו'
    return ''
  }

  return (
    <div className="fixed top-4 left-1/2 right-1/2 -translate-x-1/2 z-50" dir="rtl">
      <div
        className={`
          flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg
          transition-all duration-300
          max-w-md mx-auto text-white
          ${getUrgencyColor()}
        `}
      >
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={20} />
            <h3 className="font-semibold">ניסיון פרימיום בגימור</h3>
          </div>
          <p className="text-sm opacity-95">
            הניסיון יסתיים ב-<strong>{daysRemaining}</strong> ימים
          </p>
          {getUrgencyText() && (
            <p className="text-xs font-medium">
              {getUrgencyText()}
            </p>
          )}
        </div>
        <button
          onClick={handleDismiss}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          aria-label="סגור הודעה הזו"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
