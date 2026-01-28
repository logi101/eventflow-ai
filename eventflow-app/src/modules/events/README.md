# 📁 Events Module Extraction

הפקה - חילוץ Events Module מ-App.tsx.

## רכיבים שנוצרו:

### 1. Types (`src/modules/events/types.ts`)
```typescript
export interface EventFormData {
  name: string
  description: string
  event_type_id: string
  start_date: string
  end_date: string
  venue_name: string
  venue_address: string
  venue_city: string
  max_participants: string
  budget: string
  status: EventStatus
}
```

### 2. EventCard Component (`src/modules/events/components/EventCard.tsx`)
- Reusable event card
- Displays: name, status, type, description, dates, venue
- Stats: participants count, checklist progress, vendors count
- Actions: edit and delete buttons

### 3. EventForm Component (`src/modules/events/components/EventForm.tsx`)
- Reusable event form modal
- All fields for creating/editing events
- Validation: name and start_date are required
- Submit handler passed as prop

### 4. EventsPage Component (`src/modules/events/pages/EventsPage.tsx`)
- Full events management page
- Features:
  - Filter by status
  - Create/Edit events
  - Delete events
  - Fetch events with stats (participants, checklist, vendors)
  - Auto-open modal when navigating to /events/new

### 5. Index File (`src/modules/events/index.ts`)
- Barrel exports for all components and types

## מבנה:
```
src/modules/events/
├── types.ts              # Event types
├── components/
│   ├── EventCard.tsx    # Event display card
│   ├── EventForm.tsx    # Event form modal
│   └── EventCard.tsx    # (exported from index.ts)
├── pages/
│   └── EventsPage.tsx   # Main events page
└── index.ts             # Barrel exports
```

## Usage Example:
```typescript
import { EventsPage } from '@/modules/events'

// Or import individual components
import { EventCard, EventForm } from '@/modules/events'
import type { EventFormData } from '@/modules/events'
```

## Notes:
- Components use existing utility functions (formatDate, getStatusLabel, etc.)
- Components use existing styling (premium-card, premium-btn-primary, etc.)
- TypeScript strict with proper types
- RTL-ready components

## Next Steps:
- Import EventsPage in App.tsx
- Replace old EventsPage in App.tsx with new import
- Update routing if needed
