import { useEffect, useMemo, useState } from 'react'

import type { Appointment, Institution, President, SourceVariant } from '../data/types'
import { formatDate, formatNumber } from '../utils/format'

type SortKey = 'name' | 'institution' | 'field' | 'appointedOn' | 'president'
type SortDirection = 'ascending' | 'descending'

interface RecordListProps {
  records: readonly Appointment[]
  institutions: readonly Institution[]
  presidents: readonly President[]
}

interface SortState {
  key: SortKey
  direction: SortDirection
}

interface SortColumn {
  key: SortKey
  label: string
  sortLabel: string
}

interface SortButtonProps {
  activeSort: SortState
  column: SortColumn
  onSort: (key: SortKey) => void
}

interface VariantDifference {
  label: string
  primaryValue: string | null
  variantValue: string | null
}

const PAGE_SIZE = 25
const SORT_COLUMNS: readonly SortColumn[] = [
  { key: 'name', label: 'Meno', sortLabel: 'mena' },
  { key: 'institution', label: 'Inštitúcia', sortLabel: 'inštitúcie' },
  { key: 'field', label: 'Odbor', sortLabel: 'odboru' },
  { key: 'appointedOn', label: 'Dátum', sortLabel: 'dátumu' },
  { key: 'president', label: 'Prezident', sortLabel: 'prezidenta' },
]
const slovakCollator = new Intl.Collator('sk-SK', { sensitivity: 'base' })

function shown(value: string | null): string {
  return value === null || value.length === 0 ? 'neuvedené' : value
}

function variantDifferences(
  primary: SourceVariant,
  variant: SourceVariant,
): VariantDifference[] {
  const fields: readonly [string, string | null, string | null][] = [
    ['tituly pred menom', primary.titlesBefore, variant.titlesBefore],
    ['tituly za menom', primary.titlesAfter, variant.titlesAfter],
    ['inštitúcia', primary.institution, variant.institution],
    ['fakulta', primary.faculty, variant.faculty],
    ['odbor', primary.field, variant.field],
  ]

  return fields
    .filter(([, primaryValue, variantValue]) => primaryValue !== variantValue)
    .map(([label, primaryValue, variantValue]) => ({ label, primaryValue, variantValue }))
}

function SortButton({ activeSort, column, onSort }: SortButtonProps) {
  const active = activeSort.key === column.key
  return (
    <button
      type="button"
      onClick={() => onSort(column.key)}
      aria-label={`Zoradiť podľa ${column.sortLabel}`}
    >
      <span>{column.label}</span>
      <span aria-hidden="true">
        {active ? (activeSort.direction === 'ascending' ? '↑' : '↓') : '↕'}
      </span>
    </button>
  )
}

function SourceVariants({ record }: { record: Appointment }) {
  const primary = record.sourceVariants[0]
  if (primary === undefined) {
    return <p>Zdrojové varianty nie sú v dátovom súbore uvedené.</p>
  }

  return (
    <ol className="record-detail__variants">
      {record.sourceVariants.map((variant, index) => {
        const differences = variantDifferences(primary, variant)
        return (
          <li key={variant.rowNumber}>
            <h4>Zdrojový riadok {formatNumber(variant.rowNumber)}</h4>
            <dl>
              <div>
                <dt>Tituly pred menom</dt>
                <dd>{shown(variant.titlesBefore)}</dd>
              </div>
              <div>
                <dt>Tituly za menom</dt>
                <dd>{shown(variant.titlesAfter)}</dd>
              </div>
              <div>
                <dt>Zdrojová inštitúcia</dt>
                <dd>{variant.institution}</dd>
              </div>
              <div>
                <dt>Fakulta</dt>
                <dd>{shown(variant.faculty)}</dd>
              </div>
              <div>
                <dt>Zdrojový odbor</dt>
                <dd>{variant.field}</dd>
              </div>
            </dl>
            {index === 0 ? (
              <p className="record-detail__difference">Ponechaný zdrojový riadok.</p>
            ) : differences.length === 0 ? (
              <p className="record-detail__difference">
                Bez rozdielu oproti ponechanému riadku.
              </p>
            ) : (
              <div className="record-detail__difference">
                <p>Rozdiel oproti ponechanému riadku:</p>
                <ul>
                  {differences.map(({ label, primaryValue, variantValue }) => (
                    <li key={label}>
                      <strong>{label}:</strong> {shown(primaryValue)} → {shown(variantValue)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        )
      })}
    </ol>
  )
}

function RecordDetail({
  record,
  institution,
  president,
}: {
  record: Appointment
  institution: Institution | undefined
  president: President | undefined
}) {
  const sourceRows = record.sourceVariants.map(({ rowNumber }) => formatNumber(rowNumber)).join(', ')
  return (
    <details
      className="record-detail"
      aria-label={`Detail záznamu ${record.name}`}
    >
      <summary>Zobraziť detail</summary>
      <div className="record-detail__body">
        <dl className="record-detail__summary">
          <div>
            <dt>Tituly pred menom</dt>
            <dd>{shown(record.titlesBefore)}</dd>
          </div>
          <div>
            <dt>Tituly za menom</dt>
            <dd>{shown(record.titlesAfter)}</dd>
          </div>
          <div>
            <dt>Kanonická inštitúcia</dt>
            <dd>{institution?.fullName ?? record.institutionId}</dd>
          </div>
          <div>
            <dt>Zdrojová inštitúcia</dt>
            <dd>{record.institutionSource}</dd>
          </div>
          <div>
            <dt>Fakulta</dt>
            <dd>{shown(record.faculty)}</dd>
          </div>
          <div>
            <dt>Zdrojový odbor</dt>
            <dd>{record.field}</dd>
          </div>
          <div>
            <dt>Dátum vymenovania</dt>
            <dd>{formatDate(record.appointedOn)}</dd>
          </div>
          <div>
            <dt>Prezident</dt>
            <dd>{president?.name ?? record.presidentId}</dd>
          </div>
          <div>
            <dt>Zdrojové riadky</dt>
            <dd>{sourceRows || 'neuvedené'}</dd>
          </div>
        </dl>
        <section aria-labelledby={`variants-${record.id}`}>
          <h3 id={`variants-${record.id}`}>Zdrojové varianty a preskúmané rozdiely</h3>
          <SourceVariants record={record} />
        </section>
      </div>
    </details>
  )
}

export default function RecordList({ records, institutions, presidents }: RecordListProps) {
  const [sort, setSort] = useState<SortState>({ key: 'appointedOn', direction: 'descending' })
  const [page, setPage] = useState(1)
  const institutionById = useMemo(
    () => new Map(institutions.map((institution) => [institution.id, institution] as const)),
    [institutions],
  )
  const presidentById = useMemo(
    () => new Map(presidents.map((president) => [president.id, president] as const)),
    [presidents],
  )

  useEffect(() => {
    setPage(1)
  }, [records])

  const sortedRecords = useMemo(() => {
    const value = (record: Appointment): string => {
      switch (sort.key) {
        case 'name':
          return record.name
        case 'institution':
          return institutionById.get(record.institutionId)?.fullName ?? record.institutionId
        case 'field':
          return record.field
        case 'appointedOn':
          return record.appointedOn
        case 'president':
          return presidentById.get(record.presidentId)?.name ?? record.presidentId
      }
    }
    const direction = sort.direction === 'ascending' ? 1 : -1
    return [...records].sort(
      (left, right) =>
        direction * slovakCollator.compare(value(left), value(right)) ||
        slovakCollator.compare(left.name, right.name) ||
        left.id.localeCompare(right.id),
    )
  }, [institutionById, presidentById, records, sort])

  const pageCount = Math.max(1, Math.ceil(sortedRecords.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const pageRecords = sortedRecords.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const changeSort = (key: SortKey) => {
    setSort((current) => ({
      key,
      direction:
        current.key === key && current.direction === 'ascending' ? 'descending' : 'ascending',
    }))
    setPage(1)
  }

  const selectSortKey = (key: SortKey) => {
    setSort((current) =>
      current.key === key ? current : { key, direction: 'ascending' },
    )
    setPage(1)
  }

  const toggleSortDirection = () => {
    setSort((current) => ({
      ...current,
      direction: current.direction === 'ascending' ? 'descending' : 'ascending',
    }))
    setPage(1)
  }

  return (
    <div className="record-list">
      {records.length === 0 ? (
        <p className="record-list__empty" role="status">
          Výberu nezodpovedá nijaký záznam.
        </p>
      ) : (
        <>
          <div className="record-sort-toolbar" role="group" aria-label="Zoradenie záznamov">
            <label>
              <span>Zoradiť záznamy podľa</span>
              <select
                value={sort.key}
                onChange={(event) => selectSortKey(event.currentTarget.value as SortKey)}
              >
                {SORT_COLUMNS.map((column) => (
                  <option value={column.key} key={column.key}>
                    {column.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              aria-label={`Zmeniť smer zoradenia, teraz ${
                sort.direction === 'ascending' ? 'vzostupne' : 'zostupne'
              }`}
              onClick={toggleSortDirection}
            >
              {sort.direction === 'ascending' ? 'Vzostupne ↑' : 'Zostupne ↓'}
            </button>
          </div>
          <div className="record-table-wrap">
            <table className="record-table">
              <caption className="visually-hidden">Záznamy v aktívnom výbere</caption>
              <thead>
                <tr>
                  {SORT_COLUMNS.map((column) => (
                    <th
                      scope="col"
                      aria-sort={sort.key === column.key ? sort.direction : 'none'}
                      key={column.key}
                    >
                      <SortButton activeSort={sort} column={column} onSort={changeSort} />
                    </th>
                  ))}
                  <th scope="col">Podrobnosti</th>
                </tr>
              </thead>
              <tbody>
                {pageRecords.map((record) => {
                  const institution = institutionById.get(record.institutionId)
                  const president = presidentById.get(record.presidentId)
                  return (
                    <tr key={record.id}>
                      <td data-label="Meno">
                        <strong>{record.name}</strong>
                      </td>
                      <td data-label="Inštitúcia a fakulta">
                        <span>{institution?.fullName ?? record.institutionId}</span>
                        <small>{shown(record.faculty)}</small>
                      </td>
                      <td data-label="Odbor">{record.field}</td>
                      <td data-label="Dátum">
                        <time dateTime={record.appointedOn}>{formatDate(record.appointedOn)}</time>
                      </td>
                      <td data-label="Prezident">{president?.name ?? record.presidentId}</td>
                      <td data-label="Podrobnosti">
                        <RecordDetail record={record} institution={institution} president={president} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {records.length > 0 && (
        <nav className="record-pagination" aria-label="Stránkovanie záznamov">
          <button
            type="button"
            disabled={safePage === 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Predchádzajúca strana
          </button>
          <p aria-live="polite">
            Strana {formatNumber(safePage)} z {formatNumber(pageCount)}
          </p>
          <button
            type="button"
            disabled={safePage === pageCount}
            onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
          >
            Nasledujúca strana
          </button>
        </nav>
      )}
    </div>
  )
}
