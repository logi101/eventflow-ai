# 🚀 EventFlow AI Refactoring Guide

## מה לעשות עכשיו בתוך Claude Code

### שלב 1: אתחול עם GSD

```bash
# אנחה בתוך eventflow-app
cd eventflow-app

# התחל Claude Code
claude

# בתוך Claude Code, הרץ:
/gsd:help
```

### שלב 2: יצירת Milestone ל-Refactoring

```bash
# בתוך Claude Code, הרץ:
/gsd:new-milestone "Refactoring - Phase 1"
```

**GSD ישאל אותך:**
1. מה המטרה שלכם?
   - "לפרק את App.tsx הענק למודולים"
   - "לתקן שגיאות lint"
   - "לחלק את המערכת ל-modules"

2. מה הקונטקסט?
   - אנחנו ב-eventflow-app
   - יש App.tsx ענק (8,886 שורות)
   - יש Supabase DB מוגדר
   - Tech stack: React 19 + TypeScript + Vite

### שלב 3: דיון על Phase 1

```bash
# לאחר ש-GSD ייצור ROADMAP, הרץ:
/gsd:discuss-phase 1
```

**למה GSD ישאל:**
- אילו מודולים לחלץ ראשון?
- מה להעדיף ל-shared components?
- איך לארגן את הקבצים?
- האם לשמור את כל ה-routing במקום אחד?

### שלב 4: תכנון השלב

```bash
/gsd:plan-phase 1
```

**GSD ייצור:**
- Plan אטומי לכל משימה
- XML structure מסודר
- Verification steps
- Dependencies בין משימות

### שלב 5: ביצוע

```bash
/gsd:execute-phase 1
```

**GSD יעשה:**
- ✓ ייצור folder structure חדש
- ✓ יפרק components לקבצים נפרדים
- ✓ יכתוב hooks חדשים
- ✓ יעדכן imports
- ✓ Git commit לכל משימה
- ✓ יוודא שהכל עובד

### שלב 6: וריפיקציה

```bash
/gsd:verify-work 1
```

**תבדוק:**
- האם ה-build עובד?
- האם lint עובר?
- האם ה-tests עוברים?
- האם ה-app רץ?

---

## 📋 Roadmap מוצע ל-Phase 1

### Phase 1: Foundation & Critical Fixes

#### שלב 1.1: תיקון שגיאות Critical
```
□ תיקון function hoisting errors (11)
□ תיקון 'any' type errors (4)
□ תיקון lexical declarations (3)
□ וריפיקציה: npm run lint ✓
```

#### שלב 1.2: יצירת מבנה תיקיות
```
□ יצירת src/modules/
□ יצירת src/features/
□ יצירת src/core/
□ יצירת src/lib/integrations/
□ וריפיקציה: folder structure ✓
```

#### שלב 1.3: חילוץ Shared UI Components
```
□ components/shared/ui/Modal.tsx
□ components/shared/ui/Button.tsx
□ components/shared/ui/Input.tsx
□ components/shared/ui/Select.tsx
□ components/shared/ui/Badge.tsx
□ components/shared/ui/Card.tsx
□ components/shared/feedback/StatsCard.tsx
□ components/shared/feedback/EmptyState.tsx
□ components/shared/feedback/LoadingState.tsx
□ וריפיקציה: shared components ✓
```

#### שלב 1.4: חילוץ Events Module
```
□ modules/events/types.ts
□ modules/events/hooks/useEvents.ts
□ modules/events/hooks/useEventDetail.ts
□ modules/events/components/EventList.tsx
□ modules/events/components/EventCard.tsx
□ modules/events/components/EventForm.tsx
□ modules/events/pages/EventsPage.tsx
□ וריפיקציה: Events module ✓
```

---

## 🎯 מה לצפות

### כש-GSD עובד:
- ⏳ שאלות רבות בהתחלה
- 🤔 בקשות להבהרה
- 📝 תכנונים מפורטים ב-XML
- ✅ Commits אטומיים לכל משימה
- 🔄 תוצאות מסודרות

### עדיפויות:
- השיבות שלך חשובות - GSD מבין הקשר
- אל תדאג לשאול שאלות הבהרה
- הזמן השקע בדיון = זמן חסכון מאוחר

---

## 🚦 כלי עזר

### Git History לאחר כל Phase
```bash
git log --oneline
# תראה כמו:
abc123 fix: resolve function hoisting errors in GuestsPage
def456 feat: extract shared Modal component
ghi789 refactor: create Events module structure
```

### בדיקות לאחר כל Phase
```bash
npm run lint
npm run build
npm test
```

---

## 💡 טיפים חשובים

1. **אל תדאג לשמור את ה-work** - GSD עושה auto-commits
2. **השיבות שלך חשובות** - זה המפתח להצלחה
3. **קח הפסקות לדיון** - לא למהר לתכנון
4. **ודא ש-App.tsx עובד** לפני כל refactoring
5. **השתמש ב-dev server** כל הזמן במהלך

---

## 📞 צריך עזרה?

אם GSD תקוע או משהו לא ברור:
1. לחץ `/gsd:help` לראות את כל הפקודות
2. לחץ `/gsd:progress` לראות איפה אתה
3. לחץ `/gsd:debug` ל-debug אם משהו נתקע

---

## ✨ יאלה! מוכן להתחיל!

**התחל בקריאת שלב 1 בתוך Claude Code:**

```
/gsd:new-milestone "Refactoring - Phase 1"
```

אחרי זה, GSD ידריך אותך צעד אחר צעד! 🚀
