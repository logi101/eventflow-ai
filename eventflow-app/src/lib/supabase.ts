import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

const missingConfigMessage =
  'Missing Supabase environment variables: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY'

const createSupabaseProxy = () =>
  new Proxy(
    {},
    {
      get() {
        throw new Error(missingConfigMessage)
      },
    },
  ) as SupabaseClient

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createSupabaseProxy()

export const supabaseConfigError = isSupabaseConfigured ? null : missingConfigMessage
