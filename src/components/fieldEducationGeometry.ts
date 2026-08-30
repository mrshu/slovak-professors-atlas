import { scaleLinear, scaleLog } from 'd3-scale'

import type { FieldEducationPoint } from '../analysis/fieldEducation'

export type ScaleMode = 'log' | 'linear'
export type Direction = 'left' | 'right' | 'up' | 'down'

export interface FieldProjectionBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface ProjectedFieldPoint extends FieldEducationPoint {
  analyticalX: number
  analyticalY: number
  x: number
  y: number
  collisionKeys: string[]
}

export interface PointCoordinate {
  x: number
  y: number
}

export interface PreviewRectangle extends PointCoordinate {
  width: number
  height: number
}

const COLLISION_RADIUS = 6
const PREVIEW_MARGIN = 8

export function fieldScaleDomain(
  values: readonly number[],
  mode: ScaleMode,
): [number, number] {
  if (mode === 'linear') {
    const maximum = Math.max(0, ...values)
    return [0, maximum === 0 ? 1 : maximum]
  }
  const positives = values.filter((value) => value > 0)
  if (positives.length === 0) return [1, 10]
  const minimum = Math.min(...positives)
  const maximum = Math.max(...positives)
  return minimum === maximum
    ? [Math.max(minimum / 2, Number.MIN_VALUE), maximum * 2]
    : [minimum, maximum]
}

export function projectFieldPoints(
  points: readonly FieldEducationPoint[],
  bounds: FieldProjectionBounds,
  mode: ScaleMode,
): ProjectedFieldPoint[] {
  if (points.length === 0) return []
  const appointmentValues = points.map(({ appointmentCount }) => appointmentCount)
  const graduateValues = points.map(({ graduateCount }) => graduateCount)
  const xDomain = fieldScaleDomain(appointmentValues, mode)
  const yDomain = fieldScaleDomain(graduateValues, mode)
  const xScale = mode === 'log'
    ? scaleLog().domain(xDomain).range([bounds.x, bounds.x + bounds.width])
    : scaleLinear().domain(xDomain).range([bounds.x, bounds.x + bounds.width])
  const yScale = mode === 'log'
    ? scaleLog().domain(yDomain).range([bounds.y + bounds.height, bounds.y])
    : scaleLinear().domain(yDomain).range([bounds.y + bounds.height, bounds.y])
  const xFloor = xDomain[0]
  const yFloor = yDomain[0]
  const ordered = [...points].sort((left, right) => left.fieldKey.localeCompare(right.fieldKey))
  const collisionGroups = new Map<string, FieldEducationPoint[]>()

  for (const point of ordered) {
    const analyticalX = xScale(mode === 'log' ? Math.max(point.appointmentCount, xFloor) : point.appointmentCount)
    const analyticalY = yScale(mode === 'log' ? Math.max(point.graduateCount, yFloor) : point.graduateCount)
    const key = `${analyticalX}\u0000${analyticalY}`
    const group = collisionGroups.get(key)
    if (group === undefined) collisionGroups.set(key, [point])
    else group.push(point)
  }

  const projected: ProjectedFieldPoint[] = []
  for (const group of collisionGroups.values()) {
    const collisionKeys = group.map(({ fieldKey }) => fieldKey)
    for (const [index, point] of group.entries()) {
      const analyticalX = xScale(mode === 'log' ? Math.max(point.appointmentCount, xFloor) : point.appointmentCount)
      const analyticalY = yScale(mode === 'log' ? Math.max(point.graduateCount, yFloor) : point.graduateCount)
      const angle = -Math.PI / 2 + (2 * Math.PI * index) / group.length
      const radius = group.length === 1 ? 0 : COLLISION_RADIUS
      projected.push({
        ...point,
        analyticalX,
        analyticalY,
        x: analyticalX + Math.cos(angle) * radius,
        y: analyticalY + Math.sin(angle) * radius,
        collisionKeys,
      })
    }
  }
  return projected.sort((left, right) => left.fieldKey.localeCompare(right.fieldKey))
}

export function nearestProjectedPoint(
  points: readonly ProjectedFieldPoint[],
  coordinate: PointCoordinate,
  tolerance: number,
): ProjectedFieldPoint | null {
  let nearest: ProjectedFieldPoint | null = null
  let nearestDistance = Number.POSITIVE_INFINITY
  for (const point of points) {
    const distance = Math.hypot(point.x - coordinate.x, point.y - coordinate.y)
    if (
      distance <= tolerance &&
      (distance < nearestDistance ||
        (distance === nearestDistance && point.fieldKey.localeCompare(nearest?.fieldKey ?? '') < 0))
    ) {
      nearest = point
      nearestDistance = distance
    }
  }
  return nearest
}

export function clampPreview(
  rectangle: PreviewRectangle,
  bounds: FieldProjectionBounds,
): PointCoordinate {
  const minimumX = bounds.x + PREVIEW_MARGIN
  const minimumY = bounds.y + PREVIEW_MARGIN
  const maximumX = Math.max(minimumX, bounds.x + bounds.width - rectangle.width - PREVIEW_MARGIN)
  const maximumY = Math.max(minimumY, bounds.y + bounds.height - rectangle.height - PREVIEW_MARGIN)
  return {
    x: Math.min(maximumX, Math.max(minimumX, rectangle.x)),
    y: Math.min(maximumY, Math.max(minimumY, rectangle.y)),
  }
}

export function nextDirectionalPoint(
  points: readonly ProjectedFieldPoint[],
  currentKey: string,
  direction: Direction,
): string {
  const current = points.find(({ fieldKey }) => fieldKey === currentKey)
  if (current === undefined) return points[0]?.fieldKey ?? currentKey

  const candidates = points.flatMap((point) => {
    if (point.fieldKey === currentKey) return []
    const dx = point.x - current.x
    const dy = point.y - current.y
    const primary = direction === 'right' ? dx : direction === 'left' ? -dx : direction === 'down' ? dy : -dy
    if (primary <= 0) return []
    const secondary = direction === 'left' || direction === 'right' ? Math.abs(dy) : Math.abs(dx)
    return [{ point, angle: secondary / primary, distance: Math.hypot(dx, dy) }]
  })
  candidates.sort(
    (left, right) =>
      left.angle - right.angle ||
      left.distance - right.distance ||
      left.point.fieldKey.localeCompare(right.point.fieldKey),
  )
  return candidates[0]?.point.fieldKey ?? currentKey
}

function topKeys(
  points: readonly FieldEducationPoint[],
  value: (point: FieldEducationPoint) => number,
): string[] {
  return [...points]
    .sort(
      (left, right) =>
        value(right) - value(left) || left.fieldKey.localeCompare(right.fieldKey),
    )
    .slice(0, 3)
    .map(({ fieldKey }) => fieldKey)
}

export function generatedLabelKeys(
  points: readonly FieldEducationPoint[],
  selectedKey: string | null,
): Set<string> {
  const result = new Set<string>()
  if (selectedKey !== null && points.some(({ fieldKey }) => fieldKey === selectedKey)) {
    result.add(selectedKey)
  }
  for (const fieldKey of topKeys(points, ({ appointmentCount }) => appointmentCount)) {
    result.add(fieldKey)
  }
  for (const fieldKey of topKeys(points, ({ graduateCount }) => graduateCount)) {
    result.add(fieldKey)
  }
  if (points.length > 0) {
    const ratios = [...points].sort(
      (left, right) =>
        left.graduatesPerAppointment - right.graduatesPerAppointment ||
        left.fieldKey.localeCompare(right.fieldKey),
    )
    result.add(ratios[0].fieldKey)
    result.add(ratios[ratios.length - 1].fieldKey)
  }
  return result
}
