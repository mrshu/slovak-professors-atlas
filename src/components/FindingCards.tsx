import { useMemo } from 'react'

import { buildFieldEducationLandscape } from '../analysis/fieldEducation'
import { fieldRatioSpread, fieldShareRows, monthTotals } from '../analysis/findings'
import type { AtlasData } from '../data/types'
import { formatNumber } from '../utils/format'
import FieldDumbbell from './charts/FieldDumbbell'
import FieldRatioOutliers, { ratioText } from './charts/FieldRatioOutliers'
import MonthsChart from './charts/MonthsChart'

const LOWEST_COUNT = 4
const MIN_YEARS = 12

export const DUMBBELL_FIELDS = [
  'socialna praca',
  'osetrovatelstvo',
  'manazment',
  'psychologia',
  'informatika',
  'pedagogika',
  'hudobne umenie',
  'odborova didaktika',
] as const

interface FindingCardsProps {
  data: AtlasData
  onFieldSelect: (fieldKey: string) => void
}

export default function FindingCards({ data, onFieldSelect }: FindingCardsProps) {
  const months = useMemo(() => monthTotals(data.records), [data.records])
  const november = months[10]!
  const total = data.records.length
  const landscape = useMemo(
    () =>
      buildFieldEducationLandscape(
        data.records,
        data.fieldCatalog,
        data.fieldEducationComparison,
      ),
    [data],
  )
  const shareRows = useMemo(() => {
    const rows = fieldShareRows(landscape.points)
    return DUMBBELL_FIELDS.flatMap((key) => rows.filter((row) => row.fieldKey === key))
  }, [landscape])
  const lead = shareRows[0]
  const spread = useMemo(
    () => fieldRatioSpread(landscape.allRows, { minYears: MIN_YEARS }),
    [landscape],
  )
  const lowest = spread.rows.slice(0, LOWEST_COUNT)
  const highest = spread.rows.length > LOWEST_COUNT ? spread.rows[spread.rows.length - 1]! : null

  return (
    <section id="zistenia" className="cards" aria-label="Tri zistenia">
      <article className="card">
        <p className="card__kicker">Absolventi na vymenovanie</p>
        <h3>
          {highest === null
            ? 'Absolventi na jedno vymenovanie podľa odboru'
            : `Od ${ratioText(lowest[0]!.graduatesPerAppointment)} absolventov na vymenovanie po ${ratioText(highest.graduatesPerAppointment)}`}
        </h3>
        <p className="card__sub">
          Odbory s najnižším pomerom absolventov k vymenovaniam,{' '}
          {data.fieldEducationComparison.startYear}–{data.fieldEducationComparison.endYear}. Medián{' '}
          {spread.median === null ? '—' : ratioText(spread.median)} z{' '}
          {formatNumber(spread.rows.length)} odborov, ktoré majú absolventov aspoň v{' '}
          {formatNumber(MIN_YEARS)} zo {formatNumber(data.fieldEducationComparison.years.length)}{' '}
          rokov. Každý pomer platí pre jeden presný kľúč odboru, nie pre širšiu oblasť.
        </p>
        <FieldRatioOutliers
          lowest={lowest}
          highest={highest}
          all={spread.rows}
          median={spread.median}
          onSelect={onFieldSelect}
        />
        <a href="#odbory">Celé poradie odborov</a>
      </article>
      <article className="card">
        <p className="card__kicker">Kalendár slávností</p>
        <h3>
          {total > 0 && november.appointments / total >= 0.18
            ? 'Každé piate vymenovanie je novembrové'
            : 'Vymenovania podľa mesiaca slávnosti'}
        </h3>
        <p className="card__sub">
          {formatNumber(november.appointments)} z {formatNumber(total)} vymenovaní na{' '}
          {formatNumber(november.ceremonies)} novembrových slávnostiach.
        </p>
        <MonthsChart totals={months} />
        <a href="#register">Všetky slávnosti v registri</a>
      </article>
      <article className="card">
        <p className="card__kicker">Odbory × absolventi</p>
        <h3>
          {lead === undefined
            ? 'Podiel odborov na absolventoch a vymenovaniach'
            : `${lead.label.charAt(0).toUpperCase()}${lead.label.slice(1)}: ${formatNumber(
                lead.graduateShare * 100,
                { maximumFractionDigits: 0 },
              )} % absolventov, ${formatNumber(lead.appointmentShare * 100, {
                maximumFractionDigits: 0,
              })} % vymenovaní`}
        </h3>
        <p className="card__sub">
          Podiel odboru na <i className="sw sw--2" />absolventoch a na{' '}
          <i className="sw sw--1" />vymenovaniach, {data.fieldEducationComparison.startYear}–
          {data.fieldEducationComparison.endYear}.
        </p>
        <FieldDumbbell rows={shareRows} onSelect={onFieldSelect} />
        <a href="#odbory">Celé porovnanie odborov</a>
      </article>
    </section>
  )
}
