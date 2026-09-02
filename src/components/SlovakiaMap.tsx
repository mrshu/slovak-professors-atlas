import { geoMercator, geoPath, type GeoPermissibleObjects } from 'd3-geo'
import { scaleSqrt } from 'd3-scale'
import { useEffect, useMemo, useRef, useState } from 'react'

import { cityCounts } from '../analysis/selectors'
import type { Affiliation, Appointment, AtlasGeography, City } from '../data/types'
import { formatAppointmentCount, formatNumber } from '../utils/format'

interface SlovakiaMapProps {
  records: readonly Appointment[]
  geography: AtlasGeography
  cities: readonly City[]
  affiliations: readonly Affiliation[]
  selectedCity: string | null
  hoveredCity: string | null
  onHoverCity: (city: string | null) => void
  onToggleCity: (city: string) => void
  labelMinimumCount?: number
}

interface ProjectedCityLocation {
  city: string
  x: number
  y: number
}

const DEFAULT_WIDTH = 720
const MINIMUM_TARGET_SIZE = 44
const CITY_MARK_MIN_RADIUS = 5
const CITY_MARK_MAX_RADIUS = 30
const SELECTED_RING_RADIUS_OFFSET = 6
const SELECTED_RING_STROKE_WIDTH = 3
const MAP_PADDING = 24

function niceSizeKeyValue(value: number): number {
  if (value <= 0) {
    return 0
  }
  const figures = value < 20 ? 2 : 1
  const magnitude = Math.pow(10, Math.ceil(Math.log10(value)) - figures)
  return Math.round(value / magnitude) * magnitude
}

function sizeKeyValues(maxCount: number): number[] {
  const raw = [niceSizeKeyValue(maxCount), niceSizeKeyValue(maxCount / 4), niceSizeKeyValue(maxCount / 16)]
  return Array.from(new Set(raw.filter((value) => value > 0)))
}

export default function SlovakiaMap({
  records,
  geography,
  cities,
  affiliations,
  selectedCity,
  hoveredCity,
  onHoverCity,
  onToggleCity,
  labelMinimumCount = 10,
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
  const projectedCityLocations = useMemo(
    () =>
      cities.flatMap<ProjectedCityLocation>((city) => {
        if (!Number.isFinite(city.longitude) || !Number.isFinite(city.latitude)) {
          return []
        }
        const position = projection([city.longitude, city.latitude])
        if (
          position === null ||
          !Number.isFinite(position[0]) ||
          !Number.isFinite(position[1])
        ) {
          return []
        }
        return [{ city: city.name, x: position[0], y: position[1] }]
      }),
    [cities, projection],
  )
  const countsByCity = useMemo(
    () => new Map(cityCounts(records, affiliations).map(({ city, count }) => [city, count])),
    [affiliations, records],
  )
  const projectedCities = useMemo(
    () =>
      projectedCityLocations.map((city) => ({
        ...city,
        count: countsByCity.get(city.city) ?? 0,
      })),
    [countsByCity, projectedCityLocations],
  )
  const maxCount = Math.max(0, ...projectedCities.map(({ count }) => count))
  const radius = useMemo(
    () =>
      scaleSqrt()
        .domain([0, Math.max(1, maxCount)])
        .range([CITY_MARK_MIN_RADIUS, CITY_MARK_MAX_RADIUS]),
    [maxCount],
  )
  const keyValues = useMemo(() => sizeKeyValues(maxCount), [maxCount])

  return (
    <figure className="slovakia-map" aria-labelledby="slovakia-map-title" ref={containerRef}>
      <h3 className="visually-hidden" id="slovakia-map-title">
        Mestá navrhujúcich pracovísk
      </h3>
      <svg
        className="slovakia-map__chart"
        viewBox={`0 0 ${width} ${height}`}
        aria-labelledby="slovakia-map-title"
      >
        <path className="slovakia-map__outline" d={outline} data-testid="slovakia-outline" />
        {projectedCities.map((city) => {
          const selected = city.city === selectedCity
          const cityRadius = city.count > 0 ? radius(city.count) : CITY_MARK_MIN_RADIUS
          const selectedRingRadius = cityRadius + SELECTED_RING_RADIUS_OFFSET
          const visibleRadius = selected
            ? selectedRingRadius + SELECTED_RING_STROKE_WIDTH / 2
            : cityRadius
          const targetSize = Math.max(MINIMUM_TARGET_SIZE, visibleRadius * 2)
          const labelOnLeft = city.x > width * 0.72
          const accessibleLabel = `${city.city}: ${formatAppointmentCount(city.count)}, ${
            selected ? 'vybrané' : 'nevybrané'
          }`

          const isHot = city.city === hoveredCity
          const isDim = selectedCity !== null && selectedCity !== city.city

          return (
            <g
              className={`slovakia-map__city${isHot ? ' is-hot' : ''}${isDim ? ' is-dim' : ''}`}
              key={city.city}
              onMouseEnter={() => onHoverCity(city.city)}
              onMouseLeave={() => onHoverCity(null)}
            >
              {selected && (
                <circle
                  className="slovakia-map__selected-ring"
                  cx={city.x}
                  cy={city.y}
                  r={selectedRingRadius}
                  strokeWidth={SELECTED_RING_STROKE_WIDTH}
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
              {(city.count >= labelMinimumCount || selected) && (
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
                x={city.x - targetSize / 2}
                y={city.y - targetSize / 2}
                width={targetSize}
                height={targetSize}
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
        {keyValues.length > 0 && (
          <g
            className="slovakia-map__size-key"
            transform={`translate(${width - 96} ${height - 30})`}
            aria-hidden="true"
          >
            {keyValues.map((value) => (
              <circle key={value} cx={0} cy={-radius(value)} r={radius(value)} />
            ))}
            {keyValues.map((value) => (
              <text key={value} x={radius(keyValues[0]!) + 8} y={-2 * radius(value) + 4}>
                {formatNumber(value)}
              </text>
            ))}
            <text x={-radius(keyValues[0]!)} y={16}>
              vymenovaní vo výbere
            </text>
          </g>
        )}
      </svg>
      <p className="slovakia-map__source">
        Obrys: Natural Earth, verejná doména. Poloha pracovísk: zdroje sú uvedené v metodike.
      </p>
    </figure>
  )
}
