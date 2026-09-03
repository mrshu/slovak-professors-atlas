import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ContextYear } from '../data/types'
import { ContextSectionBody } from './ContextSection'

const contextYears: ContextYear[] = [
  {
    year: 2000,
    academicYear: '2000/2001',
    students: 137_908,
    graduates: 20_558,
    internalTeachers: 9_535,
    internalProfessors: 938,
    appointments: 105,
    population: 5_400_000,
    appointmentsPerMillionResidents: 19.44,
    professorsPer100kResidents: 17.37,
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
    population: 5_400_000,
    appointmentsPerMillionResidents: 8.52,
    professorsPer100kResidents: 26.89,
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
    population: 5_420_000,
    appointmentsPerMillionResidents: 10.15,
    professorsPer100kResidents: 30.02,
    appointmentsPer1kGraduates: 1.46,
    graduatesPerAppointment: 684.13,
    appointmentsPer10kStudents: 3.71,
    appointmentsPer1kTeachers: 5.92,
    appointmentsPer100Professors: 3.38,
    professorShare: 17.5,
  },
]

function callout(panel: HTMLElement, label: string) {
  return within(panel).getByText(label, { selector: 'dt' }).parentElement
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('ContextSection', () => {
  it('orders the five selected-year values on an explicitly labelled base-10 scale', () => {
    render(
      <ContextSectionBody
        years={contextYears}
        selectedYear={2000}
        setSelectedYear={vi.fn()}
      />,
    )

    const panel = screen.getByRole('group', { name: 'Presné národné hodnoty pre rok 2000' })
    const figure = within(panel).getByRole('figure', {
      name: 'Mierkový rebrík národných hodnôt pre rok 2000',
    })
    const scale = within(figure).getByRole('img', {
      name: 'Logaritmické porovnanie piatich národných hodnôt pre rok 2000',
    })
    const rows = within(scale).getAllByRole('listitem')

    expect(
      rows.map((row) => row.getAttribute('aria-label')?.replaceAll('\u00a0', ' ')),
    ).toEqual([
      'Vymenovania: 105; ročný tok',
      'Interní profesori: 938; stav k 31. októbru',
      'Interní učitelia: 9 535; stav k 31. októbru',
      'Absolventi: 20 558; ročný tok',
      'Študenti: 137 908; stav k 31. októbru',
    ])
    expect(figure).toHaveTextContent('Logaritmická os · základ 10')
    for (const tick of ['10', '100', '1 000', '10 000', '100 000', '1 000 000']) {
      expect(within(scale).getByText(tick)).toBeInTheDocument()
    }
  })

  it('shows the four selected-year callouts including both national per-capita rates', () => {
    render(
      <ContextSectionBody
        years={contextYears}
        selectedYear={2000}
        setSelectedYear={vi.fn()}
      />,
    )

    const panel = screen.getByRole('group', { name: 'Presné národné hodnoty pre rok 2000' })
    expect(callout(panel, 'Vymenovania na milión obyvateľov')).toHaveTextContent('19,44')
    expect(callout(panel, 'Interní profesori na 100 000 obyvateľov')).toHaveTextContent(
      '17,37',
    )
    expect(
      callout(panel, 'Vymenovania na 100 interných profesorov v existujúcom stave'),
    ).toHaveTextContent('11,19')
    expect(callout(panel, 'Podiel profesorov medzi internými učiteľmi')).toHaveTextContent(
      '9,8 %',
    )
    expect(panel).toHaveTextContent('Národné obyvateľstvo v roku 2000: 5 400 000')
  })

  it('updates the scale and per-capita callouts when the selected year changes', () => {
    const setSelectedYear = vi.fn()
    const { rerender } = render(
      <ContextSectionBody
        years={contextYears}
        selectedYear={2000}
        setSelectedYear={setSelectedYear}
      />,
    )

    expect(
      screen.getByRole('figure', {
        name: 'Mierkový rebrík národných hodnôt pre rok 2000',
      }),
    ).toBeInTheDocument()

    rerender(
      <ContextSectionBody
        years={contextYears}
        selectedYear={2025}
        setSelectedYear={setSelectedYear}
      />,
    )

    const panel = screen.getByRole('group', { name: 'Presné národné hodnoty pre rok 2025' })
    const scale = within(panel).getByRole('img', {
      name: 'Logaritmické porovnanie piatich národných hodnôt pre rok 2025',
    })
    expect(within(scale).getAllByRole('listitem')[0]).toHaveAccessibleName(
      'Vymenovania: 55; ročný tok',
    )
    expect(callout(panel, 'Vymenovania na milión obyvateľov')).toHaveTextContent('10,15')
    expect(callout(panel, 'Interní profesori na 100 000 obyvateľov')).toHaveTextContent(
      '30,02',
    )
    expect(screen.getByRole('heading', { name: '2025' })).toBeVisible()
  })

  it('states that flows and stocks differ without implying a funnel or causal pipeline', () => {
    render(
      <ContextSectionBody
        years={contextYears}
        selectedYear={2000}
        setSelectedYear={vi.fn()}
      />,
    )

    const note = screen.getByRole('note', { name: 'Ako čítať mierkový rebrík' })
    expect(note).toHaveTextContent('Toky a stavy sú odlišné typy veličín')
    expect(note).toHaveTextContent('Nejde o lievik, konverziu ani príčinný reťazec')
  })

  it('indexes every series to 100 in 2000 and gives each focus target an exact four-series label', () => {
    render(
      <ContextSectionBody
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
      <ContextSectionBody
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
      <ContextSectionBody
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
      <ContextSectionBody
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
        <ContextSectionBody
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
      <ContextSectionBody
        years={yearsWithInfiniteBaseline}
        selectedYear={2000}
        setSelectedYear={vi.fn()}
      />,
    )

    expect(screen.getByRole('status')).toHaveTextContent('Indexovaný trend nie je dostupný')
    expect(screen.queryByRole('button', { name: /^Rok 2000\./ })).not.toBeInTheDocument()
  })
})
