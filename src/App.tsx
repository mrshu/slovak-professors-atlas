import { useEffect, useMemo, useState } from 'react'

import ContextStrip from './components/ContextStrip'
import ErrorPanel from './components/ErrorPanel'
import FieldSection from './components/FieldSection'
import FindingCards from './components/FindingCards'
import MapStage from './components/MapStage'
import Masthead from './components/Masthead'
import Methodology from './components/Methodology'
import Register from './components/Register'
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
  const selectField = (fieldKey: string) => {
    atlasState.setFilter('field', fieldKey, 'push')
    focusSection('odbory')
  }
  const fieldRange = useMemo(
    () => ({
      startYear: atlasState.filters.fieldStartYear,
      endYear: atlasState.filters.fieldEndYear,
    }),
    [atlasState.filters.fieldStartYear, atlasState.filters.fieldEndYear],
  )

  return (
    <>
      <MapStage data={data} atlasState={atlasState} />
      <FindingCards data={data} onFieldSelect={selectField} />
      <ContextStrip
        years={data.context}
        selectedYear={atlasState.filters.selectedYear}
        setSelectedYear={atlasState.setSelectedYear}
      />
      <FieldSection
        data={data}
        selectedField={atlasState.filters.field}
        onFieldSelect={(fieldKey) => atlasState.setFilter('field', fieldKey, 'push')}
        selectedCity={atlasState.filters.city}
        onCityClear={() => atlasState.setFilter('city', null, 'push')}
        fieldRange={fieldRange}
        onFieldRangeChange={(startYear, endYear) =>
          atlasState.setFieldEducationRange(startYear, endYear, 'push')
        }
      />
      <Register data={data} atlasState={atlasState} />
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

      <Masthead
        status={state.status}
        meta={state.data?.meta ?? null}
        institutionCount={state.data?.institutions.length ?? 0}
        cityCount={state.data?.cities.length ?? 0}
      />

      <main id="obsah">
        {state.status === 'loading' && (
          <section
            id="mapa"
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
          <section id="mapa" className="section section--status" aria-labelledby="load-error-title">
            <ErrorPanel />
          </section>
        )}
        {state.status === 'ready' ? (
          <LoadedInteractiveSections data={state.data} />
        ) : (
          <Register status={state.status} />
        )}

        <Methodology
          data={state.data ?? undefined}
          status={state.status === 'ready' ? undefined : state.status}
        />
      </main>

      <footer className="site-footer">
        <span>
          Zdroj vymenovaní:{' '}
          {state.data ? (
            <a href={state.data.sources.professors.url}>Zdrojový zoznam ministerstva</a>
          ) : (
            'Zdrojový zoznam ministerstva'
          )}{' '}
          · Kontext: CVTI SR 2000–2025 · Obyvateľstvo: ŠÚ SR · Obrys: Natural Earth
        </span>
        <a href="#hore">Na začiatok</a>
      </footer>
    </>
  )
}
