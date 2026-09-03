import type { CityFieldRanking } from '../analysis/selectors'
import { formatNumber } from '../utils/format'

const VISIBLE_ROWS = 10

interface CityFieldPanelProps {
  ranking: CityFieldRanking
  startYear: number
  endYear: number
  selectedField: string | null
  onFieldSelect: (fieldKey: string) => void
  onCityClear: () => void
}

function fieldCount(count: number): string {
  return `${formatNumber(count)} ${count === 1 ? 'odbore' : 'odboroch'}`
}

function percent(value: number): string {
  return `${formatNumber(value * 100, { maximumFractionDigits: 0 })} %`
}

export default function CityFieldPanel({
  ranking,
  startYear,
  endYear,
  selectedField,
  onFieldSelect,
  onCityClear,
}: CityFieldPanelProps) {
  const visible = ranking.rows.slice(0, VISIBLE_ROWS)
  const rest = ranking.rows.slice(VISIBLE_ROWS)
  const restCount = rest.reduce((total, row) => total + row.cityCount, 0)

  return (
    <section className="city-fields" aria-labelledby="city-fields-title">
      <div className="city-fields__head">
        <div>
          <h3 id="city-fields-title">Odbory v meste {ranking.city}</h3>
          <p role="status">
            {ranking.rows.length === 0
              ? `V období ${startYear}–${endYear} tu nie je žiadne vymenovanie.`
              : `${formatNumber(ranking.cityTotal)} z ${formatNumber(
                  ranking.nationalTotal,
                )} vymenovaní (${percent(
                  ranking.nationalTotal === 0 ? 0 : ranking.cityTotal / ranking.nationalTotal,
                )}) v ${fieldCount(ranking.rows.length)}, ${startYear}–${endYear}. Pruh je podiel mesta na celoštátnych vymenovaniach v odbore.`}
          </p>
        </div>
        <button type="button" className="city-fields__clear" onClick={onCityClear}>
          Zrušiť výber mesta <span aria-hidden="true">×</span>
        </button>
      </div>
      {visible.length === 0 ? null : (
        <ol className="city-fields__list">
          {visible.map((row) => (
            <li key={row.fieldKey}>
              <button
                type="button"
                aria-current={row.fieldKey === selectedField ? 'true' : undefined}
                aria-label={`${row.label}: ${formatNumber(row.cityCount)} z ${formatNumber(
                  row.nationalCount,
                )} celoštátnych vymenovaní, ${percent(row.share)}; vybrať odbor`}
                onClick={() => onFieldSelect(row.fieldKey)}
              >
                <span className="city-fields__label">{row.label}</span>
                <span className="city-fields__count">{formatNumber(row.cityCount)}</span>
                <span className="city-fields__bar" aria-hidden="true">
                  <i style={{ inlineSize: `${row.share * 100}%` }} />
                </span>
                <span className="city-fields__share">{percent(row.share)}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
      <p className="city-fields__note">
        {rest.length === 0
          ? null
          : `Ďalších ${formatNumber(rest.length)} odborov s ${formatNumber(restCount)} vymenovaniami. `}
        Absolventi ostávajú celoštátni: štatistika ich neuvádza podľa miest, preto výber mesta
        nemení graf ani pomer absolventov.
      </p>
    </section>
  )
}
