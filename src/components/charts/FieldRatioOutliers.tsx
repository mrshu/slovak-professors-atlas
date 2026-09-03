import { scaleLog } from 'd3-scale'

import type { FieldRatioRow } from '../../analysis/findings'
import { formatNumber } from '../../utils/format'

const W = 380
const M = { t: 34, b: 18 }
const TRACK_L = 6
const TRACK_R = 330
const RIGHT = 374
const ROW = 27
const GAP = 14
const LABEL_MAX = 58

interface FieldRatioOutliersProps {
  lowest: readonly FieldRatioRow[]
  highest: FieldRatioRow | null
  all: readonly FieldRatioRow[]
  median: number | null
  onSelect: (fieldKey: string) => void
}

function shorten(label: string): string {
  return label.length <= LABEL_MAX ? label : `${label.slice(0, LABEL_MAX - 1).trimEnd()}…`
}

export function ratioText(value: number): string {
  return value < 20
    ? formatNumber(value, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    : formatNumber(value, { maximumFractionDigits: 0 })
}

function rowTitle(row: FieldRatioRow): string {
  return `${formatNumber(row.graduates)} absolventov a ${formatNumber(row.appointments)} vymenovaní v ${formatNumber(row.coveredYears)} rokoch s dátami`
}

export default function FieldRatioOutliers({
  lowest,
  highest,
  all,
  median,
  onSelect,
}: FieldRatioOutliersProps) {
  if (lowest.length === 0 || highest === null) return null
  const values = all.map((row) => row.graduatesPerAppointment)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const x = scaleLog().domain([min / 1.6, max * 1.15]).range([TRACK_L, TRACK_R])
  const ticks = [10, 100, 1000].filter((tick) => tick >= min / 1.6 && tick <= max * 1.15)
  const H = M.t + lowest.length * ROW + GAP + ROW + M.b
  const rowY = (index: number) => M.t + index * ROW

  const nearRightEdge = (value: number) => x(value) + 48 > RIGHT
  const valueX = (value: number) => (nearRightEdge(value) ? x(value) - 10 : x(value) + 10)
  const valueAnchor = (value: number) => (nearRightEdge(value) ? 'end' : 'start')

  const renderRow = (row: FieldRatioRow, y: number, muted: boolean, note?: string) => (
    <g
      key={row.fieldKey}
      role="button"
      tabIndex={0}
      className="chart__row"
      aria-label={`${row.label}: ${ratioText(row.graduatesPerAppointment)} absolventov na jedno vymenovanie, ${rowTitle(row)}; vybrať odbor`}
      onClick={() => onSelect(row.fieldKey)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect(row.fieldKey)
        }
      }}
    >
      <title>{rowTitle(row)}</title>
      <rect
        className="chart__row-hit"
        x={TRACK_L - 6}
        y={y - 4}
        width={RIGHT - TRACK_L + 12}
        height={ROW - 2}
        rx={2}
      />
      <text className="chart__tick chart__tick--ink" x={TRACK_L} y={y + 9}>
        {shorten(row.label)}
      </text>
      {note === undefined ? null : (
        <text className="chart__note" x={RIGHT} y={y + 9} textAnchor="end">
          {note}
        </text>
      )}
      <line className="chart__track" x1={TRACK_L} x2={TRACK_R} y1={y + 19} y2={y + 19} />
      <line
        className={muted ? 'chart__stem chart__stem--muted' : 'chart__stem'}
        x1={TRACK_L}
        x2={x(row.graduatesPerAppointment)}
        y1={y + 19}
        y2={y + 19}
      />
      <circle
        className={muted ? 'chart__dot chart__dot--muted' : 'chart__dot chart__dot--1'}
        cx={x(row.graduatesPerAppointment)}
        cy={y + 19}
        r={5}
      />
      <text
        className="chart__value"
        x={valueX(row.graduatesPerAppointment)}
        y={y + 23}
        textAnchor={valueAnchor(row.graduatesPerAppointment)}
      >
        {ratioText(row.graduatesPerAppointment)}
      </text>
    </g>
  )

  const separatorY = M.t + lowest.length * ROW + GAP / 2

  return (
    <svg
      className="chart"
      viewBox={`0 0 ${W} ${H}`}
      role="group"
      aria-label="Odbory s najnižším počtom absolventov na jedno vymenovanie"
    >
      {ticks.map((tick) => (
        <g key={tick}>
          <line className="chart__grid" x1={x(tick)} x2={x(tick)} y1={M.t - 22} y2={H - M.b} />
          <text className="chart__tick" x={x(tick)} y={M.t - 26} textAnchor="middle">
            {formatNumber(tick)}
          </text>
        </g>
      ))}
      {all.map((row) => (
        <line
          key={row.fieldKey}
          className="chart__rug"
          x1={x(row.graduatesPerAppointment)}
          x2={x(row.graduatesPerAppointment)}
          y1={M.t - 20}
          y2={M.t - 12}
        />
      ))}
      {median !== null && (
        <g>
          <line className="chart__marker" x1={x(median)} x2={x(median)} y1={M.t - 22} y2={H - M.b} />
          <text className="chart__note" x={x(median)} y={H - 6} textAnchor="middle">
            medián {formatNumber(median, { maximumFractionDigits: 0 })}
          </text>
        </g>
      )}
      {lowest.map((row, index) => renderRow(row, rowY(index), false))}
      <line className="chart__separator" x1={TRACK_L} x2={RIGHT} y1={separatorY} y2={separatorY} />
      {renderRow(highest, M.t + lowest.length * ROW + GAP, true, 'najvyšší pomer')}
    </svg>
  )
}
