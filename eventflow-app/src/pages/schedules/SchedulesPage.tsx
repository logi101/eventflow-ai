import { useState, useEffect, useRef, Fragment } from 'react'
import { Plus, Edit2, Trash2, Clock, MapPin, User, Coffee, Play, Calendar, X, Loader2, AlertTriangle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useEvent } from '../../contexts/EventContext'
import { useGracePeriod } from '../../contexts/GracePeriodContext'
import { computeScheduleMessageSync, executeScheduleMessageSync } from '../../utils/scheduleMessageSync'
import type { MessageSyncPlan } from '../../utils/scheduleMessageSync'

interface Schedule {
  id: string
  event_id: string
  title: string
  description: string | null
  start_time: string
  end_time: string
  location: string | null
  room: string | null
  max_capacity: number | null
  current_count: number
  is_mandatory: boolean
  is_break: boolean
  track: string | null
  track_color: string | null
  speaker_name: string | null
  speaker_title: string | null
  speaker_bio: string | null
  speaker_image: string | null
  materials_url: string | null
  send_reminder: boolean
  reminder_minutes_before: number
  sort_order: number
  created_at: string
  events?: { name: string }
}

interface ScheduleFormData {
  title: string
  description: string
  start_time: string
  end_time: string
  location: string
  room: string
  max_capacity: string
  is_mandatory: boolean
  is_break: boolean
  track: string
  track_color: string
  speaker_name: string
  speaker_title: string
  send_reminder: boolean
  reminder_minutes_before: string
}

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
  const { selectedEvent: contextEvent } = useEvent()
  const { queueChange, requestConfirmation, dismissConfirmation } = useGracePeriod()
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [events, setEvents] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<string>(contextEvent?.id || '')
  const nowLineRef = useRef<HTMLDivElement>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false)
  const [deleteAllLoading, setDeleteAllLoading] = useState(false)
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

  // Sync with EventContext when selected event changes
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      if (contextEvent && selectedEvent !== contextEvent.id) {
        setSelectedEvent(contextEvent.id)
      }
    })
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextEvent])

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

    // Load schedules - only for selected event
    if (!selectedEvent) {
      setSchedules([])
      setLoading(false)
      return
    }

    const { data: schedulesData, error } = await supabase
      .from('schedules')
      .select('*, events(name)')
      .eq('event_id', selectedEvent)
      .order('start_time', { ascending: true })

    if (error) {
      console.error('Error loading schedules:', error)
    } else {
      setSchedules(schedulesData || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      loadData()
    })
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEvent])

  // Group schedules by date
  const groupedSchedules = schedules.reduce((groups, schedule) => {
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

    if (!selectedEvent) {
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

    const isUpdate = !!editingSchedule
    const changeType = isUpdate ? 'update' as const : 'create' as const

    // Compute message impact before saving
    let syncPlan: MessageSyncPlan | null = null
    try {
      syncPlan = await computeScheduleMessageSync(
        selectedEvent,
        changeType,
        {
          id: editingSchedule?.id,
          title: formData.title,
          start_time: formData.start_time,
          end_time: formData.end_time,
          location: formData.location || null,
          room: formData.room || null,
          send_reminder: formData.send_reminder,
          reminder_minutes_before: parseInt(formData.reminder_minutes_before) || 15
        }
      )
    } catch (err) {
      console.error('Failed to compute message sync:', err)
    }

    const hasMessageImpact = syncPlan && (
      syncPlan.impact.messagesToCreate > 0 ||
      syncPlan.impact.messagesToUpdate > 0 ||
      syncPlan.impact.messagesToDelete > 0
    )

    // Function that saves the schedule and queues message sync
    const saveAndQueueSync = async () => {
      dismissConfirmation()

      let savedScheduleId: string | null = null

      if (isUpdate && editingSchedule) {
        const { error } = await supabase
          .from('schedules')
          .update(scheduleData)
          .eq('id', editingSchedule.id)

        if (error) {
          alert('שגיאה בעדכון הפריט')
          return
        }
        savedScheduleId = editingSchedule.id
      } else {
        const { data, error } = await supabase
          .from('schedules')
          .insert(scheduleData)
          .select('id')
          .single()

        if (error || !data) {
          alert('שגיאה ביצירת הפריט')
          return
        }
        savedScheduleId = data.id

        // Patch the sync plan with the actual schedule_id
        if (syncPlan) {
          for (const msg of syncPlan.messagesToCreate) {
            msg.schedule_id = savedScheduleId
          }
        }
      }

      // Save previous values for rollback (update case)
      const previousValues = isUpdate && editingSchedule ? { ...editingSchedule } : null

      closeModal()
      loadData()

      // Queue message sync with 60s grace period
      if (syncPlan && hasMessageImpact && savedScheduleId) {
        const plan = syncPlan
        const scheduleId = savedScheduleId
        queueChange({
          type: isUpdate ? 'schedule_update' : 'schedule_create',
          eventId: selectedEvent,
          description: isUpdate
            ? `עדכון הודעות עבור "${formData.title}"`
            : `יצירת הודעות עבור "${formData.title}"`,
          payload: { scheduleTitle: formData.title },
          messageImpact: plan.impact,
          executeFn: async () => {
            await executeScheduleMessageSync(plan)
            // Mark change log as processed by frontend
            await supabase.from('schedule_change_log')
              .update({ processed: true, processed_at: new Date().toISOString(), processed_by: 'frontend' })
              .eq('schedule_id', scheduleId)
              .eq('processed', false)
          },
          rollbackFn: async () => {
            if (isUpdate && previousValues) {
              // Restore old values
              const { id, events: _unusedEvents, created_at: _unusedCreatedAt, ...restoreData } = previousValues as Schedule & { events?: unknown; created_at?: unknown }
              void _unusedEvents
              void _unusedCreatedAt
              await supabase.from('schedules').update(restoreData).eq('id', id)
            } else {
              // Delete the newly created schedule
              await supabase.from('schedules').delete().eq('id', scheduleId)
            }
            // Mark all log entries as cancelled
            await supabase.from('schedule_change_log')
              .update({ processed: true, processed_at: new Date().toISOString(), processed_by: 'cancelled' })
              .eq('schedule_id', scheduleId)
              .eq('processed', false)
            loadData()
          }
        })
      }
    }

    // If there's message impact, show confirmation first
    if (hasMessageImpact && syncPlan) {
      const changes = []
      const deletions = []

      if (syncPlan.impact.messagesToCreate > 0) {
        changes.push({ label: 'הודעות שייווצרו', count: syncPlan.impact.messagesToCreate })
      }
      if (syncPlan.impact.messagesToUpdate > 0) {
        changes.push({ label: 'הודעות שיעודכנו', count: syncPlan.impact.messagesToUpdate })
      }
      if (syncPlan.impact.messagesToDelete > 0) {
        deletions.push({ label: 'הודעות שיימחקו', count: syncPlan.impact.messagesToDelete })
      }

      requestConfirmation(
        {
          title: isUpdate ? 'עדכון לוז - השפעה על הודעות' : 'לוז חדש - יצירת הודעות',
          description: `שינוי זה ישפיע על ההודעות של ${syncPlan.impact.affectedParticipants} משתתפים`,
          changes,
          deletions,
          warningText: 'השינוי ייכנס לתוקף בעוד 60 שניות - ניתן לבטל במהלך הזמן הזה'
        },
        saveAndQueueSync,
        () => dismissConfirmation()
      )
    } else {
      // No message impact - save directly without grace period
      if (isUpdate && editingSchedule) {
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
          .select('id')
          .single()

        if (error) {
          alert('שגיאה ביצירת הפריט')
          return
        }
      }

      closeModal()
      loadData()
    }
  }

  async function handleDelete(id: string) {
    const schedule = schedules.find(s => s.id === id)
    if (!schedule) return

    // Compute message impact
    let syncPlan: MessageSyncPlan | null = null
    try {
      syncPlan = await computeScheduleMessageSync(selectedEvent, 'delete', {
        id: schedule.id,
        title: schedule.title,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        send_reminder: schedule.send_reminder,
        reminder_minutes_before: schedule.reminder_minutes_before
      })
    } catch (err) {
      console.error('Failed to compute message sync:', err)
    }

    const hasMessageImpact = syncPlan && syncPlan.impact.messagesToDelete > 0

    // Save full schedule data for rollback before deleting
    const deletedScheduleData = { ...schedule }

    const doDelete = async () => {
      dismissConfirmation()

      // Delete schedule from DB
      const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting schedule:', error)
        alert('שגיאה במחיקת הפריט')
        return
      }

      loadData()

      if (syncPlan && hasMessageImpact) {
        const plan = syncPlan
        // Queue message deletion with 60s grace + rollback
        queueChange({
          type: 'schedule_delete',
          eventId: selectedEvent,
          description: `מחיקת ${plan.impact.messagesToDelete} הודעות של "${schedule.title}"`,
          payload: { scheduleId: id, scheduleTitle: schedule.title },
          messageImpact: plan.impact,
          executeFn: async () => {
            await executeScheduleMessageSync(plan)
            await supabase.from('schedule_change_log')
              .update({ processed: true, processed_at: new Date().toISOString(), processed_by: 'frontend' })
              .eq('schedule_id', id)
              .eq('processed', false)
          },
          rollbackFn: async () => {
            // Re-insert the deleted schedule with its original data
            const { id: schedId, events: _unusedEvents2, ...restoreData } = deletedScheduleData as Schedule & { events?: unknown }
            void _unusedEvents2
            await supabase.from('schedules').insert({ ...restoreData, id: schedId })
            await supabase.from('schedule_change_log')
              .update({ processed: true, processed_at: new Date().toISOString(), processed_by: 'cancelled' })
              .eq('schedule_id', schedId)
              .eq('processed', false)
            loadData()
          }
        })
      }
    }

    if (hasMessageImpact && syncPlan) {
      requestConfirmation(
        {
          title: 'מחיקת פריט מהלוז',
          description: `מחיקת "${schedule.title}" תשפיע על ההודעות הקשורות`,
          changes: [],
          deletions: [{ label: 'הודעות שיימחקו', count: syncPlan.impact.messagesToDelete }],
          warningText: 'ההודעות יימחקו בעוד 60 שניות - ניתן לבטל'
        },
        doDelete,
        () => dismissConfirmation()
      )
    } else {
      if (!confirm('האם למחוק את הפריט?')) return
      doDelete()
    }
  }

  async function handleDeleteAll() {
    if (!selectedEvent || schedules.length === 0) return

    // Save all schedules for rollback
    const allSchedulesBackup = schedules.map(s => ({ ...s }))

    // Compute message impact
    let syncPlan: MessageSyncPlan | null = null
    try {
      syncPlan = await computeScheduleMessageSync(selectedEvent, 'delete_all')
    } catch (err) {
      console.error('Failed to compute message sync:', err)
    }

    setDeleteAllLoading(true)
    const { error } = await supabase
      .from('schedules')
      .delete()
      .eq('event_id', selectedEvent)

    if (error) {
      console.error('Error deleting all schedules:', error)
      alert('שגיאה במחיקת הפריטים')
    } else {
      loadData()

      // Queue message deletion with 60s grace + rollback
      if (syncPlan && syncPlan.impact.messagesToDelete > 0) {
        const plan = syncPlan
        const eventId = selectedEvent
        queueChange({
          type: 'schedule_delete_all',
          eventId: selectedEvent,
          description: `מחיקת ${plan.impact.messagesToDelete} הודעות של כל פריטי הלוז`,
          payload: { eventId: selectedEvent },
          messageImpact: plan.impact,
          executeFn: async () => {
            await executeScheduleMessageSync(plan)
            await supabase.from('schedule_change_log')
              .update({ processed: true, processed_at: new Date().toISOString(), processed_by: 'frontend' })
              .eq('event_id', eventId)
              .eq('processed', false)
          },
          rollbackFn: async () => {
            // Re-insert all deleted schedules
            const insertData = allSchedulesBackup.map((schedule) => {
              const { events: _unused, ...rest } = schedule
              void _unused
              return rest
            })
            await supabase.from('schedules').insert(insertData)
            await supabase.from('schedule_change_log')
              .update({ processed: true, processed_at: new Date().toISOString(), processed_by: 'cancelled' })
              .eq('event_id', eventId)
              .eq('processed', false)
            loadData()
          }
        })
      }
    }
    setDeleteAllLoading(false)
    setShowDeleteAllConfirm(false)
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
      max_capacity: schedule.max_capacity?.toString() || '',
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
    total: schedules.length,
    sessions: schedules.filter(s => !s.is_break).length,
    breaks: schedules.filter(s => s.is_break).length,
    mandatory: schedules.filter(s => s.is_mandatory).length
  }

  if (loading) {
    return (
      <div className="p-8 relative z-10 flex justify-center items-center" role="status" aria-busy="true" aria-live="polite">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-amber-400/30 blur-2xl rounded-full animate-pulse" />
            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Loader2 className="w-8 h-8 text-white animate-spin" aria-hidden="true" />
            </div>
          </div>
          <p className="text-zinc-400 font-medium">טוען לוח זמנים...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 relative z-10">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white" data-testid="schedules-title">לוח זמנים</h1>
            <p className="text-zinc-400 mt-1">{stats.total} פריטים | {stats.sessions} מפגשים | {stats.breaks} הפסקות</p>
          </div>
          <div className="flex gap-3">
            {schedules.length > 0 && (
              <button
                onClick={() => setShowDeleteAllConfirm(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-500/10 text-red-400 border border-red-500/30 rounded-xl font-medium hover:bg-red-500/20 hover:border-red-500/50 hover:-translate-y-0.5 transition-all duration-300"
              >
                <Trash2 className="w-5 h-5" />
                מחק הכל
              </button>
            )}
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 hover:-translate-y-0.5 transition-all duration-300"
              data-testid="add-schedule-btn"
            >
              <Plus className="w-5 h-5" />
              פריט חדש
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="group relative premium-stats-card orange hover:bg-[#1a1d27] hover:shadow-xl hover:-translate-y-1 transition-all duration-500 overflow-hidden">
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-gray-400 to-gray-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <p className="text-zinc-400 text-sm font-medium">סה"כ פריטים</p>
            <p className="text-3xl font-bold text-white mt-1">{stats.total}</p>
          </div>
          <div className="group relative premium-stats-card orange hover:bg-[#1a1d27] hover:shadow-xl hover:-translate-y-1 transition-all duration-500 overflow-hidden">
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-400 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <p className="text-zinc-400 text-sm font-medium">מפגשים</p>
            <p className="text-3xl font-bold text-blue-600 mt-1">{stats.sessions}</p>
          </div>
          <div className="group relative premium-stats-card orange hover:bg-[#1a1d27] hover:shadow-xl hover:-translate-y-1 transition-all duration-500 overflow-hidden">
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-orange-400 to-amber-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <p className="text-zinc-400 text-sm font-medium">הפסקות</p>
            <p className="text-3xl font-bold text-orange-400 mt-1">{stats.breaks}</p>
          </div>
          <div className="group relative premium-stats-card orange hover:bg-[#1a1d27] hover:shadow-xl hover:-translate-y-1 transition-all duration-500 overflow-hidden">
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-purple-400 to-violet-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <p className="text-zinc-400 text-sm font-medium">חובה</p>
            <p className="text-3xl font-bold text-purple-600 mt-1">{stats.mandatory}</p>
          </div>
        </div>

        {/* Event Filter */}
        <div className="bg-[#1a1d27]/60 backdrop-blur-sm rounded-2xl p-4 border border-white/10 mb-6">
          <select
            value={selectedEvent}
            onChange={(e) => setSelectedEvent(e.target.value)}
            className="px-4 py-2.5 bg-[#1a1d27] rounded-xl border border-white/10 text-zinc-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all min-w-[250px]"
            aria-label="בחר אירוע לסינון לוח זמנים"
          >
            <option value="">בחר אירוע</option>
            {events.map(event => (
              <option key={event.id} value={event.id}>{event.name}</option>
            ))}
          </select>
        </div>

        {/* Timeline */}
        <div className="bg-[#1a1d27] rounded-2xl border border-white/10 p-6 overflow-hidden" data-testid="schedules-list">
          {Object.keys(groupedSchedules).length === 0 ? (
            <div className="text-center py-16">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-amber-400/20 blur-2xl rounded-full" />
                <Clock className="relative mx-auto mb-4 text-gray-300" size={56} />
              </div>
              <p className="text-zinc-300 text-lg font-semibold">אין פריטים בלוח הזמנים</p>
              <p className="text-zinc-500 text-sm mt-2">הוסף פריט ראשון להתחיל</p>
            </div>
          ) : (
            <div className="space-y-10">
              {Object.entries(groupedSchedules).map(([date, daySchedules]) => {
                const isToday = date === todayDateStr
                const nowPosition = isToday ? getNowLinePosition(daySchedules) : -1

                return (
                <div key={date}>
                  {/* Date Header */}
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shadow-amber-500/20">
                      <Calendar className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-white">{date}</h2>
                    {isToday && (
                      <span className="text-xs bg-red-500/20 text-red-400 px-2.5 py-1 rounded-lg font-medium border border-red-500/30">עכשיו</span>
                    )}
                  </div>

                  {/* Timeline Items */}
                  <div className="relative pr-8 border-r-2 border-amber-500/30 space-y-4">
                    {daySchedules.map((schedule, index) => (
                      <Fragment key={schedule.id}>
                        {/* Now Line - current time indicator */}
                        {nowPosition === index && (
                          <div ref={nowLineRef} className="relative flex items-center py-1">
                            <div
                              className="absolute -right-[10px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-red-500 z-10 border-2 border-red-400"
                              style={{ boxShadow: '0 0 8px rgba(239, 68, 68, 0.5), 0 0 20px rgba(239, 68, 68, 0.2)' }}
                            />
                            <div className="w-full flex items-center gap-3 pr-8">
                              <span className="text-xs font-bold text-red-400 bg-red-500/15 px-2.5 py-1 rounded-lg border border-red-500/30 shrink-0">
                                {currentTime.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <div className="flex-1 h-[2px] bg-gradient-to-l from-red-500 to-red-500/20 rounded-full" />
                            </div>
                          </div>
                        )}

                        <div
                          className="relative pr-8 group"
                        >
                          {/* Timeline Dot */}
                          <div
                            className={`absolute -right-[10px] w-5 h-5 rounded-full border-3 border-white shadow-md ${
                              schedule.is_break ? 'bg-gradient-to-br from-orange-400 to-amber-500' : schedule.track_color ? '' : 'bg-gradient-to-br from-blue-400 to-blue-600'
                            }`}
                            style={schedule.track_color && !schedule.is_break ? { background: `linear-gradient(135deg, ${schedule.track_color}, ${schedule.track_color}dd)` } : {}}
                          />

                          {/* Content Card */}
                          <div className={`p-5 rounded-2xl border ${
                            schedule.is_break
                              ? 'bg-gradient-to-r from-orange-500/15 to-amber-500/10 border-orange-500/30'
                              : 'bg-[#1a1d27]/90 border-white/10 hover:bg-[#1a1d27] hover:shadow-xl hover:shadow-blue-500/10'
                          } transition-all duration-300`}>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                {/* Time & Duration */}
                                <div className="flex items-center gap-2 text-sm text-zinc-400 mb-2">
                                  <span className="bg-white/5 px-2.5 py-1 rounded-lg font-medium flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5" />
                                    {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                                  </span>
                                  <span className="text-zinc-500 bg-white/5 px-2 py-1 rounded-lg text-xs">({getDuration(schedule.start_time, schedule.end_time)})</span>
                                </div>

                                {/* Title */}
                                <div className="flex items-center gap-2 flex-wrap">
                                  {schedule.is_break ? (
                                    <Coffee className="w-5 h-5 text-orange-500" />
                                  ) : (
                                    <Play className="w-5 h-5 text-blue-500" />
                                  )}
                                  <h3 className="font-bold text-lg text-white group-hover:text-orange-400 transition-colors">{schedule.title}</h3>
                                  {schedule.is_mandatory && (
                                    <span className="text-xs bg-purple-500/20 text-purple-400 px-2.5 py-1 rounded-lg font-medium">חובה</span>
                                  )}
                                  {schedule.track && (
                                    <span
                                      className="text-xs px-2.5 py-1 rounded-lg text-white font-medium shadow-sm"
                                      style={{ backgroundColor: schedule.track_color || '#6B7280' }}
                                    >
                                      {schedule.track}
                                    </span>
                                  )}
                                </div>

                                {/* Description */}
                                {schedule.description && (
                                  <p className="text-zinc-400 text-sm mt-2">{schedule.description}</p>
                                )}

                                {/* Location & Room */}
                                {(schedule.location || schedule.room) && (
                                  <div className="flex items-center gap-2 text-sm text-zinc-400 mt-3 bg-white/5 px-3 py-1.5 rounded-lg inline-flex">
                                    <MapPin className="w-4 h-4 text-rose-400" />
                                    <span>{[schedule.location, schedule.room].filter(Boolean).join(' - ')}</span>
                                  </div>
                                )}

                                {/* Speaker */}
                                {schedule.speaker_name && (
                                  <div className="flex items-center gap-2 text-sm text-zinc-400 mt-2 bg-blue-500/10 px-3 py-1.5 rounded-lg inline-flex">
                                    <User className="w-4 h-4 text-blue-400" />
                                    <span className="font-medium">{schedule.speaker_name}</span>
                                    {schedule.speaker_title && (
                                      <span className="text-zinc-500">| {schedule.speaker_title}</span>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Actions */}
                              <div className="flex gap-1">
                                <button
                                  onClick={() => openEditModal(schedule)}
                                  className="p-2.5 hover:bg-white/5 rounded-xl transition-all duration-200 hover:scale-105"
                                  aria-label={`ערוך ${schedule.title}`}
                                >
                                  <Edit2 className="w-4 h-4 text-zinc-400" aria-hidden="true" />
                                </button>
                                <button
                                  onClick={() => handleDelete(schedule.id)}
                                  className="p-2.5 hover:bg-red-500/10 rounded-xl transition-all duration-200 hover:scale-105"
                                  aria-label={`מחק ${schedule.title}`}
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" aria-hidden="true" />
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
                          className="absolute -right-[10px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-red-500 z-10 border-2 border-red-400"
                          style={{ boxShadow: '0 0 8px rgba(239, 68, 68, 0.5), 0 0 20px rgba(239, 68, 68, 0.2)' }}
                        />
                        <div className="w-full flex items-center gap-3 pr-8">
                          <span className="text-xs font-bold text-red-400 bg-red-500/15 px-2.5 py-1 rounded-lg border border-red-500/30 shrink-0">
                            {currentTime.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <div className="flex-1 h-[2px] bg-gradient-to-l from-red-500 to-red-500/20 rounded-full" />
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
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="schedule-modal-title">
          <div className="glass-modal p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 id="schedule-modal-title" className="text-xl font-bold">
                {editingSchedule ? 'עריכת פריט' : 'פריט חדש בלו"ז'}
              </h2>
              <button onClick={closeModal} className="text-zinc-400 hover:text-zinc-300" aria-label="סגור חלון לוח זמנים">
                <X className="w-6 h-6" aria-hidden="true" />
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
                  aria-required="true"
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
                  aria-required="true"
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
                    aria-required="true"
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
                    aria-required="true"
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
                        aria-label={`צבע מסלול: ${color.label}`}
                        aria-pressed={formData.track_color === color.value}
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
                <button type="submit" className="flex-1 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 hover:-translate-y-0.5 transition-all duration-300">
                  {editingSchedule ? 'עדכון' : 'יצירה'}
                </button>
                <button type="button" onClick={closeModal} className="px-6 py-2.5 bg-[#1a1d27] text-zinc-300 rounded-xl font-medium border border-white/10 hover:bg-white/5 hover:border-white/20 transition-all duration-300">
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete All Confirmation Modal */}
      {showDeleteAllConfirm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="delete-all-schedules-title">
          <div className="glass-modal p-6 w-full max-w-md">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-red-400" aria-hidden="true" />
              </div>
              <h2 id="delete-all-schedules-title" className="text-xl font-bold text-white mb-2">מחיקת כל פריטי הלוז</h2>
              <p className="text-zinc-400 mb-1">
                פעולה זו תמחק <span className="text-red-400 font-bold">{schedules.length}</span> פריטים מלוח הזמנים.
              </p>
              <p className="text-zinc-500 text-sm mb-6">לא ניתן לבטל פעולה זו.</p>

              <div className="flex gap-3 w-full">
                <button
                  onClick={handleDeleteAll}
                  disabled={deleteAllLoading}
                  className="flex-1 px-6 py-2.5 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-all duration-300 disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  {deleteAllLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  {deleteAllLoading ? 'מוחק...' : 'כן, מחק הכל'}
                </button>
                <button
                  onClick={() => setShowDeleteAllConfirm(false)}
                  disabled={deleteAllLoading}
                  className="flex-1 px-6 py-2.5 bg-[#1a1d27] border border-white/10 text-zinc-300 rounded-xl font-medium hover:bg-white/5 hover:border-white/20 transition-all duration-300"
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
