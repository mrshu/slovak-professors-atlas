import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ContextYear } from '../data/types'
import ContextSection from './ContextSection'

const contextYears: ContextYear[] = [
  {
    year: 2000,
    academicYear: '2000/2001',
    students: 137_908,
    graduates: 20_558,
    internalTeachers: 9_535,
    internalProfessors: 938,
    appointments: 105,
    appointmentsPer1kGraduates: 5.11,
    graduatesPerAppointment: 195.79,
    appointmentsPer10kStudents: 7.61,
    appointmentsPer1kTeachers: 11.01,
    appointmentsPer100Professors: 11.19,
    professorShare: 9.8,
  },
  {
    year: 2007,
    academicYear: '2007/2008',
    students: 224_943,
    graduates: 43_457,
    internalTeachers: 9_892,
    internalProfessors: 1_452,
    appointments: 46,
    appointmentsPer1kGraduates: 1.06,
    graduatesPerAppointment: 944.72,
    appointmentsPer10kStudents: 2.04,
    appointmentsPer1kTeachers: 4.65,
    appointmentsPer100Professors: 3.17,
    professorShare: 14.7,
  },
  {
    year: 2025,
    academicYear: '2025/2026',
    students: 148_189,
    graduates: 37_627,
    internalTeachers: 9_296,
    internalProfessors: 1_627,
    appointments: 55,
    appointmentsPer1kGraduates: 1.46,
    graduatesPerAppointment: 684.13,
    appointmentsPer10kStudents: 3.71,
    appointmentsPer1kTeachers: 5.92,
    appointmentsPer100Professors: 3.38,
    professorShare: 17.5,
  },
]

function metric(panel: HTMLElement, label: string) {
  return within(panel).getByText(label, { selector: 'dt' }).parentElement
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('ContextSection', () => {
  it('shows the exact 2000 national flows, 31 October stocks, graduate total, and every ratio', () => {
    render(
      <ContextSection
        years={contextYears}
        selectedYear={2000}
        setSelectedYear={vi.fn()}
      />,
    )

    const panel = screen.getByRole('group', { name: 'Presné národné hodnoty pre rok 2000' })
    const expectedCards = [
      ['Vymenovania v kalendárnom roku', '105'],
      ['Absolventi I., II. a III. stupňa v kalendárnom roku', '20 558'],
      ['Študenti v akademickom roku 2000/2001 — stav k 31. októbru', '137 908'],
      ['Interní vysokoškolskí učitelia — stav k 31. októbru', '9 535'],
      ['Interní profesori — stav k 31. októbru', '938'],
      ['Vymenovania na 1 000 absolventov', '5,11'],
      ['Absolventi na jedno vymenovanie', '195,79'],
      ['Vymenovania na 10 000 študentov', '7,61'],
      ['Vymenovania na 1 000 interných učiteľov', '11,01'],
      ['Vymenovania na 100 interných profesorov v existujúcom stave', '11,19'],
      ['Podiel profesorov medzi internými učiteľmi', '9,8 %'],
    ]

    for (const [label, value] of expectedCards) {
      expect(metric(panel, label)).toHaveTextContent(value)
    }
    expect(panel).toHaveTextContent('ročné toky')
    expect(panel).toHaveTextContent('stavy k 31. októbru')
    expect(panel).toHaveTextContent('nie zmena počtu profesorov ani dôkaz príčinného vzťahu')
  })

  it('indexes every series to 100 in 2000 and gives each focus target an exact four-series label', () => {
    render(
      <ContextSection
        years={contextYears}
        selectedYear={2000}
        setSelectedYear={vi.fn()}
      />,
    )

    const target = screen.getByRole('button', {
      name: 'Rok 2000. Vymenovania: 105, index 100,00. Absolventi: 20 558, index 100,00. Študenti: 137 908, index 100,00. Interní učitelia: 9 535, index 100,00.',
    })
    expect(target).toHaveAttribute('tabindex', '0')

    for (const series of ['appointments', 'graduates', 'students', 'internalTeachers']) {
      expect(document.querySelector(`[data-series="${series}"]`)).toHaveAttribute(
        'data-baseline-index',
        '100',
      )
    }
    for (const label of ['Vymenovania', 'Absolventi', 'Študenti', 'Interní učitelia']) {
      expect(screen.getAllByText(label, { selector: 'text' }).length).toBeGreaterThan(0)
    }
  })

  it('inspects exact values on hover and focus without selecting until activation', () => {
    const setSelectedYear = vi.fn()
    render(
      <ContextSection
        years={contextYears}
        selectedYear={2000}
        setSelectedYear={setSelectedYear}
      />,
    )

    const target2007 = screen.getByRole('button', { name: /^Rok 2007\./ })
    const target2025 = screen.getByRole('button', { name: /^Rok 2025\./ })

    fireEvent.pointerEnter(target2007)
    let callout = screen.getByRole('group', {
      name: 'Presné hodnoty indexovaného trendu pre rok 2007',
    })
    expect(callout).toHaveTextContent('Vymenovania46index 43,81')
    expect(callout).toHaveTextContent('Absolventi43 457index 211,39')
    expect(setSelectedYear).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: '2000' })).toBeVisible()

    target2025.focus()
    expect(
      screen.getByRole('group', {
        name: 'Presné hodnoty indexovaného trendu pre rok 2007',
      }),
    ).toBeVisible()
    fireEvent.pointerLeave(target2007)
    callout = screen.getByRole('group', {
      name: 'Presné hodnoty indexovaného trendu pre rok 2025',
    })
    expect(callout).toHaveTextContent('Vymenovania55index 52,38')
    expect(callout).toHaveTextContent('Absolventi37 627index 183,03')
    expect(callout).toHaveTextContent('Študenti148 189index 107,45')
    expect(callout).toHaveTextContent('Interní učitelia9 296index 97,49')
    expect(setSelectedYear).not.toHaveBeenCalled()

    fireEvent.keyDown(target2025, { key: 'ArrowLeft' })
    expect(target2007).toHaveFocus()
    expect(
      screen.getByRole('group', {
        name: 'Presné hodnoty indexovaného trendu pre rok 2007',
      }),
    ).toBeVisible()
    expect(setSelectedYear).not.toHaveBeenCalled()

    fireEvent.keyDown(target2007, { key: 'Enter' })
    expect(setSelectedYear).toHaveBeenLastCalledWith(2007, 'push')
    fireEvent.keyDown(target2007, { key: ' ' })
    expect(setSelectedYear).toHaveBeenLastCalledWith(2007, 'push')
    fireEvent.click(target2025)
    expect(setSelectedYear).toHaveBeenLastCalledWith(2025, 'push')
    expect(screen.getByRole('heading', { name: '2000' })).toBeVisible()

    fireEvent.blur(target2007, { relatedTarget: null })
    expect(
      screen.queryByRole('group', { name: /Presné hodnoty indexovaného trendu/ }),
    ).not.toBeInTheDocument()
  })

  it('marks the 2007 teacher-definition break and names 2025/2026 as the latest official context', () => {
    render(
      <ContextSection
        years={contextYears}
        selectedYear={2025}
        setSelectedYear={vi.fn()}
      />,
    )

    expect(screen.getByText('2007 · zmena definície interných učiteľov')).toBeInTheDocument()
    expect(
      screen.getByText(/Od roku 2007 interní učitelia znamenajú učiteľov pracujúcich ustanovený týždenný pracovný čas/),
    ).toBeInTheDocument()
    expect(screen.getByText('Najnovší dostupný kontext: 2025/2026')).toBeInTheDocument()
    expect(
      screen.getByRole('group', { name: 'Presné národné hodnoty pre rok 2025' }),
    ).toHaveTextContent('148 189')
  })

  it('shows an explicit no-denominator message for 2026 instead of fabricating ratios', () => {
    render(
      <ContextSection
        years={contextYears}
        selectedYear={2026}
        setSelectedYear={vi.fn()}
      />,
    )

    const unavailable = screen.getByRole('status')
    expect(unavailable).toHaveTextContent('Kontext CVTI pre rok 2026 nie je k dispozícii')
    expect(unavailable).toHaveTextContent('nezobrazujeme menovatele ani pomery')
    expect(screen.queryByRole('group', { name: /Presné národné hodnoty/ })).not.toBeInTheDocument()
  })

  it.each(['appointments', 'graduates', 'students', 'internalTeachers'] as const)(
    'shows an unavailable trend instead of a non-finite index when the 2000 %s baseline is zero',
    (field) => {
      const yearsWithZeroBaseline = [
        { ...contextYears[0], [field]: 0 },
        ...contextYears.slice(1),
      ]

      render(
        <ContextSection
          years={yearsWithZeroBaseline}
          selectedYear={2000}
          setSelectedYear={vi.fn()}
        />,
      )

      expect(screen.getByRole('status')).toHaveTextContent(
        'Indexovaný trend nie je dostupný',
      )
      expect(screen.queryByRole('button', { name: /^Rok 2000\./ })).not.toBeInTheDocument()
      expect(document.body).not.toHaveTextContent(/NaN|Infinity/)
    },
  )

  it('rejects a non-finite 2000 baseline before indexing', () => {
    const yearsWithInfiniteBaseline = [
      { ...contextYears[0], appointments: Number.POSITIVE_INFINITY },
      ...contextYears.slice(1),
    ]

    render(
      <ContextSection
        years={yearsWithInfiniteBaseline}
        selectedYear={2000}
        setSelectedYear={vi.fn()}
      />,
    )

    expect(screen.getByRole('status')).toHaveTextContent('Indexovaný trend nie je dostupný')
    expect(screen.queryByRole('button', { name: /^Rok 2000\./ })).not.toBeInTheDocument()
  })
})
