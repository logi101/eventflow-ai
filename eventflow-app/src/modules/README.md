# Modules (Business Domains)

מבנה מודולרית לפי תחומי עניין עסקיים (Business Domains).

## תחומי עניין צפויים:

- **events** - ניהול אירועים
- **participants** - ניהול משתתפים + מלווים
- **vendors** - ניהול ספקים + הצעות מחיר
- **program** - בונה תוכנית אירוע (Program Builder)
- **checklist** - ניהול מטלות משימות
- **communication** - תקשורת (WhatsApp, אימייל, SMS)
- **checkin** - צ'ק-אין + QR codes
- **feedback** - סקרים ומשוב משתתפים
- **reports** - דוחות וניתוחים

## מבנה כל מודול:

```
modules/[domain]/
├── types.ts              # Types ייחודיים למודול
├── hooks/               # Custom hooks
│   ├── use*.ts
│   └── index.ts
├── components/          # Components ייחודיים למודול
│   ├── ComponentName.tsx
│   ├── ComponentName.test.tsx
│   └── index.ts
├── pages/              # Page components
│   ├── PageName.tsx
│   └── index.ts
├── services/            # API calls (אם צריך)
│   └── api.ts
└── index.ts            # Exports ציבורי
```

## כללים לפיתוח מודול:

1. **Self-contained** - כל הטיפוס, hooks, ו-components נמצאים בתוך המודול
2. **Explicit exports** - export רק מה שצריך מ-`index.ts`
3. **Type-safe** - כל ה-types מוגדרים ב-`types.ts`
4. **No external dependencies** - אין dependencies למודולים אחרים
5. **Testable** - כל component/hooks ניתנים ל-testing

## דוגמה - Events Module:

```typescript
// modules/events/types.ts
export interface Event { ... }

// modules/events/hooks/useEvents.ts
export function useEvents() { ... }

// modules/events/components/EventList.tsx
export function EventList() { ... }

// modules/events/pages/EventsPage.tsx
export function EventsPage() { ... }

// modules/events/index.ts
export { Event } from './types'
export { useEvents } from './hooks'
export { EventsPage } from './pages/EventsPage'
```

## העברה מ-App.tsx:

- רוב הקוד מ-App.tsx (8,886 שורות) יועבר למודולים
- App.tsx יכיל רק:
  - Routing
  - Global providers
  - Layout components
