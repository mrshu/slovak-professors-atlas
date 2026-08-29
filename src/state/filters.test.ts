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
    { faculty: 'Lekárska fakulta', field: 'Vnútorné lekárstvo', appointedOn: '2011-01-24' },
    { faculty: null, field: 'hudobné umenie', appointedOn: '2025-01-01' },
    { faculty: '', field: 'HUDOBNÉ   UMENIE', appointedOn: '2025-01-01' },
    { faculty: '   ', field: ' hudobne umenie ', appointedOn: '2025-02-01' },
    { faculty: 'Lekárska fakulta', field: 'vnútorNÉ lekárstvo', appointedOn: '2011-01-24' },
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
      appointedOn: null,
      query: '',
      selectedYear: 2025,
    })
  })

  it('derives unique valid URL values and stable normalized field keys', () => {
    expect(createFilterOptions(data)).toEqual({
      defaults: createFilterDefaults(data),
      presidentIds: ['caputova', 'kiska'],
      cities: ['Bratislava', 'Košice'],
      institutionIds: ['tuke', 'uniba'],
      faculties: ['Lekárska fakulta'],
      fields: ['hudobne umenie', 'vnutorne lekarstvo'],
      appointmentDates: ['2011-01-24', '2025-01-01', '2025-02-01'],
    })
  })
})
