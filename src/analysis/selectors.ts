import type { Appointment, AtlasData, Institution } from '../data/types'
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

export interface CeremonyCount {
  appointedOn: string
  count: number
}

export interface CeremonyCadence {
  ceremonyCount: number
  medianBatchSize: number | null
  largestBatchSize: number
  medianElapsedDays: number | null
}

export interface AcademicBreadth {
  cityCount: number
  institutionCount: number
  facultyCount: number
}

export interface InstitutionConcentration {
  totalCount: number
  topThreeCount: number
  topThreeShare: number
  leadingInstitutionId: string | null
  leadingInstitutionName: string | null
  leadingInstitutionCount: number
}

const DAY_IN_MILLISECONDS = 86_400_000
const slovakCollator = new Intl.Collator('sk-SK')
const institutionSearchIndex = new WeakMap<Institution, string>()

function institutionSearchText(institution: Institution): string {
  const cached = institutionSearchIndex.get(institution)
  if (cached !== undefined) {
    return cached
  }

  const indexed = normalizeForSearch(`${institution.shortName} ${institution.fullName}`)
  institutionSearchIndex.set(institution, indexed)
  return indexed
}

function incrementCount<Key>(counts: Map<Key, number>, key: Key): void {
  counts.set(key, (counts.get(key) ?? 0) + 1)
}

function median(values: readonly number[]): number | null {
  if (values.length === 0) {
    return null
  }

  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) {
    return sorted[middle] ?? null
  }

  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
}

export function filterAppointments(data: AtlasData, filters: FilterState): Appointment[] {
  const institutionById = new Map(
    data.institutions.map((institution) => [institution.id, institution] as const),
  )
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

    const institution = institutionById.get(appointment.institutionId)
    if (filters.city !== null && institution?.city !== filters.city) {
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
    if (filters.field !== null && appointment.field !== filters.field) {
      return false
    }
    if (
      normalizedQuery.length > 0 &&
      !matchesAppointment(appointment) &&
      (institution === undefined ||
        !institutionSearchText(institution).includes(normalizedQuery))
    ) {
      return false
    }

    return true
  })
}

export function institutionRanking(
  records: readonly Appointment[],
  institutions: readonly Institution[] = [],
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
  institutions: readonly Institution[],
): CityCount[] {
  const counts = new Map<string, number>()
  const cityByInstitutionId = new Map(
    institutions.map(({ id, city }) => [id, city] as const),
  )

  for (const appointment of records) {
    const city = cityByInstitutionId.get(appointment.institutionId)
    if (city !== undefined) {
      incrementCount(counts, city)
    }
  }

  return Array.from(counts, ([city, count]) => ({ city, count })).sort(
    (left, right) => right.count - left.count || slovakCollator.compare(left.city, right.city),
  )
}

export function facultyCounts(records: readonly Appointment[]): FacultyCount[] {
  const counts = new Map<string, number>()
  for (const appointment of records) {
    const { faculty } = appointment
    if (faculty !== null && faculty.trim().length > 0) {
      incrementCount(counts, faculty)
    }
  }

  return Array.from(counts, ([faculty, count]) => ({ faculty, count })).sort(
    (left, right) =>
      right.count - left.count || slovakCollator.compare(left.faculty, right.faculty),
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

export function ceremonyCadence(records: readonly Appointment[]): CeremonyCadence {
  const ceremonies = ceremonyCounts(records)
  const batchSizes = ceremonies.map(({ count }) => count)
  const elapsedDays = ceremonies.slice(1).map((ceremony, index) => {
    const previous = ceremonies[index]
    if (previous === undefined) {
      return 0
    }
    return (
      (Date.parse(`${ceremony.appointedOn}T00:00:00Z`) -
        Date.parse(`${previous.appointedOn}T00:00:00Z`)) /
      DAY_IN_MILLISECONDS
    )
  })

  return {
    ceremonyCount: ceremonies.length,
    medianBatchSize: median(batchSizes),
    largestBatchSize: batchSizes.length > 0 ? Math.max(...batchSizes) : 0,
    medianElapsedDays: median(elapsedDays),
  }
}

export function academicBreadth(
  records: readonly Appointment[],
  institutions: readonly Institution[],
): AcademicBreadth {
  const cityByInstitutionId = new Map(
    institutions.map(({ id, city }) => [id, city] as const),
  )
  const institutionIds = new Set<string>()
  const cities = new Set<string>()
  const faculties = new Set<string>()

  for (const appointment of records) {
    institutionIds.add(appointment.institutionId)
    const city = cityByInstitutionId.get(appointment.institutionId)
    if (city !== undefined) {
      cities.add(city)
    }
    if (appointment.faculty !== null && appointment.faculty.trim().length > 0) {
      faculties.add(appointment.faculty)
    }
  }

  return {
    cityCount: cities.size,
    institutionCount: institutionIds.size,
    facultyCount: faculties.size,
  }
}

export function institutionConcentration(
  records: readonly Appointment[],
  institutions: readonly Institution[] = [],
): InstitutionConcentration {
  const ranking = institutionRanking(records, institutions)
  const topThreeCount = ranking
    .slice(0, 3)
    .reduce((total, institution) => total + institution.count, 0)
  const leading = ranking[0]

  return {
    totalCount: records.length,
    topThreeCount,
    topThreeShare: records.length === 0 ? 0 : topThreeCount / records.length,
    leadingInstitutionId: leading?.institutionId ?? null,
    leadingInstitutionName: leading?.name ?? null,
    leadingInstitutionCount: leading?.count ?? 0,
  }
}
