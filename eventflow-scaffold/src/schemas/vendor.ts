import { z } from 'zod'

export const vendorCategoryEnum = z.enum([
  'catering',
  'venue',
  'photography',
  'music',
  'flowers',
  'design',
  'equipment',
  'transportation',
  'entertainment',
  'other'
])

export const vendorSchema = z.object({
  name: z.string().min(2, 'שם ספק חייב להכיל לפחות 2 תווים').max(100),
  category: vendorCategoryEnum,
  contact_name: z.string().min(2).optional(),
  contact_phone: z.string().regex(/^0[0-9]{9}$/, 'מספר טלפון לא תקין').optional().or(z.literal('')),
  contact_email: z.string().email('אימייל לא תקין').optional().or(z.literal('')),
  website: z.string().url('כתובת אתר לא תקינה').optional().or(z.literal('')),
  notes: z.string().max(1000).optional(),
  rating: z.number().min(1).max(5).optional(),
  is_preferred: z.boolean().default(false),
})

export const eventVendorSchema = z.object({
  event_id: z.string().uuid(),
  vendor_id: z.string().uuid(),
  status: z.enum(['pending', 'quoted', 'approved', 'rejected', 'contracted']).default('pending'),
  quote_amount: z.number().min(0).optional(),
  quote_currency: z.enum(['ILS', 'USD', 'EUR']).default('ILS'),
  quote_valid_until: z.string().datetime().optional(),
  contract_signed: z.boolean().default(false),
  deposit_paid: z.boolean().default(false),
  deposit_amount: z.number().min(0).optional(),
  notes: z.string().max(2000).optional(),
})

export type Vendor = z.infer<typeof vendorSchema>
export type EventVendor = z.infer<typeof eventVendorSchema>
export type VendorCategory = z.infer<typeof vendorCategoryEnum>
