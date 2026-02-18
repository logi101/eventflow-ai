// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - App Entry Point
// ═══════════════════════════════════════════════════════════════════════════

import { lazy, Suspense } from 'react'
import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

// Layout & Components
import { Sidebar } from './components/layout/Sidebar'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { GracePeriodBanner } from './components/shared/GracePeriodBanner'
import { GracePeriodConfirmationPopup } from './components/shared/ConfirmationPopup'
import { FeatureGuard } from './components/guards/FeatureGuard'
import { ErrorBoundary } from './components/ErrorBoundary'
import { isSupabaseConfigured, supabaseConfigError } from './lib/supabase'

// Lazy-loaded pages (heavy/less frequently visited)
const HomePage = lazy(() => import('./pages/home/HomePage').then(m => ({ default: m.HomePage })))
const LoginPage = lazy(() => import('./pages/auth/Login').then(m => ({ default: m.LoginPage })))
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPassword').then(m => ({ default: m.ForgotPasswordPage })))
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPassword').then(m => ({ default: m.ResetPasswordPage })))
const FloatingChat = lazy(() => import('./components/chat/FloatingChat').then(m => ({ default: m.FloatingChat })))
const EventDetailPage = lazy(() => import('./pages/events/EventDetailPage').then(m => ({ default: m.EventDetailPage })))
const EventDashboardPage = lazy(() => import('./pages/event/EventDashboardPage').then(m => ({ default: m.EventDashboardPage })))
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })))
const GuestsPage = lazy(() => import('./pages/guests/GuestsPage').then(m => ({ default: m.GuestsPage })))
const VendorsPage = lazy(() => import('./pages/vendors/VendorsPage').then(m => ({ default: m.VendorsPage })))
const ChecklistPage = lazy(() => import('./pages/checklist/ChecklistPage').then(m => ({ default: m.ChecklistPage })))
const SchedulesPage = lazy(() => import('./pages/schedules/SchedulesPage').then(m => ({ default: m.SchedulesPage })))
const ProgramManagementPage = lazy(() => import('./pages/program/ProgramManagementPage').then(m => ({ default: m.ProgramManagementPage })))
const MessagesPage = lazy(() => import('./pages/messages/MessagesPage').then(m => ({ default: m.MessagesPage })))
const ReminderSettingsPage = lazy(() => import('./pages/settings/ReminderSettingsPage').then(m => ({ default: m.ReminderSettingsPage })))
const TierComparisonPage = lazy(() => import('./app/routes/settings/tiers').then(m => ({ default: m.TierComparisonPage })))
const AdminTiersPage = lazy(() => import('./app/routes/admin/tiers').then(m => ({ default: m.AdminTiersPage })))
const TestWhatsAppPage = lazy(() => import('./pages/admin/TestWhatsAppPage').then(m => ({ default: m.TestWhatsAppPage })))
const UserManagementPage = lazy(() => import('./pages/admin/UserManagementPage').then(m => ({ default: m.UserManagementPage })))
const SimulationPage = lazy(() => import('./pages/event/SimulationPage').then(m => ({ default: m.SimulationPage })))
const NetworkingPage = lazy(() => import('./pages/event/NetworkingPage').then(m => ({ default: m.NetworkingPage })))
const ContingencyPage = lazy(() => import('./pages/event/ContingencyPage').then(m => ({ default: m.ContingencyPage })))
const AIAssistantPage = lazy(() => import('./pages/ai/AIAssistantPage').then(m => ({ default: m.AIAssistantPage })))
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage').then(m => ({ default: m.ReportsPage })))
const FeedbackPage = lazy(() => import('./pages/feedback/FeedbackPage').then(m => ({ default: m.FeedbackPage })))
const CheckinPage = lazy(() => import('./pages/checkin/CheckinPage').then(m => ({ default: m.CheckinPage })))

function LazyFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
    </div>
  )
}

function SupabaseSetupNotice() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 px-6" dir="rtl">
      <div className="max-w-2xl w-full text-center">
        <h1 className="text-3xl font-bold text-white mb-4">חסרות הגדרות Supabase</h1>
        <p className="text-zinc-300 mb-6">
          האפליקציה לא יכולה לעלות בלי משתני סביבה. יש להגדיר את הערכים הבאים בקובץ <span className="font-mono">.env</span> ולהפעיל מחדש את השרת.
        </p>
        <div className="bg-zinc-900/70 border border-zinc-700 rounded-xl p-4 text-left text-sm text-zinc-200">
          <div className="font-mono">VITE_SUPABASE_URL=...</div>
          <div className="font-mono">VITE_SUPABASE_ANON_KEY=...</div>
        </div>
        {supabaseConfigError && (
          <p className="text-red-400 mt-4 text-sm">{supabaseConfigError}</p>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Main App Layout (with Sidebar)
// ═══════════════════════════════════════════════════════════════════════════

function AppLayout() {
  return (
    <ErrorBoundary>
      <div className="flex" dir="rtl" data-testid="app-container">
        <Sidebar />
        <main className="flex-1 min-h-screen min-w-0" data-testid="main-content">
          <Routes>
          {/* Home - Event Selection */}
          <Route path="/" element={<Suspense fallback={<LazyFallback />}><HomePage /></Suspense>} />

          {/* Event Detail/Editing */}
          <Route path="/events/new" element={<Navigate to="/" replace />} />
          <Route path="/events/:eventId" element={<Suspense fallback={<LazyFallback />}><EventDetailPage /></Suspense>} />
          <Route path="/events/:eventId/program" element={<Suspense fallback={<LazyFallback />}><EventDetailPage initialTab="program" /></Suspense>} />
          <Route path="/event/edit" element={<Suspense fallback={<LazyFallback />}><EventDetailPage /></Suspense>} />

          {/* Event-Scoped Routes (require selected event) */}
          <Route path="/event/dashboard" element={<Suspense fallback={<LazyFallback />}><EventDashboardPage /></Suspense>} />
          <Route path="/event/guests" element={<Suspense fallback={<LazyFallback />}><GuestsPage /></Suspense>} />
          <Route path="/event/schedule" element={<Suspense fallback={<LazyFallback />}><SchedulesPage /></Suspense>} />
          <Route path="/event/program" element={<Suspense fallback={<LazyFallback />}><ProgramManagementPage /></Suspense>} />
          <Route path="/event/vendors" element={<Suspense fallback={<LazyFallback />}><VendorsPage /></Suspense>} />
          <Route path="/event/checklist" element={<Suspense fallback={<LazyFallback />}><ChecklistPage /></Suspense>} />
          <Route path="/event/messages" element={<Suspense fallback={<LazyFallback />}><MessagesPage /></Suspense>} />
          <Route path="/event/feedback" element={<Suspense fallback={<LazyFallback />}><FeedbackPage /></Suspense>} />
          <Route path="/event/checkin" element={<Suspense fallback={<LazyFallback />}><CheckinPage /></Suspense>} />
          <Route path="/event/reports" element={<Suspense fallback={<LazyFallback />}><ReportsPage /></Suspense>} />
          <Route path="/event/reminder-settings" element={<Suspense fallback={<LazyFallback />}><ReminderSettingsPage /></Suspense>} />
          <Route path="/event/simulation" element={<Suspense fallback={<LazyFallback />}><SimulationPage /></Suspense>} />
          <Route path="/event/networking" element={<Suspense fallback={<LazyFallback />}><NetworkingPage /></Suspense>} />
          <Route path="/event/contingency" element={<Suspense fallback={<LazyFallback />}><ContingencyPage /></Suspense>} />

          {/* Global Routes (no event required) */}
          <Route path="/ai" element={
            <FeatureGuard feature="ai">
              <Suspense fallback={<LazyFallback />}><AIAssistantPage /></Suspense>
            </FeatureGuard>
          } />
          <Route path="/settings" element={<Suspense fallback={<LazyFallback />}><DashboardPage /></Suspense>} />
          <Route path="/settings/tiers" element={<Suspense fallback={<LazyFallback />}><TierComparisonPage /></Suspense>} />
          <Route path="/admin/tiers" element={
            <ProtectedRoute requiredRole="admin">
              <Suspense fallback={<LazyFallback />}><AdminTiersPage /></Suspense>
            </ProtectedRoute>
          } />
          <Route path="/admin/test-whatsapp" element={
            <ProtectedRoute requiredRole="admin">
              <Suspense fallback={<LazyFallback />}><TestWhatsAppPage /></Suspense>
            </ProtectedRoute>
          } />
          <Route path="/admin/users" element={
            <ProtectedRoute requiredRole="super_admin">
              <Suspense fallback={<LazyFallback />}><UserManagementPage /></Suspense>
            </ProtectedRoute>
          } />

          {/* Legacy routes - redirect to home */}
          <Route path="/events" element={<Suspense fallback={<LazyFallback />}><HomePage /></Suspense>} />
          <Route path="/guests" element={<Suspense fallback={<LazyFallback />}><HomePage /></Suspense>} />
          <Route path="/schedules" element={<Suspense fallback={<LazyFallback />}><HomePage /></Suspense>} />
          <Route path="/program" element={<Suspense fallback={<LazyFallback />}><HomePage /></Suspense>} />
          <Route path="/vendors" element={<Suspense fallback={<LazyFallback />}><HomePage /></Suspense>} />
          <Route path="/checklist" element={<Suspense fallback={<LazyFallback />}><HomePage /></Suspense>} />
          <Route path="/messages" element={<Suspense fallback={<LazyFallback />}><HomePage /></Suspense>} />
          <Route path="/feedback" element={<Suspense fallback={<LazyFallback />}><HomePage /></Suspense>} />
          <Route path="/checkin" element={<Suspense fallback={<LazyFallback />}><HomePage /></Suspense>} />
          <Route path="/reports" element={<Suspense fallback={<LazyFallback />}><HomePage /></Suspense>} />
        </Routes>
      </main>

      {/* Floating AI Chat */}
      <FeatureGuard feature="ai">
        <Suspense fallback={null}>
          <FloatingChat />
        </Suspense>
      </FeatureGuard>

      {/* Grace Period System */}
      <GracePeriodBanner />
      <GracePeriodConfirmationPopup />
      </div>
    </ErrorBoundary>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Main App with Auth Routes
// ═══════════════════════════════════════════════════════════════════════════

export default function App() {
  const location = useLocation()
  const isAuthPage = ['/login', '/forgot-password', '/reset-password'].includes(location.pathname)

  if (!isSupabaseConfigured) {
    return <SupabaseSetupNotice />
  }

  // Auth pages - full screen without sidebar
  if (isAuthPage) {
    return (
      <div dir="rtl">
        <Routes>
          <Route path="/login" element={<Suspense fallback={<LazyFallback />}><LoginPage /></Suspense>} />
          <Route path="/signup" element={<Navigate to="/login" replace />} />
          <Route path="/forgot-password" element={<Suspense fallback={<LazyFallback />}><ForgotPasswordPage /></Suspense>} />
          <Route path="/reset-password" element={<Suspense fallback={<LazyFallback />}><ResetPasswordPage /></Suspense>} />
        </Routes>
      </div>
    )
  }

  // Main app with sidebar - requires authentication
  return (
    <ProtectedRoute>
      <AppLayout />
    </ProtectedRoute>
  )
}
