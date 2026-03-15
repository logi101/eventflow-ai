// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - Protected Route Component
// ═══════════════════════════════════════════════════════════════════════════

import { Navigate, useLocation } from 'react-router-dom'
import { Loader2, AlertTriangle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import type { UserRole } from '../../contexts/AuthContext'

const ROLE_HIERARCHY: Record<UserRole, number> = {
  member: 0,
  admin: 1,
  super_admin: 2,
}

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: UserRole
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, userProfile, loading, isSuperAdmin, needsOnboarding, signOut } = useAuth()
  const location = useLocation()

  if (loading && !isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-zinc-400">טוען...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Master Bypass
  if (isSuperAdmin) {
    return <>{children}</>
  }

  // Incomplete profile: user_profiles row exists but organization_id is NULL.
  // This breaks ALL RLS policies so the user sees zero data.  Show a clear
  // explanation screen instead of a confusingly empty app.
  if (needsOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 text-orange-400" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">הגדרת חשבון נדרשת</h1>
          <p className="text-zinc-400 mb-6 leading-relaxed">
            החשבון שלך נוצר אך עדיין אינו מקושר לארגון.
            ללא ארגון לא ניתן לראות אירועים, משתתפים או נתונים אחרים.
          </p>
          <p className="text-zinc-500 text-sm mb-8">
            יש לפנות לאדמין המערכת כדי לקשר את החשבון לארגון,
            או לנסות להתנתק ולהתחבר מחדש כדי שהמערכת תיצור ארגון ברירת מחדל.
          </p>
          <button
            type="button"
            onClick={() => signOut()}
            className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-400 text-white font-medium rounded-xl transition-colors"
          >
            התנתק ונסה שוב
          </button>
        </div>
      </div>
    )
  }

  // Wait for profile to load before checking role
  if (requiredRole && !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-zinc-400">בודק הרשאות...</p>
        </div>
      </div>
    )
  }

  // Check role hierarchy
  if (requiredRole && userProfile) {
    const userLevel = ROLE_HIERARCHY[userProfile.role] ?? 0
    const requiredLevel = ROLE_HIERARCHY[requiredRole]
    if (userLevel < requiredLevel) {
      return <Navigate to="/" replace />
    }
  }

  return <>{children}</>
}

export default ProtectedRoute