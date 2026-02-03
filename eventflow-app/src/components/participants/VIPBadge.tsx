/**
 * VIPBadge Component
 *
 * מציג סמל עדין למשתתפי VIP
 * תצוגה עדינה ולא בולטת - יהלום סגול בהיר עם שקיפות
 */

interface VIPBadgeProps {
  /**
   * גודל הסמל
   * xs - קטן מאוד (לשימוש בטבלאות צפופות)
   * sm - קטן (ברירת מחדל לרשימות)
   * md - בינוני (לכרטיסים ודיאלוגים)
   */
  size?: 'xs' | 'sm' | 'md'

  /**
   * מחלקות CSS נוספות
   */
  className?: string
}

/**
 * רכיב VIPBadge - תצוגה עדינה למשתתפי VIP
 *
 * @example
 * ```tsx
 * // בטבלה
 * {participant.is_vip && <VIPBadge size="xs" />}
 *
 * // ברשימה
 * {participant.is_vip && <VIPBadge />}
 *
 * // בכרטיס
 * {participant.is_vip && <VIPBadge size="md" />}
 * ```
 */
export function VIPBadge({ size = 'sm', className = '' }: VIPBadgeProps) {
  // מיפוי גודל לקלאסים של Tailwind
  const sizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base'
  }

  return (
    <span
      className={`inline-flex items-center text-purple-600 opacity-70 ${sizeClasses[size]} ${className}`}
      title="משתתף VIP"
      role="img"
      aria-label="משתתף VIP"
    >
      💎
    </span>
  )
}
