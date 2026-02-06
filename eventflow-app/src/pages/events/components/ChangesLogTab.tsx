import { Clock } from 'lucide-react'
import type { ScheduleChange } from '../../../types'

interface ChangesLogTabProps {
  scheduleChanges: ScheduleChange[]
}

export function ChangesLogTab({ scheduleChanges }: ChangesLogTabProps) {
  return (
    <div data-testid="changes-log-section">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold" data-testid="changes-log-tab">יומן שינויים</h2>
        <select
          className="border rounded-lg px-3 py-2"
          data-testid="change-filter-select"
        >
          <option value="all">כל השינויים</option>
          <option value="time_change">שינוי זמן</option>
          <option value="room_change">שינוי חדר</option>
          <option value="speaker_change">שינוי דובר</option>
        </select>
      </div>

      <div className="space-y-3">
        {scheduleChanges.map(change => (
          <div key={change.id} className="border rounded-lg p-4" data-testid="change-log-entry">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-sm text-zinc-400" data-testid="change-timestamp">
                  {new Date(change.created_at).toLocaleString('he-IL')}
                </span>
                <span className="mx-2">|</span>
                <span className="font-medium" data-testid="change-type">{change.change_type}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded ${change.notification_sent ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`} data-testid="notification-status">
                  {change.notification_sent ? 'נשלח' : 'ממתין'}
                </span>
                {!change.notification_sent && (
                  <button
                    className="text-sm text-orange-500 hover:underline"
                    data-testid="send-notification-button"
                  >
                    שלח התראה
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
              <div data-testid="change-old-value">
                <span className="text-zinc-400">ערך קודם:</span>
                <span className="mr-2">{JSON.stringify(change.old_value)}</span>
              </div>
              <div data-testid="change-new-value">
                <span className="text-zinc-400">ערך חדש:</span>
                <span className="mr-2">{JSON.stringify(change.new_value)}</span>
              </div>
            </div>
            {change.reason && (
              <p className="text-sm text-zinc-400 mt-2">סיבה: {change.reason}</p>
            )}
          </div>
        ))}

        {scheduleChanges.length === 0 && (
          <div className="text-center py-8 text-zinc-400">
            <Clock className="mx-auto mb-2" size={32} />
            <p>אין שינויים עדיין</p>
          </div>
        )}
      </div>
    </div>
  )
}
