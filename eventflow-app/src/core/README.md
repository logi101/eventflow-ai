# Core (App Bootstrap)

תשתית ה-application ו-bootstrap logic.

## אחריות:

- **App.tsx** - Main routing (קטן, רק routing)
- **providers/** - Global React providers
- **config/** - App configuration
- **routes.tsx** - Route definitions

## מבנה:

```
core/
├── App.tsx              # Main app component (routing only)
├── providers/
│   ├── AuthProvider.tsx
│   ├── QueryProvider.tsx
│   ├── EventProvider.tsx
│   ├── ChatProvider.tsx
│   └── index.ts
├── config/
│   ├── routes.ts        # Route definitions
│   ├── navigation.ts    # Navigation config
│   └── index.ts
└── index.ts             # Core exports
```

## מטרה:

App.tsx היה:
- ~~8,886 שורות~~ ❌
- ~~All components inline~~ ❌
- ~~All page components inline~~ ❌

App.tsx יהיה:
- **100-200 שורות** ✅ (routing + layout only)
- Clean routing structure
- Module imports from `modules/` and `features/`

## דוגמה:

```typescript
// core/App.tsx (רק routing)
export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <EventProvider>
            <ChatProvider>
              <AppLayout>
                <Routes>
                  {/* Modules */}
                  <Route path="/" element={<HomePage />} />
                  <Route path="/events/*" element={<EventsModule />} />
                  
                  {/* Features */}
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/ai" element={<ChatModule />} />
                </Routes>
              </AppLayout>
            </ChatProvider>
          </EventProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
```

## Migration Steps:

1. ✅ Create folder structure
2. ⏳ Extract providers from App.tsx
3. ⏳ Create clean App.tsx with routing only
4. ⏳ Update imports in pages/
5. ⏳ Test all routes
