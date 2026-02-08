// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - Event Context
// Manages the selected event across the application
// ═══════════════════════════════════════════════════════════════════════════

import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
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
  allEvents: Event[]
  refreshEvents: () => Promise<void>
}

const EventContext = createContext<EventContextType | undefined>(undefined)

export function EventProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [allEvents, setAllEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  // Load events when session changes (login/logout)
  useEffect(() => {
    if (session?.access_token) {
      refreshEvents()
    } else {
      setAllEvents([])
      setSelectedEvent(null)
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token])

  // Persist selected event ID in localStorage
  useEffect(() => {
    if (selectedEvent) {
      localStorage.setItem('selectedEventId', selectedEvent.id)
    }
  }, [selectedEvent])

  // Restore selected event from localStorage on mount
  useEffect(() => {
    const savedEventId = localStorage.getItem('selectedEventId')
    if (savedEventId && !selectedEvent) {
      selectEventById(savedEventId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allEvents])

  async function refreshEvents() {
    // Guard: don't fetch without an authenticated session
    if (!session?.access_token) {
      setAllEvents([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          event_types(id, name, icon)
        `)
        .order('start_date', { ascending: false })

      if (error) throw error

      // Auto-mark past events as "completed"
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
        await Promise.all(
          pastEvents.map(event =>
            supabase.from('events').update({ status: 'completed' }).eq('id', event.id)
          )
        )
        for (const pe of pastEvents) {
          const found = data?.find(e => e.id === pe.id)
          if (found) found.status = 'completed'
        }
      }

      // Get participant counts for each event
      const eventsWithCounts = await Promise.all(
        (data || []).map(async (event) => {
          const { count: participantsCount } = await supabase
            .from('participants')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', event.id)

          const { count: schedulesCount } = await supabase
            .from('schedules')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', event.id)

          return {
            ...event,
            participants_count: participantsCount || 0,
            schedules_count: schedulesCount || 0
          }
        })
      )

      setAllEvents(eventsWithCounts)
    } catch (error) {
      console.error('Error loading events:', error)
      Sentry.captureException(error)
    } finally {
      setLoading(false)
    }
  }

  async function selectEventById(eventId: string) {
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
          *,
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
        })
      }
    } catch (error) {
      console.error('Error selecting event:', error)
      Sentry.captureException(error)
    }
  }

  function clearSelectedEvent() {
    setSelectedEvent(null)
    localStorage.removeItem('selectedEventId')
  }

  return (
    <EventContext.Provider
      value={{
        selectedEvent,
        setSelectedEvent,
        selectEventById,
        clearSelectedEvent,
        loading,
        allEvents,
        refreshEvents
      }}
    >
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
