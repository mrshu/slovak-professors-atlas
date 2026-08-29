import { describe, expect, it } from 'vitest'

import type { Appointment } from '../data/types'
import { matchesSearch } from './search'

const appointment: Appointment = {
  id: 'record-1',
  name: 'Zuzana Čaputová',
  titlesBefore: 'doc. Mgr.',
  titlesAfter: 'PhD.',
  faculty: 'Lekárska fakulta',
  institutionId: 'uniba',
  institutionSource: 'Univerzita Komenského v Bratislave',
  field: 'vnútorné lekárstvo',
  appointedOn: '2023-01-01',
  presidentId: 'caputova',
  sourceVariants: [
    {
      rowNumber: 42,
      titlesBefore: 'doc. Mgr.',
      titlesAfter: 'PhD.',
      faculty: 'Lekárska fakulta',
      institution: 'Univerzita Komenského v Bratislave',
      field: 'vnútorné lekárstvo',
    },
  ],
}

describe('matchesSearch', () => {
  it.each([
    'Caputova',
    'čaputová',
    'ZUZANA CAPUTOVA',
    'lekarska fakulta',
    'vnutorne lekarstvo',
    'univerzita komenskeho',
  ])('matches Slovak display values without requiring accents or case for %s', (query) => {
    expect(matchesSearch(appointment, query)).toBe(true)
  })

  it('treats an empty or whitespace-only query as no search filter', () => {
    expect(matchesSearch(appointment, '')).toBe(true)
    expect(matchesSearch(appointment, '   ')).toBe(true)
  })

  it('does not alter Slovak source text while matching normalized text', () => {
    const before = structuredClone(appointment)

    expect(matchesSearch(appointment, 'Caputova')).toBe(true)
    expect(appointment).toEqual(before)
    expect(appointment.name).toBe('Zuzana Čaputová')
  })
})
