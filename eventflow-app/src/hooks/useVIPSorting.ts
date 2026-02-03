/**
 * useVIPSorting Hook
 *
 * מיון אוטומטי של רשימת משתתפים עם עדיפות ל-VIP
 * משתתפי VIP תמיד מופיעים בראש הרשימה
 */

import { useMemo } from 'react'

/**
 * סידור מחדש של מערך נתונים כך שמשתתפי VIP יופיעו ראשונים
 *
 * @template T - טיפוס האובייקט שחייב לכלול שדה is_vip
 * @param {T[]} data - מערך הנתונים למיון
 * @returns {T[]} - מערך ממוין: VIP ראשונים, שאר המשתתפים לפי הסדר המקורי
 *
 * @example
 * ```tsx
 * const participants = [
 *   { id: 1, name: 'משה', is_vip: false },
 *   { id: 2, name: 'דוד', is_vip: true },
 *   { id: 3, name: 'שרה', is_vip: false }
 * ]
 *
 * const sorted = useVIPSorting(participants)
 * // תוצאה: [דוד (VIP), משה, שרה]
 * ```
 */
export function useVIPSorting<T extends { is_vip: boolean }>(data: T[]): T[] {
  return useMemo(() => {
    // הפרדה לשתי קבוצות: VIP ורגילים
    const vips: T[] = []
    const regular: T[] = []

    data.forEach(item => {
      if (item.is_vip) {
        vips.push(item)
      } else {
        regular.push(item)
      }
    })

    // החזרת VIP ראשונים, אחר כך רגילים (בסדר המקורי)
    return [...vips, ...regular]
  }, [data])
}
