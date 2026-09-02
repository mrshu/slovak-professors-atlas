import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { FieldEducationPoint } from '../analysis/fieldEducation'
import FieldEducationScatter from './FieldEducationScatter'

afterEach(cleanup)

function point(
  fieldKey: string,
  appointmentCount: number,
  graduateCount: number,
  overrides: Partial<FieldEducationPoint> = {},
): FieldEducationPoint {
  return {
    fieldKey,
    canonicalLabel: fieldKey.toUpperCase(),
    appointmentCount,
    exactAppointmentCount: appointmentCount,
    aliasAppointmentCount: 0,
    graduateCount,
    graduatesPerAppointment: graduateCount / appointmentCount,
    currentStudentCount: null,
    annual: [],
    variants: [{ label: fieldKey.toUpperCase(), count: appointmentCount }],
    ...overrides,
  }
}

const points = [
  point('center', 10, 100, { exactAppointmentCount: 8, aliasAppointmentCount: 2 }),
  point('east', 100, 100),
  point('north', 10, 1_000),
]

const plotRectangle = {
  x: 100,
  y: 50,
  left: 100,
  top: 50,
  right: 518,
  bottom: 265,
  width: 418,
  height: 215,
  toJSON: () => ({}),
}

function chartTarget(): HTMLElement {
  const target = screen.getByRole('button', { name: /Preskúmať mapu odborov/ })
  vi.spyOn(target, 'getBoundingClientRect').mockReturnValue(plotRectangle)
  return target
}

function renderedPoint(fieldKey: string): { x: number; y: number } {
  const mark = screen.getByTestId(`field-point-${fieldKey}`)
  const renderedX = Number(mark.getAttribute('data-render-x'))
  const renderedY = Number(mark.getAttribute('data-render-y'))
  return {
    x: plotRectangle.left + ((renderedX - 76) / 836) * plotRectangle.width,
    y: plotRectangle.top + ((renderedY - 34) / 430) * plotRectangle.height,
  }
}

describe('FieldEducationScatter', () => {
  it('renders every point in logarithmic and absolute modes while preserving selection', () => {
    const { rerender } = render(
      <FieldEducationScatter points={points} selectedField="center" onFieldSelect={vi.fn()} mode="log" zeroRail={[]} />,
    )

    expect(screen.getAllByTestId(/^field-point-/)).toHaveLength(3)
    expect(screen.getByTestId('field-point-center')).toHaveAttribute('data-selected', 'true')

    rerender(
      <FieldEducationScatter points={points} selectedField="center" onFieldSelect={vi.fn()} mode="linear" zeroRail={[]} />,
    )

    expect(screen.getAllByTestId(/^field-point-/)).toHaveLength(3)
    expect(screen.getByTestId('field-point-center')).toHaveAttribute('data-selected', 'true')
  })

  it('labels the scatter with the selected annual period', () => {
    const rangedPoints = points.map((entry) => ({
      ...entry,
      annual: [
        { year: 2018, appointmentCount: 1, graduateCount: 10 },
        { year: 2019, appointmentCount: 1, graduateCount: 11 },
        { year: 2020, appointmentCount: 1, graduateCount: 12 },
      ],
    }))

    render(
      <FieldEducationScatter
        points={rangedPoints}
        selectedField={null}
        onFieldSelect={vi.fn()}
        mode="log"
        zeroRail={[]}
      />,
    )

    expect(screen.getByText('Vybrané obdobie 2018 – 2020')).toBeInTheDocument()
  })

  it('previews and selects the nearest point through the transparent overlay', () => {
    const onFieldSelect = vi.fn()
    render(
      <FieldEducationScatter points={points} selectedField="center" onFieldSelect={onFieldSelect} mode="log" zeroRail={[]} />,
    )
    const target = chartTarget()
    const east = renderedPoint('east')

    fireEvent.pointerMove(target, { clientX: east.x, clientY: east.y })
    const preview = screen.getByRole('group', { name: 'Náhľad odboru EAST' })
    expect(preview).toHaveTextContent('Presne priradené vymenovania 100')
    expect(preview.closest('.field-education-scatter__stage')).toBeNull()
    expect(preview.closest('.field-education-scatter__inspection')).toBeInTheDocument()

    fireEvent.pointerUp(target, { clientX: east.x, clientY: east.y, pointerType: 'mouse' })
    expect(onFieldSelect).toHaveBeenCalledWith('east')

    onFieldSelect.mockClear()
    fireEvent.pointerUp(target, {
      clientX: east.x,
      clientY: east.y,
      pointerType: 'touch',
    })
    expect(onFieldSelect).toHaveBeenCalledWith('east')
    expect(onFieldSelect).toHaveBeenCalledTimes(1)

    fireEvent.pointerMove(target, { clientX: 309, clientY: 265 })
    expect(screen.queryByRole('group', { name: 'Náhľad odboru EAST' })).not.toBeInTheDocument()
  })

  it('supports directional, Home/End, Enter, and Space keys on one focus target', () => {
    const onFieldSelect = vi.fn()
    render(
      <FieldEducationScatter points={points} selectedField="center" onFieldSelect={onFieldSelect} mode="log" zeroRail={[]} />,
    )
    const target = chartTarget()

    fireEvent.keyDown(target, { key: 'ArrowRight' })
    expect(screen.getByText('Aktívny odbor: EAST')).toBeInTheDocument()
    fireEvent.keyDown(target, { key: 'Enter' })
    expect(onFieldSelect).toHaveBeenLastCalledWith('east')

    fireEvent.keyDown(target, { key: 'End' })
    expect(screen.getByText('Aktívny odbor: NORTH')).toBeInTheDocument()
    fireEvent.keyDown(target, { key: 'Home' })
    expect(screen.getByText('Aktívny odbor: CENTER')).toBeInTheDocument()
    fireEvent.keyDown(target, { key: 'End' })
    fireEvent.keyDown(target, { key: ' ' })
    expect(onFieldSelect).toHaveBeenLastCalledWith('north')

    expect(screen.getAllByRole('button', { name: /Preskúmať mapu odborov/ })).toHaveLength(1)
  })

  it('discloses alias recovery and exact collisions in the inspection strip', () => {
    const collisionPoints = [
      point('a', 1, 10, { exactAppointmentCount: 0, aliasAppointmentCount: 1 }),
      point('b', 1, 10),
    ]
    render(
      <FieldEducationScatter points={collisionPoints} selectedField="a" onFieldSelect={vi.fn()} mode="log" zeroRail={[]} />,
    )
    const target = chartTarget()
    const a = renderedPoint('a')

    fireEvent.pointerMove(target, { clientX: a.x, clientY: a.y })
    const preview = screen.getByRole('group', { name: 'Náhľad odboru A' })
    expect(preview).toHaveTextContent('Aliasom obnovené vymenovania 1')
    expect(preview).toHaveTextContent('Rovnaké analytické súradnice: 2 odbory')
    expect(preview.closest('.field-education-scatter__inspection')).toBeInTheDocument()
  })

  it('draws three ratio guides in log mode and a rail point for zero-graduate fields', () => {
    // A domain wide enough (appointments 1–100, graduates 100–100 000) for all three
    // ratio guides (10x, 100x, 1000x) to fall inside the box without degenerating to a
    // single point; the shared `points` fixture above is too narrow for that.
    const widePoints = [
      point('p1', 1, 100),
      point('p2', 10, 1_000),
      point('p3', 100, 100_000),
    ]
    render(
      <FieldEducationScatter
        points={widePoints}
        selectedField={null}
        onFieldSelect={vi.fn()}
        mode="log"
        zeroRail={[{ ...widePoints[0]!, fieldKey: 'x', canonicalLabel: 'x', graduateCount: 0, graduatesPerAppointment: null }]}
      />,
    )
    expect(document.querySelectorAll('.field-education-scatter__guide')).toHaveLength(3)
    expect(screen.getByTestId('field-rail-x')).toBeInTheDocument()
  })

  it('keeps a zero-graduate rail point on canvas even when its appointment count exceeds every point', () => {
    render(
      <FieldEducationScatter
        points={points}
        selectedField={null}
        onFieldSelect={vi.fn()}
        mode="log"
        zeroRail={[{ ...points[0]!, fieldKey: 'off-canvas', canonicalLabel: 'OFF-CANVAS', appointmentCount: 10_000, graduateCount: 0, graduatesPerAppointment: null }]}
      />,
    )
    const rail = screen.getByTestId('field-rail-off-canvas')
    const cx = Number(rail.getAttribute('cx'))
    expect(cx).toBeGreaterThanOrEqual(76)
    expect(cx).toBeLessThanOrEqual(76 + 836)
  })
})
