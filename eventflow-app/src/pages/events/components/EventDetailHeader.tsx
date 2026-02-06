import { Link } from 'react-router-dom'
import { Calendar, Eye, Shield, Grid3X3, Play, Clock, Zap } from 'lucide-react'
import { ArrowLeft } from 'lucide-react'
import type { Event } from '../../../types'
import { formatDate, getStatusColor, getStatusLabel } from '../../../utils'

interface TabItem {
  id: string
  label: string
  icon: React.ReactNode
}

const TABS: TabItem[] = [
  { id: 'overview', label: 'סקירה', icon: <Eye size={18} /> },
  { id: 'program', label: 'בניית תוכנית', icon: <Calendar size={18} /> },
  { id: 'contingencies', label: 'תכניות חירום', icon: <Shield size={18} /> },
  { id: 'seating', label: 'שיבוץ לשולחנות', icon: <Grid3X3 size={18} /> },
  { id: 'simulation', label: 'סימולציה', icon: <Play size={18} /> },
  { id: 'changes', label: 'יומן שינויים', icon: <Clock size={18} /> },
  { id: 'settings', label: 'הגדרות תזכורות', icon: <Zap size={18} /> }
]

interface EventDetailHeaderProps {
  event: Event
  activeTab: string
  onTabChange: (tab: string) => void
}

export function EventDetailHeader({ event, activeTab, onTabChange }: EventDetailHeaderProps) {
  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to="/events" className="p-2 hover:bg-white/5 rounded-lg transition-colors">
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold" data-testid="event-detail-title">{event.name}</h1>
          <p className="text-zinc-400">{formatDate(event.start_date)}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(event.status)}`}>
          {getStatusLabel(event.status)}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b pb-2" data-testid="event-tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-orange-500 text-white'
                : 'hover:bg-white/5'
            }`}
            data-testid={`event-${tab.id}-tab`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
    </>
  )
}
