import { useState, useEffect } from 'react'
import { Calendar, Users, CheckSquare, DollarSign, MessageCircle, FileQuestion, UserCheck, FileText, Download, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Event, ReportStats } from '../../types'
import * as XLSX from 'xlsx'

export function ReportsPage() {
  const [stats, setStats] = useState<ReportStats | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [eventStats, setEventStats] = useState<{
    participants: { total: number; byStatus: Record<string, number> }
    checklist: { total: number; completed: number }
    vendors: number
    budget: number | null
  } | null>(null)

  async function fetchOverallStats() {
    setLoading(true)

    // Fetch all counts in parallel
    const [
      eventsRes,
      participantsRes,
      vendorsRes,
      checklistRes,
      messagesRes,
      surveysRes,
      responsesRes
    ] = await Promise.all([
      supabase.from('events').select('id, status, budget'),
      supabase.from('participants').select('id, status'),
      supabase.from('vendors').select('id', { count: 'exact', head: true }),
      supabase.from('checklist_items').select('id, is_completed'),
      supabase.from('messages').select('id', { count: 'exact', head: true }),
      supabase.from('feedback_surveys').select('id', { count: 'exact', head: true }),
      supabase.from('feedback_responses').select('id', { count: 'exact', head: true })
    ])

    const events = eventsRes.data || []
    const participants = participantsRes.data || []
    const checklistItems = checklistRes.data || []

    setStats({
      totalEvents: events.length,
      activeEvents: events.filter(e => e.status === 'active').length,
      completedEvents: events.filter(e => e.status === 'completed').length,
      totalParticipants: participants.length,
      checkedInParticipants: participants.filter(p => p.status === 'checked_in').length,
      totalVendors: vendorsRes.count || 0,
      totalBudget: events.reduce((sum, e) => sum + (e.budget || 0), 0),
      totalChecklistItems: checklistItems.length,
      completedChecklistItems: checklistItems.filter(c => c.is_completed).length,
      totalMessages: messagesRes.count || 0,
      totalSurveys: surveysRes.count || 0,
      totalResponses: responsesRes.count || 0
    })

    setLoading(false)
  }

  async function fetchEvents() {
    const { data } = await supabase.from('events').select('*').order('start_date', { ascending: false })
    if (data) setEvents(data)
  }

  async function fetchEventStats() {
    if (!selectedEventId) return

    const [participantsRes, checklistRes, vendorsRes, eventRes] = await Promise.all([
      supabase.from('participants').select('id, status').eq('event_id', selectedEventId),
      supabase.from('checklist_items').select('id, is_completed').eq('event_id', selectedEventId),
      supabase.from('event_vendors').select('id', { count: 'exact', head: true }).eq('event_id', selectedEventId),
      supabase.from('events').select('budget').eq('id', selectedEventId).single()
    ])

    const participants = participantsRes.data || []
    const checklist = checklistRes.data || []

    const byStatus: Record<string, number> = {}
    participants.forEach(p => {
      byStatus[p.status] = (byStatus[p.status] || 0) + 1
    })

    setEventStats({
      participants: {
        total: participants.length,
        byStatus
      },
      checklist: {
        total: checklist.length,
        completed: checklist.filter(c => c.is_completed).length
      },
      vendors: vendorsRes.count || 0,
      budget: eventRes.data?.budget || null
    })
  }

  useEffect(() => {
    fetchOverallStats()
    fetchEvents()
  }, [])

  useEffect(() => {
    if (selectedEventId) {
      fetchEventStats()
    } else {
      setEventStats(null)
    }
  }, [selectedEventId])

  async function exportReport() {
    if (!stats) return

    const reportData = [
      ['EventFlow AI - דוח סיכום'],
      [''],
      ['תאריך הפקה', new Date().toLocaleDateString('he-IL')],
      [''],
      ['סיכום כללי'],
      ['סך הכל אירועים', stats.totalEvents],
      ['אירועים פעילים', stats.activeEvents],
      ['אירועים שהושלמו', stats.completedEvents],
      [''],
      ['משתתפים'],
      ['סך הכל משתתפים', stats.totalParticipants],
      ['נרשמו (Check-in)', stats.checkedInParticipants],
      [''],
      ['ספקים'],
      ['סך הכל ספקים', stats.totalVendors],
      [''],
      ['תקציב'],
      ['תקציב כולל', `₪${stats.totalBudget.toLocaleString()}`],
      [''],
      ['משימות'],
      ['סך הכל משימות', stats.totalChecklistItems],
      ['משימות שהושלמו', stats.completedChecklistItems],
      [''],
      ['תקשורת'],
      ['סך הכל הודעות', stats.totalMessages],
      [''],
      ['משוב'],
      ['סך הכל סקרים', stats.totalSurveys],
      ['סך הכל תשובות', stats.totalResponses]
    ]

    const ws = XLSX.utils.aoa_to_sheet(reportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'דוח סיכום')
    XLSX.writeFile(wb, `eventflow-report-${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const checklistPercentage = stats && stats.totalChecklistItems > 0
    ? Math.round((stats.completedChecklistItems / stats.totalChecklistItems) * 100)
    : 0

  const checkinPercentage = stats && stats.totalParticipants > 0
    ? Math.round((stats.checkedInParticipants / stats.totalParticipants) * 100)
    : 0

  return (
    <div className="p-8" data-testid="reports-panel">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold" data-testid="reports-title">דוחות</h1>
        <button
          className="btn-primary flex items-center gap-2"
          onClick={exportReport}
          disabled={!stats}
          data-testid="export-report-btn"
        >
          <Download className="w-4 h-4" />
          ייצא לאקסל
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
        </div>
      ) : stats && (
        <>
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold">{stats.totalEvents}</p>
                  <p className="text-blue-100">אירועים</p>
                </div>
                <Calendar className="w-10 h-10 text-blue-200" />
              </div>
              <div className="mt-2 text-sm">
                <span className="text-green-300">{stats.activeEvents} פעילים</span>
                <span className="mx-2">•</span>
                <span className="text-blue-200">{stats.completedEvents} הושלמו</span>
              </div>
            </div>

            <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold">{stats.totalParticipants}</p>
                  <p className="text-purple-100">משתתפים</p>
                </div>
                <Users className="w-10 h-10 text-purple-200" />
              </div>
              <div className="mt-2">
                <div className="h-2 bg-purple-400 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#1a1d27] rounded-full"
                    style={{ width: `${checkinPercentage}%` }}
                  />
                </div>
                <p className="text-sm mt-1">{checkinPercentage}% נרשמו</p>
              </div>
            </div>

            <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold">₪{stats.totalBudget.toLocaleString()}</p>
                  <p className="text-green-100">תקציב כולל</p>
                </div>
                <DollarSign className="w-10 h-10 text-green-200" />
              </div>
              <div className="mt-2 text-sm">
                <span>{stats.totalVendors} ספקים פעילים</span>
              </div>
            </div>

            <div className="card bg-gradient-to-br from-orange-500 to-orange-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold">{stats.totalChecklistItems}</p>
                  <p className="text-orange-100">משימות</p>
                </div>
                <CheckSquare className="w-10 h-10 text-orange-200" />
              </div>
              <div className="mt-2">
                <div className="h-2 bg-orange-400 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#1a1d27] rounded-full"
                    style={{ width: `${checklistPercentage}%` }}
                  />
                </div>
                <p className="text-sm mt-1">{checklistPercentage}% הושלמו</p>
              </div>
            </div>
          </div>

          {/* Detailed Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="card" data-testid="communication-stats">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-blue-500" />
                תקשורת
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">הודעות נשלחו</span>
                  <span className="font-bold">{stats.totalMessages}</span>
                </div>
              </div>
            </div>

            <div className="card" data-testid="feedback-stats">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileQuestion className="w-5 h-5 text-purple-500" />
                משוב
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">סקרים פעילים</span>
                  <span className="font-bold">{stats.totalSurveys}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">תשובות התקבלו</span>
                  <span className="font-bold">{stats.totalResponses}</span>
                </div>
              </div>
            </div>

            <div className="card" data-testid="checkin-stats">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-green-500" />
                צ'ק-אין
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">נרשמו</span>
                  <span className="font-bold text-emerald-400">{stats.checkedInParticipants}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">ממתינים</span>
                  <span className="font-bold text-orange-400">{stats.totalParticipants - stats.checkedInParticipants}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Event-specific Report */}
          <div className="card" data-testid="event-report">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              דוח לפי אירוע
            </h3>
            <div className="mb-4">
              <select
                className="input w-64"
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                data-testid="report-event-select"
              >
                <option value="">בחר אירוע...</option>
                {events.map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>

            {eventStats && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white/5 p-4 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{eventStats.participants.total}</p>
                  <p className="text-zinc-400">משתתפים</p>
                  <div className="mt-2 text-xs space-y-1">
                    {Object.entries(eventStats.participants.byStatus).map(([status, count]) => (
                      <div key={status} className="flex justify-between">
                        <span>{status}</span>
                        <span>{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white/5 p-4 rounded-lg">
                  <p className="text-2xl font-bold text-emerald-400">
                    {eventStats.checklist.total > 0
                      ? Math.round((eventStats.checklist.completed / eventStats.checklist.total) * 100)
                      : 0}%
                  </p>
                  <p className="text-zinc-400">צ'קליסט הושלם</p>
                  <p className="text-sm text-zinc-400 mt-1">
                    {eventStats.checklist.completed}/{eventStats.checklist.total} משימות
                  </p>
                </div>
                <div className="bg-white/5 p-4 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">{eventStats.vendors}</p>
                  <p className="text-zinc-400">ספקים מקושרים</p>
                </div>
                <div className="bg-white/5 p-4 rounded-lg">
                  <p className="text-2xl font-bold text-orange-400">
                    {eventStats.budget ? `₪${eventStats.budget.toLocaleString()}` : 'לא הוגדר'}
                  </p>
                  <p className="text-zinc-400">תקציב</p>
                </div>
              </div>
            )}

            {!selectedEventId && (
              <p className="text-zinc-400 text-center py-4">בחר אירוע לצפייה בדוח מפורט</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
