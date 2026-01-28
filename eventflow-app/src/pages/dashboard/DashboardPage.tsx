// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - Dashboard Page (Redesigned)
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Calendar, Users, CheckSquare, MessageSquare,
  ArrowLeft, Clock, MapPin, TrendingUp,
  Sparkles, Send
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Event } from '../../types'

interface DashboardStats {
  events: number
  activeEvents: number
  participants: number
  confirmedParticipants: number
  pendingTasks: number
  completedTasks: number
  messagesSent: number
}

interface UpcomingEvent extends Event {
  days_until: number
}

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    events: 0,
    activeEvents: 0,
    participants: 0,
    confirmedParticipants: 0,
    pendingTasks: 0,
    completedTasks: 0,
    messagesSent: 0
  })
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const [
          eventsRes,
          activeEventsRes,
          participantsRes,
          confirmedRes,
          pendingTasksRes,
          completedTasksRes,
          messagesRes,
          upcomingRes
        ] = await Promise.all([
          supabase.from('events').select('id', { count: 'exact', head: true }),
          supabase.from('events').select('id', { count: 'exact', head: true }).eq('status', 'active'),
          supabase.from('participants').select('id', { count: 'exact', head: true }),
          supabase.from('participants').select('id', { count: 'exact', head: true }).eq('status', 'confirmed'),
          supabase.from('checklist_items').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('checklist_items').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
          supabase.from('messages').select('id', { count: 'exact', head: true }).eq('status', 'sent'),
          supabase.from('events')
            .select('*')
            .gte('start_date', new Date().toISOString().split('T')[0])
            .order('start_date', { ascending: true })
            .limit(3)
        ])

        setStats({
          events: eventsRes.count || 0,
          activeEvents: activeEventsRes.count || 0,
          participants: participantsRes.count || 0,
          confirmedParticipants: confirmedRes.count || 0,
          pendingTasks: pendingTasksRes.count || 0,
          completedTasks: completedTasksRes.count || 0,
          messagesSent: messagesRes.count || 0
        })

        if (upcomingRes.data) {
          const eventsWithDays = upcomingRes.data.map(event => ({
            ...event,
            days_until: Math.ceil(
              (new Date(event.start_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
            )
          }))
          setUpcomingEvents(eventsWithDays)
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchDashboardData()
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-[#6B9B7A]'
      case 'planning': return 'bg-[#D4A853]'
      case 'draft': return 'bg-[#8B8680]'
      default: return 'bg-[#8B8680]'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'פעיל'
      case 'planning': return 'בתכנון'
      case 'draft': return 'טיוטה'
      case 'completed': return 'הסתיים'
      default: return status
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--ef-cream)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-3 border-[#C4704B] border-t-transparent animate-spin" />
          <p className="text-[#8B8680] font-medium">טוען נתונים...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--ef-cream)' }}>
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <header className="mb-10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#8B8680] text-sm font-medium mb-1">
                {new Date().toLocaleDateString('he-IL', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
              <h1 className="text-3xl font-semibold text-[#1F1D1A]" style={{ fontFamily: 'Rubik, sans-serif' }}>
                שלום, ברוך הבא 👋
              </h1>
            </div>
            <Link
              to="/events/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-medium transition-all hover:-translate-y-0.5"
              style={{
                background: 'var(--ef-terracotta)',
                boxShadow: '0 4px 12px rgba(196, 112, 75, 0.3)'
              }}
            >
              <Sparkles size={18} />
              אירוע חדש
            </Link>
          </div>
        </header>

        {/* Stats Cards */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <Link
            to="/events"
            className="group bg-white rounded-2xl p-5 border border-[#E8E4DD] transition-all hover:shadow-lg hover:-translate-y-1"
          >
            <div className="flex items-start justify-between mb-4">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(196, 112, 75, 0.1)' }}
              >
                <Calendar size={22} className="text-[#C4704B]" />
              </div>
              <ArrowLeft size={18} className="text-[#D4CFC6] group-hover:text-[#C4704B] transition-colors" />
            </div>
            <p className="text-3xl font-bold text-[#1F1D1A] mb-1">{stats.activeEvents}</p>
            <p className="text-sm text-[#8B8680]">אירועים פעילים</p>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-[#8B8680]">
              <TrendingUp size={14} className="text-[#6B9B7A]" />
              <span>{stats.events} סה״כ</span>
            </div>
          </Link>

          <Link
            to="/guests"
            className="group bg-white rounded-2xl p-5 border border-[#E8E4DD] transition-all hover:shadow-lg hover:-translate-y-1"
          >
            <div className="flex items-start justify-between mb-4">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(91, 143, 168, 0.1)' }}
              >
                <Users size={22} className="text-[#5B8FA8]" />
              </div>
              <ArrowLeft size={18} className="text-[#D4CFC6] group-hover:text-[#5B8FA8] transition-colors" />
            </div>
            <p className="text-3xl font-bold text-[#1F1D1A] mb-1">{stats.confirmedParticipants}</p>
            <p className="text-sm text-[#8B8680]">אורחים מאושרים</p>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-[#8B8680]">
              <Users size={14} />
              <span>{stats.participants} רשומים</span>
            </div>
          </Link>

          <Link
            to="/checklist"
            className="group bg-white rounded-2xl p-5 border border-[#E8E4DD] transition-all hover:shadow-lg hover:-translate-y-1"
          >
            <div className="flex items-start justify-between mb-4">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(212, 168, 83, 0.1)' }}
              >
                <CheckSquare size={22} className="text-[#D4A853]" />
              </div>
              <ArrowLeft size={18} className="text-[#D4CFC6] group-hover:text-[#D4A853] transition-colors" />
            </div>
            <p className="text-3xl font-bold text-[#1F1D1A] mb-1">{stats.pendingTasks}</p>
            <p className="text-sm text-[#8B8680]">משימות פתוחות</p>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-[#6B9B7A]">
              <CheckSquare size={14} />
              <span>{stats.completedTasks} הושלמו</span>
            </div>
          </Link>

          <Link
            to="/messages"
            className="group bg-white rounded-2xl p-5 border border-[#E8E4DD] transition-all hover:shadow-lg hover:-translate-y-1"
          >
            <div className="flex items-start justify-between mb-4">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(122, 155, 138, 0.1)' }}
              >
                <MessageSquare size={22} className="text-[#7A9B8A]" />
              </div>
              <ArrowLeft size={18} className="text-[#D4CFC6] group-hover:text-[#7A9B8A] transition-colors" />
            </div>
            <p className="text-3xl font-bold text-[#1F1D1A] mb-1">{stats.messagesSent}</p>
            <p className="text-sm text-[#8B8680]">הודעות נשלחו</p>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-[#8B8680]">
              <Send size={14} />
              <span>WhatsApp</span>
            </div>
          </Link>
        </section>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Upcoming Events */}
          <section className="lg:col-span-2 bg-white rounded-2xl border border-[#E8E4DD] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E8E4DD] flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#1F1D1A]" style={{ fontFamily: 'Rubik, sans-serif' }}>
                אירועים קרובים
              </h2>
              <Link to="/events" className="text-sm text-[#C4704B] hover:underline">
                הצג הכל
              </Link>
            </div>
            <div className="divide-y divide-[#E8E4DD]">
              {upcomingEvents.length === 0 ? (
                <div className="p-8 text-center">
                  <Calendar size={40} className="mx-auto text-[#D4CFC6] mb-3" />
                  <p className="text-[#8B8680]">אין אירועים קרובים</p>
                  <Link
                    to="/events/new"
                    className="inline-block mt-3 text-sm text-[#C4704B] hover:underline"
                  >
                    צור אירוע חדש
                  </Link>
                </div>
              ) : (
                upcomingEvents.map((event, index) => (
                  <Link
                    key={event.id}
                    to={`/events/${event.id}`}
                    className="flex items-center gap-4 p-5 hover:bg-[#FAF8F5] transition-colors"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* Date Badge */}
                    <div className="w-14 h-14 rounded-xl bg-[#FAF8F5] flex flex-col items-center justify-center flex-shrink-0">
                      <span className="text-xs text-[#8B8680] font-medium">
                        {new Date(event.start_date).toLocaleDateString('he-IL', { month: 'short' })}
                      </span>
                      <span className="text-xl font-bold text-[#1F1D1A]">
                        {new Date(event.start_date).getDate()}
                      </span>
                    </div>

                    {/* Event Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-[#1F1D1A] truncate">{event.name}</h3>
                        <span className={`w-2 h-2 rounded-full ${getStatusColor(event.status)}`} />
                      </div>
                      <div className="flex items-center gap-4 text-sm text-[#8B8680]">
                        {event.venue_name && (
                          <span className="flex items-center gap-1">
                            <MapPin size={14} />
                            {event.venue_name}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock size={14} />
                          {event.days_until === 0 ? 'היום' :
                           event.days_until === 1 ? 'מחר' :
                           `בעוד ${event.days_until} ימים`}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span
                      className="px-3 py-1 text-xs font-medium rounded-full"
                      style={{
                        background: event.status === 'active' ? 'rgba(107, 155, 122, 0.15)' : 'rgba(212, 168, 83, 0.15)',
                        color: event.status === 'active' ? '#6B9B7A' : '#9A7A30'
                      }}
                    >
                      {getStatusLabel(event.status)}
                    </span>

                    <ArrowLeft size={18} className="text-[#D4CFC6]" />
                  </Link>
                ))
              )}
            </div>
          </section>

          {/* Quick Actions */}
          <section className="bg-white rounded-2xl border border-[#E8E4DD] p-6">
            <h2 className="text-lg font-semibold text-[#1F1D1A] mb-4" style={{ fontFamily: 'Rubik, sans-serif' }}>
              פעולות מהירות
            </h2>
            <div className="space-y-3">
              <Link
                to="/events/new"
                className="flex items-center gap-3 p-4 rounded-xl border border-[#E8E4DD] hover:border-[#C4704B] hover:bg-[#FAF8F5] transition-all group"
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#C4704B]/10 group-hover:bg-[#C4704B]/20 transition-colors">
                  <Calendar size={20} className="text-[#C4704B]" />
                </div>
                <div>
                  <p className="font-medium text-[#1F1D1A]">צור אירוע חדש</p>
                  <p className="text-xs text-[#8B8680]">כנס, אירוע חברה, חתונה...</p>
                </div>
              </Link>

              <Link
                to="/guests"
                className="flex items-center gap-3 p-4 rounded-xl border border-[#E8E4DD] hover:border-[#5B8FA8] hover:bg-[#FAF8F5] transition-all group"
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#5B8FA8]/10 group-hover:bg-[#5B8FA8]/20 transition-colors">
                  <Users size={20} className="text-[#5B8FA8]" />
                </div>
                <div>
                  <p className="font-medium text-[#1F1D1A]">ייבוא אורחים</p>
                  <p className="text-xs text-[#8B8680]">מקובץ Excel או CSV</p>
                </div>
              </Link>

              <Link
                to="/messages"
                className="flex items-center gap-3 p-4 rounded-xl border border-[#E8E4DD] hover:border-[#7A9B8A] hover:bg-[#FAF8F5] transition-all group"
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#7A9B8A]/10 group-hover:bg-[#7A9B8A]/20 transition-colors">
                  <Send size={20} className="text-[#7A9B8A]" />
                </div>
                <div>
                  <p className="font-medium text-[#1F1D1A]">שלח הזמנות</p>
                  <p className="text-xs text-[#8B8680]">WhatsApp, SMS, Email</p>
                </div>
              </Link>

              <Link
                to="/checkin"
                className="flex items-center gap-3 p-4 rounded-xl border border-[#E8E4DD] hover:border-[#D4A853] hover:bg-[#FAF8F5] transition-all group"
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#D4A853]/10 group-hover:bg-[#D4A853]/20 transition-colors">
                  <CheckSquare size={20} className="text-[#D4A853]" />
                </div>
                <div>
                  <p className="font-medium text-[#1F1D1A]">צ׳ק-אין אורחים</p>
                  <p className="text-xs text-[#8B8680]">סריקת QR או ידני</p>
                </div>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
