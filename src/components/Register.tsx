import { useEffect, useMemo, useState } from 'react'

import type { AtlasData } from '../data/types'
import type { AtlasState } from '../state/useAtlasState'
import { recordsToCsv } from '../utils/csv'
import { formatAppointmentCount, formatDate } from '../utils/format'
import AppointmentTimeline from './AppointmentTimeline'
import RecordList from './RecordList'

interface LoadedRegisterProps {
  data: AtlasData
  atlasState: AtlasState
  status?: never
}

interface StatusRegisterProps {
  data?: never
  atlasState?: never
  status: 'loading' | 'error'
}

type RegisterProps = LoadedRegisterProps | StatusRegisterProps

interface ActiveChip {
  key: string
  label: string
  remove: () => void
}

function RegisterShell({ status }: { status: 'loading' | 'error' }) {
  return (
    <section id="register" className="register" aria-labelledby="register-title">
      <div className="register__head">
        <div>
          <p className="card__kicker">Úplný register</p>
          <h2 id="register-title">Úplný register profesorských vymenovaní</h2>
        </div>
      </div>
      <div className="register__state" role="status">
        <p>{status === 'loading' ? 'Register sa načítava' : 'Register nie je dostupný'}</p>
        <p>
          {status === 'loading'
            ? 'Filtre a záznamy zobrazíme po overení dátového súboru.'
            : 'Záznamy nemožno bezpečne zobraziť, kým sa nepodarí načítať dátový súbor.'}
        </p>
      </div>
    </section>
  )
}

function LoadedRegister({ data, atlasState }: LoadedRegisterProps) {
  const {
    filters,
    options,
    defaults,
    filteredRecords,
    setFilter,
    setDateRange,
    setTimelineYear,
    setAppointmentDate,
    setQuery,
    resetFilters,
  } = atlasState
  const [announcedCount, setAnnouncedCount] = useState(filteredRecords.length)
  const [exportError, setExportError] = useState<string | null>(null)
  const presidentById = useMemo(
    () => new Map(data.presidents.map((president) => [president.id, president] as const)),
    [data.presidents],
  )
  const institutionById = useMemo(
    () => new Map(data.institutions.map((institution) => [institution.id, institution] as const)),
    [data.institutions],
  )
  const fieldLabelByKey = useMemo(
    () => new Map(options.fields.map(({ key, canonicalLabel }) => [key, canonicalLabel] as const)),
    [options.fields],
  )
  const availableYears = useMemo(
    () =>
      Array.from(
        { length: defaults.endYear - defaults.startYear + 1 },
        (_, index) => defaults.startYear + index,
      ),
    [defaults.endYear, defaults.startYear],
  )

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setAnnouncedCount(filteredRecords.length)
    }, 150)
    return () => window.clearTimeout(timeout)
  }, [filteredRecords.length, filters.query])

  const activeChips: ActiveChip[] = []
  if (filters.startYear !== defaults.startYear || filters.endYear !== defaults.endYear) {
    activeChips.push({
      key: 'date',
      label:
        filters.startYear === filters.endYear
          ? `Rok: ${filters.startYear}`
          : `Obdobie: ${filters.startYear}—${filters.endYear}`,
      remove: () => setTimelineYear(null, 'push'),
    })
  }
  if (filters.appointedOn !== null) {
    activeChips.push({
      key: 'appointment-date',
      label: `Ceremoniál: ${formatDate(filters.appointedOn)}`,
      remove: () => setAppointmentDate(null, 'push'),
    })
  }
  if (filters.presidentId !== null) {
    activeChips.push({
      key: 'president',
      label: `Prezident: ${presidentById.get(filters.presidentId)?.name ?? filters.presidentId}`,
      remove: () => setFilter('presidentId', null, 'push'),
    })
  }
  if (filters.city !== null) {
    activeChips.push({
      key: 'city',
      label: `Mesto: ${filters.city}`,
      remove: () => setFilter('city', null, 'push'),
    })
  }
  if (filters.institutionId !== null) {
    activeChips.push({
      key: 'institution',
      label: `Inštitúcia: ${
        institutionById.get(filters.institutionId)?.shortName ?? filters.institutionId
      }`,
      remove: () => setFilter('institutionId', null, 'push'),
    })
  }
  if (filters.faculty !== null) {
    activeChips.push({
      key: 'faculty',
      label: `Fakulta: ${filters.faculty}`,
      remove: () => setFilter('faculty', null, 'push'),
    })
  }
  if (filters.field !== null) {
    activeChips.push({
      key: 'field',
      label: `Odbor: ${fieldLabelByKey.get(filters.field) ?? filters.field}`,
      remove: () => setFilter('field', null, 'push'),
    })
  }
  if (filters.query.length > 0) {
    activeChips.push({
      key: 'query',
      label: `Hľadanie: ${filters.query}`,
      remove: () => setQuery(''),
    })
  }

  const hasActiveState =
    activeChips.length > 0 || filters.selectedYear !== defaults.selectedYear

  const downloadFilteredCsv = () => {
    setExportError(null)
    let objectUrl: string | null = null
    let link: HTMLAnchorElement | null = null
    let failed = false

    try {
      const blob = new Blob([recordsToCsv(filteredRecords, data)], {
        type: 'text/csv;charset=utf-8',
      })
      objectUrl = URL.createObjectURL(blob)
      link = document.createElement('a')
      link.href = objectUrl
      link.download = `profesori-filter-${new Date().toISOString().slice(0, 10)}.csv`
      link.hidden = true
      document.body.append(link)
      link.click()
    } catch {
      failed = true
    } finally {
      try {
        link?.remove()
      } catch {
        failed = true
      }
      if (objectUrl !== null) {
        try {
          URL.revokeObjectURL(objectUrl)
        } catch {
          failed = true
        }
      }
      if (failed) {
        setExportError('CSV sa nepodarilo stiahnuť. Skúste to znova.')
      }
    }
  }

  return (
    <section id="register" className="register" aria-labelledby="register-title">
      <div className="register__head">
        <div>
          <p className="card__kicker">Úplný register</p>
          <h2 id="register-title">Úplný register profesorských vymenovaní</h2>
        </div>
        <div className="register__filters">
          <input
            type="search"
            aria-label="Hľadať v záznamoch"
            placeholder="Meno, pracovisko, fakulta alebo odbor"
            value={filters.query}
            onChange={(event) => setQuery(event.currentTarget.value)}
          />
          <select
            aria-label="Prezident"
            value={filters.presidentId ?? ''}
            onChange={(event) =>
              setFilter('presidentId', event.currentTarget.value || null, 'push')
            }
          >
            <option value="">Všetci prezidenti</option>
            {data.presidents.map((president) => (
              <option value={president.id} key={president.id}>
                {president.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Mesto"
            value={filters.city ?? ''}
            onChange={(event) => setFilter('city', event.currentTarget.value || null, 'push')}
          >
            <option value="">Všetky mestá</option>
            {options.cities.map((city) => (
              <option value={city} key={city}>
                {city}
              </option>
            ))}
          </select>
          <select
            aria-label="Kanonická inštitúcia"
            value={filters.institutionId ?? ''}
            onChange={(event) =>
              setFilter('institutionId', event.currentTarget.value || null, 'push')
            }
          >
            <option value="">Všetky inštitúcie</option>
            {data.institutions.map((institution) => (
              <option value={institution.id} key={institution.id}>
                {institution.fullName}
              </option>
            ))}
          </select>
        </div>
      </div>
      <details className="fold register__more-filters">
        <summary>Viac filtrov</summary>
        <div className="register__filters register__filters--secondary">
          <select
            aria-label="Fakulta"
            value={filters.faculty ?? ''}
            onChange={(event) => setFilter('faculty', event.currentTarget.value || null, 'push')}
          >
            <option value="">Všetky uvedené fakulty</option>
            {options.faculties.map((faculty) => (
              <option value={faculty} key={faculty}>
                {faculty}
              </option>
            ))}
          </select>
          <select
            aria-label="Odbor"
            value={filters.field ?? ''}
            onChange={(event) => setFilter('field', event.currentTarget.value || null, 'push')}
          >
            <option value="">Všetky zdrojové odbory</option>
            {options.fields.map(({ key, canonicalLabel }) => (
              <option value={key} key={key}>
                {canonicalLabel}
              </option>
            ))}
          </select>
          <select
            aria-label="Od roku"
            value={String(filters.startYear)}
            onChange={(event) =>
              setDateRange(Number(event.currentTarget.value), filters.endYear, 'push')
            }
          >
            {availableYears.map((year) => (
              <option value={year} disabled={year > filters.endYear} key={year}>
                {year}
              </option>
            ))}
          </select>
          <select
            aria-label="Do roku"
            value={String(filters.endYear)}
            onChange={(event) =>
              setDateRange(filters.startYear, Number(event.currentTarget.value), 'push')
            }
          >
            {availableYears.map((year) => (
              <option value={year} disabled={year < filters.startYear} key={year}>
                {year}
              </option>
            ))}
          </select>
          <button type="button" disabled={!hasActiveState} onClick={() => resetFilters('push')}>
            Vynulovať všetky filtre
          </button>
          <button
            type="button"
            className="register__export"
            disabled={filteredRecords.length === 0}
            onClick={downloadFilteredCsv}
          >
            Stiahnuť filtrované CSV
          </button>
        </div>
      </details>
      <div className="register__state">
        <p aria-hidden="true">
          <strong>{formatAppointmentCount(filteredRecords.length)}</strong> vo výbere
        </p>
        <p className="visually-hidden" role="status" aria-live="polite">
          {formatAppointmentCount(announcedCount)} vo výbere
        </p>
        {activeChips.length > 0 && (
          <ul aria-label="Aktívne filtre">
            {activeChips.map((chip) => (
              <li key={chip.key}>
                <button
                  type="button"
                  aria-label={`Odstrániť filter ${chip.label}`}
                  onClick={chip.remove}
                >
                  <span>{chip.label}</span>
                  <span aria-hidden="true">×</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {exportError && (
          <p className="register__error" role="alert">
            {exportError}
          </p>
        )}
      </div>
      <RecordList
        records={filteredRecords}
        institutions={data.institutions}
        presidents={data.presidents}
      />
      <details className="fold">
        <summary>Časová os slávností</summary>
        <AppointmentTimeline
          records={filteredRecords}
          coverageEnd={data.meta.appointmentDateMax}
          presidents={data.presidents}
          selectedPresidentId={filters.presidentId}
          selectedStartYear={filters.startYear}
          selectedEndYear={filters.endYear}
          onToggleYear={(year) =>
            setTimelineYear(filters.startYear === year && filters.endYear === year ? null : year, 'push')
          }
        />
      </details>
    </section>
  )
}

export default function Register(props: RegisterProps) {
  if (props.status !== undefined) {
    return <RegisterShell status={props.status} />
  }
  return <LoadedRegister data={props.data} atlasState={props.atlasState} />
}
