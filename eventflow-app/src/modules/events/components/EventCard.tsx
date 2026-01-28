import { Link } from 'react-router-dom'
import type { Event } from '@/types'
import { Clock, MapPin, Edit2, Trash2 } from 'lucide-react'
import { formatDate, formatCurrency, getStatusLabel } from '@/utils'

interface EventCardProps {
  event: Event
  onEdit: (event: Event) => void
  onDelete: (event: Event) => void
}

export function EventCard({ event, onEdit, onDelete }: EventCardProps) {
  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onEdit(event)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onDelete(event)
  }

  return (
    <Link
      to={`/events/${event.id}`}
      className="premium-card block cursor-pointer group"
      data-testid="event-card"
      data-event-id={event.id}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-xl font-semibold text-white group-hover:text-orange-300 transition-colors">
              {event.name}
            </h2>
            <span className={`premium-badge ${event.status === 'active' ? 'premium-badge-success' : event.status === 'planning' ? 'premium-badge-active' : 'premium-badge-neutral'}`}>
              {getStatusLabel(event.status)}
            </span>
            {event.event_types && (
              <span className="premium-badge premium-badge-gold">
                {event.event_types.icon} {event.event_types.name}
              </span>
            )}
          </div>

          {event.description && (
            <p className="text-zinc-400 mb-4 leading-relaxed">{event.description}</p>
          )}

          <div className="flex flex-wrap gap-4 text-sm text-zinc-500">
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-zinc-600" />
              {formatDate(event.start_date)}
            </div>
            {event.venue_name && (
              <div className="flex items-center gap-2">
                <MapPin size={15} className="text-zinc-600" />
                {event.venue_name}{event.venue_city && `, ${event.venue_city}`}
              </div>
            )}
            {event.budget && (
              <div className="text-amber-400/80">
                💰 {formatCurrency(event.budget, event.currency)}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="premium-divider" />
          <div className="flex gap-8">
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-400">{event.participants_count}</p>
              <p className="text-xs text-zinc-500 mt-1">אורחים</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-400">{event.checklist_progress}%</p>
              <p className="text-xs text-zinc-500 mt-1">צ'קליסט</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-400">{event.vendors_count}</p>
              <p className="text-xs text-zinc-500 mt-1">ספקים</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            className="p-2.5 hover:bg-[#1a1d27]/10 rounded-xl transition-all duration-200"
            onClick={handleEdit}
            title="עריכה"
          >
            <Edit2 size={18} className="text-zinc-400 hover:text-white transition-colors" />
          </button>
          <button
            className="p-2.5 hover:bg-red-500/100/10 rounded-xl transition-all duration-200"
            onClick={handleDelete}
            title="מחיקה"
          >
            <Trash2 size={18} className="text-zinc-400 hover:text-red-400 transition-colors" />
          </button>
        </div>
      </div>
    </Link>
  )
}
