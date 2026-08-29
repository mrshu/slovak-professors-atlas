import { useEffect, useState } from 'react'

import AtlasSection from './components/AtlasSection'
import { ContextSectionBody, ContextSectionShell } from './components/ContextSection'
import ErrorPanel from './components/ErrorPanel'
import Findings from './components/Findings'
import Hero from './components/Hero'
import { loadAtlas } from './data/load'
import type { AtlasData } from './data/types'
import { useAtlasState } from './state/useAtlasState'

type LoadState =
  | { status: 'loading'; data: null }
  | { status: 'ready'; data: AtlasData }
  | { status: 'error'; data: null }

const slovakInteger = new Intl.NumberFormat('sk-SK')

function LoadedInteractiveSections({ data }: { data: AtlasData }) {
  const atlasState = useAtlasState(data)

  return (
    <>
      <ContextSectionShell>
        <ContextSectionBody
          years={data.context}
          selectedYear={atlasState.filters.selectedYear}
          setSelectedYear={atlasState.setSelectedYear}
        />
      </ContextSectionShell>
      <AtlasSection data={data} atlasState={atlasState} />
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
        {state.status === 'ready' && <Findings facts={state.data.editorialFacts} />}
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
          </>
        )}

        <section id="zaznamy" className="section section--records" aria-labelledby="records-title">
          <div className="section__heading section__heading--split">
            <div>
              <p className="eyebrow">Úplný register</p>
              <h2 id="records-title">Záznamy bez skrytých skratiek</h2>
            </div>
            <p>
              Mená, pôvodné názvy pracovísk, fakulty, odbory, dátumy aj zdrojové riadky
              zostávajú dohľadateľné. Nevyplnený titul alebo fakulta sa označí slovom
              „neuvedené“ — nikdy sa nedopĺňa odhadom.
            </p>
          </div>
          <div className="records-principles" aria-label="Princípy registra">
            <p>
              <span>01</span> Vyhľadávanie zachováva slovenskú diakritiku v zobrazenom texte.
            </p>
            <p>
              <span>02</span> Opakované zdrojové varianty ostávajú pripojené k záznamu.
            </p>
            <p>
              <span>03</span> Výber údajov nemení význam pôvodného odboru ani pracoviska.
            </p>
          </div>
        </section>

        <section id="metodika" className="section section--method" aria-labelledby="method-title">
          <div className="method-grid">
            <div>
              <p className="eyebrow">Metodika a pramene</p>
              <h2 id="method-title">Ako čítať archív</h2>
            </div>
            <div className="method-copy">
              <p>
                Jednotkou je analytické profesorské vymenovanie, nie jedinečná fyzická osoba.
                Zhodné meno v rôznych dátumoch sa nezlučuje. Iba preskúmané opakovania toho
                istého mena a dátumu sa viažu k ponechanému záznamu.
              </p>
              <p>
                Prezidentské obdobia poskytujú časové členenie; atlas z nich nerobí rebríček.
                Počty pri inštitúciách opisujú aktivitu vymenovaní, nie kvalitu školy.
              </p>
            </div>
          </div>

          {state.data && (
            <dl className="source-audit" aria-label="Audit zdrojových riadkov">
              <div>
                <dt>Riadky v zdroji</dt>
                <dd>{slovakInteger.format(state.data.meta.sourceRowCount)}</dd>
              </div>
              <div>
                <dt>Preskúmané opakovania</dt>
                <dd>{slovakInteger.format(state.data.meta.duplicateSourceRowCount)}</dd>
              </div>
              <div>
                <dt>Analytické vymenovania</dt>
                <dd>{slovakInteger.format(state.data.meta.analyticalAppointmentCount)}</dd>
              </div>
            </dl>
          )}
        </section>
      </main>

      <footer className="site-footer">
        <p>Archívny atlas profesorských vymenovaní na Slovensku</p>
        <a href="#hero-title">Späť na začiatok</a>
      </footer>
    </>
  )
}
