// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - Event Context
// Manages the selected event across the application
// ═══════════════════════════════════════════════════════════════════════════

import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../lib/supabase'

interface Event {
  id: string
  name: string
  description: string | null
  status: 'draft' | 'planning' | 'active' | 'completed' | 'cancelled'
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
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [allEvents, setAllEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  // Load events on mount
  useEffect(() => {
    refreshEvents()
  }, [])

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
  }, [allEvents])

  async function refreshEvents() {
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

export function useEvent() {
  const context = useContext(EventContext)
  if (context === undefined) {
    throw new Error('useEvent must be used within an EventProvider')
  }
  return context
}

export default EventContext
