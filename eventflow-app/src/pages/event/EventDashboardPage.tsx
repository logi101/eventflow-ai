// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - Event Dashboard Page (Premium Design)
// Shows overview and quick actions for the selected event
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Users,
  Calendar,
  Clock,
  MapPin,
  MessageSquare,
  CheckSquare,
  Truck,
  QrCode,
  Send,
  ArrowLeft,
  Edit2,
  Loader2,
  AlertCircle,
  Sparkles,
  X,
  Save
} from 'lucide-react'
import { useEvent } from '../../contexts/EventContext'
import { supabase } from '../../lib/supabase'

interface EventStats {
  participants: number
  confirmed: number
  checkedIn: number
  schedules: number
  pendingTasks: number
  completedTasks: number
  messagesSent: number
  vendors: number
}

export function EventDashboardPage() {
  const navigate = useNavigate()
  const { selectedEvent, setSelectedEvent } = useEvent()
  const [stats, setStats] = useState<EventStats>({
    participants: 0,
    confirmed: 0,
    checkedIn: 0,
    schedules: 0,
    pendingTasks: 0,
    completedTasks: 0,
    messagesSent: 0,
    vendors: 0
  })

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadingEditData, setLoadingEditData] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    venue_name: '',
    venue_address: '',
    venue_city: '',
    max_participants: ''
  })
  const [loading, setLoading] = useState(true)
  const [upcomingSchedules, setUpcomingSchedules] = useState<{ id: string; title: string; start_time: string; location?: string; speaker_name?: string; track?: string }[]>([])

  useEffect(() => {
    if (!selectedEvent) {
      navigate('/')
      return
    }
    fetchStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEvent])

  async function fetchStats() {
    if (!selectedEvent) return
    setLoading(true)

    try {
      const [
        participantsRes,
        confirmedRes,
        checkedInRes,
        schedulesRes,
        pendingTasksRes,
        completedTasksRes,
        messagesRes,
        vendorsRes,
        upcomingRes
      ] = await Promise.all([
        supabase.from('participants').select('*', { count: 'exact', head: true }).eq('event_id', selectedEvent.id),
        supabase.from('participants').select('*', { count: 'exact', head: true }).eq('event_id', selectedEvent.id).eq('status', 'confirmed'),
        supabase.from('participants').select('*', { count: 'exact', head: true }).eq('event_id', selectedEvent.id).eq('status', 'checked_in'),
        supabase.from('schedules').select('*', { count: 'exact', head: true }).eq('event_id', selectedEvent.id),
        supabase.from('checklist_items').select('*', { count: 'exact', head: true }).eq('event_id', selectedEvent.id).eq('status', 'pending'),
        supabase.from('checklist_items').select('*', { count: 'exact', head: true }).eq('event_id', selectedEvent.id).eq('status', 'completed'),
        supabase.from('messages').select('*', { count: 'exact', head: true }).eq('event_id', selectedEvent.id).eq('status', 'sent'),
        supabase.from('event_vendors').select('*', { count: 'exact', head: true }).eq('event_id', selectedEvent.id),
        supabase.from('schedules')
          .select('*')
          .eq('event_id', selectedEvent.id)
          .gte('start_time', new Date().toISOString())
          .order('start_time', { ascending: true })
          .limit(5)
      ])

      setStats({
        participants: participantsRes.count || 0,
        confirmed: confirmedRes.count || 0,
        checkedIn: checkedInRes.count || 0,
        schedules: schedulesRes.count || 0,
        pendingTasks: pendingTasksRes.count || 0,
        completedTasks: completedTasksRes.count || 0,
        messagesSent: messagesRes.count || 0,
        vendors: vendorsRes.count || 0
      })

      setUpcomingSchedules(upcomingRes.data || [])
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  // Open edit modal with fresh event data from database
  async function openEditModal() {
    if (!selectedEvent) return

    setShowEditModal(true)
    setLoadingEditData(true)

    try {
      // Fetch fresh data from database
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', selectedEvent.id)
        .single()

      if (error) throw error

      if (data) {
        setEditForm({
          name: data.name || '',
          description: data.description || '',
          start_date: data.start_date ? data.start_date.split('T')[0] : '',
          end_date: data.end_date ? data.end_date.split('T')[0] : '',
          venue_name: data.venue_name || '',
          venue_address: data.venue_address || '',
          venue_city: data.venue_city || '',
          max_participants: data.max_participants?.toString() || ''
        })
      }
    } catch (err) {
      console.error('Error loading event:', err)
      // Fallback to context data
      setEditForm({
        name: selectedEvent.name || '',
        description: selectedEvent.description || '',
        start_date: selectedEvent.start_date ? selectedEvent.start_date.split('T')[0] : '',
        end_date: selectedEvent.end_date ? selectedEvent.end_date.split('T')[0] : '',
        venue_name: selectedEvent.venue_name || '',
        venue_address: selectedEvent.venue_address || '',
        venue_city: selectedEvent.venue_city || '',
        max_participants: selectedEvent.max_participants?.toString() || ''
      })
    } finally {
      setLoadingEditData(false)
    }
  }

  // Save event changes
  async function handleSaveEvent() {
    if (!selectedEvent) return
    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('events')
        .update({
          name: editForm.name,
          description: editForm.description || null,
          start_date: editForm.start_date || null,
          end_date: editForm.end_date || null,
          venue_name: editForm.venue_name || null,
          venue_address: editForm.venue_address || null,
          venue_city: editForm.venue_city || null,
          max_participants: editForm.max_participants ? parseInt(editForm.max_participants) : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedEvent.id)
        .select()
        .single()

      if (error) throw error

      // Update the context with new event data
      if (data && setSelectedEvent) {
        setSelectedEvent(data)
      }

      setShowEditModal(false)
    } catch (error) {
      console.error('Error saving event:', error)
      alert('שגיאה בשמירת האירוע')
    } finally {
      setSaving(false)
    }
  }

  if (!selectedEvent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
        <div className="text-center animate-fade-in">
          <div className="relative">
            <div className="absolute inset-0 bg-amber-400/20 blur-3xl rounded-full animate-pulse" />
            <AlertCircle className="w-20 h-20 mx-auto text-amber-500 mb-6 relative animate-bounce-slow" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">לא נבחר אירוע</h2>
          <p className="text-gray-500 mb-6">יש לבחור אירוע כדי לצפות בדשבורד</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 hover:-translate-y-0.5 transition-all duration-300"
          >
            חזור לרשימת האירועים
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="absolute inset-0 bg-amber-400/30 blur-2xl rounded-full animate-pulse" />
            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-gray-700 font-semibold text-lg">טוען נתוני אירוע</p>
            <p className="text-gray-400 text-sm mt-1">רק רגע...</p>
          </div>
        </div>
      </div>
    )
  }

  const getDaysUntil = () => {
    const eventDate = new Date(selectedEvent.start_date)
    const today = new Date()
    // Compare calendar days only (strip time portion)
    const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate())
    const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const days = Math.round((eventDay.getTime() - todayDay.getTime()) / (1000 * 60 * 60 * 24))
    if (days < 0) return { text: 'האירוע עבר', color: 'text-gray-500', bg: 'bg-gray-100' }
    if (days === 0) return { text: 'היום!', color: 'text-emerald-600', bg: 'bg-emerald-50' }
    if (days === 1) return { text: 'מחר!', color: 'text-amber-600', bg: 'bg-amber-50' }
    if (days <= 7) return { text: `בעוד ${days} ימים`, color: 'text-orange-500', bg: 'bg-orange-50' }
    return { text: `בעוד ${days} ימים`, color: 'text-gray-600', bg: 'bg-gray-50' }
  }

  const daysInfo = getDaysUntil()

  const getTrackColor = (track: string) => {
    switch (track) {
      case 'כללי': return 'bg-blue-100 text-blue-700'
      case 'צוות': return 'bg-emerald-100 text-emerald-700'
      case 'בני זוג': return 'bg-pink-100 text-pink-700'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/80 via-orange-50/50 to-rose-50/80">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-200/30 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-orange-200/20 rounded-full blur-3xl animate-float-delayed" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-rose-200/20 rounded-full blur-3xl animate-float-slow" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <header className="mb-8 animate-slide-down">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-4 mb-3">
                {selectedEvent.event_types?.icon && (
                  <div className="relative">
                    <div className="absolute inset-0 bg-amber-400/30 blur-xl rounded-full" />
                    <span className="relative text-4xl drop-shadow-sm">{selectedEvent.event_types.icon}</span>
                  </div>
                )}
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                    {selectedEvent.name}
                  </h1>
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${daysInfo.bg} ${daysInfo.color}`}>
                      <Sparkles size={14} />
                      {daysInfo.text}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-5 text-gray-500 mt-4">
                <span className="flex items-center gap-2 bg-white/60 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                  <Calendar size={16} className="text-amber-500" />
                  <span className="text-gray-700 font-medium">
                    {new Date(selectedEvent.start_date).toLocaleDateString('he-IL', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </span>
                {selectedEvent.venue_name && (
                  <span className="flex items-center gap-2 bg-white/60 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                    <MapPin size={16} className="text-rose-500" />
                    <span className="text-gray-700 font-medium">{selectedEvent.venue_name}</span>
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={openEditModal}
              className="group inline-flex items-center gap-2 px-5 py-2.5 bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl text-gray-700 hover:bg-white hover:shadow-lg hover:shadow-gray-200/50 hover:-translate-y-0.5 transition-all duration-300"
            >
              <Edit2 size={16} className="group-hover:rotate-12 transition-transform duration-300" />
              <span className="font-medium">ערוך אירוע</span>
            </button>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {/* Participants Card */}
          <Link
            to="/event/guests"
            className="group relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/50 hover:bg-white hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1 transition-all duration-500 overflow-hidden"
          >
            {/* Gradient Underlay */}
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-400 via-blue-500 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                  <Users size={24} className="text-white" />
                </div>
                <ArrowLeft size={18} className="text-gray-300 group-hover:text-blue-500 group-hover:-translate-x-1 transition-all duration-300" />
              </div>
              <p className="text-4xl font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors duration-300">{stats.participants}</p>
              <p className="text-sm text-gray-500 font-medium">משתתפים</p>
              <div className="mt-3 flex items-center gap-3 text-xs">
                <span className="text-emerald-600 font-semibold bg-emerald-50 px-2 py-1 rounded-md">{stats.confirmed} מאושרים</span>
                <span className="text-blue-600 font-semibold bg-blue-50 px-2 py-1 rounded-md">{stats.checkedIn} נכנסו</span>
              </div>
            </div>
          </Link>

          {/* Schedule Card */}
          <Link
            to="/event/schedule"
            className="group relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/50 hover:bg-white hover:shadow-2xl hover:shadow-amber-500/10 hover:-translate-y-1 transition-all duration-500 overflow-hidden"
          >
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                  <Clock size={24} className="text-white" />
                </div>
                <ArrowLeft size={18} className="text-gray-300 group-hover:text-amber-500 group-hover:-translate-x-1 transition-all duration-300" />
              </div>
              <p className="text-4xl font-bold text-gray-900 mb-1 group-hover:text-amber-600 transition-colors duration-300">{stats.schedules}</p>
              <p className="text-sm text-gray-500 font-medium">פעילויות בלו"ז</p>
            </div>
          </Link>

          {/* Checklist Card */}
          <Link
            to="/event/checklist"
            className="group relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/50 hover:bg-white hover:shadow-2xl hover:shadow-emerald-500/10 hover:-translate-y-1 transition-all duration-500 overflow-hidden"
          >
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-emerald-400 via-green-500 to-teal-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                  <CheckSquare size={24} className="text-white" />
                </div>
                <ArrowLeft size={18} className="text-gray-300 group-hover:text-emerald-500 group-hover:-translate-x-1 transition-all duration-300" />
              </div>
              <p className="text-4xl font-bold text-gray-900 mb-1 group-hover:text-emerald-600 transition-colors duration-300">{stats.pendingTasks}</p>
              <p className="text-sm text-gray-500 font-medium">משימות פתוחות</p>
              <div className="mt-3 text-xs">
                <span className="text-emerald-600 font-semibold bg-emerald-50 px-2 py-1 rounded-md">{stats.completedTasks} הושלמו</span>
              </div>
            </div>
          </Link>

          {/* Messages Card */}
          <Link
            to="/event/messages"
            className="group relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/50 hover:bg-white hover:shadow-2xl hover:shadow-purple-500/10 hover:-translate-y-1 transition-all duration-500 overflow-hidden"
          >
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-purple-400 via-violet-500 to-fuchsia-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-violet-600 flex items-center justify-center shadow-lg shadow-purple-500/30 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                  <MessageSquare size={24} className="text-white" />
                </div>
                <ArrowLeft size={18} className="text-gray-300 group-hover:text-purple-500 group-hover:-translate-x-1 transition-all duration-300" />
              </div>
              <p className="text-4xl font-bold text-gray-900 mb-1 group-hover:text-purple-600 transition-colors duration-300">{stats.messagesSent}</p>
              <p className="text-sm text-gray-500 font-medium">הודעות נשלחו</p>
            </div>
          </Link>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Upcoming Schedule */}
          <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm rounded-2xl border border-white/50 overflow-hidden shadow-xl shadow-gray-200/20 animate-slide-up">
            <div className="px-6 py-5 border-b border-gray-100/80 flex items-center justify-between bg-gradient-to-r from-white to-amber-50/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shadow-amber-500/20">
                  <Clock size={20} className="text-white" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">פעילויות קרובות</h2>
              </div>
              <Link to="/event/schedule" className="text-sm text-amber-600 hover:text-amber-700 font-semibold hover:underline transition-colors">
                לו"ז מלא ←
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {upcomingSchedules.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="relative inline-block">
                    <div className="absolute inset-0 bg-amber-400/20 blur-2xl rounded-full" />
                    <Clock size={48} className="relative mx-auto text-gray-300 mb-4" />
                  </div>
                  <p className="text-gray-500 font-medium">אין פעילויות קרובות</p>
                  <Link
                    to="/event/schedule"
                    className="inline-block mt-4 text-sm text-amber-600 hover:text-amber-700 font-semibold hover:underline"
                  >
                    הוסף פעילות ללו"ז
                  </Link>
                </div>
              ) : (
                upcomingSchedules.map((schedule, index) => (
                  <div
                    key={schedule.id}
                    className="flex items-center gap-4 p-5 hover:bg-gradient-to-r hover:from-amber-50/50 hover:to-transparent transition-all duration-300 group"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex flex-col items-center justify-center flex-shrink-0 group-hover:from-amber-200 group-hover:to-orange-200 transition-colors duration-300 shadow-sm">
                      <span className="text-lg font-bold text-amber-600">
                        {new Date(schedule.start_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate group-hover:text-amber-700 transition-colors">{schedule.title}</h3>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {schedule.location && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin size={12} className="text-rose-400" />
                            {schedule.location}
                          </span>
                        )}
                        {schedule.speaker_name && (
                          <span className="inline-flex items-center gap-1 mr-3">
                            <Users size={12} className="text-blue-400" />
                            {schedule.speaker_name}
                          </span>
                        )}
                      </p>
                    </div>
                    {schedule.track && (
                      <span className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${getTrackColor(schedule.track)}`}>
                        {schedule.track}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/50 p-6 shadow-xl shadow-gray-200/20 animate-slide-up" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center shadow-md shadow-rose-500/20">
                <Sparkles size={20} className="text-white" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">פעולות מהירות</h2>
            </div>
            <div className="space-y-3">
              <Link
                to="/event/messages"
                className="group flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-emerald-200 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-green-50 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-md shadow-emerald-500/20 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                  <Send size={22} className="text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors">שלח הודעות</p>
                  <p className="text-xs text-gray-500">WhatsApp למשתתפים</p>
                </div>
              </Link>

              <Link
                to="/event/guests"
                className="group flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                  <Users size={22} className="text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">ייבוא משתתפים</p>
                  <p className="text-xs text-gray-500">מקובץ Excel</p>
                </div>
              </Link>

              <Link
                to="/event/checkin"
                className="group flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-amber-200 hover:bg-gradient-to-r hover:from-amber-50 hover:to-yellow-50 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/10"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shadow-amber-500/20 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                  <QrCode size={22} className="text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 group-hover:text-amber-700 transition-colors">צ'ק-אין</p>
                  <p className="text-xs text-gray-500">סריקת QR</p>
                </div>
              </Link>

              <Link
                to="/event/vendors"
                className="group flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-gradient-to-r hover:from-purple-50 hover:to-violet-50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-violet-500 flex items-center justify-center shadow-md shadow-purple-500/20 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                  <Truck size={22} className="text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 group-hover:text-purple-700 transition-colors">ספקים</p>
                  <p className="text-xs text-gray-500">{stats.vendors} ספקים מקושרים</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Event Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">עריכת אירוע</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {loadingEditData ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-3" />
                  <p className="text-gray-500">טוען נתוני אירוע...</p>
                </div>
              ) : (
              <>
              {/* Event Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">שם האירוע *</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all bg-white text-gray-900"
                  placeholder="הכנס שם אירוע"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">תיאור</label>
                <textarea
                  value={editForm.description}
                  onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all resize-none bg-white text-gray-900"
                  placeholder="תיאור האירוע"
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">תאריך התחלה</label>
                  <input
                    type="date"
                    value={editForm.start_date}
                    onChange={e => setEditForm({ ...editForm, start_date: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all bg-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">תאריך סיום</label>
                  <input
                    type="date"
                    value={editForm.end_date}
                    onChange={e => setEditForm({ ...editForm, end_date: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all bg-white text-gray-900"
                  />
                </div>
              </div>

              {/* Venue */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">שם המקום</label>
                  <input
                    type="text"
                    value={editForm.venue_name}
                    onChange={e => setEditForm({ ...editForm, venue_name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all bg-white text-gray-900"
                    placeholder="למשל: מלון דן פנורמה"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">כתובת</label>
                  <input
                    type="text"
                    value={editForm.venue_address}
                    onChange={e => setEditForm({ ...editForm, venue_address: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all bg-white text-gray-900"
                    placeholder="כתובת המקום"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">עיר</label>
                  <input
                    type="text"
                    value={editForm.venue_city}
                    onChange={e => setEditForm({ ...editForm, venue_city: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all bg-white text-gray-900"
                    placeholder="עיר"
                  />
                </div>
              </div>

              {/* Max Participants */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">מקסימום משתתפים</label>
                <input
                  type="number"
                  value={editForm.max_participants}
                  onChange={e => setEditForm({ ...editForm, max_participants: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all bg-white text-gray-900"
                  placeholder="ללא הגבלה"
                  min="1"
                />
              </div>
              </>
              )}
            </div>

            {/* Actions */}
            <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
              >
                ביטול
              </button>
              <button
                onClick={handleSaveEvent}
                disabled={saving || loadingEditData || !editForm.name}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
              >
                {saving ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    שומר...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    שמור שינויים
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(-3deg); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-delayed { animation: float-delayed 8s ease-in-out infinite; animation-delay: 1s; }
        .animate-float-slow { animation: float-slow 10s ease-in-out infinite; animation-delay: 2s; }
        .animate-slide-down { animation: slide-down 0.6s ease-out; }
        .animate-slide-up { animation: slide-up 0.6s ease-out; }
        .animate-fade-in { animation: fade-in 0.5s ease-out; }
        .animate-bounce-slow { animation: bounce-slow 2s ease-in-out infinite; }
      `}</style>
    </div>
  )
}

export default EventDashboardPage
