import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { contextYear } from '../test/atlasFixture'
import ContextStrip from './ContextStrip'

afterEach(cleanup)

const years = [
  contextYear({ year: 2000, appointmentsPer100Professors: 11.19, internalProfessors: 938 }),
  contextYear({ year: 2007, appointmentsPer100Professors: 3.17, internalProfessors: 1452 }),
  contextYear({ year: 2025, appointmentsPer100Professors: 3.38, internalProfessors: 1627 }),
]

describe('ContextStrip', () => {
  it('draws inflow rate and professor stock as two single-series charts with end values', () => {
    render(<ContextStrip years={years} selectedYear={2025} setSelectedYear={vi.fn()} />)
    const section = screen.getByRole('region', { name: 'Prítok a stav profesúry' })
    const rate = within(section).getByRole('group', {
      name: /Vymenovania na 100 interných profesorov, 2000–2025/,
    })
    expect(rate).toHaveTextContent('11,19')
    expect(rate).toHaveTextContent('3,38')
    const stock = within(section).getByRole('group', {
      name: /Interní profesori k 31. októbru, 2000–2025/,
    })
    expect(stock).toHaveTextContent(/1[\s ]627/)
  })

  it('keeps the full national context in a closed fold', () => {
    render(<ContextStrip years={years} selectedYear={2025} setSelectedYear={vi.fn()} />)
    const fold = screen.getByText('Národný kontext v detaile').closest('details')
    expect(fold).not.toHaveAttribute('open')
  })
})

describe('ContextStrip year readout', () => {
  it('shares one readout between both charts and walks years with the keyboard', () => {
    render(<ContextStrip years={years} selectedYear={2025} setSelectedYear={vi.fn()} />)
    const readout = screen.getByRole('status')
    expect(readout).toHaveTextContent('Ukážte na rok')
    const rate = screen.getByRole('group', { name: /Vymenovania na 100 interných profesorov/ })
    fireEvent.keyDown(rate, { key: 'ArrowRight' })
    expect(readout).toHaveTextContent(/2000: 90 vymenovaní · 11,19 na 100 interných profesorov · 938 interných profesorov/)
    fireEvent.keyDown(rate, { key: 'End' })
    expect(readout).toHaveTextContent(/2025: .*3,38 na 100/)
    expect(document.querySelectorAll('.chart__crosshair')).toHaveLength(2)
    fireEvent.keyDown(rate, { key: 'Escape' })
    expect(readout).toHaveTextContent('Ukážte na rok')
  })
})
