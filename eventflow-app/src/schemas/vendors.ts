// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - Vendors Zod Schemas (Matching actual DB structure)
// ═══════════════════════════════════════════════════════════════════════════

import { z } from 'zod'
import { ISRAELI_PHONE_REGEX } from './participants'

// ────────────────────────────────────────────────────────────────────────────
// Enums (matching database)
// ────────────────────────────────────────────────────────────────────────────

export const vendorStatusSchema = z.enum([
  'pending',
  'quote_requested',
  'quoted',
  'approved',
  'rejected',
  'confirmed'
])

export type VendorStatus = z.infer<typeof vendorStatusSchema>

// ────────────────────────────────────────────────────────────────────────────
// Vendor Category Schema (vendor_categories table)
// ────────────────────────────────────────────────────────────────────────────

export const vendorCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'שם הקטגוריה נדרש'),
  name_en: z.string().nullable(),
  icon: z.string().nullable(),
  description: z.string().nullable(),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().min(0)
})

export type VendorCategory = z.infer<typeof vendorCategorySchema>

// ────────────────────────────────────────────────────────────────────────────
// Vendor Schema (matching actual DB columns)
// ────────────────────────────────────────────────────────────────────────────

export const vendorSchema = z.object({
  id: z.string().uuid(),
  category_id: z.string().uuid().nullable(),
  name: z.string().min(1, 'שם הספק נדרש'),
  contact_name: z.string().nullable(),
  email: z.string().email('כתובת אימייל לא תקינה').nullable(),
  phone: z.string().regex(ISRAELI_PHONE_REGEX, 'מספר טלפון לא תקין').nullable(),
  website: z.string().url('כתובת אתר לא תקינה').nullable(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  description: z.string().nullable(),
  notes: z.string().nullable(),
  rating: z.number().min(0).max(5).nullable(),
  status: vendorStatusSchema,
  tags: z.array(z.string()).nullable(),
  created_at: z.string(),
  vendor_categories: vendorCategorySchema.optional(),
  events_count: z.number().int().min(0).optional()
})

export type Vendor = z.infer<typeof vendorSchema>

// ────────────────────────────────────────────────────────────────────────────
// Create Vendor Schema (for adding new vendors)
// ────────────────────────────────────────────────────────────────────────────

export const createVendorSchema = z.object({
  name: z.string().min(2, 'שם הספק חייב להכיל לפחות 2 תווים'),
  category_id: z.string().uuid('יש לבחור קטגוריה').optional(),
  contact_name: z.string().optional(),
  email: z.string().email('כתובת אימייל לא תקינה').optional().or(z.literal('')),
  phone: z.string().regex(ISRAELI_PHONE_REGEX, 'מספר טלפון לא תקין').optional().or(z.literal('')),
  website: z.string().url('כתובת אתר לא תקינה').optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  rating: z.string().optional(),
  status: vendorStatusSchema.default('pending'),
  tags: z.string().optional()
})

export type CreateVendor = z.infer<typeof createVendorSchema>

// ────────────────────────────────────────────────────────────────────────────
// Vendor Form Data Schema (matching VendorFormData interface)
// ────────────────────────────────────────────────────────────────────────────

export const vendorFormDataSchema = z.object({
  name: z.string().min(2, 'שם הספק חייב להכיל לפחות 2 תווים'),
  category_id: z.string(),
  contact_name: z.string(),
  email: z.string(),
  phone: z.string(),
  website: z.string(),
  address: z.string(),
  city: z.string(),
  description: z.string(),
  notes: z.string(),
  rating: z.string(),
  status: vendorStatusSchema,
  tags: z.string()
})

export type VendorFormData = z.infer<typeof vendorFormDataSchema>

// ────────────────────────────────────────────────────────────────────────────
// Event-Vendor Schema (event_vendors table)
// ────────────────────────────────────────────────────────────────────────────

export const eventVendorSchema = z.object({
  id: z.string().uuid(),
  event_id: z.string().uuid(),
  vendor_id: z.string().uuid(),
  category_id: z.string().uuid().nullable(),
  status: vendorStatusSchema,
  quote_requested_at: z.string().nullable(),
  quote_request_notes: z.string().nullable(),
  quote_received_at: z.string().nullable(),
  quoted_amount: z.number().min(0).nullable(),
  quote_valid_until: z.string().nullable(),
  quote_notes: z.string().nullable(),
  quote_document_url: z.string().url().nullable(),
  approved_amount: z.number().min(0).nullable(),
  approved_at: z.string().nullable(),
  approved_by: z.string().uuid().nullable(),
  contract_signed: z.boolean().default(false),
  contract_document_url: z.string().url().nullable(),
  payment_terms: z.string().nullable(),
  deposit_amount: z.number().min(0).nullable(),
  deposit_paid: z.boolean().default(false),
  final_amount: z.number().min(0).nullable(),
  final_paid: z.boolean().default(false),
  arrival_time: z.string().nullable(),
  arrival_confirmed: z.boolean().default(false),
  arrival_confirmed_at: z.string().nullable(),
  actual_arrival_time: z.string().nullable(),
  post_event_rating: z.number().min(0).max(5).nullable(),
  post_event_notes: z.string().nullable(),
  would_use_again: z.boolean().nullable(),
  notes: z.string().nullable(),
  created_at: z.string(),
  vendors: vendorSchema.optional()
})

export type EventVendor = z.infer<typeof eventVendorSchema>

// ────────────────────────────────────────────────────────────────────────────
// Filter Schema
// ────────────────────────────────────────────────────────────────────────────

export const vendorFiltersSchema = z.object({
  category_id: z.string().uuid().optional(),
  status: vendorStatusSchema.optional(),
  city: z.string().optional(),
  search: z.string().optional()
})

export type VendorFilters = z.infer<typeof vendorFiltersSchema>

// ────────────────────────────────────────────────────────────────────────────
// Display Helpers
// ────────────────────────────────────────────────────────────────────────────

export const vendorStatusLabels: Record<VendorStatus, string> = {
  pending: 'ממתין',
  quote_requested: 'נשלחה בקשת הצעה',
  quoted: 'התקבלה הצעה',
  approved: 'מאושר',
  rejected: 'נדחה',
  confirmed: 'מאושר סופית'
}

export const vendorStatusColors: Record<VendorStatus, string> = {
  pending: 'bg-zinc-700/50 text-zinc-300',
  quote_requested: 'bg-blue-900/40 text-blue-300',
  quoted: 'bg-yellow-900/40 text-yellow-300',
  approved: 'bg-green-900/40 text-green-300',
  rejected: 'bg-red-900/40 text-red-300',
  confirmed: 'bg-emerald-900/40 text-emerald-300'
}
