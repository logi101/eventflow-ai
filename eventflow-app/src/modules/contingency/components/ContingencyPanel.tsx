import { useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { useContingency } from '../hooks'
import { useContingencyHistory } from '../hooks'
import type { ContingencyActionData } from '../types'
import { BackupSpeakerSelector } from './BackupSpeakerSelector'
import { ContingencyConfirmDialog } from './ContingencyConfirmDialog'
import { ContingencyHistory } from './ContingencyHistory'

interface Schedule {
  id: string
  title: string
  speaker_id: string | null
  speaker_name: string | null
  backup_speaker_id: string | null
}

interface ContingencyPanelProps {
  eventId: string
  schedule: Schedule
  onSuccess?: () => void
}

export function ContingencyPanel({
  eventId,
  schedule,
  onSuccess,
}: ContingencyPanelProps) {
  const [reason, setReason] = useState('')
  const [selectedSpeaker, setSelectedSpeaker] = useState<{ id: string; name: string } | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  const {
    suggest,
    execute,
    reject,
    suggestion,
    isSuggesting,
    isExecuting,
    reset,
  } = useContingency({
    eventId,
    onSuggestSuccess: () => {
      setShowConfirmDialog(true)
    },
    onExecuteSuccess: () => {
      setShowConfirmDialog(false)
      reset()
      setReason('')
      setSelectedSpeaker(null)
      onSuccess?.()
    },
  })

  const { history, isLoading: isLoadingHistory } = useContingencyHistory({ eventId })

  const handleActivateBackup = () => {
    if (!selectedSpeaker || !reason.trim()) return

    const actionData: ContingencyActionData = {
      schedule_id: schedule.id,
      schedule_title: schedule.title,
      original_speaker_id: schedule.speaker_id || undefined,
      original_speaker_name: schedule.speaker_name || undefined,
      backup_speaker_id: selectedSpeaker.id,
      backup_speaker_name: selectedSpeaker.name,
    }

    suggest({
      actionType: 'backup_speaker_activate',
      actionData,
      reason: reason.trim(),
    })
  }

  const handleApprove = () => {
    if (!suggestion) return
    execute(suggestion.action_id)
  }

  const handleReject = () => {
    if (!suggestion) return
    reject({ actionId: suggestion.action_id, reason: 'נדחה על ידי המנהל' })
    setShowConfirmDialog(false)
    reset()
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-orange-500" />
        <h3 className="font-medium text-gray-900">הפעלת תוכנית מגירה</h3>
      </div>

      {/* Current session info */}
      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-sm text-gray-600">סשן נוכחי:</p>
        <p className="font-medium text-gray-900">{schedule.title}</p>
        {schedule.speaker_name && (
          <p className="text-sm text-gray-600">דובר: {schedule.speaker_name}</p>
        )}
      </div>

      {/* Backup speaker selection */}
      <BackupSpeakerSelector
        eventId={eventId}
        currentSpeakerId={schedule.speaker_id || undefined}
        preassignedBackupId={schedule.backup_speaker_id || undefined}
        onSelect={(speaker) => setSelectedSpeaker({ id: speaker.id, name: speaker.full_name })}
        selectedSpeakerId={selectedSpeaker?.id}
      />

      {/* Reason input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          סיבה לשינוי
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="למשל: הדובר המקורי לא יכול להגיע..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={2}
        />
      </div>

      {/* Activate button */}
      <button
        onClick={handleActivateBackup}
        disabled={!selectedSpeaker || !reason.trim() || isSuggesting}
        className={`
          w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg
          font-medium transition-colors
          ${selectedSpeaker && reason.trim()
            ? 'bg-orange-600 text-white hover:bg-orange-700'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }
        `}
      >
        {isSuggesting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            מחשב השפעה...
          </>
        ) : (
          'הפעל דובר חלופי'
        )}
      </button>

      {/* Confirmation dialog */}
      <ContingencyConfirmDialog
        isOpen={showConfirmDialog}
        suggestion={suggestion || null}
        onApprove={handleApprove}
        onReject={handleReject}
        onClose={() => {
          setShowConfirmDialog(false)
          reset()
        }}
        isExecuting={isExecuting}
      />

      {/* History */}
      <div className="border-t pt-4">
        <ContingencyHistory history={history} isLoading={isLoadingHistory} />
      </div>
    </div>
  )
}
