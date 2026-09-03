import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import type { FieldEducationLandscapeRow } from '../analysis/fieldEducation'
import FieldEducationDetail from './FieldEducationDetail'

afterEach(cleanup)

const socialWork: FieldEducationLandscapeRow = {
  fieldKey: 'socialna praca',
  canonicalLabel: 'Sociálna práca',
  appointmentCount: 46,
  exactAppointmentCount: 46,
  aliasAppointmentCount: 0,
  graduateCount: 62_122,
  graduatesPerAppointment: 62_122 / 46,
  currentStudentCount: 4_505,
  annual: Array.from({ length: 17 }, (_, index) => ({
    year: 2009 + index,
    appointmentCount: index % 4,
    graduateCount: index === 8 ? null : 3_000 + index * 100,
  })),
  variants: [{ label: 'sociálna práca', count: 46 }],
}

describe('FieldEducationDetail', () => {
  it('keeps cumulative flows, annual series, and student stock separate', () => {
    render(<FieldEducationDetail row={socialWork} />)

    expect(screen.getByRole('heading', { name: 'Sociálna práca' })).toBeInTheDocument()
    expect(screen.getByText('46', { selector: 'dd' })).toBeInTheDocument()
    expect(screen.getByText('62 122', { selector: 'dd' })).toBeInTheDocument()
    expect(screen.getByText('1 350,48', { selector: 'dd' })).toBeInTheDocument()
    expect(screen.getByText('4 505', { selector: 'dd' })).toBeInTheDocument()
    expect(screen.getByText(/opisný pomer dvoch tokov za vybrané obdobie/i)).toBeInTheDocument()
    expect(screen.getByText(/stav k 31\. 10\. 2025 · kontext, nie súčasť osi/i)).toBeInTheDocument()
    expect(screen.getAllByTestId('annual-appointment-bar')).toHaveLength(17)

    const graduatePath = screen.getByTestId('annual-graduate-path').getAttribute('d') ?? ''
    expect(graduatePath.match(/M/g)).toHaveLength(2)
  })

  it('renders solid labeled Y axes for both annual charts', () => {
    render(<FieldEducationDetail row={socialWork} />)

    const appointments = screen.getByRole('group', {
      name: /Ročné profesorské vymenovania vo vybranom odbore/,
    })
    const graduates = screen.getByRole('group', {
      name: /Roční absolventi vo vybranom odbore/,
    })

    for (const chart of [appointments, graduates]) {
      expect(chart.querySelector('[data-axis="y"]')).toBeInTheDocument()
      expect(chart.querySelectorAll('[data-axis-tick="y"]').length).toBeGreaterThanOrEqual(3)
      expect(chart).toHaveTextContent('0')
    }
  })

  it('labels totals and annual charts with the selected row period', () => {
    render(
      <FieldEducationDetail
        row={{
          ...socialWork,
          annual: socialWork.annual.slice(3, 6),
        }}
      />,
    )

    expect(screen.getByText('Vymenovania 2012 – 2014')).toBeInTheDocument()
    expect(screen.getByText('Absolventi 2012 – 2014')).toBeInTheDocument()
    expect(screen.getAllByText('2012')).toHaveLength(2)
    expect(screen.getAllByText('2014')).toHaveLength(2)
    expect(screen.queryByText('2009')).not.toBeInTheDocument()
    expect(screen.queryByText('2025')).not.toBeInTheDocument()
  })

  it('states missing education explicitly instead of displaying a numeric zero', () => {
    render(
      <FieldEducationDetail
        row={{
          ...socialWork,
          fieldKey: 'neznamy',
          canonicalLabel: 'Nespárovaný odbor',
          graduateCount: null,
          graduatesPerAppointment: null,
          currentStudentCount: null,
          annual: socialWork.annual.map((value) => ({ ...value, graduateCount: null })),
        }}
      />,
    )

    expect(screen.getByText(/údaje o absolventoch nie sú pre tento kľúč spárované/i)).toBeInTheDocument()
    expect(screen.getByText(/stav študentov nie je pre tento kľúč spárovaný/i)).toBeInTheDocument()
    expect(screen.queryByTestId('annual-graduate-path')).not.toBeInTheDocument()
  })
})

describe('FieldEducationDetail year readout', () => {
  it('walks years with the keyboard and shares the readout between both charts', () => {
    render(<FieldEducationDetail row={socialWork} />)
    const bars = screen.getByRole('group', { name: /Ročné profesorské vymenovania/ })
    const readout = screen.getByRole('status')
    expect(readout).toHaveTextContent('Ukážte na rok')
    fireEvent.keyDown(bars, { key: 'ArrowRight' })
    expect(readout).toHaveTextContent('2009: 0 vymenovaní · 3 000 absolventov')
    fireEvent.keyDown(bars, { key: 'End' })
    expect(readout).toHaveTextContent(/2025: 0 vymenovaní/)
    fireEvent.keyDown(bars, { key: 'ArrowLeft' })
    expect(readout).toHaveTextContent(/2024: 3 vymenovania · 4 500 absolventov · 1 500 na vymenovanie/)
    expect(document.querySelectorAll('.field-education-detail__crosshair')).toHaveLength(2)
    expect(screen.getAllByTestId('annual-appointment-bar')[15]).toHaveClass(
      'field-education-detail__bar--active',
    )
    fireEvent.keyDown(bars, { key: 'Escape' })
    expect(readout).toHaveTextContent('Ukážte na rok')
  })

  it('names a year without matched graduates in the readout', () => {
    render(<FieldEducationDetail row={socialWork} />)
    const graduates = screen.getByRole('group', { name: /Roční absolventi/ })
    fireEvent.keyDown(graduates, { key: 'Home' })
    for (let step = 0; step < 8; step += 1) fireEvent.keyDown(graduates, { key: 'ArrowRight' })
    expect(screen.getByRole('status')).toHaveTextContent('2017: 0 vymenovaní · absolventi bez spárovaného údaja')
  })

  it('labels the year axis every four years', () => {
    render(<FieldEducationDetail row={socialWork} />)
    const ticks = Array.from(document.querySelectorAll('.field-education-detail__x-axis text')).map(
      (node) => node.textContent,
    )
    expect(ticks).toEqual(['2009', '2013', '2017', '2021', '2025', '2009', '2013', '2017', '2021', '2025'])
  })
})
