// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - Impersonation Context
// Allows super_admin to browse the app as a specific user (visual mode)
// ═══════════════════════════════════════════════════════════════════════════

import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import type { ReactNode } from 'react'

export interface ImpersonatedUser {
  id: string
  full_name: string
  email: string
  role: string
  organization_id: string | null
}

interface ImpersonationContextType {
  impersonatedUser: ImpersonatedUser | null
  isImpersonating: boolean
  startImpersonation: (user: ImpersonatedUser) => void
  stopImpersonation: () => void
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined)

const STORAGE_KEY = 'eventflow-impersonation'

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const [impersonatedUser, setImpersonatedUser] = useState<ImpersonatedUser | null>(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  const startImpersonation = useCallback((user: ImpersonatedUser) => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    setImpersonatedUser(user)
  }, [])

  const stopImpersonation = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY)
    setImpersonatedUser(null)
  }, [])

  const value = useMemo(() => ({
    impersonatedUser,
    isImpersonating: impersonatedUser !== null,
    startImpersonation,
    stopImpersonation,
  }), [impersonatedUser, startImpersonation, stopImpersonation])

  return (
    <ImpersonationContext.Provider value={value}>
      {children}
    </ImpersonationContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useImpersonation() {
  const context = useContext(ImpersonationContext)
  if (context === undefined) {
    throw new Error('useImpersonation must be used within an ImpersonationProvider')
  }
  return context
}
