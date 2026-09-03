import type { Appointment } from '../data/types'
import type { FieldEducationLandscapeRow, FieldEducationPoint } from './fieldEducation'

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

export interface FieldRatioRow {
  fieldKey: string
  label: string
  appointments: number
  graduates: number
  coveredYears: number
  graduatesPerAppointment: number
}

export interface FieldRatioSpread {
  rows: FieldRatioRow[]
  median: number | null
}

export interface FieldRatioOptions {
  minYears?: number
  minAppointments?: number
}

const ratioCollator = new Intl.Collator('sk-SK')

/**
 * Ratio of graduates to appointments per field, counted only over the years in
 * which the ministry reports graduates for that field. Fields whose graduate
 * series is mostly empty are dropped: a single reported year turns any field
 * into a spurious outlier.
 */
export function fieldRatioSpread(
  rows: readonly FieldEducationLandscapeRow[],
  options: FieldRatioOptions = {},
): FieldRatioSpread {
  const minYears = options.minYears ?? 12
  const minAppointments = options.minAppointments ?? 5
  const kept: FieldRatioRow[] = []
  for (const row of rows) {
    const covered = row.annual.filter(({ graduateCount }) => graduateCount !== null)
    const graduates = covered.reduce((total, value) => total + (value.graduateCount ?? 0), 0)
    const appointments = covered.reduce((total, value) => total + value.appointmentCount, 0)
    if (covered.length < minYears || appointments < minAppointments || graduates === 0) continue
    kept.push({
      fieldKey: row.fieldKey,
      label: row.canonicalLabel,
      appointments,
      graduates,
      coveredYears: covered.length,
      graduatesPerAppointment: graduates / appointments,
    })
  }
  kept.sort(
    (left, right) =>
      left.graduatesPerAppointment - right.graduatesPerAppointment ||
      ratioCollator.compare(left.label, right.label),
  )
  const middle = Math.floor(kept.length / 2)
  const median =
    kept.length === 0
      ? null
      : kept.length % 2 === 1
        ? kept[middle]!.graduatesPerAppointment
        : (kept[middle - 1]!.graduatesPerAppointment + kept[middle]!.graduatesPerAppointment) / 2
  return { rows: kept, median }
}
