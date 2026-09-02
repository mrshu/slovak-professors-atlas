import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import CityStrip from './CityStrip'

const cells = [
  { city: 'Bratislava', share: 0.425, delta: 12.6, series: [0.3, 0.35, 0.43, 0.39, 0.32] },
  { city: 'Košice', share: 0.149, delta: -4.3, series: [0.19, 0.17, 0.14, 0.14, 0.19] },
]

describe('CityStrip', () => {
  it('renders one button per city with share, delta and a sparkline', () => {
    const onSelect = vi.fn()
    render(
      <CityStrip
        cells={cells}
        activeIndex={2}
        selectedCity={null}
        hoveredCity={null}
        onSelect={onSelect}
        onHover={() => {}}
      />,
    )
    const bratislava = screen.getByRole('button', {
      name: /Bratislava: 42,5 %, zmena \+12,6 bodu/,
    })
    expect(bratislava).toHaveAttribute('aria-pressed', 'false')
    expect(bratislava.querySelector('svg circle.city-strip__now')).not.toBeNull()
    fireEvent.click(bratislava)
    expect(onSelect).toHaveBeenCalledWith('Bratislava')
  })

  it('marks the selected city and shows an em dash when there is no delta', () => {
    render(
      <CityStrip
        cells={[{ ...cells[1]!, delta: null }]}
        activeIndex={0}
        selectedCity="Košice"
        hoveredCity={null}
        onSelect={() => {}}
        onHover={() => {}}
      />,
    )
    const kosice = screen.getByRole('button', { name: /Košice: 14,9 %, bez porovnania/ })
    expect(kosice).toHaveAttribute('aria-pressed', 'true')
    expect(kosice).toHaveTextContent('—')
  })
})
