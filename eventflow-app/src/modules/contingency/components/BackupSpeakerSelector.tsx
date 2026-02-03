import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { User, ChevronDown, Check } from 'lucide-react'

interface Speaker {
  id: string
  name: string
  email: string | null
  phone: string | null
}

interface BackupSpeakerSelectorProps {
  eventId: string
  currentSpeakerId?: string
  preassignedBackupId?: string
  onSelect: (speaker: Speaker) => void
  selectedSpeakerId?: string
}

export function BackupSpeakerSelector({
  eventId,
  currentSpeakerId,
  preassignedBackupId,
  onSelect,
  selectedSpeakerId,
}: BackupSpeakerSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Fetch all speakers for this event
  const { data: speakers = [], isLoading } = useQuery({
    queryKey: ['speakers', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('speakers')
        .select('id, name, email, phone')
        .eq('event_id', eventId)
        .order('name')

      if (error) throw error
      return data as Speaker[]
    },
  })

  // Filter out current speaker
  const availableSpeakers = speakers.filter(s => s.id !== currentSpeakerId)

  // Find selected speaker
  const selectedSpeaker = speakers.find(s => s.id === selectedSpeakerId)

  // Find preassigned backup
  const preassignedBackup = speakers.find(s => s.id === preassignedBackupId)

  return (
    <div className="relative" dir="rtl">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        בחר דובר חלופי
      </label>

      {/* Dropdown trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full flex items-center justify-between px-3 py-2 border rounded-lg
          bg-white text-right
          ${selectedSpeaker ? 'border-blue-300' : 'border-gray-300'}
          hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500
        `}
      >
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-gray-400" />
          <span className={selectedSpeaker ? 'text-gray-900' : 'text-gray-500'}>
            {selectedSpeaker?.name || 'בחר דובר...'}
          </span>
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
          {isLoading ? (
            <div className="p-3 text-center text-gray-500">טוען...</div>
          ) : availableSpeakers.length === 0 ? (
            <div className="p-3 text-center text-gray-500">אין דוברים זמינים</div>
          ) : (
            <>
              {/* Preassigned backup first (if exists) */}
              {preassignedBackup && (
                <>
                  <div className="px-3 py-1 text-xs text-gray-500 bg-gray-50">
                    דובר חלופי מוגדר מראש
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(preassignedBackup)
                      setIsOpen(false)
                    }}
                    className={`
                      w-full flex items-center justify-between px-3 py-2 text-right
                      hover:bg-blue-50
                      ${selectedSpeakerId === preassignedBackup.id ? 'bg-blue-50' : ''}
                    `}
                  >
                    <div>
                      <div className="font-medium text-gray-900">{preassignedBackup.name}</div>
                      {preassignedBackup.email && (
                        <div className="text-xs text-gray-500">{preassignedBackup.email}</div>
                      )}
                    </div>
                    {selectedSpeakerId === preassignedBackup.id && (
                      <Check className="h-4 w-4 text-blue-600" />
                    )}
                  </button>
                  <div className="border-t border-gray-200" />
                </>
              )}

              {/* Other speakers */}
              <div className="px-3 py-1 text-xs text-gray-500 bg-gray-50">
                כל הדוברים
              </div>
              {availableSpeakers
                .filter(s => s.id !== preassignedBackupId)
                .map((speaker) => (
                  <button
                    key={speaker.id}
                    type="button"
                    onClick={() => {
                      onSelect(speaker)
                      setIsOpen(false)
                    }}
                    className={`
                      w-full flex items-center justify-between px-3 py-2 text-right
                      hover:bg-blue-50
                      ${selectedSpeakerId === speaker.id ? 'bg-blue-50' : ''}
                    `}
                  >
                    <div>
                      <div className="font-medium text-gray-900">{speaker.name}</div>
                      {speaker.email && (
                        <div className="text-xs text-gray-500">{speaker.email}</div>
                      )}
                    </div>
                    {selectedSpeakerId === speaker.id && (
                      <Check className="h-4 w-4 text-blue-600" />
                    )}
                  </button>
                ))}
            </>
          )}
        </div>
      )}

      {/* Click outside handler */}
      {isOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}
