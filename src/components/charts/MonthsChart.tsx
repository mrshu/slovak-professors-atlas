import { scaleLinear } from 'd3-scale'

import type { MonthTotal } from '../../analysis/findings'
import { formatNumber } from '../../utils/format'

const W = 380
const H = 190
const M = { l: 8, r: 8, t: 22, b: 22 }
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'máj', 'jún', 'júl', 'aug', 'sep', 'okt', 'nov', 'dec']

export default function MonthsChart({ totals }: { totals: readonly MonthTotal[] }) {
  const max = Math.max(1, ...totals.map(({ appointments }) => appointments))
  const bw = (W - M.l - M.r) / 12
  const h = scaleLinear().domain([0, max]).range([0, H - M.t - M.b])
  return (
    <svg
      className="chart"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Vymenovania podľa mesiaca slávnosti, november zvýraznený"
    >
      {totals.map((row, index) => {
        const height = h(row.appointments)
        const x = M.l + index * bw + 3
        const november = row.month === 11
        return (
          <g key={row.month}>
            <rect
              className={november ? 'chart__bar chart__bar--accent' : 'chart__bar'}
              x={x}
              y={H - M.b - height}
              width={bw - 6}
              height={height}
            >
              <title>{`${MONTHS[index]}: ${formatNumber(row.appointments)} vymenovaní · ${formatNumber(row.ceremonies)} slávností`}</title>
            </rect>
            <text className="chart__tick" x={x + (bw - 6) / 2} y={H - 6} textAnchor="middle">
              {MONTHS[index]}
            </text>
            {november && (
              <text className="chart__value" x={x + (bw - 6) / 2} y={H - M.b - height - 6} textAnchor="end">
                {formatNumber(row.appointments)} · {formatNumber(row.ceremonies)} slávností
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
