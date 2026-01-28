// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - useTestReminder Hook
// ═══════════════════════════════════════════════════════════════════════════

import { supabase } from '@/lib/supabase'
import { useMutation } from '@tanstack/react-query'

interface TestReminderRequest {
  event_id: string
  reminder_type: string
  test_phone: string
}

interface TestReminderResponse {
  success: boolean
  message?: string
}

export function useTestReminder() {
  return useMutation({
    mutationFn: async (request: TestReminderRequest): Promise<TestReminderResponse> => {
      const { data, error } = await supabase.functions.invoke('send-reminder', {
        body: {
          mode: 'test',
          type: request.reminder_type,
          event_id: request.event_id,
          test_phone: request.test_phone,
        }
      })

      if (error) throw error
      return data as TestReminderResponse
    }
  })
}
