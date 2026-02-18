import Papa from 'papaparse'

function escapeCsvCell(value: unknown): string {
  const text = String(value ?? '')
  const escaped = text.replace(/"/g, '""')
  if (/[",\n\r]/.test(escaped)) {
    return `"${escaped}"`
  }
  return escaped
}

export async function readCsvFile<T = Record<string, string>>(file: File): Promise<T[]> {
  const content = await file.text()
  const parsed = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
  })

  if (parsed.errors.length > 0) {
    throw new Error(parsed.errors[0].message)
  }

  return parsed.data as T[]
}

export function writeCsvFile(
  data: Record<string, unknown>[],
  filename: string
): void {
  if (data.length === 0) {
    downloadCsv('', filename)
    return
  }

  const headers = Object.keys(data[0])
  const headerLine = headers.map(escapeCsvCell).join(',')
  const bodyLines = data.map((row) => headers.map((key) => escapeCsvCell(row[key])).join(','))
  const csv = [headerLine, ...bodyLines].join('\n')
  downloadCsv(csv, filename)
}

export function writeCsvFileFromArrays(
  data: unknown[][],
  filename: string
): void {
  const csv = data.map((row) => row.map(escapeCsvCell).join(',')).join('\n')
  downloadCsv(csv, filename)
}

function downloadCsv(content: string, filename: string): void {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
