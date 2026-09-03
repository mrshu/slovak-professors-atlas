import type { ContextYear } from '../data/types'
import { formatNumber } from '../utils/format'
import ContextTrend from './ContextTrend'

interface ContextSectionProps {
  years: ContextYear[]
  selectedYear: number
  setSelectedYear: (year: number, mode: 'push') => void
}

interface ScaleMetricDefinition {
  series: 'appointments' | 'internalProfessors' | 'internalTeachers' | 'graduates' | 'students'
  label: string
  value: number
  kind: 'flow' | 'stock'
  detail: string
}

interface CalloutDefinition {
  label: string
  value: string
  dominant: boolean
}

const ratioFormat: Intl.NumberFormatOptions = {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}

const percentageFormat: Intl.NumberFormatOptions = {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
}
const SCALE_MIN = 10
const SCALE_MAX = 1_000_000
const SCALE_MIN_POWER = Math.log10(SCALE_MIN)
const SCALE_MAX_POWER = Math.log10(SCALE_MAX)
const SCALE_VIEWBOX_WIDTH = 900
const SCALE_VIEWBOX_HEIGHT = 390
const SCALE_LEFT = 210
const SCALE_RIGHT = 860
const SCALE_AXIS_Y = 54
const SCALE_FIRST_ROW_Y = 104
const SCALE_ROW_GAP = 61
const scaleTicks = [10, 100, 1_000, 10_000, 100_000, 1_000_000] as const

function scaleX(value: number): number {
  const boundedValue = Math.min(SCALE_MAX, Math.max(SCALE_MIN, value))
  const share =
    (Math.log10(boundedValue) - SCALE_MIN_POWER) / (SCALE_MAX_POWER - SCALE_MIN_POWER)
  return SCALE_LEFT + share * (SCALE_RIGHT - SCALE_LEFT)
}

function scaleMetricLabel(metric: ScaleMetricDefinition): string {
  return `${metric.label}: ${formatNumber(metric.value)}; ${metric.detail}`
}

export function ContextSectionBody({
  years,
  selectedYear,
  setSelectedYear,
}: ContextSectionProps) {
  const selected = years.find(({ year }) => year === selectedYear)
  const latest = years.reduce<ContextYear | null>(
    (current, year) => (current === null || year.year > current.year ? year : current),
    null,
  )

  let scaleMetrics: ScaleMetricDefinition[] = []
  let callouts: CalloutDefinition[] = []
  if (selected !== undefined) {
    scaleMetrics = ([
      {
        series: 'appointments',
        label: 'Vymenovania',
        value: selected.appointments,
        kind: 'flow',
        detail: 'ročný tok',
      },
      {
        series: 'internalProfessors',
        label: 'Interní profesori',
        value: selected.internalProfessors,
        kind: 'stock',
        detail: 'stav k 31. októbru',
      },
      {
        series: 'internalTeachers',
        label: 'Interní učitelia',
        value: selected.internalTeachers,
        kind: 'stock',
        detail: 'stav k 31. októbru',
      },
      {
        series: 'graduates',
        label: 'Absolventi',
        value: selected.graduates,
        kind: 'flow',
        detail: 'ročný tok',
      },
      {
        series: 'students',
        label: 'Študenti',
        value: selected.students,
        kind: 'stock',
        detail: 'stav k 31. októbru',
      },
    ] satisfies ScaleMetricDefinition[]).sort((left, right) => left.value - right.value)
    callouts = [
      {
        label: 'Vymenovania na milión obyvateľov',
        value: formatNumber(selected.appointmentsPerMillionResidents, ratioFormat),
        dominant: true,
      },
      {
        label: 'Interní profesori na 100 000 obyvateľov',
        value: formatNumber(selected.professorsPer100kResidents, ratioFormat),
        dominant: true,
      },
      {
        label: 'Vymenovania na 100 interných profesorov v existujúcom stave',
        value: formatNumber(selected.appointmentsPer100Professors, ratioFormat),
        dominant: false,
      },
      {
        label: 'Podiel profesorov medzi internými učiteľmi',
        value: `${formatNumber(selected.professorShare, percentageFormat)} %`,
        dominant: false,
      },
    ]
  }

  return (
    <>

      <dl className="measurement-key" aria-label="Jednotky kontextového porovnania">
        <div>
          <dt>Vymenovania</dt>
          <dd>tok v kalendárnom roku</dd>
        </div>
        <div>
          <dt>Absolventi</dt>
          <dd>tok I., II. a III. stupňa v kalendárnom roku</dd>
        </div>
        <div>
          <dt>Študenti</dt>
          <dd>stav v akademickom roku k 31. októbru</dd>
        </div>
        <div>
          <dt>Interní učitelia</dt>
          <dd>stav k 31. októbru; metodická zmena od roku 2007</dd>
        </div>
      </dl>

      <div className="context-selection">
        <div className="context-selection__heading">
          <div>
            <p className="eyebrow">Vybraný rok</p>
            <h3>{selectedYear}</h3>
          </div>
          {latest !== null && (
            <p className="context-selection__coverage">
              Najnovší dostupný kontext: {latest.academicYear}
            </p>
          )}
        </div>

        {selected === undefined ? (
          <div className="context-unavailable" role="status">
            <p className="context-unavailable__title">
              Kontext CVTI pre rok {selectedYear} nie je k dispozícii
            </p>
            <p>
              Oficiálny rad sa končí akademickým rokom {latest?.academicYear ?? '2025/2026'}.
              Pre vymenovania v roku {selectedYear} preto nezobrazujeme menovatele ani pomery.
            </p>
          </div>
        ) : (
          <div
            className="context-snapshot"
            role="group"
            aria-label={`Presné národné hodnoty pre rok ${selected.year}`}
          >
            <figure
              className="context-scale"
              aria-label={`Mierkový rebrík národných hodnôt pre rok ${selected.year}`}
            >
              <figcaption className="context-scale__caption">
                <div>
                  <p className="eyebrow">Päť rádov veľkosti</p>
                  <h4>Logaritmická os · základ 10</h4>
                </div>
                <p>
                  Každý krok osi násobí hodnotu desiatimi. Poloha ukazuje veľkosť; presné
                  národné hodnoty zostávajú uvedené pri značkách.
                </p>
              </figcaption>
              <svg
                className="context-scale__chart"
                viewBox={`0 0 ${SCALE_VIEWBOX_WIDTH} ${SCALE_VIEWBOX_HEIGHT}`}
                role="img"
                aria-label={`Logaritmické porovnanie piatich národných hodnôt pre rok ${selected.year}`}
              >
                <title>
                  Logaritmické porovnanie vymenovaní, interných profesorov, interných
                  učiteľov, absolventov a študentov
                </title>
                <desc>
                  Hodnoty sú zoradené od najmenšej po najväčšiu na osi so základom desať.
                  Toky a stavy sa porovnávajú iba ako veľkosti.
                </desc>
                <g className="context-scale__axis" aria-hidden="true">
                  <line
                    x1={SCALE_LEFT}
                    x2={SCALE_RIGHT}
                    y1={SCALE_AXIS_Y}
                    y2={SCALE_AXIS_Y}
                  />
                  {scaleTicks.map((tick, index) => {
                    const x = scaleX(tick)
                    return (
                      <g key={tick} transform={`translate(${x} 0)`}>
                        <line y1={SCALE_AXIS_Y} y2={SCALE_VIEWBOX_HEIGHT - 20} />
                        <text
                          x={0}
                          y={SCALE_AXIS_Y - 16}
                          textAnchor={
                            index === 0
                              ? 'start'
                              : index === scaleTicks.length - 1
                                ? 'end'
                                : 'middle'
                          }
                        >
                          {formatNumber(tick)}
                        </text>
                      </g>
                    )
                  })}
                </g>
                <g
                  className="context-scale__rows"
                  role="list"
                  aria-label="Hodnoty zoradené od najmenšej po najväčšiu"
                >
                  {scaleMetrics.map((metric, index) => {
                    const y = SCALE_FIRST_ROW_Y + index * SCALE_ROW_GAP
                    const x = scaleX(metric.value)
                    const valueOnLeft = x > SCALE_RIGHT - 90
                    return (
                      <g
                        className={`context-scale__row context-scale__row--${metric.kind}`}
                        data-scale-series={metric.series}
                        key={metric.series}
                        role="listitem"
                        aria-label={scaleMetricLabel(metric)}
                      >
                        <text className="context-scale__row-label" x={0} y={y - 7}>
                          {metric.label}
                        </text>
                        <text className="context-scale__row-detail" x={0} y={y + 13}>
                          {metric.detail}
                        </text>
                        <line
                          className="context-scale__rail"
                          x1={SCALE_LEFT}
                          x2={x}
                          y1={y}
                          y2={y}
                          aria-hidden="true"
                        />
                        <circle
                          className="context-scale__mark"
                          cx={x}
                          cy={y}
                          r={6}
                          aria-hidden="true"
                        />
                        <text
                          className="context-scale__value"
                          x={x + (valueOnLeft ? -12 : 12)}
                          y={y - 10}
                          textAnchor={valueOnLeft ? 'end' : 'start'}
                          aria-hidden="true"
                        >
                          {formatNumber(metric.value)}
                        </text>
                      </g>
                    )
                  })}
                </g>
              </svg>
            </figure>

            <dl
              className="context-callouts"
              aria-label={`Národné pomery pre rok ${selected.year}`}
            >
              {callouts.map((callout) => (
                <div
                  className={`context-callout${
                    callout.dominant ? ' context-callout--dominant' : ''
                  }`}
                  key={callout.label}
                >
                  <dt>{callout.label}</dt>
                  <dd>{callout.value}</dd>
                </div>
              ))}
            </dl>
            <p className="context-callouts__population">
              Národné obyvateľstvo v roku {selected.year}: {formatNumber(selected.population)}
            </p>
            <aside
              className="context-scale__caveat"
              role="note"
              aria-label="Ako čítať mierkový rebrík"
            >
              <p>
                Toky a stavy sú odlišné typy veličín: vymenovania a absolventi sú ročné
                toky, kým študenti, interní učitelia a interní profesori sú stavy k 31.
                októbru. Rebrík porovnáva iba ich rád veľkosti. Nejde o lievik, konverziu
                ani príčinný reťazec.
              </p>
            </aside>
          </div>
        )}
      </div>

      <ContextTrend
        years={years}
        selectedYear={selectedYear}
        setSelectedYear={setSelectedYear}
      />
    </>
  )
}

