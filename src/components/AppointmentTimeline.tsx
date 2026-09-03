import { scaleLinear, scaleSqrt } from 'd3-scale'
import { useMemo } from 'react'

import { ceremonyCounts, yearCounts } from '../analysis/selectors'
import type { Appointment, President } from '../data/types'
import { formatAppointmentCount, formatDate } from '../utils/format'

interface AppointmentTimelineProps {
  records: readonly Appointment[]
  coverageEnd: string
  presidents: readonly President[]
  selectedPresidentId: string | null
  selectedStartYear: number
  selectedEndYear: number
  onToggleYear: (year: number) => void
}

const START_YEAR = 2000
const END_YEAR = 2026
const YEARS = Array.from({ length: END_YEAR - START_YEAR + 1 }, (_, index) => START_YEAR + index)
const WIDTH = 1080
const HEIGHT = 430
const LEFT = 54
const RIGHT = 24
const BAND_TOP = 30
const BAND_HEIGHT = 66
const BAR_TOP = 154
const BASELINE = 355
const DOMAIN_START = Date.UTC(START_YEAR, 0, 1)
const DOMAIN_END = Date.UTC(END_YEAR + 1, 0, 1)

export default function AppointmentTimeline({
  records,
  coverageEnd,
  presidents,
  selectedPresidentId,
  selectedStartYear,
  selectedEndYear,
  onToggleYear,
}: AppointmentTimelineProps) {
  const annualCounts = useMemo(() => yearCounts(records), [records])
  const ceremonies = useMemo(() => ceremonyCounts(records), [records])
  const countByYear = useMemo(
    () => new Map(annualCounts.map(({ year, count }) => [year, count])),
    [annualCounts],
  )
  const maximumYearCount = Math.max(1, ...annualCounts.map(({ count }) => count))
  const maximumCeremonyCount = Math.max(1, ...ceremonies.map(({ count }) => count))
  const x = useMemo(
    () => scaleLinear().domain([DOMAIN_START, DOMAIN_END]).range([LEFT, WIDTH - RIGHT]),
    [],
  )
  const barHeight = useMemo(
    () => scaleLinear().domain([0, maximumYearCount]).range([0, BASELINE - BAR_TOP]),
    [maximumYearCount],
  )
  const ceremonyRadius = useMemo(
    () => scaleSqrt().domain([1, maximumCeremonyCount]).range([3.5, 9]),
    [maximumCeremonyCount],
  )
  const yearWidth = x(Date.UTC(START_YEAR + 1, 0, 1)) - x(DOMAIN_START)

  return (
    <figure className="appointment-timeline" aria-labelledby="appointment-timeline-title">
      <figcaption>
        <div>
          <p className="card__kicker">Časová os 2000—2026</p>
          <h3 id="appointment-timeline-title">Roky, slávnosti a prezidentské obdobia</h3>
        </div>
        <p>
          Stĺpce a body používajú aktívny výber. Pásy sú historické, s koncom obdobia, ktorý
          patrí už nasledujúcemu prezidentovi.
        </p>
      </figcaption>
      <div className="appointment-timeline__legend" aria-label="Legenda časovej osi">
        <span><i className="appointment-timeline__legend-band" />Prezidentské obdobie</span>
        <span><i className="appointment-timeline__legend-bar" />Vymenovania za rok</span>
        <span><i className="appointment-timeline__legend-dot" />Slávnosť</span>
      </div>
      <div className="appointment-timeline__scroll">
        <svg
          className="appointment-timeline__chart"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          aria-labelledby="appointment-timeline-title"
        >
          <defs>
            <pattern
              id="incomplete-year-hatch"
              width="7"
              height="7"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <line x1="0" y1="0" x2="0" y2="7" />
            </pattern>
          </defs>

          {presidents.map((president, index) => {
            const termStart = Math.max(DOMAIN_START, Date.parse(`${president.from}T00:00:00Z`))
            const termEnd = Math.min(
              DOMAIN_END,
              president.to === null
                ? DOMAIN_END
                : Date.parse(`${president.to}T00:00:00Z`),
            )
            if (termStart >= termEnd) {
              return null
            }
            const label =
              president.to === null
                ? `Prezidentské obdobie ${president.name}: od ${formatDate(president.from)} do súčasnosti`
                : `Prezidentské obdobie ${president.name}: od ${formatDate(president.from)} do ${formatDate(president.to)}, koniec sa nezapočítava`
            const startX = x(termStart)
            const endX = x(termEnd)

            return (
              <g
                className={`appointment-timeline__term appointment-timeline__term--${index % 2 === 0 ? 'even' : 'odd'}${
                  selectedPresidentId === president.id ? ' appointment-timeline__term--selected' : ''
                }`}
                role="img"
                aria-label={label}
                key={president.id}
              >
                <rect x={startX} y={BAND_TOP} width={endX - startX} height={BAND_HEIGHT} />
                <text x={startX + 8} y={BAND_TOP + 25}>
                  {president.name}
                </text>
                <line x1={endX} x2={endX} y1={BAND_TOP} y2={BASELINE + 7} />
              </g>
            )
          })}

          {[0, 0.5, 1].map((ratio) => {
            const value = Math.round(maximumYearCount * ratio)
            const y = BASELINE - barHeight(value)
            return (
              <g className="appointment-timeline__grid" key={ratio} aria-hidden="true">
                <line x1={LEFT} x2={WIDTH - RIGHT} y1={y} y2={y} />
                <text x={LEFT - 8} y={y + 4} textAnchor="end">{value}</text>
              </g>
            )
          })}

          {YEARS.map((year) => {
            const count = countByYear.get(year) ?? 0
            const yearStart = x(Date.UTC(year, 0, 1))
            const nextYear = x(Date.UTC(year + 1, 0, 1))
            const height = count === 0 ? 0 : Math.max(2, barHeight(count))
            const selected = selectedStartYear === year && selectedEndYear === year

            return (
              <g
                className={`appointment-timeline__year${
                  selected ? ' appointment-timeline__year--selected' : ''
                }`}
                key={year}
              >
                <rect
                  className={`appointment-timeline__bar${selected ? ' appointment-timeline__bar--selected' : ''}`}
                  x={yearStart + 4}
                  y={BASELINE - height}
                  width={Math.max(2, nextYear - yearStart - 8)}
                  height={height}
                  aria-hidden="true"
                />
                {year === END_YEAR && (
                  <rect
                    className="appointment-timeline__incomplete"
                    x={yearStart + 2}
                    y={BAR_TOP - 13}
                    width={Math.max(4, nextYear - yearStart - 4)}
                    height={BASELINE - BAR_TOP + 13}
                    aria-hidden="true"
                  />
                )}
                {selected && (
                  <rect
                    className="appointment-timeline__selection-outline"
                    x={yearStart + 2}
                    y={BAR_TOP}
                    width={Math.max(4, nextYear - yearStart - 4)}
                    height={BASELINE - BAR_TOP}
                    aria-hidden="true"
                  />
                )}
                {(year - START_YEAR) % 2 === 0 && (
                  <text
                    className="appointment-timeline__year-label"
                    x={(yearStart + nextYear) / 2}
                    y={BASELINE + 25}
                    textAnchor="middle"
                    aria-hidden="true"
                  >
                    {year}
                  </text>
                )}
                <foreignObject
                  x={yearStart}
                  y={BAND_TOP + BAND_HEIGHT}
                  width={nextYear - yearStart}
                  height={BASELINE - BAND_TOP - BAND_HEIGHT + 18}
                >
                  <button
                    className="appointment-timeline__year-target"
                    type="button"
                    aria-label={`Rok ${year}: ${formatAppointmentCount(count)}, ${
                      selected ? 'vybrané' : 'nevybrané'
                    }${year === END_YEAR ? '. Neúplný rok.' : ''}`}
                    aria-pressed={selected}
                    onClick={() => onToggleYear(year)}
                  />
                </foreignObject>
              </g>
            )
          })}

          {ceremonies.map((ceremony) => {
            const year = Number.parseInt(ceremony.appointedOn.slice(0, 4), 10)
            const annualCount = countByYear.get(year) ?? 0
            const y = BASELINE - barHeight(annualCount) - 13
            return (
              <circle
                className="appointment-timeline__ceremony"
                cx={x(Date.parse(`${ceremony.appointedOn}T00:00:00Z`))}
                cy={Math.max(BAND_TOP + BAND_HEIGHT + 16, y)}
                r={ceremonyRadius(ceremony.count)}
                role="img"
                tabIndex={0}
                aria-label={`Slávnosť ${formatDate(ceremony.appointedOn)}: ${formatAppointmentCount(
                  ceremony.count,
                )}`}
                key={ceremony.appointedOn}
              />
            )
          })}

          <line
            className="appointment-timeline__baseline"
            x1={LEFT}
            x2={WIDTH - RIGHT}
            y1={BASELINE}
            y2={BASELINE}
            aria-hidden="true"
          />
          <text
            className="appointment-timeline__incomplete-label"
            x={WIDTH - RIGHT}
            y={HEIGHT - 18}
            textAnchor="end"
            aria-hidden="true"
          >
            2026 · údaje do {formatDate(coverageEnd)}
          </text>
        </svg>
      </div>
      <p className="appointment-timeline__note">
        Rok 2026 je neúplný: zahŕňa vymenovania iba do {formatDate(coverageEnd)}. Bod označuje
        presný dátum slávnosti a jeho veľkosť počet vymenovaní.
      </p>
    </figure>
  )
}
