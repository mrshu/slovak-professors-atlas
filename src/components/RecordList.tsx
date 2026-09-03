import { Fragment, useEffect, useMemo, useRef, useState } from 'react'

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

const PAGE_SIZE = 30
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
  id,
  record,
  institution,
  president,
}: {
  id: string
  record: Appointment
  institution: Institution | undefined
  president: President | undefined
}) {
  const sourceRows = record.sourceVariants.map(({ rowNumber }) => formatNumber(rowNumber)).join(', ')
  return (
    <div
      id={id}
      className="record-detail"
      role="group"
      aria-label={`Detail záznamu ${record.name}`}
    >
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
    </div>
  )
}

export default function RecordList({ records, institutions, presidents }: RecordListProps) {
  const [sort, setSort] = useState<SortState>({ key: 'appointedOn', direction: 'descending' })
  const [visible, setVisible] = useState(PAGE_SIZE)
  const [openRecordId, setOpenRecordId] = useState<string | null>(null)
  const progressRef = useRef<HTMLParagraphElement>(null)
  const loadMorePressedRef = useRef(false)
  const institutionById = useMemo(
    () => new Map(institutions.map((institution) => [institution.id, institution] as const)),
    [institutions],
  )
  const presidentById = useMemo(
    () => new Map(presidents.map((president) => [president.id, president] as const)),
    [presidents],
  )
  const countByDate = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of records) m.set(r.appointedOn, (m.get(r.appointedOn) ?? 0) + 1)
    return m
  }, [records])

  useEffect(() => {
    setVisible(PAGE_SIZE)
    setOpenRecordId(null)
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

  const pageRecords = sortedRecords.slice(0, visible)
  const hasMore = sortedRecords.length > visible

  useEffect(() => {
    if (loadMorePressedRef.current && !hasMore) {
      loadMorePressedRef.current = false
      progressRef.current?.focus()
    }
  }, [hasMore])

  const changeSort = (key: SortKey) => {
    setSort((current) => ({
      key,
      direction:
        current.key === key && current.direction === 'ascending' ? 'descending' : 'ascending',
    }))
    setVisible(PAGE_SIZE)
  }

  const selectSortKey = (key: SortKey) => {
    setSort((current) =>
      current.key === key ? current : { key, direction: 'ascending' },
    )
    setVisible(PAGE_SIZE)
  }

  const toggleSortDirection = () => {
    setSort((current) => ({
      ...current,
      direction: current.direction === 'ascending' ? 'descending' : 'ascending',
    }))
    setVisible(PAGE_SIZE)
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
                      hidden={
                        sort.key === 'appointedOn' &&
                        (column.key === 'appointedOn' || column.key === 'president')
                      }
                      key={column.key}
                    >
                      <SortButton activeSort={sort} column={column} onSort={changeSort} />
                    </th>
                  ))}
                  <th scope="col">Podrobnosti</th>
                </tr>
              </thead>
              <tbody>
                {pageRecords.map((record, index) => {
                  const institution = institutionById.get(record.institutionId)
                  const president = presidentById.get(record.presidentId)
                  const detailId = `record-detail-${record.id}`
                  const detailOpen = openRecordId === record.id
                  const grouped = sort.key === 'appointedOn'
                  const startsGroup =
                    grouped && (index === 0 || pageRecords[index - 1]?.appointedOn !== record.appointedOn)
                  return (
                    <Fragment key={record.id}>
                      {startsGroup && (
                        <tr
                          className="record-table__group"
                          aria-label={`${formatDate(record.appointedOn)} · ${formatNumber(countByDate.get(record.appointedOn) ?? 0)} vymenovaní · ${presidentById.get(record.presidentId)?.name ?? 'neuvedené'}`}
                        >
                          <td colSpan={SORT_COLUMNS.length + 1}>
                            {formatDate(record.appointedOn)}
                            <span>
                              {formatNumber(countByDate.get(record.appointedOn) ?? 0)} vymenovaní ·{' '}
                              {presidentById.get(record.presidentId)?.name ?? 'neuvedené'}
                            </span>
                          </td>
                        </tr>
                      )}
                      <tr className="record-row">
                        <td data-label="Meno">
                          <span>
                            {record.titlesBefore ? `${record.titlesBefore} ` : ''}
                            <strong>{record.name}</strong>
                            {record.titlesAfter ? `, ${record.titlesAfter}` : ''}
                          </span>
                        </td>
                        <td data-label="Inštitúcia a fakulta">
                          <span>{institution?.fullName ?? record.institutionId}</span>
                          <small>{shown(record.faculty)}</small>
                        </td>
                        <td data-label="Odbor">{record.field}</td>
                        <td data-label="Dátum" hidden={grouped}>
                          <time dateTime={record.appointedOn}>{formatDate(record.appointedOn)}</time>
                        </td>
                        <td data-label="Prezident" hidden={grouped}>
                          {president?.name ?? record.presidentId}
                        </td>
                        <td data-label="Podrobnosti">
                          <button
                            type="button"
                            className="record-detail__toggle"
                            aria-expanded={detailOpen}
                            aria-controls={detailId}
                            onClick={() =>
                              setOpenRecordId((current) =>
                                current === record.id ? null : record.id,
                              )
                            }
                          >
                            {detailOpen ? 'Skryť detail' : 'Zobraziť detail'}
                          </button>
                        </td>
                      </tr>
                      {detailOpen && (
                        <tr className="record-detail-row">
                          <td colSpan={6}>
                            <RecordDetail
                              id={detailId}
                              record={record}
                              institution={institution}
                              president={president}
                            />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {hasMore && (
        <button
          type="button"
          className="record-list__more"
          onClick={() => {
            loadMorePressedRef.current = true
            setVisible((count) => count + PAGE_SIZE)
          }}
        >
          Zobraziť ďalších {formatNumber(Math.min(PAGE_SIZE, sortedRecords.length - visible))} záznamov
        </button>
      )}
      {sortedRecords.length > 0 && (
        <p className="record-list__progress" role="status" tabIndex={-1} ref={progressRef}>
          Zobrazených {formatNumber(Math.min(visible, sortedRecords.length))} z{' '}
          {formatNumber(sortedRecords.length)} záznamov
        </p>
      )}
    </div>
  )
}
