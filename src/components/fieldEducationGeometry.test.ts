import { describe, expect, it } from 'vitest'

import type { FieldEducationPoint } from '../analysis/fieldEducation'
import {
  clampPreview,
  generatedLabelKeys,
  nearestProjectedPoint,
  nextDirectionalPoint,
  projectFieldPoints,
  type ProjectedFieldPoint,
} from './fieldEducationGeometry'

function point(
  fieldKey: string,
  appointmentCount: number,
  graduateCount: number,
  ratio = graduateCount / appointmentCount,
): FieldEducationPoint {
  return {
    fieldKey,
    canonicalLabel: fieldKey.toUpperCase(),
    appointmentCount,
    exactAppointmentCount: appointmentCount,
    aliasAppointmentCount: 0,
    graduateCount,
    graduatesPerAppointment: ratio,
    currentStudentCount: null,
    annual: [],
    variants: [],
  }
}

const bounds = { x: 10, y: 10, width: 180, height: 180 }

describe('projectFieldPoints', () => {
  it('uses logarithmic positive domains and zero-inclusive linear domains', () => {
    const values = [point('low', 1, 10), point('middle', 10, 100), point('high', 100, 1_000)]

    const logarithmic = projectFieldPoints(values, bounds, 'log')
    const linear = projectFieldPoints(values, bounds, 'linear')

    expect(logarithmic.find(({ fieldKey }) => fieldKey === 'middle')?.analyticalX).toBeCloseTo(100)
    expect(linear.find(({ fieldKey }) => fieldKey === 'middle')?.analyticalX).toBeCloseTo(28)
    expect(linear.find(({ fieldKey }) => fieldKey === 'low')?.analyticalX).toBeCloseTo(11.8)
    expect(linear.find(({ fieldKey }) => fieldKey === 'high')?.analyticalX).toBe(190)
  })

  it('offsets exact collisions deterministically and discloses the complete group', () => {
    const values = [point('c', 2, 20), point('a', 2, 20), point('b', 2, 20)]
    const projected = projectFieldPoints(values, bounds, 'linear')

    expect(projected.map(({ fieldKey }) => fieldKey)).toEqual(['a', 'b', 'c'])
    expect(new Set(projected.map(({ x, y }) => `${x},${y}`))).toHaveLength(3)
    expect(projected[0].collisionKeys).toEqual(['a', 'b', 'c'])
    expect(projected.every(({ analyticalX, analyticalY }) => analyticalX === projected[0].analyticalX && analyticalY === projected[0].analyticalY)).toBe(true)
  })
})

describe('interaction geometry', () => {
  const projected: ProjectedFieldPoint[] = [
    { ...point('a', 1, 10), x: 10, y: 10, analyticalX: 10, analyticalY: 10, collisionKeys: ['a'] },
    { ...point('center', 2, 20), x: 40, y: 40, analyticalX: 40, analyticalY: 40, collisionKeys: ['center'] },
    { ...point('east', 3, 30), x: 70, y: 42, analyticalX: 70, analyticalY: 42, collisionKeys: ['east'] },
    { ...point('south', 4, 40), x: 39, y: 75, analyticalX: 39, analyticalY: 75, collisionKeys: ['south'] },
  ]

  it('selects only the nearest point within tolerance', () => {
    expect(nearestProjectedPoint(projected, { x: 12, y: 10 }, 6)?.fieldKey).toBe('a')
    expect(nearestProjectedPoint(projected, { x: 80, y: 80 }, 6)).toBeNull()
  })

  it('clamps previews to all four plot edges', () => {
    expect(
      clampPreview(
        { x: -20, y: 190, width: 90, height: 60 },
        { x: 0, y: 0, width: 200, height: 200 },
      ),
    ).toEqual({ x: 8, y: 132 })
    expect(
      clampPreview(
        { x: 190, y: -10, width: 90, height: 60 },
        { x: 0, y: 0, width: 200, height: 200 },
      ),
    ).toEqual({ x: 102, y: 8 })
  })

  it('navigates by spatial direction', () => {
    expect(nextDirectionalPoint(projected, 'center', 'right')).toBe('east')
    expect(nextDirectionalPoint(projected, 'center', 'down')).toBe('south')
    expect(nextDirectionalPoint(projected, 'a', 'left')).toBe('a')
  })
})

describe('generatedLabelKeys', () => {
  it('unions the selection, top counts, and ratio extremes', () => {
    const values = [
      point('a', 10, 100, 10),
      point('b', 9, 200, 20),
      point('c', 8, 300, 30),
      point('d', 7, 400, 40),
      point('e', 6, 50, 2),
    ]

    expect(generatedLabelKeys(values, 'e')).toEqual(new Set(['a', 'b', 'c', 'd', 'e']))
  })
})
