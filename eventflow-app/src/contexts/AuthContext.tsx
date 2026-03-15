// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - Authentication Context
// ═══════════════════════════════════════════════════════════════════════════

import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { User, Session, AuthError } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase, supabaseConfigError } from '../lib/supabase'
import { Sentry } from '../lib/sentry'

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
  /** True when the user is authenticated but their user_profiles row has organization_id = NULL.
   *  In this state the app should show the "complete your profile / setup organization" screen
   *  instead of an empty events list with no explanation. */
  needsOnboarding: boolean
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
      Sentry.captureException(error)
      setUserProfile(null)
      return
    }

    const profile = data as UserProfile

    // Warn loudly in development when organization_id is NULL so it is
    // immediately visible in the console.  In production the
    // `needsOnboarding` flag in context drives the UI to show the
    // setup screen rather than a silent empty events list.
    if (profile.organization_id === null) {
      console.warn(
        '[AuthContext] user_profiles.organization_id is NULL for user',
        userId,
        '– every RLS policy that checks auth.user_org_id() will return NULL',
        'and the user will see zero events / data. Run migration',
        '004_fix_user_creation_trigger.sql or ensure the handle_new_user()',
        'trigger fired when this account was created.'
      )
      Sentry.captureMessage(
        `user_profiles.organization_id is NULL for user ${userId}`,
        'warning'
      )
    }

    setUserProfile(profile)
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

  const signIn = useCallback(async (email: string, password: string) => {
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
  }, [])

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured) {
      return
    }
    setUserProfile(null)
    await supabase.auth.signOut()
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    if (!isSupabaseConfigured) {
      return { error: { message: supabaseConfigError ?? 'Supabase not configured' } as AuthError }
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return { error }
  }, [])

  const isSuperAdmin = userProfile?.role === 'super_admin'
  const isAdmin = isSuperAdmin || userProfile?.role === 'admin'

  // needsOnboarding: user is authenticated and has a profile row, but the
  // profile has no organization_id linked yet.  Consumers (ProtectedRoute,
  // AppLayout, etc.) should render an onboarding/setup screen when this is
  // true rather than the normal app shell, because every RLS query that
  // checks auth.user_org_id() will return NULL and all data will be hidden.
  const needsOnboarding =
    isSupabaseConfigured &&
    !loading &&
    user !== null &&
    userProfile !== null &&
    userProfile.organization_id === null

  const value = useMemo(() => ({
    user,
    session,
    userProfile,
    // When Supabase is not configured the app is in a known "no auth" state —
    // loading should be false so the UI can render the config error instead of
    // spinning forever.
    loading: isSupabaseConfigured ? loading : false,
    isSuperAdmin: isSuperAdmin && isSupabaseConfigured,
    isAdmin: isAdmin && isSupabaseConfigured,
    needsOnboarding,
    signIn,
    signOut,
    resetPassword,
  }), [user, session, userProfile, loading, isSuperAdmin, isAdmin, needsOnboarding, signIn, signOut, resetPassword])

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
