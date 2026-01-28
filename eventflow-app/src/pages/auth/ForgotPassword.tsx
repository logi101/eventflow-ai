// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - Forgot Password Page
// ═══════════════════════════════════════════════════════════════════════════

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Loader2, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

export function ForgotPasswordPage() {
  const { resetPassword } = useAuth()

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error } = await resetPassword(email)
      if (error) {
        setError(error.message)
      } else {
        setSuccess(true)
      }
    } catch {
      setError('שגיאה בשליחת הבקשה. נסה שוב.')
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
            <h2 className="text-2xl font-bold text-white mb-2">נשלח!</h2>
            <p className="text-zinc-400 mb-6">
              אם קיים חשבון עם האימייל הזה, שלחנו לך קישור לאיפוס הסיסמה.
              <br />
              בדוק את תיבת הדואר שלך.
            </p>
            <Link to="/login" className="btn-primary inline-flex items-center gap-2">
              <ArrowRight className="w-4 h-4" />
              חזרה להתחברות
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

        {/* Forgot Password Card */}
        <div className="glass-card p-8 rounded-2xl">
          <h2 className="text-2xl font-bold text-white mb-2 text-center">שכחת סיסמה?</h2>
          <p className="text-zinc-400 text-center mb-6">
            הזן את כתובת האימייל שלך ונשלח לך קישור לאיפוס הסיסמה
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                אימייל
              </label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pr-10 w-full"
                  placeholder="your@email.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  שולח...
                </>
              ) : (
                'שלח קישור לאיפוס'
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

export default ForgotPasswordPage
