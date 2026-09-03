import { useMemo, useState } from 'react'

import {
  FIVE_YEAR_PERIODS,
  cityShares,
  citySharesByPeriod,
  periodForRange,
} from '../analysis/periods'
import { filterAppointments } from '../analysis/selectors'
import type { AtlasData } from '../data/types'
import type { AtlasState } from '../state/useAtlasState'
import useIsNarrowViewport from '../hooks/useIsNarrowViewport'
import { formatAppointmentCount } from '../utils/format'
import CityStrip, { type CityStripCell } from './CityStrip'
import InstitutionRanking from './InstitutionRanking'
import SlovakiaMap from './SlovakiaMap'

interface MapStageProps {
  data: AtlasData
  atlasState: AtlasState
}

const STRIP_SIZE = 7
export default function MapStage({ data, atlasState }: MapStageProps) {
  const { filters, defaults, filteredRecords, setDateRange, setFilter } = atlasState
  const [hoveredCity, setHoveredCity] = useState<string | null>(null)
  const isNarrow = useIsNarrowViewport()
  const activePeriod = periodForRange(filters.startYear, filters.endYear)
  const wholeRange =
    filters.startYear === defaults.startYear && filters.endYear === defaults.endYear
  const periodLabel =
    activePeriod?.label ??
    (wholeRange ? `${defaults.startYear}–${defaults.endYear}` : `${filters.startYear}–${filters.endYear}`)
  const activeIndex = activePeriod === null ? -1 : FIVE_YEAR_PERIODS.indexOf(activePeriod)

  const stageRecords = useMemo(
    () => filterAppointments(data, { ...filters, city: null }),
    [data, filters],
  )

  const byPeriod = useMemo(
    () => citySharesByPeriod(data.records, data.affiliations),
    [data.affiliations, data.records],
  )
  const baseline = byPeriod.get(FIVE_YEAR_PERIODS[0]!.label) ?? []
  const cells = useMemo<CityStripCell[]>(() => {
    const current = cityShares(stageRecords, data.affiliations).slice(0, STRIP_SIZE)
    return current.map(({ city, share }) => {
      const base = baseline.find((entry) => entry.city === city)?.share ?? 0
      return {
        city,
        share,
        delta: activeIndex <= 0 || baseline.length === 0 ? null : (share - base) * 100,
        series: FIVE_YEAR_PERIODS.map(
          (period) =>
            byPeriod.get(period.label)?.find((entry) => entry.city === city)?.share ?? 0,
        ),
      }
    })
  }, [activeIndex, baseline, byPeriod, data.affiliations, stageRecords])

  const toggleCity = (city: string) =>
    setFilter('city', filters.city === city ? null : city, 'push')

  return (
    <section
      id="mapa"
      className="map-stage"
      aria-labelledby="map-stage-title"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && filters.city !== null) setFilter('city', null, 'push')
      }}
    >
      <div className="map-stage__head">
        <h2 id="map-stage-title">
          Mapa pracovísk, <em>{periodLabel}</em>
        </h2>
        <div className="map-stage__periods" role="group" aria-label="Obdobie">
          {FIVE_YEAR_PERIODS.map((period) => (
            <button
              key={period.label}
              type="button"
              aria-pressed={period === activePeriod}
              onClick={() => setDateRange(period.startYear, period.endYear, 'push')}
            >
              {period.label}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={wholeRange}
            onClick={() => setDateRange(defaults.startYear, defaults.endYear, 'push')}
          >
            Celé obdobie
          </button>
        </div>
      </div>
      <SlovakiaMap
        records={stageRecords}
        geography={data.geography}
        cities={data.cities}
        affiliations={data.affiliations}
        selectedCity={filters.city}
        hoveredCity={hoveredCity}
        onHoverCity={setHoveredCity}
        onToggleCity={toggleCity}
        labelLimit={isNarrow ? 4 : 8}
        showSizeKey={!isNarrow}
      />
      {filters.city === null ? (
        <p className="map-stage__cap">
          Plocha kruhu = počet vymenovaní navrhnutých pracoviskami v meste. Mesto je sídlo
          pracoviska, nie bydlisko profesora. Kliknutím na mesto alebo jeho pásik filtrujete
          register.
        </p>
      ) : (
        <div className="map-stage__selection" role="status">
          <p>
            <strong>Vybrané mesto: {filters.city}</strong> · {formatAppointmentCount(filteredRecords.length)} v
            registri. Ostatné mestá ostávajú na mape kvôli porovnaniu.
          </p>
          <button type="button" onClick={() => setFilter('city', null, 'push')}>
            Zrušiť výber <span aria-hidden="true">×</span>
          </button>
        </div>
      )}
      <CityStrip
        cells={cells}
        activeIndex={activeIndex}
        selectedCity={filters.city}
        hoveredCity={hoveredCity}
        onSelect={toggleCity}
        onHover={setHoveredCity}
      />
      <details className="fold fold--on-dark">
        <summary>Poradie inštitúcií v aktívnom výbere</summary>
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
      </details>
    </section>
  )
}
