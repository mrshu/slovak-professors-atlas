import type { Affiliation, Appointment, AtlasData, Institution, President } from '../data/types'
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

export interface FieldLandscapeSummary {
  appointmentCount: number
  distinctFieldCount: number
  singletonFieldCount: number
  leadingFieldKey: string | null
  leadingField: string | null
  leadingAppointmentCount: number
  leadingShare: number
  topTenCount: number
  topTenShare: number
  firstYear: number | null
  lastYear: number | null
}

export interface FieldLandscapeRow {
  fieldKey: string
  field: string
  wholeRegisterAppointmentCount: number
  wholeRegisterShare: number
  selectionAppointmentCount: number
  selectionShare: number
  firstYear: number
  lastYear: number
  variants: FieldLabelVariant[]
}

export interface FieldAppointmentLandscape {
  wholeRegister: FieldLandscapeSummary
  selection: FieldLandscapeSummary
  rows: FieldLandscapeRow[]
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

export interface PresidentialEraProfile {
  presidentId: string
  presidentName: string
  from: string
  to: string | null
  leadingInstitutionId: string
  leadingInstitutionName: string
  cityCount: number
  institutionCount: number
  facultyCount: number
  topThreeShare: number
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

    const institution = institutionById.get(appointment.institutionId)
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
      (institution === undefined ||
        !institutionSearchText(institution).includes(normalizedQuery))
    ) {
      return false
    }

    return true
  })
}

export function filterAppointmentsExceptField(
  data: AtlasData,
  filters: FilterState,
): Appointment[] {
  return filterAppointments(data, { ...filters, field: null })
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

function fieldLandscapeSummary(
  records: readonly Appointment[],
  ranking: readonly FieldAppointmentRankingRow[],
): FieldLandscapeSummary {
  const leading = ranking[0]
  const topTenCount = ranking
    .slice(0, 10)
    .reduce((total, row) => total + row.appointmentCount, 0)
  let firstYear: number | null = null
  let lastYear: number | null = null
  for (const record of records) {
    const year = Number.parseInt(record.appointedOn.slice(0, 4), 10)
    firstYear = firstYear === null ? year : Math.min(firstYear, year)
    lastYear = lastYear === null ? year : Math.max(lastYear, year)
  }

  return {
    appointmentCount: records.length,
    distinctFieldCount: ranking.length,
    singletonFieldCount: ranking.filter(({ appointmentCount }) => appointmentCount === 1).length,
    leadingFieldKey: leading?.fieldKey ?? null,
    leadingField: leading?.field ?? null,
    leadingAppointmentCount: leading?.appointmentCount ?? 0,
    leadingShare: leading?.appointmentShare ?? 0,
    topTenCount,
    topTenShare: records.length === 0 ? 0 : topTenCount / records.length,
    firstYear,
    lastYear,
  }
}

export function fieldAppointmentLandscape(
  wholeRegisterRecords: readonly Appointment[],
  selectionRecords: readonly Appointment[],
  labels: Readonly<Record<string, string>>,
): FieldAppointmentLandscape {
  const wholeRanking = fieldAppointmentRanking(wholeRegisterRecords, labels)
  const selectionRanking = fieldAppointmentRanking(selectionRecords, labels)
  const wholeByKey = new Map(wholeRanking.map((row) => [row.fieldKey, row] as const))
  const selectionByKey = new Map(selectionRanking.map((row) => [row.fieldKey, row] as const))
  const selectionSummary = fieldLandscapeSummary(selectionRecords, selectionRanking)
  if (selectionSummary.leadingFieldKey !== null) {
    selectionSummary.leadingField =
      wholeByKey.get(selectionSummary.leadingFieldKey)?.field ?? selectionSummary.leadingField
  }

  return {
    wholeRegister: fieldLandscapeSummary(wholeRegisterRecords, wholeRanking),
    selection: selectionSummary,
    rows: wholeRanking.map((row) => {
      const selected = selectionByKey.get(row.fieldKey)
      return {
        fieldKey: row.fieldKey,
        field: row.field,
        wholeRegisterAppointmentCount: row.appointmentCount,
        wholeRegisterShare: row.appointmentShare,
        selectionAppointmentCount: selected?.appointmentCount ?? 0,
        selectionShare: selected?.appointmentShare ?? 0,
        firstYear: row.firstYear,
        lastYear: row.lastYear,
        variants: row.variants,
      }
    }),
  }
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
  affiliations: readonly Affiliation[],
): AcademicBreadth {
  const affiliationCities = cityByAffiliationId(affiliations)
  const institutionIds = new Set<string>()
  const cities = new Set<string>()
  const faculties = new Set<string>()

  for (const appointment of records) {
    institutionIds.add(appointment.institutionId)
    const city = affiliationCities.get(appointment.affiliationId)
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

export function presidentialEraProfiles(
  records: readonly Appointment[],
  institutions: readonly Institution[],
  affiliations: readonly Affiliation[],
  presidents: readonly President[],
): PresidentialEraProfile[] {
  const recordsByPresident = new Map<string, Appointment[]>()
  for (const appointment of records) {
    const eraRecords = recordsByPresident.get(appointment.presidentId)
    if (eraRecords === undefined) {
      recordsByPresident.set(appointment.presidentId, [appointment])
    } else {
      eraRecords.push(appointment)
    }
  }

  return [...presidents]
    .sort(
      (left, right) =>
        left.from.localeCompare(right.from) || left.id.localeCompare(right.id),
    )
    .flatMap((president) => {
      const eraRecords = recordsByPresident.get(president.id)
      if (eraRecords === undefined || eraRecords.length === 0) {
        return []
      }

      const breadth = academicBreadth(eraRecords, affiliations)
      const concentration = institutionConcentration(eraRecords, institutions)
      if (
        concentration.leadingInstitutionId === null ||
        concentration.leadingInstitutionName === null
      ) {
        return []
      }

      return [
        {
          presidentId: president.id,
          presidentName: president.name,
          from: president.from,
          to: president.to,
          leadingInstitutionId: concentration.leadingInstitutionId,
          leadingInstitutionName: concentration.leadingInstitutionName,
          cityCount: breadth.cityCount,
          institutionCount: breadth.institutionCount,
          facultyCount: breadth.facultyCount,
          topThreeShare: concentration.topThreeShare,
        },
      ]
    })
}
