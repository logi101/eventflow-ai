// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - Onboarding Tour Provider
// Uses driver.js for step-by-step guided tours (Hebrew RTL)
// ═══════════════════════════════════════════════════════════════════════════

import { createContext, useContext, useEffect, useRef, useCallback, type ReactNode } from 'react'
import { driver, type DriveStep, type Config } from 'driver.js'
import 'driver.js/dist/driver.css'

// ─── Types ──────────────────────────────────────────────────────────────────

type TourPage = 'home' | 'dashboard' | 'guests' | 'vendors' | 'schedule' | 'checklist' | 'messages' | 'aiChat'

interface TourContextValue {
  startTour: (page: TourPage) => void
  startFullTour: () => void
  isTourCompleted: () => boolean
  resetTour: () => void
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TOUR_STORAGE_KEY = 'eventflow-tour-completed'

// ─── Tour Steps Definitions (Hebrew) ─────────────────────────────────────────

const homeSteps: DriveStep[] = [
  {
    element: '[data-testid="app-logo"]',
    popover: {
      title: 'ברוך הבא ל-EventFlow AI! 🎉',
      description: 'מערכת ניהול אירועים חכמה המופעלת על ידי בינה מלאכותית',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-testid="sidebar"]',
    popover: {
      title: 'תפריט ניווט',
      description: 'מכאן תנווט בין כל חלקי המערכת — אורחים, ספקים, לוח זמנים, הודעות ועוד',
      side: 'left',
      align: 'start',
    },
  },
  {
    element: 'button:has(.lucide-plus), [data-testid="create-event-btn"], button[class*="btn-primary"]',
    popover: {
      title: 'צור אירוע חדש',
      description: 'לחץ כאן כדי ליצור את האירוע הראשון שלך ולהתחיל לנהל אותו',
      side: 'bottom',
      align: 'start',
    },
  },
]

const dashboardSteps: DriveStep[] = [
  {
    element: '[data-testid="dashboard-title"], h1',
    popover: {
      title: 'דשבורד האירוע',
      description: 'כאן תמצא סיכום מהיר של כל הנתונים החשובים לאירוע שלך',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-testid="participants-stat"], [data-testid="global-stats"], [class*="stats"], [class*="stat-card"]',
    popover: {
      title: 'סטטיסטיקות מהירות',
      description: 'מספר משתתפים, משימות שהושלמו, הודעות שנשלחו וימים לאירוע — הכל במקום אחד',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-testid="quick-actions"], [class*="quick-action"]',
    popover: {
      title: 'פעולות מהירות',
      description: 'קיצורי דרך לפעולות הנפוצות ביותר — שלח הודעה, הוסף אורח ועוד',
      side: 'top',
      align: 'start',
    },
  },
]

const guestsSteps: DriveStep[] = [
  {
    element: 'h1, [class*="text-2xl"][class*="font-bold"]',
    popover: {
      title: 'ניהול אורחים',
      description: 'כאן תנהל את כל המוזמנים לאירוע — הוספה, עריכה, מעקב אחר אישורי הגעה',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: 'button:has(.lucide-user-plus), [data-testid="add-guest-btn"]',
    popover: {
      title: 'הוסף אורח',
      description: 'הוסף אורחים ידנית אחד אחד — שם, טלפון, מספר מלווים ועוד',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: 'button:has(.lucide-upload), [data-testid="import-btn"], [class*="import"]',
    popover: {
      title: 'ייבוא מ-Excel',
      description: 'יש לך רשימה? ייבא אורחים בכמות מ-Excel בלחיצה אחת — חוסך זמן יקר',
      side: 'bottom',
      align: 'start',
    },
  },
]

const vendorsSteps: DriveStep[] = [
  {
    element: 'h1',
    popover: {
      title: 'ניהול ספקים',
      description: 'חפש ושייך ספקים לאירוע — קייטרינג, צלמים, DJ, פרחים ועוד',
      side: 'bottom',
      align: 'start',
    },
  },
]

const scheduleSteps: DriveStep[] = [
  {
    element: 'h1',
    popover: {
      title: 'לוח זמנים',
      description: 'בנה את לוח הזמנים של האירוע — הוסף פעילויות, שעות, ואחראים לכל שלב',
      side: 'bottom',
      align: 'start',
    },
  },
]

const checklistSteps: DriveStep[] = [
  {
    element: 'h1',
    popover: {
      title: "צ'קליסט משימות",
      description: 'עקוב אחרי כל המשימות לפני ובמהלך האירוע — אל תשכח שום דבר חשוב',
      side: 'bottom',
      align: 'start',
    },
  },
]

const messagesSteps: DriveStep[] = [
  {
    element: 'h1',
    popover: {
      title: 'שליחת הודעות',
      description: 'שלח הודעות WhatsApp לכל האורחים או לקבוצות נבחרות — הזמנות, תזכורות ועדכונים',
      side: 'bottom',
      align: 'start',
    },
  },
]

const aiChatSteps: DriveStep[] = [
  {
    element: '[data-testid="floating-chat-container"], [class*="fixed"][class*="z-50"] button[class*="rounded-full"], .floating-chat-btn',
    popover: {
      title: 'עוזר AI 🤖',
      description: 'לחץ על הכפתור הכתום כדי לפתוח את עוזר הבינה המלאכותית. הוא יכול לעזור לך לתכנן, לנהל ולשלוח הודעות!',
      side: 'top',
      align: 'start',
    },
  },
]

// Full tour = home + key dashboard + AI chat steps
const fullTourSteps: DriveStep[] = [
  ...homeSteps,
  dashboardSteps[0], // dashboard title only
  ...aiChatSteps,
]

// ─── Page Step Map ────────────────────────────────────────────────────────────

const PAGE_STEPS: Record<TourPage, DriveStep[]> = {
  home: homeSteps,
  dashboard: dashboardSteps,
  guests: guestsSteps,
  vendors: vendorsSteps,
  schedule: scheduleSteps,
  checklist: checklistSteps,
  messages: messagesSteps,
  aiChat: aiChatSteps,
}

// ─── Driver.js Base Config ────────────────────────────────────────────────────

function buildDriverConfig(steps: DriveStep[], onComplete: () => void): Config {
  return {
    animate: true,
    overlayColor: 'rgba(0,0,0,0.7)',
    overlayOpacity: 0.7,
    smoothScroll: true,
    allowClose: true,
    doneBtnText: 'סיים',
    nextBtnText: 'הבא ←',
    prevBtnText: '→ הקודם',
    progressText: '{{current}} מתוך {{total}}',
    showProgress: true,
    popoverClass: 'eventflow-tour-popover',
    steps,
    onDestroyStarted: onComplete,
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

const TourContext = createContext<TourContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

interface TourProviderProps {
  children: ReactNode
}

export function TourProvider({ children }: TourProviderProps) {
  const driverRef = useRef<ReturnType<typeof driver> | null>(null)

  const isTourCompleted = useCallback((): boolean => {
    return localStorage.getItem(TOUR_STORAGE_KEY) === 'true'
  }, [])

  const markTourCompleted = useCallback(() => {
    localStorage.setItem(TOUR_STORAGE_KEY, 'true')
  }, [])

  const resetTour = useCallback(() => {
    localStorage.removeItem(TOUR_STORAGE_KEY)
  }, [])

  // Filter out steps whose elements don't exist in DOM to avoid driver.js errors
  const getAvailableSteps = useCallback((steps: DriveStep[]): DriveStep[] => {
    return steps.filter((step) => {
      if (!step.element) return true // popover-only steps (no element) are always valid
      try {
        const el = document.querySelector(step.element as string)
        return el !== null
      } catch {
        return false
      }
    })
  }, [])

  const runTour = useCallback(
    (steps: DriveStep[]) => {
      // Destroy any existing tour
      if (driverRef.current) {
        driverRef.current.destroy()
        driverRef.current = null
      }

      const availableSteps = getAvailableSteps(steps)
      if (availableSteps.length === 0) return

      const driverInstance = driver(buildDriverConfig(availableSteps, markTourCompleted))
      driverRef.current = driverInstance
      driverInstance.drive()
    },
    [getAvailableSteps, markTourCompleted]
  )

  const startTour = useCallback(
    (page: TourPage) => {
      const steps = PAGE_STEPS[page]
      runTour(steps)
    },
    [runTour]
  )

  const startFullTour = useCallback(() => {
    runTour(fullTourSteps)
  }, [runTour])

  // Auto-start tour for first-time users after a short delay (DOM needs to settle)
  useEffect(() => {
    if (!isTourCompleted()) {
      const timer = setTimeout(() => {
        startFullTour()
      }, 1200)
      return () => clearTimeout(timer)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      driverRef.current?.destroy()
    }
  }, [])

  const value: TourContextValue = {
    startTour,
    startFullTour,
    isTourCompleted,
    resetTour,
  }

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext)
  if (!ctx) {
    throw new Error('useTour must be used inside TourProvider')
  }
  return ctx
}
