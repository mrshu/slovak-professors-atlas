import { formatNumber } from '../utils/format'

export interface CityStripCell {
  city: string
  share: number
  delta: number | null
  series: number[]
}

interface CityStripProps {
  cells: readonly CityStripCell[]
  activeIndex: number
  selectedCity: string | null
  hoveredCity: string | null
  onSelect: (city: string) => void
  onHover: (city: string | null) => void
}

const SPARK_W = 120
const SPARK_H = 26
const SHARE_MAX = 0.45

function pct(value: number): string {
  return `${formatNumber(value * 100, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`
}

function deltaText(delta: number | null): string {
  if (delta === null) return '—'
  const sign = delta > 0 ? '+' : delta < 0 ? '−' : '±'
  return `${sign}${formatNumber(Math.abs(delta), { minimumFractionDigits: 1, maximumFractionDigits: 1 })} b.`
}

export default function CityStrip({
  cells,
  activeIndex,
  selectedCity,
  hoveredCity,
  onSelect,
  onHover,
}: CityStripProps) {
  return (
    <div className="city-strip" role="group" aria-label="Podiel miest v aktívnom výbere">
      {cells.map((cell) => {
        const selected = cell.city === selectedCity
        const points = cell.series.map(
          (share, index) =>
            [
              4 + (index / Math.max(1, cell.series.length - 1)) * (SPARK_W - 8),
              SPARK_H - 4 - (Math.min(share, SHARE_MAX) / SHARE_MAX) * (SPARK_H - 8),
            ] as const,
        )
        const path = points
          .map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`)
          .join(' ')
        const label = `${cell.city}: ${pct(cell.share)}, ${
          cell.delta === null
            ? 'bez porovnania'
            : `zmena ${deltaText(cell.delta).replace(' b.', ' bodu')}`
        }; ${selected ? 'zrušiť výber' : 'filtrovať register'}`
        return (
          <button
            key={cell.city}
            type="button"
            className={`city-strip__cell${selected ? ' is-selected' : ''}${
              cell.city === hoveredCity ? ' is-hot' : ''
            }`}
            aria-pressed={selected}
            aria-label={label}
            onClick={() => onSelect(cell.city)}
            onMouseEnter={() => onHover(cell.city)}
            onMouseLeave={() => onHover(null)}
            onFocus={() => onHover(cell.city)}
            onBlur={() => onHover(null)}
          >
            <span className="city-strip__name" aria-hidden="true">
              {cell.city}
              {selected ? <i className="city-strip__clear">×</i> : null}
            </span>
            <span className="city-strip__bar" aria-hidden="true">
              <i style={{ width: `${(Math.min(cell.share, SHARE_MAX) / SHARE_MAX) * 100}%` }} />
            </span>
            <span className="city-strip__values" aria-hidden="true">
              <b>{pct(cell.share)}</b>
              <span>{deltaText(cell.delta)}</span>
            </span>
            <svg viewBox={`0 0 ${SPARK_W} ${SPARK_H}`} aria-hidden="true">
              <path d={path} />
              {points.map(([x, y], index) => (
                <circle
                  key={index}
                  cx={x}
                  cy={y}
                  r={index === activeIndex ? 3 : 1.8}
                  className={index === activeIndex ? 'city-strip__now' : undefined}
                />
              ))}
            </svg>
          </button>
        )
      })}
    </div>
  )
}
