// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - Excel Utilities (ExcelJS)
// Replaces vulnerable xlsx package with ExcelJS for secure Excel I/O
// ═══════════════════════════════════════════════════════════════════════════

import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

/**
 * Read an Excel file from an ArrayBuffer and return rows as an array of
 * key-value objects (similar to XLSX.utils.sheet_to_json).
 *
 * The first row is treated as column headers. Subsequent rows become objects
 * keyed by those headers. Empty cells are omitted from the resulting object.
 */
export async function readExcelFile<T extends Record<string, unknown> = Record<string, string>>(
  buffer: ArrayBuffer
): Promise<T[]> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)

  const worksheet = workbook.worksheets[0]
  if (!worksheet || worksheet.rowCount === 0) {
    return []
  }

  // Extract headers from the first row
  const headerRow = worksheet.getRow(1)
  const headers: string[] = []

  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    // Clean header text: remove BOM, RTL/LTR marks, trim whitespace
    const raw = cell.text || cell.value?.toString() || ''
    const cleaned = raw
      .replace(/[\u200F\u200E\uFEFF\u200B\u200C\u200D]/g, '')
      .trim()
    headers[colNumber] = cleaned
  })

  // Extract data rows
  const rows: T[] = []
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return // skip header

    const obj: Record<string, unknown> = {}
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const header = headers[colNumber]
      if (!header) return

      // Handle different cell value types
      let value: unknown = cell.value
      if (cell.type === ExcelJS.ValueType.Date && value instanceof Date) {
        value = value.toISOString()
      } else if (cell.type === ExcelJS.ValueType.RichText && cell.value && typeof cell.value === 'object' && 'richText' in cell.value) {
        // RichText: concatenate all text parts
        const richText = (cell.value as { richText: Array<{ text: string }> }).richText
        value = richText.map(part => part.text).join('')
      } else if (cell.type === ExcelJS.ValueType.Hyperlink && cell.value && typeof cell.value === 'object' && 'text' in cell.value) {
        value = (cell.value as { text: string }).text
      } else if (cell.type === ExcelJS.ValueType.Formula && cell.value && typeof cell.value === 'object' && 'result' in cell.value) {
        value = (cell.value as { result: unknown }).result
      } else if (value !== null && value !== undefined) {
        value = cell.text || value.toString()
      }

      if (value !== null && value !== undefined && value !== '') {
        obj[header] = value
      }
    })

    // Only include rows that have at least one value
    if (Object.keys(obj).length > 0) {
      rows.push(obj as T)
    }
  })

  return rows
}

/**
 * Write an array of objects to an Excel file and trigger a browser download.
 * Supports RTL worksheets for Hebrew content.
 *
 * @param data - Array of objects where keys become column headers
 * @param filename - Output filename (should end with .xlsx)
 * @param sheetName - Worksheet name (defaults to 'Sheet1')
 * @param rtl - Whether to set the worksheet to RTL mode (defaults to true)
 */
export async function writeExcelFile(
  data: Record<string, unknown>[],
  filename: string,
  sheetName: string = 'Sheet1',
  rtl: boolean = true
): Promise<void> {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet(sheetName)

  if (rtl) {
    worksheet.views = [{ rightToLeft: true }]
  }

  if (data.length === 0) {
    const buffer = await workbook.xlsx.writeBuffer()
    saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename)
    return
  }

  // Set up columns from the keys of the first object
  const keys = Object.keys(data[0])
  worksheet.columns = keys.map(key => ({
    header: key,
    key,
    width: Math.max(key.length * 1.5, 12) // Reasonable default width
  }))

  // Style the header row
  worksheet.getRow(1).font = { bold: true }
  worksheet.getRow(1).alignment = { horizontal: rtl ? 'right' : 'left' }

  // Add data rows
  data.forEach(item => {
    const row: Record<string, unknown> = {}
    keys.forEach(key => {
      row[key] = item[key] ?? ''
    })
    worksheet.addRow(row)
  })

  const buffer = await workbook.xlsx.writeBuffer()
  saveAs(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    filename
  )
}

/**
 * Write an array-of-arrays to an Excel file and trigger a browser download.
 * This is the ExcelJS equivalent of XLSX.utils.aoa_to_sheet.
 *
 * @param data - 2D array where each inner array is a row
 * @param filename - Output filename (should end with .xlsx)
 * @param sheetName - Worksheet name
 * @param rtl - Whether to set the worksheet to RTL mode (defaults to true)
 */
export async function writeExcelFileFromArrays(
  data: unknown[][],
  filename: string,
  sheetName: string = 'Sheet1',
  rtl: boolean = true
): Promise<void> {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet(sheetName)

  if (rtl) {
    worksheet.views = [{ rightToLeft: true }]
  }

  // Add each row as an array
  data.forEach(row => {
    worksheet.addRow(row)
  })

  // Style the first row as a title if it exists
  if (data.length > 0) {
    worksheet.getRow(1).font = { bold: true, size: 14 }
  }

  const buffer = await workbook.xlsx.writeBuffer()
  saveAs(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    filename
  )
}
