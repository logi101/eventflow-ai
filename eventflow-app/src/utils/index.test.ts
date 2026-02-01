import { describe, it, expect } from 'vitest'
import {
  normalizePhone,
  formatPhoneDisplay,
  isValidEmail,
  isValidIsraeliPhone,
  truncate,
  renderStars,
  formatCurrency,
  getStatusLabel,
  getStatusColor,
  getParticipantStatusLabel,
  getParticipantStatusColor,
  getVendorStatusLabel,
  getTaskStatusLabel,
  getPriorityLabel,
  isToday,
  isTomorrow,
  isPast,
} from './index'

// ─────────────────────────────────────────────────────────
// Phone Normalization
// ─────────────────────────────────────────────────────────

describe('normalizePhone', () => {
  it('converts local Israeli number to international', () => {
    expect(normalizePhone('0501234567')).toBe('972501234567')
  })

  it('keeps international format unchanged', () => {
    expect(normalizePhone('972501234567')).toBe('972501234567')
  })

  it('strips dashes and spaces', () => {
    expect(normalizePhone('050-123-4567')).toBe('972501234567')
    expect(normalizePhone('050 123 4567')).toBe('972501234567')
  })

  it('strips parentheses and plus signs', () => {
    expect(normalizePhone('+972-50-123-4567')).toBe('972501234567')
  })
})

describe('formatPhoneDisplay', () => {
  it('formats international to display format', () => {
    expect(formatPhoneDisplay('972501234567')).toBe('050-123-4567')
  })

  it('returns empty string for empty input', () => {
    expect(formatPhoneDisplay('')).toBe('')
  })

  it('returns original for non-972 numbers', () => {
    expect(formatPhoneDisplay('1234567890')).toBe('1234567890')
  })
})

// ─────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────

describe('isValidEmail', () => {
  it('accepts valid emails', () => {
    expect(isValidEmail('test@example.com')).toBe(true)
    expect(isValidEmail('user.name@domain.co.il')).toBe(true)
  })

  it('rejects invalid emails', () => {
    expect(isValidEmail('invalid')).toBe(false)
    expect(isValidEmail('test @example.com')).toBe(false)
    expect(isValidEmail('@domain.com')).toBe(false)
    expect(isValidEmail('user@')).toBe(false)
  })
})

describe('isValidIsraeliPhone', () => {
  it('validates local format', () => {
    expect(isValidIsraeliPhone('0501234567')).toBe(true)
  })

  it('validates international format', () => {
    expect(isValidIsraeliPhone('972501234567')).toBe(true)
  })

  it('validates with dashes', () => {
    expect(isValidIsraeliPhone('050-123-4567')).toBe(true)
  })

  it('rejects too-short numbers', () => {
    expect(isValidIsraeliPhone('050123')).toBe(false)
  })

  it('rejects non-Israeli numbers', () => {
    expect(isValidIsraeliPhone('1234567890')).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────
// String Helpers
// ─────────────────────────────────────────────────────────

describe('truncate', () => {
  it('returns short strings unchanged', () => {
    expect(truncate('hello', 10)).toBe('hello')
  })

  it('truncates long strings with ellipsis', () => {
    expect(truncate('hello world this is long', 10)).toBe('hello worl...')
  })

  it('handles exact-length strings', () => {
    expect(truncate('hello', 5)).toBe('hello')
  })
})

describe('renderStars', () => {
  it('renders correct number of stars', () => {
    expect(renderStars(3)).toBe('⭐⭐⭐')
    expect(renderStars(5)).toBe('⭐⭐⭐⭐⭐')
    expect(renderStars(1)).toBe('⭐')
  })

  it('returns null for null rating', () => {
    expect(renderStars(null)).toBeNull()
  })

  it('returns null for zero rating', () => {
    expect(renderStars(0)).toBeNull()
  })
})

// ─────────────────────────────────────────────────────────
// Currency
// ─────────────────────────────────────────────────────────

describe('formatCurrency', () => {
  it('formats ILS currency', () => {
    const result = formatCurrency(1500)
    expect(result).toContain('1,500')
  })

  it('formats zero', () => {
    const result = formatCurrency(0)
    expect(result).toContain('0')
  })
})

// ─────────────────────────────────────────────────────────
// Status Labels (Hebrew)
// ─────────────────────────────────────────────────────────

describe('getStatusLabel', () => {
  it('returns Hebrew labels for event statuses', () => {
    expect(getStatusLabel('draft')).toBe('טיוטה')
    expect(getStatusLabel('planning')).toBe('בתכנון')
    expect(getStatusLabel('active')).toBe('פעיל')
    expect(getStatusLabel('completed')).toBe('הסתיים')
    expect(getStatusLabel('cancelled')).toBe('בוטל')
  })
})

describe('getStatusColor', () => {
  it('returns tailwind classes for each status', () => {
    expect(getStatusColor('active')).toContain('emerald')
    expect(getStatusColor('draft')).toContain('zinc')
    expect(getStatusColor('cancelled')).toContain('red')
  })
})

describe('getParticipantStatusLabel', () => {
  it('returns Hebrew labels', () => {
    expect(getParticipantStatusLabel('confirmed')).toBe('אישר הגעה')
    expect(getParticipantStatusLabel('declined')).toBe('לא מגיע')
    expect(getParticipantStatusLabel('invited')).toBe('הוזמן')
    expect(getParticipantStatusLabel('checked_in')).toBe('נכנס')
  })
})

describe('getParticipantStatusColor', () => {
  it('returns color classes', () => {
    expect(getParticipantStatusColor('confirmed')).toContain('emerald')
    expect(getParticipantStatusColor('declined')).toContain('red')
  })
})

describe('getVendorStatusLabel', () => {
  it('returns Hebrew labels', () => {
    expect(getVendorStatusLabel('pending')).toBe('ממתין')
    expect(getVendorStatusLabel('approved')).toBe('אושר')
    expect(getVendorStatusLabel('confirmed')).toBe('מאושר סופי')
  })
})

describe('getTaskStatusLabel', () => {
  it('returns Hebrew labels', () => {
    expect(getTaskStatusLabel('pending')).toBe('ממתין')
    expect(getTaskStatusLabel('in_progress')).toBe('בביצוע')
    expect(getTaskStatusLabel('completed')).toBe('הושלם')
  })
})

describe('getPriorityLabel', () => {
  it('returns Hebrew labels', () => {
    expect(getPriorityLabel('low')).toBe('נמוכה')
    expect(getPriorityLabel('critical')).toBe('קריטית')
  })
})

// ─────────────────────────────────────────────────────────
// Date Helpers
// ─────────────────────────────────────────────────────────

describe('isToday', () => {
  it('returns true for today', () => {
    expect(isToday(new Date().toISOString())).toBe(true)
  })

  it('returns false for yesterday', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    expect(isToday(yesterday.toISOString())).toBe(false)
  })
})

describe('isTomorrow', () => {
  it('returns true for tomorrow', () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    expect(isTomorrow(tomorrow.toISOString())).toBe(true)
  })

  it('returns false for today', () => {
    expect(isTomorrow(new Date().toISOString())).toBe(false)
  })
})

describe('isPast', () => {
  it('returns true for past dates', () => {
    expect(isPast('2020-01-01')).toBe(true)
  })

  it('returns false for future dates', () => {
    expect(isPast('2030-01-01')).toBe(false)
  })
})
