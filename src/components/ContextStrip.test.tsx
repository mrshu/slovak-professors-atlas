import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
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
    const rate = within(section).getByRole('img', {
      name: 'Vymenovania na 100 interných profesorov, 2000–2025',
    })
    expect(rate).toHaveTextContent('11,19')
    expect(rate).toHaveTextContent('3,38')
    const stock = within(section).getByRole('img', {
      name: 'Interní profesori k 31. októbru, 2000–2025',
    })
    expect(stock).toHaveTextContent(/1[\s ]627/)
  })

  it('keeps the full national context in a closed fold', () => {
    render(<ContextStrip years={years} selectedYear={2025} setSelectedYear={vi.fn()} />)
    const fold = screen.getByText('Národný kontext v detaile').closest('details')
    expect(fold).not.toHaveAttribute('open')
  })
})
