// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - Impersonation Banner
// Prominent fixed banner shown when super_admin is viewing as another user
// ═══════════════════════════════════════════════════════════════════════════

import { useNavigate } from 'react-router-dom'
import { Eye, X, AlertTriangle, ArrowLeft } from 'lucide-react'
import { useImpersonation } from '../../contexts/ImpersonationContext'

export function ImpersonationBanner() {
  const { isImpersonating, impersonatedUser, stopImpersonation } = useImpersonation()
  const navigate = useNavigate()

  if (!isImpersonating || !impersonatedUser) return null

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin': return 'מנהל ראשי'
      case 'admin': return 'מנהל'
      case 'member': return 'חבר'
      default: return role
    }
  }

  const handleExit = () => {
    stopImpersonation()
    navigate('/admin/users')
  }

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-between px-4 py-2.5 bg-gradient-to-l from-red-700 via-orange-600 to-red-700 border-b-2 border-orange-400 shadow-[0_4px_24px_rgba(239,68,68,0.5)]"
      dir="rtl"
      role="alert"
      aria-live="assertive"
    >
      {/* Animated pulse overlay */}
      <div className="absolute inset-0 bg-white/5 animate-pulse pointer-events-none" />

      {/* Left — icon + message */}
      <div className="flex items-center gap-3 relative z-10">
        <div className="flex items-center gap-2 bg-white/15 rounded-lg px-3 py-1.5">
          <AlertTriangle className="w-4 h-4 text-yellow-300 animate-bounce" />
          <span className="text-yellow-200 text-xs font-bold uppercase tracking-wider">מצב צפייה</span>
        </div>

        <div className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-white" />
          <span className="text-white font-semibold text-sm">
            אתה צופה כ:
          </span>
          <span className="bg-white/20 rounded-lg px-3 py-1 text-white font-bold text-sm border border-white/30">
            {impersonatedUser.full_name}
          </span>
          <span className="text-orange-200 text-xs hidden sm:block" dir="ltr">
            ({impersonatedUser.email})
          </span>
          <span className="bg-orange-800/60 rounded px-2 py-0.5 text-orange-200 text-xs">
            {getRoleLabel(impersonatedUser.role)}
          </span>
        </div>
      </div>

      {/* Right — warning text + exit button */}
      <div className="flex items-center gap-3 relative z-10">
        <span className="text-orange-200 text-xs hidden md:block font-medium">
          ⚠️ כל הפעולות מתבצעות בשם משתמש זה
        </span>
        <button
          onClick={handleExit}
          className="flex items-center gap-2 bg-white text-red-700 hover:bg-red-50 font-bold text-sm px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg"
        >
          <ArrowLeft className="w-4 h-4" />
          חזור לחשבוני
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
