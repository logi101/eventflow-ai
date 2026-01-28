# External Integrations

ניהול ו-Abstractions על אינטגרציות חיצוניות.

## אינטגרציות:

- **WhatsApp** - Green API integration
- **AI** - Gemini API integration
- **Calendar** - Google Calendar sync
- **Payments** - Payment processing (Stripe, etc.)
- **Email** - Email sending

## מבנה:

```
integrations/
├── whatsapp/
│   ├── types.ts
│   ├── api.ts
│   └── index.ts
├── ai/
│   ├── types.ts
│   ├── gemini.ts
│   └── index.ts
├── calendar/
│   ├── types.ts
│   ├── google-calendar.ts
│   └── index.ts
├── payments/
│   ├── types.ts
│   ├── stripe.ts
│   └── index.ts
└── index.ts
```

## עקרונות:

1. **Secrets** - Never expose secrets to frontend
   - Use Supabase Edge Functions for API keys
   - Store encrypted credentials in DB

2. **Error handling** - Unified error handling
   - Consistent error types
   - User-friendly error messages

3. **Rate limiting** - Respect API limits
   - Request queuing
   - Retry logic

## דוגמה - WhatsApp Integration:

```typescript
// integrations/whatsapp/api.ts
export interface WhatsAppAPI {
  sendMessage(phone: string, message: string): Promise<void>
  sendBulk(phone: string[], message: string): Promise<void>
  checkStatus(messageId: string): Promise<MessageStatus>
}

export async function sendMessage(phone: string, message: string) {
  // Call Supabase Edge Function
  const { error } = await supabase.functions.invoke('send-whatsapp', {
    body: { phone, message }
  })
  
  if (error) throw new WhatsAppError(error.message)
}
```

## שימוש במודולים:

```typescript
// modules/communication/hooks/useWhatsApp.ts
import { sendMessage } from '@/lib/integrations/whatsapp'

export function useWhatsApp() {
  return {
    send: async (phone: string, message: string) => {
      await sendMessage(phone, message)
    }
  }
}
```
