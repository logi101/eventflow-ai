// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - Messages Zod Schemas (Matching actual DB structure)
// ═══════════════════════════════════════════════════════════════════════════

import { z } from 'zod'

// ────────────────────────────────────────────────────────────────────────────
// Enums (matching database)
// ────────────────────────────────────────────────────────────────────────────

export const messageStatusSchema = z.enum([
  'pending',
  'scheduled',
  'sent',
  'delivered',
  'read',
  'failed'
])

export const messageChannelSchema = z.enum([
  'whatsapp',
  'email',
  'sms'
])

export const messageDirectionSchema = z.enum([
  'outgoing',
  'incoming'
])

export type MessageStatus = z.infer<typeof messageStatusSchema>
export type MessageChannel = z.infer<typeof messageChannelSchema>
export type MessageDirection = z.infer<typeof messageDirectionSchema>

// ────────────────────────────────────────────────────────────────────────────
// Message Schema (matching actual DB columns)
// ────────────────────────────────────────────────────────────────────────────

export const messageSchema = z.object({
  id: z.string().uuid(),
  event_id: z.string().uuid().nullable(),
  template_id: z.string().uuid().nullable(),
  participant_id: z.string().uuid().nullable(),
  channel: messageChannelSchema,
  to_phone: z.string().nullable(),
  to_phone_normalized: z.string().nullable(),
  to_email: z.string().nullable(),
  subject: z.string().nullable(),
  content: z.string().nullable(),
  variables_used: z.record(z.string(), z.unknown()).nullable(),
  status: messageStatusSchema,
  sent_at: z.string().nullable(),
  delivered_at: z.string().nullable(),
  read_at: z.string().nullable(),
  failed_at: z.string().nullable(),
  error_message: z.string().nullable(),
  external_id: z.string().nullable(),
  response_content: z.string().nullable(),
  response_at: z.string().nullable(),
  direction: messageDirectionSchema.default('outgoing'),
  from_phone: z.string().nullable(),
  auto_reply: z.boolean().default(false),
  created_at: z.string(),
  updated_at: z.string().nullable()
})

export type Message = z.infer<typeof messageSchema>

// ────────────────────────────────────────────────────────────────────────────
// Message with Relations (for table display)
// ────────────────────────────────────────────────────────────────────────────

export const messageWithRelationsSchema = messageSchema.extend({
  events: z.object({
    name: z.string()
  }).nullable(),
  participants: z.object({
    full_name: z.string().nullable(),
    first_name: z.string(),
    last_name: z.string(),
    phone: z.string()
  }).nullable()
})

export type MessageWithRelations = z.infer<typeof messageWithRelationsSchema>

// ────────────────────────────────────────────────────────────────────────────
// Create Message Schema (for sending new messages)
// ────────────────────────────────────────────────────────────────────────────

export const createMessageSchema = z.object({
  event_id: z.string().uuid().optional(),
  participant_id: z.string().uuid().optional(),
  channel: messageChannelSchema.default('whatsapp'),
  to_phone: z.string().regex(/^0[0-9]{9}$/, 'מספר טלפון לא תקין'),
  subject: z.string().optional(),
  content: z.string().min(1, 'תוכן הודעה נדרש')
})

export type CreateMessage = z.infer<typeof createMessageSchema>

// ────────────────────────────────────────────────────────────────────────────
// Filter Schema
// ────────────────────────────────────────────────────────────────────────────

export const messageFiltersSchema = z.object({
  event_id: z.string().uuid().optional(),
  status: messageStatusSchema.optional(),
  channel: messageChannelSchema.optional(),
  direction: messageDirectionSchema.optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  search: z.string().optional()
})

export type MessageFilters = z.infer<typeof messageFiltersSchema>

// ────────────────────────────────────────────────────────────────────────────
// Display Helpers
// ────────────────────────────────────────────────────────────────────────────

export const messageStatusLabels: Record<MessageStatus, string> = {
  pending: 'ממתינה',
  scheduled: 'מתוזמנת',
  sent: 'נשלחה',
  delivered: 'נמסרה',
  read: 'נקראה',
  failed: 'נכשלה'
}

export const messageChannelLabels: Record<MessageChannel, string> = {
  whatsapp: 'WhatsApp',
  email: 'אימייל',
  sms: 'SMS'
}

export const messageStatusColors: Record<MessageStatus, string> = {
  pending: 'bg-zinc-700/50 text-zinc-300',
  scheduled: 'bg-blue-900/40 text-blue-300',
  sent: 'bg-yellow-900/40 text-yellow-300',
  delivered: 'bg-green-900/40 text-green-300',
  read: 'bg-emerald-900/40 text-emerald-300',
  failed: 'bg-red-900/40 text-red-300'
}

export const messageDirectionLabels: Record<MessageDirection, string> = {
  outgoing: 'יוצאת',
  incoming: 'נכנסת'
}

export const messageDirectionColors: Record<MessageDirection, string> = {
  outgoing: 'bg-blue-900/40 text-blue-300',
  incoming: 'bg-purple-900/40 text-purple-300'
}
