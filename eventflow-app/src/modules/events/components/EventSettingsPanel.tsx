// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - Event Settings Panel
// ═══════════════════════════════════════════════════════════════════════════

import { useState } from 'react'
import { Save, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { eventSettingsSchema, type EventSettings } from '../schemas/eventSettings'
import { MessagePreview } from './MessagePreview'
import { TestReminderButton } from './TestReminderButton'

interface EventSettingsPanelProps {
  event: {
    id: string
    name: string
    start_date: string
    venue_name: string | null
    venue_address: string | null
    organization_id: string | null
    settings: Record<string, boolean> | null
    status: string
  }
}

export function EventSettingsPanel({ event }: EventSettingsPanelProps) {
  // Parse current settings with defaults
  const currentSettings = eventSettingsSchema.parse(event.settings || {})

  // Local state for settings
  const [settings, setSettings] = useState<EventSettings>(currentSettings)
  const [saving, setSaving] = useState(false)

  // Toast state
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success'
  })

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type })
    setTimeout(() => setToast(t => ({ ...t, show: false })), 3000)
  }

  // Check if settings have changed
  const isDirty = JSON.stringify(settings) !== JSON.stringify(currentSettings)

  const handleSave = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('events')
        .update({ settings })
        .eq('id', event.id)

      if (error) {
        console.error('Error saving settings:', error)
        showToast('שגיאה בשמירת ההגדרות', 'error')
        return
      }

      showToast('הגדרות נשמרו בהצלחה')
    } catch (err) {
      console.error('Exception saving settings:', err)
      showToast('שגיאה בשמירת ההגדרות', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = (key: keyof EventSettings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast.show && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-lg ${
            toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          } text-white`}
        >
          {toast.message}
        </div>
      )}

      <div className="card">
        <h2 className="text-xl font-bold mb-4">הגדרות תזכורות</h2>

        {/* Standard Reminders Section */}
        <div className="space-y-4 mb-6">
          <h3 className="text-lg font-semibold text-gray-700">תזכורות אוטומטיות</h3>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.reminder_activation}
              onChange={() => handleToggle('reminder_activation')}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm">הודעת הפעלה (אחרי הפעלת אירוע)</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.reminder_week_before}
              onChange={() => handleToggle('reminder_week_before')}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm">תזכורת שבוע לפני</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.reminder_day_before}
              onChange={() => handleToggle('reminder_day_before')}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm">תזכורת יום לפני</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.reminder_morning}
              onChange={() => handleToggle('reminder_morning')}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm">תזכורת בוקר האירוע</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.reminder_15min}
              onChange={() => handleToggle('reminder_15min')}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm">תזכורת 15 דקות לפני</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.reminder_event_end}
              onChange={() => handleToggle('reminder_event_end')}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm">הודעה בסיום אירוע</span>
          </label>
        </div>

        {/* Follow-up Reminders Section */}
        <div className="space-y-4 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-700">תזכורות מעקב (אופציונליות)</h3>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.reminder_follow_up_3mo}
              onChange={() => handleToggle('reminder_follow_up_3mo')}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm">מעקב 3 חודשים</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.reminder_follow_up_6mo}
              onChange={() => handleToggle('reminder_follow_up_6mo')}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm">מעקב 6 חודשים</span>
          </label>
        </div>

        {/* Save Button */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <button
            onClick={handleSave}
            disabled={!isDirty || saving}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                שומר...
              </>
            ) : (
              <>
                <Save size={18} />
                שמור הגדרות
              </>
            )}
          </button>
        </div>
      </div>

      {/* Message Preview */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">תצוגה מקדימה - הודעת הפעלה</h2>
        <MessagePreview
          eventId={event.id}
          organizationId={event.organization_id}
          eventName={event.name}
          startDate={event.start_date}
          venueName={event.venue_name}
          venueAddress={event.venue_address}
        />
      </div>

      {/* Test Reminder Section */}
      <div className="card">
        <h2 className="text-xl font-bold mb-2">בדיקת תזכורות</h2>
        <p className="text-sm text-gray-600 mb-4">
          שלח הודעת בדיקה לטלפון שלך כדי לוודא שהכל עובד
        </p>
        <TestReminderButton eventId={event.id} />
      </div>
    </div>
  )
}
