// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - Events Page
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Edit2, Trash2, MapPin, Clock, X, Loader2, Calendar, RefreshCw, PlusCircle, AlertTriangle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import type { Event, EventType, EventFormData, EventStatus } from '../../types'
import { formatDate, formatCurrency, getStatusColor, getStatusLabel } from '../../utils'

export function EventsPage() {
  const { user, userProfile } = useAuth()
  const [events, setEvents] = useState<Event[]>([])
  const [eventTypes, setEventTypes] = useState<EventType[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingTypes, setLoadingTypes] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showAddTypeModal, setShowAddTypeModal] = useState(false)
  const [newTypeName, setNewTypeName] = useState('')
  const [newTypeIcon, setNewTypeIcon] = useState('📅')
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
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
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState<EventStatus | 'all'>('all')
  // Date change confirmation state
  const [showDateChangeConfirm, setShowDateChangeConfirm] = useState(false)
  const [dateChangeInfo, setDateChangeInfo] = useState<{
    oldDate: string
    newDate: string
    daysDiff: number
    schedulesCount: number
  } | null>(null)
  const [pendingEventData, setPendingEventData] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    if (user) {
      fetchEvents()
      fetchEventTypes()
    }
  }, [user?.id])

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
            supabase
              .from('events')
              .update({ status: 'completed' })
              .eq('id', event.id)
          )
        )
        // Update local data to reflect the change
        for (const pe of pastEvents) {
          const found = data?.find(e => e.id === pe.id)
          if (found) found.status = 'completed'
        }
      }

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
    setLoadingTypes(true)
    try {
      const { data, error } = await supabase
        .from('event_types')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')

      if (error) throw error
      console.log('Event types loaded:', data)
      setEventTypes(data || [])
    } catch (error) {
      console.error('Error fetching event types:', error)
    } finally {
      setLoadingTypes(false)
    }
  }

  async function handleAddEventType() {
    if (!newTypeName.trim()) return

    try {
      const { data, error } = await supabase
        .from('event_types')
        .insert({
          name: newTypeName,
          icon: newTypeIcon,
          is_active: true,
          is_system: false,
          sort_order: eventTypes.length
        })
        .select()
        .single()

      if (error) throw error

      setEventTypes([...eventTypes, data])
      setFormData({ ...formData, event_type_id: data.id })
      setShowAddTypeModal(false)
      setNewTypeName('')
      setNewTypeIcon('📅')
    } catch (error) {
      console.error('Error adding event type:', error)
      alert('שגיאה בהוספת סוג אירוע')
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

    const eventData: Record<string, unknown> = {
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
      // Only set organization_id and created_by for new events
      ...(!editingEvent && {
        organization_id: userProfile?.organization_id || null,
        created_by: user?.id || null
      })
    }

    // Check if editing and date changed
    if (editingEvent) {
      const oldDate = editingEvent.start_date?.split('T')[0]
      const newDate = formData.start_date?.split('T')[0]

      if (oldDate && newDate && oldDate !== newDate) {
        // Date changed - check for schedules
        const { data: schedules, error: schedError } = await supabase
          .from('schedules')
          .select('id')
          .eq('event_id', editingEvent.id)

        if (!schedError && schedules && schedules.length > 0) {
          // Calculate days difference
          const oldDateObj = new Date(oldDate)
          const newDateObj = new Date(newDate)
          const daysDiff = Math.round((newDateObj.getTime() - oldDateObj.getTime()) / (1000 * 60 * 60 * 24))

          // Show confirmation dialog
          setDateChangeInfo({
            oldDate,
            newDate,
            daysDiff,
            schedulesCount: schedules.length
          })
          setPendingEventData(eventData)
          setShowDateChangeConfirm(true)
          return // Wait for user confirmation
        }
      }
    }

    // No date change or no schedules - proceed normally
    await saveEventWithOptionalScheduleUpdate(eventData, false)
  }

  async function saveEventWithOptionalScheduleUpdate(
    eventData: Record<string, unknown>,
    updateSchedules: boolean
  ) {
    setSaving(true)
    try {
      if (editingEvent) {
        // Update event
        const { error } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', editingEvent.id)

        if (error) throw error

        // Update schedules if requested
        if (updateSchedules && dateChangeInfo) {
          const daysDiffMs = dateChangeInfo.daysDiff * 24 * 60 * 60 * 1000

          // Fetch all schedules for this event
          const { data: schedules, error: schedError } = await supabase
            .from('schedules')
            .select('id, start_time, end_time')
            .eq('event_id', editingEvent.id)

          if (schedError) throw schedError

          // Update each schedule
          for (const schedule of schedules || []) {
            const newStartTime = new Date(new Date(schedule.start_time).getTime() + daysDiffMs).toISOString()
            const newEndTime = new Date(new Date(schedule.end_time).getTime() + daysDiffMs).toISOString()

            const { error: updateError } = await supabase
              .from('schedules')
              .update({
                start_time: newStartTime,
                end_time: newEndTime
              })
              .eq('id', schedule.id)

            if (updateError) {
              console.error('Error updating schedule:', updateError)
            }
          }
        }
      } else {
        // Create new event
        const { error } = await supabase
          .from('events')
          .insert(eventData)

        if (error) throw error
      }

      setShowModal(false)
      setShowDateChangeConfirm(false)
      setDateChangeInfo(null)
      setPendingEventData(null)
      fetchEvents()
    } catch (error) {
      console.error('Error saving event:', error)
      alert('שגיאה בשמירת האירוע')
    } finally {
      setSaving(false)
    }
  }

  function handleDateChangeConfirm(updateSchedules: boolean) {
    if (pendingEventData) {
      saveEventWithOptionalScheduleUpdate(pendingEventData, updateSchedules)
    }
  }

  function handleDateChangeCancel() {
    setShowDateChangeConfirm(false)
    setDateChangeInfo(null)
    setPendingEventData(null)
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

  const filteredEvents = filter === 'all'
    ? events
    : events.filter(e => e.status === filter)

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold" data-testid="events-title">אירועים</h1>
        <button
          className="btn-primary flex items-center gap-2"
          data-testid="create-event-btn"
          onClick={openCreateModal}
        >
          <Plus size={20} />
          אירוע חדש
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap" data-testid="event-filters">
        {(['all', 'draft', 'planning', 'active', 'completed', 'cancelled'] as const).map(status => (
          <button
            key={status}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === status
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => setFilter(status)}
          >
            {status === 'all' ? 'הכל' : getStatusLabel(status)}
          </button>
        ))}
      </div>

      {/* Events List */}
      <div className="space-y-4" data-testid="events-list">
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="animate-spin mx-auto mb-4" size={32} />
            <p className="text-gray-500">טוען אירועים...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="card text-center py-12">
            <Calendar className="mx-auto mb-4 text-gray-400" size={48} />
            <p className="text-gray-500 text-lg">אין אירועים עדיין</p>
            <p className="text-gray-400 text-sm mt-2">לחץ על "אירוע חדש" ליצירת האירוע הראשון</p>
          </div>
        ) : (
          filteredEvents.map(event => (
            <Link
              to={`/events/${event.id}`}
              key={event.id}
              className="card hover:shadow-lg transition-shadow block cursor-pointer"
              data-testid="event-card"
              data-event-id={event.id}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-xl font-bold">{event.name}</h2>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}>
                      {getStatusLabel(event.status)}
                    </span>
                    {event.event_types && (
                      <span className="px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
                        {event.event_types.icon} {event.event_types.name}
                      </span>
                    )}
                  </div>

                  {event.description && (
                    <p className="text-gray-600 mb-3">{event.description}</p>
                  )}

                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock size={16} />
                      {formatDate(event.start_date)}
                    </div>
                    {event.venue_name && (
                      <div className="flex items-center gap-1">
                        <MapPin size={16} />
                        {event.venue_name}{event.venue_city && `, ${event.venue_city}`}
                      </div>
                    )}
                    {event.budget && (
                      <div>
                        💰 {formatCurrency(event.budget, event.currency)}
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex gap-6 mt-4 pt-4 border-t">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-primary-600">{event.participants_count}</p>
                      <p className="text-xs text-gray-500">אורחים</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{event.checklist_progress}%</p>
                      <p className="text-xs text-gray-500">צ'קליסט</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">{event.vendors_count}</p>
                      <p className="text-xs text-gray-500">ספקים</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); openEditModal(event); }}
                    title="עריכה"
                  >
                    <Edit2 size={20} className="text-gray-600" />
                  </button>
                  <button
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(event); }}
                    title="מחיקה"
                  >
                    <Trash2 size={20} className="text-red-600" />
                  </button>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-modal w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-2xl font-bold">
                {editingEvent ? 'עריכת אירוע' : 'אירוע חדש'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Event Type - Visual Cards */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium">סוג אירוע</label>
                  {!loadingTypes && (
                    <button
                      type="button"
                      onClick={() => fetchEventTypes()}
                      className="text-xs text-primary-600 hover:underline flex items-center gap-1"
                    >
                      <RefreshCw size={12} />
                      רענן
                    </button>
                  )}
                </div>

                {loadingTypes ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="animate-spin text-primary-600" size={24} />
                    <span className="mr-2 text-gray-500">טוען סוגי אירועים...</span>
                  </div>
                ) : eventTypes.length === 0 ? (
                  <div className="text-center py-4 bg-gray-50 rounded-lg">
                    <p className="text-gray-500 mb-2">לא נמצאו סוגי אירועים</p>
                    <button
                      type="button"
                      onClick={() => setShowAddTypeModal(true)}
                      className="text-primary-600 hover:underline text-sm"
                    >
                      + הוסף סוג אירוע חדש
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {eventTypes.map(type => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, event_type_id: type.id })}
                        className={`p-3 rounded-xl border-2 text-center transition-all hover:scale-105 ${
                          formData.event_type_id === type.id
                            ? 'border-primary-500 bg-primary-50 shadow-md'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <span className="text-2xl block mb-1">{type.icon}</span>
                        <span className="text-xs font-medium text-gray-700">{type.name}</span>
                      </button>
                    ))}
                    {/* Add new type button */}
                    <button
                      type="button"
                      onClick={() => setShowAddTypeModal(true)}
                      className="p-3 rounded-xl border-2 border-dashed border-gray-300 text-center transition-all hover:border-primary-400 hover:bg-primary-50"
                    >
                      <PlusCircle className="mx-auto text-gray-400 mb-1" size={24} />
                      <span className="text-xs font-medium text-gray-500">הוסף סוג</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium mb-2">שם האירוע *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="לדוגמה: החתונה של דנה ויוסי"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  data-testid="event-name-input"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-2">תיאור</label>
                <textarea
                  className="input min-h-[80px]"
                  placeholder="תיאור קצר של האירוע"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  data-testid="event-description-input"
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">תאריך ושעה *</label>
                  <input
                    type="datetime-local"
                    className="input"
                    value={formData.start_date}
                    onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                    data-testid="event-start-date"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">סיום (אופציונלי)</label>
                  <input
                    type="datetime-local"
                    className="input"
                    value={formData.end_date}
                    onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                    data-testid="event-end-date"
                  />
                </div>
              </div>

              {/* Venue */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">מקום האירוע</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="שם האולם / המקום"
                    value={formData.venue_name}
                    onChange={e => setFormData({ ...formData, venue_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">עיר</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="עיר"
                    value={formData.venue_city}
                    onChange={e => setFormData({ ...formData, venue_city: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">כתובת</label>
                <input
                  type="text"
                  className="input"
                  placeholder="כתובת מלאה"
                  value={formData.venue_address}
                  onChange={e => setFormData({ ...formData, venue_address: e.target.value })}
                />
              </div>

              {/* Capacity & Budget */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">מספר אורחים מקסימלי</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="200"
                    value={formData.max_participants}
                    onChange={e => setFormData({ ...formData, max_participants: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">תקציב (₪)</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="100000"
                    value={formData.budget}
                    onChange={e => setFormData({ ...formData, budget: e.target.value })}
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium mb-2">סטטוס</label>
                <select
                  className="input"
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value as EventStatus })}
                >
                  <option value="draft">טיוטה</option>
                  <option value="planning">בתכנון</option>
                  <option value="active">פעיל</option>
                  <option value="completed">הסתיים</option>
                  <option value="cancelled">בוטל</option>
                </select>
              </div>
            </div>

            <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
              <button
                className="px-6 py-2 border rounded-lg hover:bg-gray-50"
                onClick={() => setShowModal(false)}
              >
                ביטול
              </button>
              <button
                className="btn-primary flex items-center gap-2"
                onClick={handleSave}
                disabled={saving}
                data-testid="save-event-button"
              >
                {saving && <Loader2 className="animate-spin" size={20} />}
                {editingEvent ? 'שמור שינויים' : 'צור אירוע'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Event Type Modal */}
      {showAddTypeModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold">הוסף סוג אירוע חדש</h3>
              <button onClick={() => setShowAddTypeModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Icon Selector */}
              <div>
                <label className="block text-sm font-medium mb-2">אייקון</label>
                <div className="flex flex-wrap gap-2">
                  {['📅', '🎉', '🎊', '🎂', '💒', '🎤', '🏢', '🎓', '🎭', '🎪', '⚽', '🎸', '🍽️', '✈️', '🏕️', '🎯'].map(icon => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setNewTypeIcon(icon)}
                      className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${
                        newTypeIcon === icon
                          ? 'bg-primary-100 border-2 border-primary-500 scale-110'
                          : 'bg-gray-100 hover:bg-gray-200 border-2 border-transparent'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name Input */}
              <div>
                <label className="block text-sm font-medium mb-2">שם סוג האירוע</label>
                <input
                  type="text"
                  className="input"
                  placeholder="לדוגמה: מסיבת רווקים"
                  value={newTypeName}
                  onChange={e => setNewTypeName(e.target.value)}
                  autoFocus
                />
              </div>

              {/* Preview */}
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-xs text-gray-500 mb-2">תצוגה מקדימה:</p>
                <span className="text-3xl">{newTypeIcon}</span>
                <p className="font-medium mt-1">{newTypeName || 'שם האירוע'}</p>
              </div>
            </div>

            <div className="p-6 border-t flex justify-end gap-3">
              <button
                className="px-6 py-2 border rounded-lg hover:bg-gray-50"
                onClick={() => setShowAddTypeModal(false)}
              >
                ביטול
              </button>
              <button
                className="btn-primary"
                onClick={handleAddEventType}
                disabled={!newTypeName.trim()}
              >
                הוסף סוג אירוע
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Date Change Confirmation Modal */}
      {showDateChangeConfirm && dateChangeInfo && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="p-6 border-b flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="text-amber-600" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">שינוי תאריך האירוע</h3>
                <p className="text-sm text-gray-500">נמצאו פריטים בלו"ז שצריכים עדכון</p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm text-gray-600">תאריך ישן:</span>
                  <span className="font-semibold text-gray-900">{formatDate(dateChangeInfo.oldDate)}</span>
                </div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm text-gray-600">תאריך חדש:</span>
                  <span className="font-semibold text-primary-600">{formatDate(dateChangeInfo.newDate)}</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-amber-200">
                  <span className="text-sm text-gray-600">הפרש:</span>
                  <span className="font-semibold text-gray-900">
                    {dateChangeInfo.daysDiff > 0 ? '+' : ''}{dateChangeInfo.daysDiff} ימים
                  </span>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <Calendar className="text-blue-500" size={20} />
                  <div>
                    <p className="font-medium text-blue-900">
                      נמצאו {dateChangeInfo.schedulesCount} פריטים בלו"ז
                    </p>
                    <p className="text-sm text-blue-700">
                      האם להזיז את כל הפריטים ב-{Math.abs(dateChangeInfo.daysDiff)} ימים {dateChangeInfo.daysDiff > 0 ? 'קדימה' : 'אחורה'}?
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-500 text-center">
                ⚠️ שים לב: פעולה זו תעדכן את מועדי כל הפעילויות בלו"ז
              </p>
            </div>

            <div className="p-6 border-t bg-gray-50 rounded-b-2xl flex flex-col gap-3">
              <button
                className="w-full py-3 px-4 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors flex items-center justify-center gap-2"
                onClick={() => handleDateChangeConfirm(true)}
                disabled={saving}
              >
                {saving && <Loader2 className="animate-spin" size={20} />}
                ✅ כן, עדכן את הלו"ז בהתאם
              </button>
              <button
                className="w-full py-3 px-4 bg-white border border-gray-300 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                onClick={() => handleDateChangeConfirm(false)}
                disabled={saving}
              >
                ❌ לא, שמור רק את תאריך האירוע
              </button>
              <button
                className="w-full py-2 text-gray-500 hover:text-gray-700 text-sm"
                onClick={handleDateChangeCancel}
                disabled={saving}
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EventsPage

