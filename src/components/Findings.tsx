import { ceremonyCadence, ceremonyCounts } from '../analysis/selectors'
import type { Appointment, Institution } from '../data/types'
import { formatDate, formatNumber } from '../utils/format'
import { normalizeForSearch } from '../utils/search'

interface FindingsProps {
  records: readonly Appointment[]
  institutions: readonly Institution[]
}

export interface HeadlineFindings {
  ceremony: {
    appointedOn: string
    appointments: number
    median: number
    multipleOfMedian: number
  }
  bratislava: {
    appointments: number
    total: number
    share: number
  }
  fields: {
    count: number
    singletonCount: number
    topTenShare: number
  }
}

export function deriveHeadlineFindings(
  records: readonly Appointment[],
  institutions: readonly Institution[],
): HeadlineFindings {
  const ceremonies = ceremonyCounts(records)
  const cadence = ceremonyCadence(records)
  const largestCeremony = [...ceremonies].sort(
    (left, right) =>
      right.count - left.count || left.appointedOn.localeCompare(right.appointedOn),
  )[0]
  const median = cadence.medianBatchSize ?? 0
  const cityByInstitution = new Map(
    institutions.map(({ id, city }) => [id, city] as const),
  )
  const bratislavaAppointments = records.reduce(
    (count, record) =>
      count + (cityByInstitution.get(record.institutionId) === 'Bratislava' ? 1 : 0),
    0,
  )
  const fieldCounts = new Map<string, number>()
  for (const record of records) {
    const field = normalizeForSearch(record.field)
    fieldCounts.set(field, (fieldCounts.get(field) ?? 0) + 1)
  }
  const sortedFieldCounts = [...fieldCounts.values()].sort((left, right) => right - left)
  const topTenCount = sortedFieldCounts
    .slice(0, 10)
    .reduce((total, count) => total + count, 0)

  return {
    ceremony: {
      appointedOn: largestCeremony?.appointedOn ?? '',
      appointments: largestCeremony?.count ?? 0,
      median,
      multipleOfMedian: median === 0 ? 0 : (largestCeremony?.count ?? 0) / median,
    },
    bratislava: {
      appointments: bratislavaAppointments,
      total: records.length,
      share: records.length === 0 ? 0 : bratislavaAppointments / records.length,
    },
    fields: {
      count: fieldCounts.size,
      singletonCount: sortedFieldCounts.filter((count) => count === 1).length,
      topTenShare: records.length === 0 ? 0 : topTenCount / records.length,
    },
  }
}

function percent(value: number): string {
  return formatNumber(value * 100, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
}

export default function Findings({ records, institutions }: FindingsProps) {
  const facts = deriveHeadlineFindings(records, institutions)
  const ceremonyScale =
    facts.ceremony.appointments === 0
      ? 0
      : (facts.ceremony.median / facts.ceremony.appointments) * 100

  return (
    <section id="zistenia" className="section section--findings" aria-labelledby="findings-title">
      <div className="section__heading section__heading--split">
        <div>
          <p className="eyebrow">Čítanie archívu</p>
          <h2 id="findings-title">Čo z archívu vystupuje</h2>
        </div>
        <p>
          Tri mierky, ktoré sa v tabuľke strácajú: veľkosť jedného ceremoniálu,
          geografická koncentrácia a dlhý chvost odborov.
        </p>
      </div>

      <div className="findings__list">
        <article className="finding finding--ceremony" aria-label="Najväčšia slávnosť">
          <p className="finding__marker">Jeden podpisový deň</p>
          <p className="finding__number">
            {formatNumber(facts.ceremony.appointments)}
            <span>vymenovaní</span>
          </p>
          <h3>
            {facts.ceremony.appointedOn
              ? formatDate(facts.ceremony.appointedOn)
              : 'Bez zaznamenanej slávnosti'}
          </h3>
          <div
            className="finding__bars"
            role="img"
            aria-label={`Najväčšia slávnosť ${formatNumber(
              facts.ceremony.appointments,
            )} vymenovaní; medián slávnosti ${formatNumber(facts.ceremony.median)}`}
          >
            <span className="finding__bar finding__bar--maximum" />
            <span
              className="finding__bar finding__bar--median"
              style={{ width: `${ceremonyScale}%` }}
            />
          </div>
          <p>
            Jediná slávnosť mala{' '}
            <strong>
              {formatNumber(facts.ceremony.multipleOfMedian, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}
              ×
            </strong>{' '}
            viac vymenovaní než medián slávnosti ({formatNumber(facts.ceremony.median)}).
          </p>
        </article>

        <article className="finding finding--city" aria-label="Podiel Bratislavy">
          <p className="finding__marker">Geografia pracovísk</p>
          <p className="finding__number">
            {percent(facts.bratislava.share)} %
            <span>Bratislava</span>
          </p>
          <div
            className="finding__rail"
            role="img"
            aria-label={`Bratislava ${formatNumber(
              facts.bratislava.appointments,
            )} z ${formatNumber(facts.bratislava.total)} vymenovaní`}
          >
            <span style={{ width: `${facts.bratislava.share * 100}%` }} />
          </div>
          <p>
            Bratislavské pracoviská navrhli <strong>{formatNumber(facts.bratislava.appointments)}</strong>{' '}
            z {formatNumber(facts.bratislava.total)} vymenovaní. Mapa zachytáva pracovisko,
            nie pôvod profesora.
          </p>
        </article>

        <article className="finding finding--fields" aria-label="Rozmanitosť odborov">
          <p className="finding__marker">Dlhý chvost odborov</p>
          <p className="finding__number">
            {formatNumber(facts.fields.count)}
            <span>názvov odborov</span>
          </p>
          <dl className="finding__split-stat">
            <div>
              <dt>iba raz</dt>
              <dd>{formatNumber(facts.fields.singletonCount)}</dd>
            </div>
            <div>
              <dt>podiel top 10</dt>
              <dd>{percent(facts.fields.topTenShare)} %</dd>
            </div>
          </dl>
          <p>
            Odbory sú rozptýlené: najčastejšia desiatka netvorí ani pätinu všetkých
            analytických záznamov.
          </p>
        </article>
      </div>
    </section>
  )
}
