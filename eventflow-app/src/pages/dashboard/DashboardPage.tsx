// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - Dashboard Page
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

export function DashboardPage() {
  const { session } = useAuth()
  const [stats, setStats] = useState({ events: 0, participants: 0, tasks: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session?.access_token) {
      setLoading(false)
      return
    }

    async function fetchStats() {
      try {
        const [eventsRes, participantsRes, tasksRes] = await Promise.all([
          supabase.from('events').select('id', { count: 'exact', head: true }),
          supabase.from('participants').select('id', { count: 'exact', head: true }),
          supabase.from('checklist_items').select('id', { count: 'exact', head: true }).eq('status', 'pending')
        ])

        setStats({
          events: eventsRes.count || 0,
          participants: participantsRes.count || 0,
          tasks: tasksRes.count || 0
        })
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [session?.access_token])

  return (
    <div className="p-8 relative z-10">
      <h1 className="text-3xl font-semibold mb-8 text-gradient glow-text tracking-tight" data-testid="dashboard-title">לוח בקרה</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-list">
        <Link to="/events" className="premium-stats-card orange group" data-testid="events-card">
          <h2 className="text-base font-medium mb-4 text-zinc-400 tracking-wide">אירועים פעילים</h2>
          <p className="text-5xl font-bold text-gradient transition-transform duration-300 group-hover:scale-105">
            {loading ? <Loader2 className="animate-spin text-orange-500" /> : stats.events}
          </p>
          <p className="text-xs text-zinc-500 mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">לחץ לצפייה באירועים</p>
        </Link>
        <Link to="/guests" className="premium-stats-card yellow group" data-testid="guests-card">
          <h2 className="text-base font-medium mb-4 text-zinc-400 tracking-wide">אורחים רשומים</h2>
          <p className="text-5xl font-bold text-gradient transition-transform duration-300 group-hover:scale-105">
            {loading ? <Loader2 className="animate-spin text-yellow-500" /> : stats.participants}
          </p>
          <p className="text-xs text-zinc-500 mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">לחץ לניהול אורחים</p>
        </Link>
        <Link to="/checklist" className="premium-stats-card white group" data-testid="tasks-card">
          <h2 className="text-base font-medium mb-4 text-zinc-400 tracking-wide">משימות פתוחות</h2>
          <p className="text-5xl font-bold text-white transition-transform duration-300 group-hover:scale-105">
            {loading ? <Loader2 className="animate-spin text-white" /> : stats.tasks}
          </p>
          <p className="text-xs text-zinc-500 mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">לחץ לצפייה במשימות</p>
        </Link>
      </div>
    </div>
  )
}
