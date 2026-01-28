// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - Signup Page
// ═══════════════════════════════════════════════════════════════════════════

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, User, Loader2, AlertCircle, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

export function SignupPage() {
  useNavigate() // Keep for potential future navigation
  const { signUp } = useAuth()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const passwordStrength = () => {
    let strength = 0
    if (password.length >= 8) strength++
    if (/[a-z]/.test(password)) strength++
    if (/[A-Z]/.test(password)) strength++
    if (/[0-9]/.test(password)) strength++
    if (/[^a-zA-Z0-9]/.test(password)) strength++
    return strength
  }

  const getStrengthColor = () => {
    const strength = passwordStrength()
    if (strength < 2) return 'bg-red-500'
    if (strength < 4) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getStrengthLabel = () => {
    const strength = passwordStrength()
    if (strength < 2) return 'חלשה'
    if (strength < 4) return 'בינונית'
    return 'חזקה'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (password !== confirmPassword) {
      setError('הסיסמאות אינן תואמות')
      return
    }

    if (password.length < 8) {
      setError('הסיסמה חייבת להכיל לפחות 8 תווים')
      return
    }

    if (fullName.trim().length < 2) {
      setError('יש להזין שם מלא')
      return
    }

    setLoading(true)

    try {
      const { error } = await signUp(email, password, fullName)
      if (error) {
        if (error.message.includes('already registered')) {
          setError('כתובת האימייל כבר רשומה במערכת')
        } else {
          setError(error.message)
        }
      } else {
        setSuccess(true)
      }
    } catch {
      setError('שגיאה בהרשמה. נסה שוב.')
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
            <h2 className="text-2xl font-bold text-white mb-2">נרשמת בהצלחה!</h2>
            <p className="text-zinc-400 mb-6">
              שלחנו לך אימייל לאישור. לחץ על הקישור באימייל כדי להפעיל את החשבון.
            </p>
            <Link to="/login" className="btn-primary inline-block">
              חזרה להתחברות
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gradient glow-text mb-2">EventFlow</h1>
          <p className="text-zinc-400">מערכת הפקת אירועים חכמה</p>
        </div>

        {/* Signup Card */}
        <div className="glass-card p-8 rounded-2xl">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">הרשמה</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                שם מלא
              </label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input-field pr-10 w-full"
                  placeholder="ישראל ישראלי"
                  required
                  autoComplete="name"
                />
              </div>
            </div>

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

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                סיסמה
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
              {password && (
                <div className="mt-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1 bg-zinc-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getStrengthColor()} transition-all`}
                        style={{ width: `${(passwordStrength() / 5) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-zinc-400">{getStrengthLabel()}</span>
                  </div>
                </div>
              )}
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
                  autoComplete="new-password"
                />
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-red-400 text-xs mt-1">הסיסמאות אינן תואמות</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  נרשם...
                </>
              ) : (
                'הירשם'
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-zinc-400">
            כבר יש לך חשבון?{' '}
            <Link to="/login" className="text-orange-400 hover:text-orange-300 font-medium">
              התחבר
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

export default SignupPage
