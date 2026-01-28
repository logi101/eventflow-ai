// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - Message Preview Component
// ═══════════════════════════════════════════════════════════════════════════

import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface MessagePreviewProps {
  eventId: string
  organizationId: string | null
  eventName: string
  startDate: string
  venueName: string | null
  venueAddress: string | null
  messageType?: string
}

export function MessagePreview({
  organizationId,
  eventName,
  startDate,
  venueName,
  venueAddress,
  messageType = 'reminder_activation'
}: Omit<MessagePreviewProps, 'eventId'>) {
  // Fetch message template for the given type
  const { data: template, isLoading } = useQuery({
    queryKey: ['message-template', organizationId, messageType],
    queryFn: async () => {
      // Try org-specific template first
      if (organizationId) {
        const { data } = await supabase
          .from('message_templates')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('message_type', messageType)
          .eq('is_active', true)
          .maybeSingle()

        if (data) return data
      }

      // Fall back to system template
      const { data } = await supabase
        .from('message_templates')
        .select('*')
        .is('organization_id', null)
        .eq('message_type', messageType)
        .eq('is_active', true)
        .eq('is_system', true)
        .maybeSingle()

      return data
    }
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="animate-spin text-zinc-400" size={24} />
        <span className="mr-2 text-zinc-500">טוען תצוגה מקדימה...</span>
      </div>
    )
  }

  // Build variable map
  const eventDate = new Date(startDate)
  const formattedDate = eventDate.toLocaleDateString('he-IL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })
  const formattedTime = eventDate.toLocaleTimeString('he-IL', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })

  const location = [venueName, venueAddress]
    .filter(Boolean)
    .join(', ')
    .trim() || 'לא צוין מיקום'

  const participantName = 'דוגמה משתתף/ת'

  const variables: Record<string, string> = {
    participant_name: participantName,
    event_name: eventName,
    event_date: formattedDate,
    event_time: formattedTime,
    event_location: location
  }

  // Substitute variables in template, or use fallback
  let messageContent: string
  if (template?.content) {
    messageContent = template.content
    Object.entries(variables).forEach(([key, value]) => {
      messageContent = messageContent.replace(new RegExp(`{{${key}}}`, 'g'), value)
    })
  } else {
    messageContent = buildFallbackMessage(messageType, participantName, eventName, formattedDate, formattedTime, location)
  }

  return (
    <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-700">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full bg-green-500"></div>
        <span className="text-sm text-zinc-400">תצוגה מקדימה</span>
      </div>

      {/* WhatsApp-style message bubble */}
      <div className="flex justify-end mb-2">
        <div className="bg-[#005c4b] text-white rounded-lg p-3 rounded-tr-none max-w-md">
          <pre className="whitespace-pre-wrap font-['Heebo'] text-sm leading-relaxed">
            {messageContent}
          </pre>
        </div>
      </div>

      {/* Footer */}
      <div className="text-xs text-zinc-400 text-center">
        הודעה זו תישלח דרך WhatsApp
      </div>
    </div>
  )
}

/**
 * Builds a fallback message when no template exists in the database
 */
function buildFallbackMessage(
  messageType: string,
  participantName: string,
  eventName: string,
  formattedDate: string,
  formattedTime: string,
  location: string
): string {
  const messages: Record<string, string> = {
    reminder_activation: `היי ${participantName}! 🎉\n\nנרשמת בהצלחה לאירוע: ${eventName}\n\n📅 ${formattedDate}\n🕐 ${formattedTime}\n📍 ${location}\n\nאנחנו מתרגשים לראות אותך!`,
    
    reminder_week_before: `היי ${participantName}! ⏰\n\nעוד שבוע ל-${eventName}!\n\nהזמן להתכונן ולהתרגש מהאירוע המיוחד הזה. נשמח לראות אותך בקרוב!`,
    
    reminder_day_before: `היי ${participantName}! 🔔\n\nתזכורת: מחר ${eventName}!\n\n📅 ${formattedDate}\n🕐 ${formattedTime}\n📍 ${location}\n\nאל תשכח להגיע בזמן!`,
    
    reminder_morning: `בוקר טוב ${participantName}! ☀️\n\nהיום זה הזמן - ${eventName}!\n\n🕐 ${formattedTime}\n📍 ${location}\n\nתזכורת אחרונה - אל תפספס את האירוע המיוחד!`,
    
    reminder_15min: `שלום ${participantName}! 👋\n\n🔔 בעוד 15 דקות נפתח את ${eventName}!\n\n📍 ${location}\n\nאנחנו מחכים לך!`,
    
    reminder_event_end: `${participantName} היקר/ה, 🙏\n\nתודה רבה על ההשתתפות ב-${eventName}!\n\nהיינו שמחים לראות אותך ומקווים שהאירוע עמד בציפיות שלך. נשמח לראות אותך שוב באירועים הבאים!`,
    
    reminder_follow_up_3mo: `שלום ${participantName}! 👋\n\nעברו 3 חודשים מאז ${eventName}.\n\nאנחנו מקווים שהאירוע היה מוצלח ומקווים לראות אותך שוב באירועים הבאים שלנו!`,
    
    reminder_follow_up_6mo: `היי ${participantName}! 🌟\n\nחצי שנה עברה מאז ${eventName}.\n\nאנחנו מקווים שהאירוע היה מוצלח ומקווים לראות אותך שוב באירועים הבאים שלנו!`
  }

  return messages[messageType] || messages.reminder_activation
}