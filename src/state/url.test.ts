import { describe, expect, it } from 'vitest'

import type { FilterOptions, FilterState } from './filters'
import { parseFilters, serializeFilters } from './url'

const defaults: FilterState = {
  startYear: 2000,
  endYear: 2026,
  presidentId: null,
  city: null,
  institutionId: null,
  faculty: null,
  field: null,
  appointedOn: null,
  query: '',
  selectedYear: 2025,
}

const options: FilterOptions = {
  defaults,
  presidentIds: ['caputova', 'kiska'],
  cities: ['Bratislava', 'Košice'],
  institutionIds: ['tuke', 'uniba'],
  faculties: ['Lekárska fakulta', 'Strojnícka fakulta'],
  fields: ['hudobné umenie', 'vnútorné lekárstvo'],
  appointmentDates: ['2011-01-24', '2023-05-12'],
}

describe('atlas URL filters', () => {
  it('serializes valid values in stable key order and parses them losslessly', () => {
    const filters: FilterState = {
      startYear: 2004,
      endYear: 2024,
      presidentId: 'caputova',
      city: 'Bratislava',
      institutionId: 'uniba',
      faculty: 'Lekárska fakulta',
      field: 'vnútorné lekárstvo',
      appointedOn: '2011-01-24',
      query: '  Caputova  ',
      selectedYear: 2023,
    }

    const search = serializeFilters(filters, defaults)

    expect(Array.from(new URLSearchParams(search).entries())).toEqual([
      ['startYear', '2004'],
      ['endYear', '2024'],
      ['presidentId', 'caputova'],
      ['city', 'Bratislava'],
      ['institutionId', 'uniba'],
      ['faculty', 'Lekárska fakulta'],
      ['field', 'vnútorné lekárstvo'],
      ['appointedOn', '2011-01-24'],
      ['query', '  Caputova  '],
      ['selectedYear', '2023'],
    ])
    expect(parseFilters(`?${search}`, options)).toEqual(filters)
  })

  it('omits every default value', () => {
    expect(serializeFilters(defaults, defaults)).toBe('')
    expect(parseFilters('', options)).toEqual(defaults)
  })

  it('ignores unknown IDs, labels, malformed years, and inverted date bounds', () => {
    const parsed = parseFilters(
      '?startYear=2024&endYear=2004&presidentId=invalid&city=Žilina&institutionId=bad&faculty=bad&field=bad&appointedOn=bad&selectedYear=1999&query=Novak&unknown=value',
      options,
    )

    expect(parsed).toEqual({ ...defaults, query: 'Novak' })
    expect(serializeFilters(parsed, defaults)).toBe('query=Novak')
  })

  it('keeps a valid dimension when another URL value is invalid', () => {
    expect(parseFilters('?startYear=2001&endYear=nope&city=Košice', options)).toEqual({
      ...defaults,
      startYear: 2001,
      city: 'Košice',
    })
  })

  it('discards blank optional values instead of persisting an active faculty filter', () => {
    const optionsWithBlankFaculties: FilterOptions = {
      ...options,
      faculties: ['', '   ', ...options.faculties],
    }

    expect(parseFilters('?faculty=', optionsWithBlankFaculties)).toEqual(defaults)
    expect(parseFilters('?faculty=+++', optionsWithBlankFaculties)).toEqual(defaults)
    expect(serializeFilters({ ...defaults, faculty: '' }, defaults)).toBe('')
    expect(serializeFilters({ ...defaults, faculty: '   ' }, defaults)).toBe('')
  })
})
