// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - Signup Page (Disabled - Redirect to Login)
// ═══════════════════════════════════════════════════════════════════════════

import { Navigate } from 'react-router-dom'

export function SignupPage() {
  return <Navigate to="/login" replace />
}

export default SignupPage
