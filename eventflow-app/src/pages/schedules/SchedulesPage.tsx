import { useState, useEffect, useRef, Fragment } from 'react'
import { Plus, Edit2, Trash2, Clock, MapPin, User, Coffee, Play, Calendar, X, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Schedule, ScheduleFormData } from '../../types'

const trackColors = [
  { value: '#3B82F6', label: 'כחול' },
  { value: '#10B981', label: 'ירוק' },
  { value: '#F59E0B', label: 'כתום' },
  { value: '#EF4444', label: 'אדום' },
  { value: '#8B5CF6', label: 'סגול' },
  { value: '#EC4899', label: 'ורוד' },
  { value: '#6B7280', label: 'אפור' },
]

export function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [events, setEvents] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<string>('all')
  const nowLineRef = useRef<HTMLDivElement>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [formData, setFormData] = useState<ScheduleFormData>({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    location: '',
    room: '',
    max_capacity: '',
    is_mandatory: false,
    is_break: false,
    track: '',
    track_color: '#3B82F6',
    speaker_name: '',
    speaker_title: '',
    send_reminder: true,
    reminder_minutes_before: '15'
  })

  useEffect(() => {
    loadData()
  }, [])

  // Update the now line every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  // Auto-scroll to now line after data loads
  useEffect(() => {
    if (!loading && nowLineRef.current) {
      setTimeout(() => {
        nowLineRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 300)
    }
  }, [loading])

  async function loadData() {
    setLoading(true)

    // Load events
    const { data: eventsData } = await supabase
      .from('events')
      .select('id, name')
      .order('start_date', { ascending: false })

    if (eventsData) setEvents(eventsData)

    // Load schedules
    const { data: schedulesData, error } = await supabase
      .from('schedules')
      .select('*, events(name)')
      .order('start_time', { ascending: true })

    if (error) {
      console.error('Error loading schedules:', error)
    } else {
      setSchedules(schedulesData || [])
    }

    setLoading(false)
  }

  const filteredSchedules = schedules.filter(schedule => {
    return selectedEvent === 'all' || schedule.event_id === selectedEvent
  })

  // Group schedules by date
  const groupedSchedules = filteredSchedules.reduce((groups, schedule) => {
    const date = new Date(schedule.start_time).toLocaleDateString('he-IL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    if (!groups[date]) groups[date] = []
    groups[date].push(schedule)
    return groups
  }, {} as Record<string, Schedule[]>)

  // Today's date string for now-line comparison
  const todayDateStr = currentTime.toLocaleDateString('he-IL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  // Find where to insert the now line within a day's sorted schedules
  function getNowLinePosition(daySchedules: Schedule[]): number {
    for (let i = 0; i < daySchedules.length; i++) {
      if (currentTime < new Date(daySchedules[i].start_time)) {
        return i
      }
    }
    return daySchedules.length
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!selectedEvent || selectedEvent === 'all') {
      alert('נא לבחור אירוע')
      return
    }

    const scheduleData = {
      event_id: selectedEvent,
      title: formData.title,
      description: formData.description || null,
      start_time: formData.start_time,
      end_time: formData.end_time,
      location: formData.location || null,
      room: formData.room || null,
      max_capacity: formData.max_capacity ? parseInt(formData.max_capacity) : null,
      is_mandatory: formData.is_mandatory,
      is_break: formData.is_break,
      track: formData.track || null,
      track_color: formData.track_color || null,
      speaker_name: formData.speaker_name || null,
      speaker_title: formData.speaker_title || null,
      send_reminder: formData.send_reminder,
      reminder_minutes_before: parseInt(formData.reminder_minutes_before) || 15
    }

    if (editingSchedule) {
      const { error } = await supabase
        .from('schedules')
        .update(scheduleData)
        .eq('id', editingSchedule.id)

      if (error) {
        alert('שגיאה בעדכון הפריט')
        return
      }
    } else {
      const { error } = await supabase
        .from('schedules')
        .insert(scheduleData)

      if (error) {
        alert('שגיאה ביצירת הפריט')
        return
      }
    }

    closeModal()
    loadData()
  }

  async function handleDelete(id: string) {
    if (!confirm('האם למחוק את הפריט?')) return

    const { error } = await supabase
      .from('schedules')
      .delete()
      .eq('id', id)

    if (!error) loadData()
  }

  function openEditModal(schedule: Schedule) {
    setEditingSchedule(schedule)
    setSelectedEvent(schedule.event_id)
    setFormData({
      title: schedule.title,
      description: schedule.description || '',
      start_time: schedule.start_time.slice(0, 16),
      end_time: schedule.end_time.slice(0, 16),
      location: schedule.location || '',
      room: schedule.room || '',
      max_capacity: schedule.max_participants?.toString() || '',
      is_mandatory: schedule.is_mandatory,
      is_break: schedule.is_break,
      track: schedule.track || '',
      track_color: schedule.track_color || '#3B82F6',
      speaker_name: schedule.speaker_name || '',
      speaker_title: schedule.speaker_title || '',
      send_reminder: schedule.send_reminder,
      reminder_minutes_before: schedule.reminder_minutes_before.toString()
    })
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingSchedule(null)
    setFormData({
      title: '',
      description: '',
      start_time: '',
      end_time: '',
      location: '',
      room: '',
      max_capacity: '',
      is_mandatory: false,
      is_break: false,
      track: '',
      track_color: '#3B82F6',
      speaker_name: '',
      speaker_title: '',
      send_reminder: true,
      reminder_minutes_before: '15'
    })
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  function getDuration(start: string, end: string) {
    const diff = new Date(end).getTime() - new Date(start).getTime()
    const minutes = Math.round(diff / 60000)
    if (minutes < 60) return `${minutes} דקות`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}:${remainingMinutes.toString().padStart(2, '0')} שעות` : `${hours} שעות`
  }

  // Stats
  const stats = {
    total: filteredSchedules.length,
    sessions: filteredSchedules.filter(s => !s.is_break).length,
    breaks: filteredSchedules.filter(s => s.is_break).length,
    mandatory: filteredSchedules.filter(s => s.is_mandatory).length
  }

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold" data-testid="schedules-title">לוח זמנים</h1>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary"
          data-testid="add-schedule-btn"
        >
          <Plus className="w-4 h-4 ml-2" />
          פריט חדש
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card">
          <p className="text-gray-500 text-sm">סה"כ פריטים</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="card">
          <p className="text-gray-500 text-sm">מפגשים</p>
          <p className="text-2xl font-bold text-blue-600">{stats.sessions}</p>
        </div>
        <div className="card">
          <p className="text-gray-500 text-sm">הפסקות</p>
          <p className="text-2xl font-bold text-orange-600">{stats.breaks}</p>
        </div>
        <div className="card">
          <p className="text-gray-500 text-sm">חובה</p>
          <p className="text-2xl font-bold text-purple-600">{stats.mandatory}</p>
        </div>
      </div>

      {/* Event Filter */}
      <div className="mb-6">
        <select
          value={selectedEvent}
          onChange={(e) => setSelectedEvent(e.target.value)}
          className="input min-w-[250px]"
        >
          <option value="all">כל האירועים</option>
          {events.map(event => (
            <option key={event.id} value={event.id}>{event.name}</option>
          ))}
        </select>
      </div>

      {/* Timeline */}
      <div className="card" data-testid="schedules-list">
        {Object.keys(groupedSchedules).length === 0 ? (
          <p className="text-gray-500 text-center py-8">אין פריטים בלוח הזמנים</p>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedSchedules).map(([date, daySchedules]) => {
              const isToday = date === todayDateStr
              const nowPosition = isToday ? getNowLinePosition(daySchedules) : -1

              return (
              <div key={date}>
                {/* Date Header */}
                <div className="flex items-center gap-3 mb-4">
                  <Calendar className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold text-gray-700">{date}</h2>
                  {isToday && (
                    <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-medium">היום</span>
                  )}
                </div>

                {/* Timeline Items */}
                <div className="relative pr-8 border-r-2 border-gray-200 space-y-4">
                  {daySchedules.map((schedule, index) => (
                    <Fragment key={schedule.id}>
                      {/* Now Line - before this item */}
                      {nowPosition === index && (
                        <div ref={nowLineRef} className="relative flex items-center py-1">
                          <div
                            className="absolute -right-[25px] top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-red-500 z-10"
                            style={{ boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.2)' }}
                          />
                          <div className="w-full flex items-center gap-3 pr-8">
                            <span className="text-[11px] font-bold text-red-500 shrink-0">
                              {currentTime.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <div className="flex-1 h-[2px] bg-red-500" />
                          </div>
                        </div>
                      )}

                      <div
                        className={`relative pr-8 ${
                          schedule.is_break ? 'opacity-75' : ''
                        }`}
                      >
                        {/* Timeline Dot */}
                        <div
                          className={`absolute -right-[25px] w-4 h-4 rounded-full border-2 border-white ${
                            schedule.is_break ? 'bg-orange-400' : schedule.track_color ? '' : 'bg-blue-500'
                          }`}
                          style={schedule.track_color && !schedule.is_break ? { backgroundColor: schedule.track_color } : {}}
                        />

                        {/* Content Card */}
                        <div className={`p-4 rounded-lg border ${
                          schedule.is_break
                            ? 'bg-orange-50 border-orange-200'
                            : 'bg-white border-gray-200 hover:shadow-md'
                        } transition-shadow`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              {/* Time & Duration */}
                              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                                <Clock className="w-4 h-4" />
                                <span>{formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}</span>
                                <span className="text-gray-400">({getDuration(schedule.start_time, schedule.end_time)})</span>
                              </div>

                              {/* Title */}
                              <div className="flex items-center gap-2">
                                {schedule.is_break ? (
                                  <Coffee className="w-4 h-4 text-orange-500" />
                                ) : (
                                  <Play className="w-4 h-4 text-blue-500" />
                                )}
                                <h3 className="font-semibold text-lg">{schedule.title}</h3>
                                {schedule.is_mandatory && (
                                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">חובה</span>
                                )}
                                {schedule.track && (
                                  <span
                                    className="text-xs px-2 py-0.5 rounded text-white"
                                    style={{ backgroundColor: schedule.track_color || '#6B7280' }}
                                  >
                                    {schedule.track}
                                  </span>
                                )}
                              </div>

                              {/* Description */}
                              {schedule.description && (
                                <p className="text-gray-600 text-sm mt-1">{schedule.description}</p>
                              )}

                              {/* Location & Room */}
                              {(schedule.location || schedule.room) && (
                                <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
                                  <MapPin className="w-4 h-4" />
                                  <span>{[schedule.location, schedule.room].filter(Boolean).join(' - ')}</span>
                                </div>
                              )}

                              {/* Speaker */}
                              {schedule.speaker_name && (
                                <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                                  <User className="w-4 h-4" />
                                  <span>{schedule.speaker_name}</span>
                                  {schedule.speaker_title && (
                                    <span className="text-gray-400">| {schedule.speaker_title}</span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-1">
                              <button
                                onClick={() => openEditModal(schedule)}
                                className="p-2 hover:bg-gray-100 rounded text-gray-500"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(schedule.id)}
                                className="p-2 hover:bg-red-50 rounded text-red-500"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Fragment>
                  ))}

                  {/* Now Line - after all items */}
                  {nowPosition === daySchedules.length && (
                    <div ref={nowLineRef} className="relative flex items-center py-1">
                      <div
                        className="absolute -right-[25px] top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-red-500 z-10"
                        style={{ boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.2)' }}
                      />
                      <div className="w-full flex items-center gap-3 pr-8">
                        <span className="text-[11px] font-bold text-red-500 shrink-0">
                          {currentTime.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <div className="flex-1 h-[2px] bg-red-500" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-modal p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {editingSchedule ? 'עריכת פריט' : 'פריט חדש בלו"ז'}
              </h2>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">אירוע *</label>
                <select
                  value={selectedEvent}
                  onChange={(e) => setSelectedEvent(e.target.value)}
                  className="input w-full"
                  required
                >
                  <option value="">בחר אירוע</option>
                  {events.map(event => (
                    <option key={event.id} value={event.id}>{event.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">כותרת *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="input w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">תיאור</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input w-full"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">שעת התחלה *</label>
                  <input
                    type="datetime-local"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="input w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">שעת סיום *</label>
                  <input
                    type="datetime-local"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="input w-full"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">מיקום</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="input w-full"
                    placeholder="אולם ראשי"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">חדר</label>
                  <input
                    type="text"
                    value={formData.room}
                    onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                    className="input w-full"
                    placeholder="חדר 1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">מסלול (Track)</label>
                  <input
                    type="text"
                    value={formData.track}
                    onChange={(e) => setFormData({ ...formData, track: e.target.value })}
                    className="input w-full"
                    placeholder="מסלול טכני"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">צבע מסלול</label>
                  <div className="flex gap-2">
                    {trackColors.map(color => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, track_color: color.value })}
                        className={`w-8 h-8 rounded-full border-2 ${
                          formData.track_color === color.value ? 'border-gray-800' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.label}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">שם מרצה</label>
                  <input
                    type="text"
                    value={formData.speaker_name}
                    onChange={(e) => setFormData({ ...formData, speaker_name: e.target.value })}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">תפקיד מרצה</label>
                  <input
                    type="text"
                    value={formData.speaker_title}
                    onChange={(e) => setFormData({ ...formData, speaker_title: e.target.value })}
                    className="input w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">קיבולת מקסימלית</label>
                  <input
                    type="number"
                    value={formData.max_capacity}
                    onChange={(e) => setFormData({ ...formData, max_capacity: e.target.value })}
                    className="input w-full"
                    placeholder="ללא הגבלה"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">תזכורת (דקות לפני)</label>
                  <input
                    type="number"
                    value={formData.reminder_minutes_before}
                    onChange={(e) => setFormData({ ...formData, reminder_minutes_before: e.target.value })}
                    className="input w-full"
                  />
                </div>
              </div>

              <div className="flex gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_mandatory}
                    onChange={(e) => setFormData({ ...formData, is_mandatory: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">מפגש חובה</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_break}
                    onChange={(e) => setFormData({ ...formData, is_break: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">הפסקה</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.send_reminder}
                    onChange={(e) => setFormData({ ...formData, send_reminder: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">שליחת תזכורת</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1">
                  {editingSchedule ? 'עדכון' : 'יצירה'}
                </button>
                <button type="button" onClick={closeModal} className="btn-secondary">
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
