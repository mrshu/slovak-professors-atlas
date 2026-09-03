import type { AtlasMeta } from '../data/types'
import { formatNumber } from '../utils/format'

interface MastheadProps {
  status: 'loading' | 'ready' | 'error'
  meta: AtlasMeta | null
  institutionCount: number
  cityCount: number
}

const ANCHORS: readonly [string, string][] = [
  ['#mapa', 'Mapa'],
  ['#zistenia', 'Zistenia'],
  ['#kontext', 'Kontext'],
  ['#odbory', 'Odbory'],
  ['#register', 'Register'],
  ['#metodika', 'Metodika'],
]

export default function Masthead({ status, meta, institutionCount, cityCount }: MastheadProps) {
  return (
    <header className="mast" id="hore" aria-labelledby="hero-title">
      <h1 id="hero-title">
        Kde vzniká slovenská profesúra? <small>Archívny atlas 2000–2026</small>
      </h1>
      {meta === null ? (
        <p className="mast__status" role="status">
          {status === 'loading'
            ? 'Otváram overený dátový archív…'
            : 'Textová osnova atlasu zostáva dostupná.'}
        </p>
      ) : (
        <dl className="mast__ledger" aria-label="Rozsah analytického súboru">
          <div>
            <dd>{formatNumber(meta.analyticalAppointmentCount)}</dd>
            <dt>vymenovaní</dt>
          </div>
          <div>
            <dd>{formatNumber(meta.ceremonyCount)}</dd>
            <dt>slávností</dt>
          </div>
          <div>
            <dd>{formatNumber(institutionCount)}</dd>
            <dt>škôl</dt>
          </div>
          <div>
            <dd>{formatNumber(cityCount)}</dd>
            <dt>miest</dt>
          </div>
        </dl>
      )}
      <nav aria-label="Navigácia atlasu">
        {ANCHORS.map(([href, label]) => (
          <a key={href} href={href}>
            {label}
          </a>
        ))}
      </nav>
    </header>
  )
}
