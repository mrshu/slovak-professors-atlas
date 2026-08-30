import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { Affiliation, Appointment, President } from '../data/types'
import { normalizeForSearch } from '../utils/search'
import Findings, { deriveHeadlineFindings } from './Findings'

const affiliations: Affiliation[] = [
  {
    id: 'bratislava-aff',
    institutionId: 'bratislava',
    facultyKeys: [],
    status: 'resolved',
    city: 'Bratislava',
    sourceUrl: 'https://example.test/ba',
    sourceLabel: 'Bratislavské pracovisko',
    note: null,
  },
  {
    id: 'kosice-aff',
    institutionId: 'kosice',
    facultyKeys: [],
    status: 'resolved',
    city: 'Košice',
    sourceUrl: 'https://example.test/ke',
    sourceLabel: 'Košické pracovisko',
    note: null,
  },
  {
    id: 'unresolved-aff',
    institutionId: 'unresolved',
    facultyKeys: [],
    status: 'unresolved',
    city: null,
    sourceUrl: 'https://example.test/unresolved',
    sourceLabel: 'Nevyriešené pracovisko',
    note: 'Mesto nemožno spoľahlivo určiť.',
  },
]
const presidents: President[] = [
  {
    id: 'president',
    name: 'Ivan Gašparovič',
    from: '2004-06-15',
    to: '2014-06-15',
    citationUrl: 'https://example.test/president',
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
    affiliationId: `${institutionId}-aff`,
    institutionSource: institutionId,
    field,
    fieldKey: normalizeForSearch(field),
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
      affiliations,
    )

    expect(facts.ceremony).toEqual({
      appointedOn: '2024-01-01',
      appointments: 3,
      median: 2,
      presidentId: 'president',
      multipleOfMedian: 1.5,
    })
    expect(facts.bratislava).toEqual({
      appointments: 3,
      locatedAppointments: 4,
      unresolvedAppointments: 0,
      share: 0.75,
    })
    expect(facts.fields).toEqual({ count: 3, singletonCount: 2, topTenShare: 1 })
  })
  it('calculates the Bratislava share only from resolved workplace locations', () => {
    const facts = deriveHeadlineFindings(
      [
        appointment('a', '2024-01-01', 'História', 'bratislava'),
        appointment('b', '2024-01-01', 'Fyzika', 'kosice'),
        appointment('c', '2024-02-01', 'Právo', 'unresolved'),
      ],
      affiliations,
    )

    expect(facts.bratislava).toEqual({
      appointments: 1,
      locatedAppointments: 2,
      unresolvedAppointments: 1,
      share: 0.5,
    })
  })


  it('fails safely for an empty analytical dataset', () => {
    expect(deriveHeadlineFindings([], affiliations)).toEqual({
      ceremony: {
        appointedOn: '',
        appointments: 0,
        median: 0,
        multipleOfMedian: 0,
        presidentId: null,
      },
      bratislava: {
        appointments: 0,
        locatedAppointments: 0,
        unresolvedAppointments: 0,
        share: 0,
      },
      fields: { count: 0, singletonCount: 0, topTenShare: 0 },
    })
  })

  it('names the signing president and opens each relevant view with one action', () => {
    const onCeremonySelect = vi.fn()
    const onCitySelect = vi.fn()
    render(
      <Findings
        records={[
          appointment('a', '2011-01-24', 'História', 'bratislava'),
          appointment('b', '2011-01-24', 'Fyzika', 'bratislava'),
        ]}
        affiliations={affiliations}
        presidents={presidents}
        onCeremonySelect={onCeremonySelect}
        onCitySelect={onCitySelect}
      />,
    )

    expect(screen.getByText(/prezident Ivan Gašparovič/i)).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: /otvoriť ceremoniál/i }))
    expect(onCeremonySelect).toHaveBeenCalledWith('2011-01-24')
    fireEvent.click(screen.getByRole('button', { name: /zobraziť Bratislavu/i }))
    expect(onCitySelect).toHaveBeenCalledWith('Bratislava')
    expect(screen.getByRole('link', { name: /preskúmať odbory/i })).toHaveAttribute(
      'href',
      '#odbory-absolventi',
    )
  })
})
