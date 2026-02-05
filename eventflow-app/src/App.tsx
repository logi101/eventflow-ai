// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - App Entry Point
// ═══════════════════════════════════════════════════════════════════════════

import { Routes, Route, useLocation, Navigate } from 'react-router-dom'

// Layout & Components
import { Sidebar } from './components/layout/Sidebar'
import { FloatingChat } from './components/chat'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { GracePeriodBanner } from './components/shared/GracePeriodBanner'
import { GracePeriodConfirmationPopup } from './components/shared/ConfirmationPopup'
import { FeatureGuard } from './components/guards/FeatureGuard'

// Pages
import { HomePage } from './pages/home/HomePage'
import { EventDashboardPage } from './pages/event/EventDashboardPage'
import {
  DashboardPage,
  GuestsPage,
  VendorsPage,
  ChecklistPage,
  SchedulesPage,
  ProgramManagementPage,
  AIAssistantPage,
  FeedbackPage,
  MessagesPage,
  CheckinPage,
  ReportsPage,
  ReminderSettingsPage,
  EventDetailPage,
  LoginPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  TestWhatsAppPage,
  SimulationPage,
  NetworkingPage,
  ContingencyPage,
} from './pages'
import { UserManagementPage } from './pages/admin/UserManagementPage'
import { TierComparisonPage } from './app/routes/settings/tiers'
import { AdminTiersPage } from './app/routes/admin/tiers'

// ═══════════════════════════════════════════════════════════════════════════
// Main App Layout (with Sidebar)
// ═══════════════════════════════════════════════════════════════════════════

function AppLayout() {
  return (
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
          <Route path="/event/feedback" element={<FeedbackPage />} />
          <Route path="/event/checkin" element={<CheckinPage />} />
          <Route path="/event/reports" element={<ReportsPage />} />
          <Route path="/event/reminder-settings" element={<ReminderSettingsPage />} />
          <Route path="/event/simulation" element={<SimulationPage />} />
          <Route path="/event/networking" element={<NetworkingPage />} />
          <Route path="/event/contingency" element={<ContingencyPage />} />

          {/* Global Routes (no event required) */}
          <Route path="/ai" element={<AIAssistantPage />} />
          <Route path="/settings" element={<DashboardPage />} />
          <Route path="/settings/tiers" element={<TierComparisonPage />} />
          <Route path="/admin/tiers" element={<AdminTiersPage />} />
          <Route path="/admin/test-whatsapp" element={<TestWhatsAppPage />} />
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
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Main App with Auth Routes
// ═══════════════════════════════════════════════════════════════════════════

export default function App() {
  const location = useLocation()
  const isAuthPage = ['/login', '/forgot-password', '/reset-password'].includes(location.pathname)

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
