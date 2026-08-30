import { arc, pie, type PieArcDatum } from 'd3-shape'
import { useMemo } from 'react'

import type { FieldEducationLandscapeRow } from '../analysis/fieldEducation'
import { formatNumber } from '../utils/format'

interface FieldEducationRankingDonutsProps {
  rows: readonly FieldEducationLandscapeRow[]
}

interface DonutSlice {
  key: string
  label: string
  value: number
}

type AdditiveMetric = 'appointments' | 'graduates'

const LEADING_SLICE_COUNT = 7
const SIZE = 180
const CENTER = SIZE / 2

function metricValue(row: FieldEducationLandscapeRow, metric: AdditiveMetric): number | null {
  return metric === 'appointments' ? row.appointmentCount : row.graduateCount
}

function donutSlices(
  rows: readonly FieldEducationLandscapeRow[],
  metric: AdditiveMetric,
): DonutSlice[] {
  const ranked = rows
    .flatMap((row) => {
      const value = metricValue(row, metric)
      return value !== null && value > 0
        ? [{ key: row.fieldKey, label: row.canonicalLabel, value }]
        : []
    })
    .sort((left, right) => right.value - left.value || left.label.localeCompare(right.label, 'sk-SK'))
  const leading = ranked.slice(0, LEADING_SLICE_COUNT)
  const remainder = ranked.slice(LEADING_SLICE_COUNT).reduce(
    (total, slice) => total + slice.value,
    0,
  )
  return remainder > 0
    ? [...leading, { key: '__other__', label: 'Ostatné odbory', value: remainder }]
    : leading
}

function Donut({
  title,
  ariaLabel,
  slices,
}: {
  title: string
  ariaLabel: string
  slices: readonly DonutSlice[]
}) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0)
  const segments = pie<DonutSlice>()
    .sort(null)
    .value(({ value }) => value)([...slices])
  const path = arc<PieArcDatum<DonutSlice>>().innerRadius(48).outerRadius(78)

  return (
    <figure className="field-education-rankings__donut">
      <figcaption>{title}</figcaption>
      {segments.length === 0 ? (
        <p>Pre tento výber nie sú dostupné kladné hodnoty.</p>
      ) : (
        <div className="field-education-rankings__donut-body">
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={ariaLabel}>
            <g transform={`translate(${CENTER} ${CENTER})`}>
              {segments.map((segment, index) => (
                <path
                  key={segment.data.key}
                  data-donut-slice={segment.data.key}
                  className={`field-education-rankings__donut-slice field-education-rankings__donut-slice--${index % 8}`}
                  d={path(segment) ?? undefined}
                >
                  <title>
                    {segment.data.label}: {formatNumber(segment.data.value)} ·{' '}
                    {formatNumber((segment.data.value / total) * 100, { maximumFractionDigits: 1 })} %
                  </title>
                </path>
              ))}
            </g>
          </svg>
          <ol>
            {slices.map((slice, index) => (
              <li key={slice.key}>
                <span
                  aria-hidden="true"
                  className={`field-education-rankings__donut-key field-education-rankings__donut-key--${index % 8}`}
                />
                <span>{slice.label}</span>
                <strong>{formatNumber(slice.value)}</strong>
                <small>
                  {formatNumber((slice.value / total) * 100, { maximumFractionDigits: 1 })} %
                </small>
              </li>
            ))}
          </ol>
        </div>
      )}
    </figure>
  )
}

export default function FieldEducationRankingDonuts({
  rows,
}: FieldEducationRankingDonutsProps) {
  const appointmentSlices = useMemo(() => donutSlices(rows, 'appointments'), [rows])
  const graduateSlices = useMemo(() => donutSlices(rows, 'graduates'), [rows])

  return (
    <div className="field-education-rankings__donuts" aria-label="Podiely v rebríčkoch odborov">
      <Donut
        title="Podiel vymenovaní"
        ariaLabel="Podiel vymenovaní podľa odboru"
        slices={appointmentSlices}
      />
      <Donut
        title="Podiel absolventov"
        ariaLabel="Podiel absolventov podľa odboru"
        slices={graduateSlices}
      />
    </div>
  )
}
