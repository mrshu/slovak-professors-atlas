import { ceremonyCadence, ceremonyCounts } from '../analysis/selectors'
import type { Affiliation, Appointment, President } from '../data/types'
import { formatDate, formatNumber } from '../utils/format'
import { normalizeForSearch } from '../utils/search'

interface FindingsProps {
  records: readonly Appointment[]
  affiliations: readonly Affiliation[]
  presidents: readonly President[]
  onCeremonySelect: (appointedOn: string) => void
  onCitySelect: (city: string) => void
}

export interface HeadlineFindings {
  ceremony: {
    appointedOn: string
    appointments: number
    median: number
    multipleOfMedian: number
    presidentId: string | null
  }
  bratislava: {
    appointments: number
    locatedAppointments: number
    unresolvedAppointments: number
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
  affiliations: readonly Affiliation[],
): HeadlineFindings {
  const ceremonies = ceremonyCounts(records)
  const cadence = ceremonyCadence(records)
  const largestCeremony = [...ceremonies].sort(
    (left, right) =>
      right.count - left.count || left.appointedOn.localeCompare(right.appointedOn),
  )[0]
  const median = cadence.medianBatchSize ?? 0
  const cityByAffiliation = new Map(
    affiliations.flatMap((affiliation) =>
      affiliation.status === 'resolved' && affiliation.city !== null
        ? [[affiliation.id, affiliation.city] as const]
        : [],
    ),
  )
  let bratislavaAppointments = 0
  let locatedAppointments = 0
  for (const record of records) {
    const city = cityByAffiliation.get(record.affiliationId)
    if (city !== undefined) {
      locatedAppointments += 1
    }
    if (city === 'Bratislava') {
      bratislavaAppointments += 1
    }
  }
  const fieldCounts = new Map<string, number>()
  for (const record of records) {
    const field = normalizeForSearch(record.field)
    fieldCounts.set(field, (fieldCounts.get(field) ?? 0) + 1)
  }
  const sortedFieldCounts = [...fieldCounts.values()].sort((left, right) => right - left)
  const topTenCount = sortedFieldCounts
    .slice(0, 10)
    .reduce((total, count) => total + count, 0)

  const ceremonyPresidentIds = new Set(
    records
      .filter(({ appointedOn }) => appointedOn === largestCeremony?.appointedOn)
      .map(({ presidentId }) => presidentId),
  )
  return {
    ceremony: {
      appointedOn: largestCeremony?.appointedOn ?? '',
      appointments: largestCeremony?.count ?? 0,
      median,
      multipleOfMedian: median === 0 ? 0 : (largestCeremony?.count ?? 0) / median,
      presidentId:
        ceremonyPresidentIds.size === 1
          ? (ceremonyPresidentIds.values().next().value ?? null)
          : null,
    },
    bratislava: {
      appointments: bratislavaAppointments,
      locatedAppointments,
      unresolvedAppointments: records.length - locatedAppointments,
      share: locatedAppointments === 0 ? 0 : bratislavaAppointments / locatedAppointments,
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

export default function Findings({
  records,
  affiliations,
  presidents,
  onCeremonySelect,
  onCitySelect,
}: FindingsProps) {
  const facts = deriveHeadlineFindings(records, affiliations)
  const presidentName =
    presidents.find(({ id }) => id === facts.ceremony.presidentId)?.name ?? null
  const ceremonyScale =
    facts.ceremony.appointments === 0
      ? 0
      : (facts.ceremony.median / facts.ceremony.appointments) * 100

  return (
    <section id="zistenia" className="section section--findings" aria-labelledby="findings-title">
      <div className="section__heading section__heading--split">
        <div>
          <p className="eyebrow">Tri stopy v dátach</p>
          <h2 id="findings-title">Čísla, ktoré menia mierku</h2>
        </div>
        <p>
          Jeden výnimočný deň, koncentrácia pracovísk a stovky podôb odborov. Každá
          stopa vedie jedným kliknutím k záznamom, z ktorých vznikla.
        </p>
      </div>

      <div className="findings__list">
        <article className="finding finding--ceremony" aria-label="Najväčší ceremoniál">
          <p className="finding__marker">Najväčší ceremoniál</p>
          <p className="finding__number">
            {formatNumber(facts.ceremony.appointments)}
            <span>vymenovaní</span>
          </p>
          <h3>
            {facts.ceremony.appointedOn
              ? formatDate(facts.ceremony.appointedOn)
              : 'Bez zaznamenaného ceremoniálu'}
          </h3>
          <div
            className="finding__bars"
            role="img"
            aria-label={`Najväčší ceremoniál ${formatNumber(
              facts.ceremony.appointments,
            )} vymenovaní; medián ceremoniálu ${formatNumber(facts.ceremony.median)}`}
          >
            <span className="finding__bar finding__bar--maximum" />
            <span
              className="finding__bar finding__bar--median"
              style={{ width: `${ceremonyScale}%` }}
            />
          </div>
          <p className="finding__copy">
            V ten deň prezident {presidentName ?? 'Slovenskej republiky'} vymenoval{' '}
            {formatNumber(facts.ceremony.appointments)} profesorov —{' '}
            <strong>
              {formatNumber(facts.ceremony.multipleOfMedian, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}
              -násobok
            </strong>{' '}
            mediánu jedného ceremoniálu ({formatNumber(facts.ceremony.median)}).
          </p>
          <button
            className="finding__action"
            type="button"
            onClick={() => onCeremonySelect(facts.ceremony.appointedOn)}
            disabled={!facts.ceremony.appointedOn}
          >
            Otvoriť ceremoniál
          </button>
        </article>

        <article className="finding finding--city" aria-label="Podiel Bratislavy">
          <p className="finding__marker">Bratislavská koncentrácia</p>
          <p className="finding__number">
            {percent(facts.bratislava.share)} %
            <span>Bratislava</span>
          </p>
          <div
            className="finding__rail"
            role="img"
            aria-label={`Bratislava ${formatNumber(
              facts.bratislava.appointments,
            )} z ${formatNumber(
              facts.bratislava.locatedAppointments,
            )} vymenovaní s určenou polohou`}
          >
            <span style={{ width: `${facts.bratislava.share * 100}%` }} />
          </div>
          <p className="finding__copy">
            Z vymenovaní s určenou polohou pripadá na bratislavské pracoviská{' '}
            <strong>{formatNumber(facts.bratislava.appointments)}</strong> z{' '}
            {formatNumber(facts.bratislava.locatedAppointments)}.{' '}
            {facts.bratislava.unresolvedAppointments > 0 && (
              <>
                Pri ďalších {formatNumber(facts.bratislava.unresolvedAppointments)} vymenovaniach
                sa poloha nedala spoľahlivo určiť.{' '}
              </>
            )}
            Ide o pracovisko, nie bydlisko profesora.
          </p>
          <button
            className="finding__action"
            type="button"
            onClick={() => onCitySelect('Bratislava')}
          >
            Zobraziť Bratislavu
          </button>
        </article>

        <article className="finding finding--fields" aria-label="Rozmanitosť odborov">
          <p className="finding__marker">Stovky podôb odboru</p>
          <p className="finding__number">
            {formatNumber(facts.fields.count)}
            <span>normalizovaných názvov</span>
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
          <p className="finding__copy">
            Až <strong>{formatNumber(facts.fields.singletonCount)}</strong> odborov sa v
            registri objaví jediný raz; desať najčastejších spolu tvorí len{' '}
            {percent(facts.fields.topTenShare)} % vymenovaní.
          </p>
          <a className="finding__action" href="#odbory">
            Preskúmať odbory
          </a>
        </article>
      </div>
    </section>
  )
}
