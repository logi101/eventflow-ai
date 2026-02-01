// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - Utility Functions
// ═══════════════════════════════════════════════════════════════════════════

import type { EventStatus, ParticipantStatus, VendorStatus, TaskStatus, TaskPriority } from '../types'

// Date Formatting
export const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('he-IL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export const formatDateShort = (date: string) => {
  return new Date(date).toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'short'
  })
}

export const formatTime = (date: string) => {
  return new Date(date).toLocaleTimeString('he-IL', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Currency Formatting
export const formatCurrency = (amount: number, currency: string = 'ILS') => {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency
  }).format(amount)
}

// Event Status Helpers
export const getStatusColor = (status: EventStatus) => {
  const colors: Record<EventStatus, string> = {
    draft: 'bg-white/5 text-zinc-400',
    planning: 'bg-blue-500/20 text-blue-400',
    active: 'bg-emerald-500/20 text-emerald-400',
    completed: 'bg-purple-500/20 text-purple-400',
    cancelled: 'bg-red-500/20 text-red-400',
    archived: 'bg-zinc-500/20 text-zinc-500'
  }
  return colors[status] || colors.draft
}

export const getStatusLabel = (status: EventStatus) => {
  const labels: Record<EventStatus, string> = {
    draft: 'טיוטה',
    planning: 'בתכנון',
    active: 'פעיל',
    completed: 'הסתיים',
    cancelled: 'בוטל',
    archived: 'בארכיון'
  }
  return labels[status] || status
}

// Participant Status Helpers
export const getParticipantStatusColor = (status: ParticipantStatus) => {
  const colors: Record<ParticipantStatus, string> = {
    invited: 'bg-amber-500/20 text-amber-400',
    confirmed: 'bg-emerald-500/20 text-emerald-400',
    declined: 'bg-red-500/20 text-red-400',
    maybe: 'bg-orange-500/20 text-orange-400',
    checked_in: 'bg-blue-500/20 text-blue-400',
    no_show: 'bg-white/5 text-zinc-400'
  }
  return colors[status] || colors.invited
}

export const getParticipantStatusLabel = (status: ParticipantStatus) => {
  const labels: Record<ParticipantStatus, string> = {
    invited: 'הוזמן',
    confirmed: 'אישר הגעה',
    declined: 'לא מגיע',
    maybe: 'אולי',
    checked_in: 'נכנס',
    no_show: 'לא הגיע'
  }
  return labels[status] || status
}

// Phone Normalization
export const normalizePhone = (phone: string): string => {
  let normalized = phone.replace(/\D/g, '')
  if (normalized.startsWith('0')) {
    normalized = '972' + normalized.slice(1)
  }
  return normalized
}

export const formatPhoneDisplay = (phone: string): string => {
  if (!phone) return ''
  // Convert 972501234567 to 050-123-4567
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('972')) {
    const local = '0' + cleaned.slice(3)
    return `${local.slice(0, 3)}-${local.slice(3, 6)}-${local.slice(6)}`
  }
  return phone
}

// Vendor Status Helpers
export const getVendorStatusColor = (status: VendorStatus) => {
  const colors: Record<VendorStatus, string> = {
    pending: 'bg-white/5 text-zinc-400',
    quote_requested: 'bg-amber-500/20 text-amber-400',
    quoted: 'bg-blue-500/20 text-blue-400',
    approved: 'bg-emerald-500/20 text-emerald-400',
    rejected: 'bg-red-500/20 text-red-400',
    confirmed: 'bg-purple-500/20 text-purple-400'
  }
  return colors[status] || colors.pending
}

export const getVendorStatusLabel = (status: VendorStatus) => {
  const labels: Record<VendorStatus, string> = {
    pending: 'ממתין',
    quote_requested: 'נשלחה בקשה',
    quoted: 'התקבלה הצעה',
    approved: 'אושר',
    rejected: 'נדחה',
    confirmed: 'מאושר סופי'
  }
  return labels[status] || status
}

// Star Rating Display
export const renderStars = (rating: number | null) => {
  if (!rating) return null
  return '⭐'.repeat(Math.round(rating))
}

// Task Status Helpers
export const getTaskStatusColor = (status: TaskStatus) => {
  const colors: Record<TaskStatus, string> = {
    pending: 'bg-white/5 text-zinc-400',
    in_progress: 'bg-blue-500/20 text-blue-400',
    completed: 'bg-emerald-500/20 text-emerald-400',
    blocked: 'bg-red-500/20 text-red-400',
    cancelled: 'bg-white/5 text-zinc-400'
  }
  return colors[status]
}

export const getTaskStatusLabel = (status: TaskStatus) => {
  const labels: Record<TaskStatus, string> = {
    pending: 'ממתין',
    in_progress: 'בביצוע',
    completed: 'הושלם',
    blocked: 'חסום',
    cancelled: 'בוטל'
  }
  return labels[status]
}

// Task Priority Helpers
export const getPriorityColor = (priority: TaskPriority) => {
  const colors: Record<TaskPriority, string> = {
    low: 'text-zinc-400',
    medium: 'text-blue-500',
    high: 'text-orange-500',
    critical: 'text-red-400 font-bold'
  }
  return colors[priority]
}

export const getPriorityLabel = (priority: TaskPriority) => {
  const labels: Record<TaskPriority, string> = {
    low: 'נמוכה',
    medium: 'בינונית',
    high: 'גבוהה',
    critical: 'קריטית'
  }
  return labels[priority]
}

// Validation Helpers
export const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export const isValidIsraeliPhone = (phone: string): boolean => {
  const normalized = normalizePhone(phone)
  return /^972[0-9]{9}$/.test(normalized)
}

// String Helpers
export const truncate = (str: string, length: number): string => {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

// Date Helpers
export const isToday = (date: string): boolean => {
  const d = new Date(date)
  const today = new Date()
  return d.toDateString() === today.toDateString()
}

export const isTomorrow = (date: string): boolean => {
  const d = new Date(date)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return d.toDateString() === tomorrow.toDateString()
}

export const isPast = (date: string): boolean => {
  return new Date(date) < new Date()
}
