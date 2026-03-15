// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - Privacy Consent Modal
// חובה לגלול עד הסוף ולאשר לפני כניסה למערכת
// לפי חוק הגנת הפרטיות, התשמ"א-1981 ותיקון 13
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useRef, useCallback, useEffect } from 'react'
import { ShieldCheck, ScrollText, AlertCircle } from 'lucide-react'

interface PrivacyConsentModalProps {
  onAccept: () => void
}

export function PrivacyConsentModal({ onAccept }: PrivacyConsentModalProps) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false)
  const [isChecked, setIsChecked] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 20
    if (atBottom) setHasScrolledToBottom(true)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.addEventListener('scroll', handleScroll)
    return () => el?.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" dir="rtl">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center gap-3 p-6 border-b border-zinc-700 flex-shrink-0">
          <ShieldCheck className="w-7 h-7 text-orange-500 flex-shrink-0" />
          <div>
            <h2 className="text-xl font-bold text-white">מדיניות פרטיות ותנאי שימוש</h2>
            <p className="text-zinc-400 text-sm">נדרש לקרוא ולאשר לפני הכניסה למערכת</p>
          </div>
        </div>

        {/* Scroll instruction */}
        {!hasScrolledToBottom && (
          <div className="flex items-center gap-2 px-6 py-2 bg-orange-500/10 border-b border-orange-500/20 flex-shrink-0">
            <ScrollText className="w-4 h-4 text-orange-400 flex-shrink-0" />
            <p className="text-orange-300 text-xs">יש לגלול עד סוף המסמך כדי לאשר את תנאי השימוש</p>
          </div>
        )}

        {/* Scrollable content */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="overflow-y-auto flex-1 p-6 text-zinc-300 text-sm leading-relaxed space-y-5"
        >
          <div className="text-center border-b border-zinc-700 pb-4 mb-2">
            <h3 className="text-white font-bold text-lg">מדיניות פרטיות</h3>
            <p className="text-zinc-400 text-xs mt-1">גרסה 1.0 | עודכן: מרץ 2026</p>
            <p className="text-zinc-400 text-xs">בהתאם לחוק הגנת הפרטיות, התשמ"א-1981 ותיקון 13</p>
          </div>

          <section>
            <h4 className="text-white font-semibold mb-2">1. כללי</h4>
            <p>מערכת EventFlow AI (להלן: "המערכת") מופעלת על ידי החברה. מסמך זה מתאר את אופן איסוף, שמירה, עיבוד ושימוש במידע אישי של משתמשי המערכת, בהתאם לדרישות חוק הגנת הפרטיות, התשמ"א-1981, לרבות תיקון 13 לחוק (להלן: "החוק").</p>
            <p className="mt-2">השימוש במערכת מהווה הסכמה לתנאי מסמך זה. אם אינך מסכים לאמור כאן, אנא הימנע משימוש במערכת.</p>
          </section>

          <section>
            <h4 className="text-white font-semibold mb-2">2. המידע שאנו אוספים</h4>
            <p className="mb-2">במסגרת השימוש במערכת, אנו עשויים לאסוף את סוגי המידע הבאים:</p>
            <ul className="list-disc list-inside space-y-1 mr-4">
              <li><strong className="text-zinc-200">פרטי זיהוי:</strong> שם מלא, כתובת דוא"ל, מספר טלפון.</li>
              <li><strong className="text-zinc-200">פרטי אירועים:</strong> שמות, תאריכים, מיקומים, תקציבים ומידע הקשור לניהול אירועים.</li>
              <li><strong className="text-zinc-200">פרטי משתתפים:</strong> שמות, טלפונים ומידע על אורחים שהמשתמש מזין למערכת.</li>
              <li><strong className="text-zinc-200">מידע תפעולי:</strong> יומני גישה, כתובות IP, סוג דפדפן וזמני שימוש.</li>
              <li><strong className="text-zinc-200">תקשורת:</strong> תוכן הודעות WhatsApp ו/או SMS שנשלחות דרך המערכת.</li>
            </ul>
          </section>

          <section>
            <h4 className="text-white font-semibold mb-2">3. מטרות השימוש במידע</h4>
            <p className="mb-2">המידע שנאסף ישמש אך ורק למטרות הבאות:</p>
            <ul className="list-disc list-inside space-y-1 mr-4">
              <li>מתן שירות ניהול האירועים ותפעול המערכת.</li>
              <li>שליחת התראות, תזכורות ועדכונים הקשורים לאירועים.</li>
              <li>שיפור המערכת וחווית המשתמש.</li>
              <li>עמידה בדרישות חוקיות ורגולטוריות.</li>
              <li>טיפול בפניות תמיכה ופתרון תקלות.</li>
            </ul>
            <p className="mt-2">אנו מחויבים לעיקרון <strong className="text-zinc-200">מינימום מידע</strong> — נאסוף רק את המידע הנחוץ לצורך מתן השירות.</p>
          </section>

          <section>
            <h4 className="text-white font-semibold mb-2">4. הסכמה ועיבוד מידע (תיקון 13)</h4>
            <p className="mb-2">בהתאם לתיקון 13 לחוק הגנת הפרטיות:</p>
            <ul className="list-disc list-inside space-y-1 mr-4">
              <li>עיבוד מידע אישי יתבצע רק על בסיס הסכמה מפורשת, חוזה, חובה חוקית, או אינטרס לגיטימי.</li>
              <li>הסכמתך לתנאים אלה מהווה בסיס לעיבוד המידע הדרוש לתפעול המערכת.</li>
              <li>הסכמה לשליחת הודעות שיווקיות תינתן בנפרד ובאופן מפורש.</li>
              <li>תוכל לבטל הסכמתך בכל עת, בכפוף לזכויות המפורטות בסעיף 6.</li>
            </ul>
          </section>

          <section>
            <h4 className="text-white font-semibold mb-2">5. אחסון ואבטחת מידע</h4>
            <ul className="list-disc list-inside space-y-1 mr-4">
              <li>המידע מאוחסן בשרתים מאובטחים של Supabase (פלטפורמת ענן), בהצפנת SSL/TLS.</li>
              <li>הגישה למידע מוגבלת לעובדים ומערכות המורשים לכך בלבד.</li>
              <li>אנו מיישמים בקרות גישה מבוססות תפקיד (RBAC) לצמצום חשיפת מידע.</li>
              <li>במקרה של <strong className="text-zinc-200">פרצת אבטחה (Data Breach)</strong> שיש בה סיכון לפרטיות, נודיע לרשות להגנת הפרטיות ולמשתמשים המושפעים בתוך 72 שעות, כנדרש בתיקון 13.</li>
              <li>המידע ישמר למשך הזמן הנדרש לצורך מתן השירות ובהתאם לדרישות החוק, ולא יעלה על 7 שנים לאחר סיום ההתקשרות.</li>
            </ul>
          </section>

          <section>
            <h4 className="text-white font-semibold mb-2">6. זכויות הנושא (תיקון 13)</h4>
            <p className="mb-2">בהתאם לתיקון 13, עומדות לך הזכויות הבאות:</p>
            <ul className="list-disc list-inside space-y-1 mr-4">
              <li><strong className="text-zinc-200">זכות עיון:</strong> לבקש לצפות במידע האישי המוחזק אודותיך.</li>
              <li><strong className="text-zinc-200">זכות תיקון:</strong> לתקן מידע שגוי או לא מדויק.</li>
              <li><strong className="text-zinc-200">זכות מחיקה ("הזכות להישכח"):</strong> לבקש מחיקת המידע האישי שלך, בכפוף לחובות חוקיות.</li>
              <li><strong className="text-zinc-200">זכות הגבלת עיבוד:</strong> לבקש הגבלת השימוש במידע בנסיבות מסוימות.</li>
              <li><strong className="text-zinc-200">זכות ניידות מידע:</strong> לקבל את המידע שלך בפורמט מובנה וקריא.</li>
              <li><strong className="text-zinc-200">זכות התנגדות:</strong> להתנגד לעיבוד מידע לצרכי שיווק ישיר.</li>
            </ul>
            <p className="mt-2">לממש זכויות אלה, פנה אלינו בכתובת: <strong className="text-orange-400">privacy@eventflow.ai</strong></p>
          </section>

          <section>
            <h4 className="text-white font-semibold mb-2">7. העברת מידע לצדדים שלישיים</h4>
            <ul className="list-disc list-inside space-y-1 mr-4">
              <li>אנו לא מוכרים, מסחרים או מעבירים את המידע האישי שלך לצדדים שלישיים ללא הסכמתך.</li>
              <li>המידע עשוי להיות מועבר לספקי שירות שמסייעים בתפעול המערכת (Supabase, Google Gemini, Green API לשליחת WhatsApp), בכפוף להסכמי עיבוד מידע מתאימים.</li>
              <li>ספקים אלה מחויבים לשמור על סודיות המידע ולהשתמש בו רק לצורך מתן השירות.</li>
              <li>מידע עשוי להיחשף לרשויות מוסמכות בהתאם לדרישות חוקיות בלבד.</li>
            </ul>
          </section>

          <section>
            <h4 className="text-white font-semibold mb-2">8. העברת מידע מחוץ לישראל</h4>
            <p>חלק מהשירותים (כגון שרתי אחסון ו-AI) עשויים לכלול העברת מידע מחוץ לגבולות ישראל. העברה כזו תתבצע בהתאם להנחיות הרשות להגנת הפרטיות ורק למדינות שרמת הגנת המידע שלהן שוות ערך לישראל, או בכפוף להסכמים מתאימים.</p>
          </section>

          <section>
            <h4 className="text-white font-semibold mb-2">9. עוגיות ומעקב</h4>
            <p>המערכת עשויה להשתמש ב-localStorage ו-sessionStorage לצורך שמירת העדפות ומצב התחברות. אין שימוש בעוגיות מעקב שיווקיות ללא הסכמה מפורשת.</p>
          </section>

          <section>
            <h4 className="text-white font-semibold mb-2">10. שינויים במדיניות</h4>
            <p>אנו שומרים לעצמנו את הזכות לעדכן מדיניות זו מעת לעת. שינויים מהותיים יפורסמו בהודעה ברורה בממשק המערכת, ובמקרה הצורך יידרש אישורך מחדש.</p>
          </section>

          <section>
            <h4 className="text-white font-semibold mb-2">11. יצירת קשר — ממונה על הגנת הפרטיות</h4>
            <p>לשאלות, פניות ומימוש זכויות:</p>
            <ul className="list-disc list-inside space-y-1 mr-4 mt-1">
              <li>דוא"ל: <strong className="text-orange-400">privacy@eventflow.ai</strong></li>
              <li>פניות יטופלו בתוך 30 ימי עסקים כנדרש בחוק.</li>
            </ul>
          </section>

          <section>
            <h4 className="text-white font-semibold mb-2">12. תלונות לרשות</h4>
            <p>אם אינך מרוצה מהטיפול בפנייתך, תוכל לפנות לרשות להגנת הפרטיות: <strong className="text-zinc-200">gov.il/he/departments/the_privacy_protection_authority</strong></p>
          </section>

          {/* Bottom marker */}
          <div className="border-t border-zinc-700 pt-4 text-center text-zinc-500 text-xs">
            סוף מסמך מדיניות הפרטיות | EventFlow AI © 2026
          </div>
        </div>

        {/* Footer — consent */}
        <div className="p-6 border-t border-zinc-700 space-y-4 flex-shrink-0">
          {!hasScrolledToBottom && (
            <div className="flex items-center gap-2 text-zinc-500 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>גלול עד סוף המסמך כדי לאשר</span>
            </div>
          )}

          <label className={`flex items-start gap-3 cursor-pointer group ${!hasScrolledToBottom ? 'opacity-40 pointer-events-none' : ''}`}>
            <input
              type="checkbox"
              checked={isChecked}
              onChange={(e) => hasScrolledToBottom && setIsChecked(e.target.checked)}
              disabled={!hasScrolledToBottom}
              className="mt-0.5 w-4 h-4 accent-orange-500 cursor-pointer flex-shrink-0"
            />
            <span className="text-zinc-300 text-sm leading-relaxed">
              קראתי את מדיניות הפרטיות במלואה, הבנתי את תנאי השימוש ואני מסכים/ה לעיבוד המידע האישי שלי בהתאם לאמור לעיל ולחוק הגנת הפרטיות, התשמ"א-1981 ותיקון 13.
            </span>
          </label>

          <button
            onClick={onAccept}
            disabled={!isChecked || !hasScrolledToBottom}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200
              disabled:opacity-40 disabled:cursor-not-allowed
              enabled:bg-orange-500 enabled:hover:bg-orange-600 enabled:text-white enabled:shadow-lg enabled:shadow-orange-500/20"
          >
            {isChecked && hasScrolledToBottom ? '✓ אני מסכים/ה — כניסה למערכת' : 'יש לקרוא ולאשר את מדיניות הפרטיות'}
          </button>
        </div>
      </div>
    </div>
  )
}
