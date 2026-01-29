import { Loader2, Zap } from 'lucide-react'
import { useEvent } from '../../contexts/EventContext'
import { EventSettingsPanel } from '../../modules/events/components/EventSettingsPanel'

export function ReminderSettingsPage() {
  const { selectedEvent: event, loading } = useEvent()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-orange-500" size={32} />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="text-center py-20 text-zinc-400">
        <Zap className="mx-auto mb-4" size={48} />
        <p className="text-lg">לא נבחר אירוע</p>
        <p className="text-sm mt-2">בחר אירוע מהרשימה כדי לנהל הגדרות תזכורות</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">הגדרות תזכורות — {event.name}</h1>
      <EventSettingsPanel event={event} />
    </div>
  )
}
