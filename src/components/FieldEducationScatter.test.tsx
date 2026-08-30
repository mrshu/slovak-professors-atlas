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
    render(
      <FieldEducationScatter points={points} selectedField="center" onFieldSelect={vi.fn()} />,
    )

    expect(screen.getByRole('button', { name: 'Logaritmická' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getAllByTestId(/^field-point-/)).toHaveLength(3)
    expect(screen.getByTestId('field-point-center')).toHaveAttribute('data-selected', 'true')

    fireEvent.click(screen.getByRole('button', { name: 'Absolútna' }))

    expect(screen.getByRole('button', { name: 'Absolútna' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getAllByTestId(/^field-point-/)).toHaveLength(3)
    expect(screen.getByTestId('field-point-center')).toHaveAttribute('data-selected', 'true')
  })

  it('previews and selects the nearest point through the transparent overlay', () => {
    const onFieldSelect = vi.fn()
    render(
      <FieldEducationScatter points={points} selectedField="center" onFieldSelect={onFieldSelect} />,
    )
    const target = chartTarget()
    const east = renderedPoint('east')

    fireEvent.pointerMove(target, { clientX: east.x, clientY: east.y })
    expect(screen.getByRole('group', { name: 'Náhľad odboru EAST' })).toHaveTextContent(
      'Presne priradené vymenovania 100',
    )

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
      <FieldEducationScatter points={points} selectedField="center" onFieldSelect={onFieldSelect} />,
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

  it('discloses alias recovery, exact collisions, and clamps edge previews', () => {
    const collisionPoints = [
      point('a', 1, 10, { exactAppointmentCount: 0, aliasAppointmentCount: 1 }),
      point('b', 1, 10),
    ]
    render(
      <FieldEducationScatter points={collisionPoints} selectedField="a" onFieldSelect={vi.fn()} />,
    )
    const target = chartTarget()
    const a = renderedPoint('a')

    fireEvent.pointerMove(target, { clientX: a.x, clientY: a.y })
    const preview = screen.getByRole('group', { name: 'Náhľad odboru A' })
    expect(preview).toHaveTextContent('Aliasom obnovené vymenovania 1')
    expect(preview).toHaveTextContent('Rovnaké analytické súradnice: 2 odbory')
    expect(Number(preview.getAttribute('data-preview-x'))).toBeGreaterThanOrEqual(8)
    expect(Number(preview.getAttribute('data-preview-y'))).toBeGreaterThanOrEqual(8)
  })
})
