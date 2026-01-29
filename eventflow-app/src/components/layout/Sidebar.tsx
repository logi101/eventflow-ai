// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - Navigation Sidebar (Premium Design - Collapsible Accordion)
// ═══════════════════════════════════════════════════════════════════════════

import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Home,
  Calendar,
  Users,
  Truck,
  CheckSquare,
  MessageCircle,
  Bot,
  ClipboardList,
  FileQuestion,
  QrCode,
  PieChart,
  Bell,
  ChevronLeft,
  Settings,
  Zap,
  ShieldCheck,
  PanelRightClose,
  PanelRightOpen
} from 'lucide-react'
import { useEvent } from '../../contexts/EventContext'
import { useAuth } from '../../contexts/AuthContext'
import { PushNotificationSettings } from '../PushNotificationSettings'

// Links for when NO event is selected (home view)
const homeLinks = [
  { to: '/', icon: Home, label: 'כל האירועים' },
]

// Links for when an event IS selected (event-specific view)
const eventLinks = [
  { to: '/event/dashboard', icon: Home, label: 'דשבורד אירוע' },
  { to: '/event/guests', icon: Users, label: 'אורחים' },
  { to: '/event/schedule', icon: ClipboardList, label: 'לו"ז' },
  { to: '/event/program', icon: Bell, label: 'ניהול תוכניה' },
  { to: '/event/messages', icon: MessageCircle, label: 'הודעות' },
  { to: '/event/checklist', icon: CheckSquare, label: 'צ\'קליסט' },
  { to: '/event/vendors', icon: Truck, label: 'ספקים' },
  { to: '/event/checkin', icon: QrCode, label: 'צ\'ק-אין' },
  { to: '/event/feedback', icon: FileQuestion, label: 'משוב' },
  { to: '/event/reports', icon: PieChart, label: 'דוחות' },
  { to: '/event/reminder-settings', icon: Zap, label: 'הגדרות תזכורות' },
]

// Global links (always visible)
const globalLinks = [
  { to: '/ai', icon: Bot, label: 'עוזר AI' },
]

export function Sidebar() {
  const location = useLocation()
  const { selectedEvent, clearSelectedEvent } = useEvent()
  const { isSuperAdmin } = useAuth()
  const [isOpen, setIsOpen] = useState(true)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500'
      case 'planning': return 'bg-amber-500'
      case 'draft': return 'bg-gray-400'
      case 'completed': return 'bg-blue-500'
      default: return 'bg-gray-400'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'פעיל'
      case 'planning': return 'בתכנון'
      case 'draft': return 'טיוטה'
      case 'completed': return 'הושלם'
      default: return status
    }
  }

  // Collapsed sidebar - just toggle button
  if (!isOpen) {
    return (
      <aside
        className="w-14 h-screen sticky top-0 flex flex-col items-center py-4 relative"
        style={{
          background: 'linear-gradient(180deg, rgba(15, 17, 23, 0.98) 0%, rgba(8, 9, 13, 0.98) 100%)',
          borderLeft: '1px solid rgba(255, 255, 255, 0.06)'
        }}
        data-testid="sidebar-collapsed"
      >
        {/* Accent line */}
        <div
          className="absolute top-0 right-0 w-[2px] h-full opacity-60"
          style={{
            background: 'linear-gradient(180deg, #f97316 0%, #fbbf24 40%, transparent 100%)'
          }}
        />

        <button
          onClick={() => setIsOpen(true)}
          className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-all duration-200"
          title="פתח תפריט"
        >
          <PanelRightOpen size={20} />
        </button>
      </aside>
    )
  }

  return (
    <aside
      className="w-64 h-screen sticky top-0 p-6 flex flex-col relative overflow-y-auto overflow-x-hidden backdrop-blur-xl"
      style={{
        background: 'linear-gradient(180deg, rgba(15, 17, 23, 0.98) 0%, rgba(8, 9, 13, 0.98) 100%)',
        borderLeft: '1px solid rgba(255, 255, 255, 0.06)'
      }}
      data-testid="sidebar"
    >
      {/* Subtle gradient accent on the right edge */}
      <div
        className="absolute top-0 right-0 w-[2px] h-full opacity-60"
        style={{
          background: 'linear-gradient(180deg, #f97316 0%, #fbbf24 40%, transparent 100%)'
        }}
      />

      {/* Logo + Collapse button */}
      <div className="mb-8 pt-2 flex items-start justify-between">
        <Link to="/" className="block group flex-1">
          <h1
            className="text-2xl font-bold text-gradient glow-text transition-all duration-300 group-hover:scale-[1.02]"
            style={{
              textShadow: '0 0 30px rgba(249, 115, 22, 0.3)'
            }}
            data-testid="app-logo"
          >
            EventFlow AI
          </h1>
          <p className="text-zinc-500 text-sm mt-1.5 tracking-wide">מערכת הפקת אירועים</p>
        </Link>
        <button
          onClick={() => setIsOpen(false)}
          className="p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-white/10 transition-all duration-200 -mt-1 -ml-2"
          title="סגור תפריט"
        >
          <PanelRightClose size={18} />
        </button>
      </div>

      {/* Selected Event Card (when event is selected) */}
      {selectedEvent && (
        <div
          className="mb-8 p-5 rounded-2xl border transition-all duration-300 hover:shadow-premium-glow"
          style={{
            background: 'linear-gradient(145deg, rgba(249, 115, 22, 0.12) 0%, rgba(249, 115, 22, 0.04) 100%)',
            borderColor: 'rgba(249, 115, 22, 0.2)'
          }}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-white truncate text-sm leading-tight">
                {selectedEvent.name}
              </h3>
              <div className="flex items-center gap-2.5 mt-2">
                <span className={`w-2 h-2 rounded-full ${getStatusColor(selectedEvent.status)} shadow-lg`} />
                <span className="text-xs text-zinc-400 font-medium">{getStatusLabel(selectedEvent.status)}</span>
              </div>
            </div>
            {selectedEvent.event_types?.icon && (
              <span className="text-xl">{selectedEvent.event_types.icon}</span>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs text-zinc-400 mt-4">
            <span className="flex items-center gap-1.5">
              <Users size={12} className="opacity-70" />
              {selectedEvent.participants_count || 0}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar size={12} className="opacity-70" />
              {new Date(selectedEvent.start_date).toLocaleDateString('he-IL')}
            </span>
          </div>

          <button
            onClick={clearSelectedEvent}
            className="mt-4 w-full flex items-center justify-center gap-2.5 py-2.5 text-xs text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200"
          >
            <ChevronLeft size={14} />
            חזרה לכל האירועים
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1">
        {/* Home Links (when no event selected) */}
        {!selectedEvent && (
          <div className="mb-6">
            <ul className="space-y-1.5">
              {homeLinks.map(({ to, icon: Icon, label }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className={`flex items-center gap-3.5 px-4 py-3.5 rounded-xl font-medium text-[15px] transition-all duration-200 relative overflow-hidden
                      ${location.pathname === to
                        ? 'text-white bg-gradient-to-l from-orange-500/20 to-yellow-500/10 shadow-[0_0_20px_rgba(249,115,22,0.2)]'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5 hover:translate-x-[-4px]'
                      }`}
                    data-testid={`nav-${to.replace('/', '') || 'home'}`}
                  >
                    {location.pathname === to && (
                      <span
                        className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] rounded-l-full"
                        style={{
                          background: 'linear-gradient(180deg, #f97316 0%, #fbbf24 100%)',
                          boxShadow: '0 0 10px rgba(249, 115, 22, 0.5)'
                        }}
                      />
                    )}
                    <Icon size={18} className={location.pathname === to ? 'text-orange-400' : ''} />
                    <span>{label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Event-Specific Links (when event selected) */}
        {selectedEvent && (
          <div className="mb-6">
            <p className="text-[11px] text-zinc-500 font-semibold mb-3 px-4 uppercase tracking-wider">ניהול אירוע</p>
            <ul className="space-y-1">
              {eventLinks.map(({ to, icon: Icon, label }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className={`flex items-center gap-3.5 px-4 py-3 rounded-xl font-medium text-[14px] transition-all duration-200 relative overflow-hidden
                      ${location.pathname === to
                        ? 'text-white bg-gradient-to-l from-orange-500/20 to-yellow-500/10 shadow-[0_0_20px_rgba(249,115,22,0.2)]'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5 hover:translate-x-[-4px]'
                      }`}
                    data-testid={`nav-${to.replace('/event/', '')}`}
                  >
                    {location.pathname === to && (
                      <span
                        className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] rounded-l-full"
                        style={{
                          background: 'linear-gradient(180deg, #f97316 0%, #fbbf24 100%)',
                          boxShadow: '0 0 10px rgba(249, 115, 22, 0.5)'
                        }}
                      />
                    )}
                    <Icon size={17} className={location.pathname === to ? 'text-orange-400' : ''} />
                    <span>{label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Global Links */}
        <div className="mt-6 pt-6 border-t border-zinc-700/30">
          <p className="text-[11px] text-zinc-500 font-semibold mb-3 px-4 uppercase tracking-wider">כלים</p>
          <ul className="space-y-1.5">
            {globalLinks.map(({ to, icon: Icon, label }) => (
              <li key={to}>
                <Link
                  to={to}
                  className={`flex items-center gap-3.5 px-4 py-3.5 rounded-xl font-medium text-[15px] transition-all duration-200 relative overflow-hidden
                    ${location.pathname === to
                      ? 'text-white bg-gradient-to-l from-orange-500/20 to-yellow-500/10 shadow-[0_0_20px_rgba(249,115,22,0.2)]'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5 hover:translate-x-[-4px]'
                    }`}
                  data-testid={`nav-${to.replace('/', '')}`}
                >
                  {location.pathname === to && (
                    <span
                      className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] rounded-l-full"
                      style={{
                        background: 'linear-gradient(180deg, #f97316 0%, #fbbf24 100%)',
                        boxShadow: '0 0 10px rgba(249, 115, 22, 0.5)'
                      }}
                    />
                  )}
                  <Icon size={18} className={location.pathname === to ? 'text-orange-400' : ''} />
                  <span>{label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Admin Links (super_admin only) */}
        {isSuperAdmin && (
          <div className="mt-6 pt-6 border-t border-zinc-700/30">
            <p className="text-[11px] text-zinc-500 font-semibold mb-3 px-4 uppercase tracking-wider">ניהול מערכת</p>
            <ul className="space-y-1.5">
              <li>
                <Link
                  to="/admin/users"
                  className={`flex items-center gap-3.5 px-4 py-3.5 rounded-xl font-medium text-[15px] transition-all duration-200 relative overflow-hidden
                    ${location.pathname === '/admin/users'
                      ? 'text-white bg-gradient-to-l from-orange-500/20 to-yellow-500/10 shadow-[0_0_20px_rgba(249,115,22,0.2)]'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5 hover:translate-x-[-4px]'
                    }`}
                  data-testid="nav-admin-users"
                >
                  {location.pathname === '/admin/users' && (
                    <span
                      className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] rounded-l-full"
                      style={{
                        background: 'linear-gradient(180deg, #f97316 0%, #fbbf24 100%)',
                        boxShadow: '0 0 10px rgba(249, 115, 22, 0.5)'
                      }}
                    />
                  )}
                  <ShieldCheck size={18} className={location.pathname === '/admin/users' ? 'text-orange-400' : ''} />
                  <span>ניהול משתמשים</span>
                </Link>
              </li>
            </ul>
          </div>
        )}
      </nav>

      {/* Push Notifications */}
      <div className="mt-6 pt-6 border-t border-zinc-700/30">
        <PushNotificationSettings />
      </div>

      {/* Bottom Actions */}
      <div className="mt-4 pt-4 border-t border-zinc-700/30">
        <Link
          to="/settings"
          className="flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all duration-200 font-medium text-[15px]"
        >
          <Settings size={18} />
          <span>הגדרות</span>
        </Link>
      </div>
    </aside>
  )
}

export default Sidebar
