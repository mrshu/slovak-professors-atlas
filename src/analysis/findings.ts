import type { Appointment } from '../data/types'
import type { FieldEducationPoint } from './fieldEducation'

export interface TitleShareYear {
  year: number
  total: number
  phd: number
  csc: number
  drsc: number
}

export interface MonthTotal {
  month: number
  appointments: number
  ceremonies: number
}

export interface FieldShareRow {
  fieldKey: string
  label: string
  appointments: number
  graduates: number
  appointmentShare: number
  graduateShare: number
}

function has(titles: string | null, token: string): boolean {
  return titles !== null && titles.includes(token)
}

export function titleSharesByYear(records: readonly Appointment[]): TitleShareYear[] {
  const byYear = new Map<number, TitleShareYear>()
  for (const record of records) {
    const year = Number.parseInt(record.appointedOn.slice(0, 4), 10)
    let row = byYear.get(year)
    if (row === undefined) {
      row = { year, total: 0, phd: 0, csc: 0, drsc: 0 }
      byYear.set(year, row)
    }
    row.total += 1
    if (has(record.titlesAfter, 'PhD')) row.phd += 1
    if (has(record.titlesAfter, 'CSc')) row.csc += 1
    if (has(record.titlesAfter, 'DrSc')) row.drsc += 1
  }
  return [...byYear.values()].sort((left, right) => left.year - right.year)
}

export function titleCrossoverYear(rows: readonly TitleShareYear[]): number | null {
  return rows.find((row) => row.phd > row.csc)?.year ?? null
}

export function monthTotals(records: readonly Appointment[]): MonthTotal[] {
  const totals = Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    appointments: 0,
    ceremonies: 0,
  }))
  const ceremonies = new Set<string>()
  for (const record of records) {
    const month = Number.parseInt(record.appointedOn.slice(5, 7), 10)
    const row = totals[month - 1]
    if (row === undefined) continue
    row.appointments += 1
    if (!ceremonies.has(record.appointedOn)) {
      ceremonies.add(record.appointedOn)
      row.ceremonies += 1
    }
  }
  return totals
}

export function fieldShareRows(points: readonly FieldEducationPoint[]): FieldShareRow[] {
  const appointmentTotal = points.reduce((total, point) => total + point.appointmentCount, 0)
  const graduateTotal = points.reduce((total, point) => total + point.graduateCount, 0)
  return points.map((point) => ({
    fieldKey: point.fieldKey,
    label: point.canonicalLabel,
    appointments: point.appointmentCount,
    graduates: point.graduateCount,
    appointmentShare: appointmentTotal === 0 ? 0 : point.appointmentCount / appointmentTotal,
    graduateShare: graduateTotal === 0 ? 0 : point.graduateCount / graduateTotal,
  }))
}
