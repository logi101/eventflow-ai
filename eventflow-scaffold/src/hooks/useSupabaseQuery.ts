import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { PostgrestError } from '@supabase/supabase-js'

interface QueryOptions<T> {
  queryKey: string[]
  table: string
  select?: string
  filters?: Record<string, unknown>
  orderBy?: { column: string; ascending?: boolean }
  enabled?: boolean
}

interface MutationOptions<T> {
  table: string
  invalidateKeys?: string[][]
  onSuccess?: (data: T) => void
  onError?: (error: PostgrestError) => void
}

export function useSupabaseQuery<T>({
  queryKey,
  table,
  select = '*',
  filters = {},
  orderBy,
  enabled = true,
}: QueryOptions<T>) {
  return useQuery({
    queryKey,
    queryFn: async () => {
      let query = supabase.from(table).select(select)

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value)
        }
      })

      // Apply ordering
      if (orderBy) {
        query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true })
      }

      const { data, error } = await query

      if (error) {
        throw error
      }

      return data as T[]
    },
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry on auth errors
      if ((error as PostgrestError)?.code === 'PGRST301') return false
      return failureCount < 3
    },
  })
}

export function useSupabaseInsert<T extends Record<string, unknown>>({
  table,
  invalidateKeys = [],
  onSuccess,
  onError,
}: MutationOptions<T>) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: T) => {
      const { data: result, error } = await supabase
        .from(table)
        .insert(data)
        .select()
        .maybeSingle()

      if (error) throw error
      return result as T
    },
    onSuccess: (data) => {
      invalidateKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key })
      })
      onSuccess?.(data)
    },
    onError: (error: PostgrestError) => {
      console.error(`Insert error in ${table}:`, error)
      onError?.(error)
    },
  })
}

export function useSupabaseUpdate<T extends Record<string, unknown>>({
  table,
  invalidateKeys = [],
  onSuccess,
  onError,
}: MutationOptions<T>) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<T> }) => {
      const { data: result, error } = await supabase
        .from(table)
        .update(data)
        .eq('id', id)
        .select()
        .maybeSingle()

      if (error) throw error
      return result as T
    },
    onSuccess: (data) => {
      invalidateKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key })
      })
      onSuccess?.(data)
    },
    onError: (error: PostgrestError) => {
      console.error(`Update error in ${table}:`, error)
      onError?.(error)
    },
  })
}

export function useSupabaseDelete({
  table,
  invalidateKeys = [],
  onSuccess,
  onError,
}: Omit<MutationOptions<void>, 'onSuccess'> & { onSuccess?: () => void }) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      invalidateKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key })
      })
      onSuccess?.()
    },
    onError: (error: PostgrestError) => {
      console.error(`Delete error in ${table}:`, error)
      onError?.(error)
    },
  })
}
