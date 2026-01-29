// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - Navigation Sidebar (Premium Design - Responsive + Collapsible)
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
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
  PanelLeftOpen,
  PanelLeftClose,
  Menu,
  X
} from 'lucide-react'
import { useEvent } from '../../contexts/EventContext'
import { useAuth } from '../../contexts/AuthContext'
import { PushNotificationSettings } from '../PushNotificationSettings'

// ── Mobile detection hook ──
const MOBILE_BREAKPOINT = 768

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false
  )

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mql.addEventListener('change', handler)
    setIsMobile(mql.matches)
    return () => mql.removeEventListener('change', handler)
  }, [])

  return isMobile
}

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
  const isMobile = useIsMobile()
  const [isOpen, setIsOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= MOBILE_BREAKPOINT : true
  )

  // Auto-close on mobile, auto-open on desktop when resizing
  useEffect(() => {
    setIsOpen(!isMobile)
  }, [isMobile])

  // Close sidebar on navigation (mobile only)
  useEffect(() => {
    if (isMobile) {
      setIsOpen(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  // Close on Escape key
  useEffect(() => {
    if (!isMobile || !isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isMobile, isOpen])

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

  return (
    <>
      {/* ── Mobile Hamburger Button (visible when sidebar closed on mobile) ── */}
      {isMobile && !isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed top-4 right-4 z-50 p-3 rounded-2xl text-white shadow-lg"
          style={{
            background: 'linear-gradient(135deg, #f97316 0%, #f59e0b 100%)',
            boxShadow: '0 4px 20px rgba(249, 115, 22, 0.4)',
          }}
          aria-label="פתח תפריט"
          data-testid="mobile-menu-btn"
        >
          <Menu size={22} />
        </button>
      )}

      {/* ── Mobile Backdrop Overlay ── */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 z-40"
          style={{
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            transition: 'opacity 300ms ease',
          }}
          onClick={() => setIsOpen(false)}
          data-testid="sidebar-backdrop"
        />
      )}

      <aside
        className={`h-screen flex flex-col relative backdrop-blur-xl shrink-0 ${
          isMobile ? 'fixed top-0 right-0 z-50' : 'sticky top-0'
        }`}
        style={{
          width: isMobile
            ? (isOpen ? '17rem' : '0')
            : (isOpen ? '16rem' : '3.5rem'),
          transition: 'width 300ms cubic-bezier(0.4, 0, 0.2, 1)',
          background: 'linear-gradient(180deg, rgba(15, 17, 23, 0.98) 0%, rgba(8, 9, 13, 0.98) 100%)',
          borderLeft: isMobile ? 'none' : '1px solid rgba(255, 255, 255, 0.06)',
          boxShadow: isMobile && isOpen ? '-10px 0 40px rgba(0, 0, 0, 0.5)' : 'none',
          overflow: 'hidden',
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

        {/* Scrollable inner content */}
        <div
          className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden"
          style={{
            padding: isOpen ? '1.5rem' : (isMobile ? '0' : '1rem 0.5rem'),
            minWidth: isMobile ? '17rem' : undefined,
          }}
        >
          {/* ── Logo + Toggle ── */}
          <div className={`mb-8 pt-2 flex items-center ${isOpen ? 'justify-between' : 'justify-center'}`}>
            {isOpen && (
              <Link to="/" className="block group flex-1 min-w-0">
                <h1
                  className="text-2xl font-bold text-gradient glow-text transition-all duration-300 group-hover:scale-[1.02]"
                  style={{ textShadow: '0 0 30px rgba(249, 115, 22, 0.3)' }}
                  data-testid="app-logo"
                >
                  EventFlow AI
                </h1>
                <p className="text-zinc-500 text-sm mt-1.5 tracking-wide">מערכת הפקת אירועים</p>
              </Link>
            )}
            <button
              onClick={() => setIsOpen(prev => !prev)}
              className="p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-white/10 transition-all duration-200 shrink-0"
              title={isOpen ? 'סגור תפריט' : 'פתח תפריט'}
            >
              {isMobile && isOpen ? <X size={20} /> : isOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
            </button>
          </div>

        {/* ── Selected Event Card ── */}
        {selectedEvent && isOpen && (
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

        {/* ── Navigation ── */}
        <nav className="flex-1">
          {/* Home Links (when no event selected) */}
          {!selectedEvent && (
            <div className="mb-6">
              <ul className="space-y-1.5">
                {homeLinks.map(({ to, icon: Icon, label }) => (
                  <li key={to}>
                    <Link
                      to={to}
                      className={`flex items-center gap-3.5 rounded-xl font-medium transition-all duration-200 relative overflow-hidden
                        ${isOpen ? 'px-4 py-3.5 text-[15px]' : 'justify-center px-0 py-3'}
                        ${location.pathname === to
                          ? 'text-white bg-gradient-to-l from-orange-500/20 to-yellow-500/10 shadow-[0_0_20px_rgba(249,115,22,0.2)]'
                          : 'text-zinc-400 hover:text-white hover:bg-white/5'
                        }`}
                      title={!isOpen ? label : undefined}
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
                      <Icon size={18} className={`shrink-0 ${location.pathname === to ? 'text-orange-400' : ''}`} />
                      {isOpen && <span>{label}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Event-Specific Links (when event selected) */}
          {selectedEvent && (
            <div className="mb-6">
              {isOpen && (
                <p className="text-[11px] text-zinc-500 font-semibold mb-3 px-4 uppercase tracking-wider">ניהול אירוע</p>
              )}
              <ul className="space-y-1">
                {eventLinks.map(({ to, icon: Icon, label }) => (
                  <li key={to}>
                    <Link
                      to={to}
                      className={`flex items-center gap-3.5 rounded-xl font-medium transition-all duration-200 relative overflow-hidden
                        ${isOpen ? 'px-4 py-3 text-[14px]' : 'justify-center px-0 py-2.5'}
                        ${location.pathname === to
                          ? 'text-white bg-gradient-to-l from-orange-500/20 to-yellow-500/10 shadow-[0_0_20px_rgba(249,115,22,0.2)]'
                          : 'text-zinc-400 hover:text-white hover:bg-white/5'
                        }`}
                      title={!isOpen ? label : undefined}
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
                      <Icon size={17} className={`shrink-0 ${location.pathname === to ? 'text-orange-400' : ''}`} />
                      {isOpen && <span>{label}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Global Links */}
          <div className="mt-6 pt-6 border-t border-zinc-700/30">
            {isOpen && (
              <p className="text-[11px] text-zinc-500 font-semibold mb-3 px-4 uppercase tracking-wider">כלים</p>
            )}
            <ul className="space-y-1.5">
              {globalLinks.map(({ to, icon: Icon, label }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className={`flex items-center gap-3.5 rounded-xl font-medium transition-all duration-200 relative overflow-hidden
                      ${isOpen ? 'px-4 py-3.5 text-[15px]' : 'justify-center px-0 py-3'}
                      ${location.pathname === to
                        ? 'text-white bg-gradient-to-l from-orange-500/20 to-yellow-500/10 shadow-[0_0_20px_rgba(249,115,22,0.2)]'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                      }`}
                    title={!isOpen ? label : undefined}
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
                    <Icon size={18} className={`shrink-0 ${location.pathname === to ? 'text-orange-400' : ''}`} />
                    {isOpen && <span>{label}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Admin Links (super_admin only) */}
          {isSuperAdmin && (
            <div className="mt-6 pt-6 border-t border-zinc-700/30">
              {isOpen && (
                <p className="text-[11px] text-zinc-500 font-semibold mb-3 px-4 uppercase tracking-wider">ניהול מערכת</p>
              )}
              <ul className="space-y-1.5">
                <li>
                  <Link
                    to="/admin/users"
                    className={`flex items-center gap-3.5 rounded-xl font-medium transition-all duration-200 relative overflow-hidden
                      ${isOpen ? 'px-4 py-3.5 text-[15px]' : 'justify-center px-0 py-3'}
                      ${location.pathname === '/admin/users'
                        ? 'text-white bg-gradient-to-l from-orange-500/20 to-yellow-500/10 shadow-[0_0_20px_rgba(249,115,22,0.2)]'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                      }`}
                    title={!isOpen ? 'ניהול משתמשים' : undefined}
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
                    <ShieldCheck size={18} className={`shrink-0 ${location.pathname === '/admin/users' ? 'text-orange-400' : ''}`} />
                    {isOpen && <span>ניהול משתמשים</span>}
                  </Link>
                </li>
              </ul>
            </div>
          )}
        </nav>

        {/* ── Push Notifications (only when open) ── */}
        {isOpen && (
          <div className="mt-6 pt-6 border-t border-zinc-700/30">
            <PushNotificationSettings />
          </div>
        )}

        {/* ── Bottom Actions ── */}
        <div className="mt-4 pt-4 border-t border-zinc-700/30">
          <Link
            to="/settings"
            className={`flex items-center gap-3.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all duration-200 font-medium
              ${isOpen ? 'px-4 py-3.5 text-[15px]' : 'justify-center px-0 py-3'}`}
            title={!isOpen ? 'הגדרות' : undefined}
          >
            <Settings size={18} className="shrink-0" />
            {isOpen && <span>הגדרות</span>}
          </Link>
        </div>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
