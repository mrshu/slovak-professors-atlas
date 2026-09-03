import { scaleLinear } from 'd3-scale'
import { line } from 'd3-shape'
import { useState, type KeyboardEvent, type PointerEvent } from 'react'

import type {
  FieldEducationAnnualValue,
  FieldEducationLandscapeRow,
} from '../analysis/fieldEducation'
import { formatAppointmentCount, formatNumber } from '../utils/format'

interface FieldEducationDetailProps {
  row: FieldEducationLandscapeRow
}

interface AnnualChartProps {
  annual: readonly FieldEducationAnnualValue[]
  activeIndex: number | null
  onActivate: (index: number | null) => void
  describedBy: string
}

const WIDTH = 620
const HEIGHT = 190
const MARGIN = { top: 16, right: 12, bottom: 30, left: 42 }
const INNER_WIDTH = WIDTH - MARGIN.left - MARGIN.right
const INNER_HEIGHT = HEIGHT - MARGIN.top - MARGIN.bottom
const YEAR_TICK_STEP = 4
const TIP_WIDTH = 118
const TIP_HEIGHT = 30

function AnnualYAxis({
  ticks,
  y,
}: {
  ticks: readonly number[]
  y: (value: number) => number
}) {
  return (
    <g data-axis="y" className="field-education-detail__y-axis" aria-hidden="true">
      <line
        x1={MARGIN.left}
        x2={MARGIN.left}
        y1={MARGIN.top}
        y2={MARGIN.top + INNER_HEIGHT}
      />
      {ticks.map((tick) => (
        <g key={tick} data-axis-tick="y">
          <line
            x1={MARGIN.left - 5}
            x2={MARGIN.left}
            y1={y(tick)}
            y2={y(tick)}
          />
          <text x={MARGIN.left - 8} y={y(tick) + 3} textAnchor="end">
            {formatNumber(tick, { maximumFractionDigits: 0 })}
          </text>
        </g>
      ))}
    </g>
  )
}

function annualPeriod(annual: readonly FieldEducationAnnualValue[]): {
  startYear: number | null
  endYear: number | null
  label: string
} {
  const startYear = annual[0]?.year ?? null
  const endYear = annual.at(-1)?.year ?? null
  return {
    startYear,
    endYear,
    label:
      startYear === null || endYear === null
        ? 'bez dostupného obdobia'
        : startYear === endYear
          ? String(startYear)
          : `${startYear} – ${endYear}`,
  }
}

function yearStep(annual: readonly FieldEducationAnnualValue[]): number {
  return INNER_WIDTH / Math.max(annual.length, 1)
}

function yearCentre(annual: readonly FieldEducationAnnualValue[], index: number): number {
  return MARGIN.left + index * yearStep(annual) + yearStep(annual) / 2
}

function yearTickIndices(annual: readonly FieldEducationAnnualValue[]): number[] {
  if (annual.length === 0) return []
  const first = annual[0]!.year
  const last = annual.length - 1
  const indices = annual
    .map((value, index) => ((value.year - first) % YEAR_TICK_STEP === 0 ? index : -1))
    .filter((index) => index >= 0)
  if (!indices.includes(last) && last - (indices.at(-1) ?? 0) >= 2) indices.push(last)
  return indices
}

function YearAxis({ annual }: { annual: readonly FieldEducationAnnualValue[] }) {
  const step = yearStep(annual)
  return (
    <g className="field-education-detail__x-axis" aria-hidden="true">
      {yearTickIndices(annual).map((index) => (
        <text
          key={annual[index]!.year}
          x={MARGIN.left + index * step + step / 2}
          y={HEIGHT - 8}
          textAnchor="middle"
        >
          {annual[index]!.year}
        </text>
      ))}
    </g>
  )
}

function indexFromPointer(
  event: PointerEvent<SVGRectElement>,
  count: number,
): number | null {
  const rectangle = event.currentTarget.getBoundingClientRect()
  if (rectangle.width <= 0 || count === 0) return null
  const share = (event.clientX - rectangle.left) / rectangle.width
  return Math.min(count - 1, Math.max(0, Math.floor(share * count)))
}

function nextIndexFromKey(
  key: string,
  active: number | null,
  count: number,
): number | null | undefined {
  if (count === 0) return undefined
  switch (key) {
    case 'ArrowRight':
      return Math.min(count - 1, (active ?? -1) + 1)
    case 'ArrowLeft':
      return Math.max(0, (active ?? count) - 1)
    case 'Home':
      return 0
    case 'End':
      return count - 1
    case 'Escape':
      return null
    default:
      return undefined
  }
}

function useYearInteraction(
  annual: readonly FieldEducationAnnualValue[],
  activeIndex: number | null,
  onActivate: (index: number | null) => void,
) {
  const count = annual.length
  return {
    onPointerMove: (event: PointerEvent<SVGRectElement>) =>
      onActivate(indexFromPointer(event, count)),
    onPointerLeave: () => onActivate(null),
    onKeyDown: (event: KeyboardEvent<SVGSVGElement>) => {
      const next = nextIndexFromKey(event.key, activeIndex, count)
      if (next === undefined) return
      event.preventDefault()
      onActivate(next)
    },
    onBlur: () => onActivate(null),
  }
}

function Crosshair({
  annual,
  activeIndex,
  label,
}: {
  annual: readonly FieldEducationAnnualValue[]
  activeIndex: number | null
  label: string
}) {
  if (activeIndex === null || annual[activeIndex] === undefined) return null
  const x = yearCentre(annual, activeIndex)
  const flip = x + TIP_WIDTH + 8 > WIDTH - MARGIN.right
  const tipX = flip ? x - TIP_WIDTH - 8 : x + 8
  return (
    <g className="field-education-detail__crosshair" aria-hidden="true">
      <line x1={x} x2={x} y1={MARGIN.top} y2={MARGIN.top + INNER_HEIGHT} />
      <g className="field-education-detail__tip" transform={`translate(${tipX} ${MARGIN.top})`}>
        <rect width={TIP_WIDTH} height={TIP_HEIGHT} rx={2} />
        <text x={8} y={12}>{annual[activeIndex].year}</text>
        <text x={8} y={24} className="field-education-detail__tip-value">
          {label}
        </text>
      </g>
    </g>
  )
}

function HoverTarget({
  annual,
  activeIndex,
  onActivate,
}: Omit<AnnualChartProps, 'describedBy'>) {
  const interaction = useYearInteraction(annual, activeIndex, onActivate)
  return (
    <rect
      className="field-education-detail__hit"
      x={MARGIN.left}
      y={MARGIN.top}
      width={INNER_WIDTH}
      height={INNER_HEIGHT + MARGIN.bottom}
      fill="transparent"
      onPointerMove={interaction.onPointerMove}
      onPointerLeave={interaction.onPointerLeave}
    />
  )
}

function AppointmentBars({ annual, activeIndex, onActivate, describedBy }: AnnualChartProps) {
  const maximum = Math.max(1, ...annual.map(({ appointmentCount }) => appointmentCount))
  const y = scaleLinear()
    .domain([0, maximum])
    .nice(3)
    .range([MARGIN.top + INNER_HEIGHT, MARGIN.top])
  const yTicks = y.ticks(3)
  const step = yearStep(annual)
  const barWidth = Math.max(2, step * 0.62)
  const interaction = useYearInteraction(annual, activeIndex, onActivate)
  const active = activeIndex === null ? undefined : annual[activeIndex]

  return (
    <svg
      className="field-education-detail__chart"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="group"
      tabIndex={0}
      aria-label="Ročné profesorské vymenovania vo vybranom odbore; šípky vľavo a vpravo prechádzajú rokmi"
      aria-describedby={describedBy}
      onKeyDown={interaction.onKeyDown}
      onBlur={interaction.onBlur}
    >
      <AnnualYAxis ticks={yTicks} y={y} />
      <line
        className="field-education-detail__baseline"
        x1={MARGIN.left}
        x2={MARGIN.left + INNER_WIDTH}
        y1={MARGIN.top + INNER_HEIGHT}
        y2={MARGIN.top + INNER_HEIGHT}
      />
      {annual.map((value, index) => {
        const x = MARGIN.left + index * step + (step - barWidth) / 2
        const top = y(value.appointmentCount)
        return (
          <rect
            key={value.year}
            data-testid="annual-appointment-bar"
            className={`field-education-detail__bar${
              index === activeIndex ? ' field-education-detail__bar--active' : ''
            }`}
            x={x}
            y={top}
            width={barWidth}
            height={MARGIN.top + INNER_HEIGHT - top}
          />
        )
      })}
      <YearAxis annual={annual} />
      <Crosshair
        annual={annual}
        activeIndex={activeIndex}
        label={active === undefined ? '' : formatAppointmentCount(active.appointmentCount)}
      />
      <HoverTarget annual={annual} activeIndex={activeIndex} onActivate={onActivate} />
    </svg>
  )
}

function GraduateLine({ annual, activeIndex, onActivate, describedBy }: AnnualChartProps) {
  const available = annual.filter(
    (value): value is FieldEducationAnnualValue & { graduateCount: number } =>
      value.graduateCount !== null,
  )
  const interaction = useYearInteraction(annual, activeIndex, onActivate)
  if (available.length === 0) return null
  const maximum = Math.max(1, ...available.map(({ graduateCount }) => graduateCount))
  const x = scaleLinear()
    .domain([0, Math.max(annual.length - 1, 1)])
    .range([MARGIN.left + yearStep(annual) / 2, MARGIN.left + INNER_WIDTH - yearStep(annual) / 2])
  const y = scaleLinear()
    .domain([0, maximum])
    .nice(3)
    .range([MARGIN.top + INNER_HEIGHT, MARGIN.top])
  const yTicks = y.ticks(3)
  const path = line<FieldEducationAnnualValue>()
    .defined(({ graduateCount }) => graduateCount !== null)
    .x((_, index) => x(index))
    .y(({ graduateCount }) => y(graduateCount ?? 0))(annual)
  const active = activeIndex === null ? undefined : annual[activeIndex]

  return (
    <svg
      className="field-education-detail__chart"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="group"
      tabIndex={0}
      aria-label="Roční absolventi vo vybranom odbore; medzery znamenajú chýbajúce spárovanie; šípky vľavo a vpravo prechádzajú rokmi"
      aria-describedby={describedBy}
      onKeyDown={interaction.onKeyDown}
      onBlur={interaction.onBlur}
    >
      <AnnualYAxis ticks={yTicks} y={y} />
      <line
        className="field-education-detail__baseline"
        x1={MARGIN.left}
        x2={MARGIN.left + INNER_WIDTH}
        y1={MARGIN.top + INNER_HEIGHT}
        y2={MARGIN.top + INNER_HEIGHT}
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
            className={`field-education-detail__line-point${
              index === activeIndex ? ' field-education-detail__line-point--active' : ''
            }`}
            cx={x(index)}
            cy={y(value.graduateCount)}
            r={index === activeIndex ? 4 : 2.4}
          />
        ),
      )}
      <YearAxis annual={annual} />
      <Crosshair
        annual={annual}
        activeIndex={activeIndex}
        label={
          active === undefined
            ? ''
            : active.graduateCount === null
              ? 'bez spárovaného údaja'
              : `${formatNumber(active.graduateCount)} absolventov`
        }
      />
      <HoverTarget annual={annual} activeIndex={activeIndex} onActivate={onActivate} />
    </svg>
  )
}

function readout(value: FieldEducationAnnualValue | undefined): string {
  if (value === undefined) {
    return 'Ukážte na rok alebo použite šípky vľavo a vpravo pre hodnoty jedného roka.'
  }
  const graduates =
    value.graduateCount === null
      ? 'absolventi bez spárovaného údaja'
      : `${formatNumber(value.graduateCount)} absolventov`
  const ratio =
    value.graduateCount === null || value.appointmentCount === 0
      ? ''
      : ` · ${formatNumber(value.graduateCount / value.appointmentCount, { maximumFractionDigits: 1 })} na vymenovanie`
  return `${value.year}: ${formatAppointmentCount(value.appointmentCount)} · ${graduates}${ratio}`
}

export default function FieldEducationDetail({ row }: FieldEducationDetailProps) {
  const hasGraduates = row.graduateCount !== null && row.graduatesPerAppointment !== null
  const period = annualPeriod(row.annual)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const readoutId = `field-detail-readout-${row.fieldKey}`
  const activeValue = activeIndex === null ? undefined : row.annual[activeIndex]
  return (
    <article className="field-education-detail" aria-labelledby={`field-detail-${row.fieldKey}`}>
      <p className="eyebrow">Vybraný odbor</p>
      <h3 id={`field-detail-${row.fieldKey}`}>{row.canonicalLabel}</h3>
      <dl className="field-education-detail__totals">
        <div>
          <dt>Vymenovania {period.label}</dt>
          <dd>{formatNumber(row.appointmentCount)}</dd>
        </div>
        <div>
          <dt>Absolventi {period.label}</dt>
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
          <p>Opisný pomer dvoch tokov za vybrané obdobie.</p>
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
      <p
        id={readoutId}
        className={`field-education-detail__readout${
          activeValue === undefined ? '' : ' field-education-detail__readout--active'
        }`}
        role="status"
        aria-live="polite"
      >
        {readout(activeValue)}
      </p>
      <section className="field-education-detail__annual" aria-labelledby={`appointments-${row.fieldKey}`}>
        <h4 id={`appointments-${row.fieldKey}`}>Vymenovania po rokoch</h4>
        <AppointmentBars
          annual={row.annual}
          activeIndex={activeIndex}
          onActivate={setActiveIndex}
          describedBy={readoutId}
        />
      </section>
      {hasGraduates ? (
        <section className="field-education-detail__annual" aria-labelledby={`graduates-${row.fieldKey}`}>
          <h4 id={`graduates-${row.fieldKey}`}>Absolventi po rokoch</h4>
          <GraduateLine
            annual={row.annual}
            activeIndex={activeIndex}
            onActivate={setActiveIndex}
            describedBy={readoutId}
          />
          {row.annual.some(({ graduateCount }) => graduateCount === null) ? (
            <p>Prerušenie čiary označuje rok bez spárovaného údaja.</p>
          ) : null}
        </section>
      ) : null}
    </article>
  )
}
