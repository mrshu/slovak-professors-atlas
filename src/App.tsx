import { useEffect, useState } from 'react'

import ErrorPanel from './components/ErrorPanel'
import Findings from './components/Findings'
import Hero from './components/Hero'
import { loadAtlas } from './data/load'
import type { AtlasData } from './data/types'

type LoadState =
  | { status: 'loading'; data: null }
  | { status: 'ready'; data: AtlasData }
  | { status: 'error'; data: null }

const slovakInteger = new Intl.NumberFormat('sk-SK')

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

        <section id="kontext" className="section section--context" aria-labelledby="context-title">
          <div className="section__heading section__heading--split">
            <div>
              <p className="eyebrow">Vysoké školstvo v čase</p>
              <h2 id="context-title">Vymenovania v kontexte</h2>
            </div>
            <p>
              Národné časové rady CVTI dávajú vymenovaniam mierku bez toho, aby z porovnania
              robili príčinný vzťah. Pre rok 2026 nie je k dispozícii kontextový menovateľ,
              pretože časové rady CVTI sa končia akademickým rokom 2025/2026.
            </p>
          </div>
          <dl className="measurement-key" aria-label="Jednotky kontextového porovnania">
            <div>
              <dt>Vymenovania</dt>
              <dd>ročný tok</dd>
            </div>
            <div>
              <dt>Absolventi</dt>
              <dd>ročný tok I., II. a III. stupňa</dd>
            </div>
            <div>
              <dt>Študenti</dt>
              <dd>stav k 31. októbru</dd>
            </div>
            <div>
              <dt>Interní učitelia</dt>
              <dd>stav s metodickou zmenou od roku 2007</dd>
            </div>
          </dl>
        </section>

        <section id="atlas" className="section section--atlas" aria-labelledby="atlas-title">
          <svg className="atlas-contours" viewBox="0 0 1200 520" aria-hidden="true">
            <path d="M-80 94c190-96 344-91 494-20 139 66 252 65 398-6 138-68 257-70 438-5" />
            <path d="M-92 155C93 63 250 68 399 137c143 66 261 66 407-5 136-66 253-69 438-7" />
            <path d="M-104 223C77 134 235 139 385 207c145 66 266 65 412-7 136-66 253-68 442-6" />
            <path d="M-108 301c179-87 335-82 486-16 148 65 271 63 416-9 136-67 254-69 448-7" />
            <path d="M-98 385c174-83 326-78 476-14 151 65 276 61 421-12 137-68 258-69 449-6" />
          </svg>
          <div className="section__heading section__heading--split section__heading--light">
            <div>
              <p className="eyebrow eyebrow--light">Prepojená akademická mapa</p>
              <h2 id="atlas-title">Atlas pracovísk a období</h2>
            </div>
            <p>
              Mesto označuje sídlo navrhujúcej inštitúcie, nie bydlisko profesora. Mapa,
              pracoviská a časová os čítajú ten istý analytický súbor.
            </p>
          </div>
          <dl className="atlas-register" aria-label="Čítanie akademického atlasu">
            <div>
              <dt>Poloha</dt>
              <dd>Mestá a kanonické inštitúcie</dd>
            </div>
            <div>
              <dt>Štruktúra</dt>
              <dd>Zdrojové názvy fakúlt a odborov</dd>
            </div>
            <div>
              <dt>Čas</dt>
              <dd>Dátumy slávností a prezidentské obdobia</dd>
            </div>
          </dl>
        </section>

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
