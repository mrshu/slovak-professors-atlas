import { useMemo } from 'react'

import {
  buildFieldEducationLandscape,
  type FieldEducationRange,
} from '../analysis/fieldEducation'
import type {
  Appointment,
  FieldCatalog,
  FieldEducationComparison as FieldEducationComparisonData,
} from '../data/types'
import { formatNumber } from '../utils/format'
import FieldEducationDetail from './FieldEducationDetail'
import FieldEducationRankings from './FieldEducationRankings'
import FieldEducationScatter from './FieldEducationScatter'

interface FieldEducationComparisonProps {
  comparison: FieldEducationComparisonData
  fieldCatalog: FieldCatalog
  allRecords: readonly Appointment[]
  selectedField: string | null
  onFieldSelect: (fieldKey: string) => void
  fieldRange: FieldEducationRange
  onFieldRangeChange: (startYear: number, endYear: number) => void
}

export default function FieldEducationComparison({
  comparison,
  fieldCatalog,
  allRecords,
  selectedField,
  onFieldSelect,
  fieldRange,
  onFieldRangeChange,
}: FieldEducationComparisonProps) {
  const landscape = useMemo(
    () => buildFieldEducationLandscape(allRecords, fieldCatalog, comparison, fieldRange),
    [
      allRecords,
      comparison,
      fieldCatalog,
      fieldRange.endYear,
      fieldRange.startYear,
    ],
  )
  const selectedRow = selectedField === null
    ? undefined
    : landscape.allRows.find(({ fieldKey }) => fieldKey === selectedField)
  const displayedRow = selectedRow ?? landscape.points[0] ?? landscape.unmatched[0]
  const coverage = landscape.coverage
  const baseUrl = import.meta.env.BASE_URL
  const availableYears = comparison.years.map(({ year }) => year)
  const periodLabel = fieldRange.startYear === fieldRange.endYear
    ? String(fieldRange.startYear)
    : `${fieldRange.startYear} – ${fieldRange.endYear}`

  return (
    <section
      id="odbory-absolventi"
      className="section section--field-education"
      aria-labelledby="field-education-title"
    >
      <div className="field-education__intro">
        <div>
          <p className="eyebrow">Odborová krajina · Vybrané obdobie {periodLabel}</p>
          <h2 id="field-education-title">Profesorské vymenovania × absolventi</h2>
        </div>
        <p>
          Každý bod spája počet udalostí vymenovania s počtom udalostí ukončenia
          vysokoškolského štúdia v rovnakom recenzovanom odbore. Aktuálni študenti
          zostávajú samostatným stavovým kontextom.
        </p>
      </div>

      <div className="field-education__range" role="group" aria-label="Obdobie odborového porovnania">
        <p>
          <strong>Vybrané obdobie</strong>
          <span>{periodLabel}</span>
        </p>
        <label>
          <span>Od roku</span>
          <select
            aria-label="Odbory od roku"
            value={fieldRange.startYear}
            onChange={(event) =>
              onFieldRangeChange(Number(event.currentTarget.value), fieldRange.endYear)
            }
          >
            {availableYears.map((year) => (
              <option key={year} value={year} disabled={year > fieldRange.endYear}>
                {year}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Do roku</span>
          <select
            aria-label="Odbory do roku"
            value={fieldRange.endYear}
            onChange={(event) =>
              onFieldRangeChange(fieldRange.startYear, Number(event.currentTarget.value))
            }
          >
            {availableYears.map((year) => (
              <option key={year} value={year} disabled={year < fieldRange.startYear}>
                {year}
              </option>
            ))}
          </select>
        </label>
      </div>

      {displayedRow === undefined ? (
        <p role="status" className="field-education__empty">
          V spoločnom období nie sú dostupné odbory na porovnanie.
        </p>
      ) : (
        <div className="field-education__primary">
          <FieldEducationScatter
            points={landscape.points}
            selectedField={selectedField}
            onFieldSelect={onFieldSelect}
          />
          <FieldEducationDetail row={displayedRow} />
        </div>
      )}

      <dl className="field-education__coverage" aria-label="Pokrytie odborového porovnania">
        <div>
          <dt>Spôsob priradenia</dt>
          <dd>
            {formatNumber(coverage.exactAppointmentCount)} presne +{' '}
            {formatNumber(coverage.aliasAppointmentCount)} aliasom
          </dd>
        </div>
        <div>
          <dt>Spárované vymenovania</dt>
          <dd>
            {formatNumber(coverage.matchedAppointmentCount)} z{' '}
            {formatNumber(coverage.appointmentCount)} vymenovaní
          </dd>
        </div>
        <div>
          <dt>Spárované odbory</dt>
          <dd>
            {formatNumber(coverage.matchedFieldCount)} z {formatNumber(coverage.fieldCount)} odborov
          </dd>
        </div>
        <div>
          <dt>Vybrané obdobie</dt>
          <dd>
            {coverage.yearCount === 1
              ? '1 rok'
              : `${formatNumber(coverage.yearCount)} rokov`}
          </dd>
        </div>
      </dl>

      <FieldEducationRankings
        rows={landscape.allRows}
        selectedField={selectedField}
        onFieldSelect={onFieldSelect}
      />

      <aside className="field-education__caveat" aria-label="Ako čítať porovnanie">
        <h3>Ako čítať porovnanie</h3>
        <p>
          Vymenovania a absolventi sú udalostné toky s opisným pomerom za celé obdobie.
          Počet študentov je stav k jednému dátumu; preto sa s vymenovaniami nedelí a nie je
          súčasťou osí. Porovnanie neopisuje príčinnosť ani potrebu profesorov v odbore.
        </p>
      </aside>

      <div className="field-education__sources" aria-label="Zdroje odborového porovnania">
        <div>
          <a href={comparison.catalogUrl}>Katalóg štatistickej ročenky CVTI SR</a>
          <details>
            <summary>{formatNumber(comparison.graduateSources.length)} ročných zdrojov absolventov</summary>
            <ul>
              {comparison.graduateSources.map((source) => (
                <li key={source.year}>
                  <a href={source.url}>{source.year} · oficiálny zdroj</a>{' '}
                  <a href={`${baseUrl}data/source/${source.localPath}`} download>uložený XLS</a>
                </li>
              ))}
            </ul>
          </details>
          <a href={comparison.currentStudentsSource.url}>Oficiálny zošit aktuálnych študentov</a>
          <a
            href={`${baseUrl}data/source/${comparison.currentStudentsSource.localPath}`}
            download
          >
            Uložený XLS aktuálnych študentov
          </a>
        </div>
        <p>
          Absolventi: {comparison.graduateSources[0]?.retrievedOn ?? '—'} až{' '}
          {comparison.graduateSources.at(-1)?.retrievedOn ?? '—'}. Študenti:{' '}
          {comparison.currentStudentsSource.retrievedOn}.
        </p>
      </div>
    </section>
  )
}
