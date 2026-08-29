import { describe, expect, it } from 'vitest'

import type { AtlasData } from '../data/types'
import { createFilterDefaults, createFilterOptions } from './filters'

const data = {
  meta: {
    appointmentDateMin: '2000-02-22',
    appointmentDateMax: '2026-06-03',
  },
  context: [{ year: 2000 }, { year: 2025 }],
  presidents: [{ id: 'caputova' }, { id: 'kiska' }],
  cities: [{ name: 'Bratislava' }, { name: 'Košice' }],
  institutions: [{ id: 'uniba' }, { id: 'tuke' }],
  records: [
    { faculty: 'Lekárska fakulta', field: 'vnútorné lekárstvo' },
    { faculty: null, field: 'hudobné umenie' },
    { faculty: 'Lekárska fakulta', field: 'vnútorné lekárstvo' },
  ],
} as AtlasData

describe('filter state metadata', () => {
  it('uses payload coverage bounds and the latest complete context year as defaults', () => {
    expect(createFilterDefaults(data)).toEqual({
      startYear: 2000,
      endYear: 2026,
      presidentId: null,
      city: null,
      institutionId: null,
      faculty: null,
      field: null,
      query: '',
      selectedYear: 2025,
    })
  })

  it('derives unique valid URL values without inventing a missing faculty label', () => {
    expect(createFilterOptions(data)).toEqual({
      defaults: createFilterDefaults(data),
      presidentIds: ['caputova', 'kiska'],
      cities: ['Bratislava', 'Košice'],
      institutionIds: ['tuke', 'uniba'],
      faculties: ['Lekárska fakulta'],
      fields: ['hudobné umenie', 'vnútorné lekárstvo'],
    })
  })
})
