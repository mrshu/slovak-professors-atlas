import type { EditorialFacts } from '../data/types'

interface FindingsProps {
  facts: EditorialFacts
}

const findings = [
  {
    key: 'graduateThroughputPeak',
    marker: 'Tok absolventov',
    title: 'Najširší ročník sledovaného obdobia',
  },
  {
    key: 'appointmentGraduateRateMaximum',
    marker: 'Dva ročné toky',
    title: 'Vymenovania voči absolventom',
  },
  {
    key: 'appointmentProfessorStockRateMaximum',
    marker: 'Tok a stav',
    title: 'Vymenovania voči stavu profesorov',
  },
] as const

export default function Findings({ facts }: FindingsProps) {
  return (
    <section id="zistenia" className="section section--findings" aria-labelledby="findings-title">
      <div className="section__heading section__heading--split">
        <div>
          <p className="eyebrow">Čítanie archívu</p>
          <h2 id="findings-title">Tri zistenia z dát</h2>
        </div>
        <p>
          Každé tvrdenie vzniká pri zostavení dátového súboru. Hodnoty preto zostávajú
          zviazané s overenými zdrojmi, nie s ručne prepísanou poznámkou v rozhraní.
        </p>
      </div>

      <div className="findings__list">
        {findings.map((finding, index) => (
          <article key={finding.key} className="finding">
            <div className="finding__index" aria-hidden="true">
              {String(index + 1).padStart(2, '0')}
            </div>
            <p className="finding__marker">{finding.marker}</p>
            <h3>{finding.title}</h3>
            <p>{facts[finding.key].statementSk}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
