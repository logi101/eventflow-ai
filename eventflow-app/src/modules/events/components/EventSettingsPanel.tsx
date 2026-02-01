// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - Event Settings Panel
// ═══════════════════════════════════════════════════════════════════════════

import { useState } from 'react'
import { Save, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { eventSettingsSchema, type EventSettings } from '../schemas/eventSettings'
import { MessagePreview } from './MessagePreview'
import { TestReminderButton } from './TestReminderButton'

interface EventSettingsPanelProps {
  event: {
    id: string
    name: string
    organization_id: string | null
    start_date: string
    venue_name: string | null
    venue_address: string | null
    settings?: Record<string, boolean> | null
  }
}

export function EventSettingsPanel({ event }: EventSettingsPanelProps) {
  // Parse current settings with defaults
  const currentSettings = eventSettingsSchema.parse(event.settings || {})

  // Local state for settings
  const [settings, setSettings] = useState<EventSettings>(currentSettings)
  const [saving, setSaving] = useState(false)
  const [expandedReminder, setExpandedReminder] = useState<string | null>(null)

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

  const handleReminderClick = (messageType: string, e: React.MouseEvent) => {
    // Prevent toggling the checkbox when clicking on the label for expansion
    e.preventDefault()
    e.stopPropagation()
    
    // Toggle expanded state (accordion behavior)
    setExpandedReminder(prev => prev === messageType ? null : messageType)
  }

  const reminders = [
    { key: 'reminder_activation' as keyof EventSettings, label: 'הודעת הפעלה', messageType: 'reminder_activation' },
    { key: 'reminder_week_before' as keyof EventSettings, label: 'תזכורת שבוע לפני', messageType: 'reminder_week_before' },
    { key: 'reminder_day_before' as keyof EventSettings, label: 'תזכורת יום לפני', messageType: 'reminder_day_before' },
    { key: 'reminder_morning' as keyof EventSettings, label: 'תזכורת בוקר האירוע', messageType: 'reminder_morning' },
    { key: 'reminder_15min' as keyof EventSettings, label: 'תזכורת 15 דקות לפני', messageType: 'reminder_15min' },
    { key: 'reminder_event_end' as keyof EventSettings, label: 'הודעה בסיום אירוע', messageType: 'reminder_event_end' },
    { key: 'reminder_follow_up_3mo' as keyof EventSettings, label: 'מעקב 3 חודשים', messageType: 'reminder_follow_up_3mo' },
    { key: 'reminder_follow_up_6mo' as keyof EventSettings, label: 'מעקב 6 חודשים', messageType: 'reminder_follow_up_6mo' },
  ]

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
          <h3 className="text-lg font-semibold text-zinc-300">תזכורות אוטומטיות</h3>

          {reminders.slice(0, 6).map((reminder) => (
            <div key={reminder.key} className="border border-zinc-700 rounded-lg overflow-hidden">
              {/* Reminder Header */}
              <div className="p-3 bg-zinc-800/50 hover:bg-zinc-800 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <input
                      type="checkbox"
                      checked={!!settings[reminder.key]}
                      onChange={() => handleToggle(reminder.key)}
                      className="w-4 h-4 rounded accent-orange-500 cursor-pointer shrink-0"
                    />
                    <span className="text-sm text-zinc-300">{reminder.label}</span>
                  </div>
                  <button
                    onClick={(e) => handleReminderClick(reminder.messageType, e)}
                    className="p-1 hover:bg-zinc-700 rounded transition-colors"
                    title="צפה בתצוגה מקדימה"
                  >
                    {expandedReminder === reminder.messageType ? (
                      <ChevronUp size={18} className="text-zinc-400" />
                    ) : (
                      <ChevronDown size={18} className="text-zinc-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Accordion Content - Message Preview */}
              {expandedReminder === reminder.messageType && (
                <div className="p-4 border-t border-zinc-700 bg-zinc-900/50">
                  <MessagePreview
                    organizationId={event.organization_id || null}
                    eventName={event.name}
                    startDate={event.start_date}
                    venueName={event.venue_name}
                    venueAddress={event.venue_address}
                    messageType={reminder.messageType}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Follow-up Reminders Section */}
        <div className="space-y-4 pt-6 border-t border-zinc-700">
          <h3 className="text-lg font-semibold text-zinc-300">תזכורות מעקב (אופציונליות)</h3>

          {reminders.slice(6).map((reminder) => (
            <div key={reminder.key} className="border border-zinc-700 rounded-lg overflow-hidden">
              {/* Reminder Header */}
              <div className="p-3 bg-zinc-800/50 hover:bg-zinc-800 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <input
                      type="checkbox"
                      checked={!!settings[reminder.key]}
                      onChange={() => handleToggle(reminder.key)}
                      className="w-4 h-4 rounded accent-orange-500 cursor-pointer shrink-0"
                    />
                    <span className="text-sm text-zinc-300">{reminder.label}</span>
                  </div>
                  <button
                    onClick={(e) => handleReminderClick(reminder.messageType, e)}
                    className="p-1 hover:bg-zinc-700 rounded transition-colors"
                    title="צפה בתצוגה מקדימה"
                  >
                    {expandedReminder === reminder.messageType ? (
                      <ChevronUp size={18} className="text-zinc-400" />
                    ) : (
                      <ChevronDown size={18} className="text-zinc-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Accordion Content - Message Preview */}
              {expandedReminder === reminder.messageType && (
                <div className="p-4 border-t border-zinc-700 bg-zinc-900/50">
                  <MessagePreview
                    organizationId={event.organization_id || null}
                    eventName={event.name}
                    startDate={event.start_date}
                    venueName={event.venue_name}
                    venueAddress={event.venue_address}
                    messageType={reminder.messageType}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Save Button */}
        <div className="mt-6 pt-6 border-t border-zinc-700">
          <button
            onClick={handleSave}
            disabled={!isDirty || saving}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

      {/* Test Reminder Section */}
      <div className="card">
        <h2 className="text-xl font-bold mb-2">בדיקת תזכורות</h2>
        <p className="text-sm text-zinc-400 mb-4">
          שלח הודעת בדיקה לטלפון שלך כדי לוודא שהכל עובד
        </p>
        <TestReminderButton eventId={event.id} />
      </div>
    </div>
  )
}