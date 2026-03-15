// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - Onboarding Tour Provider
// Uses driver.js for step-by-step guided tours (Hebrew RTL)
// Each page has detailed steps explaining how to use it
// ═══════════════════════════════════════════════════════════════════════════

import { createContext, useContext, useEffect, useRef, useCallback, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { driver, type DriveStep, type Config } from 'driver.js'
import 'driver.js/dist/driver.css'

// ─── Types ──────────────────────────────────────────────────────────────────

export type TourPage = 'home' | 'dashboard' | 'guests' | 'vendors' | 'schedule' | 'checklist' | 'messages' | 'ai'

interface TourContextValue {
  startTour: (page: TourPage) => void
  startFullTour: () => void
  isTourCompleted: () => boolean
  resetTour: () => void
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TOUR_STORAGE_KEY = 'eventflow-tour-completed'

// ─── Tour Steps — Per Page (Hebrew) ─────────────────────────────────────────

const homeSteps: DriveStep[] = [
  {
    element: '[data-testid="app-logo"]',
    popover: {
      title: 'ברוך הבא ל-EventFlow AI! 🎉',
      description: 'מערכת ניהול אירועים חכמה המופעלת על ידי בינה מלאכותית. נעשה סיור קצר כדי שתכיר את המערכת.',
      side: 'bottom', align: 'start',
    },
  },
  {
    element: '[data-testid="sidebar"]',
    popover: {
      title: 'תפריט ניווט',
      description: 'מכאן תנווט בין כל חלקי המערכת — לחץ על שם אירוע ותראה את כל האפשרויות: אורחים, ספקים, לוח זמנים, הודעות ועוד.',
      side: 'left', align: 'start',
    },
  },
  {
    element: '[data-testid="create-event-btn"]',
    popover: {
      title: 'צור אירוע חדש ➕',
      description: 'לחץ כאן כדי ליצור אירוע — מלא שם, תאריך, מיקום וסוג האירוע. אחרי היצירה תגיע לדשבורד האירוע.',
      side: 'bottom', align: 'start',
    },
  },
  {
    element: 'input[placeholder="חפש אירוע..."]',
    popover: {
      title: 'חיפוש אירועים 🔍',
      description: 'יש לך כמה אירועים? הקלד שם כדי לסנן במהירות.',
      side: 'bottom', align: 'start',
    },
  },
]

const dashboardSteps: DriveStep[] = [
  {
    element: '[data-testid="dashboard-title"]',
    popover: {
      title: 'דשבורד האירוע 📊',
      description: 'הדשבורד מציג מבט-על על כל מה שקורה באירוע שלך — סטטיסטיקות, תזכורות ועדכונים בזמן אמת.',
      side: 'bottom', align: 'start',
    },
  },
  {
    element: '[data-testid="participants-stat"]',
    popover: {
      title: 'כמות משתתפים 👥',
      description: 'מספר האורחים הרשומים לאירוע. לחץ על הכרטיסייה לניווט ישיר לרשימת האורחים.',
      side: 'bottom', align: 'start',
    },
  },
  {
    element: '[data-testid="checklist-stat"]',
    popover: {
      title: 'התקדמות משימות ✅',
      description: 'אחוז המשימות שהושלמו. הסרגל הכתום מראה לך בדיוק איפה אתה עומד בהכנות.',
      side: 'bottom', align: 'start',
    },
  },
  {
    element: '[data-testid="messages-stat"]',
    popover: {
      title: 'הודעות שנשלחו 💬',
      description: 'כמה הודעות WhatsApp נשלחו לאורחים — הזמנות, תזכורות ועדכונים.',
      side: 'bottom', align: 'start',
    },
  },
  {
    element: '[data-testid="days-stat"]',
    popover: {
      title: 'ספירה לאחור ⏳',
      description: 'כמה ימים נשארו עד לאירוע. המערכת תשלח תזכורות אוטומטיות ככל שהתאריך מתקרב.',
      side: 'bottom', align: 'start',
    },
  },
  {
    element: '[data-testid="upcoming-schedule"]',
    popover: {
      title: 'לוח זמנים קרוב 🗓️',
      description: 'הפעילויות הקרובות בתוכנית האירוע. לחץ על פעילות לעריכה מהירה.',
      side: 'top', align: 'start',
    },
  },
  {
    element: '[data-testid="recent-activity"]',
    popover: {
      title: 'פעילות אחרונה 🔔',
      description: 'כל השינויים האחרונים במערכת — מי הוסיף אורח, מי אישר הגעה, אילו משימות הושלמו.',
      side: 'top', align: 'start',
    },
  },
]

const guestsSteps: DriveStep[] = [
  {
    element: '[data-testid="guests-title"]',
    popover: {
      title: 'ניהול אורחים 👥',
      description: 'כאן תנהל את כל המוזמנים לאירוע. תוכל לעקוב אחרי אישורי הגעה, לסנן לפי סטטוס ולשלוח הודעות ממוקדות.',
      side: 'bottom', align: 'start',
    },
  },
  {
    element: '[data-testid="add-guest-btn"]',
    popover: {
      title: 'הוסף אורח ➕',
      description: 'הוסף אורחים ידנית — שם, טלפון, מייל, מספר מלווים וסטטוס הגעה. ניתן גם לציין VIP או דרישות מיוחדות.',
      side: 'bottom', align: 'start',
    },
  },
  {
    element: '[data-testid="import-csv-btn"]',
    popover: {
      title: 'ייבוא מ-Excel/CSV 📥',
      description: 'יש לך רשימת מוזמנים בקובץ? ייבא אורחים בכמות בלחיצה אחת — חוסך שעות של הקלדה ידנית.',
      side: 'bottom', align: 'start',
    },
  },
  {
    element: '[data-testid="export-csv-btn"]',
    popover: {
      title: 'ייצוא רשימה 📤',
      description: 'ייצא את רשימת האורחים ל-CSV לעבודה ב-Excel, להפקת תגיות שמות, או לשיתוף עם הצוות.',
      side: 'bottom', align: 'start',
    },
  },
  {
    element: '[data-testid="guests-list"]',
    popover: {
      title: 'רשימת האורחים 📋',
      description: 'כאן מופיעים כל האורחים. לחץ על שורה לעריכה, צבע הסטטוס מציין: ירוק = אישר, אדום = ביטל, כחול = הוזמן, אפור = ממתין.',
      side: 'top', align: 'start',
    },
  },
]

const vendorsSteps: DriveStep[] = [
  {
    element: '[data-testid="vendors-title"]',
    popover: {
      title: 'ניהול ספקים 🏢',
      description: 'כאן תנהל את כל הספקים לאירוע — קייטרינג, צלמים, DJ, אולם, פרחים ועוד. שמור פרטי קשר, חוזים ותשלומים במקום אחד.',
      side: 'bottom', align: 'start',
    },
  },
  {
    element: '[data-testid="add-vendor-btn"]',
    popover: {
      title: 'הוסף ספק ➕',
      description: 'הוסף ספק חדש — שם, קטגוריה, טלפון, מחיר ודירוג. ניתן לשייך ספק לכמה אירועים בו זמנית.',
      side: 'bottom', align: 'start',
    },
  },
  {
    element: '[data-testid="category-filter"]',
    popover: {
      title: 'סינון לפי קטגוריה 🏷️',
      description: 'סנן ספקים לפי קטגוריה — קייטרינג, מוזיקה, צילום, ועוד. רואה רק מה שרלוונטי לך ברגע זה.',
      side: 'bottom', align: 'start',
    },
  },
]

const scheduleSteps: DriveStep[] = [
  {
    element: 'h1',
    popover: {
      title: 'לוח זמנים 🗓️',
      description: 'בנה את התוכנית המפורטת של האירוע — הוסף פעילויות, שעות התחלה וסיום, ואחראים לכל שלב.',
      side: 'bottom', align: 'start',
    },
  },
  {
    element: 'button:has(.lucide-plus), [data-testid="add-schedule-btn"]',
    popover: {
      title: 'הוסף פעילות ➕',
      description: 'הוסף כניסת מוזמנים, נאום, ארוחה, הפסקה — כל פעילות עם שם, שעה, מיקום ואחראי.',
      side: 'bottom', align: 'start',
    },
  },
]

const checklistSteps: DriveStep[] = [
  {
    element: '[data-testid="checklist-title"]',
    popover: {
      title: "צ'קליסט משימות ✅",
      description: "עקוב אחרי כל מה שצריך לעשות לפני האירוע ובמהלכו. ניתן להגדיר עדיפות, תאריך יעד ואחראי לכל משימה.",
      side: 'bottom', align: 'start',
    },
  },
  {
    element: '[data-testid="add-task-btn"]',
    popover: {
      title: 'הוסף משימה ➕',
      description: 'הוסף משימה חדשה — כותרת, תיאור, עדיפות (קריטי/גבוה/בינוני/נמוך), תאריך יעד ועלות משוערת.',
      side: 'bottom', align: 'start',
    },
  },
  {
    element: '[data-testid="checklist-list"]',
    popover: {
      title: 'רשימת המשימות 📝',
      description: 'לחץ על תיבת הסימון כדי לסמן משימה כהושלמה. סדר לפי עדיפות, סטטוס או תאריך — הכל בשליטה שלך.',
      side: 'top', align: 'start',
    },
  },
]

const messagesSteps: DriveStep[] = [
  {
    element: '[data-testid="messages-title"]',
    popover: {
      title: 'ניהול הודעות 💬',
      description: 'שלח הודעות WhatsApp לאורחים — הזמנות, תזכורות, עדכוני הגעה ועוד. כל ההודעות שנשלחו מתועדות כאן.',
      side: 'bottom', align: 'start',
    },
  },
  {
    element: 'button:has(.lucide-plus), [data-testid="new-message-btn"]',
    popover: {
      title: 'הודעה חדשה ✉️',
      description: 'צור הודעה חדשה — בחר נמענים (כולם / מסוננים / ספציפיים), כתוב תוכן, קבע שעת שליחה עכשיו או בעתיד.',
      side: 'bottom', align: 'start',
    },
  },
  {
    element: 'button:has(.lucide-wand-2), button:has(.lucide-sparkles)',
    popover: {
      title: 'יצירת הודעות עם AI ✨',
      description: 'לא יודע מה לכתוב? בקש מהבינה המלאכותית לנסח הודעת הזמנה, תזכורת, או עדכון — בעברית מושלמת.',
      side: 'bottom', align: 'start',
    },
  },
  {
    element: '[data-testid="messages-panel"]',
    popover: {
      title: 'יומן הודעות 📜',
      description: 'כל ההודעות שנשלחו ומתוכננות — סטטוס שליחה, תגובות, שגיאות. ניתן למיין ולסנן לפי ערוץ, סטטוס ותאריך.',
      side: 'top', align: 'start',
    },
  },
]

const aiSteps: DriveStep[] = [
  {
    element: '[data-testid="ai-title"]',
    popover: {
      title: 'עוזר AI — המוח של המערכת 🤖',
      description: 'העוזר החכם שלך לתכנון אירועים. מופעל על Gemini AI ומחובר לכל הנתונים שלך — אורחים, ספקים, לוח זמנים ועוד.',
      side: 'bottom', align: 'start',
    },
  },
  {
    element: '[data-testid="ai-chat"]',
    popover: {
      title: 'חלון השיחה 💬',
      description: 'כתוב לעוזר בעברית חופשית. הוא מבין הקשר — אם בחרת אירוע הוא יכול לעדכן אותו ישירות.',
      side: 'bottom', align: 'start',
    },
  },
  {
    element: '[data-testid="ai-input"]',
    popover: {
      title: 'שדה ההודעה ✍️',
      description: 'כתוב שאלה או בקשה בעברית חופשית, לדוגמה: "צור לי לוח זמנים לחתונה של 200 איש" או "שלח תזכורת לכל האורחים שלא אישרו".',
      side: 'top', align: 'start',
    },
  },
  {
    element: '[data-testid="ai-send-btn"]',
    popover: {
      title: 'שלח הודעה 🚀',
      description: 'לחץ לשליחה, או הקש Enter. העוזר יחשוב, יתכנן, ולפני שינויים יבקש את אישורך.',
      side: 'top', align: 'start',
    },
  },
]

// ─── Full first-time tour ────────────────────────────────────────────────────

const fullTourSteps: DriveStep[] = [
  ...homeSteps,
  dashboardSteps[0],
  ...aiSteps.slice(0, 2),
]

// ─── Page → Steps map ────────────────────────────────────────────────────────

const PAGE_STEPS: Record<TourPage, DriveStep[]> = {
  home:      homeSteps,
  dashboard: dashboardSteps,
  guests:    guestsSteps,
  vendors:   vendorsSteps,
  schedule:  scheduleSteps,
  checklist: checklistSteps,
  messages:  messagesSteps,
  ai:        aiSteps,
}

// ─── Route → TourPage map ────────────────────────────────────────────────────

function routeToTourPage(pathname: string): TourPage | null {
  if (pathname === '/' || pathname === '/events') return 'home'
  if (pathname.includes('/dashboard')) return 'dashboard'
  if (pathname.includes('/guests')) return 'guests'
  if (pathname.includes('/vendors')) return 'vendors'
  if (pathname.includes('/schedule') || pathname.includes('/program')) return 'schedule'
  if (pathname.includes('/checklist')) return 'checklist'
  if (pathname.includes('/messages')) return 'messages'
  if (pathname.includes('/ai')) return 'ai'
  return null
}

// ─── Driver config ───────────────────────────────────────────────────────────

function buildDriverConfig(
  steps: DriveStep[],
  onComplete: () => void,
  getInstance: () => ReturnType<typeof driver> | null
): Config {
  return {
    animate: true,
    overlayColor: 'rgba(0,0,0,0.7)',
    overlayOpacity: 0.7,
    smoothScroll: true,
    allowClose: true,
    doneBtnText: 'סיים ✓',
    nextBtnText: 'הבא ←',
    prevBtnText: '→ הקודם',
    progressText: '{{current}} מתוך {{total}}',
    showProgress: true,
    popoverClass: 'eventflow-tour-popover',
    steps,
    onDestroyStarted: () => {
      onComplete()
      getInstance()?.destroy()
    },
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

const TourContext = createContext<TourContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

export function TourProvider({ children }: { children: ReactNode }) {
  const driverRef = useRef<ReturnType<typeof driver> | null>(null)
  const location = useLocation()
  const visitedPages = useRef<Set<string>>(new Set())

  const isTourCompleted = useCallback(() =>
    localStorage.getItem(TOUR_STORAGE_KEY) === 'true', [])

  const markTourCompleted = useCallback(() =>
    localStorage.setItem(TOUR_STORAGE_KEY, 'true'), [])

  const resetTour = useCallback(() =>
    localStorage.removeItem(TOUR_STORAGE_KEY), [])

  const getAvailableSteps = useCallback((steps: DriveStep[]): DriveStep[] =>
    steps.filter((step) => {
      if (!step.element) return true
      try { return document.querySelector(step.element as string) !== null }
      catch { return false }
    }), [])

  const runTour = useCallback((steps: DriveStep[]) => {
    driverRef.current?.destroy()
    driverRef.current = null

    const available = getAvailableSteps(steps)
    if (available.length === 0) return

    const instance = driver(buildDriverConfig(available, markTourCompleted, () => driverRef.current))
    driverRef.current = instance
    instance.drive()
  }, [getAvailableSteps, markTourCompleted])

  const startTour = useCallback((page: TourPage) => {
    runTour(PAGE_STEPS[page])
  }, [runTour])

  const startFullTour = useCallback(() => {
    runTour(fullTourSteps)
  }, [runTour])

  // Auto-start full tour on first visit
  useEffect(() => {
    if (!isTourCompleted()) {
      const t = setTimeout(startFullTour, 1200)
      return () => clearTimeout(t)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Per-page tour: trigger once per page when user navigates there (after tour completed)
  useEffect(() => {
    if (!isTourCompleted()) return // full tour handles first visit
    const page = routeToTourPage(location.pathname)
    if (!page) return
    if (visitedPages.current.has(page)) return
    visitedPages.current.add(page)

    const key = `eventflow-tour-page-${page}`
    if (localStorage.getItem(key) === 'true') return

    const t = setTimeout(() => {
      localStorage.setItem(key, 'true')
      runTour(PAGE_STEPS[page])
    }, 800)
    return () => clearTimeout(t)
  }, [location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { driverRef.current?.destroy() }, [])

  return (
    <TourContext.Provider value={{ startTour, startFullTour, isTourCompleted, resetTour }}>
      {children}
    </TourContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext)
  if (!ctx) throw new Error('useTour must be used inside TourProvider')
  return ctx
}
