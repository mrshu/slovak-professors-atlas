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
  fieldCatalog: {
    schemaVersion: 1,
    aliases: [],
    labels: {
      'vnutorne lekarstvo': 'Vnútorné lekárstvo',
      'hudobne umenie': 'hudobné umenie',
    },
  },
  records: [
    { faculty: 'Lekárska fakulta', field: 'Vnútorné lekárstvo', fieldKey: 'vnutorne lekarstvo', appointedOn: '2011-01-24', sourceVariants: [] },
    { faculty: null, field: 'hudobné umenie', fieldKey: 'hudobne umenie', appointedOn: '2025-01-01', sourceVariants: [] },
    { faculty: '', field: 'HUDOBNÉ   UMENIE', fieldKey: 'hudobne umenie', appointedOn: '2025-01-01', sourceVariants: [] },
    { faculty: '   ', field: ' hudobne umenie ', fieldKey: 'hudobne umenie', appointedOn: '2025-02-01', sourceVariants: [] },
    { faculty: 'Lekárska fakulta', field: 'vnútorNÉ lekárstvo', fieldKey: 'vnutorne lekarstvo', appointedOn: '2011-01-24', sourceVariants: [] },
    { faculty: null, field: 'hudobné umenie', fieldKey: 'hudobne umenie', appointedOn: '2025-01-01', sourceVariants: [] },
    { faculty: null, field: 'Vnútorné lekárstvo', fieldKey: 'vnutorne lekarstvo', appointedOn: '2011-01-24', sourceVariants: [] },
  ],
} as unknown as AtlasData

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
      fieldKeys: ['hudobne umenie', 'vnutorne lekarstvo'],
      fields: [
        { key: 'hudobne umenie', canonicalLabel: 'hudobné umenie' },
        { key: 'vnutorne lekarstvo', canonicalLabel: 'Vnútorné lekárstvo' },
      ],
      appointmentDates: ['2011-01-24', '2025-01-01', '2025-02-01'],
    })
  })
})
