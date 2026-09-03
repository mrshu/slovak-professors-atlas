import type { AtlasData } from '../data/types'
import { formatDate } from '../utils/format'
import type { AtlasState } from './useAtlasState'

export interface ActiveFilterChip {
  key: string
  label: string
  remove: () => void
}

/**
 * Every filter narrowing the atlas, as removable chips. One source of truth so
 * the map stage and the register cannot disagree about what is selected: a
 * shared link such as ?field=… otherwise filters the map with nothing on
 * screen to say so.
 */
export function activeFilterChips(data: AtlasData, atlasState: AtlasState): ActiveFilterChip[] {
  const { filters, defaults, options, setFilter, setQuery, setTimelineYear, setAppointmentDate } =
    atlasState
  const chips: ActiveFilterChip[] = []

  if (filters.startYear !== defaults.startYear || filters.endYear !== defaults.endYear) {
    chips.push({
      key: 'date',
      label:
        filters.startYear === filters.endYear
          ? `Rok: ${filters.startYear}`
          : `Obdobie: ${filters.startYear}—${filters.endYear}`,
      remove: () => setTimelineYear(null, 'push'),
    })
  }
  if (filters.appointedOn !== null) {
    chips.push({
      key: 'appointment-date',
      label: `Ceremoniál: ${formatDate(filters.appointedOn)}`,
      remove: () => setAppointmentDate(null, 'push'),
    })
  }
  if (filters.presidentId !== null) {
    const president = data.presidents.find(({ id }) => id === filters.presidentId)
    chips.push({
      key: 'president',
      label: `Prezident: ${president?.name ?? filters.presidentId}`,
      remove: () => setFilter('presidentId', null, 'push'),
    })
  }
  if (filters.city !== null) {
    chips.push({
      key: 'city',
      label: `Mesto: ${filters.city}`,
      remove: () => setFilter('city', null, 'push'),
    })
  }
  if (filters.institutionId !== null) {
    const institution = data.institutions.find(({ id }) => id === filters.institutionId)
    chips.push({
      key: 'institution',
      label: `Inštitúcia: ${institution?.shortName ?? filters.institutionId}`,
      remove: () => setFilter('institutionId', null, 'push'),
    })
  }
  if (filters.faculty !== null) {
    chips.push({
      key: 'faculty',
      label: `Fakulta: ${filters.faculty}`,
      remove: () => setFilter('faculty', null, 'push'),
    })
  }
  if (filters.field !== null) {
    chips.push({
      key: 'field',
      label: `Odbor: ${
        options.fields.find(({ key }) => key === filters.field)?.canonicalLabel ??
        data.fieldCatalog.labels[filters.field] ??
        filters.field
      }`,
      remove: () => setFilter('field', null, 'push'),
    })
  }
  if (filters.query.length > 0) {
    chips.push({
      key: 'query',
      label: `Hľadanie: ${filters.query}`,
      remove: () => setQuery(''),
    })
  }

  return chips
}
