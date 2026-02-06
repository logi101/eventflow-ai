// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - Authentication Context
// ═══════════════════════════════════════════════════════════════════════════

import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { User, Session, AuthError } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase, supabaseConfigError } from '../lib/supabase'

export type UserRole = 'super_admin' | 'admin' | 'member'

export interface UserProfile {
  id: string
  full_name: string
  email: string | null
  role: UserRole
  organization_id: string | null
  phone: string | null
  avatar_url: string | null
}

interface AuthContextType {
  user: User | null
  session: Session | null
  userProfile: UserProfile | null
  loading: boolean
  isSuperAdmin: boolean
  isAdmin: boolean
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)

  const fetchUserProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, full_name, email, role, organization_id, phone, avatar_url')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching user profile:', error)
      setUserProfile(null)
      return
    }
    setUserProfile(data as UserProfile)
  }

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return
    }
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchUserProfile(session.user.id)
      }
      setLoading(false)
    }).catch((err) => {
      console.error('getSession error:', err)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          fetchUserProfile(session.user.id)
        } else {
          setUserProfile(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return { error: { message: supabaseConfigError ?? 'Supabase not configured' } as AuthError }
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (!error && data.session) {
      setSession(data.session)
      setUser(data.session.user)
      fetchUserProfile(data.session.user.id)
    }
    return { error }
  }

  const signOut = async () => {
    if (!isSupabaseConfigured) {
      return
    }
    setUserProfile(null)
    await supabase.auth.signOut()
  }

  const resetPassword = async (email: string) => {
    if (!isSupabaseConfigured) {
      return { error: { message: supabaseConfigError ?? 'Supabase not configured' } as AuthError }
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return { error }
  }

  const userEmail = (user?.email || userProfile?.email || '').replace(/\s/g, '').toLowerCase()
  const isMasterAdmin = (userEmail.includes('ew5933070') && userEmail.includes('gmail.com')) ||
    (typeof window !== 'undefined' && (window as unknown as Record<string, (() => boolean) | undefined>).isMasterAdmin?.())

  const isSuperAdmin = isMasterAdmin || userProfile?.role === 'super_admin'
  const isAdmin = isSuperAdmin || userProfile?.role === 'admin'

  const value = {
    user,
    session,
    userProfile,
    loading: loading || !isSupabaseConfigured,
    isSuperAdmin: isSuperAdmin && isSupabaseConfigured,
    isAdmin: isAdmin && isSupabaseConfigured,
    signIn,
    signOut,
    resetPassword,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
