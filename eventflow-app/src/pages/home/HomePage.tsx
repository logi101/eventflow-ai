// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - Home Page (Event Selection)
// Shows all events as cards for selection
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Calendar,
  Users,
  MapPin,
  Clock,
  Plus,
  Search,
  Loader2,
  Sparkles,
  ChevronLeft
} from 'lucide-react'
import { useEvent } from '../../contexts/EventContext'
import { useAuth } from '../../contexts/AuthContext'
import { EventForm } from '../../modules/events/components/EventForm'
import type { EventFormData } from '../../modules/events/types'
import { supabase } from '../../lib/supabase'

type FilterStatus = 'all' | 'active' | 'planning' | 'draft' | 'completed'

export function HomePage() {
  const navigate = useNavigate()
  const { allEvents, setSelectedEvent, loading, refreshEvents } = useEvent()
  const { user, userProfile } = useAuth()
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')

  // Create event modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [eventTypes, setEventTypes] = useState<{ id: string; name: string; name_en: string; icon: string }[]>([])
  const [saving, setSaving] = useState(false)
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
    supabase
      .from('event_types')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => {
        if (data) setEventTypes(data)
      })
  }, [])

  function openCreateModal() {
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
    setShowCreateModal(true)
  }

  async function handleSaveEvent() {
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
        status: formData.status,
        organization_id: userProfile?.organization_id || null,
        created_by: user?.id || null
      }

      const { data, error } = await supabase
        .from('events')
        .insert(eventData)
        .select()
        .single()

      if (error) throw error

      setShowCreateModal(false)
      await refreshEvents()
      // Auto-select the newly created event and navigate to its dashboard
      if (data) {
        setSelectedEvent(data)
        navigate('/event/dashboard')
      }
    } catch (error) {
      console.error('Error saving event:', error)
      alert('שגיאה בשמירת האירוע')
    } finally {
      setSaving(false)
    }
  }

  const handleSelectEvent = (event: typeof allEvents[0]) => {
    setSelectedEvent(event)
    navigate('/event/dashboard')
  }

  const filteredEvents = allEvents.filter(event => {
    const matchesSearch = event.name.toLowerCase().includes(search.toLowerCase()) ||
                         event.venue_name?.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = filterStatus === 'all' || event.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'פעיל'
      case 'planning': return 'בתכנון'
      case 'draft': return 'טיוטה'
      case 'completed': return 'הסתיים'
      case 'cancelled': return 'בוטל'
      default: return status
    }
  }

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-50 text-green-700 border-green-200'
      case 'planning': return 'bg-amber-50 text-amber-700 border-amber-200'
      case 'draft': return 'bg-gray-50 text-gray-600 border-gray-200'
      case 'completed': return 'bg-blue-50 text-blue-700 border-blue-200'
      default: return 'bg-gray-50 text-gray-600 border-gray-200'
    }
  }

  const getDaysUntil = (date: string) => {
    const days = Math.ceil(
      (new Date(date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    )
    if (days < 0) return 'עבר'
    if (days === 0) return 'היום'
    if (days === 1) return 'מחר'
    return `בעוד ${days} ימים`
  }

  const statusFilters: { value: FilterStatus; label: string }[] = [
    { value: 'all', label: 'הכל' },
    { value: 'active', label: 'פעיל' },
    { value: 'planning', label: 'בתכנון' },
    { value: 'draft', label: 'טיוטה' },
    { value: 'completed', label: 'הסתיים' },
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--ef-cream)' }}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-primary-500 animate-spin" />
          <p className="text-gray-500 font-medium">טוען אירועים...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--ef-cream)' }}>
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium mb-1">
                {new Date().toLocaleDateString('he-IL', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
              <h1 className="text-3xl font-bold text-gray-900">
                בחר אירוע לניהול
              </h1>
              <p className="text-gray-500 mt-1">
                {allEvents.length} אירועים במערכת
              </p>
            </div>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-white font-medium transition-all hover:-translate-y-0.5 hover:shadow-lg"
              style={{
                background: 'var(--ef-terracotta)',
                boxShadow: '0 4px 12px rgba(196, 112, 75, 0.3)'
              }}
            >
              <Plus size={20} />
              אירוע חדש
            </button>
          </div>
        </header>

        {/* Filters & Search */}
        <div className="flex items-center gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חפש אירוע..."
              className="w-full pr-10 pl-4 py-2.5 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 bg-white rounded-xl p-1 border border-gray-200">
            {statusFilters.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setFilterStatus(value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filterStatus === value
                    ? 'bg-primary-500 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Events Grid */}
        {filteredEvents.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              {search || filterStatus !== 'all' ? 'לא נמצאו אירועים' : 'אין אירועים עדיין'}
            </h3>
            <p className="text-gray-500 mb-6">
              {search || filterStatus !== 'all'
                ? 'נסה לשנות את החיפוש או הסינון'
                : 'צור את האירוע הראשון שלך כדי להתחיל'}
            </p>
            {!search && filterStatus === 'all' && (
              <button
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-medium"
                style={{ background: 'var(--ef-terracotta)' }}
              >
                <Sparkles size={18} />
                צור אירוע חדש
              </button>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => (
              <button
                key={event.id}
                onClick={() => handleSelectEvent(event)}
                className="bg-white rounded-2xl border border-gray-200 p-6 text-right transition-all hover:shadow-xl hover:-translate-y-1 hover:border-primary-300 group"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {event.event_types?.icon && (
                        <span className="text-2xl">{event.event_types.icon}</span>
                      )}
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${getStatusBgColor(event.status)}`}>
                        {getStatusLabel(event.status)}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 truncate group-hover:text-primary-600 transition-colors">
                      {event.name}
                    </h3>
                    {event.event_types?.name && (
                      <p className="text-sm text-gray-500">{event.event_types.name}</p>
                    )}
                  </div>
                  <ChevronLeft className="w-5 h-5 text-gray-300 group-hover:text-primary-500 transition-colors" />
                </div>

                {/* Info */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar size={16} className="text-gray-400" />
                    <span>
                      {new Date(event.start_date).toLocaleDateString('he-IL', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </span>
                    <span className="text-primary-500 font-medium">
                      ({getDaysUntil(event.start_date)})
                    </span>
                  </div>

                  {event.venue_name && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin size={16} className="text-gray-400" />
                      <span className="truncate">{event.venue_name}</span>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-1.5">
                    <Users size={16} className="text-blue-500" />
                    <span className="text-sm font-semibold text-gray-700">
                      {event.participants_count || 0}
                    </span>
                    <span className="text-sm text-gray-500">משתתפים</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock size={16} className="text-amber-500" />
                    <span className="text-sm font-semibold text-gray-700">
                      {event.schedules_count || 0}
                    </span>
                    <span className="text-sm text-gray-500">פעילויות</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Create Event Modal */}
      <EventForm
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleSaveEvent}
        event={null}
        eventTypes={eventTypes}
        formData={formData}
        setFormData={setFormData}
        saving={saving}
      />
    </div>
  )
}

export default HomePage
