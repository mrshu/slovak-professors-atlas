import { geoMercator, geoPath, type GeoPermissibleObjects } from 'd3-geo'
import { scaleSqrt } from 'd3-scale'
import { useEffect, useMemo, useRef, useState } from 'react'

import { cityCounts } from '../analysis/selectors'
import type {
  Appointment,
  AtlasGeography,
  City,
  Institution,
} from '../data/types'
import { formatAppointmentCount } from '../utils/format'

interface SlovakiaMapProps {
  records: readonly Appointment[]
  geography: AtlasGeography
  cities: readonly City[]
  institutions: readonly Institution[]
  selectedCity: string | null
  onToggleCity: (city: string) => void
}

interface ProjectedCity {
  city: string
  count: number
  x: number
  y: number
}

const DEFAULT_WIDTH = 720
const TARGET_SIZE = 44
const MAP_PADDING = 24

export default function SlovakiaMap({
  records,
  geography,
  cities,
  institutions,
  selectedCity,
  onToggleCity,
}: SlovakiaMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(DEFAULT_WIDTH)

  useEffect(() => {
    const container = containerRef.current
    if (container === null) {
      return
    }

    const updateWidth = () => {
      const measured = Math.round(container.getBoundingClientRect().width)
      if (measured > 0) {
        setWidth(measured)
      }
    }
    updateWidth()

    if (typeof ResizeObserver === 'undefined') {
      return
    }
    const observer = new ResizeObserver(updateWidth)
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  const height = Math.max(230, Math.min(390, Math.round(width * 0.54)))
  const projection = useMemo(
    () =>
      geoMercator().fitExtent(
        [
          [MAP_PADDING, MAP_PADDING],
          [width - MAP_PADDING, height - MAP_PADDING],
        ],
        geography as unknown as GeoPermissibleObjects,
      ),
    [geography, height, width],
  )
  const outline = useMemo(
    () => geoPath(projection)(geography as unknown as GeoPermissibleObjects) ?? '',
    [geography, projection],
  )
  const projectedCities = useMemo(() => {
    const counts = new Map(cityCounts(records, institutions).map(({ city, count }) => [city, count]))
    const institutionById = new Map(institutions.map((institution) => [institution.id, institution]))

    return cities.flatMap<ProjectedCity>((city) => {
      const locations = city.institutionIds.flatMap((institutionId) => {
        const institution = institutionById.get(institutionId)
        return institution === undefined ? [] : [institution]
      })
      if (locations.length === 0) {
        return []
      }

      const longitude =
        locations.reduce((total, institution) => total + institution.longitude, 0) /
        locations.length
      const latitude =
        locations.reduce((total, institution) => total + institution.latitude, 0) /
        locations.length
      const position = projection([longitude, latitude])
      if (position === null) {
        return []
      }

      return [{ city: city.name, count: counts.get(city.name) ?? 0, x: position[0], y: position[1] }]
    })
  }, [cities, institutions, projection, records])
  const maxCount = Math.max(0, ...projectedCities.map(({ count }) => count))
  const radius = useMemo(
    () => scaleSqrt().domain([0, Math.max(1, maxCount)]).range([5, 29]),
    [maxCount],
  )

  return (
    <figure className="slovakia-map" aria-labelledby="slovakia-map-title" ref={containerRef}>
      <figcaption>
        <div>
          <p className="eyebrow eyebrow--light">Proporcionálna mapa</p>
          <h3 id="slovakia-map-title">Mestá navrhujúcich pracovísk</h3>
        </div>
        <p id="map-note">
          Plocha značky rastie s počtom vymenovaní. Poloha označuje mesto inštitúcie, nie
          bydlisko profesora.
        </p>
      </figcaption>
      <svg
        className="slovakia-map__chart"
        viewBox={`0 0 ${width} ${height}`}
        aria-labelledby="slovakia-map-title map-note"
      >
        <path className="slovakia-map__outline" d={outline} data-testid="slovakia-outline" />
        {projectedCities.map((city) => {
          const selected = city.city === selectedCity
          const cityRadius = city.count > 0 ? radius(city.count) : 5
          const labelOnLeft = city.x > width * 0.72
          const accessibleLabel = `${city.city}: ${formatAppointmentCount(city.count)}, ${
            selected ? 'vybrané' : 'nevybrané'
          }`

          return (
            <g className="slovakia-map__city" key={city.city}>
              {selected && (
                <circle
                  className="slovakia-map__selected-ring"
                  cx={city.x}
                  cy={city.y}
                  r={cityRadius + 6}
                  aria-hidden="true"
                />
              )}
              {city.count > 0 && (
                <circle
                  className="slovakia-map__mark"
                  cx={city.x}
                  cy={city.y}
                  r={cityRadius}
                  data-testid={`city-mark-${city.city}`}
                  aria-hidden="true"
                />
              )}
              {city.count > 0 && (
                <text
                  className="slovakia-map__label"
                  x={city.x + (labelOnLeft ? -cityRadius - 7 : cityRadius + 7)}
                  y={city.y + 4}
                  textAnchor={labelOnLeft ? 'end' : 'start'}
                  aria-hidden="true"
                >
                  {city.city} · {city.count}
                </text>
              )}
              <foreignObject
                x={city.x - TARGET_SIZE / 2}
                y={city.y - TARGET_SIZE / 2}
                width={TARGET_SIZE}
                height={TARGET_SIZE}
              >
                <button
                  className="slovakia-map__target"
                  type="button"
                  aria-label={accessibleLabel}
                  aria-pressed={selected}
                  disabled={city.count === 0 && !selected}
                  onClick={() => onToggleCity(city.city)}
                />
              </foreignObject>
            </g>
          )
        })}
      </svg>
      <ul className="slovakia-map__key" aria-label="Mestá na mape">
        {projectedCities
          .filter(({ count }) => count > 0)
          .map((city) => {
            const selected = city.city === selectedCity
            return (
              <li key={city.city}>
                <button
                  type="button"
                  aria-label={`${city.city}: ${formatAppointmentCount(city.count)}, ${
                    selected ? 'vybrané' : 'nevybrané'
                  }, zoznam mapy`}
                  aria-pressed={selected}
                  onClick={() => onToggleCity(city.city)}
                >
                  <span aria-hidden="true">{city.city}</span>
                  <strong aria-hidden="true">{city.count}</strong>
                </button>
              </li>
            )
          })}
      </ul>
      <p className="slovakia-map__source">
        Obrys: Natural Earth, verejná doména. Súradnice sídiel: Wikidata.
      </p>
    </figure>
  )
}
