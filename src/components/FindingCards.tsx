import { useMemo } from 'react'

import { buildFieldEducationLandscape } from '../analysis/fieldEducation'
import {
  fieldShareRows,
  monthTotals,
  titleCrossoverYear,
  titleSharesByYear,
} from '../analysis/findings'
import type { AtlasData } from '../data/types'
import { formatNumber } from '../utils/format'
import FieldDumbbell from './charts/FieldDumbbell'
import MonthsChart from './charts/MonthsChart'
import TitlesChart from './charts/TitlesChart'

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
  const titles = useMemo(() => titleSharesByYear(data.records), [data.records])
  const crossover = titleCrossoverYear(titles)
  const months = useMemo(() => monthTotals(data.records), [data.records])
  const november = months[10]!
  const total = data.records.length
  const shareRows = useMemo(() => {
    const landscape = buildFieldEducationLandscape(
      data.records,
      data.fieldCatalog,
      data.fieldEducationComparison,
    )
    const rows = fieldShareRows(landscape.points)
    return DUMBBELL_FIELDS.flatMap((key) => rows.filter((row) => row.fieldKey === key))
  }, [data])
  const lead = shareRows[0]

  return (
    <section id="zistenia" className="cards" aria-label="Tri zistenia">
      <article className="card">
        <p className="card__kicker">Vedecké hodnosti</p>
        <h3>
          {crossover === null
            ? 'Podiel vedeckých hodností po rokoch'
            : `PhD. predbehol CSc. v roku ${crossover}`}
        </h3>
        <p className="card__sub">
          Podiel hodnosti medzi ročnými vymenovaniami: <i className="sw sw--1" />PhD.{' '}
          <i className="sw sw--2" />CSc. <i className="sw sw--3" />DrSc.
        </p>
        <TitlesChart rows={titles} crossoverYear={crossover} />
        <a href="#register">Záznamy podľa hodnosti</a>
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
            : `${lead.label[0]!.toUpperCase()}${lead.label.slice(1)}: ${formatNumber(
                lead.graduateShare * 100,
                { maximumFractionDigits: 0 },
              )} % absolventov, ${formatNumber(lead.appointmentShare * 100, {
                maximumFractionDigits: 0,
              })} % profesorov`}
        </h3>
        <p className="card__sub">
          Podiel odboru na <i className="sw sw--2" />absolventoch a na{' '}
          <i className="sw sw--1" />vymenovaniach, 2009–2025.
        </p>
        <FieldDumbbell rows={shareRows} onSelect={onFieldSelect} />
        <a href="#odbory">Celé porovnanie odborov</a>
      </article>
    </section>
  )
}
