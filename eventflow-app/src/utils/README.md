# Utils (Utility Functions)

פונקציות עזר שימושיות בכל המערכת.

## פונקציות זמינות:

### Date & Time Formatting
```typescript
formatDate(date: string): string          // 28/01/2026 14:30
formatDateShort(date: string): string     // 28 ינו
formatTime(date: string): string          // 14:30
isToday(date: string): boolean           // האם היום
isTomorrow(date: string): boolean        // האם מחר
isPast(date: string): boolean            // האם עבר
```

### Currency Formatting
```typescript
formatCurrency(amount: number, currency?: string): string  // ₪1,234.56
```

### Status Helpers
```typescript
// Events
getStatusColor(status: EventStatus): string
getStatusLabel(status: EventStatus): string

// Participants
getParticipantStatusColor(status: ParticipantStatus): string
getParticipantStatusLabel(status: ParticipantStatus): string

// Vendors
getVendorStatusColor(status: VendorStatus): string
getVendorStatusLabel(status: VendorStatus): string

// Tasks
getTaskStatusColor(status: TaskStatus): string
getTaskStatusLabel(status: TaskStatus): string
getPriorityColor(priority: TaskPriority): string
getPriorityLabel(priority: TaskPriority): string
```

### Phone Numbers
```typescript
normalizePhone(phone: string): string        // 972501234567
formatPhoneDisplay(phone: string): string   // 050-123-4567
isValidIsraeliPhone(phone: string): boolean // true/false
```

### String Helpers
```typescript
truncate(str: string, length: number): string  // "Hello..." (truncated)
```

### Validation
```typescript
isValidEmail(email: string): boolean
isValidIsraeliPhone(phone: string): boolean
```

### Ratings
```typescript
renderStars(rating: number | null): string | null  // ⭐⭐⭐⭐⭐
```

## שימושים:

```typescript
// ב-page או component
import {
  formatDate,
  formatTime,
  formatCurrency,
  getStatusColor,
  getParticipantStatusLabel
} from '@/utils'

export function MyComponent() {
  return (
    <div>
      <span className={getStatusColor(event.status)}>
        {getStatusLabel(event.status)}
      </span>
      <span>{formatDate(event.start_date)}</span>
      <span>{formatCurrency(budget, 'ILS')}</span>
    </div>
  )
}
```

## הוספות עתידות:

- [ ] Add timezone support
- [ ] Add pluralization (Hebrew)
- [ ] Add relative dates ("יום שליש")
- [ ] Add file size formatting
- [ ] Add number formatting (1,000 / 1K / 1M)
