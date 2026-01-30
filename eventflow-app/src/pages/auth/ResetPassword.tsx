// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - Reset Password Page
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Lock, Loader2, AlertCircle, CheckCircle, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export function ResetPasswordPage() {
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  // Supabase automatically picks up the recovery token from the URL hash
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('הסיסמה חייבת להכיל לפחות 6 תווים')
      return
    }

    if (password !== confirmPassword) {
      setError('הסיסמאות אינן תואמות')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        if (error.message.includes('same_password')) {
          setError('הסיסמה החדשה חייבת להיות שונה מהסיסמה הנוכחית')
        } else {
          setError(error.message)
        }
      } else {
        setSuccess(true)
        setTimeout(() => navigate('/login', { replace: true }), 3000)
      }
    } catch {
      setError('שגיאה באיפוס הסיסמה. נסה שוב.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 px-4">
        <div className="w-full max-w-md">
          <div className="glass-card p-8 rounded-2xl text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">הסיסמה עודכנה!</h2>
            <p className="text-zinc-400 mb-6">
              הסיסמה שלך שונתה בהצלחה.
              <br />
              מעביר אותך להתחברות...
            </p>
            <Link to="/login" className="btn-primary inline-flex items-center gap-2">
              <ArrowRight className="w-4 h-4" />
              התחבר עכשיו
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gradient glow-text mb-2">EventFlow</h1>
          <p className="text-zinc-400">מערכת הפקת אירועים חכמה</p>
        </div>

        {/* Reset Password Card */}
        <div className="glass-card p-8 rounded-2xl">
          <h2 className="text-2xl font-bold text-white mb-2 text-center">איפוס סיסמה</h2>
          <p className="text-zinc-400 text-center mb-6">
            הזן סיסמה חדשה לחשבון שלך
          </p>

          {!sessionReady && (
            <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-center gap-2 text-yellow-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">ממתין לאימות הקישור...</span>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                סיסמה חדשה
              </label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pr-10 pl-10 w-full"
                  placeholder="••••••••"
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                אימות סיסמה
              </label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field pr-10 w-full"
                  placeholder="••••••••"
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !sessionReady}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  מעדכן...
                </>
              ) : (
                'עדכן סיסמה'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/login" className="text-orange-400 hover:text-orange-300 font-medium inline-flex items-center gap-1">
              <ArrowRight className="w-4 h-4" />
              חזרה להתחברות
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-zinc-500 text-sm mt-8">
          © {new Date().getFullYear()} EventFlow AI. כל הזכויות שמורות.
        </p>
      </div>
    </div>
  )
}

export default ResetPasswordPage
