import type { AtlasData } from '../data/types'

interface HeroProps {
  data: AtlasData | null
  status: 'loading' | 'ready' | 'error'
}

const slovakInteger = new Intl.NumberFormat('sk-SK')
const slovakDate = new Intl.DateTimeFormat('sk-SK', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

function formatIsoDate(value: string): string {
  return slovakDate.format(new Date(`${value}T00:00:00Z`))
}

export default function Hero({ data, status }: HeroProps) {
  return (
    <div className="hero">
      <svg className="hero__contours" viewBox="0 0 720 420" aria-hidden="true">
        <path d="M-54 121C72 48 164 40 267 81c111 44 179 31 270-23 88-52 155-38 244 23" />
        <path d="M-63 165C62 93 158 84 257 122c112 43 184 38 278-18 87-52 159-41 247 18" />
        <path d="M-68 212c126-73 224-81 324-43 111 42 186 37 281-20 87-52 160-41 249 17" />
        <path d="M-61 263c121-71 215-78 313-42 116 43 193 38 289-20 85-51 158-40 244 16" />
        <path d="M-47 315c113-65 205-72 302-37 115 41 191 36 287-21 88-52 159-40 243 14" />
        <path d="M92 420c24-71 72-107 143-108 74-1 105-36 127-99 25-70 66-103 126-107 56-4 91-29 119-74" />
      </svg>

      <div className="hero__inner">
        <div className="hero__register" aria-label="Identifikácia atlasu">
          <span>Archívny atlas</span>
          <span>Slovensko · 2000—2026</span>
        </div>

        <div className="hero__title-block">
          <p className="eyebrow eyebrow--light">Profesorské vymenovania v priestore a čase</p>
          <h1 id="hero-title">Kde vzniká slovenská profesúra?</h1>
          <p className="hero__deck">
            Atlas sleduje, ako sa od roku 2000 menila mapa profesorských vymenovaní medzi
            univerzitami, fakultami, mestami a prezidentskými obdobiami. Opisuje aktivitu
            vymenovaní, nie kvalitu pracovísk ani počet jedinečných osôb.
          </p>
        </div>

        {data ? (
          <dl className="hero__ledger" aria-label="Rozsah analytického súboru">
            <div>
              <dt>Analytické vymenovania</dt>
              <dd>{slovakInteger.format(data.meta.analyticalAppointmentCount)}</dd>
              <p>po preskúmaní opakovaných zdrojových riadkov</p>
            </div>
            <div>
              <dt>Slávnostné termíny</dt>
              <dd>{slovakInteger.format(data.meta.ceremonyCount)}</dd>
              <p>samostatných dátumov vymenovania</p>
            </div>
            <div>
              <dt>Časové pokrytie</dt>
              <dd className="hero__date-range">
                <time dateTime={data.meta.appointmentDateMin}>
                  {formatIsoDate(data.meta.appointmentDateMin)}
                </time>
                <span aria-hidden="true">—</span>
                <time dateTime={data.meta.appointmentDateMax}>
                  {formatIsoDate(data.meta.appointmentDateMax)}
                </time>
              </dd>
              <p>vrátane priebežného roku 2026</p>
            </div>
          </dl>
        ) : (
          <p className="hero__status" role="status">
            {status === 'loading'
              ? 'Otváram overený dátový archív…'
              : 'Textová osnova atlasu zostáva dostupná.'}
          </p>
        )}

        {data && (
          <div className="hero__sources">
            <p>
              Zdroj vymenovaní:{' '}
              <a href={data.sources.professors.url}>Zdrojový zoznam ministerstva</a>
              <span aria-hidden="true"> · </span>
              Kontext vysokých škôl:{' '}
              <a href={data.sources.higher_education.url}>časové rady CVTI SR</a>
            </p>
            <p>
              Zdrojových riadkov: {slovakInteger.format(data.meta.sourceRowCount)}; po
              vyradení preskúmaných opakovaní zostáva{' '}
              {slovakInteger.format(data.meta.analyticalAppointmentCount)} analytických
              záznamov.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
