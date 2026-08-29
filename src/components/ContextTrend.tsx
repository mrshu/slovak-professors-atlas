import { scaleLinear } from 'd3-scale'
import { line } from 'd3-shape'
import { useMemo, useRef, type KeyboardEvent } from 'react'

import type { ContextYear } from '../data/types'
import { formatNumber } from '../utils/format'

interface ContextTrendProps {
  years: ContextYear[]
  selectedYear: number
  setSelectedYear: (year: number, mode: 'push') => void
}

type SeriesKey = 'appointments' | 'graduates' | 'students' | 'internalTeachers'

interface IndexedYear {
  raw: ContextYear
  indices: Record<SeriesKey, number>
}

interface SeriesDefinition {
  key: SeriesKey
  label: string
  color: string
  dash: string
}

const WIDTH = 980
const HEIGHT = 455
const MARGIN = { top: 88, right: 154, bottom: 58, left: 76 }

const SERIES: SeriesDefinition[] = [
  {
    key: 'appointments',
    label: 'Vymenovania',
    color: 'var(--color-terracotta-dark)',
    dash: '12 2',
  },
  {
    key: 'graduates',
    label: 'Absolventi',
    color: 'var(--color-forest)',
    dash: '9 5',
  },
  {
    key: 'students',
    label: 'Študenti',
    color: 'var(--color-brass)',
    dash: '3 5',
  },
  {
    key: 'internalTeachers',
    label: 'Interní učitelia',
    color: 'var(--color-focus)',
    dash: '12 4 2 4',
  },
]

const fixedTwoDecimals: Intl.NumberFormatOptions = {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}

function formatAccessibleNumber(
  value: number,
  options: Intl.NumberFormatOptions = {},
): string {
  return formatNumber(value, options).replace(/[\u00a0\u202f]/g, ' ')
}

function yearLabel(year: IndexedYear): string {
  return [
    `Rok ${year.raw.year}.`,
    `Vymenovania: ${formatAccessibleNumber(year.raw.appointments)}, index ${formatAccessibleNumber(year.indices.appointments, fixedTwoDecimals)}.`,
    `Absolventi: ${formatAccessibleNumber(year.raw.graduates)}, index ${formatAccessibleNumber(year.indices.graduates, fixedTwoDecimals)}.`,
    `Študenti: ${formatAccessibleNumber(year.raw.students)}, index ${formatAccessibleNumber(year.indices.students, fixedTwoDecimals)}.`,
    `Interní učitelia: ${formatAccessibleNumber(year.raw.internalTeachers)}, index ${formatAccessibleNumber(year.indices.internalTeachers, fixedTwoDecimals)}.`,
  ].join(' ')
}

export default function ContextTrend({
  years,
  selectedYear,
  setSelectedYear,
}: ContextTrendProps) {
  const targetRefs = useRef<Array<SVGRectElement | null>>([])
  const chart = useMemo(() => {
    const ordered = [...years].sort((a, b) => a.year - b.year)
    const baseline = ordered.find(({ year }) => year === 2000)
    if (baseline === undefined || ordered.length === 0) {
      return null
    }

    const indexed: IndexedYear[] = ordered.map((year) => ({
      raw: year,
      indices: {
        appointments: (year.appointments / baseline.appointments) * 100,
        graduates: (year.graduates / baseline.graduates) * 100,
        students: (year.students / baseline.students) * 100,
        internalTeachers: (year.internalTeachers / baseline.internalTeachers) * 100,
      },
    }))
    const plotWidth = WIDTH - MARGIN.left - MARGIN.right
    const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom
    const x = scaleLinear()
      .domain([ordered[0].year, ordered.at(-1)?.year ?? ordered[0].year])
      .range([MARGIN.left, MARGIN.left + plotWidth])
    const largestIndex = Math.max(
      ...indexed.flatMap((year) => SERIES.map(({ key }) => year.indices[key])),
    )
    const y = scaleLinear()
      .domain([0, Math.ceil(largestIndex / 25) * 25])
      .nice()
      .range([MARGIN.top + plotHeight, MARGIN.top])

    return {
      indexed,
      x,
      y,
      xTicks: [2000, 2005, 2010, 2015, 2020, 2025].filter(
        (year) => year >= ordered[0].year && year <= (ordered.at(-1)?.year ?? ordered[0].year),
      ),
      yTicks: y.ticks(5),
      plotWidth,
      plotHeight,
    }
  }, [years])

  if (chart === null) {
    return (
      <p className="context-trend__unavailable" role="status">
        Indexovaný trend nemožno zostaviť bez národného východiska za rok 2000.
      </p>
    )
  }

  const { indexed, x, y, xTicks, yTicks, plotWidth, plotHeight } = chart
  const selected = indexed.find(({ raw }) => raw.year === selectedYear)
  const teacherBreakX = x(2007)

  const select = (year: number) => setSelectedYear(year, 'push')
  const handleKeyDown = (event: KeyboardEvent<SVGRectElement>, index: number) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      select(indexed[index].raw.year)
      return
    }

    let nextIndex: number | null = null
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = Math.min(index + 1, indexed.length - 1)
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = Math.max(index - 1, 0)
    } else if (event.key === 'Home') {
      nextIndex = 0
    } else if (event.key === 'End') {
      nextIndex = indexed.length - 1
    }

    if (nextIndex !== null) {
      event.preventDefault()
      targetRefs.current[nextIndex]?.focus()
      select(indexed[nextIndex].raw.year)
    }
  }

  return (
    <figure className="context-trend" aria-labelledby="context-trend-title">
      <figcaption>
        <div>
          <p className="eyebrow">Index 2000 = 100</p>
          <h3 id="context-trend-title">Ako sa národné rady menili od roku 2000</h3>
        </div>
        <p>
          Index porovnáva tempo zmeny rozdielne veľkých radov. Nevyjadruje, že vymenovania
          spôsobili zmenu stavu profesorov alebo učiteľov.
        </p>
      </figcaption>
      <div
        className="context-trend__scroll"
        role="region"
        aria-label="Indexovaný trend podľa rokov; graf možno posúvať vodorovne"
        tabIndex={0}
      >
        <svg
          className="context-trend__chart"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          aria-label="Vymenovania, absolventi, študenti a interní učitelia; index 2000 sa rovná 100"
        >
          <g className="context-trend__legend" aria-label="Legenda radov">
            {SERIES.map((series, index) => {
              const legendX = MARGIN.left + index * 184
              return (
                <g key={series.key} transform={`translate(${legendX} 38)`}>
                  <line
                    x1={0}
                    x2={31}
                    y1={0}
                    y2={0}
                    stroke={series.color}
                    strokeDasharray={series.dash}
                  />
                  <text x={40} y={4}>
                    {series.label}
                  </text>
                </g>
              )
            })}
          </g>

          <g className="context-trend__grid" aria-hidden="true">
            {yTicks.map((tick) => (
              <g key={tick}>
                <line
                  x1={MARGIN.left}
                  x2={MARGIN.left + plotWidth}
                  y1={y(tick)}
                  y2={y(tick)}
                />
                <text x={MARGIN.left - 14} y={y(tick) + 4} textAnchor="end">
                  {formatNumber(tick)}
                </text>
              </g>
            ))}
          </g>

          <g className="context-trend__x-axis" aria-hidden="true">
            <line
              x1={MARGIN.left}
              x2={MARGIN.left + plotWidth}
              y1={MARGIN.top + plotHeight}
              y2={MARGIN.top + plotHeight}
            />
            {xTicks.map((tick) => (
              <g key={tick} transform={`translate(${x(tick)} ${MARGIN.top + plotHeight})`}>
                <line y2={7} />
                <text y={27} textAnchor="middle">
                  {tick}
                </text>
              </g>
            ))}
          </g>

          {teacherBreakX >= MARGIN.left && teacherBreakX <= MARGIN.left + plotWidth && (
            <g className="context-trend__break" aria-hidden="true">
              <line
                x1={teacherBreakX}
                x2={teacherBreakX}
                y1={MARGIN.top}
                y2={MARGIN.top + plotHeight}
              />
              <text x={teacherBreakX + 7} y={MARGIN.top + 15}>
                2007 · zmena definície interných učiteľov
              </text>
            </g>
          )}

          <g className="context-trend__series" aria-hidden="true">
            {SERIES.map((series) => {
              const path = line<IndexedYear>()
                .x((datum) => x(datum.raw.year))
                .y((datum) => y(datum.indices[series.key]))(indexed)
              const last = indexed.at(-1)
              return (
                <g key={series.key}>
                  <path
                    d={path ?? undefined}
                    data-series={series.key}
                    data-baseline-index={indexed[0].indices[series.key]}
                    fill="none"
                    stroke={series.color}
                    strokeDasharray={series.dash}
                  />
                  {last !== undefined && (
                    <text
                      className="context-trend__series-label"
                      x={x(last.raw.year) + 10}
                      y={y(last.indices[series.key]) + 4}
                      fill={series.color}
                    >
                      {series.label}
                    </text>
                  )}
                  {selected !== undefined && (
                    <circle
                      cx={x(selected.raw.year)}
                      cy={y(selected.indices[series.key])}
                      r={4.5}
                      fill="var(--color-paper-light)"
                      stroke={series.color}
                    />
                  )}
                </g>
              )
            })}
          </g>

          <g className="context-trend__targets">
            {indexed.map((year, index) => {
              const currentX = x(year.raw.year)
              const previousX = index === 0 ? MARGIN.left : x(indexed[index - 1].raw.year)
              const nextX =
                index === indexed.length - 1
                  ? MARGIN.left + plotWidth
                  : x(indexed[index + 1].raw.year)
              const left = index === 0 ? MARGIN.left : (previousX + currentX) / 2
              const right =
                index === indexed.length - 1
                  ? MARGIN.left + plotWidth
                  : (currentX + nextX) / 2
              return (
                <rect
                  key={year.raw.year}
                  ref={(node) => {
                    targetRefs.current[index] = node
                  }}
                  className="context-trend__target"
                  x={left}
                  y={MARGIN.top}
                  width={Math.max(1, right - left)}
                  height={plotHeight}
                  fill="transparent"
                  role="button"
                  tabIndex={0}
                  aria-label={yearLabel(year)}
                  aria-pressed={year.raw.year === selectedYear}
                  data-year={year.raw.year}
                  onClick={() => select(year.raw.year)}
                  onKeyDown={(event) => handleKeyDown(event, index)}
                />
              )
            })}
          </g>
        </svg>
      </div>
      <p className="context-trend__definition-note">
        <strong>Metodická hranica 2007.</strong> Od roku 2007 interní učitelia znamenajú
        učiteľov pracujúcich ustanovený týždenný pracovný čas. Časti radu pred a po hranici
        preto nemožno čítať ako úplne rovnakú definíciu.
      </p>
    </figure>
  )
}
