# Features (Cross-Cutting Concerns)

תכונות ו-components שמשותפות למספר תחומי עניין.

## תחומי עניין צפויים:

### Shared Components
- **ui/** - Base UI components (Button, Input, Modal, etc.)
- **feedback/** - Feedback UI (StatsCard, EmptyState, LoadingState)
- **data/** - Data presentation (FilterBar, SearchBar, Pagination)
- **layout/** - Layout components (Header, Sidebar, LoadingScreen)

### Features
- **auth** - Authentication (Login, Signup, ForgotPassword, ProtectedRoute)
- **chat** - AI Chat interface
- **shared** - Shared utilities (Toast, Notifications, Modals)

## מבנה:

```
features/
├── ui/                    # Base UI components
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Select.tsx
│   ├── Modal.tsx
│   ├── Card.tsx
│   ├── Badge.tsx
│   └── index.ts
├── feedback/              # Feedback components
│   ├── StatsCard.tsx
│   ├── EmptyState.tsx
│   ├── LoadingState.tsx
│   └── index.ts
├── data/                  # Data components
│   ├── FilterBar.tsx
│   ├── SearchBar.tsx
│   ├── Pagination.tsx
│   └── index.ts
├── auth/                  # Authentication
│   ├── LoginPage.tsx
│   ├── SignupPage.tsx
│   ├── ForgotPasswordPage.tsx
│   ├── ProtectedRoute.tsx
│   └── index.ts
├── chat/                  # AI Chat
│   ├── ChatWindow.tsx
│   ├── ChatInput.tsx
│   ├── ChatMessage.tsx
│   ├── FloatingChat.tsx
│   ├── SlashCommandMenu.tsx
│   └── index.ts
└── shared/                # Shared utilities
    ├── Toast.tsx
    ├── Notifications.tsx
    └── index.ts
```

## כללים:

1. **Reusable** - Components שיכולים לשימוש בכל מקום
2. **Accessible** - Full a11y support
3. **Theme-aware** - תומכים ב-Dark Theme
4. **RTL-ready** - תמיכה מלאה לעברית
5. **Storybook-ready** - מוכן ל-Storybook

## שימוש:

```typescript
// מ-components/ מוגדרים כעת
import { Button, Modal, Input } from '@/features/ui'
import { StatsCard } from '@/features/feedback'

export function MyPage() {
  return (
    <div>
      <StatsCard title="משתתפים" value={42} />
      <Modal>
        <Input placeholder="הקלד שם" />
        <Button variant="primary">שמור</Button>
      </Modal>
    </div>
  )
}
```
