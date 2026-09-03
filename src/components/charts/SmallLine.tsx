import { scaleLinear } from 'd3-scale'
import { line } from 'd3-shape'
import type { KeyboardEvent, PointerEvent } from 'react'

interface Point {
  year: number
  value: number
}

interface SmallLineProps {
  points: readonly Point[]
  format: (value: number) => string
  ariaLabel: string
  markerYear?: number
  markerLabel?: string
  colorClass: 'chart__line--1' | 'chart__line--2'
  activeIndex?: number | null
  onActivate?: (index: number | null) => void
  describedBy?: string
}

const W = 370
const H = 160
const M = { l: 40, r: 56, t: 16, b: 26 }
const TIP_W = 96
const TIP_H = 30

function nextIndexFromKey(key: string, active: number | null, count: number): number | null | undefined {
  switch (key) {
    case 'ArrowRight':
      return Math.min(count - 1, (active ?? -1) + 1)
    case 'ArrowLeft':
      return Math.max(0, (active ?? count) - 1)
    case 'Home':
      return 0
    case 'End':
      return count - 1
    case 'Escape':
      return null
    default:
      return undefined
  }
}

export default function SmallLine({
  points,
  format,
  ariaLabel,
  markerYear,
  markerLabel,
  colorClass,
  activeIndex = null,
  onActivate,
  describedBy,
}: SmallLineProps) {
  if (points.length === 0) return null
  const first = points[0]!
  const last = points[points.length - 1]!
  const max = Math.max(...points.map(({ value }) => value))
  const x = scaleLinear().domain([first.year, Math.max(first.year + 1, last.year)]).range([M.l, W - M.r])
  const y = scaleLinear().domain([0, max]).nice(2).range([H - M.b, M.t])
  const path = line<Point>().x((p) => x(p.year)).y((p) => y(p.value))(points) ?? undefined
  const active = activeIndex === null ? undefined : points[activeIndex]
  const interactive = onActivate !== undefined

  const onPointerMove = (event: PointerEvent<SVGRectElement>) => {
    if (!interactive) return
    const rectangle = event.currentTarget.getBoundingClientRect()
    if (rectangle.width <= 0) return
    const year = x.invert(M.l + ((event.clientX - rectangle.left) / rectangle.width) * (W - M.l - M.r))
    let nearest = 0
    points.forEach((point, index) => {
      if (Math.abs(point.year - year) < Math.abs(points[nearest]!.year - year)) nearest = index
    })
    onActivate(nearest)
  }
  const onKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    if (!interactive) return
    const next = nextIndexFromKey(event.key, activeIndex, points.length)
    if (next === undefined) return
    event.preventDefault()
    onActivate(next)
  }

  const tipX = active === undefined ? 0 : x(active.year) + TIP_W + 8 > W - M.r ? x(active.year) - TIP_W - 8 : x(active.year) + 8

  return (
    <svg
      className="chart chart--interactive"
      viewBox={`0 0 ${W} ${H}`}
      role={interactive ? 'group' : 'img'}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? `${ariaLabel}; šípky vľavo a vpravo prechádzajú rokmi` : ariaLabel}
      aria-describedby={describedBy}
      onKeyDown={onKeyDown}
      onBlur={interactive ? () => onActivate(null) : undefined}
    >
      {y.ticks(2).map((tick) => (
        <g key={tick}>
          <line className="chart__grid" x1={M.l} x2={W - M.r} y1={y(tick)} y2={y(tick)} />
          <text className="chart__tick" x={M.l - 6} y={y(tick) + 4} textAnchor="end">
            {format(tick)}
          </text>
        </g>
      ))}
      {markerYear !== undefined && markerYear > first.year && markerYear < last.year && (
        <g>
          <line className="chart__marker" x1={x(markerYear)} x2={x(markerYear)} y1={M.t} y2={H - M.b} />
          {markerLabel && (
            <text className="chart__tick" x={x(markerYear) + 4} y={M.t + 10}>
              {markerLabel}
            </text>
          )}
        </g>
      )}
      <path className={`chart__line ${colorClass}`} d={path} />
      {!interactive &&
        points.map((p) => (
          <circle key={p.year} className="chart__probe" cx={x(p.year)} cy={y(p.value)} r={6}>
            <title>{`${p.year}: ${format(p.value)}`}</title>
          </circle>
        ))}
      <text className="chart__value" x={x(first.year) + 8} y={y(first.value) - 8}>
        {format(first.value)}
      </text>
      <text className="chart__value" x={x(last.year) + 8} y={y(last.value) + 4}>
        {format(last.value)}
      </text>
      <text className="chart__tick" x={x(first.year)} y={H - 8} textAnchor="start">
        {first.year}
      </text>
      <text className="chart__tick" x={x(last.year)} y={H - 8} textAnchor="end">
        {last.year}
      </text>
      {active !== undefined && (
        <g className="chart__crosshair" aria-hidden="true">
          <line x1={x(active.year)} x2={x(active.year)} y1={M.t} y2={H - M.b} />
          <circle className={`chart__dot chart__dot--${colorClass === 'chart__line--1' ? '1' : '2'}`} cx={x(active.year)} cy={y(active.value)} r={4.5} />
          <g className="chart__tip" transform={`translate(${tipX} ${M.t})`}>
            <rect width={TIP_W} height={TIP_H} rx={2} />
            <text x={8} y={12}>{active.year}</text>
            <text x={8} y={24} className="chart__tip-value">{format(active.value)}</text>
          </g>
        </g>
      )}
      {interactive && (
        <rect
          className="chart__hit"
          x={M.l}
          y={M.t}
          width={W - M.l - M.r}
          height={H - M.t}
          fill="transparent"
          onPointerMove={onPointerMove}
          onPointerLeave={() => onActivate(null)}
        />
      )}
    </svg>
  )
}
