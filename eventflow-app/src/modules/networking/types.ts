/**
 * Networking Module Types
 *
 * טיפוסים עבור מערכת הרשתות והשיבוץ לשולחנות
 */

/**
 * אילוצים עבור אלגוריתם השיבוץ לשולחנות
 */
export interface SeatingConstraints {
  /** מקסימום משתתפים בשולחן (ברירת מחדל) */
  maxTableSize: number

  /** גדלי שולחנות משתנים - מיפוי מספר שולחן לקיבולת */
  variableTableSizes?: Map<number, number>

  /** מינימום משתתפים עם עניין משותף לכל שולחן */
  minSharedInterests: number

  /** מקסימום משתתפים מאותו מסלול בשולחן (גיוון) */
  maxSameTrack: number

  /** שמור מלווים ביחד באותו שולחן */
  companionsTogether: boolean

  /** פזר VIPים על פני שולחנות (מקסימום 2 VIP לשולחן) */
  vipSpread: boolean

  /** שולחנות ייעודיים ל-VIP (אופציונלי) */
  vipPriorityTables?: number[]
}

/**
 * שיבוץ משתתף לשולחן (שורה מטבלת table_assignments)
 */
export interface TableAssignment {
  id: string
  event_id: string
  participant_id: string
  table_number: number
  seat_number?: number
  is_vip_table: boolean
  assigned_by: 'ai' | 'manager' | 'auto'
  assigned_at: string
  notes?: string
}

/**
 * משתתף עם נתוני רשתות לצורך אלגוריתם השיבוץ
 */
export interface SeatingParticipant {
  id: string
  first_name: string
  last_name: string
  /** מזהי מסלולים שהמשתתף רשום אליהם */
  tracks: string[]
  is_vip: boolean
  /** מזהה מלווה (companion_id מטבלת participants) */
  companion_id?: string
  /** האם המשתתף הסכים להשתתף ברשתות */
  networking_opt_in: boolean
}

/**
 * שולחן עם רשימת המשתתפים המוקצים לו
 */
export interface TableWithParticipants {
  /** מספר שולחן (1-based) */
  tableNumber: number
  /** קיבולת מקסימלית */
  capacity: number
  /** האם זהו שולחן VIP */
  isVipTable: boolean
  /** משתתפים שהוקצו לשולחן זה */
  participants: SeatingParticipant[]
}
