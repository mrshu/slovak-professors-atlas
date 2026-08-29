import type { ReactNode } from 'react'

import type { ContextYear } from '../data/types'
import { formatNumber } from '../utils/format'
import ContextTrend from './ContextTrend'

interface ContextSectionProps {
  years: ContextYear[]
  selectedYear: number
  setSelectedYear: (year: number, mode: 'push') => void
}

interface MetricDefinition {
  label: string
  value: string
  kind: 'flow' | 'stock' | 'ratio'
}

const ratioFormat: Intl.NumberFormatOptions = {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}

const percentageFormat: Intl.NumberFormatOptions = {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
}

export function ContextSectionBody({
  years,
  selectedYear,
  setSelectedYear,
}: ContextSectionProps) {
  const selected = years.find(({ year }) => year === selectedYear)
  const latest = years.reduce<ContextYear | null>(
    (current, year) => (current === null || year.year > current.year ? year : current),
    null,
  )

  let metrics: MetricDefinition[] = []
  if (selected !== undefined) {
    metrics = [
      {
        label: 'Vymenovania v kalendárnom roku',
        value: formatNumber(selected.appointments),
        kind: 'flow',
      },
      {
        label: 'Absolventi I., II. a III. stupňa v kalendárnom roku',
        value: formatNumber(selected.graduates),
        kind: 'flow',
      },
      {
        label: `Študenti v akademickom roku ${selected.academicYear} — stav k 31. októbru`,
        value: formatNumber(selected.students),
        kind: 'stock',
      },
      {
        label: 'Interní vysokoškolskí učitelia — stav k 31. októbru',
        value: formatNumber(selected.internalTeachers),
        kind: 'stock',
      },
      {
        label: 'Interní profesori — stav k 31. októbru',
        value: formatNumber(selected.internalProfessors),
        kind: 'stock',
      },
      {
        label: 'Vymenovania na 1 000 absolventov',
        value: formatNumber(selected.appointmentsPer1kGraduates, ratioFormat),
        kind: 'ratio',
      },
      {
        label: 'Absolventi na jedno vymenovanie',
        value:
          selected.graduatesPerAppointment === null
            ? '—'
            : formatNumber(selected.graduatesPerAppointment, ratioFormat),
        kind: 'ratio',
      },
      {
        label: 'Vymenovania na 10 000 študentov',
        value: formatNumber(selected.appointmentsPer10kStudents, ratioFormat),
        kind: 'ratio',
      },
      {
        label: 'Vymenovania na 1 000 interných učiteľov',
        value: formatNumber(selected.appointmentsPer1kTeachers, ratioFormat),
        kind: 'ratio',
      },
      {
        label: 'Vymenovania na 100 interných profesorov v existujúcom stave',
        value: formatNumber(selected.appointmentsPer100Professors, ratioFormat),
        kind: 'ratio',
      },
      {
        label: 'Podiel profesorov medzi internými učiteľmi',
        value: `${formatNumber(selected.professorShare, percentageFormat)} %`,
        kind: 'ratio',
      },
    ]
  }

  return (
    <>

      <dl className="measurement-key" aria-label="Jednotky kontextového porovnania">
        <div>
          <dt>Vymenovania</dt>
          <dd>tok v kalendárnom roku</dd>
        </div>
        <div>
          <dt>Absolventi</dt>
          <dd>tok I., II. a III. stupňa v kalendárnom roku</dd>
        </div>
        <div>
          <dt>Študenti</dt>
          <dd>stav v akademickom roku k 31. októbru</dd>
        </div>
        <div>
          <dt>Interní učitelia</dt>
          <dd>stav k 31. októbru; metodická zmena od roku 2007</dd>
        </div>
      </dl>

      <div className="context-selection">
        <div className="context-selection__heading">
          <div>
            <p className="eyebrow">Vybraný rok</p>
            <h3>{selectedYear}</h3>
          </div>
          {latest !== null && (
            <p className="context-selection__coverage">
              Najnovší dostupný kontext: {latest.academicYear}
            </p>
          )}
        </div>

        {selected === undefined ? (
          <div className="context-unavailable" role="status">
            <p className="context-unavailable__title">
              Kontext CVTI pre rok {selectedYear} nie je k dispozícii
            </p>
            <p>
              Oficiálny rad sa končí akademickým rokom {latest?.academicYear ?? '2025/2026'}.
              Pre vymenovania v roku {selectedYear} preto nezobrazujeme menovatele ani pomery.
            </p>
          </div>
        ) : (
          <div role="group" aria-label={`Presné národné hodnoty pre rok ${selected.year}`}>
            <dl className="context-metrics">
              {metrics.map((metric) => (
                <div
                  className={`context-metric context-metric--${metric.kind}`}
                  key={metric.label}
                >
                  <dt>{metric.label}</dt>
                  <dd>{metric.value}</dd>
                </div>
              ))}
            </dl>
            <p className="context-metrics__note">
              Prvých päť hodnôt rozlišuje ročné toky a stavy k 31. októbru. Pomery používajú
              výlučne národný počet vymenovaní; sú mierkou medzi tokmi a stavmi, nie zmena
              počtu profesorov ani dôkaz príčinného vzťahu.
            </p>
          </div>
        )}
      </div>

      <ContextTrend
        years={years}
        selectedYear={selectedYear}
        setSelectedYear={setSelectedYear}
      />
    </>
  )
}

interface ContextSectionShellProps {
  children?: ReactNode
  status?: 'loading' | 'error'
}

export function ContextSectionShell({ children, status }: ContextSectionShellProps) {
  return (
    <section id="kontext" className="section section--context" aria-labelledby="context-title">
      <div className="section__heading section__heading--split">
        <div>
          <p className="eyebrow">Vysoké školstvo v čase</p>
          <h2 id="context-title">Vymenovania v národnom kontexte</h2>
        </div>
        <p>
          Národné časové rady CVTI dávajú vymenovaniam mierku bez príčinného tvrdenia.
          Vymenovania a absolventi sú kalendárne ročné toky; študenti a akademickí pracovníci
          sú stavy k 31. októbru.
        </p>
      </div>

      {status !== undefined && (
        <div className="context-unavailable context-unavailable--shell" role="status">
          <p className="context-unavailable__title">
            {status === 'loading'
              ? 'Národný kontext CVTI sa načítava'
              : 'Národný kontext CVTI nie je dostupný'}
          </p>
          <p>
            {status === 'loading'
              ? 'Presné národné hodnoty a indexovaný trend zobrazíme po overení dátového súboru.'
              : 'Presné národné hodnoty nemožno bezpečne zobraziť, kým sa nepodarí načítať dátový súbor.'}
          </p>
        </div>
      )}
      {children}
    </section>
  )
}

export default function ContextSection(props: ContextSectionProps) {
  return (
    <ContextSectionShell>
      <ContextSectionBody {...props} />
    </ContextSectionShell>
  )
}
