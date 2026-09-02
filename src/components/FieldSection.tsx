import { useMemo, useState } from 'react'

import { buildFieldEducationLandscape, type FieldEducationRange } from '../analysis/fieldEducation'
import type { AtlasData } from '../data/types'
import { formatNumber } from '../utils/format'
import { normalizeForSearch } from '../utils/search'
import FieldEducationDetail from './FieldEducationDetail'
import FieldEducationRankings from './FieldEducationRankings'
import FieldEducationScatter from './FieldEducationScatter'
import type { ScaleMode } from './fieldEducationGeometry'

interface FieldSectionProps {
  data: AtlasData
  selectedField: string | null
  onFieldSelect: (fieldKey: string) => void
  fieldRange: FieldEducationRange
  onFieldRangeChange: (startYear: number, endYear: number) => void
}

export default function FieldSection({
  data,
  selectedField,
  onFieldSelect,
  fieldRange,
  onFieldRangeChange,
}: FieldSectionProps) {
  const [mode, setMode] = useState<ScaleMode>('log')
  const [query, setQuery] = useState('')
  const landscape = useMemo(
    () =>
      buildFieldEducationLandscape(
        data.records,
        data.fieldCatalog,
        data.fieldEducationComparison,
        fieldRange,
      ),
    [data, fieldRange],
  )
  const points = landscape.points.filter((point) => point.graduateCount > 0)
  const zeroRail = landscape.points.filter((point) => point.graduateCount === 0)
  const selectedRow =
    landscape.allRows.find((row) => row.fieldKey === selectedField) ??
    points[0] ??
    landscape.allRows[0]
  const years = data.fieldEducationComparison.years.map(({ year }) => year)
  const findMatch = () => {
    const needle = normalizeForSearch(query)
    if (needle.length === 0) return null
    return (
      landscape.allRows.find((row) => normalizeForSearch(row.canonicalLabel) === needle) ??
      landscape.allRows.find((row) => normalizeForSearch(row.canonicalLabel).includes(needle)) ??
      null
    )
  }

  return (
    <section id="odbory" className="field-section" aria-labelledby="field-section-title">
      <div className="field-section__head">
        <div>
          <p className="card__kicker">
            Odbory × absolventi · {fieldRange.startYear}–{fieldRange.endYear}
          </p>
          <h2 id="field-section-title">Profesorské vymenovania a absolventi v rovnakom odbore</h2>
          <p className="card__sub">
            Každý bod je jeden recenzovaný odbor: vodorovne počet vymenovaní, zvislo počet
            absolventov I. až III. stupňa za vybrané obdobie. Šikmé čiary sú pomery absolventov
            na jedno vymenovanie.
          </p>
        </div>
        <div className="field-section__search">
          <input
            type="search"
            role="combobox"
            aria-label="Nájsť odbor"
            aria-expanded="false"
            aria-controls="field-section-list"
            list="field-section-list"
            placeholder="Nájsť odbor"
            value={query}
            onChange={(event) => {
              const value = event.currentTarget.value
              setQuery(value)
              const exact = landscape.allRows.find(
                (row) => normalizeForSearch(row.canonicalLabel) === normalizeForSearch(value),
              )
              if (exact) onFieldSelect(exact.fieldKey)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                const match = findMatch()
                if (match) onFieldSelect(match.fieldKey)
              }
            }}
          />
          <datalist id="field-section-list">
            {landscape.allRows.map((row) => (
              <option key={row.fieldKey} value={row.canonicalLabel} />
            ))}
          </datalist>
        </div>
        <div className="field-section__controls">
          <div className="seg" role="group" aria-label="Mierka">
            <button type="button" aria-pressed={mode === 'log'} onClick={() => setMode('log')}>
              Logaritmická
            </button>
            <button type="button" aria-pressed={mode === 'linear'} onClick={() => setMode('linear')}>
              Absolútna
            </button>
          </div>
          <label>
            Od roku
            <select
              aria-label="Odbory od roku"
              value={fieldRange.startYear}
              onChange={(event) => onFieldRangeChange(Number(event.currentTarget.value), fieldRange.endYear)}
            >
              {years.map((year) => (
                <option key={year} value={year} disabled={year > fieldRange.endYear}>
                  {year}
                </option>
              ))}
            </select>
          </label>
          <label>
            Do roku
            <select
              aria-label="Odbory do roku"
              value={fieldRange.endYear}
              onChange={(event) => onFieldRangeChange(fieldRange.startYear, Number(event.currentTarget.value))}
            >
              {years.map((year) => (
                <option key={year} value={year} disabled={year < fieldRange.startYear}>
                  {year}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <div className="field-section__plot">
        <FieldEducationScatter
          points={points}
          zeroRail={zeroRail}
          selectedField={selectedField}
          onFieldSelect={onFieldSelect}
          mode={mode}
        />
      </div>
      <aside className="field-section__detail">
        {selectedRow === undefined ? (
          <p role="status">V spoločnom období nie sú dostupné odbory na porovnanie.</p>
        ) : (
          <FieldEducationDetail row={selectedRow} />
        )}
      </aside>
      <p className="field-section__cap">
        {formatNumber(points.length)} odborov s absolventmi aj vymenovaním,{' '}
        {formatNumber(zeroRail.length)} odborov s vymenovaním bez absolventa (spodný riadok),{' '}
        {formatNumber(landscape.unmatched.length)} odborov bez spárovania. Spárované vymenovania:{' '}
        {formatNumber(landscape.coverage.matchedAppointmentCount)} z{' '}
        {formatNumber(landscape.coverage.appointmentCount)} (
        {formatNumber(landscape.coverage.exactAppointmentCount)} presne,{' '}
        {formatNumber(landscape.coverage.aliasAppointmentCount)} aliasom). Pomer je opisný, nie
        príčinný.
      </p>
      <details className="fold field-section__fold">
        <summary>Rebríček odborov</summary>
        <FieldEducationRankings rows={landscape.allRows} selectedField={selectedField} onFieldSelect={onFieldSelect} />
      </details>
      <div className="field-section__sources">
        <p>
          <a href={data.fieldEducationComparison.catalogUrl}>Štatistické ročenky CVTI SR</a> ·
          absolventi {data.fieldEducationComparison.startYear}–{data.fieldEducationComparison.endYear}
          · študenti k 31. 10. {data.fieldEducationComparison.currentStudentsSource.year}
        </p>
        <details>
          <summary>
            {formatNumber(data.fieldEducationComparison.graduateSources.length)} ročných zdrojov absolventov
          </summary>
          <ul>
            {data.fieldEducationComparison.graduateSources.map((source) => (
              <li key={source.year}>
                <a href={source.url}>{source.year} · oficiálny zdroj</a>{' '}
                <a href={`${import.meta.env.BASE_URL}data/source/${source.localPath}`} download>
                  uložený XLS
                </a>
              </li>
            ))}
          </ul>
          <p>
            <a href={data.fieldEducationComparison.currentStudentsSource.url}>
              Oficiálny zošit aktuálnych študentov
            </a>{' '}
            <a
              href={`${import.meta.env.BASE_URL}data/source/${data.fieldEducationComparison.currentStudentsSource.localPath}`}
              download
            >
              Uložený XLS aktuálnych študentov
            </a>
          </p>
        </details>
      </div>
    </section>
  )
}
