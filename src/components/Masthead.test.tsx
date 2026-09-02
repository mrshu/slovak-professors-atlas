import '@testing-library/jest-dom/vitest'
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import Masthead from './Masthead'

const meta = {
  schemaVersion: 1 as const,
  sourceRowCount: 2419,
  duplicateSourceRowCount: 41,
  analyticalAppointmentCount: 2378,
  ceremonyCount: 67,
  appointmentDateMin: '2000-02-22',
  appointmentDateMax: '2026-06-03',
}

describe('Masthead', () => {
  it('shows the question, the four ledger figures and the five anchors', () => {
    render(<Masthead status="ready" meta={meta} institutionCount={22} cityCount={14} />)
    expect(
      screen.getByRole('heading', { level: 1, name: /Kde vzniká slovenská profesúra\?/ }),
    ).toBeVisible()
    const ledger = screen.getByLabelText('Rozsah analytického súboru')
    expect(within(ledger).getByText(/2[\s ]378/)).toBeVisible()
    expect(within(ledger).getByText('67')).toBeVisible()
    expect(within(ledger).getByText('22')).toBeVisible()
    expect(within(ledger).getByText('14')).toBeVisible()
    const nav = screen.getByRole('navigation', { name: 'Navigácia atlasu' })
    expect(within(nav).getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
      '#mapa',
      '#zistenia',
      '#odbory',
      '#register',
      '#metodika',
    ])
  })

  it('keeps the shell while loading', () => {
    render(<Masthead status="loading" meta={null} institutionCount={0} cityCount={0} />)
    expect(screen.getByRole('status')).toHaveTextContent('Otváram overený dátový archív…')
  })
})
