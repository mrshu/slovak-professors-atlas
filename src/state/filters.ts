import type { AtlasData } from '../data/types'

export interface FilterState {
  startYear: number
  endYear: number
  presidentId: string | null
  city: string | null
  institutionId: string | null
  faculty: string | null
  field: string | null
  query: string
  selectedYear: number
}

export type FilterValueKey =
  | 'presidentId'
  | 'city'
  | 'institutionId'
  | 'faculty'
  | 'field'

export type HistoryMode = 'push' | 'replace'

export interface FilterOptions {
  defaults: FilterState
  presidentIds: readonly string[]
  cities: readonly string[]
  institutionIds: readonly string[]
  faculties: readonly string[]
  fields: readonly string[]
}

const slovakCollator = new Intl.Collator('sk-SK')

function uniqueSorted(values: Iterable<string | null>): string[] {
  return Array.from(
    new Set(
      Array.from(values).filter(
        (value): value is string => value !== null && value.trim().length > 0,
      ),
    ),
  ).sort(slovakCollator.compare)
}

export function createFilterDefaults(data: AtlasData): FilterState {
  const startYear = Number.parseInt(data.meta.appointmentDateMin.slice(0, 4), 10)
  const endYear = Number.parseInt(data.meta.appointmentDateMax.slice(0, 4), 10)
  const contextYears = data.context
    .map(({ year }) => year)
    .filter((year) => year >= startYear && year <= endYear)
  const selectedYear = contextYears.length > 0 ? Math.max(...contextYears) : endYear

  return {
    startYear,
    endYear,
    presidentId: null,
    city: null,
    institutionId: null,
    faculty: null,
    field: null,
    query: '',
    selectedYear,
  }
}

export function createFilterOptions(data: AtlasData): FilterOptions {
  return {
    defaults: createFilterDefaults(data),
    presidentIds: uniqueSorted(data.presidents.map(({ id }) => id)),
    cities: uniqueSorted(data.cities.map(({ name }) => name)),
    institutionIds: uniqueSorted(data.institutions.map(({ id }) => id)),
    faculties: uniqueSorted(data.records.map(({ faculty }) => faculty)),
    fields: uniqueSorted(data.records.map(({ field }) => field)),
  }
}
