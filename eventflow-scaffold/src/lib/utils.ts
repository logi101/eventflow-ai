import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Phone number normalization (Israeli)
export function normalizePhone(phone: string): string {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '')

  // Handle different formats
  if (digits.startsWith('972')) {
    return digits
  }
  if (digits.startsWith('0')) {
    return '972' + digits.slice(1)
  }
  if (digits.length === 9) {
    return '972' + digits
  }

  return digits
}

// Format phone for display
export function formatPhone(phone: string): string {
  const normalized = phone.replace(/\D/g, '')

  if (normalized.startsWith('972')) {
    const local = '0' + normalized.slice(3)
    return `${local.slice(0, 3)}-${local.slice(3, 6)}-${local.slice(6)}`
  }

  if (normalized.startsWith('0')) {
    return `${normalized.slice(0, 3)}-${normalized.slice(3, 6)}-${normalized.slice(6)}`
  }

  return phone
}

// Format currency
export function formatCurrency(
  amount: number,
  currency: 'ILS' | 'USD' | 'EUR' = 'ILS'
): string {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Format date for display
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('he-IL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date))
}

// Format datetime for display
export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('he-IL', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

// Debounce function
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}
