import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Appointment, AtlasData } from '../data/types'
import { useAtlasState } from './useAtlasState'

function record(id: string, institutionId: string, field = 'Vnútorné lekárstvo'): Appointment {
  return {
    id,
    name: id === 'one' ? 'Zuzana Čaputová' : 'Ján Novák',
    titlesBefore: null,
    titlesAfter: null,
    faculty: 'Lekárska fakulta',
    institutionId,
    affiliationId: `${institutionId}-default`,
    institutionSource: institutionId === 'uniba' ? 'UK v Bratislave' : 'TU v Košiciach',
    field,
    appointedOn: id === 'one' ? '2011-01-24' : '2023-05-12',
    presidentId: 'caputova',
    sourceVariants: [],
  }
}

const data = {
  meta: {
    appointmentDateMin: '2000-02-22',
    appointmentDateMax: '2026-06-03',
  },
  context: [{ year: 2000 }, { year: 2025 }],
  presidents: [{ id: 'caputova' }],
  cities: [
    {
      name: 'Bratislava',
      latitude: 48.1486,
      longitude: 17.1077,
      affiliationIds: ['uniba-default'],
    },
    {
      name: 'Košice',
      latitude: 48.7164,
      longitude: 21.2611,
      affiliationIds: ['tuke-default'],
    },
  ],
  institutions: [{ id: 'uniba' }, { id: 'tuke' }],
  affiliations: [
    {
      id: 'uniba-default',
      institutionId: 'uniba',
      facultyKeys: [],
      status: 'resolved',
      city: 'Bratislava',
      sourceUrl: 'https://example.test/uniba',
      sourceLabel: 'UK',
      note: null,
    },
    {
      id: 'tuke-default',
      institutionId: 'tuke',
      facultyKeys: [],
      status: 'resolved',
      city: 'Košice',
      sourceUrl: 'https://example.test/tuke',
      sourceLabel: 'TUKE',
      note: null,
    },
  ],
  records: [
    record('one', 'uniba'),
    record('two', 'tuke', 'vnútorNÉ   lekárstvo'),
    record('three', 'tuke', 'história'),
  ],
} as unknown as AtlasData

const basePath = '/slovak-professors/index.html'

beforeEach(() => {
  window.history.replaceState(null, '', basePath)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  window.history.replaceState(null, '', basePath)
})

describe('useAtlasState', () => {
  it('pushes click/select actions and replaces free-text query history', () => {
    const pushState = vi.spyOn(window.history, 'pushState')
    const replaceState = vi.spyOn(window.history, 'replaceState')
    const { result } = renderHook(() => useAtlasState(data))

    act(() => result.current.setFilter('city', 'Bratislava'))

    expect(pushState).toHaveBeenCalledTimes(1)
    expect(window.location.search).toBe('?city=Bratislava')
    expect(result.current.filteredRecords.map(({ id }) => id)).toEqual(['one'])

    act(() => result.current.setQuery('Caputova'))

    expect(replaceState).toHaveBeenCalledTimes(1)
    expect(window.location.search).toBe('?city=Bratislava&query=Caputova')
    expect(result.current.filters.query).toBe('Caputova')
  })

  it('loads a normalized field deep link and applies it across raw-label variants', () => {
    window.history.replaceState(null, '', `${basePath}?field=vnutorne+lekarstvo`)
    const { result } = renderHook(() => useAtlasState(data))

    expect(result.current.filters.field).toBe('vnutorne lekarstvo')
    expect(result.current.filteredRecords.map(({ id }) => id)).toEqual(['one', 'two'])
    expect(window.location.search).toBe('?field=vnutorne+lekarstvo')
  })

  it('pushes an exact ceremony date and restores it through Back and Forward', async () => {
    const { result } = renderHook(() => useAtlasState(data))

    act(() => result.current.setAppointmentDate('2011-01-24'))

    expect(result.current.filters).toMatchObject({
      appointedOn: '2011-01-24',
      selectedYear: 2011,
    })
    expect(result.current.filteredRecords.map(({ id }) => id)).toEqual(['one'])
    expect(window.location.search).toBe('?appointedOn=2011-01-24&selectedYear=2011')

    act(() => window.history.back())
    await waitFor(() => expect(result.current.filters.appointedOn).toBeNull())
    expect(result.current.filteredRecords).toHaveLength(3)

    act(() => window.history.forward())
    await waitFor(() => expect(result.current.filters.appointedOn).toBe('2011-01-24'))
    expect(result.current.filteredRecords.map(({ id }) => id)).toEqual(['one'])
  })

  it('keeps context highlighting independent and applies timeline years atomically', () => {
    const { result } = renderHook(() => useAtlasState(data))

    act(() => result.current.setSelectedYear(2010, 'push'))
    expect(result.current.filters).toMatchObject({
      startYear: 2000,
      endYear: 2026,
      selectedYear: 2010,
    })

    act(() => result.current.setTimelineYear(2023))
    expect(result.current.filters).toMatchObject({
      startYear: 2023,
      endYear: 2023,
      selectedYear: 2023,
    })
    expect(Array.from(new URLSearchParams(window.location.search).entries())).toEqual([
      ['startYear', '2023'],
      ['endYear', '2023'],
      ['selectedYear', '2023'],
    ])

    act(() => result.current.setTimelineYear(null))
    expect(result.current.filters).toMatchObject({
      startYear: 2000,
      endYear: 2026,
      selectedYear: 2010,
    })
  })

  it('parses direct URLs, ignores invalid values, and removes them on the next state write', () => {
    window.history.replaceState(
      null,
      '',
      `${basePath}?city=Bratislava&presidentId=invalid&selectedYear=2012&junk=x`,
    )
    const { result } = renderHook(() => useAtlasState(data))

    expect(result.current.filters).toMatchObject({
      city: 'Bratislava',
      presidentId: null,
      selectedYear: 2012,
    })

    act(() => result.current.setQuery('Čaputová'))

    expect(window.location.search).toBe(
      '?city=Bratislava&query=%C4%8Caputov%C3%A1&selectedYear=2012',
    )
  })

  it('restores exact filter state through browser Back and Forward', async () => {
    const { result } = renderHook(() => useAtlasState(data))

    act(() => result.current.setFilter('city', 'Bratislava'))
    act(() => result.current.setFilter('city', 'Košice'))
    expect(result.current.filters.city).toBe('Košice')

    act(() => window.history.back())
    await waitFor(() => expect(result.current.filters.city).toBe('Bratislava'))
    expect(window.location.search).toBe('?city=Bratislava')

    act(() => window.history.forward())
    await waitFor(() => expect(result.current.filters.city).toBe('Košice'))
    expect(window.location.search).toBe('?city=Ko%C5%A1ice')
  })

  it('restores normalized field facets through Back and Forward', async () => {
    const { result } = renderHook(() => useAtlasState(data))

    act(() => result.current.setFilter('field', 'vnutorne lekarstvo'))
    act(() => result.current.setFilter('field', 'historia'))
    expect(result.current.filteredRecords.map(({ id }) => id)).toEqual(['three'])

    act(() => window.history.back())
    await waitFor(() => expect(result.current.filters.field).toBe('vnutorne lekarstvo'))
    expect(result.current.filteredRecords.map(({ id }) => id)).toEqual(['one', 'two'])

    act(() => window.history.forward())
    await waitFor(() => expect(result.current.filters.field).toBe('historia'))
    expect(window.location.search).toBe('?field=historia')
  })

  it('clears the field facet with the shared reset action', () => {
    window.history.replaceState(null, '', `${basePath}?field=historia`)
    const { result } = renderHook(() => useAtlasState(data))

    act(() => result.current.resetFilters())

    expect(result.current.filters.field).toBeNull()
    expect(result.current.filteredRecords).toHaveLength(3)
    expect(window.location.search).toBe('')
  })

  it('restores state whenever the browser emits popstate', () => {
    const { result } = renderHook(() => useAtlasState(data))
    window.history.replaceState(null, '', `${basePath}?city=Ko%C5%A1ice&selectedYear=2011`)

    act(() => window.dispatchEvent(new PopStateEvent('popstate')))

    expect(result.current.filters).toMatchObject({ city: 'Košice', selectedYear: 2011 })
  })
})
