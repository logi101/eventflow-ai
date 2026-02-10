/**
 * Geometry Utilities for Seating Plan
 * חישובים גיאומטריים לסידור מושבים סביב שולחנות
 */

export interface Point {
  x: number
  y: number
}

/**
 * מחשב מיקומי כיסאות מסביב לשולחן עגול
 * @param center מרכז השולחן
 * @param radius רדיוס השולחן
 * @param seatCount מספר כיסאות
 * @returns מערך של נקודות (קואורדינטות) עבור כל כיסא
 */
export function calculateRoundTableSeats(
  center: Point,
  radius: number,
  seatCount: number
): Point[] {
  const seats: Point[] = []
  const angleStep = (2 * Math.PI) / seatCount

  for (let i = 0; i < seatCount; i++) {
    const angle = i * angleStep - Math.PI / 2 // Start from top
    seats.push({
      x: center.x + radius * Math.cos(angle),
      y: center.y + radius * Math.sin(angle),
    })
  }

  return seats
}

/**
 * מחשב מיקומי כיסאות מסביב לשולחן מלבני
 * @param x x-coordinate top-left
 * @param y y-coordinate top-left
 * @param width רוחב השולחן
 * @param height גובה השולחן
 * @param seatCount מספר כיסאות
 * @returns מערך של נקודות
 */
export function calculateRectTableSeats(
  x: number,
  y: number,
  width: number,
  height: number,
  seatCount: number
): Point[] {
  const seats: Point[] = []
  
  // פריסה פשוטה: מחלקים את הכיסאות בין הצדדים הארוכים
  const seatsPerSide = Math.ceil(seatCount / 2)
  const spacing = width / (seatsPerSide + 1)

  // Top side
  for (let i = 1; i <= seatsPerSide; i++) {
    if (seats.length >= seatCount) break
    seats.push({ x: x + i * spacing, y: y - 20 })
  }

  // Bottom side
  for (let i = 1; i <= seatsPerSide; i++) {
    if (seats.length >= seatCount) break
    seats.push({ x: x + i * spacing, y: y + height + 20 })
  }

  return seats
}

/**
 * מחשב סידור שורות (תיאטרון)
 * @param startX נקודת התחלה
 * @param startY נקודת התחלה
 * @param seatsPerRow כיסאות בשורה
 * @param rowCount מספר שורות
 * @returns מערך של נקודות
 */
export function calculateTheaterSeats(
  startX: number,
  startY: number,
  seatsPerRow: number,
  rowCount: number
): Point[] {
  const seats: Point[] = []
  const xSpacing = 50
  const ySpacing = 60

  for (let row = 0; row < rowCount; row++) {
    for (let col = 0; row < seatsPerRow; col++) {
      seats.push({
        x: startX + col * xSpacing,
        y: startY + row * ySpacing
      })
    }
  }
  return seats
}
