import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { affiliation, appointment, city } from '../test/atlasFixture'
import SlovakiaMap, { sizeKeyValues } from './SlovakiaMap'

const geography = {
  type: 'Feature' as const,
  bbox: [16.8, 47.7, 22.6, 49.6] as [number, number, number, number],
  properties: {} as never,
  geometry: {
    type: 'Polygon' as const,
    coordinates: [[[16.8, 47.7], [22.6, 47.7], [22.6, 49.6], [16.8, 49.6], [16.8, 47.7]]],
  },
}

afterEach(() => {
  cleanup()
})

describe('sizeKeyValues', () => {
  it('derives three nice values from a large maximum, largest first', () => {
    expect(sizeKeyValues(820)).toEqual([800, 200, 50])
  })

  it('rounds a five-year-period maximum to one significant figure', () => {
    expect(sizeKeyValues(191)).toEqual([200, 50, 10])
  })

  it('keeps small maxima as unique whole numbers of at least one', () => {
    const values = sizeKeyValues(5)
    expect(values.every((value) => Number.isInteger(value) && value >= 1)).toBe(true)
    expect(new Set(values).size).toBe(values.length)
  })

  it('returns nothing for an empty selection', () => {
    expect(sizeKeyValues(0)).toEqual([])
  })
})

describe('SlovakiaMap', () => {
  const cities = [
    city({ name: 'Bratislava', latitude: 48.1486, longitude: 17.1077, affiliationIds: ['uniba-default'] }),
    city({ name: 'Košice', latitude: 48.7164, longitude: 21.2611, affiliationIds: ['tuke-default'] }),
  ]
  const affiliations = [
    affiliation(),
    affiliation({ id: 'tuke-default', institutionId: 'tuke', city: 'Košice' }),
  ]
  const records = [
    ...Array.from({ length: 11 }, () => appointment({ appointedOn: '2015-01-01' })),
    appointment({ appointedOn: '2015-01-01', affiliationId: 'tuke-default', institutionId: 'tuke' }),
  ]

  it('labels the largest cities up to the label limit', () => {
    render(
      <SlovakiaMap
        records={records}
        geography={geography}
        cities={cities}
        affiliations={affiliations}
        selectedCity={null}
        hoveredCity={null}
        onHoverCity={() => {}}
        onToggleCity={() => {}}
        labelLimit={1}
      />,
    )
    expect(screen.getByText('Bratislava · 11')).toBeInTheDocument()
    expect(screen.queryByText(/Košice ·/)).not.toBeInTheDocument()
  })

  it('keeps labelling the ranked cities when a filter leaves every count small', () => {
    render(
      <SlovakiaMap
        records={[appointment({ appointedOn: '2015-01-01' })]}
        geography={geography}
        cities={cities}
        affiliations={affiliations}
        selectedCity={null}
        hoveredCity={null}
        onHoverCity={() => {}}
        onToggleCity={() => {}}
        labelLimit={4}
      />,
    )
    expect(screen.getByText('Bratislava · 1')).toBeInTheDocument()
  })

  it('hides the size key when it is switched off', () => {
    const { container } = render(
      <SlovakiaMap
        records={records}
        geography={geography}
        cities={cities}
        affiliations={affiliations}
        selectedCity={null}
        hoveredCity={null}
        onHoverCity={() => {}}
        onToggleCity={() => {}}
        showSizeKey={false}
      />,
    )
    expect(container.querySelector('.slovakia-map__size-key')).toBeNull()
  })

  it('labels a city outside the ranking once it is selected', () => {
    render(
      <SlovakiaMap
        records={records}
        geography={geography}
        cities={cities}
        affiliations={affiliations}
        selectedCity="Košice"
        hoveredCity={null}
        onHoverCity={() => {}}
        onToggleCity={() => {}}
        labelLimit={1}
      />,
    )
    expect(screen.getByText('Košice · 1')).toBeInTheDocument()
  })

  it('marks the hovered city as hot', () => {
    render(
      <SlovakiaMap
        records={records}
        geography={geography}
        cities={cities}
        affiliations={affiliations}
        selectedCity={null}
        hoveredCity="Košice"
        onHoverCity={() => {}}
        onToggleCity={() => {}}
      />,
    )
    const bratislavaGroup = screen.getByTestId('city-mark-Bratislava').closest('.slovakia-map__city')
    const kosiceGroup = screen.getByTestId('city-mark-Košice').closest('.slovakia-map__city')

    expect(kosiceGroup).toHaveClass('is-hot')
    expect(bratislavaGroup).not.toHaveClass('is-hot')
    expect(bratislavaGroup).not.toHaveClass('is-dim')
    expect(kosiceGroup).not.toHaveClass('is-dim')
  })

  it('dims every city other than the selected one', () => {
    render(
      <SlovakiaMap
        records={records}
        geography={geography}
        cities={cities}
        affiliations={affiliations}
        selectedCity="Bratislava"
        hoveredCity={null}
        onHoverCity={() => {}}
        onToggleCity={() => {}}
      />,
    )
    const bratislavaGroup = screen.getByTestId('city-mark-Bratislava').closest('.slovakia-map__city')
    const kosiceGroup = screen.getByTestId('city-mark-Košice').closest('.slovakia-map__city')

    expect(kosiceGroup).toHaveClass('is-dim')
    expect(bratislavaGroup).not.toHaveClass('is-dim')
  })

  it('reports a hovered city from focus as well as from the pointer', () => {
    const onHoverCity = vi.fn()
    render(
      <SlovakiaMap
        records={records}
        geography={geography}
        cities={cities}
        affiliations={affiliations}
        selectedCity={null}
        hoveredCity={null}
        onHoverCity={onHoverCity}
        onToggleCity={() => {}}
      />,
    )
    const target = screen.getByRole('button', { name: /^Košice:/ })
    fireEvent.focus(target)
    expect(onHoverCity).toHaveBeenCalledWith('Košice')
    fireEvent.blur(target)
    expect(onHoverCity).toHaveBeenLastCalledWith(null)

    const group = screen.getByTestId('city-mark-Bratislava').closest('.slovakia-map__city')!
    fireEvent.pointerEnter(group)
    expect(onHoverCity).toHaveBeenLastCalledWith('Bratislava')
  })

  it('keeps a city without appointments hoverable instead of disabling it', () => {
    const onHoverCity = vi.fn()
    render(
      <SlovakiaMap
        records={[appointment({ appointedOn: '2015-01-01' })]}
        geography={geography}
        cities={cities}
        affiliations={affiliations}
        selectedCity={null}
        hoveredCity={null}
        onHoverCity={onHoverCity}
        onToggleCity={() => {}}
      />,
    )
    const empty = screen.getByTestId('city-mark-Košice')
    expect(empty).toHaveClass('slovakia-map__mark--empty')
    expect(screen.queryByRole('button', { name: /^Košice:/ })).not.toBeInTheDocument()
    fireEvent.pointerEnter(empty.closest('.slovakia-map__city')!)
    expect(onHoverCity).toHaveBeenCalledWith('Košice')
  })

  it('paints the largest city first so smaller circles keep their hit target', () => {
    const { container } = render(
      <SlovakiaMap
        records={records}
        geography={geography}
        cities={cities}
        affiliations={affiliations}
        selectedCity={null}
        hoveredCity={null}
        onHoverCity={() => {}}
        onToggleCity={() => {}}
      />,
    )
    const painted = Array.from(container.querySelectorAll('[data-testid^="city-mark-"]')).map(
      (mark) => mark.getAttribute('data-testid'),
    )
    expect(painted).toEqual(['city-mark-Bratislava', 'city-mark-Košice'])
  })

  it('labels the hovered city next to its mark even when it is outside the label limit', () => {
    const { container } = render(
      <SlovakiaMap
        records={records}
        geography={geography}
        cities={cities}
        affiliations={affiliations}
        selectedCity={null}
        hoveredCity="Košice"
        onHoverCity={() => {}}
        onToggleCity={() => {}}
        labelLimit={1}
      />,
    )
    const hot = container.querySelector('.slovakia-map__label--hot')!
    expect(hot).toHaveTextContent('Košice · 1')
    // Drawn in the overlay after every city, so a neighbouring circle cannot
    // cover it, and never twice.
    expect(hot.closest('.slovakia-map__hot-layer')).not.toBeNull()
    expect(container.querySelectorAll('.slovakia-map__label')).toHaveLength(2)
    const mark = container.querySelector('[data-testid="city-mark-Košice"]')!
    const ring = container.querySelector('.slovakia-map__hover-ring')!
    expect(ring.getAttribute('cx')).toBe(mark.getAttribute('cx'))
  })
})
