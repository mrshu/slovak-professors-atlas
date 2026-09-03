import { scaleLinear } from 'd3-scale'

import type { FieldShareRow } from '../../analysis/findings'
import { formatNumber } from '../../utils/format'

const W = 380
const M = { l: 150, r: 14, t: 18, b: 4 }
const ROW = 21

function pct(value: number): string {
  return `${formatNumber(value * 100, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`
}

interface FieldDumbbellProps {
  rows: readonly FieldShareRow[]
  onSelect: (fieldKey: string) => void
}

export default function FieldDumbbell({ rows, onSelect }: FieldDumbbellProps) {
  const H = M.t + rows.length * ROW + M.b
  const x = scaleLinear().domain([0, 0.2]).range([M.l, W - M.r])
  return (
    <svg
      className="chart"
      viewBox={`0 0 ${W} ${H}`}
      role="group"
      aria-label="Podiel odboru na absolventoch a na vymenovaniach"
    >
      {[0, 0.1, 0.2].map((value) => (
        <g key={value}>
          <line className="chart__grid" x1={x(value)} x2={x(value)} y1={M.t - 4} y2={H - M.b} />
          <text className="chart__tick" x={x(value)} y={M.t - 8} textAnchor="middle">
            {formatNumber(value * 100)} %
          </text>
        </g>
      ))}
      {rows.map((row, index) => {
        const cy = M.t + index * ROW + ROW / 2
        return (
          <g
            key={row.fieldKey}
            role="button"
            tabIndex={0}
            className="chart__row"
            aria-label={`${row.label}: ${pct(row.graduateShare)} absolventov, ${pct(row.appointmentShare)} vymenovaní; vybrať odbor`}
            onClick={() => onSelect(row.fieldKey)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onSelect(row.fieldKey)
              }
            }}
          >
            <rect
              className="chart__row-hit"
              x={0}
              y={cy - ROW / 2}
              width={W}
              height={ROW - 1}
              rx={2}
            />
            <text className="chart__tick chart__tick--ink" x={M.l - 10} y={cy + 3.5} textAnchor="end">
              {row.label}
            </text>
            <line
              className="chart__connector"
              x1={x(Math.min(row.appointmentShare, 0.2))}
              x2={x(Math.min(row.graduateShare, 0.2))}
              y1={cy}
              y2={cy}
            />
            <circle className="chart__dot chart__dot--2" cx={x(Math.min(row.graduateShare, 0.2))} cy={cy} r={5} />
            <circle className="chart__dot chart__dot--1" cx={x(Math.min(row.appointmentShare, 0.2))} cy={cy} r={5} />
          </g>
        )
      })}
    </svg>
  )
}
