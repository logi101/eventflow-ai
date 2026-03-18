// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - Event Context
// Manages the selected event across the application
// ═══════════════════════════════════════════════════════════════════════════

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { useImpersonation } from './ImpersonationContext'
import { Sentry } from '../lib/sentry'

interface Event {
  id: string
  name: string
  description: string | null
  status: 'draft' | 'planning' | 'active' | 'completed' | 'cancelled' | 'archived'
  start_date: string
  end_date: string | null
  venue_name: string | null
  venue_address: string | null
  venue_city: string | null
  max_participants: number | null
  budget: number | null
  event_type_id: string | null
  organization_id: string | null
  event_types?: {
    id: string
    name: string
    icon: string | null
  }
  // Stats
  participants_count?: number
  schedules_count?: number
}

interface EventContextType {
  selectedEvent: Event | null
  setSelectedEvent: (event: Event | null) => void
  selectEventById: (eventId: string) => Promise<void>
  clearSelectedEvent: () => void
  loading: boolean
  error: string | null
  allEvents: Event[]
  refreshEvents: () => Promise<void>
}

const EventContext = createContext<EventContextType | undefined>(undefined)

export function EventProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const { isImpersonating, impersonatedUser } = useImpersonation()
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [allEvents, setAllEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load events when session changes (login/logout) or impersonation changes
  useEffect(() => {
    if (session?.access_token) {
      setSelectedEvent(null)
      localStorage.removeItem('selectedEventId')
      refreshEvents()
    } else {
      setAllEvents([])
      setSelectedEvent(null)
      setError(null)
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token, isImpersonating, impersonatedUser?.id])

  // Supabase Realtime: re-fetch events list whenever the events table changes
  // (INSERT, UPDATE, DELETE) so a new event added from another tab/session
  // appears automatically without a manual page refresh.
  useEffect(() => {
    if (!session?.access_token) return

    const channel = supabase
      .channel('events-table-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events' },
        () => {
          // Re-fetch the full list to pick up counts and joined data.
          // Using refreshEvents (not a delta) keeps logic centralised.
          refreshEvents()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token])

  // Persist selected event ID in localStorage
  useEffect(() => {
    if (selectedEvent) {
      localStorage.setItem('selectedEventId', selectedEvent.id)
    }
  }, [selectedEvent])

  // Restore selected event from localStorage on mount.
  // We only auto-restore a previously saved selection — we never silently
  // auto-select the first event when there is no saved ID, because that would
  // hide the event picker from users who haven't chosen an event yet.
  useEffect(() => {
    if (selectedEvent || allEvents.length === 0) return
    const savedEventId = localStorage.getItem('selectedEventId')
    if (savedEventId) {
      // Only restore if the saved event actually belongs to this user
      const owned = allEvents.find(e => e.id === savedEventId)
      if (owned) {
        setSelectedEvent(owned)
      } else {
        // Stale/inaccessible event — clear storage but do NOT silently pick another
        localStorage.removeItem('selectedEventId')
      }
    }
    // Intentionally no else branch: no saved ID means the user has not yet chosen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allEvents])

  const refreshEvents = useCallback(async () => {
    // Guard: don't fetch without an authenticated session
    if (!session?.access_token) {
      setAllEvents([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      // When impersonating, filter by the impersonated user's organization
      let query = supabase
        .from('events')
        .select(`
          id, name, description, status, start_date, end_date,
          venue_name, venue_address, venue_city, max_participants,
          budget, event_type_id, organization_id, public_rsvp_enabled,
          event_types(id, name, icon)
        `)
        .order('start_date', { ascending: false })

      if (isImpersonating && impersonatedUser?.organization_id) {
        query = query.eq('organization_id', impersonatedUser.organization_id)
      }

      const { data, error } = await query

      if (error) throw error

      // Auto-mark past events as "completed" — single batch UPDATE instead of N individual calls
      const now = new Date()
      const pastEvents = (data || []).filter(event => {
        const endDate = event.end_date || event.start_date
        return (
          endDate &&
          new Date(endDate) < now &&
          (event.status === 'active' || event.status === 'planning')
        )
      })
      if (pastEvents.length > 0) {
        const pastIds = pastEvents.map(e => e.id)
        const { error: batchError } = await supabase
          .from('events')
          .update({ status: 'completed' })
          .in('id', pastIds)
        if (batchError) {
          console.error('Failed to auto-complete past events:', batchError)
          Sentry.captureException(batchError)
        } else {
          // Update local data for successfully completed events
          pastIds.forEach(id => {
            const found = data?.find(e => e.id === id)
            if (found) found.status = 'completed'
          })
        }
      }

      // Batch-fetch counts for all events (2 queries instead of 2N)
      // Errors are non-fatal: counts fall back to 0 so events still render
      const eventIds = (data || []).map(e => e.id)
      const [participantsResult, schedulesResult] = await Promise.allSettled([
        supabase.from('participants').select('event_id').in('event_id', eventIds),
        supabase.from('schedules').select('event_id').in('event_id', eventIds),
      ])

      if (participantsResult.status === 'rejected') {
        console.error('Failed to fetch participant counts:', participantsResult.reason)
        Sentry.captureException(participantsResult.reason)
      } else if (participantsResult.value.error) {
        console.error('Failed to fetch participant counts:', participantsResult.value.error)
        Sentry.captureException(participantsResult.value.error)
      }

      if (schedulesResult.status === 'rejected') {
        console.error('Failed to fetch schedule counts:', schedulesResult.reason)
        Sentry.captureException(schedulesResult.reason)
      } else if (schedulesResult.value.error) {
        console.error('Failed to fetch schedule counts:', schedulesResult.value.error)
        Sentry.captureException(schedulesResult.value.error)
      }

      const allParticipants =
        participantsResult.status === 'fulfilled' && !participantsResult.value.error
          ? participantsResult.value.data
          : null

      const allSchedules =
        schedulesResult.status === 'fulfilled' && !schedulesResult.value.error
          ? schedulesResult.value.data
          : null

      const participantCounts = (allParticipants || []).reduce<Record<string, number>>((acc, p) => {
        acc[p.event_id] = (acc[p.event_id] || 0) + 1
        return acc
      }, {})
      const scheduleCounts = (allSchedules || []).reduce<Record<string, number>>((acc, s) => {
        acc[s.event_id] = (acc[s.event_id] || 0) + 1
        return acc
      }, {})

      const eventsWithCounts = (data || []).map(event => ({
        ...event,
        participants_count: participantCounts[event.id] || 0,
        schedules_count: scheduleCounts[event.id] || 0
      }))

      setAllEvents(eventsWithCounts as unknown as Event[])
    } catch (err) {
      console.error('Error loading events:', err)
      Sentry.captureException(err)
      const message = err instanceof Error ? err.message : 'Failed to load events'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [session?.access_token])

  const selectEventById = useCallback(async (eventId: string) => {
    // First check if we already have it in allEvents
    const existingEvent = allEvents.find(e => e.id === eventId)
    if (existingEvent) {
      setSelectedEvent(existingEvent)
      return
    }

    // Otherwise fetch from database
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          id, name, description, status, start_date, end_date,
          venue_name, venue_address, venue_city, max_participants,
          budget, event_type_id, organization_id, public_rsvp_enabled,
          event_types(id, name, icon)
        `)
        .eq('id', eventId)
        .single()

      if (error) throw error
      if (data) {
        const { count: participantsCount } = await supabase
          .from('participants')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', data.id)

        setSelectedEvent({
          ...data,
          participants_count: participantsCount || 0
        } as unknown as Event)
      }
    } catch (error) {
      console.error('Error selecting event:', error)
      // Clear stale/inaccessible event from localStorage so we don't retry
      localStorage.removeItem('selectedEventId')
      Sentry.captureException(error)
    }
  }, [allEvents])

  const clearSelectedEvent = useCallback(() => {
    setSelectedEvent(null)
    localStorage.removeItem('selectedEventId')
  }, [])

  const value = useMemo(() => ({
    selectedEvent,
    setSelectedEvent,
    selectEventById,
    clearSelectedEvent,
    loading,
    error,
    allEvents,
    refreshEvents
  }), [selectedEvent, loading, error, allEvents, clearSelectedEvent, selectEventById, refreshEvents])

  return (
    <EventContext.Provider value={value}>
      {children}
    </EventContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useEvent() {
  const context = useContext(EventContext)
  if (context === undefined) {
    throw new Error('useEvent must be used within an EventProvider')
  }
  return context
}

export default EventContext
