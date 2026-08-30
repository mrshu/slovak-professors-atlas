import type {
  Appointment,
  FieldCatalog,
  FieldEducationComparison,
  FieldEducationRow,
} from '../data/types'
import { normalizeForSearch } from '../utils/search'
import type { FieldLabelVariant } from './selectors'

export interface FieldEducationAnnualValue {
  year: number
  appointmentCount: number
  graduateCount: number | null
}

export interface FieldEducationLandscapeRow {
  fieldKey: string
  canonicalLabel: string
  appointmentCount: number
  exactAppointmentCount: number
  aliasAppointmentCount: number
  graduateCount: number | null
  graduatesPerAppointment: number | null
  currentStudentCount: number | null
  annual: FieldEducationAnnualValue[]
  variants: FieldLabelVariant[]
}

export interface FieldEducationPoint extends FieldEducationLandscapeRow {
  graduateCount: number
  graduatesPerAppointment: number
}

export interface FieldEducationCoverage {
  exactAppointmentCount: number
  aliasAppointmentCount: number
  matchedAppointmentCount: number
  appointmentCount: number
  matchedFieldCount: number
  fieldCount: number
  yearCount: number
}

export interface FieldEducationLandscape {
  points: FieldEducationPoint[]
  unmatched: FieldEducationLandscapeRow[]
  allRows: FieldEducationLandscapeRow[]
  coverage: FieldEducationCoverage
}

interface AppointmentGroup {
  appointmentCount: number
  exactAppointmentCount: number
  aliasAppointmentCount: number
  appointmentsByYear: Map<number, number>
  variants: Map<string, number>
}

const slovakCollator = new Intl.Collator('sk-SK')

function increment(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1)
}

function incrementYear(map: Map<number, number>, year: number): void {
  map.set(year, (map.get(year) ?? 0) + 1)
}

function appointmentGroups(
  records: readonly Appointment[],
  startYear: number,
  endYear: number,
): Map<string, AppointmentGroup> {
  const groups = new Map<string, AppointmentGroup>()
  for (const record of records) {
    const year = Number.parseInt(record.appointedOn.slice(0, 4), 10)
    if (year < startYear || year > endYear) continue

    const isAlias = normalizeForSearch(record.field) !== record.fieldKey
    let group = groups.get(record.fieldKey)
    if (group === undefined) {
      group = {
        appointmentCount: 0,
        exactAppointmentCount: 0,
        aliasAppointmentCount: 0,
        appointmentsByYear: new Map(),
        variants: new Map(),
      }
      groups.set(record.fieldKey, group)
    }
    group.appointmentCount += 1
    group.exactAppointmentCount += isAlias ? 0 : 1
    group.aliasAppointmentCount += isAlias ? 1 : 0
    incrementYear(group.appointmentsByYear, year)
    const sourceLabels =
      record.sourceVariants.length === 0
        ? [record.field]
        : record.sourceVariants.map(({ field }) => field)
    for (const label of sourceLabels) increment(group.variants, label)
  }
  return groups
}

function indexedEducationRows(
  comparison: FieldEducationComparison,
): Map<string, FieldEducationRow> {
  const rows = new Map<string, FieldEducationRow>()
  for (const row of comparison.rows) {
    if (rows.has(row.fieldKey)) {
      throw new TypeError(`Duplicate field education row ${row.fieldKey}`)
    }
    if (row.graduateCounts.length !== comparison.years.length) {
      throw new TypeError(
        `Field education row ${row.fieldKey} has ${row.graduateCounts.length} annual values; expected ${comparison.years.length}`,
      )
    }
    rows.set(row.fieldKey, row)
  }
  return rows
}

function variants(group: AppointmentGroup): FieldLabelVariant[] {
  return Array.from(group.variants, ([label, count]) => ({ label, count })).sort(
    (left, right) =>
      right.count - left.count ||
      slovakCollator.compare(left.label, right.label) ||
      left.label.localeCompare(right.label),
  )
}

function isPoint(row: FieldEducationLandscapeRow): row is FieldEducationPoint {
  return row.graduateCount !== null && row.graduatesPerAppointment !== null
}

export function buildFieldEducationLandscape(
  records: readonly Appointment[],
  catalog: FieldCatalog,
  comparison: FieldEducationComparison,
): FieldEducationLandscape {
  const groups = appointmentGroups(records, comparison.startYear, comparison.endYear)
  const educationRows = indexedEducationRows(comparison)
  const allRows = Array.from(groups, ([fieldKey, group]) => {
    const education = educationRows.get(fieldKey)
    const isMatched = education?.graduateCounts.some((count) => count !== null) ?? false
    const graduateCount = isMatched
      ? education!.graduateCounts.reduce<number>(
          (total, count) => total + (count ?? 0),
          0,
        )
      : null
    const annual = comparison.years.map(({ year }, index) => ({
      year,
      appointmentCount: group.appointmentsByYear.get(year) ?? 0,
      graduateCount: education?.graduateCounts[index] ?? null,
    }))
    const labelVariants = variants(group)
    const row: FieldEducationLandscapeRow = {
      fieldKey,
      canonicalLabel:
        education?.canonicalLabel ?? catalog.labels[fieldKey] ?? labelVariants[0]?.label ?? fieldKey,
      appointmentCount: group.appointmentCount,
      exactAppointmentCount: group.exactAppointmentCount,
      aliasAppointmentCount: group.aliasAppointmentCount,
      graduateCount,
      graduatesPerAppointment:
        graduateCount === null ? null : graduateCount / group.appointmentCount,
      currentStudentCount: education?.currentStudentCount ?? null,
      annual,
      variants: labelVariants,
    }
    return row
  }).sort(
    (left, right) =>
      right.appointmentCount - left.appointmentCount ||
      slovakCollator.compare(left.canonicalLabel, right.canonicalLabel),
  )
  const points = allRows.filter(isPoint)
  const unmatched = allRows.filter((row) => !isPoint(row))

  return {
    points,
    unmatched,
    allRows,
    coverage: {
      exactAppointmentCount: points.reduce(
        (total, row) => total + row.exactAppointmentCount,
        0,
      ),
      aliasAppointmentCount: points.reduce(
        (total, row) => total + row.aliasAppointmentCount,
        0,
      ),
      matchedAppointmentCount: points.reduce(
        (total, row) => total + row.appointmentCount,
        0,
      ),
      appointmentCount: allRows.reduce(
        (total, row) => total + row.appointmentCount,
        0,
      ),
      matchedFieldCount: points.length,
      fieldCount: allRows.length,
      yearCount: comparison.years.length,
    },
  }
}
