import { useMemo, useState } from 'react'

import type { FieldEducationLandscapeRow } from '../analysis/fieldEducation'
import { formatNumber } from '../utils/format'
import { normalizeForSearch } from '../utils/search'

interface FieldEducationRankingsProps {
  rows: readonly FieldEducationLandscapeRow[]
  selectedField: string | null
  onFieldSelect: (fieldKey: string) => void
}

type SortKey = 'label' | 'appointments' | 'graduates' | 'ratio'
type SortDirection = 'ascending' | 'descending'

const slovakCollator = new Intl.Collator('sk-SK')

function rankingSearchText(row: FieldEducationLandscapeRow): string {
  return normalizeForSearch(
    [row.canonicalLabel, ...row.variants.map(({ label }) => label)].join(' '),
  )
}

function compareRows(
  left: FieldEducationLandscapeRow,
  right: FieldEducationLandscapeRow,
  sortKey: SortKey,
): number {
  if (sortKey === 'label') {
    return slovakCollator.compare(left.canonicalLabel, right.canonicalLabel)
  }
  const leftValue = sortKey === 'appointments'
    ? left.appointmentCount
    : sortKey === 'graduates'
      ? left.graduateCount ?? Number.NEGATIVE_INFINITY
      : left.graduatesPerAppointment ?? Number.NEGATIVE_INFINITY
  const rightValue = sortKey === 'appointments'
    ? right.appointmentCount
    : sortKey === 'graduates'
      ? right.graduateCount ?? Number.NEGATIVE_INFINITY
      : right.graduatesPerAppointment ?? Number.NEGATIVE_INFINITY
  return leftValue - rightValue || slovakCollator.compare(left.canonicalLabel, right.canonicalLabel)
}

function RankingTable({
  caption,
  rows,
  selectedField,
  sortKey,
  sortDirection,
  onSort,
  onFieldSelect,
}: {
  caption: string
  rows: readonly FieldEducationLandscapeRow[]
  selectedField: string | null
  sortKey: SortKey
  sortDirection: SortDirection
  onSort: (key: SortKey) => void
  onFieldSelect: (fieldKey: string) => void
}) {
  const ariaSort = (key: SortKey) =>
    sortKey === key ? sortDirection : undefined
  return (
    <div className="field-education-rankings__table-region">
      <table className="field-education-rankings__table" aria-label={caption}>
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col" aria-sort={ariaSort('label')}>
              <button type="button" onClick={() => onSort('label')}>Odbor</button>
            </th>
            <th scope="col" aria-sort={ariaSort('appointments')}>
              <button type="button" onClick={() => onSort('appointments')}>Vymenovania</button>
            </th>
            <th scope="col" aria-sort={ariaSort('graduates')}>
              <button type="button" onClick={() => onSort('graduates')}>Absolventi</button>
            </th>
            <th scope="col" aria-sort={ariaSort('ratio')}>
              <button type="button" onClick={() => onSort('ratio')}>Absolventi / vymenovanie</button>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={4}>Žiadny odbor nezodpovedá hľadaniu.</td>
            </tr>
          ) : rows.map((row) => (
            <tr key={row.fieldKey} data-selected={row.fieldKey === selectedField ? 'true' : 'false'}>
              <th scope="row">
                <button
                  type="button"
                  aria-current={row.fieldKey === selectedField ? 'true' : undefined}
                  onClick={() => onFieldSelect(row.fieldKey)}
                >
                  {row.canonicalLabel}
                </button>
                {row.variants.length > 1 ? (
                  <details>
                    <summary>{formatNumber(row.variants.length)} zdrojové podoby</summary>
                    <ul>
                      {row.variants.map((variant) => (
                        <li key={variant.label}>{variant.label} · {formatNumber(variant.count)}</li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </th>
              <td>{formatNumber(row.appointmentCount)}</td>
              <td>{row.graduateCount === null ? '—' : formatNumber(row.graduateCount)}</td>
              <td>
                {row.graduatesPerAppointment === null
                  ? '—'
                  : formatNumber(row.graduatesPerAppointment, { maximumFractionDigits: 2 })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function FieldEducationRankings({
  rows,
  selectedField,
  onFieldSelect,
}: FieldEducationRankingsProps) {
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('appointments')
  const [sortDirection, setSortDirection] = useState<SortDirection>('descending')
  const normalizedQuery = normalizeForSearch(query)
  const visibleRows = useMemo(() => {
    const filtered = normalizedQuery.length === 0
      ? [...rows]
      : rows.filter((row) => rankingSearchText(row).includes(normalizedQuery))
    return filtered.sort((left, right) => {
      const order = compareRows(left, right, sortKey)
      return sortDirection === 'ascending' ? order : -order
    })
  }, [normalizedQuery, rows, sortDirection, sortKey])
  const matched = visibleRows.filter(({ graduateCount }) => graduateCount !== null)
  const unmatched = visibleRows.filter(({ graduateCount }) => graduateCount === null)

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDirection((direction) =>
        direction === 'ascending' ? 'descending' : 'ascending',
      )
      return
    }
    setSortKey(key)
    setSortDirection(key === 'label' ? 'ascending' : 'descending')
  }
  const startYear = rows[0]?.annual[0]?.year
  const endYear = rows[0]?.annual.at(-1)?.year
  const periodLabel =
    startYear === undefined || endYear === undefined
      ? 'bez dostupného obdobia'
      : startYear === endYear
        ? String(startYear)
        : `${startYear} – ${endYear}`

  return (
    <section className="field-education-rankings" aria-labelledby="field-education-rankings-title">
      <div className="field-education-rankings__heading">
        <div>
          <p className="eyebrow">Úplný register · vybrané obdobie {periodLabel}</p>
          <h3 id="field-education-rankings-title">Rebríčky odborov</h3>
        </div>
        <label>
          <span>Hľadať odbor</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Názov alebo zdrojová podoba"
          />
        </label>
      </div>
      <p className="field-education-rankings__count">
        {formatNumber(rows.length)} odbory celkom · {formatNumber(visibleRows.length)} zobrazených
      </p>
      <div className="field-education-rankings__tables">
        <RankingTable
          caption="Spárované odbory"
          rows={matched}
          selectedField={selectedField}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSort={handleSort}
          onFieldSelect={onFieldSelect}
        />
        <RankingTable
          caption="Nespárované odbory"
          rows={unmatched}
          selectedField={selectedField}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSort={handleSort}
          onFieldSelect={onFieldSelect}
        />
      </div>
    </section>
  )
}
