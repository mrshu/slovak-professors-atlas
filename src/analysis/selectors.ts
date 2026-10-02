import type { Affiliation, Appointment, AtlasData, Institution } from '../data/types'
import type { FilterState } from '../state/filters'
import { createSearchMatcher, normalizeForSearch } from '../utils/search'

export interface InstitutionCount {
  institutionId: string
  name: string
  count: number
}

export interface CityCount {
  city: string
  count: number
}

export interface YearCount {
  year: number
  count: number
}

export interface FacultyCount {
  faculty: string
  count: number
}

export interface FieldLabelVariant {
  label: string
  count: number
}

export interface FieldAppointmentRankingRow {
  fieldKey: string
  field: string
  appointmentCount: number
  appointmentShare: number
  firstYear: number
  lastYear: number
  variants: FieldLabelVariant[]
}

export interface CeremonyCount {
  appointedOn: string
  count: number
}

const slovakCollator = new Intl.Collator('sk-SK')
function cityByAffiliationId(affiliations: readonly Affiliation[]): Map<string, string> {
  return new Map(
    affiliations.flatMap((affiliation) =>
      affiliation.status === 'resolved' && affiliation.city !== null
        ? [[affiliation.id, affiliation.city] as const]
        : [],
    ),
  )
}


function incrementCount<Key>(counts: Map<Key, number>, key: Key): void {
  counts.set(key, (counts.get(key) ?? 0) + 1)
}

export function filterAppointments(data: AtlasData, filters: FilterState): Appointment[] {
  const institutionSearchText = new Map(
    data.institutions.map(
      (institution) =>
        [
          institution.id,
          normalizeForSearch(`${institution.shortName} ${institution.fullName}`),
        ] as const,
    ),
  )
  const affiliationCities = cityByAffiliationId(data.affiliations)
  const normalizedQuery = normalizeForSearch(filters.query)
  const matchesAppointment = createSearchMatcher(filters.query)

  return data.records.filter((appointment) => {
    const year = Number.parseInt(appointment.appointedOn.slice(0, 4), 10)
    if (year < filters.startYear || year > filters.endYear) {
      return false
    }
    if (filters.presidentId !== null && appointment.presidentId !== filters.presidentId) {
      return false
    }

    if (
      filters.city !== null &&
      affiliationCities.get(appointment.affiliationId) !== filters.city
    ) {
      return false
    }
    if (
      filters.institutionId !== null &&
      appointment.institutionId !== filters.institutionId
    ) {
      return false
    }
    if (filters.faculty !== null && appointment.faculty !== filters.faculty) {
      return false
    }
    if (filters.field !== null && appointment.fieldKey !== filters.field) {
      return false
    }
    if (
      filters.appointedOn !== null &&
      appointment.appointedOn !== filters.appointedOn
    ) {
      return false
    }
    if (
      normalizedQuery.length > 0 &&
      !matchesAppointment(appointment) &&
      !institutionSearchText.get(appointment.institutionId)?.includes(normalizedQuery)
    ) {
      return false
    }

    return true
  })
}


export function institutionRanking(
  records: readonly Appointment[],
  institutions: readonly Institution[],
): InstitutionCount[] {
  const counts = new Map<string, number>()
  const institutionById = new Map(
    institutions.map((institution) => [institution.id, institution] as const),
  )

  for (const appointment of records) {
    incrementCount(counts, appointment.institutionId)
  }

  return Array.from(counts, ([institutionId, count]) => ({
    institutionId,
    name: institutionById.get(institutionId)?.shortName ?? institutionId,
    count,
  })).sort(
    (left, right) =>
      right.count - left.count ||
      slovakCollator.compare(left.name, right.name) ||
      left.institutionId.localeCompare(right.institutionId),
  )
}

export function cityCounts(
  records: readonly Appointment[],
  affiliations: readonly Affiliation[],
): CityCount[] {
  const counts = new Map<string, number>()
  const affiliationCities = cityByAffiliationId(affiliations)

  for (const appointment of records) {
    const city = affiliationCities.get(appointment.affiliationId)
    if (city !== undefined) {
      incrementCount(counts, city)
    }
  }

  return Array.from(counts, ([city, count]) => ({ city, count })).sort(
    (left, right) => right.count - left.count || slovakCollator.compare(left.city, right.city),
  )
}

export function facultyDistribution(records: readonly Appointment[]): FacultyCount[] {
  const counts = new Map<string, number>()
  for (const appointment of records) {
    const faculty =
      appointment.faculty === null || appointment.faculty.trim().length === 0
        ? 'neuvedené'
        : appointment.faculty
    incrementCount(counts, faculty)
  }

  return Array.from(counts, ([faculty, count]) => ({ faculty, count })).sort(
    (left, right) =>
      right.count - left.count || slovakCollator.compare(left.faculty, right.faculty),
  )
}

export function fieldAppointmentRanking(
  records: readonly Appointment[],
  labels: Readonly<Record<string, string>>,
): FieldAppointmentRankingRow[] {
  const groups = new Map<
    string,
    {
      count: number
      firstYear: number
      lastYear: number
      variants: Map<string, number>
    }
  >()

  for (const appointment of records) {
    const key = appointment.fieldKey
    const year = Number.parseInt(appointment.appointedOn.slice(0, 4), 10)
    const sourceLabels =
      appointment.sourceVariants.length === 0
        ? [appointment.field]
        : appointment.sourceVariants.map(({ field }) => field)
    const group = groups.get(key)
    if (group === undefined) {
      const variants = new Map<string, number>()
      for (const label of sourceLabels) incrementCount(variants, label)
      groups.set(key, {
        count: 1,
        firstYear: year,
        lastYear: year,
        variants,
      })
      continue
    }

    group.count += 1
    group.firstYear = Math.min(group.firstYear, year)
    group.lastYear = Math.max(group.lastYear, year)
    for (const label of sourceLabels) incrementCount(group.variants, label)
  }

  return Array.from(groups, ([fieldKey, group]) => {
    const variants = Array.from(group.variants, ([label, count]) => ({ label, count })).sort(
      (left, right) =>
        right.count - left.count ||
        slovakCollator.compare(left.label, right.label) ||
        left.label.localeCompare(right.label),
    )

    return {
      fieldKey,
      field: labels[fieldKey] ?? variants[0]?.label ?? fieldKey,
      appointmentCount: group.count,
      appointmentShare: records.length === 0 ? 0 : group.count / records.length,
      firstYear: group.firstYear,
      lastYear: group.lastYear,
      variants,
    }
  }).sort(
    (left, right) =>
      right.appointmentCount - left.appointmentCount ||
      slovakCollator.compare(left.field, right.field),
  )
}

export function yearCounts(records: readonly Appointment[]): YearCount[] {
  const counts = new Map<number, number>()
  for (const appointment of records) {
    incrementCount(counts, Number.parseInt(appointment.appointedOn.slice(0, 4), 10))
  }

  return Array.from(counts, ([year, count]) => ({ year, count })).sort(
    (left, right) => left.year - right.year,
  )
}

export function ceremonyCounts(records: readonly Appointment[]): CeremonyCount[] {
  const counts = new Map<string, number>()
  for (const appointment of records) {
    incrementCount(counts, appointment.appointedOn)
  }

  return Array.from(counts, ([appointedOn, count]) => ({ appointedOn, count })).sort((left, right) =>
    left.appointedOn.localeCompare(right.appointedOn),
  )
}

export interface CityFieldRow {
  fieldKey: string
  label: string
  cityCount: number
  nationalCount: number
  share: number
}

export interface CityFieldRanking {
  city: string
  cityTotal: number
  nationalTotal: number
  rows: CityFieldRow[]
}

/**
 * Fields a city appoints in, with the city's share of the national
 * appointments in the same field and period. Graduate statistics have no city,
 * so this is the city-level counterpart the ratio comparison cannot give.
 */
export function cityFieldRanking(
  records: readonly Appointment[],
  affiliations: readonly Affiliation[],
  labels: Readonly<Record<string, string>>,
  city: string,
  range: { startYear: number; endYear: number },
): CityFieldRanking {
  const affiliationCities = cityByAffiliationId(affiliations)
  const cityCounts = new Map<string, number>()
  const nationalCounts = new Map<string, number>()
  const fallbackLabels = new Map<string, string>()
  let cityTotal = 0
  let nationalTotal = 0

  for (const appointment of records) {
    const year = Number.parseInt(appointment.appointedOn.slice(0, 4), 10)
    if (year < range.startYear || year > range.endYear) continue
    incrementCount(nationalCounts, appointment.fieldKey)
    nationalTotal += 1
    if (!fallbackLabels.has(appointment.fieldKey)) {
      fallbackLabels.set(appointment.fieldKey, appointment.field)
    }
    if (affiliationCities.get(appointment.affiliationId) !== city) continue
    incrementCount(cityCounts, appointment.fieldKey)
    cityTotal += 1
  }

  const rows = Array.from(cityCounts, ([fieldKey, cityCount]) => {
    const nationalCount = nationalCounts.get(fieldKey)!
    return {
      fieldKey,
      label: labels[fieldKey] ?? fallbackLabels.get(fieldKey) ?? fieldKey,
      cityCount,
      nationalCount,
      share: cityCount / nationalCount,
    }
  }).sort(
    (left, right) =>
      right.cityCount - left.cityCount ||
      right.share - left.share ||
      slovakCollator.compare(left.label, right.label),
  )

  return { city, cityTotal, nationalTotal, rows }
}
