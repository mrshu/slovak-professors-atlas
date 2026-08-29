import { useMemo, useState } from 'react'

import {
  fieldAppointmentLandscape,
  type FieldLandscapeSummary,
} from '../analysis/selectors'
import type {
  Appointment,
  FieldGraduateComparison as ComparisonData,
  FieldGraduateComparisonRow,
} from '../data/types'
import { formatNumber } from '../utils/format'

interface Props {
  comparison: ComparisonData
  allRecords: readonly Appointment[]
  comparisonRecords: readonly Appointment[]
  selectedField: string | null
  onFieldSelect: (field: string | null) => void
}

type SortKey = 'field' | 'appointmentCount' | 'graduateCount' | 'graduatesPerAppointment'
type SortDirection = 'ascending' | 'descending'
interface SortState {
  key: SortKey
  direction: SortDirection
}

const collator = new Intl.Collator('sk-SK')

function compareNumbers(
  left: number | null,
  right: number | null,
  direction: SortDirection,
): number {
  if (left === null) return right === null ? 0 : 1
  if (right === null) return -1
  return direction === 'ascending' ? left - right : right - left
}

function compareRows(
  left: FieldGraduateComparisonRow,
  right: FieldGraduateComparisonRow,
  sort: SortState,
) {
  let result =
    sort.key === 'field'
      ? collator.compare(left.field, right.field)
      : compareNumbers(left[sort.key], right[sort.key], sort.direction)
  if (sort.key === 'field' && sort.direction === 'descending') result *= -1
  return result || collator.compare(left.field, right.field)
}

function percentage(value: number): string {
  return `${formatNumber(value * 100, { maximumFractionDigits: 2 })} %`
}

function LandscapeSummary({
  label,
  summary,
}: {
  label: string
  summary: FieldLandscapeSummary
}) {
  const years =
    summary.firstYear === null || summary.lastYear === null
      ? '—'
      : `${summary.firstYear} – ${summary.lastYear}`
  const leader =
    summary.leadingField === null
      ? '—'
      : `${summary.leadingField} (${formatNumber(summary.leadingAppointmentCount)}; ${percentage(summary.leadingShare)})`

  return (
    <dl className="field-comparison__coverage" role="group" aria-label={label}>
      <div><dt>Vymenovania</dt><dd>{formatNumber(summary.appointmentCount)}</dd></div>
      <div><dt>Normalizované odbory</dt><dd>{formatNumber(summary.distinctFieldCount)}</dd></div>
      <div><dt>Jednorazové odbory</dt><dd>{formatNumber(summary.singletonFieldCount)}</dd></div>
      <div><dt>Vedúci odbor a podiel</dt><dd>{leader}</dd></div>
      <div><dt>Koncentrácia top 10</dt><dd>{percentage(summary.topTenShare)}</dd></div>
      <div><dt>Prvé – posledné vymenovanie</dt><dd>{years}</dd></div>
    </dl>
  )
}

export default function FieldGraduateComparison({
  comparison,
  allRecords,
  comparisonRecords,
  selectedField,
  onFieldSelect,
}: Props) {
  const landscape = useMemo(
    () => fieldAppointmentLandscape(allRecords, comparisonRecords),
    [allRecords, comparisonRecords],
  )
  const [sort, setSort] = useState<SortState>({
    key: 'appointmentCount',
    direction: 'descending',
  })
  const rows = useMemo(
    () => [...comparison.rows].sort((left, right) => compareRows(left, right, sort)),
    [comparison.rows, sort],
  )
  const changeSort = (key: SortKey) =>
    setSort((current) => ({
      key,
      direction:
        current.key === key
          ? current.direction === 'ascending'
            ? 'descending'
            : 'ascending'
          : key === 'field'
            ? 'ascending'
            : 'descending',
    }))
  const header = (key: SortKey, label: string) => (
    <th scope="col" aria-sort={sort.key === key ? sort.direction : undefined}>
      <button type="button" onClick={() => changeSort(key)}>
        {label}
        <span aria-hidden="true">
          {sort.key === key ? (sort.direction === 'ascending' ? ' ↑' : ' ↓') : ''}
        </span>
      </button>
    </th>
  )

  return (
    <section
      id="odbory-absolventi"
      className="section section--field-comparison"
      aria-labelledby="field-comparison-title"
    >
      <div className="field-comparison__intro">
        <div>
          <p className="eyebrow">Odbory bez domyslenej taxonómie</p>
          <h2 id="field-comparison-title">Odbory vymenovaní a absolventi v roku 2025</h2>
        </div>
        <p>
          Celé obdobie vymenovaní čítame podľa presne normalizovaného názvu. Aktívny výber
          rešpektuje všetky filtre okrem odboru, aby bolo rozdelenie stále porovnateľné.
        </p>
      </div>

      <article className="field-comparison__block" aria-labelledby="field-ranking-title">
        <div className="field-comparison__block-heading">
          <div>
            <p className="eyebrow">A · register a výber</p>
            <h3 id="field-ranking-title">Krajina odborov vymenovaní</h3>
          </div>
          <p>
            Zoskupujeme iba zápisy zhodné po odstránení diakritiky, zjednotení veľkosti
            písmen a medzier. Interpunkciu ani význam nemeníme.
          </p>
        </div>
        <LandscapeSummary label="Súhrn celého registra odborov" summary={landscape.wholeRegister} />
        <LandscapeSummary
          label="Súhrn aktívneho výberu bez filtra odboru"
          summary={landscape.selection}
        />
        {landscape.rows.length === 0 ? (
          <p className="field-comparison__empty">V analytickom súbore nie sú odbory na zoradenie.</p>
        ) : (
          <div
            className="field-comparison__table-region"
            role="region"
            aria-label="Rebríček odborov vymenovaní za celé obdobie"
            tabIndex={0}
          >
            <table
              className="field-comparison__table field-comparison__table--ranking"
              aria-label="Podiely odborov v celom registri a aktívnom výbere"
            >
              <thead>
                <tr>
                  <th>Odbor</th><th>Celý register</th><th>Podiel registra</th>
                  <th>Aktívny výber</th><th>Podiel výberu</th><th>Prvé</th>
                  <th>Posledné</th><th>Zdrojové varianty</th>
                </tr>
              </thead>
              <tbody>
                {landscape.rows.map((row) => (
                  <tr key={row.fieldKey}>
                    <th scope="row">
                      <button
                        type="button"
                        aria-pressed={selectedField === row.fieldKey}
                        onClick={() =>
                          onFieldSelect(selectedField === row.fieldKey ? null : row.fieldKey)
                        }
                      >
                        {row.field}
                      </button>
                    </th>
                    <td>{formatNumber(row.wholeRegisterAppointmentCount)}</td>
                    <td>{percentage(row.wholeRegisterShare)}</td>
                    <td>{formatNumber(row.selectionAppointmentCount)}</td>
                    <td>{percentage(row.selectionShare)}</td>
                    <td>{row.firstYear}</td><td>{row.lastYear}</td>
                    <td>
                      {row.variants.length === 1 ? (
                        <span className="field-variant__label">{row.variants[0]?.label}</span>
                      ) : (
                        <details className="field-variants">
                          <summary>{formatNumber(row.variants.length)} podoby názvu</summary>
                          <ul>
                            {row.variants.map((variant) => (
                              <li key={variant.label}>
                                <span className="field-variant__label">{variant.label}</span>{' '}
                                ({formatNumber(variant.count)}×)
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      <article className="field-comparison__block" aria-labelledby="field-graduates-title">
        <div className="field-comparison__block-heading">
          <div><p className="eyebrow">B · spoločný rok</p><h3 id="field-graduates-title">Snapshot kalendárneho roka {comparison.year}</h3></div>
          <p>Každý odbor s vymenovaním zostáva v tabuľke. Ak sa presne nespároval s registrom absolventov, chýbajúcu hodnotu nenahrádzame odhadom.</p>
        </div>
        <dl className="field-comparison__coverage" aria-label="Pokrytie presného párovania odborov">
          <div><dt>Spárované vymenovania</dt><dd>{formatNumber(comparison.matchedAppointmentCount)} z {formatNumber(comparison.appointmentCount)}</dd></div>
          <div><dt>Podiel vymenovaní</dt><dd>{formatNumber(comparison.matchedAppointmentShare, { maximumFractionDigits: 2 })} %</dd></div>
          <div><dt>Spárované odbory</dt><dd>{formatNumber(comparison.matchedDistinctFieldCount)} zo {formatNumber(comparison.distinctFieldCount)} odborov</dd></div>
        </dl>
        <div className="field-comparison__table-region" role="region" aria-label={`Porovnávacia tabuľka odborov v roku ${comparison.year}`} tabIndex={0}>
          <table className="field-comparison__table" aria-label="Presné porovnanie odborov a absolventov">
            <thead><tr>{header('field', 'Odbor')}{header('appointmentCount', 'Vymenovania')}{header('graduateCount', 'Absolventi')}{header('graduatesPerAppointment', 'Absolventi na vymenovanie')}</tr></thead>
            <tbody>{rows.map((row) => {
              const unmatched = row.matchStatus === 'unmatched'
              return <tr key={row.field} aria-label={unmatched ? `${row.field}: bez presnej zhody` : undefined} className={unmatched ? 'field-comparison__row--unmatched' : undefined}>
                <th scope="row">{row.field}</th><td>{formatNumber(row.appointmentCount)}</td>
                <td>{unmatched ? 'bez presnej zhody' : formatNumber(row.graduateCount ?? 0)}</td>
                <td>{unmatched ? <span aria-hidden="true">—</span> : formatNumber(row.graduatesPerAppointment ?? 0, { maximumFractionDigits: 2 })}</td>
              </tr>
            })}</tbody>
          </table>
        </div>
      </article>

      <aside className="field-comparison__caveat" role="note" aria-label="Ako čítať porovnanie"><p>
        Porovnanie spája <strong>dva odlišné registre</strong> a používa iba presne rovnaké normalizované názvy. Zámerne nevytvára taxonómiu: rovnaké názvy programov sa môžu objaviť v rôznych kategóriách. Z pomeru nevyplýva príčina ani kvalita odboru, školy či osoby.
      </p></aside>
      <div className="field-comparison__sources" aria-label="Zdroje porovnania odborov">
        <div><a href={comparison.source.catalogUrl}>Katalóg štatistickej ročenky CVTI SR</a><a href={comparison.source.url}>Priamy oficiálny zošit absolventov (XLS)</a><a href={`${import.meta.env.BASE_URL}data/source/graduates-by-field-2025.xls`} download>Stiahnuť uložený zošit absolventov (XLS)</a></div>
        <p>Zdroj získaný {comparison.source.retrievedOn}; SHA-256: <code>{comparison.source.sha256}</code></p>
      </div>
    </section>
  )
}
