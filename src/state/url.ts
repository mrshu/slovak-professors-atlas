import type { FilterOptions, FilterState, FilterValueKey } from './filters'

const FILTER_VALUE_KEYS: readonly FilterValueKey[] = [
  'presidentId',
  'city',
  'institutionId',
  'faculty',
  'field',
]

const OPTION_KEY_BY_FILTER: Record<
  FilterValueKey,
  'presidentIds' | 'cities' | 'institutionIds' | 'faculties' | 'fields'
> = {
  presidentId: 'presidentIds',
  city: 'cities',
  institutionId: 'institutionIds',
  faculty: 'faculties',
  field: 'fields',
}

function parseYear(value: string | null, minimum: number, maximum: number): number | null {
  if (value === null || !/^\d{4}$/.test(value)) {
    return null
  }

  const year = Number(value)
  return Number.isInteger(year) && year >= minimum && year <= maximum ? year : null
}

export function parseFilters(search: string | URLSearchParams, options: FilterOptions): FilterState {
  const params =
    search instanceof URLSearchParams
      ? search
      : new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  const { defaults } = options
  const parsed: FilterState = { ...defaults }
  const startYear = parseYear(params.get('startYear'), defaults.startYear, defaults.endYear)
  const endYear = parseYear(params.get('endYear'), defaults.startYear, defaults.endYear)

  if (startYear !== null) {
    parsed.startYear = startYear
  }
  if (endYear !== null) {
    parsed.endYear = endYear
  }
  if (parsed.startYear > parsed.endYear) {
    parsed.startYear = defaults.startYear
    parsed.endYear = defaults.endYear
  }

  for (const key of FILTER_VALUE_KEYS) {
    const value = params.get(key)
    if (
      value !== null &&
      value.trim().length > 0 &&
      options[OPTION_KEY_BY_FILTER[key]].includes(value)
    ) {
      parsed[key] = value
    }
  }

  const query = params.get('query')
  if (query !== null) {
    parsed.query = query
  }

  const selectedYear = parseYear(
    params.get('selectedYear'),
    defaults.startYear,
    defaults.endYear,
  )
  if (selectedYear !== null) {
    parsed.selectedYear = selectedYear
  }

  return parsed
}

export function serializeFilters(filters: FilterState, defaults: FilterState): string {
  const params = new URLSearchParams()

  if (filters.startYear !== defaults.startYear) {
    params.set('startYear', String(filters.startYear))
  }
  if (filters.endYear !== defaults.endYear) {
    params.set('endYear', String(filters.endYear))
  }
  for (const key of FILTER_VALUE_KEYS) {
    const value = filters[key]
    if (value !== defaults[key] && value !== null && value.trim().length > 0) {
      params.set(key, value)
    }
  }
  if (filters.query !== defaults.query) {
    params.set('query', filters.query)
  }
  if (filters.selectedYear !== defaults.selectedYear) {
    params.set('selectedYear', String(filters.selectedYear))
  }

  return params.toString()
}
