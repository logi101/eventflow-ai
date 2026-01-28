// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - Test Reminder Button Component
// ═══════════════════════════════════════════════════════════════════════════

import { useState } from 'react'
import { Loader2, Send, CheckCircle, AlertCircle } from 'lucide-react'
import { useTestReminder } from '../hooks/useTestReminder'

interface TestReminderButtonProps {
  eventId: string
  reminderType?: string
}

export function TestReminderButton({ eventId, reminderType = 'activation' }: TestReminderButtonProps) {
  const [testPhone, setTestPhone] = useState('')
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const { mutate, isPending } = useTestReminder()

  const handleTest = () => {
    setStatus('idle')

    mutate(
      {
        event_id: eventId,
        reminder_type: reminderType,
        test_phone: testPhone,
      },
      {
        onSuccess: () => {
          setStatus('success')
          setTimeout(() => setStatus('idle'), 3000)
        },
        onError: (error) => {
          console.error('Test reminder failed:', error)
          setStatus('error')
          setTimeout(() => setStatus('idle'), 5000)
        }
      }
    )
  }

  return (
    <div className="space-y-3">
      {/* Phone Input */}
      <div>
        <label htmlFor="test-phone" className="block text-sm font-medium text-gray-700 mb-1">
          מספר טלפון לבדיקה
        </label>
        <input
          id="test-phone"
          type="text"
          value={testPhone}
          onChange={(e) => setTestPhone(e.target.value)}
          placeholder="05X-XXXXXXX"
          className="input text-sm w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>

      {/* Send Button */}
      <button
        onClick={handleTest}
        disabled={isPending || !testPhone.trim()}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? (
          <>
            <Loader2 className="animate-spin" size={16} />
            שולח...
          </>
        ) : (
          <>
            <Send size={16} />
            שלח הודעת בדיקה
          </>
        )}
      </button>

      {/* Status Messages */}
      {status === 'success' && (
        <div className="flex items-center gap-2 text-green-600 text-sm">
          <CheckCircle size={16} />
          הודעה נשלחה בהצלחה
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle size={16} />
          שליחה נכשלה - נסה שוב
        </div>
      )}
    </div>
  )
}
