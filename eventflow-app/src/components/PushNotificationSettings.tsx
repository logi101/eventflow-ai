// ═══════════════════════════════════════════════════════════════════════════
// EventFlow AI - Push Notification Settings Component
// ═══════════════════════════════════════════════════════════════════════════

import { useState } from 'react'
import { Bell, BellOff, Smartphone, AlertCircle, CheckCircle2, Loader2, Send } from 'lucide-react'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { supabase } from '@/lib/supabase'

export function PushNotificationSettings() {
  const {
    isSupported,
    isSubscribed,
    permission,
    isLoading,
    isiOS,
    isPWA,
    subscribe,
    unsubscribe
  } = usePushNotifications()

  const [isSendingTest, setIsSendingTest] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const showStatus = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text })
    setTimeout(() => setStatusMessage(null), 4000)
  }

  const handleToggle = async () => {
    try {
      if (isSubscribed) {
        await unsubscribe()
        showStatus('success', 'התראות כובו')
      } else {
        await subscribe()
        showStatus('success', 'התראות הופעלו בהצלחה!')
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'שגיאה לא ידועה'
      showStatus('error', message)
    }
  }

  const handleSendTest = async () => {
    setIsSendingTest(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('לא מחובר')

      await supabase.functions.invoke('send-push-notification', {
        body: {
          user_id: user.id,
          payload: {
            title: 'בדיקת התראה',
            body: 'התראות Push פועלות!',
            url: '/'
          }
        }
      })

      showStatus('success', 'התראת בדיקה נשלחה!')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'שגיאה בשליחה'
      showStatus('error', message)
    } finally {
      setIsSendingTest(false)
    }
  }

  // iOS not in PWA mode - show installation instructions
  if (isiOS && !isPWA) {
    return (
      <div className="p-5 rounded-2xl border" style={{
        background: 'linear-gradient(145deg, rgba(249, 115, 22, 0.08) 0%, rgba(249, 115, 22, 0.02) 100%)',
        borderColor: 'rgba(249, 115, 22, 0.15)'
      }}>
        <div className="flex items-center gap-3 mb-4">
          <Smartphone size={20} className="text-orange-400" />
          <h3 className="text-white font-semibold text-sm">התראות Push</h3>
        </div>
        <p className="text-zinc-400 text-sm mb-4">יש להתקין את האפליקציה קודם:</p>
        <ol className="text-zinc-400 text-sm space-y-2 list-decimal pr-5">
          <li>לחצו על כפתור השיתוף ב-Safari</li>
          <li>גללו למטה ולחצו &quot;הוסף למסך הבית&quot;</li>
          <li>פתחו את האפליקציה מהמסך הראשי</li>
        </ol>
      </div>
    )
  }

  // Not supported
  if (!isSupported) {
    return (
      <div className="p-5 rounded-2xl border" style={{
        background: 'var(--bg-card)',
        borderColor: 'rgba(255, 255, 255, 0.06)'
      }}>
        <div className="flex items-center gap-3">
          <AlertCircle size={20} className="text-zinc-500" />
          <div>
            <h3 className="text-white font-semibold text-sm">התראות Push</h3>
            <p className="text-zinc-500 text-xs mt-1">לא נתמך בדפדפן הנוכחי</p>
          </div>
        </div>
      </div>
    )
  }

  // Permission denied
  if (permission === 'denied') {
    return (
      <div className="p-5 rounded-2xl border" style={{
        background: 'var(--bg-card)',
        borderColor: 'rgba(239, 68, 68, 0.2)'
      }}>
        <div className="flex items-center gap-3">
          <BellOff size={20} className="text-red-400" />
          <div>
            <h3 className="text-white font-semibold text-sm">התראות Push</h3>
            <p className="text-red-400 text-xs mt-1">ההרשאה נדחתה - יש לעדכן בהגדרות הדפדפן</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-5 rounded-2xl border transition-all duration-300" style={{
      background: isSubscribed
        ? 'linear-gradient(145deg, rgba(34, 197, 94, 0.08) 0%, rgba(34, 197, 94, 0.02) 100%)'
        : 'var(--bg-card)',
      borderColor: isSubscribed
        ? 'rgba(34, 197, 94, 0.2)'
        : 'rgba(255, 255, 255, 0.06)'
    }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isSubscribed
            ? <CheckCircle2 size={20} className="text-green-400" />
            : <Bell size={20} className="text-zinc-400" />
          }
          <div>
            <h3 className="text-white font-semibold text-sm">התראות Push</h3>
            <p className={`text-xs mt-1 ${isSubscribed ? 'text-green-400' : 'text-zinc-500'}`}>
              {isSubscribed ? 'פעיל' : 'כבוי'}
            </p>
          </div>
        </div>

        <button
          onClick={handleToggle}
          disabled={isLoading}
          className="relative w-12 h-7 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
          style={{
            background: isSubscribed
              ? 'linear-gradient(135deg, #22c55e 0%, #4ade80 100%)'
              : 'rgba(255, 255, 255, 0.1)'
          }}
        >
          <span
            className="absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300"
            style={{
              right: isSubscribed ? '1.5rem' : '0.25rem',
            }}
          />
          {isLoading && (
            <Loader2 size={14} className="absolute top-1.5 left-1/2 -translate-x-1/2 text-white animate-spin" />
          )}
        </button>
      </div>

      {/* Test button */}
      {isSubscribed && (
        <button
          onClick={handleSendTest}
          disabled={isSendingTest}
          className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-zinc-300 hover:text-white hover:bg-white/5"
          style={{
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}
        >
          {isSendingTest ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          שלח התראת בדיקה
        </button>
      )}

      {/* Status message */}
      {statusMessage && (
        <div className={`mt-3 p-3 rounded-xl text-sm text-center ${
          statusMessage.type === 'success'
            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
            : 'bg-red-500/10 text-red-400 border border-red-500/20'
        }`}>
          {statusMessage.text}
        </div>
      )}
    </div>
  )
}
