# Phase 4: Manager Controls - Research

**Researched:** 2026-01-28
**Domain:** UI/UX controls for event settings + Edge Function testing
**Confidence:** HIGH

## Summary

Phase 4 adds manager-facing controls for the automated reminder system built in Phases 1-3. The core technical work involves:

1. **Frontend UI** - Adding toggle switches to event settings forms for follow-up reminders and activation preview
2. **Database schema** - Already complete (events.settings JSONB supports all flags)
3. **Message preview component** - WhatsApp-style preview showing what participants will receive
4. **Test reminder functionality** - Edge Function endpoint to send a single test message to manager

The backend is essentially complete. The send-reminder Edge Function v7 already checks events.settings flags for all 8 reminder types. The main implementation work is creating React components with proper RTL/Hebrew support using the project's existing stack (React Hook Form + Zod + TailwindCSS).

**Primary recommendation:** Build reusable toggle component with Zod validation, create WhatsApp-style message preview component, and add "send test" button that calls send-reminder with manager's phone number.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React Hook Form | ^7.71.1 | Form state management | Already used in EventForm, integrates with Zod |
| Zod | ^4.3.5 | Schema validation | Project standard for all forms (z.boolean() for toggles) |
| TailwindCSS | ^4.1.18 | Styling | Project UI framework, RTL support built-in |
| Lucide React | ^0.562.0 | Icons | Project icon library |
| @tanstack/react-query | ^5.90.19 | Server state | Already used for Supabase queries |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @hookform/resolvers | ^5.2.2 | Zod resolver for RHF | Validation integration |
| Supabase client | ^2.90.1 | Edge Function calls | Test reminder invocation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native checkbox | Flowbite/shadcn toggle | Project uses custom components, no external UI library dependencies |
| Custom preview | react-whatsapp package | Package is for click-to-chat functionality, not message preview UI |

**Installation:**
None required - all dependencies already in package.json

## Architecture Patterns

### Recommended Component Structure
```
src/
├── modules/events/
│   ├── components/
│   │   ├── EventForm.tsx              # Existing - add settings toggles here
│   │   ├── EventSettingsPanel.tsx     # NEW - separate panel for reminder settings
│   │   ├── MessagePreview.tsx         # NEW - WhatsApp-style preview
│   │   └── TestReminderButton.tsx     # NEW - test reminder sender
│   ├── hooks/
│   │   └── useTestReminder.ts         # NEW - hook for Edge Function call
│   └── schemas/
│       └── eventSettings.ts           # NEW - Zod schema for settings JSONB
```

### Pattern 1: Boolean Toggle with React Hook Form + Zod

**What:** Controlled checkbox/toggle integrated with form validation
**When to use:** Any boolean setting that needs validation and form state
**Example:**
```typescript
// Schema definition (src/modules/events/schemas/eventSettings.ts)
import { z } from 'zod'

export const eventSettingsSchema = z.object({
  reminder_activation: z.boolean().default(true),
  reminder_week_before: z.boolean().default(true),
  reminder_day_before: z.boolean().default(true),
  reminder_morning: z.boolean().default(true),
  reminder_15min: z.boolean().default(true),
  reminder_event_end: z.boolean().default(false),
  reminder_follow_up_3mo: z.boolean().default(false),
  reminder_follow_up_6mo: z.boolean().default(false),
})

export type EventSettings = z.infer<typeof eventSettingsSchema>

// Component usage (in EventForm or EventSettingsPanel)
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

const { register, watch } = useForm<EventSettings>({
  resolver: zodResolver(eventSettingsSchema),
  defaultValues: event?.settings || eventSettingsSchema.parse({})
})

// Toggle component (existing project pattern from SchedulesPage.tsx)
<label className="flex items-center gap-2">
  <input
    type="checkbox"
    {...register('reminder_follow_up_3mo')}
    className="w-4 h-4"
  />
  <span className="text-sm">תזכורת מעקב 3 חודשים</span>
</label>
```

**Source:** [React Hook Form - shadcn/ui](https://ui.shadcn.com/docs/forms/react-hook-form)

### Pattern 2: Message Preview Component

**What:** WhatsApp-style bubble showing template content with substituted variables
**When to use:** Preview activation message, test reminder preview before sending
**Example:**
```typescript
// src/modules/events/components/MessagePreview.tsx
interface MessagePreviewProps {
  template: string
  variables: Record<string, string>
}

export function MessagePreview({ template, variables }: MessagePreviewProps) {
  // Replace {{variable}} with actual values
  const content = Object.entries(variables).reduce(
    (text, [key, value]) => text.replace(new RegExp(`{{${key}}}`, 'g'), value),
    template
  )

  return (
    <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center">
          <span className="text-xs">📱</span>
        </div>
        <span className="text-sm text-zinc-400">תצוגה מקדימה של ההודעה</span>
      </div>

      <div className="bg-[#005c4b] text-white rounded-lg p-3 rounded-tr-none max-w-sm">
        <pre className="whitespace-pre-wrap font-['Heebo'] text-sm leading-relaxed">
          {content}
        </pre>
      </div>

      <p className="text-xs text-zinc-500 mt-2">
        הודעה זו תישלח דרך WhatsApp
      </p>
    </div>
  )
}
```

**Source:** [WhatsApp Template Preview in ReactJS](https://github.com/AbhishekSadhwani/Whatsapp-Template-Message-Preview)

### Pattern 3: Edge Function Invocation for Test Reminder

**What:** Call send-reminder Edge Function with test mode flag
**When to use:** Manager wants to verify reminder content and delivery
**Example:**
```typescript
// src/modules/events/hooks/useTestReminder.ts
import { supabase } from '@/lib/supabase'
import { useMutation } from '@tanstack/react-query'

interface TestReminderRequest {
  event_id: string
  reminder_type: 'activation' | 'day_before' | 'morning' | '15_min' | 'event_end' | 'follow_up_3mo' | 'follow_up_6mo'
  test_phone: string  // Manager's phone number
}

export function useTestReminder() {
  return useMutation({
    mutationFn: async (request: TestReminderRequest) => {
      const { data, error } = await supabase.functions.invoke('send-reminder', {
        body: {
          mode: 'test',
          ...request
        }
      })

      if (error) throw error
      return data
    }
  })
}

// Component usage
import { useTestReminder } from '@/modules/events/hooks/useTestReminder'

function TestReminderButton() {
  const { mutate, isPending } = useTestReminder()

  const handleTest = () => {
    mutate({
      event_id: event.id,
      reminder_type: 'activation',
      test_phone: currentUser.phone
    })
  }

  return (
    <button
      onClick={handleTest}
      disabled={isPending}
      className="btn-secondary"
    >
      {isPending ? 'שולח...' : 'שלח הודעת בדיקה'}
    </button>
  )
}
```

**Source:** [Supabase Edge Functions Testing](https://supabase.com/docs/guides/functions/unit-test)

### Pattern 4: RTL Toggle Switch Styling

**What:** Checkbox styled as toggle switch with RTL support
**When to use:** All boolean settings in event settings panel
**Example:**
```typescript
// Custom toggle component (optional - can use simple checkbox)
// Based on Flowbite RTL patterns with TailwindCSS

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
}

export function Toggle({ checked, onChange, label, description }: ToggleProps) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <div>
        <span className="text-sm font-medium">{label}</span>
        {description && (
          <p className="text-xs text-zinc-400 mt-1">{description}</p>
        )}
      </div>

      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
      </div>
    </label>
  )
}
```

**Source:** [Flowbite Toggle RTL Support](https://flowbite.com/docs/customize/rtl/)

### Anti-Patterns to Avoid

- **Don't modify events.settings directly in database** - Use form state and single update mutation
- **Don't skip Zod validation** - Always validate JSONB structure even though database allows any JSON
- **Don't call Edge Function without error handling** - Test reminders can fail (rate limits, invalid phone)
- **Don't hardcode message templates in preview** - Fetch from message_templates table like Edge Function does

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Variable substitution | Custom regex replace | Same logic as send-reminder v7 | Edge Function already has `substituteVariables()` - reuse pattern |
| Phone normalization | Custom Israeli phone formatter | Existing `normalize_phone()` function | Database function already handles 972 prefix |
| Test message deduplication | Custom tracking table | Use existing messages table | Same structure works for test messages (add metadata flag) |
| Toggle switch accessibility | Custom ARIA attributes | Native checkbox + CSS styling | Screen readers work better with semantic HTML |

**Key insight:** Phase 3 already built the hard parts (template fetching, variable substitution, message building). Phase 4 is mostly UI controls that map to existing backend logic.

## Common Pitfalls

### Pitfall 1: JSONB Update Race Conditions

**What goes wrong:** Multiple updates to events.settings JSONB can overwrite each other if not atomic
**Why it happens:** Supabase update doesn't merge JSONB by default - it replaces entire field
**How to avoid:**
- Read full settings object before update
- Merge in memory
- Write back entire object
- Or use PostgreSQL JSONB merge operator in RPC function

**Prevention strategy:**
```typescript
// BAD - Replaces entire settings
await supabase
  .from('events')
  .update({ settings: { reminder_follow_up_3mo: true } })
  .eq('id', eventId)

// GOOD - Merge with existing settings
const { data: event } = await supabase
  .from('events')
  .select('settings')
  .eq('id', eventId)
  .single()

await supabase
  .from('events')
  .update({
    settings: {
      ...event.settings,
      reminder_follow_up_3mo: true
    }
  })
  .eq('id', eventId)
```

**Warning signs:** Settings mysteriously reset when changing one toggle

### Pitfall 2: Test Reminder Affecting Production Messages Table

**What goes wrong:** Test reminders create message records that clutter production data
**Why it happens:** send-reminder inserts into messages table for tracking
**How to avoid:**
- Add `is_test: true` flag in message metadata
- Filter test messages in production queries
- Or create separate endpoint that doesn't log to database

**Prevention strategy:**
```typescript
// In test mode, add metadata flag
const messageData = {
  event_id: eventId,
  participant_id: null,  // No real participant for test
  type: reminderType,
  recipient_phone: testPhone,
  content: message,
  metadata: { is_test: true },  // FLAG FOR FILTERING
  status: 'sent'
}
```

**Warning signs:** Message reports show test messages to manager's phone

### Pitfall 3: Preview Showing Wrong Template Version

**What goes wrong:** Preview shows outdated template while Edge Function uses updated version
**Why it happens:** Frontend caches template content or doesn't refresh after edit
**How to avoid:**
- Use TanStack Query with proper cache invalidation
- Refetch template when opening preview modal
- Show timestamp of template version

**Prevention strategy:**
```typescript
// Use query key that invalidates on template change
const { data: template } = useQuery({
  queryKey: ['message-template', messageType, event.organization_id],
  queryFn: async () => {
    const { data } = await supabase
      .from('message_templates')
      .select('content, updated_at')
      .eq('message_type', messageType)
      // Same query logic as Edge Function
      .maybeSingle()
    return data
  }
})

// Show template age
<p className="text-xs text-zinc-500">
  תבנית עודכנה: {formatDate(template.updated_at)}
</p>
```

**Warning signs:** Manager reports preview doesn't match sent message

### Pitfall 4: Follow-up Reminder Toggles Active for Past Events

**What goes wrong:** Manager enables 3mo follow-up on already-completed event, wastes cron cycles
**Why it happens:** No validation that event date supports follow-up timeline
**How to avoid:**
- Disable toggle if event is in past
- Show warning if event date is within follow-up window
- Edge Function already checks event date before sending

**Prevention strategy:**
```typescript
// Disable toggle with explanation
const isPastEvent = new Date(event.start_date) < new Date()
const isWithin3Months = differenceInDays(new Date(), new Date(event.start_date)) < 90

<Toggle
  checked={settings.reminder_follow_up_3mo}
  onChange={(v) => setSettings({ ...settings, reminder_follow_up_3mo: v })}
  label="תזכורת מעקב 3 חודשים"
  disabled={isPastEvent || isWithin3Months}
/>
{isPastEvent && (
  <p className="text-xs text-amber-500">אירוע עבר - לא ניתן להפעיל תזכורת מעקב</p>
)}
```

**Warning signs:** Cron jobs run but skip events due to date checks

## Code Examples

Verified patterns from official sources:

### Event Settings Update Flow

```typescript
// Complete flow: form validation → merge JSONB → Supabase update

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { eventSettingsSchema, type EventSettings } from '@/modules/events/schemas/eventSettings'
import { supabase } from '@/lib/supabase'
import { useMutation, useQueryClient } from '@tanstack/react-query'

interface EventSettingsPanelProps {
  event: Event
}

export function EventSettingsPanel({ event }: EventSettingsPanelProps) {
  const queryClient = useQueryClient()

  // Parse existing settings or use defaults
  const currentSettings = eventSettingsSchema.parse(event.settings || {})

  const { register, handleSubmit, formState } = useForm<EventSettings>({
    resolver: zodResolver(eventSettingsSchema),
    defaultValues: currentSettings
  })

  // Mutation for updating settings
  const { mutate, isPending } = useMutation({
    mutationFn: async (newSettings: EventSettings) => {
      const { error } = await supabase
        .from('events')
        .update({ settings: newSettings })
        .eq('id', event.id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', event.id] })
    }
  })

  const onSubmit = (data: EventSettings) => {
    mutate(data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <h3 className="text-lg font-semibold">הגדרות תזכורות</h3>

      <div className="space-y-3">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            {...register('reminder_activation')}
            className="w-4 h-4"
          />
          <span className="text-sm">הודעת הפעלה (אחרי יצירת אירוע)</span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            {...register('reminder_week_before')}
            className="w-4 h-4"
          />
          <span className="text-sm">תזכורת שבוע לפני</span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            {...register('reminder_day_before')}
            className="w-4 h-4"
          />
          <span className="text-sm">תזכורת יום לפני</span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            {...register('reminder_morning')}
            className="w-4 h-4"
          />
          <span className="text-sm">תזכורת בוקר האירוע</span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            {...register('reminder_15min')}
            className="w-4 h-4"
          />
          <span className="text-sm">תזכורת 15 דקות לפני</span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            {...register('reminder_event_end')}
            className="w-4 h-4"
          />
          <span className="text-sm">הודעה בסיום אירוע</span>
        </label>

        <div className="pt-2 border-t border-zinc-700">
          <p className="text-xs text-zinc-400 mb-3">תזכורות מעקב (אופציונליות)</p>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              {...register('reminder_follow_up_3mo')}
              className="w-4 h-4"
            />
            <span className="text-sm">מעקב 3 חודשים</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              {...register('reminder_follow_up_6mo')}
              className="w-4 h-4"
            />
            <span className="text-sm">מעקב 6 חודשים</span>
          </label>
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending || !formState.isDirty}
        className="btn-primary"
      >
        {isPending ? 'שומר...' : 'שמור הגדרות'}
      </button>
    </form>
  )
}
```

**Source:** [React Hook Form useForm](https://react-hook-form.com/docs/useform)

### Message Preview with Variable Substitution

```typescript
// Component that fetches template and shows preview with real event data

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'

interface ActivationMessagePreviewProps {
  event: Event
}

export function ActivationMessagePreview({ event }: ActivationMessagePreviewProps) {
  // Fetch template (same logic as Edge Function)
  const { data: template, isLoading } = useQuery({
    queryKey: ['message-template', 'activation', event.organization_id],
    queryFn: async () => {
      // Try org-specific template
      const { data: orgTemplate } = await supabase
        .from('message_templates')
        .select('content')
        .eq('organization_id', event.organization_id)
        .eq('message_type', 'activation')
        .eq('is_active', true)
        .maybeSingle()

      if (orgTemplate?.content) return orgTemplate.content

      // Fall back to system template
      const { data: sysTemplate } = await supabase
        .from('message_templates')
        .select('content')
        .is('organization_id', null)
        .eq('message_type', 'activation')
        .eq('is_active', true)
        .eq('is_system', true)
        .maybeSingle()

      return sysTemplate?.content || null
    }
  })

  if (isLoading) return <div>טוען תצוגה מקדימה...</div>
  if (!template) return <div>לא נמצאה תבנית הודעה</div>

  // Build variable map (matches Edge Function logic)
  const variables = {
    participant_name: 'דוגמה משתתף/ת',  // Example name
    event_name: event.name,
    event_date: format(new Date(event.start_date), 'EEEE, d MMMM', { locale: he }),
    event_time: format(new Date(event.start_date), 'HH:mm'),
    event_location: `${event.venue_name || ''} ${event.venue_address || ''}`.trim() || 'לא צוין מיקום',
  }

  // Substitute variables
  const message = Object.entries(variables).reduce(
    (text, [key, value]) => text.replace(new RegExp(`{{${key}}}`, 'g'), value),
    template
  )

  return (
    <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-700">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center">
          <span className="text-xs">💬</span>
        </div>
        <div>
          <p className="text-sm font-medium">תצוגה מקדימה</p>
          <p className="text-xs text-zinc-500">הודעת הפעלה תישלח למשתתפים מאושרים</p>
        </div>
      </div>

      <div className="bg-[#005c4b] text-white rounded-lg p-3 rounded-tr-none max-w-md">
        <pre className="whitespace-pre-wrap font-['Heebo'] text-sm leading-relaxed">
          {message}
        </pre>
      </div>

      <p className="text-xs text-zinc-400 mt-3">
        משתנים זמינים: participant_name, event_name, event_date, event_time, event_location
      </p>
    </div>
  )
}
```

**Source:** Adapted from Phase 3 implementation (send-reminder v7)

### Test Reminder Button with Status Feedback

```typescript
// Button that sends test reminder and shows result

import { useState } from 'react'
import { useTestReminder } from '@/modules/events/hooks/useTestReminder'
import { Loader2, Send, CheckCircle, AlertCircle } from 'lucide-react'

interface TestReminderButtonProps {
  event: Event
  reminderType: string
  testPhone: string  // Manager's phone
}

export function TestReminderButton({ event, reminderType, testPhone }: TestReminderButtonProps) {
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const { mutate, isPending } = useTestReminder()

  const handleTest = () => {
    setStatus('idle')

    mutate(
      {
        event_id: event.id,
        reminder_type: reminderType,
        test_phone: testPhone
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
    <div className="flex items-center gap-3">
      <button
        onClick={handleTest}
        disabled={isPending || !testPhone}
        className="btn-secondary flex items-center gap-2"
      >
        {isPending ? (
          <>
            <Loader2 className="animate-spin" size={16} />
            <span>שולח...</span>
          </>
        ) : (
          <>
            <Send size={16} />
            <span>שלח הודעת בדיקה</span>
          </>
        )}
      </button>

      {status === 'success' && (
        <div className="flex items-center gap-2 text-green-500 text-sm">
          <CheckCircle size={16} />
          <span>הודעה נשלחה בהצלחה</span>
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-center gap-2 text-red-500 text-sm">
          <AlertCircle size={16} />
          <span>שליחה נכשלה - נסה שוב</span>
        </div>
      )}
    </div>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded reminder settings | JSONB settings per event | Phase 1 (Jan 2026) | Managers control per-event |
| No preview functionality | WhatsApp-style preview | Phase 4 (Jan 2026) | Managers see before activate |
| No test mechanism | Test mode in Edge Function | Phase 4 (Jan 2026) | Verify before production |
| UI libraries (shadcn/Flowbite) | Custom components with TailwindCSS | Project start | No external dependencies |

**Deprecated/outdated:**
- Direct database manipulation of settings - Use form state management
- Separate API for test messages - Use mode flag in existing Edge Function

## Open Questions

Things that couldn't be fully resolved:

1. **Should test messages log to messages table?**
   - What we know: Production messages logged for tracking/analytics
   - What's unclear: Test messages clutter production data vs. helpful for debugging
   - Recommendation: Log with `metadata.is_test: true` and filter in queries

2. **Where should EventSettingsPanel live in UI?**
   - What we know: EventForm.tsx exists but is large (212 lines)
   - What's unclear: Add settings section to form or create separate tab in EventDetailPage
   - Recommendation: Separate tab in EventDetailPage for better organization

3. **Should test reminder support all 8 types or just activation?**
   - What we know: Edge Function can handle any type with test flag
   - What's unclear: UI complexity of dropdown vs. single "test activation" button
   - Recommendation: Start with activation only, add dropdown if needed

## Sources

### Primary (HIGH confidence)
- [React Hook Form Documentation](https://react-hook-form.com/docs/useform) - Form state management
- [Supabase Edge Functions Testing](https://supabase.com/docs/guides/functions/unit-test) - Manual trigger patterns
- [Flowbite RTL Support](https://flowbite.com/docs/customize/rtl/) - Toggle switch RTL styling
- Existing codebase: eventflow-app/src/pages/schedules/SchedulesPage.tsx - Checkbox pattern

### Secondary (MEDIUM confidence)
- [WhatsApp Template Preview GitHub](https://github.com/AbhishekSadhwani/Whatsapp-Template-Message-Preview) - Preview component inspiration
- [React Hook Form + Zod Pattern](https://www.austinshelby.com/blog/build-a-react-form-with-react-hook-form-and-zod) - Validation integration
- Phase 3 implementation (send-reminder v7) - Variable substitution logic

### Tertiary (LOW confidence)
- None - all findings verified with authoritative sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in package.json, verified versions
- Architecture: HIGH - Patterns from existing codebase (EventForm, SchedulesPage)
- Pitfalls: MEDIUM - Based on common JSONB and Edge Function issues, not project-specific

**Research date:** 2026-01-28
**Valid until:** ~30 days (stable patterns, minimal API changes expected)
