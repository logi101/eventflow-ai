import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { ChatProvider } from './contexts/ChatContext'
import { AuthProvider } from './contexts/AuthContext'
import { EventProvider } from './contexts/EventContext'
import { GracePeriodProvider } from './contexts/GracePeriodContext'
import { TierProvider } from './contexts/TierContext'
import { setupAutoSync } from './modules/checkin/services/syncService'
import { ErrorBoundary } from './components/ErrorBoundary'
import { initSentry } from './lib/sentry'

initSentry()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
})

// Initialize auto-sync for offline check-ins
setupAutoSync()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <EventProvider>
              <TierProvider>
                <GracePeriodProvider>
                  <ChatProvider>
                    <App />
                  </ChatProvider>
                </GracePeriodProvider>
              </TierProvider>
            </EventProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
