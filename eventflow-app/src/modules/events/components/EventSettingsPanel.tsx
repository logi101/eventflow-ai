// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - Event Settings Panel
// ═══════════════════════════════════════════════════════════════════════════

import { TestReminderButton } from './TestReminderButton'

export function EventSettingsPanel({ event }: { event: any }) {
  const settings = {
    reminder_activation: true,
    reminder_week_before: true,
    reminder_day_before: true,
    reminder_morning: true,
    reminder_15min: true,
    reminder_event_end: true,
    reminder_follow_up_3mo: true,
    reminder_follow_up_6mo: true,
  } as any

  const reminders = [
    { key: 'reminder_activation', label: 'הודעת הפעלה' },
    { key: 'reminder_week_before', label: 'תזכורת שבוע לפני' },
    { key: 'reminder_day_before', label: 'תזכורת יום לפני' },
    { key: 'reminder_morning', label: 'תזכורת בוקר האירוע' },
    { key: 'reminder_15min', label: 'תזכורת 15 דקות לפני' },
    { key: 'reminder_event_end', label: 'הודעה בסיום אירוע' },
    { key: 'reminder_follow_up_3mo', label: 'מעקב 3 חודשים' },
    { key: 'reminder_follow_up_6mo', label: 'מעקב 6 חודשים' },
  ]

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-xl font-bold mb-4">הגדרות תזכורות</h2>
        <div className="space-y-4">
          {reminders.map((item) => (
            <div key={item.key} className="flex items-center justify-between p-3 rounded-lg hover:bg-zinc-800/50 cursor-pointer">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings[item.key]}
                  className="w-4 h-4 rounded accent-orange-500 cursor-pointer shrink-0"
                />
                <span className="text-sm">{item.label}</span>
              </div>
            </div>
          ))}
        </div>
        <button className="mt-6 w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
          שמור הגדרות
        </button>
      </div>
      <div className="card">
        <h2 className="text-xl font-bold mb-2">בדיקת תזכורות</h2>
        <p className="text-sm text-zinc-400 mb-4">שלח הודעת בדיקה לטלפון שלך כדי לוודא שהכל עובד</p>
        <TestReminderButton eventId={event.id} />
      </div>
    </div>
  )
}