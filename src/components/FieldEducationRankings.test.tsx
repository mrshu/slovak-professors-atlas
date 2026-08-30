import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { FieldEducationLandscapeRow } from '../analysis/fieldEducation'
import FieldEducationRankings from './FieldEducationRankings'

afterEach(cleanup)

function row(
  fieldKey: string,
  canonicalLabel: string,
  appointmentCount: number,
  graduateCount: number | null,
  variants: Array<{ label: string; count: number }> = [{ label: canonicalLabel, count: appointmentCount }],
): FieldEducationLandscapeRow {
  return {
    fieldKey,
    canonicalLabel,
    appointmentCount,
    exactAppointmentCount: appointmentCount,
    aliasAppointmentCount: 0,
    graduateCount,
    graduatesPerAppointment: graduateCount === null ? null : graduateCount / appointmentCount,
    currentStudentCount: null,
    annual: [],
    variants,
  }
}

const rows = [
  row('verejne zdravotnictvo', 'Verejné zdravotníctvo', 8, 5_968, [
    { label: 'verejné zdravotníctvo', count: 7 },
    { label: 'verejné zdrtavotníctvo', count: 1 },
  ]),
  row('socialna praca', 'Sociálna práca', 46, 62_122),
  row('teoria prava', 'Teória práva', 3, null),
]

describe('FieldEducationRankings', () => {
  it('shows every matched and unmatched key in separate tables', () => {
    render(<FieldEducationRankings rows={rows} selectedField={null} onFieldSelect={vi.fn()} />)

    const matched = screen.getByRole('table', { name: /^spárované odbory$/i })
    const unmatched = screen.getByRole('table', { name: /^nespárované odbory$/i })
    expect(within(matched).getAllByRole('row')).toHaveLength(3)
    expect(within(unmatched).getAllByRole('row')).toHaveLength(2)
    expect(within(unmatched).getAllByText('—')).toHaveLength(2)
    expect(within(unmatched).queryByText('0')).not.toBeInTheDocument()
  })

  it('summarizes additive appointment and graduate shares with two donuts', () => {
    render(<FieldEducationRankings rows={rows} selectedField={null} onFieldSelect={vi.fn()} />)

    const appointments = screen.getByRole('img', {
      name: 'Podiel vymenovaní podľa odboru',
    })
    const graduates = screen.getByRole('img', {
      name: 'Podiel absolventov podľa odboru',
    })

    expect(appointments.querySelectorAll('[data-donut-slice]')).toHaveLength(3)
    expect(graduates.querySelectorAll('[data-donut-slice]')).toHaveLength(2)
    expect(screen.queryByRole('img', { name: /pomer/i })).not.toBeInTheDocument()
  })

  it('searches accent-insensitive canonical labels and raw typo variants', () => {
    render(<FieldEducationRankings rows={rows} selectedField={null} onFieldSelect={vi.fn()} />)
    const search = screen.getByRole('searchbox', { name: /hľadať odbor/i })

    fireEvent.change(search, { target: { value: 'verejne zdravotnictvo' } })
    expect(screen.getByRole('button', { name: 'Verejné zdravotníctvo' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sociálna práca' })).not.toBeInTheDocument()

    fireEvent.change(search, { target: { value: 'zdrtavotnictvo' } })
    expect(screen.getByRole('button', { name: 'Verejné zdravotníctvo' })).toBeInTheDocument()
  })

  it('selects canonical keys and sorts without changing totals', () => {
    const onFieldSelect = vi.fn()
    render(<FieldEducationRankings rows={rows} selectedField="socialna praca" onFieldSelect={onFieldSelect} />)

    fireEvent.click(screen.getByRole('button', { name: 'Verejné zdravotníctvo' }))
    expect(onFieldSelect).toHaveBeenCalledWith('verejne zdravotnictvo')

    const matched = screen.getByRole('table', { name: /^spárované odbory$/i })
    fireEvent.click(within(matched).getByRole('button', { name: /^absolventi$/i }))
    const bodyRows = within(matched).getAllByRole('row').slice(1)
    expect(bodyRows[0]).toHaveTextContent('Sociálna práca')
    expect(screen.getByText(/3 odbory celkom/i)).toBeInTheDocument()
  })
})
