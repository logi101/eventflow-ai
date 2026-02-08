// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - App Entry Point
// ═══════════════════════════════════════════════════════════════════════════

import { lazy, Suspense } from 'react'
import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

// Layout & Components
import { Sidebar } from './components/layout/Sidebar'
import { FloatingChat } from './components/chat'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { GracePeriodBanner } from './components/shared/GracePeriodBanner'
import { GracePeriodConfirmationPopup } from './components/shared/ConfirmationPopup'
import { FeatureGuard } from './components/guards/FeatureGuard'
import { ErrorBoundary } from './components/ErrorBoundary'

// Pages (static imports for core/lightweight pages)
import { HomePage } from './pages/home/HomePage'
import { EventDashboardPage } from './pages/event/EventDashboardPage'
import {
  DashboardPage,
  GuestsPage,
  VendorsPage,
  ChecklistPage,
  SchedulesPage,
  ProgramManagementPage,
  MessagesPage,
  ReminderSettingsPage,
  EventDetailPage,
  LoginPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  TestWhatsAppPage,
} from './pages'
import { UserManagementPage } from './pages/admin/UserManagementPage'
import { TierComparisonPage } from './app/routes/settings/tiers'
import { AdminTiersPage } from './app/routes/admin/tiers'
import { isSupabaseConfigured, supabaseConfigError } from './lib/supabase'

// Lazy-loaded pages (heavy/less frequently visited)
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
          <Route path="/" element={<HomePage />} />

          {/* Event Detail/Editing */}
          <Route path="/events/new" element={<Navigate to="/" replace />} />
          <Route path="/events/:eventId" element={<EventDetailPage />} />
          <Route path="/events/:eventId/program" element={<EventDetailPage initialTab="program" />} />
          <Route path="/event/edit" element={<EventDetailPage />} />

          {/* Event-Scoped Routes (require selected event) */}
          <Route path="/event/dashboard" element={<EventDashboardPage />} />
          <Route path="/event/guests" element={<GuestsPage />} />
          <Route path="/event/schedule" element={<SchedulesPage />} />
          <Route path="/event/program" element={<ProgramManagementPage />} />
          <Route path="/event/vendors" element={<VendorsPage />} />
          <Route path="/event/checklist" element={<ChecklistPage />} />
          <Route path="/event/messages" element={<MessagesPage />} />
          <Route path="/event/feedback" element={<Suspense fallback={<LazyFallback />}><FeedbackPage /></Suspense>} />
          <Route path="/event/checkin" element={<Suspense fallback={<LazyFallback />}><CheckinPage /></Suspense>} />
          <Route path="/event/reports" element={<Suspense fallback={<LazyFallback />}><ReportsPage /></Suspense>} />
          <Route path="/event/reminder-settings" element={<ReminderSettingsPage />} />
          <Route path="/event/simulation" element={<Suspense fallback={<LazyFallback />}><SimulationPage /></Suspense>} />
          <Route path="/event/networking" element={<Suspense fallback={<LazyFallback />}><NetworkingPage /></Suspense>} />
          <Route path="/event/contingency" element={<Suspense fallback={<LazyFallback />}><ContingencyPage /></Suspense>} />

          {/* Global Routes (no event required) */}
          <Route path="/ai" element={
            <FeatureGuard feature="ai">
              <Suspense fallback={<LazyFallback />}><AIAssistantPage /></Suspense>
            </FeatureGuard>
          } />
          <Route path="/settings" element={<DashboardPage />} />
          <Route path="/settings/tiers" element={<TierComparisonPage />} />
          <Route path="/admin/tiers" element={
            <ProtectedRoute requiredRole="admin">
              <AdminTiersPage />
            </ProtectedRoute>
          } />
          <Route path="/admin/test-whatsapp" element={
            <ProtectedRoute requiredRole="admin">
              <TestWhatsAppPage />
            </ProtectedRoute>
          } />
          <Route path="/admin/users" element={
            <ProtectedRoute requiredRole="super_admin">
              <UserManagementPage />
            </ProtectedRoute>
          } />

          {/* Legacy routes - redirect to home */}
          <Route path="/events" element={<HomePage />} />
          <Route path="/guests" element={<HomePage />} />
          <Route path="/schedules" element={<HomePage />} />
          <Route path="/program" element={<HomePage />} />
          <Route path="/vendors" element={<HomePage />} />
          <Route path="/checklist" element={<HomePage />} />
          <Route path="/messages" element={<HomePage />} />
          <Route path="/feedback" element={<HomePage />} />
          <Route path="/checkin" element={<HomePage />} />
          <Route path="/reports" element={<HomePage />} />
        </Routes>
      </main>

      {/* Floating AI Chat */}
      <FeatureGuard feature="ai">
        <FloatingChat />
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
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<Navigate to="/login" replace />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
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
