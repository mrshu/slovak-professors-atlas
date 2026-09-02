import { scaleLinear } from 'd3-scale'
import { line } from 'd3-shape'

import type { TitleShareYear } from '../../analysis/findings'
import { formatNumber } from '../../utils/format'

const W = 380
const H = 190
const M = { l: 34, r: 64, t: 14, b: 22 }
const SERIES = [
  { key: 'phd', label: 'PhD.', className: 'chart__line chart__line--1', dash: undefined },
  { key: 'csc', label: 'CSc.', className: 'chart__line chart__line--2', dash: '6 4' },
  { key: 'drsc', label: 'DrSc.', className: 'chart__line chart__line--3', dash: '2 3' },
] as const

interface TitlesChartProps {
  rows: readonly TitleShareYear[]
  crossoverYear: number | null
}

export default function TitlesChart({ rows, crossoverYear }: TitlesChartProps) {
  if (rows.length === 0) return null
  const first = rows[0]!.year
  const last = rows[rows.length - 1]!
  const x = scaleLinear().domain([first, Math.max(first + 1, last.year)]).range([M.l, W - M.r])
  const y = scaleLinear().domain([0, 1]).range([H - M.b, M.t])
  const share = (row: TitleShareYear, key: 'phd' | 'csc' | 'drsc') =>
    row.total === 0 ? 0 : row[key] / row.total
  const ends = SERIES.map((series) => ({ key: series.key, y: y(share(last, series.key)) + 4 })).sort(
    (a, b) => a.y - b.y,
  )
  for (let index = 1; index < ends.length; index += 1) {
    if (ends[index]!.y - ends[index - 1]!.y < 13) ends[index]!.y = ends[index - 1]!.y + 13
  }
  return (
    <svg
      className="chart"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Podiel hodností PhD., CSc. a DrSc. medzi ročnými vymenovaniami"
    >
      {[0, 0.5, 1].map((value) => (
        <g key={value}>
          <line className="chart__grid" x1={M.l} x2={W - M.r} y1={y(value)} y2={y(value)} />
          <text className="chart__tick" x={M.l - 6} y={y(value) + 4} textAnchor="end">
            {formatNumber(value * 100)} %
          </text>
        </g>
      ))}
      {[first, 2010, 2020]
        .filter((year) => year >= first && year <= last.year)
        .map((year) => (
          <text key={year} className="chart__tick" x={x(year)} y={H - 6} textAnchor="middle">
            {year}
          </text>
        ))}
      {crossoverYear !== null && (
        <g>
          <line className="chart__marker" x1={x(crossoverYear)} x2={x(crossoverYear)} y1={M.t} y2={H - M.b} />
          <text className="chart__annotation" x={x(crossoverYear) + 5} y={M.t + 9}>
            {crossoverYear}
          </text>
        </g>
      )}
      {SERIES.map((series) => {
        const path =
          line<TitleShareYear>()
            .x((row) => x(row.year))
            .y((row) => y(share(row, series.key)))(rows) ?? undefined
        const end = ends.find((entry) => entry.key === series.key)!
        return (
          <g key={series.key}>
            <path className={series.className} d={path} strokeDasharray={series.dash} />
            <text className="chart__value" x={W - M.r + 6} y={end.y}>
              {series.label} {formatNumber(share(last, series.key) * 100)} %
            </text>
          </g>
        )
      })}
    </svg>
  )
}
