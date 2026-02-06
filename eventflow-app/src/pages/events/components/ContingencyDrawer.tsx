import { X, AlertTriangle } from 'lucide-react'
import { ContingencyPanel } from '../../../modules/contingency'
import type { ExtendedSchedule } from '../../../types'

interface ContingencyDrawerProps {
  eventId: string
  selectedSchedule: ExtendedSchedule
  onSuccess: () => void
  onClose: () => void
}

export function ContingencyDrawer({
  eventId,
  selectedSchedule,
  onSuccess,
  onClose
}: ContingencyDrawerProps) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end" dir="rtl">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-md bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <h2 className="font-semibold text-gray-900">תוכנית מגירה</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          <ContingencyPanel
            eventId={eventId}
            schedule={{
              id: selectedSchedule.id,
              title: selectedSchedule.title,
              speaker_id: selectedSchedule.session_speakers?.[0]?.speaker_id || null,
              speaker_name: selectedSchedule.session_speakers?.[0]?.speaker?.name || null,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              backup_speaker_id: (selectedSchedule as any).backup_speaker_id || null,
            }}
            onSuccess={onSuccess}
          />
        </div>
      </div>
    </div>
  )
}
