import { scaleLinear, scaleLog } from 'd3-scale'
import {
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react'

import type { FieldEducationPoint } from '../analysis/fieldEducation'
import { formatNumber } from '../utils/format'
import {
  clampPreview,
  fieldScaleDomain,
  generatedLabelKeys,
  nearestProjectedPoint,
  nextDirectionalPoint,
  projectFieldPoints,
  type Direction,
  type ProjectedFieldPoint,
  type ScaleMode,
} from './fieldEducationGeometry'

interface FieldEducationScatterProps {
  points: readonly FieldEducationPoint[]
  selectedField: string | null
  onFieldSelect: (fieldKey: string) => void
}

interface AxisTick {
  value: number
  position: number
}

const WIDTH = 960
const HEIGHT = 540
const PLOT = { x: 76, y: 34, width: 836, height: 430 }
const PREVIEW_WIDTH = 260
const PREVIEW_HEIGHT = 150
const AXIS_TICK_COUNT = 5

function axisTicks(
  values: readonly number[],
  mode: ScaleMode,
  range: [number, number],
): AxisTick[] {
  const domain = fieldScaleDomain(values, mode)
  const scale = mode === 'log'
    ? scaleLog().domain(domain).range(range)
    : scaleLinear().domain(domain).range(range)
  return Array.from({ length: AXIS_TICK_COUNT }, (_, index) => {
    const fraction = index / (AXIS_TICK_COUNT - 1)
    const value = mode === 'log'
      ? Math.exp(Math.log(domain[0]) + fraction * (Math.log(domain[1]) - Math.log(domain[0])))
      : domain[0] + fraction * (domain[1] - domain[0])
    return { value, position: scale(value) }
  })
}

function pointAtEvent(
  event: PointerEvent<SVGRectElement>,
  projected: readonly ProjectedFieldPoint[],
): ProjectedFieldPoint | null {
  const rectangle = event.currentTarget.getBoundingClientRect()
  if (rectangle.width <= 0 || rectangle.height <= 0) return null
  const x = PLOT.x + ((event.clientX - rectangle.left) / rectangle.width) * PLOT.width
  const y = PLOT.y + ((event.clientY - rectangle.top) / rectangle.height) * PLOT.height
  const tolerance = 24 * Math.max(PLOT.width / rectangle.width, PLOT.height / rectangle.height)
  return nearestProjectedPoint(projected, { x, y }, tolerance)
}

function Preview({ point }: { point: ProjectedFieldPoint }) {
  const clamped = clampPreview(
    {
      x: point.x + 14,
      y: point.y - PREVIEW_HEIGHT / 2,
      width: PREVIEW_WIDTH,
      height: PREVIEW_HEIGHT,
    },
    { x: 0, y: 0, width: WIDTH, height: HEIGHT },
  )
  return (
    <div
      className="field-education-scatter__preview"
      role="group"
      aria-label={`Náhľad odboru ${point.canonicalLabel}`}
      data-preview-x={clamped.x}
      data-preview-y={clamped.y}
      style={{
        left: `${(clamped.x / WIDTH) * 100}%`,
        top: `${(clamped.y / HEIGHT) * 100}%`,
      }}
    >
      <strong>{point.canonicalLabel}</strong>
      <dl>
        <div>
          <dt>Vymenovania</dt>
          <dd>{formatNumber(point.appointmentCount)}</dd>
        </div>
        <div>
          <dt>Absolventi</dt>
          <dd>{formatNumber(point.graduateCount)}</dd>
        </div>
        <div>
          <dt>Absolventi / vymenovanie</dt>
          <dd>{formatNumber(point.graduatesPerAppointment, { maximumFractionDigits: 1 })}</dd>
        </div>
      </dl>
      <p>Presne priradené vymenovania {formatNumber(point.exactAppointmentCount)}</p>
      {point.aliasAppointmentCount > 0 ? (
        <p>Aliasom obnovené vymenovania {formatNumber(point.aliasAppointmentCount)}</p>
      ) : null}
      {point.collisionKeys.length > 1 ? (
        <p>Rovnaké analytické súradnice: {formatNumber(point.collisionKeys.length)} odbory</p>
      ) : null}
    </div>
  )
}

export default function FieldEducationScatter({
  points,
  selectedField,
  onFieldSelect,
}: FieldEducationScatterProps) {
  const [mode, setMode] = useState<ScaleMode>('log')
  const [hoveredKey, setHoveredKey] = useState<string | null>(null)
  const initialKey = selectedField !== null && points.some(({ fieldKey }) => fieldKey === selectedField)
    ? selectedField
    : points[0]?.fieldKey ?? null
  const [activeKey, setActiveKey] = useState<string | null>(initialKey)
  const projected = useMemo(() => projectFieldPoints(points, PLOT, mode), [mode, points])
  const projectedByKey = useMemo(
    () => new Map(projected.map((point) => [point.fieldKey, point] as const)),
    [projected],
  )
  const keyboardOrder = useMemo(
    () => [...projected].sort((left, right) => left.fieldKey.localeCompare(right.fieldKey)),
    [projected],
  )
  const labelKeys = useMemo(
    () => generatedLabelKeys(points, selectedField),
    [points, selectedField],
  )
  const xTicks = useMemo(
    () => axisTicks(points.map(({ appointmentCount }) => appointmentCount), mode, [PLOT.x, PLOT.x + PLOT.width]),
    [mode, points],
  )
  const yTicks = useMemo(
    () => axisTicks(points.map(({ graduateCount }) => graduateCount), mode, [PLOT.y + PLOT.height, PLOT.y]),
    [mode, points],
  )

  useEffect(() => {
    setActiveKey((current) => {
      if (selectedField !== null && projectedByKey.has(selectedField)) return selectedField
      if (current !== null && projectedByKey.has(current)) return current
      return projected[0]?.fieldKey ?? null
    })
  }, [projected, projectedByKey, selectedField])

  if (projected.length === 0) {
    return <p className="field-education-scatter__empty" role="status">Pre mapu odborov nie sú dostupné žiadne spárované údaje.</p>
  }

  const inspectedKey = hoveredKey ?? selectedField ?? activeKey
  const inspected = inspectedKey === null ? null : projectedByKey.get(inspectedKey) ?? null
  const selected = selectedField === null ? null : projectedByKey.get(selectedField) ?? null

  const handlePointerMove = (event: PointerEvent<SVGRectElement>) => {
    setHoveredKey(pointAtEvent(event, projected)?.fieldKey ?? null)
  }
  const handlePointerUp = (event: PointerEvent<SVGRectElement>) => {
    const point = pointAtEvent(event, projected)
    if (point !== null) {
      setActiveKey(point.fieldKey)
      onFieldSelect(point.fieldKey)
    }
  }
  const handleKeyDown = (event: KeyboardEvent<SVGRectElement>) => {
    if (activeKey === null) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onFieldSelect(activeKey)
      return
    }
    const directions: Partial<Record<string, Direction>> = {
      ArrowLeft: 'left',
      ArrowRight: 'right',
      ArrowUp: 'up',
      ArrowDown: 'down',
    }
    const direction = directions[event.key]
    let nextKey: string | null = null
    if (direction !== undefined) nextKey = nextDirectionalPoint(projected, activeKey, direction)
    else if (event.key === 'Home') nextKey = keyboardOrder[0]?.fieldKey ?? activeKey
    else if (event.key === 'End') nextKey = keyboardOrder.at(-1)?.fieldKey ?? activeKey
    if (nextKey !== null) {
      event.preventDefault()
      setHoveredKey(null)
      setActiveKey(nextKey)
    }
  }

  return (
    <figure className="field-education-scatter" aria-labelledby="field-education-scatter-title">
      <figcaption>
        <div>
          <p className="eyebrow">Pevné obdobie 2009 – 2025</p>
          <h3 id="field-education-scatter-title">Profesorské vymenovania × absolventi</h3>
        </div>
        <div className="field-education-scatter__modes" aria-label="Mierka mapy odborov">
          <button type="button" aria-pressed={mode === 'log'} onClick={() => setMode('log')}>Logaritmická</button>
          <button type="button" aria-pressed={mode === 'linear'} onClick={() => setMode('linear')}>Absolútna</button>
        </div>
      </figcaption>
      <div className="field-education-scatter__stage">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-label="Bodová mapa vymenovaní a absolventov podľa odboru">
          <g className="field-education-scatter__grid" aria-hidden="true">
            {xTicks.map((tick, index) => (
              <g key={`x-${index}`}>
                <line x1={tick.position} x2={tick.position} y1={PLOT.y} y2={PLOT.y + PLOT.height} />
                <text x={tick.position} y={PLOT.y + PLOT.height + 24} textAnchor="middle">{formatNumber(tick.value, { maximumFractionDigits: 0 })}</text>
              </g>
            ))}
            {yTicks.map((tick, index) => (
              <g key={`y-${index}`}>
                <line x1={PLOT.x} x2={PLOT.x + PLOT.width} y1={tick.position} y2={tick.position} />
                <text x={PLOT.x - 12} y={tick.position + 4} textAnchor="end">{formatNumber(tick.value, { maximumFractionDigits: 0 })}</text>
              </g>
            ))}
          </g>
          <text className="field-education-scatter__axis-label" x={PLOT.x + PLOT.width / 2} y={HEIGHT - 12} textAnchor="middle">Profesorské vymenovania</text>
          <text className="field-education-scatter__axis-label" transform={`translate(18 ${PLOT.y + PLOT.height / 2}) rotate(-90)`} textAnchor="middle">Absolventi</text>
          {selected === null ? null : (
            <g className="field-education-scatter__selection" aria-hidden="true">
              <line x1={selected.x} x2={selected.x} y1={PLOT.y} y2={PLOT.y + PLOT.height} />
              <line x1={PLOT.x} x2={PLOT.x + PLOT.width} y1={selected.y} y2={selected.y} />
              <circle cx={selected.x} cy={selected.y} r={9} />
            </g>
          )}
          <g aria-hidden="true">
            {projected.map((point) => (
              <circle
                key={point.fieldKey}
                data-testid={`field-point-${point.fieldKey}`}
                data-render-x={point.x}
                data-render-y={point.y}
                data-selected={point.fieldKey === selectedField ? 'true' : 'false'}
                className="field-education-scatter__point"
                cx={point.x}
                cy={point.y}
                r={point.fieldKey === selectedField ? 4.5 : 3.2}
              />
            ))}
            {projected.filter(({ fieldKey }) => labelKeys.has(fieldKey)).map((point) => (
              <text key={point.fieldKey} className="field-education-scatter__label" x={point.x + 8} y={point.y - 8}>{point.canonicalLabel}</text>
            ))}
          </g>
          <rect
            className="field-education-scatter__target"
            x={PLOT.x}
            y={PLOT.y}
            width={PLOT.width}
            height={PLOT.height}
            fill="transparent"
            role="button"
            tabIndex={0}
            aria-label="Preskúmať mapu odborov. Šípkami zmeňte aktívny odbor, klávesom Enter alebo medzerníkom ho vyberte."
            onPointerMove={handlePointerMove}
            onPointerLeave={() => setHoveredKey(null)}
            onPointerUp={handlePointerUp}
            onKeyDown={handleKeyDown}
          />
        </svg>
        {inspected === null ? null : <Preview point={inspected} />}
      </div>
      <p className="field-education-scatter__live" aria-live="polite">Aktívny odbor: {activeKey === null ? 'žiadny' : projectedByKey.get(activeKey)?.canonicalLabel ?? activeKey}</p>
    </figure>
  )
}
