import { useEffect, useMemo, useState } from 'react'
import { filterAppointmentsExceptField } from './analysis/selectors'

import AtlasSection from './components/AtlasSection'
import { ContextSectionBody, ContextSectionShell } from './components/ContextSection'
import ErrorPanel from './components/ErrorPanel'
import Explorer from './components/Explorer'
import FieldGraduateComparison from './components/FieldGraduateComparison'
import Findings from './components/Findings'
import Hero from './components/Hero'
import Methodology from './components/Methodology'
import { loadAtlas } from './data/load'
import type { AtlasData } from './data/types'
import { useAtlasState } from './state/useAtlasState'

type LoadState =
  | { status: 'loading'; data: null }
  | { status: 'ready'; data: AtlasData }
  | { status: 'error'; data: null }

function focusSection(id: string): void {
  const url = new URL(window.location.href)
  url.hash = id
  window.history.replaceState(window.history.state, '', url)
  window.requestAnimationFrame(() =>
    document.getElementById(id)?.scrollIntoView?.({ block: 'start' }),
  )
}

function LoadedInteractiveSections({ data }: { data: AtlasData }) {
  const atlasState = useAtlasState(data)
  const fieldComparisonRecords = useMemo(
    () => filterAppointmentsExceptField(data, atlasState.filters),
    [atlasState.filters, data],
  )

  return (
    <>
      <Findings
        records={data.records}
        affiliations={data.affiliations}
        presidents={data.presidents}
        onCeremonySelect={(appointedOn) => {
          atlasState.setAppointmentDate(appointedOn, 'push')
          focusSection('atlas')
        }}
        onCitySelect={(city) => {
          atlasState.setFilter('city', city, 'push')
          focusSection('atlas')
        }}
      />
      <ContextSectionShell>
        <ContextSectionBody
          years={data.context}
          selectedYear={atlasState.filters.selectedYear}
          setSelectedYear={atlasState.setSelectedYear}
        />
      </ContextSectionShell>
      <FieldGraduateComparison
        comparison={data.fieldGraduateComparison}
        allRecords={data.records}
        comparisonRecords={fieldComparisonRecords}
        selectedField={atlasState.filters.field}
        onFieldSelect={(field) => atlasState.setFilter('field', field, 'push')}
      />
      <AtlasSection data={data} atlasState={atlasState} />
      <Explorer data={data} atlasState={atlasState} />
    </>
  )
}

export default function App() {
  const [state, setState] = useState<LoadState>({ status: 'loading', data: null })

  useEffect(() => {
    const controller = new AbortController()
    let mounted = true

    loadAtlas(controller.signal)
      .then((data) => {
        if (mounted) {
          setState({ status: 'ready', data })
        }
      })
      .catch((error: unknown) => {
        if (mounted && !(error instanceof DOMException && error.name === 'AbortError')) {
          setState({ status: 'error', data: null })
        }
      })

    return () => {
      mounted = false
      controller.abort()
    }
  }, [])

  return (
    <>
      <a className="skip-link" href="#obsah">
        Preskočiť na obsah
      </a>

      <header aria-labelledby="hero-title">
        <Hero data={state.data} status={state.status} />
      </header>
      <nav className="anchor-nav" aria-label="Navigácia atlasu">
        <div className="anchor-nav__inner">
          <a className="anchor-nav__brand" href="#hero-title" aria-label="Na začiatok atlasu">
            AP
          </a>
          <ol>
            <li>
              <a href="#zistenia">Zistenia</a>
            </li>
            <li>
              <a href="#kontext">Kontext</a>
            </li>
            <li>
              <a href="#odbory-absolventi">Odbory</a>
            </li>
            <li>
              <a href="#atlas">Atlas</a>
            </li>
            <li>
              <a href="#zaznamy">Záznamy</a>
            </li>
            <li>
              <a href="#metodika">Metodika</a>
            </li>
          </ol>
        </div>
      </nav>

      <main id="obsah">
        {state.status === 'loading' && (
          <section
            id="zistenia"
            className="section section--status"
            aria-labelledby="loading-title"
          >
            <div className="loading-rule" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <p className="eyebrow">Overujem dátový súbor</p>
            <h2 id="loading-title">Atlas sa načítava</h2>
            <p role="status">Pripravujem overené záznamy a zistenia…</p>
          </section>
        )}
        {state.status === 'error' && (
          <section id="zistenia" className="section section--status" aria-labelledby="load-error-title">
            <ErrorPanel />
          </section>
        )}
        {state.status === 'ready' ? (
          <LoadedInteractiveSections data={state.data} />
        ) : (
          <>
            <ContextSectionShell status={state.status} />
            <AtlasSection status={state.status} />
            <Explorer status={state.status} />
          </>
        )}

        <Methodology
          data={state.data ?? undefined}
          status={state.status === 'ready' ? undefined : state.status}
        />
      </main>

      <footer className="site-footer">
        <p>Archívny atlas profesorských vymenovaní na Slovensku</p>
        <a href="#hero-title">Späť na začiatok</a>
      </footer>
    </>
  )
}
