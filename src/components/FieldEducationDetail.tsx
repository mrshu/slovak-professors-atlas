import { scaleLinear } from 'd3-scale'
import { line } from 'd3-shape'

import type {
  FieldEducationAnnualValue,
  FieldEducationLandscapeRow,
} from '../analysis/fieldEducation'
import { formatNumber } from '../utils/format'

interface FieldEducationDetailProps {
  row: FieldEducationLandscapeRow
}

const WIDTH = 620
const HEIGHT = 190
const MARGIN = { top: 16, right: 12, bottom: 30, left: 42 }

function AppointmentBars({ annual }: { annual: readonly FieldEducationAnnualValue[] }) {
  const innerWidth = WIDTH - MARGIN.left - MARGIN.right
  const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom
  const maximum = Math.max(1, ...annual.map(({ appointmentCount }) => appointmentCount))
  const y = scaleLinear().domain([0, maximum]).range([MARGIN.top + innerHeight, MARGIN.top])
  const step = innerWidth / Math.max(annual.length, 1)
  const barWidth = Math.max(2, step * 0.62)

  return (
    <svg
      className="field-education-detail__chart"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label="Ročné profesorské vymenovania vo vybranom odbore"
    >
      <line
        className="field-education-detail__baseline"
        x1={MARGIN.left}
        x2={MARGIN.left + innerWidth}
        y1={MARGIN.top + innerHeight}
        y2={MARGIN.top + innerHeight}
      />
      {annual.map((value, index) => {
        const x = MARGIN.left + index * step + (step - barWidth) / 2
        const top = y(value.appointmentCount)
        return (
          <rect
            key={value.year}
            data-testid="annual-appointment-bar"
            className="field-education-detail__bar"
            x={x}
            y={top}
            width={barWidth}
            height={MARGIN.top + innerHeight - top}
          >
            <title>{value.year}: {formatNumber(value.appointmentCount)} vymenovaní</title>
          </rect>
        )
      })}
      <text x={MARGIN.left} y={HEIGHT - 8}>2009</text>
      <text x={MARGIN.left + innerWidth} y={HEIGHT - 8} textAnchor="end">2025</text>
    </svg>
  )
}

function GraduateLine({ annual }: { annual: readonly FieldEducationAnnualValue[] }) {
  const available = annual.filter(
    (value): value is FieldEducationAnnualValue & { graduateCount: number } =>
      value.graduateCount !== null,
  )
  if (available.length === 0) return null
  const innerWidth = WIDTH - MARGIN.left - MARGIN.right
  const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom
  const maximum = Math.max(1, ...available.map(({ graduateCount }) => graduateCount))
  const x = scaleLinear()
    .domain([0, Math.max(annual.length - 1, 1)])
    .range([MARGIN.left, MARGIN.left + innerWidth])
  const y = scaleLinear().domain([0, maximum]).range([MARGIN.top + innerHeight, MARGIN.top])
  const path = line<FieldEducationAnnualValue>()
    .defined(({ graduateCount }) => graduateCount !== null)
    .x((_, index) => x(index))
    .y(({ graduateCount }) => y(graduateCount ?? 0))(annual)

  return (
    <svg
      className="field-education-detail__chart"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label="Roční absolventi vo vybranom odbore; medzery znamenajú chýbajúce spárovanie"
    >
      <line
        className="field-education-detail__baseline"
        x1={MARGIN.left}
        x2={MARGIN.left + innerWidth}
        y1={MARGIN.top + innerHeight}
        y2={MARGIN.top + innerHeight}
      />
      <path
        data-testid="annual-graduate-path"
        className="field-education-detail__line"
        d={path ?? undefined}
      />
      {annual.map((value, index) =>
        value.graduateCount === null ? null : (
          <circle
            key={value.year}
            className="field-education-detail__line-point"
            cx={x(index)}
            cy={y(value.graduateCount)}
            r={2.4}
          >
            <title>{value.year}: {formatNumber(value.graduateCount)} absolventov</title>
          </circle>
        ),
      )}
      <text x={MARGIN.left} y={HEIGHT - 8}>2009</text>
      <text x={MARGIN.left + innerWidth} y={HEIGHT - 8} textAnchor="end">2025</text>
    </svg>
  )
}

export default function FieldEducationDetail({ row }: FieldEducationDetailProps) {
  const hasGraduates = row.graduateCount !== null && row.graduatesPerAppointment !== null
  return (
    <article className="field-education-detail" aria-labelledby={`field-detail-${row.fieldKey}`}>
      <p className="eyebrow">Vybraný odbor</p>
      <h3 id={`field-detail-${row.fieldKey}`}>{row.canonicalLabel}</h3>
      <dl className="field-education-detail__totals">
        <div>
          <dt>Vymenovania 2009 – 2025</dt>
          <dd>{formatNumber(row.appointmentCount)}</dd>
        </div>
        <div>
          <dt>Absolventi 2009 – 2025</dt>
          <dd>{row.graduateCount === null ? 'nedostupné' : formatNumber(row.graduateCount)}</dd>
        </div>
        <div>
          <dt>Absolventi / vymenovanie</dt>
          <dd>
            {row.graduatesPerAppointment === null
              ? 'nedostupné'
              : formatNumber(row.graduatesPerAppointment, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
          </dd>
          <p>Opisný pomer dvoch tokov za spoločné obdobie.</p>
        </div>
        <div>
          <dt>Aktuálni študenti</dt>
          <dd>{row.currentStudentCount === null ? 'nedostupné' : formatNumber(row.currentStudentCount)}</dd>
          <p>Stav k 31. 10. 2025 · kontext, nie súčasť osi.</p>
        </div>
      </dl>
      {hasGraduates ? null : (
        <p className="field-education-detail__missing">
          Údaje o absolventoch nie sú pre tento kľúč spárované.
        </p>
      )}
      {row.currentStudentCount === null ? (
        <p className="field-education-detail__missing">
          Stav študentov nie je pre tento kľúč spárovaný.
        </p>
      ) : null}
      <section className="field-education-detail__annual" aria-labelledby={`appointments-${row.fieldKey}`}>
        <h4 id={`appointments-${row.fieldKey}`}>Vymenovania po rokoch</h4>
        <AppointmentBars annual={row.annual} />
      </section>
      {hasGraduates ? (
        <section className="field-education-detail__annual" aria-labelledby={`graduates-${row.fieldKey}`}>
          <h4 id={`graduates-${row.fieldKey}`}>Absolventi po rokoch</h4>
          <GraduateLine annual={row.annual} />
          {row.annual.some(({ graduateCount }) => graduateCount === null) ? (
            <p>Prerušenie čiary označuje rok bez spárovaného údaja.</p>
          ) : null}
        </section>
      ) : null}
    </article>
  )
}
