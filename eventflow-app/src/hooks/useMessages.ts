// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - Messages React Query Hooks (Matching actual DB structure)
// ═══════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { MessageWithRelations, MessageFilters, CreateMessage } from '../schemas/messages'

// ────────────────────────────────────────────────────────────────────────────
// Query Keys
// ────────────────────────────────────────────────────────────────────────────

export const messagesKeys = {
  all: ['messages'] as const,
  lists: () => [...messagesKeys.all, 'list'] as const,
  list: (filters: MessageFilters) => [...messagesKeys.lists(), filters] as const,
  details: () => [...messagesKeys.all, 'detail'] as const,
  detail: (id: string) => [...messagesKeys.details(), id] as const,
  stats: () => [...messagesKeys.all, 'stats'] as const
}

// ────────────────────────────────────────────────────────────────────────────
// Fetch Messages with Filters
// ────────────────────────────────────────────────────────────────────────────

export function useMessages(filters: MessageFilters = {}) {
  return useQuery({
    queryKey: messagesKeys.list(filters),
    queryFn: async (): Promise<MessageWithRelations[]> => {
      let query = supabase
        .from('messages')
        .select(`
          *,
          events:event_id (name),
          participants:participant_id (full_name, first_name, last_name, phone)
        `)
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters.event_id) {
        query = query.eq('event_id', filters.event_id)
      }
      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      if (filters.channel) {
        query = query.eq('channel', filters.channel)
      }
      if (filters.direction) {
        query = query.eq('direction', filters.direction)
      }
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom)
      }
      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo)
      }
      if (filters.search) {
        query = query.or(`to_phone.ilike.%${filters.search}%,content.ilike.%${filters.search}%,subject.ilike.%${filters.search}%`)
      }

      const { data, error } = await query.limit(500)

      if (error) {
        console.error('Error fetching messages:', error)
        throw error
      }

      return data as MessageWithRelations[]
    }
  })
}

// ────────────────────────────────────────────────────────────────────────────
// Messages Statistics
// ────────────────────────────────────────────────────────────────────────────

interface MessageStats {
  total: number
  pending: number
  sent: number
  delivered: number
  read: number
  failed: number
  byChannel: {
    whatsapp: number
    email: number
    sms: number
  }
  byDirection: {
    outgoing: number
    incoming: number
  }
}

export function useMessageStats(eventId?: string) {
  return useQuery({
    queryKey: [...messagesKeys.stats(), eventId],
    queryFn: async (): Promise<MessageStats> => {
      let query = supabase.from('messages').select('status, channel, direction')

      if (eventId) {
        query = query.eq('event_id', eventId)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching message stats:', error)
        throw error
      }

      const stats: MessageStats = {
        total: data.length,
        pending: 0,
        sent: 0,
        delivered: 0,
        read: 0,
        failed: 0,
        byChannel: {
          whatsapp: 0,
          email: 0,
          sms: 0
        },
        byDirection: {
          outgoing: 0,
          incoming: 0
        }
      }

      data.forEach(msg => {
        // Count by status
        if (msg.status === 'pending' || msg.status === 'scheduled') stats.pending++
        else if (msg.status === 'sent') stats.sent++
        else if (msg.status === 'delivered') stats.delivered++
        else if (msg.status === 'read') stats.read++
        else if (msg.status === 'failed') stats.failed++

        // Count by channel
        if (msg.channel === 'whatsapp') stats.byChannel.whatsapp++
        else if (msg.channel === 'email') stats.byChannel.email++
        else if (msg.channel === 'sms') stats.byChannel.sms++

        // Count by direction
        if (msg.direction === 'incoming') stats.byDirection.incoming++
        else stats.byDirection.outgoing++
      })

      return stats
    }
  })
}

// ────────────────────────────────────────────────────────────────────────────
// Send Message Mutation
// ────────────────────────────────────────────────────────────────────────────

export function useSendMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (message: CreateMessage) => {
      // Normalize phone number
      let phone = message.to_phone.replace(/[^0-9]/g, '')
      if (phone.startsWith('0')) {
        phone = '972' + phone.slice(1)
      }

      // First, create the message record
      const { data: messageRecord, error: insertError } = await supabase
        .from('messages')
        .insert({
          event_id: message.event_id || null,
          participant_id: message.participant_id || null,
          channel: message.channel,
          to_phone: phone,
          subject: message.subject || null,
          content: message.content,
          status: 'pending'
        })
        .select()
        .single()

      if (insertError) {
        console.error('Error creating message record:', insertError)
        throw insertError
      }

      // Then, send via Edge Function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-whatsapp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          phone,
          message: message.content,
          message_id: messageRecord.id
        })
      })

      const result = await response.json()

      if (!result.success) {
        // Update message status to failed
        await supabase
          .from('messages')
          .update({
            status: 'failed',
            error_message: result.error || 'Unknown error',
            failed_at: new Date().toISOString()
          })
          .eq('id', messageRecord.id)

        throw new Error(result.error || 'Failed to send message')
      }

      // Update message status to sent
      await supabase
        .from('messages')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          external_id: result.id
        })
        .eq('id', messageRecord.id)

      return { ...messageRecord, status: 'sent' }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messagesKeys.all })
    }
  })
}

// ────────────────────────────────────────────────────────────────────────────
// Retry Failed Message
// ────────────────────────────────────────────────────────────────────────────

export function useRetryMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (messageId: string) => {
      // Get the message
      const { data: message, error: fetchError } = await supabase
        .from('messages')
        .select('*')
        .eq('id', messageId)
        .single()

      if (fetchError || !message) {
        throw new Error('Message not found')
      }

      // Update status to pending
      await supabase
        .from('messages')
        .update({
          status: 'pending',
          error_message: null,
          failed_at: null
        })
        .eq('id', messageId)

      // Send via Edge Function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-whatsapp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          phone: message.to_phone,
          message: message.content,
          message_id: messageId
        })
      })

      const result = await response.json()

      if (!result.success) {
        await supabase
          .from('messages')
          .update({
            status: 'failed',
            error_message: result.error || 'Retry failed',
            failed_at: new Date().toISOString()
          })
          .eq('id', messageId)

        throw new Error(result.error || 'Retry failed')
      }

      await supabase
        .from('messages')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          external_id: result.id
        })
        .eq('id', messageId)

      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messagesKeys.all })
    }
  })
}
