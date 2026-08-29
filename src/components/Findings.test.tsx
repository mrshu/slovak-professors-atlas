import { describe, expect, it } from 'vitest'

import type { Appointment, Institution } from '../data/types'
import { deriveHeadlineFindings } from './Findings'

const institutions: Institution[] = [
  {
    id: 'bratislava',
    shortName: 'BA',
    fullName: 'Bratislavská škola',
    city: 'Bratislava',
    latitude: 48.15,
    longitude: 17.11,
    sourceLabels: [],
    citationUrl: 'https://example.test/ba',
  },
  {
    id: 'kosice',
    shortName: 'KE',
    fullName: 'Košická škola',
    city: 'Košice',
    latitude: 48.72,
    longitude: 21.26,
    sourceLabels: [],
    citationUrl: 'https://example.test/ke',
  },
]

function appointment(
  id: string,
  appointedOn: string,
  field: string,
  institutionId: string,
): Appointment {
  return {
    id,
    name: id,
    titlesBefore: null,
    titlesAfter: null,
    faculty: null,
    institutionId,
    institutionSource: institutionId,
    field,
    appointedOn,
    presidentId: 'president',
    sourceVariants: [],
  }
}

describe('headline findings', () => {
  it('derives ceremony, city, and long-tail field structure from analytical records', () => {
    const facts = deriveHeadlineFindings(
      [
        appointment('a', '2024-01-01', 'Sociálna práca', 'bratislava'),
        appointment('b', '2024-01-01', 'sociálna práca', 'bratislava'),
        appointment('c', '2024-01-01', 'Fyzika', 'kosice'),
        appointment('d', '2024-02-01', 'História', 'bratislava'),
      ],
      institutions,
    )

    expect(facts.ceremony).toEqual({
      appointedOn: '2024-01-01',
      appointments: 3,
      median: 2,
      multipleOfMedian: 1.5,
    })
    expect(facts.bratislava).toEqual({ appointments: 3, total: 4, share: 0.75 })
    expect(facts.fields).toEqual({ count: 3, singletonCount: 2, topTenShare: 1 })
  })

  it('fails safely for an empty analytical dataset', () => {
    expect(deriveHeadlineFindings([], institutions)).toEqual({
      ceremony: { appointedOn: '', appointments: 0, median: 0, multipleOfMedian: 0 },
      bratislava: { appointments: 0, total: 0, share: 0 },
      fields: { count: 0, singletonCount: 0, topTenShare: 0 },
    })
  })
})
