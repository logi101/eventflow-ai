// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - Dashboard Page (Enhanced)
// Shows event-specific dashboard when event is selected,
// global overview when no event is selected.
// ═══════════════════════════════════════════════════════════════════════════

import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Loader2,
  Users,
  CheckSquare,
  MessageSquare,
  CalendarDays,
  Clock,
  Plus,
  Upload,
  Calendar,
  MapPin,
  ArrowLeft,
  CheckCircle,
  XCircle,
  HelpCircle,
  LayoutDashboard
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useEvent } from '../../contexts/EventContext'

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

interface ParticipantStats {
  total: number
  confirmed: number
  pending: number
  declined: number
}

interface ChecklistStats {
  total: number
  completed: number
}

interface MessageStats {
  total: number
  sent: number
  delivered: number
  read: number
}

interface UpcomingSession {
  id: string
  title: string
  start_time: string
  end_time: string
  location: string | null
  speaker_name: string | null
  is_break: boolean
}

interface RecentMessage {
  id: string
  content: string
  status: string
  channel: string
  created_at: string
  to_phone: string | null
  participants?: {
    full_name: string | null
    first_name: string
    last_name: string
  } | null
}

interface GlobalEventSummary {
  id: string
  name: string
  status: string
  start_date: string
  venue_name: string | null
  participants_count?: number
}

interface GlobalStats {
  active: number
  completed: number
  draft: number
  planning: number
  total: number
}

// ────────────────────────────────────────────────────────────────────────────
// Query Keys
// ────────────────────────────────────────────────────────────────────────────

const dashboardKeys = {
  all: ['dashboard'] as const,
  eventParticipants: (eventId: string) => [...dashboardKeys.all, 'participants', eventId] as const,
  eventChecklist: (eventId: string) => [...dashboardKeys.all, 'checklist', eventId] as const,
  eventMessages: (eventId: string) => [...dashboardKeys.all, 'messages', eventId] as const,
  eventSchedules: (eventId: string) => [...dashboardKeys.all, 'schedules', eventId] as const,
  eventRecentMessages: (eventId: string) => [...dashboardKeys.all, 'recentMessages', eventId] as const,
  globalStats: () => [...dashboardKeys.all, 'globalStats'] as const,
  upcomingEvents: () => [...dashboardKeys.all, 'upcomingEvents'] as const,
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function getDaysUntilEvent(startDate: string): { label: string; color: string } {
  const now = new Date()
  const eventDate = new Date(startDate)
  // Reset hours for day-level comparison
  now.setHours(0, 0, 0, 0)
  eventDate.setHours(0, 0, 0, 0)
  const diffMs = eventDate.getTime() - now.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return { label: '!היום', color: 'text-green-400' }
  if (diffDays === 1) return { label: 'מחר', color: 'text-amber-400' }
  if (diffDays < 0) return { label: `לפני ${Math.abs(diffDays)} ימים`, color: 'text-zinc-400' }
  if (diffDays <= 7) return { label: `עוד ${diffDays} ימים`, color: 'text-orange-400' }
  return { label: `עוד ${diffDays} ימים`, color: 'text-blue-400' }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('he-IL', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('he-IL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const statusLabelsHebrew: Record<string, string> = {
  active: 'פעיל',
  completed: 'הושלם',
  draft: 'טיוטה',
  planning: 'בתכנון',
  cancelled: 'בוטל',
  archived: 'בארכיון',
}

const messageStatusHebrew: Record<string, string> = {
  pending: 'ממתין',
  scheduled: 'מתוזמן',
  sent: 'נשלח',
  delivered: 'נמסר',
  read: 'נקרא',
  failed: 'נכשל',
}

// ────────────────────────────────────────────────────────────────────────────
// Skeleton Loader
// ────────────────────────────────────────────────────────────────────────────

function StatCardSkeleton() {
  return (
    <div className="premium-stats-card orange animate-pulse">
      <div className="h-4 bg-zinc-700 rounded w-24 mb-4" />
      <div className="h-10 bg-zinc-700 rounded w-16 mb-2" />
      <div className="h-3 bg-zinc-700 rounded w-32" />
    </div>
  )
}

function SectionSkeleton() {
  return (
    <div className="bg-[#1a1d27]/60 backdrop-blur-sm rounded-2xl border border-white/10 p-6 animate-pulse">
      <div className="h-5 bg-zinc-700 rounded w-32 mb-6" />
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-14 bg-zinc-700/50 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Event-Specific Dashboard
// ────────────────────────────────────────────────────────────────────────────

function EventDashboard({ eventId, eventName, startDate }: { eventId: string; eventName: string; startDate: string }) {
  // Participant stats
  const { data: participantStats, isLoading: participantsLoading } = useQuery({
    queryKey: dashboardKeys.eventParticipants(eventId),
    queryFn: async (): Promise<ParticipantStats> => {
      const { data, error } = await supabase
        .from('participants')
        .select('status')
        .eq('event_id', eventId)

      if (error) throw error

      const stats: ParticipantStats = { total: 0, confirmed: 0, pending: 0, declined: 0 }
      stats.total = data?.length || 0
      data?.forEach(p => {
        if (p.status === 'confirmed' || p.status === 'checked_in') stats.confirmed++
        else if (p.status === 'declined' || p.status === 'no_show') stats.declined++
        else stats.pending++
      })
      return stats
    },
    staleTime: 30_000,
  })

  // Checklist stats
  const { data: checklistStats, isLoading: checklistLoading } = useQuery({
    queryKey: dashboardKeys.eventChecklist(eventId),
    queryFn: async (): Promise<ChecklistStats> => {
      const { data, error } = await supabase
        .from('checklist_items')
        .select('status')
        .eq('event_id', eventId)

      if (error) throw error

      return {
        total: data?.length || 0,
        completed: data?.filter(c => c.status === 'completed').length || 0,
      }
    },
    staleTime: 30_000,
  })

  // Message stats
  const { data: messageStats, isLoading: messagesLoading } = useQuery({
    queryKey: dashboardKeys.eventMessages(eventId),
    queryFn: async (): Promise<MessageStats> => {
      const { data, error } = await supabase
        .from('messages')
        .select('status')
        .eq('event_id', eventId)

      if (error) throw error

      const stats: MessageStats = { total: 0, sent: 0, delivered: 0, read: 0 }
      stats.total = data?.length || 0
      data?.forEach(m => {
        if (m.status === 'sent') stats.sent++
        else if (m.status === 'delivered') stats.delivered++
        else if (m.status === 'read') stats.read++
      })
      return stats
    },
    staleTime: 30_000,
  })

  // Upcoming schedules
  const { data: upcomingSessions = [], isLoading: schedulesLoading } = useQuery({
    queryKey: dashboardKeys.eventSchedules(eventId),
    queryFn: async (): Promise<UpcomingSession[]> => {
      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from('schedules')
        .select('id, title, start_time, end_time, location, speaker_name, is_break')
        .eq('event_id', eventId)
        .gte('start_time', now)
        .order('start_time', { ascending: true })
        .limit(5)

      if (error) throw error
      return (data || []) as UpcomingSession[]
    },
    staleTime: 60_000,
  })

  // Recent messages
  const { data: recentMessages = [], isLoading: recentMsgLoading } = useQuery({
    queryKey: dashboardKeys.eventRecentMessages(eventId),
    queryFn: async (): Promise<RecentMessage[]> => {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id, content, status, channel, created_at, to_phone,
          participants:participant_id (full_name, first_name, last_name)
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) throw error
      return (data || []) as unknown as RecentMessage[]
    },
    staleTime: 30_000,
  })

  const daysInfo = getDaysUntilEvent(startDate)
  const checklistPercent = checklistStats && checklistStats.total > 0
    ? Math.round((checklistStats.completed / checklistStats.total) * 100)
    : 0

  return (
    <div className="space-y-8" data-testid="event-dashboard">
      {/* Event Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shadow-amber-500/20">
          <LayoutDashboard className="w-5 h-5 text-white" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white" data-testid="dashboard-title">לוח בקרה</h1>
          <p className="text-zinc-400 text-sm mt-0.5">{eventName}</p>
        </div>
      </div>

      {/* Stats Row (4 cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" aria-busy={participantsLoading || checklistLoading || messagesLoading} aria-live="polite">
        {/* Participants Card */}
        {participantsLoading ? <StatCardSkeleton /> : (
          <Link to="/guests" className="premium-stats-card orange group" data-testid="participants-stat">
            <div className="flex items-center justify-between mb-3">
              <span className="text-zinc-400 text-sm font-medium">משתתפים</span>
              <Users className="w-5 h-5 text-orange-400" aria-hidden="true" />
            </div>
            <p className="text-4xl font-bold text-white mb-2">{participantStats?.total || 0}</p>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-green-400">
                <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />
                {participantStats?.confirmed || 0} אישרו
              </span>
              <span className="flex items-center gap-1 text-amber-400">
                <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
                {participantStats?.pending || 0} ממתינים
              </span>
              <span className="flex items-center gap-1 text-red-400">
                <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                {participantStats?.declined || 0} סירבו
              </span>
            </div>
          </Link>
        )}

        {/* Checklist Card */}
        {checklistLoading ? <StatCardSkeleton /> : (
          <Link to="/checklist" className="premium-stats-card success group" data-testid="checklist-stat">
            <div className="flex items-center justify-between mb-3">
              <span className="text-zinc-400 text-sm font-medium">צ'קליסט</span>
              <CheckSquare className="w-5 h-5 text-green-400" aria-hidden="true" />
            </div>
            <p className="text-4xl font-bold text-white mb-2">
              {checklistStats?.completed || 0}/{checklistStats?.total || 0}
            </p>
            {/* Progress Bar */}
            <div className="w-full h-2 bg-zinc-700 rounded-full overflow-hidden" role="progressbar" aria-valuenow={checklistPercent} aria-valuemin={0} aria-valuemax={100} aria-label="התקדמות צ'קליסט">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${checklistPercent}%` }}
              />
            </div>
            <p className="text-xs text-zinc-400 mt-1.5">{checklistPercent}% הושלם</p>
          </Link>
        )}

        {/* Messages Card */}
        {messagesLoading ? <StatCardSkeleton /> : (
          <Link to="/messages" className="premium-stats-card yellow group" data-testid="messages-stat">
            <div className="flex items-center justify-between mb-3">
              <span className="text-zinc-400 text-sm font-medium">הודעות</span>
              <MessageSquare className="w-5 h-5 text-amber-400" aria-hidden="true" />
            </div>
            <p className="text-4xl font-bold text-white mb-2">{messageStats?.total || 0}</p>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-blue-400">{messageStats?.sent || 0} נשלחו</span>
              <span className="text-green-400">{messageStats?.delivered || 0} נמסרו</span>
              <span className="text-emerald-400">{messageStats?.read || 0} נקראו</span>
            </div>
          </Link>
        )}

        {/* Days Until Event Card */}
        <div className="premium-stats-card white" data-testid="days-stat">
          <div className="flex items-center justify-between mb-3">
            <span className="text-zinc-400 text-sm font-medium">תאריך האירוע</span>
            <CalendarDays className="w-5 h-5 text-zinc-300" aria-hidden="true" />
          </div>
          <p className={`text-4xl font-bold mb-2 ${daysInfo.color}`}>{daysInfo.label}</p>
          <p className="text-xs text-zinc-500">{formatDate(startDate)}</p>
        </div>
      </div>

      {/* Bottom Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Schedule */}
        {schedulesLoading ? <SectionSkeleton /> : (
          <div className="bg-[#1a1d27]/60 backdrop-blur-sm rounded-2xl border border-white/10 p-6" data-testid="upcoming-schedule">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" aria-hidden="true" />
                לוח זמנים קרוב
              </h2>
              <Link to="/schedules" className="text-sm text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors">
                הצג הכל
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>

            {upcomingSessions.length === 0 ? (
              <p className="text-zinc-500 text-center py-8">אין מפגשים קרובים</p>
            ) : (
              <div className="space-y-3">
                {upcomingSessions.map((session) => (
                  <div
                    key={session.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                      session.is_break
                        ? 'bg-orange-500/5 border-orange-500/20'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <div className={`w-2 h-2 rounded-full mt-1.5 ${session.is_break ? 'bg-orange-400' : 'bg-blue-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{session.title}</p>
                      <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" aria-hidden="true" />
                          {formatTime(session.start_time)} - {formatTime(session.end_time)}
                        </span>
                        {session.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" aria-hidden="true" />
                            {session.location}
                          </span>
                        )}
                      </div>
                      {session.speaker_name && (
                        <p className="text-xs text-blue-400 mt-1">{session.speaker_name}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Recent Activity */}
        {recentMsgLoading ? <SectionSkeleton /> : (
          <div className="bg-[#1a1d27]/60 backdrop-blur-sm rounded-2xl border border-white/10 p-6" data-testid="recent-activity">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-400" aria-hidden="true" />
                פעילות אחרונה
              </h2>
              <Link to="/messages" className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
                הצג הכל
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>

            {recentMessages.length === 0 ? (
              <p className="text-zinc-500 text-center py-8">אין פעילות אחרונה</p>
            ) : (
              <div className="space-y-3">
                {recentMessages.map((msg) => {
                  const recipientName = msg.participants
                    ? (msg.participants.full_name || `${msg.participants.first_name} ${msg.participants.last_name}`)
                    : msg.to_phone || '-'
                  return (
                    <div key={msg.id} className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                      <div className="flex-shrink-0 mt-1">
                        <MessageSquare className="w-4 h-4 text-zinc-500" aria-hidden="true" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-white text-sm font-medium truncate">{recipientName}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${
                            msg.status === 'delivered' || msg.status === 'read'
                              ? 'bg-green-900/40 text-green-300'
                              : msg.status === 'failed'
                                ? 'bg-red-900/40 text-red-300'
                                : 'bg-zinc-700 text-zinc-300'
                          }`}>
                            {messageStatusHebrew[msg.status] || msg.status}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 truncate mt-0.5">{msg.content}</p>
                        <p className="text-xs text-zinc-600 mt-1">{formatDateTime(msg.created_at)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Global Overview Dashboard (no event selected)
// ────────────────────────────────────────────────────────────────────────────

function GlobalDashboard() {
  // Global stats
  const { data: globalStats, isLoading: statsLoading } = useQuery({
    queryKey: dashboardKeys.globalStats(),
    queryFn: async (): Promise<GlobalStats> => {
      const { data, error } = await supabase
        .from('events')
        .select('status')

      if (error) throw error

      const stats: GlobalStats = { active: 0, completed: 0, draft: 0, planning: 0, total: 0 }
      stats.total = data?.length || 0
      data?.forEach(e => {
        if (e.status === 'active') stats.active++
        else if (e.status === 'completed') stats.completed++
        else if (e.status === 'draft') stats.draft++
        else if (e.status === 'planning') stats.planning++
      })
      return stats
    },
    staleTime: 30_000,
  })

  // Upcoming events (next 3 sorted by date)
  const { data: upcomingEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: dashboardKeys.upcomingEvents(),
    queryFn: async (): Promise<GlobalEventSummary[]> => {
      const now = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('events')
        .select('id, name, status, start_date, venue_name')
        .gte('start_date', now)
        .in('status', ['active', 'planning', 'draft'])
        .order('start_date', { ascending: true })
        .limit(3)

      if (error) throw error

      // Get participant counts
      const eventsWithCounts = await Promise.all(
        (data || []).map(async (event) => {
          const { count } = await supabase
            .from('participants')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', event.id)

          return { ...event, participants_count: count || 0 } as GlobalEventSummary
        })
      )

      return eventsWithCounts
    },
    staleTime: 30_000,
  })

  return (
    <div className="space-y-8" data-testid="global-dashboard">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shadow-amber-500/20">
          <LayoutDashboard className="w-5 h-5 text-white" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white" data-testid="dashboard-title">לוח בקרה</h1>
          <p className="text-zinc-400 text-sm mt-0.5">סקירה כללית - בחר אירוע לפרטים נוספים</p>
        </div>
      </div>

      {/* Global Stats */}
      {statsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <StatCardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="global-stats">
          <div className="premium-stats-card orange">
            <div className="flex items-center justify-between mb-3">
              <span className="text-zinc-400 text-sm font-medium">סה"כ אירועים</span>
              <Calendar className="w-5 h-5 text-orange-400" aria-hidden="true" />
            </div>
            <p className="text-4xl font-bold text-white">{globalStats?.total || 0}</p>
          </div>

          <div className="premium-stats-card success">
            <div className="flex items-center justify-between mb-3">
              <span className="text-zinc-400 text-sm font-medium">פעילים</span>
              <CheckCircle className="w-5 h-5 text-green-400" aria-hidden="true" />
            </div>
            <p className="text-4xl font-bold text-green-400">{globalStats?.active || 0}</p>
            <p className="text-xs text-zinc-500 mt-1">+ {globalStats?.planning || 0} בתכנון</p>
          </div>

          <div className="premium-stats-card yellow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-zinc-400 text-sm font-medium">הושלמו</span>
              <CheckSquare className="w-5 h-5 text-amber-400" aria-hidden="true" />
            </div>
            <p className="text-4xl font-bold text-amber-400">{globalStats?.completed || 0}</p>
          </div>

          <div className="premium-stats-card white">
            <div className="flex items-center justify-between mb-3">
              <span className="text-zinc-400 text-sm font-medium">טיוטות</span>
              <HelpCircle className="w-5 h-5 text-zinc-300" aria-hidden="true" />
            </div>
            <p className="text-4xl font-bold text-zinc-300">{globalStats?.draft || 0}</p>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-[#1a1d27]/60 backdrop-blur-sm rounded-2xl border border-white/10 p-6" data-testid="quick-actions">
        <h2 className="text-lg font-bold text-white mb-4">פעולות מהירות</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/events"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 hover:-translate-y-0.5 transition-all duration-300"
          >
            <Plus className="w-5 h-5" aria-hidden="true" />
            אירוע חדש
          </Link>
          <Link
            to="/guests"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1a1d27] border border-white/10 text-zinc-300 rounded-xl font-medium hover:bg-white/5 hover:border-white/20 transition-all duration-300"
          >
            <Upload className="w-5 h-5" aria-hidden="true" />
            ייבוא אורחים
          </Link>
        </div>
      </div>

      {/* Upcoming Events */}
      {eventsLoading ? <SectionSkeleton /> : (
        <div className="bg-[#1a1d27]/60 backdrop-blur-sm rounded-2xl border border-white/10 p-6" data-testid="upcoming-events">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-amber-400" aria-hidden="true" />
              אירועים קרובים
            </h2>
            <Link to="/events" className="text-sm text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors">
              הצג הכל
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>

          {upcomingEvents.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-zinc-600 mx-auto mb-3" aria-hidden="true" />
              <p className="text-zinc-500">אין אירועים קרובים</p>
              <Link to="/events" className="text-amber-400 hover:text-amber-300 text-sm mt-2 inline-block transition-colors">
                צור אירוע חדש
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingEvents.map((event) => {
                const daysInfo = getDaysUntilEvent(event.start_date)
                return (
                  <Link
                    key={event.id}
                    to="/events"
                    className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-200 group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400/20 to-orange-500/20 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-6 h-6 text-amber-400" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate group-hover:text-amber-400 transition-colors">{event.name}</p>
                      <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1">
                        <span>{formatDate(event.start_date)}</span>
                        {event.venue_name && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" aria-hidden="true" />
                            {event.venue_name}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" aria-hidden="true" />
                          {event.participants_count || 0}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className={`text-sm font-medium ${daysInfo.color}`}>{daysInfo.label}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        event.status === 'active'
                          ? 'bg-green-900/40 text-green-300'
                          : event.status === 'planning'
                            ? 'bg-blue-900/40 text-blue-300'
                            : 'bg-zinc-700 text-zinc-300'
                      }`}>
                        {statusLabelsHebrew[event.status] || event.status}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Main Dashboard Page
// ────────────────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { session } = useAuth()
  const { selectedEvent, loading: eventLoading } = useEvent()

  if (!session?.access_token) {
    return (
      <div className="p-8 relative z-10">
        <h1 className="text-3xl font-bold text-white" data-testid="dashboard-title">לוח בקרה</h1>
        <p className="text-zinc-400 mt-4">יש להתחבר כדי לצפות בלוח הבקרה</p>
      </div>
    )
  }

  if (eventLoading) {
    return (
      <div className="p-8 relative z-10 flex justify-center items-center min-h-[400px]" role="status" aria-busy="true" aria-live="polite">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-amber-400/30 blur-2xl rounded-full animate-pulse" />
            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Loader2 className="w-8 h-8 text-white animate-spin" aria-hidden="true" />
            </div>
          </div>
          <p className="text-zinc-400 font-medium">טוען לוח בקרה...</p>
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

      {selectedEvent ? (
        <EventDashboard
          eventId={selectedEvent.id}
          eventName={selectedEvent.name}
          startDate={selectedEvent.start_date}
        />
      ) : (
        <GlobalDashboard />
      )}
    </div>
  )
}
