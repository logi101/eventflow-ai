import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Plus, Calendar } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Event, EventStatus } from '@/types'
import type { EventFormData } from '../types'
import { EventCard } from '../components/EventCard'
import { EventForm } from '../components/EventForm'
import { getStatusLabel } from '@/utils'
import { LoadingState } from '@/features/feedback'
import { EmptyState } from '@/features/feedback'

export function EventsPage() {
  const location = useLocation()
  const [events, setEvents] = useState<(Event & { participants_count: number; checklist_progress: number; vendors_count: number })[]>([])
  const [eventTypes, setEventTypes] = useState<{ id: string; name: string; name_en: string; icon: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState<EventStatus | 'all'>('all')
  const [autoOpenTriggered, setAutoOpenTriggered] = useState(false)

  const [formData, setFormData] = useState<EventFormData>({
    name: '',
    description: '',
    event_type_id: '',
    start_date: '',
    end_date: '',
    venue_name: '',
    venue_address: '',
    venue_city: '',
    max_participants: '',
    budget: '',
    status: 'draft'
  })

  useEffect(() => {
    fetchEvents()
    fetchEventTypes()
  }, [])

  useEffect(() => {
    if (location.pathname === '/events/new' && eventTypes.length > 0 && !autoOpenTriggered) {
      setAutoOpenTriggered(true)
      setEditingEvent(null)
      setFormData({
        name: '',
        description: '',
        event_type_id: eventTypes[0]?.id || '',
        start_date: '',
        end_date: '',
        venue_name: '',
        venue_address: '',
        venue_city: '',
        max_participants: '',
        budget: '',
        status: 'draft'
      })
      setShowModal(true)
    }
  }, [location.pathname, eventTypes, autoOpenTriggered])

  async function fetchEvents() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          event_types (id, name, name_en, icon)
        `)
        .order('start_date', { ascending: false })

      if (error) throw error

      const eventsWithStats = await Promise.all((data || []).map(async (event) => {
        const [participantsRes, checklistRes, vendorsRes] = await Promise.all([
          supabase.from('participants').select('id', { count: 'exact', head: true }).eq('event_id', event.id),
          supabase.from('checklist_items').select('id, status').eq('event_id', event.id),
          supabase.from('event_vendors').select('id', { count: 'exact', head: true }).eq('event_id', event.id)
        ])

        const checklistItems = checklistRes.data || []
        const completedItems = checklistItems.filter(item => item.status === 'completed').length
        const checklistProgress = checklistItems.length > 0
          ? Math.round((completedItems / checklistItems.length) * 100)
          : 0

        return {
          ...event,
          participants_count: participantsRes.count || 0,
          checklist_progress: checklistProgress,
          vendors_count: vendorsRes.count || 0
        }
      }))

      setEvents(eventsWithStats)
    } catch (error) {
      console.error('Error fetching events:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchEventTypes() {
    try {
      const { data, error } = await supabase
        .from('event_types')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')

      if (error) throw error
      setEventTypes(data || [])
    } catch (error) {
      console.error('Error fetching event types:', error)
    }
  }

  function openCreateModal() {
    setEditingEvent(null)
    setFormData({
      name: '',
      description: '',
      event_type_id: eventTypes[0]?.id || '',
      start_date: '',
      end_date: '',
      venue_name: '',
      venue_address: '',
      venue_city: '',
      max_participants: '',
      budget: '',
      status: 'draft'
    })
    setShowModal(true)
  }

  function openEditModal(event: Event) {
    setEditingEvent(event)
    setFormData({
      name: event.name,
      description: event.description || '',
      event_type_id: event.event_type_id || '',
      start_date: event.start_date ? new Date(event.start_date).toISOString().slice(0, 16) : '',
      end_date: event.end_date ? new Date(event.end_date).toISOString().slice(0, 16) : '',
      venue_name: event.venue_name || '',
      venue_address: event.venue_address || '',
      venue_city: event.venue_city || '',
      max_participants: event.max_participants?.toString() || '',
      budget: event.budget?.toString() || '',
      status: event.status
    })
    setShowModal(true)
  }

  async function handleSave() {
    if (!formData.name || !formData.start_date) {
      alert('נא למלא שם אירוע ותאריך')
      return
    }

    setSaving(true)
    try {
      const eventData = {
        name: formData.name,
        description: formData.description || null,
        event_type_id: formData.event_type_id || null,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        venue_name: formData.venue_name || null,
        venue_address: formData.venue_address || null,
        venue_city: formData.venue_city || null,
        max_participants: formData.max_participants ? parseInt(formData.max_participants) : null,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        status: formData.status
      }

      if (editingEvent) {
        const { error } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', editingEvent.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('events')
          .insert(eventData)

        if (error) throw error
      }

      setShowModal(false)
      fetchEvents()
    } catch (error) {
      console.error('Error saving event:', error)
      alert('שגיאה בשמירת האירוע')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(event: Event) {
    if (!confirm(`האם למחוק את האירוע "${event.name}"?`)) return

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', event.id)

      if (error) throw error
      fetchEvents()
    } catch (error) {
      console.error('Error deleting event:', error)
      alert('שגיאה במחיקת האירוע')
    }
  }

  const filteredEvents = filter === 'all' ? events : events.filter(e => e.status === filter)

  return (
    <div className="p-8 relative z-10">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-semibold text-white tracking-tight" data-testid="events-title">אירועים</h1>
        <button
          className="premium-btn-primary flex items-center gap-2.5"
          data-testid="create-event-btn"
          onClick={openCreateModal}
        >
          <Plus size={20} />
          אירוע חדש
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-8 flex-wrap" data-testid="event-filters">
        {(['all', 'draft', 'planning', 'active', 'completed', 'cancelled'] as const).map(status => (
          <button
            key={status}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              filter === status
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25'
                : 'bg-[#1a1d27]/5 text-zinc-400 hover:bg-[#1a1d27]/10 hover:text-white border border-white/5'
            }`}
            onClick={() => setFilter(status)}
          >
            {status === 'all' ? 'הכל' : getStatusLabel(status)}
          </button>
        ))}
      </div>

      {/* Events List */}
      <div className="space-y-5" data-testid="events-list">
        {loading ? (
          <LoadingState message="טוען אירועים..." variant="full" />
        ) : filteredEvents.length === 0 ? (
          <EmptyState
            title="אין אירועים עדיין"
            description="לחץ על 'אירוע חדש' ליצירת האירוע הראשון"
            icon={<Calendar size={56} className="mx-auto text-zinc-500" />}
          />
        ) : (
          filteredEvents.map(event => (
            <EventCard
              key={event.id}
              event={event}
              onEdit={openEditModal}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      <EventForm
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
        event={editingEvent}
        eventTypes={eventTypes}
        formData={formData}
        setFormData={setFormData}
        saving={saving}
      />
    </div>
  )
}
