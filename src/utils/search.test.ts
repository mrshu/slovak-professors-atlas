import { describe, expect, it } from 'vitest'

import type { Appointment } from '../data/types'
import { createSearchMatcher } from './search'

const appointment: Appointment = {
  id: 'record-1',
  name: 'Zuzana Čaputová',
  titlesBefore: 'doc. Mgr.',
  titlesAfter: 'PhD.',
  faculty: 'Lekárska fakulta',
  institutionId: 'uniba',
  affiliationId: 'uniba-default',
  institutionSource: 'Univerzita Komenského v Bratislave',
  field: 'vnútorné lekárstvo',
  fieldKey: 'vnutorne lekarstvo',
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

describe('createSearchMatcher', () => {
  it.each([
    'Caputova',
    'čaputová',
    'ZUZANA CAPUTOVA',
    'lekarska fakulta',
    'vnutorne lekarstvo',
    'univerzita komenskeho',
  ])('matches Slovak display values without requiring accents or case for %s', (query) => {
    expect(createSearchMatcher(query)(appointment)).toBe(true)
  })

  it('treats an empty or whitespace-only query as no search filter', () => {
    expect(createSearchMatcher('')(appointment)).toBe(true)
    expect(createSearchMatcher('   ')(appointment)).toBe(true)
  })

  it('does not alter Slovak source text while matching normalized text', () => {
    const before = structuredClone(appointment)

    expect(createSearchMatcher('Caputova')(appointment)).toBe(true)
    expect(appointment).toEqual(before)
    expect(appointment.name).toBe('Zuzana Čaputová')
  })
})
