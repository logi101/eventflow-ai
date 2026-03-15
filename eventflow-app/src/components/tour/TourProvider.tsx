// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - Onboarding Tour Provider
// Uses driver.js for step-by-step guided tours (Hebrew RTL)
// Each page has detailed steps explaining how to use it
// ═══════════════════════════════════════════════════════════════════════════

import { createContext, useContext, useEffect, useRef, useCallback, type ReactNode } from 'react'
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
    element: 'h1',
    popover: {
      title: 'ברוך הבא ל-EventFlow AI',
      description: 'זו דף הבית — כאן תראה את כל האירועים שלך כקלפים ותוכל לבחור לאיזה אירוע להיכנס. בכל פעם שתכנס למערכת תגיע לכאן ותבחר את האירוע שרוצה לנהל.',
      side: 'bottom', align: 'start',
    },
  },
  {
    element: 'button.inline-flex.items-center.gap-2.px-5.py-3',
    popover: {
      title: 'צור אירוע חדש',
      description: 'לחץ כאן כדי ליצור אירוע חדש. תמלא שם אירוע, סוג (חתונה, כנס, בר מצווה, יום הולדת ועוד), תאריך, מיקום ומספר משתתפים מקסימלי. לאחר השמירה תועבר ישירות לדשבורד של האירוע.',
      side: 'bottom', align: 'start',
    },
  },
  {
    element: 'input[placeholder="חפש אירוע..."]',
    popover: {
      title: 'חיפוש אירועים',
      description: 'יש לך כמה אירועים? הקלד שם אירוע או שם האולם כדי לסנן במהירות. החיפוש עובד בזמן אמת — לא צריך ללחוץ Enter.',
      side: 'bottom', align: 'start',
    },
  },
  {
    element: '.flex.items-center.gap-2.bg-white.rounded-xl.p-1.border',
    popover: {
      title: 'סינון לפי סטטוס',
      description: 'סנן אירועים לפי מצבם: "הכל" מציג את כולם מלבד ארכיון, "פעיל" = אירועים שהופעלו ושולחים הודעות, "בתכנון" = שלב מתקדם, "טיוטה" = רק נוצר, "הסתיים" = עבר. לחץ "ארכיון" כדי לראות גם אירועים ישנים.',
      side: 'bottom', align: 'start',
    },
  },
  {
    element: '.grid.md\\:grid-cols-2',
    popover: {
      title: 'קלפי האירועים',
      description: 'כל אירוע מוצג כקלף עם שם, תאריך, מיקום, כמות משתתפים ופעילויות. גבול ירוק = אירוע פעיל, גבול אדום = טיוטה. לחץ על קלף כדי להיכנס לדשבורד שלו.',
      side: 'top', align: 'start',
    },
  },
  {
    element: '.flex.items-center.gap-2.px-4.py-2\\.5.bg-green-50',
    popover: {
      title: 'הפעלת אירוע',
      description: 'כאשר אירוע בסטטוס "טיוטה" תראה כפתור "הפעל". לחיצה עליו מעבירה את האירוע למצב פעיל ויוצרת אוטומטית הודעות WhatsApp מתוזמנות לכל האורחים. זה הצעד הקריטי לפני שמתחילים לשלוח הודעות.',
      side: 'top', align: 'start',
    },
  },
]

const dashboardSteps: DriveStep[] = [
  {
    element: 'h1',
    popover: {
      title: 'דשבורד האירוע',
      description: 'הדשבורד הוא מרכז הפיקוד של האירוע שלך. כאן תראה בבת אחת את כל המספרים החשובים — כמה אורחים נרשמו, כמה אישרו, כמה משימות פתוחות, ומתי הפעילות הבאה.',
      side: 'bottom', align: 'start',
    },
  },
  {
    element: 'button.group.inline-flex',
    popover: {
      title: 'עריכת פרטי האירוע',
      description: 'לחץ על "ערוך אירוע" כדי לשנות שם, תאריך, מיקום, תיאור או מספר מקסימלי של משתתפים. השינויים נשמרים מיידית ומתעדכנים בכל המערכת.',
      side: 'bottom', align: 'start',
    },
  },
  {
    element: 'a[href="/event/guests"].group.relative',
    popover: {
      title: 'כרטיסיית משתתפים',
      description: 'מציגה את סך כל האורחים הרשומים, כמה מהם אישרו הגעה וכמה כבר עשו צ\'ק-אין. לחץ על הכרטיסייה לניווט ישיר לדף האורחים. טיפ: המספר הכחול "נכנסו" מתעדכן בזמן אמת במהלך האירוע דרך מסך הצ\'ק-אין.',
      side: 'bottom', align: 'start',
    },
  },
  {
    element: 'a[href="/event/schedule"].group.relative',
    popover: {
      title: 'כרטיסיית לוח זמנים',
      description: 'מציגה את מספר הפעילויות שנבנו בתוכנית האירוע. לחץ כדי לעבור לדף לוח הזמנים המלא שם תוכל להוסיף, לערוך ולסדר את כל שלבי האירוע לפי שעה.',
      side: 'bottom', align: 'start',
    },
  },
  {
    element: 'a[href="/event/checklist"].group.relative',
    popover: {
      title: 'כרטיסיית משימות',
      description: 'מציגה כמה משימות עדיין פתוחות וכמה הושלמו. ברגע שתשלים משימות הספירה תרד. לחץ לניווט לרשימת המשימות המלאה — כדאי לבדוק אותה כל יום לפני האירוע.',
      side: 'bottom', align: 'start',
    },
  },
  {
    element: 'a[href="/event/messages"].group.relative',
    popover: {
      title: 'כרטיסיית הודעות',
      description: 'מציגה כמה הודעות WhatsApp כבר נשלחו לאורחים. לחץ לניווט לדף ההודעות שם תוכל לראות את כל ההודעות ששלחת ואת הסטטוס של כל אחת — נשלחה, נקראה, נכשלה.',
      side: 'bottom', align: 'start',
    },
  },
  {
    element: '.lg\\:col-span-2.bg-white\\/80',
    popover: {
      title: 'פעילויות קרובות',
      description: 'מציג את 5 הפעילויות הבאות בלוח הזמנים שלך בסדר כרונולוגי. אם עדיין לא הוספת פעילויות ללוח הזמנים תראה כאן הנחיה לעשות זאת. לחץ על "לו"ז מלא" לניווט ישיר.',
      side: 'top', align: 'start',
    },
  },
  {
    element: '.bg-white\\/80.backdrop-blur-sm.rounded-2xl.border.border-white\\/50.p-6',
    popover: {
      title: 'פעולות מהירות',
      description: 'קיצורי דרך לפעולות הנפוצות ביותר: שליחת הודעות WhatsApp, ייבוא משתתפים מ-CSV, פתיחת מסך צ\'ק-אין QR ברקוד, וניהול ספקים. שמור על הדשבורד תמיד פתוח בטאב כדי לראות את המצב בזמן אמת.',
      side: 'top', align: 'start',
    },
  },
]

const guestsSteps: DriveStep[] = [
  {
    element: '[data-testid="guests-title"]',
    popover: {
      title: 'ניהול אורחים',
      description: 'דף האורחים הוא לב האירוע — כאן תנהל את כל הרשימה שלך. תוכל לעקוב אחרי כל אורח: האם הוזמן, האם אישר הגעה, האם מגיע עם מלווה, האם הוא VIP ואם יש לו צרכים מיוחדים.',
      side: 'bottom', align: 'start',
    },
  },
  {
    element: '[data-testid="add-guest-btn"]',
    popover: {
      title: 'הוספת אורח ידנית',
      description: 'לחץ כאן להוספת אורח יחיד. מלא שם פרטי, שם משפחה וטלפון (חובה), ולאחר מכן אימייל, סטטוס, האם מגיע עם מלווה, האם הוא VIP, הגבלות תזונה, צרכי נגישות וצורך בהסעה. כל פרט חשוב לתכנון הקייטרינג וההושבה.',
      side: 'bottom', align: 'start',
    },
  },
  {
    element: '[data-testid="import-csv-btn"]',
    popover: {
      title: 'ייבוא מ-Excel / CSV',
      description: 'יש לך רשימת אורחים ב-Excel? ייצא ל-CSV ולחץ כאן לייבוא מהיר. הקובץ צריך עמודות: "שם פרטי", "שם משפחה", "טלפון" — ואופציונלי: "אימייל", "מלווה", "הערות". הייבוא נמנע מכפילויות ומוסיף את כולם בבת אחת.',
      side: 'bottom', align: 'start',
    },
  },
  {
    element: '[data-testid="export-csv-btn"]',
    popover: {
      title: 'ייצוא לרשימה חיצונית',
      description: 'ייצא את רשימת האורחים לקובץ CSV עם כל הפרטים — שם, טלפון, סטטוס, VIP, מלווה ועוד. שימושי להפקת תגיות שמות, שיתוף עם הצוות, או עבודה עם קייטרינג שמבקש רשימה.',
      side: 'bottom', align: 'start',
    },
  },
  {
    element: '.grid.grid-cols-5.gap-4',
    popover: {
      title: 'סטטיסטיקות אורחים',
      description: 'חמש כרטיסיות מספרים: סה"כ רשומים, כמה אישרו הגעה (ירוק), כמה הוזמנו ועדיין לא ענו (כתום), כמה ביטלו (אדום), וכמה מגיעים עם מלווה (סגול). עקוב אחרי מספר המאושרים כדי לתכנן נכון עם הקייטרינג והאולם.',
      side: 'bottom', align: 'start',
    },
  },
  {
    element: '.bg-\\[\\#1a1d27\\]\\/60.backdrop-blur-sm.rounded-2xl.p-4.border',
    popover: {
      title: 'סינון וחיפוש',
      description: 'סנן לפי סטטוס: הוזמן, אישר, ביטל, אולי, נכנס. חפש לפי שם, טלפון או מייל. תוכל גם לבחור אירוע ספציפי אם יש לך כמה אירועים. טיפ: לחץ "אישר הגעה" כדי לראות רק את האורחים המאושרים ולהעביר לקייטרינג.',
      side: 'bottom', align: 'start',
    },
  },
  {
    element: '[data-testid="guests-list"]',
    popover: {
      title: 'רשימת האורחים',
      description: 'כל אורח מוצג עם תמונה מותחלת, שם, טלפון, אימייל, סטטוס ומידע על מלווה. לחץ על שורה לעריכה מלאה. כוכב צהוב = VIP. שים לב לצבע תג הסטטוס: ירוק = אישר, אדום = ביטל, כתום = הוזמן, סגול = נכנס.',
      side: 'top', align: 'start',
    },
  },
  {
    element: '.flex.gap-2 button.inline-flex.items-center.gap-1\\.5.px-3',
    popover: {
      title: 'עריכה ומחיקה',
      description: 'לכל אורח יש כפתורי "עריכה" (כחול) ו"מחיקה" (אדום). לחץ עריכה לפתיחת טופס מלא עם כל הפרטים. שינוי סטטוס לאחר שיחה עם האורח (למשל: הוזמן -> אישר הגעה) מעדכן את כל הסטטיסטיקות בזמן אמת.',
      side: 'top', align: 'start',
    },
  },
]

const vendorsSteps: DriveStep[] = [
  {
    element: '[data-testid="vendors-title"]',
    popover: {
      title: 'ניהול ספקים',
      description: 'דף הספקים הוא ה-CRM שלך לאנשי מקצוע. כאן תנהל את כל הספקים שמעורבים באירוע — קייטרינג, צילום, DJ, אולם, פרחים, הגברה, תאורה ועוד. כל הפרטים, החוזים והמצב במקום אחד.',
      side: 'bottom', align: 'start',
    },
  },
  {
    element: '[data-testid="add-vendor-btn"]',
    popover: {
      title: 'הוספת ספק חדש',
      description: 'לחץ להוספת ספק. מלא: שם הספק, קטגוריה (קייטרינג/צילום/מוזיקה וכו\'), איש קשר, טלפון, אימייל, אתר, עיר, דירוג (1-5 כוכבים), סטטוס התקשרות ותגיות. ניתן לשייך ספק לכמה אירועים שונים.',
      side: 'bottom', align: 'start',
    },
  },
  {
    element: '.grid.grid-cols-4.lg\\:grid-cols-8.gap-3',
    popover: {
      title: 'סינון לפי קטגוריה',
      description: 'לחץ על כפתור קטגוריה לסינון מהיר — ראה רק צלמים, רק קייטרינג, רק DJ וכן הלאה. המספר בסוגריים מציין כמה ספקים יש בכל קטגוריה. לחץ "הכל" לחזרה לתצוגה מלאה.',
      side: 'bottom', align: 'start',
    },
  },
  {
    element: '.bg-\\[\\#1a1d27\\]\\/60.backdrop-blur-sm.rounded-2xl.p-4.border',
    popover: {
      title: 'סינון לפי סטטוס',
      description: 'עקוב אחרי מצב ההתקשרות עם כל ספק: "ממתין" = עדיין לא פנינו, "נשלחה בקשה" = ביקשנו הצעת מחיר, "התקבלה הצעה" = קיבלנו מחיר, "אושר" = בחרנו בו, "מאושר סופי" = חוזה חתום. סנן כדי לראות מה עוד צריך טיפול.',
      side: 'bottom', align: 'start',
    },
  },
  {
    element: '[data-testid="vendors-list"]',
    popover: {
      title: 'כרטיסיות הספקים',
      description: 'כל ספק מוצג בכרטיסייה עם אייקון הקטגוריה, שם, דירוג כוכבים, פרטי קשר, עיר, אתר ומספר אירועים שהיה מעורב בהם. לחץ על עריכה לשינוי פרטים או על פח לביטול שיתוף הפעולה.',
      side: 'top', align: 'start',
    },
  },
  {
    element: '.flex.justify-between.items-center.mt-4.pt-4.border-t',
    popover: {
      title: 'כמה אירועים שיתף הספק',
      description: 'בתחתית כל כרטיסיית ספק תראה "X אירועים" — כמה פעמים עבדת עם הספק הזה. זה עוזר לזהות ספקים מוכרים ואמינים שאיתם כבר יש ניסיון עבודה חיובי.',
      side: 'top', align: 'start',
    },
  },
]

const scheduleSteps: DriveStep[] = [
  {
    element: 'h1',
    popover: {
      title: 'לוח זמנים',
      description: 'דף לוח הזמנים הוא התוכנית המפורטת של האירוע לפי שעות. כאן תבנה את סדר היום המלא — מכניסת האורחים ועד לנאום הסגירה — כל פעילות עם שעת התחלה, שעת סיום, מיקום ואחראי.',
      side: 'bottom', align: 'start',
    },
  },
  {
    element: 'button[data-testid="add-schedule-btn"], button:has(.lucide-plus)',
    popover: {
      title: 'הוספת פעילות חדשה',
      description: 'לחץ להוספת פעילות. מלא: כותרת, תיאור, שעת התחלה וסיום (חובה), מיקום, חדר, קיבולת מקסימלית, שם דובר/מנחה, מסלול (track), והאם לשלוח תזכורת WhatsApp לפני הפעילות ובכמה דקות מראש.',
      side: 'bottom', align: 'start',
    },
  },
  {
    element: '.divide-y > div:first-child, [data-schedule-item]',
    popover: {
      title: 'פעילות בלוח הזמנים',
      description: 'כל פעילות מוצגת עם שעה, כותרת, מיקום, שם הדובר ומסלול צבעוני. פעילויות מסומנות "הפסקה" מוצגות בצבע שונה. לחץ על עריכה כדי לשנות פרטים — שינוי שעה מסנכרן אוטומטית את הודעות התזכורת.',
      side: 'right', align: 'start',
    },
  },
  {
    element: '.relative.flex.items-center.py-1\\.5',
    popover: {
      title: 'קו "עכשיו"',
      description: 'הקו האדום מציין את הנקודה הנוכחית בזמן — איפה אנחנו עומדים ביחס ללוח הזמנים. מתעדכן כל דקה. פעילויות מעל הקו = כבר עברו, מתחת = עתידיות. שימושי במהלך האירוע לעקוב אחרי ההתקדמות.',
      side: 'right', align: 'start',
    },
  },
  {
    element: 'select[aria-label], select',
    popover: {
      title: 'בחירת אירוע',
      description: 'בחר את האירוע שרוצה לצפות בלוח הזמנים שלו. אם בחרת אירוע מהסייבר לפני שהגעת לכאן הוא יהיה מסומן אוטומטית. ניתן לנהל לוחות זמנים של אירועים שונים מאותה ממשק.',
      side: 'bottom', align: 'start',
    },
  },
  {
    element: 'button:has(.lucide-alert-triangle), .bg-amber-500\\/10',
    popover: {
      title: 'תזכורות WhatsApp חכמות',
      description: 'כל פעילות יכולה לשלוח תזכורת WhatsApp לאורחים לפני שהיא מתחילה. בדף הוספת פעילות תוכל להפעיל תזכורת ולהגדיר כמה דקות מראש (15, 30, 60 דקות). המערכת שולחת את ההודעה אוטומטית בזמן המתאים.',
      side: 'top', align: 'start',
    },
  },
]

const checklistSteps: DriveStep[] = [
  {
    element: '[data-testid="checklist-title"]',
    popover: {
      title: 'צ\'קליסט משימות',
      description: 'דף הצ\'קליסט הוא מנהל המשימות שלך לאירוע. כאן תעקוב אחרי כל מה שצריך לעשות לפני האירוע ובמהלכו — מהזמנת הקייטרינג ועד הכנת שלטי הכניסה. ניתן להגדיר עדיפות, תאריך יעד ועלות לכל משימה.',
      side: 'bottom', align: 'start',
    },
  },
  {
    element: '[data-testid="add-task-btn"]',
    popover: {
      title: 'הוספת משימה חדשה',
      description: 'לחץ להוספת משימה. מלא: כותרת (חובה), תיאור, סטטוס (ממתין/בביצוע/הושלם/חסום/בוטל), עדיפות (קריטית/גבוהה/בינונית/נמוכה), תאריך יעד, שעות ועלות משוערת. סמן "אבן דרך" למשימות מכריעות.',
      side: 'bottom', align: 'start',
    },
  },
  {
    element: '.grid.grid-cols-4.gap-4',
    popover: {
      title: 'סטטיסטיקות התקדמות',
      description: 'ארבע כרטיסיות: סה"כ משימות, כמה הושלמו (ירוק), כמה בביצוע (כחול), ואחוז ההתקדמות עם סרגל ירוק. עמוד על 100% לפני האירוע. כרטיסיית ה-"התקדמות" גם מוצגת בדשבורד הראשי.',
      side: 'bottom', align: 'start',
    },
  },
  {
    element: '.bg-\\[\\#1a1d27\\]\\/60.backdrop-blur-sm.rounded-2xl.p-4',
    popover: {
      title: 'סינון וחיפוש',
      description: 'חפש משימה לפי שם, סנן לפי סטטוס (ממתין/בביצוע/הושלם/חסום) ועדיפות (קריטית/גבוהה/בינונית/נמוכה). טיפ: בימים לפני האירוע עבוד עם הסינון "קריטית" + "ממתין" כדי לראות מה חובה לסיים קודם.',
      side: 'bottom', align: 'start',
    },
  },
  {
    element: '[data-testid="checklist-list"]',
    popover: {
      title: 'רשימת המשימות',
      description: 'כל משימה מוצגת עם כותרת, תאריך יעד, עדיפות וסטטוס. לחץ על תיבת הסימון הריבועית בצד שמאל כדי לסמן משימה כהושלמה — הכותרת תיחצה ואחוז ההתקדמות יעלה. לחץ שוב לביטול הסימון.',
      side: 'top', align: 'start',
    },
  },
  {
    element: '.text-xs.bg-purple-500\\/20',
    popover: {
      title: 'אבני דרך (Milestones)',
      description: 'משימות מסומנות כ"אבן דרך" הן נקודות קריטיות בהכנות — למשל "קיבלנו אישור אולם" או "שלחנו הזמנות". הן מסומנות בתג סגול בולט ועוזרות לראות בקצרה האם ההכנות על הנתיב הנכון.',
      side: 'top', align: 'start',
    },
  },
]

const messagesSteps: DriveStep[] = [
  {
    element: '[data-testid="messages-title"]',
    popover: {
      title: 'ניהול הודעות WhatsApp',
      description: 'דף ההודעות מציג את כל ההודעות שנשלחו, מתוזמנות לשליחה או התקבלו מאורחים. המערכת שולחת הודעות WhatsApp אוטומטיות לפי לוח הזמנים שהגדרת — הזמנות, תזכורות ועדכונים.',
      side: 'bottom', align: 'start',
    },
  },
  {
    element: 'button.flex.items-center.gap-2.px-4.py-2.bg-blue-600',
    popover: {
      title: 'הודעה חדשה ידנית',
      description: 'לחץ "הודעה חדשה" כדי לשלוח הודעה WhatsApp מיידית. בחר נמענים (כל האורחים, מסוננים לפי סטטוס, או רשימה ספציפית), כתוב תוכן, ולחץ שלח. ניתן גם לתזמן שליחה לתאריך/שעה עתידיים.',
      side: 'bottom', align: 'start',
    },
  },
  {
    element: 'button.flex.items-center.gap-2.px-4.py-2.bg-green-600',
    popover: {
      title: 'יצירת הודעות אוטומטיות',
      description: 'לחץ "צור הודעות" כדי שהמערכת תיצור אוטומטית הודעות מתוזמנות לכל האורחים בהתאם ללוח הזמנים שהגדרת. לדוגמה: תזכורת שבוע לפני, תזכורת יום לפני ותזכורת שעה לפני. זה עובד רק כאשר האירוע במצב "פעיל".',
      side: 'bottom', align: 'start',
    },
  },
  {
    element: '.bg-zinc-800.rounded-lg.shadow.mb-4.p-4',
    popover: {
      title: 'סינון ההודעות',
      description: 'חפש הודעה לפי שם אורח, תוכן או מספר טלפון. לחץ "סינון" לפתיחת מסנני מתקדמים: סנן לפי סטטוס (ממתינה/נשלחה/נכשלה), ערוץ (WhatsApp/אימייל/SMS), וכיוון (יוצאת/נכנסת). כיוון "נכנסת" = תגובות שאורחים שלחו לך.',
      side: 'bottom', align: 'start',
    },
  },
  {
    element: '[data-testid="messages-panel"]',
    popover: {
      title: 'טבלת ההודעות',
      description: 'כל שורה היא הודעה עם: תאריך יצירה, זמן תזמון, כיוון (חץ יוצא/נכנס), נמען עם מספר טלפון, ערוץ, נושא, תוכן מקוצר וסטטוס. לחץ על שורה לפתיחת חלון פרטים מלאים עם התוכן המלא.',
      side: 'top', align: 'start',
    },
  },
  {
    element: '.relative.flex.items-center.py-1\\.5',
    popover: {
      title: 'קו "עכשיו" בזמן',
      description: 'הקו האדום הבולט מפריד בין הודעות שכבר נשלחו (מעליו) להודעות מתוזמנות לעתיד (מתחתיו). המסך גולל אוטומטית לקו זה כשנכנסים לדף — כדי לראות מה עכשיו בתור לשליחה.',
      side: 'right', align: 'start',
    },
  },
  {
    element: '.flex.items-center.justify-between.px-4.py-3.border-t',
    popover: {
      title: 'עימוד (Pagination)',
      description: 'המערכת מציגה 20 הודעות בכל פעם. השתמש בכפתורי הניווט בתחתית לעבור בין עמודים. הטקסט מציין "מציג X מתוך Y הודעות" — שמור עין על המספר כדי לוודא שאורחים מקבלים את כל ההודעות המתוכננות.',
      side: 'top', align: 'start',
    },
  },
]

const aiSteps: DriveStep[] = [
  {
    element: '[data-testid="ai-title"]',
    popover: {
      title: 'עוזר AI — המוח של המערכת',
      description: 'העוזר החכם מופעל על Gemini AI של Google ומחובר ישירות לכל הנתונים שלך. הוא יכול לשנות דברים במערכת בפועל — להוסיף אורחים, ליצור משימות, לבנות לוח זמנים, לשלוח הודעות ועוד. זה לא רק שיחה — זו פעולה.',
      side: 'bottom', align: 'start',
    },
  },
  {
    element: '[data-testid="ai-chat"]',
    popover: {
      title: 'חלון השיחה',
      description: 'הגבול האדום מסביב לכרטיסיית השיחה מציין שהעוזר "מחובר" לאירוע שבחרת. בפינה הימנית עליונה תראה את שם האירוע הפעיל. כתוב בחופשיות — העוזר מבין הקשר ויודע על מה אתה מדבר.',
      side: 'bottom', align: 'start',
    },
  },
  {
    element: '.px-6.py-3.bg-\\[\\#161922\\].border-b',
    popover: {
      title: 'פעולות מהירות',
      description: 'ארבעה כפתורים לפעולות נפוצות: "הוסף משתתף" מכין בשבילך את הפקודה, "משימה חדשה" פותח שיחה על הוספת משימה, "סטטוס" שולח שאלה לסיכום מלא של האירוע, ו"רעיונות" מבקש הצעות יצירתיות. שמוש בהם חוסך הקלדה.',
      side: 'bottom', align: 'start',
    },
  },
  {
    element: '[data-testid="ai-input"]',
    popover: {
      title: 'שדה ההקלדה',
      description: 'כתוב כל בקשה בעברית חופשית. לדוגמאות אמיתיות: "הוסף 5 אורחים מהרשימה הבאה: ישראל כהן 0501234567, שרה לוי 0521234567", "צור לוח זמנים לחתונה מ-18:00 עד 23:00", "שלח הודעת תזכורת לכל מי שעדיין לא אישר הגעה".',
      side: 'top', align: 'start',
    },
  },
  {
    element: '[data-testid="ai-send-btn"]',
    popover: {
      title: 'שליחה',
      description: 'לחץ לשליחה או הקש Enter. העוזר עונה בעברית תוך שניות ספורות. אם הוא ביצע פעולה במסד הנתונים תראה תג ירוק "הושלם" עם שם הפעולה — למשל "המשתתפים נוספו בהצלחה". השינויים מסתנכרנים ישירות בכל דפי המערכת.',
      side: 'top', align: 'start',
    },
  },
  {
    element: '.flex.flex-wrap.gap-2.justify-center.pt-2',
    popover: {
      title: 'הצעות חכמות',
      description: 'לאחר כל תשובה העוזר מציע 3 שאלות המשך מומלצות בהתאם להקשר. לחץ על הצעה כדי לשלוח אותה מיידית. זה עוזר להמשיך את זרימת העבודה בלי להפסיק לחשוב על מה לשאול הלאה.',
      side: 'top', align: 'start',
    },
  },
  {
    element: '.mt-6.p-4.bg-amber-500\\/10',
    popover: {
      title: 'חשוב — בחר אירוע קודם',
      description: 'אם לא בחרת אירוע מהתפריט הצדדי תראה כאן אזהרה כתומה. העוזר יכול לדבר בכלליות, אך לבצע פעולות (להוסיף אורחים, ליצור משימות) הוא צריך לדעת לאיזה אירוע לשייך אותן. בחר אירוע מהסיידבר — ואז חזור לכאן.',
      side: 'top', align: 'start',
    },
  },
]

// ─── Full first-time tour ────────────────────────────────────────────────────

const fullTourSteps: DriveStep[] = [
  ...homeSteps.slice(0, 3),
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


// ─── Route → TourPage map (exported for TourButton) ─────────────────────────

export function routeToTourPage(pathname: string): TourPage | null {
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

  // Auto-start full tour on first login only
  useEffect(() => {
    if (!isTourCompleted()) {
      const t = setTimeout(startFullTour, 1200)
      return () => clearTimeout(t)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
