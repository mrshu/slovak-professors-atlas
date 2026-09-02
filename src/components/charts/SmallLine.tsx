import { scaleLinear } from 'd3-scale'
import { line } from 'd3-shape'

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
}

const W = 370
const H = 160
const M = { l: 40, r: 56, t: 16, b: 26 }

export default function SmallLine({
  points,
  format,
  ariaLabel,
  markerYear,
  markerLabel,
  colorClass,
}: SmallLineProps) {
  if (points.length === 0) return null
  const first = points[0]!
  const last = points[points.length - 1]!
  const max = Math.max(...points.map(({ value }) => value))
  const x = scaleLinear().domain([first.year, Math.max(first.year + 1, last.year)]).range([M.l, W - M.r])
  const y = scaleLinear().domain([0, max]).nice(2).range([H - M.b, M.t])
  const path = line<Point>().x((p) => x(p.year)).y((p) => y(p.value))(points) ?? undefined
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel}>
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
      {points.map((p) => (
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
    </svg>
  )
}
