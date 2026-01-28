import { z } from 'zod'

// Israeli phone validation
const israeliPhone = z.string().regex(/^0[0-9]{9}$/, 'מספר טלפון לא תקין')

export const participantSchema = z.object({
  first_name: z.string().min(2, 'שם חייב להכיל לפחות 2 תווים'),
  last_name: z.string().min(2, 'שם משפחה חייב להכיל לפחות 2 תווים'),
  phone: israeliPhone,
  email: z.string().email('כתובת אימייל לא תקינה').optional().or(z.literal('')),
  status: z.enum(['pending', 'confirmed', 'declined', 'cancelled']).default('pending'),
  notes: z.string().max(500, 'הערות מוגבלות ל-500 תווים').optional(),
  has_companion: z.boolean().default(false),
  companion_name: z.string().optional(),
  companion_phone: israeliPhone.optional().or(z.literal('')),
  dietary_restrictions: z.string().optional(),
  accessibility_needs: z.string().optional(),
})

export const participantCreateSchema = participantSchema.extend({
  event_id: z.string().uuid('מזהה אירוע לא תקין'),
})

export const participantUpdateSchema = participantSchema.partial()

export type Participant = z.infer<typeof participantSchema>
export type ParticipantCreate = z.infer<typeof participantCreateSchema>
export type ParticipantUpdate = z.infer<typeof participantUpdateSchema>

// Companion validation - only required if has_companion is true
export const validateCompanion = (data: Participant) => {
  if (data.has_companion) {
    if (!data.companion_name || data.companion_name.length < 2) {
      return { valid: false, error: 'שם מלווה חייב להכיל לפחות 2 תווים' }
    }
  }
  return { valid: true }
}
