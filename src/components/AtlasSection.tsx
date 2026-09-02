import { useMemo, type ReactNode } from 'react'

import type { AtlasData } from '../data/types'
import type { AtlasState } from '../state/useAtlasState'
import { formatAppointmentCount, formatDate } from '../utils/format'
import AnalysisLenses from './AnalysisLenses'
import AppointmentTimeline from './AppointmentTimeline'
import InstitutionRanking from './InstitutionRanking'
import SlovakiaMap from './SlovakiaMap'

interface LoadedAtlasSectionProps {
  data: AtlasData
  atlasState: AtlasState
  status?: never
}

interface StatusAtlasSectionProps {
  data?: never
  atlasState?: never
  status: 'loading' | 'error'
}

type AtlasSectionProps = LoadedAtlasSectionProps | StatusAtlasSectionProps

interface AtlasShellProps {
  children?: ReactNode
  status?: 'loading' | 'error'
}

interface ActiveChip {
  key: string
  label: string
  remove: () => void
}

function AtlasShell({ children, status }: AtlasShellProps) {
  return (
    <section id="atlas" className="section section--atlas" aria-labelledby="atlas-title">
      <svg className="atlas-contours" viewBox="0 0 1200 1040" aria-hidden="true">
        <path d="M-80 94c190-96 344-91 494-20 139 66 252 65 398-6 138-68 257-70 438-5" />
        <path d="M-92 155C93 63 250 68 399 137c143 66 261 66 407-5 136-66 253-69 438-7" />
        <path d="M-104 223C77 134 235 139 385 207c145 66 266 65 412-7 136-66 253-68 442-6" />
        <path d="M-108 301c179-87 335-82 486-16 148 65 271 63 416-9 136-67 254-69 448-7" />
        <path d="M-98 385c174-83 326-78 476-14 151 65 276 61 421-12 137-68 258-69 449-6" />
      </svg>
      <div className="section__heading section__heading--split section__heading--light">
        <div>
          <p className="eyebrow eyebrow--light">Prepojená akademická mapa</p>
          <h2 id="atlas-title">Atlas pracovísk a období</h2>
        </div>
        <p>
          Mesto označuje polohu navrhujúceho pracoviska, nie bydlisko profesora. Mapa,
          pracoviská, časová os aj analytické pohľady čítajú ten istý aktívny výber.
        </p>
      </div>
      <dl className="atlas-register" aria-label="Čítanie akademického atlasu">
        <div>
          <dt>Poloha</dt>
          <dd>Mestá pracovísk a kanonické inštitúcie</dd>
        </div>
        <div>
          <dt>Štruktúra</dt>
          <dd>Zdrojové názvy fakúlt a odborov</dd>
        </div>
        <div>
          <dt>Čas</dt>
          <dd>Dátumy slávností a prezidentské obdobia</dd>
        </div>
      </dl>

      {status !== undefined && (
        <div className="atlas-status" role="status">
          <p className="atlas-status__title">
            {status === 'loading' ? 'Prepojený atlas sa načítava' : 'Prepojený atlas nie je dostupný'}
          </p>
          <p>
            {status === 'loading'
              ? 'Mapu, poradie pracovísk a časovú os zobrazíme po overení dátového súboru.'
              : 'Výbery a analytické pohľady nemožno bezpečne zobraziť, kým sa nepodarí načítať dátový súbor.'}
          </p>
        </div>
      )}
      {children}
    </section>
  )
}

function LoadedAtlasSection({ data, atlasState }: LoadedAtlasSectionProps) {
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
  const presidentById = useMemo(
    () => new Map(data.presidents.map((president) => [president.id, president])),
    [data.presidents],
  )
  const institutionById = useMemo(
    () => new Map(data.institutions.map((institution) => [institution.id, institution])),
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
    filters.startYear !== defaults.startYear ||
    filters.endYear !== defaults.endYear ||
    filters.presidentId !== null ||
    filters.appointedOn !== null ||
    filters.city !== null ||
    filters.institutionId !== null ||
    filters.faculty !== null ||
    filters.field !== null ||
    filters.query.length > 0 ||
    filters.selectedYear !== defaults.selectedYear

  return (
    <AtlasShell>
      <div className="atlas-controls" aria-label="Filtre prepojeného atlasu">
        <div className="atlas-controls__fields">
          <label>
            <span>Prezident</span>
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
          </label>
          <label>
            <span>Od roku</span>
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
          </label>
          <label>
            <span>Do roku</span>
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
          </label>
        </div>
        <button
          className="atlas-controls__reset"
          type="button"
          disabled={!hasActiveState}
          onClick={() => resetFilters('push')}
        >
          Vynulovať všetky filtre
        </button>
      </div>

      <div className="atlas-active-state">
        <p role="status" aria-live="off">
          <strong>{formatAppointmentCount(filteredRecords.length)}</strong> v aktívnom výbere
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
      </div>

      <div className="atlas-linked-grid">
        <SlovakiaMap
          records={filteredRecords}
          geography={data.geography}
          cities={data.cities}
          affiliations={data.affiliations}
          selectedCity={filters.city}
          hoveredCity={null}
          onHoverCity={() => {}}
          onToggleCity={(city) => setFilter('city', filters.city === city ? null : city, 'push')}
        />
        <InstitutionRanking
          records={filteredRecords}
          institutions={data.institutions}
          selectedInstitutionId={filters.institutionId}
          onToggleInstitution={(institutionId) =>
            setFilter(
              'institutionId',
              filters.institutionId === institutionId ? null : institutionId,
              'push',
            )
          }
        />
      </div>

      <AnalysisLenses
        records={filteredRecords}
        institutions={data.institutions}
        affiliations={data.affiliations}
        presidents={data.presidents}
      />

      <AppointmentTimeline
        records={filteredRecords}
        coverageEnd={data.meta.appointmentDateMax}
        presidents={data.presidents}
        selectedPresidentId={filters.presidentId}
        selectedStartYear={filters.startYear}
        selectedEndYear={filters.endYear}
        onToggleYear={(year) =>
          setTimelineYear(
            filters.startYear === year && filters.endYear === year ? null : year,
            'push',
          )
        }
      />

    </AtlasShell>
  )
}

export default function AtlasSection(props: AtlasSectionProps) {
  if (props.status !== undefined) {
    return <AtlasShell status={props.status} />
  }
  return <LoadedAtlasSection data={props.data} atlasState={props.atlasState} />
}
