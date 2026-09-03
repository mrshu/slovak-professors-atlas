import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { AtlasState } from '../state/useAtlasState'
import { affiliation, appointment, city, institution } from '../test/atlasFixture'
import MapStage from './MapStage'

const data = {
  records: [
    appointment({ appointedOn: '2001-05-17' }),
    appointment({ appointedOn: '2011-01-24' }),
    appointment({ appointedOn: '2011-01-24', affiliationId: 'tuke-default', institutionId: 'tuke' }),
  ],
  affiliations: [
    affiliation(),
    affiliation({ id: 'tuke-default', institutionId: 'tuke', city: 'Košice' }),
  ],
  cities: [
    city(),
    city({ name: 'Košice', latitude: 48.7164, longitude: 21.2611, affiliationIds: ['tuke-default'] }),
  ],
  institutions: [
    institution(),
    institution({ id: 'tuke', shortName: 'TU v Košiciach', fullName: 'Technická univerzita v Košiciach' }),
  ],
  geography: {
    type: 'Feature' as const,
    bbox: [16.8, 47.7, 22.6, 49.6] as [number, number, number, number],
    properties: {} as never,
    geometry: {
      type: 'Polygon' as const,
      coordinates: [[[16.8, 47.7], [22.6, 47.7], [22.6, 49.6], [16.8, 49.6], [16.8, 47.7]]],
    },
  },
}

function atlasState(overrides: Partial<AtlasState['filters']> = {}): AtlasState {
  const defaults = {
    startYear: 2000, endYear: 2026, fieldStartYear: 2009, fieldEndYear: 2025,
    presidentId: null, city: null, institutionId: null, faculty: null, field: null,
    appointedOn: null, query: '', selectedYear: 2025,
  }
  const filters = { ...defaults, ...overrides }
  return {
    filters,
    defaults,
    options: {} as never,
    filteredRecords: data.records.filter((record) => {
      const year = Number(record.appointedOn.slice(0, 4))
      return year >= filters.startYear && year <= filters.endYear
    }),
    setFilter: vi.fn(),
    setExclusiveFilter: vi.fn(),
    setDateRange: vi.fn(),
    setFieldEducationRange: vi.fn(),
    setSelectedYear: vi.fn(),
    setTimelineYear: vi.fn(),
    setAppointmentDate: vi.fn(),
    setQuery: vi.fn(),
    resetFilters: vi.fn(),
  }
}

afterEach(() => {
  cleanup()
})

describe('MapStage', () => {
  it('offers the five periods plus the whole range and presses the active one', () => {
    const state = atlasState({ startYear: 2010, endYear: 2014 })
    render(<MapStage data={data as never} atlasState={state} />)
    const group = screen.getByRole('group', { name: 'Obdobie' })
    const buttons = within(group).getAllByRole('button')
    expect(buttons.map((button) => button.textContent)).toEqual([
      '2000–2004', '2005–2009', '2010–2014', '2015–2019', '2020–2024', 'Celé obdobie',
    ])
    expect(buttons[2]).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(buttons[0]!)
    expect(state.setDateRange).toHaveBeenCalledWith(2000, 2004, 'push')
    fireEvent.click(buttons[5]!)
    expect(state.setDateRange).toHaveBeenCalledWith(2000, 2026, 'push')
    expect(screen.getByRole('heading', { name: 'Mapa pracovísk, 2010–2014' })).toBeVisible()
  })

  it('lists strip cells for the active selection and toggles the city filter', () => {
    const state = atlasState({ startYear: 2010, endYear: 2014 })
    render(<MapStage data={data as never} atlasState={state} />)
    const strip = screen.getByRole('group', { name: 'Podiel miest v aktívnom výbere' })
    fireEvent.click(within(strip).getByRole('button', { name: /^Košice: 50,0 %/ }))
    expect(state.setFilter).toHaveBeenCalledWith('city', 'Košice', 'push')
  })

  it('keeps the city strip comparable across cities while a city is selected', () => {
    const state = atlasState({ startYear: 2010, endYear: 2014, city: 'Bratislava' })
    render(<MapStage data={data as never} atlasState={state} />)
    const strip = screen.getByRole('group', { name: 'Podiel miest v aktívnom výbere' })
    const cells = within(strip).getAllByRole('button')
    expect(cells.map((cell) => cell.textContent)).toEqual(
      expect.arrayContaining([expect.stringContaining('Bratislava'), expect.stringContaining('Košice')]),
    )
    expect(
      within(strip).getByRole('button', { name: /^Košice: 50,0 %/ }),
    ).toBeInTheDocument()
  })

  it('shows no delta comparison for the whole period', () => {
    render(<MapStage data={data as never} atlasState={atlasState()} />)
    const strip = screen.getByRole('group', { name: 'Podiel miest v aktívnom výbere' })
    for (const cell of within(strip).getAllByRole('button')) {
      expect(cell).toHaveTextContent('—')
    }
  })

  it('keeps the institution ranking in a closed fold', () => {
    render(<MapStage data={data as never} atlasState={atlasState()} />)
    const fold = screen.getByText('Inštitúcie v aktívnom výbere').closest('details')
    expect(fold).not.toHaveAttribute('open')
  })

  it('shows a selection bar with a clear control while a city is selected', () => {
    const state = atlasState({ city: 'Bratislava' })
    render(<MapStage data={data as never} atlasState={state} />)
    const bar = screen.getByRole('status')
    expect(bar).toHaveTextContent('Vybrané mesto: Bratislava')
    fireEvent.click(within(bar).getByRole('button', { name: 'Zrušiť výber' }))
    expect(state.setFilter).toHaveBeenCalledWith('city', null, 'push')
    fireEvent.keyDown(screen.getByRole('region', { name: /Mapa pracovísk/ }), { key: 'Escape' })
    expect(state.setFilter).toHaveBeenCalledTimes(2)
    expect(
      screen.getByRole('button', { name: /^Bratislava: .*zrušiť výber$/ }),
    ).toHaveAttribute('aria-pressed', 'true')
  })
})
