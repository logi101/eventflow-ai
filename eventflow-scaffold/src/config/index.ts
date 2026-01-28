// Centralized configuration for EventFlow

export const config = {
  // App
  app: {
    name: 'EventFlow AI',
    version: '2.0.0',
    locale: 'he-IL',
    direction: 'rtl' as const,
  },

  // API
  api: {
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
    supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  },

  // Validation
  validation: {
    phone: {
      pattern: /^0[0-9]{9}$/,
      message: 'מספר טלפון לא תקין (10 ספרות)',
    },
    email: {
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'כתובת אימייל לא תקינה',
    },
  },

  // Feature flags
  features: {
    aiChat: true,
    whatsApp: true,
    qrCheckin: true,
    vendorManagement: true,
    analytics: false, // Coming soon
  },

  // Limits
  limits: {
    maxParticipants: 10000,
    maxCompanions: 5,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxMessageLength: 2000,
  },

  // Event types
  eventTypes: [
    { value: 'conference', label: 'כנס' },
    { value: 'wedding', label: 'חתונה' },
    { value: 'corporate', label: 'אירוע חברה' },
    { value: 'birthday', label: 'יום הולדת' },
    { value: 'bar_mitzvah', label: 'בר/בת מצווה' },
    { value: 'other', label: 'אחר' },
  ] as const,

  // Vendor categories
  vendorCategories: [
    { value: 'catering', label: 'קייטרינג' },
    { value: 'venue', label: 'אולם/מקום' },
    { value: 'photography', label: 'צילום' },
    { value: 'music', label: 'מוזיקה/DJ' },
    { value: 'flowers', label: 'פרחים' },
    { value: 'design', label: 'עיצוב' },
    { value: 'equipment', label: 'ציוד' },
    { value: 'transportation', label: 'הסעות' },
    { value: 'entertainment', label: 'בידור' },
    { value: 'other', label: 'אחר' },
  ] as const,

  // Participant statuses
  participantStatuses: [
    { value: 'pending', label: 'ממתין', color: 'yellow' },
    { value: 'confirmed', label: 'אישר הגעה', color: 'green' },
    { value: 'declined', label: 'סירב', color: 'red' },
    { value: 'cancelled', label: 'בוטל', color: 'gray' },
  ] as const,
} as const

// Type exports
export type EventType = typeof config.eventTypes[number]['value']
export type VendorCategory = typeof config.vendorCategories[number]['value']
export type ParticipantStatus = typeof config.participantStatuses[number]['value']
