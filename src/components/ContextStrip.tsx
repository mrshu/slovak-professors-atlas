import type { ContextYear } from '../data/types'
import { formatNumber } from '../utils/format'
import SmallLine from './charts/SmallLine'
import { ContextSectionBody } from './ContextSection'

interface ContextStripProps {
  years: ContextYear[]
  selectedYear: number
  setSelectedYear: (year: number, mode: 'push') => void
}

export default function ContextStrip({ years, selectedYear, setSelectedYear }: ContextStripProps) {
  const ordered = [...years].sort((a, b) => a.year - b.year)
  const span =
    ordered.length === 0 ? '' : `${ordered[0]!.year}–${ordered[ordered.length - 1]!.year}`
  return (
    <section id="kontext" className="context-strip" aria-labelledby="context-strip-title">
      <div className="context-strip__head">
        <p className="card__kicker">Kontext · CVTI SR</p>
        <h2 id="context-strip-title">Prítok a stav profesúry</h2>
        <p className="card__sub">
          Ročný tok vymenovaní delený stavom profesorov medzi internými učiteľmi; zvislá čiara
          je metodická zmena z roku 2007.
        </p>
      </div>
      <div className="context-strip__charts">
        <div>
          <p className="card__kicker">Vymenovania na 100 interných profesorov</p>
          <SmallLine
            points={ordered.map((y) => ({ year: y.year, value: y.appointmentsPer100Professors }))}
            format={(v) => formatNumber(v, { maximumFractionDigits: 2 })}
            ariaLabel={`Vymenovania na 100 interných profesorov, ${span}`}
            markerYear={2007}
            markerLabel="2007"
            colorClass="chart__line--1"
          />
        </div>
        <div>
          <p className="card__kicker">Interní profesori k 31. októbru</p>
          <SmallLine
            points={ordered.map((y) => ({ year: y.year, value: y.internalProfessors }))}
            format={(v) => formatNumber(Math.round(v))}
            ariaLabel={`Interní profesori k 31. októbru, ${span}`}
            markerYear={2007}
            colorClass="chart__line--2"
          />
        </div>
      </div>
      <details className="fold">
        <summary>Národný kontext v detaile</summary>
        <ContextSectionBody years={years} selectedYear={selectedYear} setSelectedYear={setSelectedYear} />
      </details>
    </section>
  )
}
