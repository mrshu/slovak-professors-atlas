import type { AtlasData } from '../data/types'
import { formatAppointmentCount, formatDate, formatNumber } from '../utils/format'
import FieldCleanupReport from './FieldCleanupReport'

interface MethodologyProps {
  data?: AtlasData
  status?: 'loading' | 'error'
}

const MINISTRY_PAGE_URL = 'https://www.minedu.sk/profesori-vysokych-skol/'
const CVTI_PAGE_URL =
  'https://www.cvtisr.sk/cvti-sr-vedecka-kniznica/informacie-o-skolstve/statistiky/casove-rady.html?page_id=9724'


function SourceAudit({ data }: { data: AtlasData }) {
  return (
    <dl className="source-audit" aria-label="Audit zdrojových riadkov">
      <div>
        <dt>Riadky v zdroji</dt>
        <dd>{formatNumber(data.meta.sourceRowCount)}</dd>
      </div>
      <div>
        <dt>Preskúmané opakovania</dt>
        <dd>{formatNumber(data.meta.duplicateSourceRowCount)}</dd>
      </div>
      <div>
        <dt>Analytické vymenovania</dt>
        <dd>{formatNumber(data.meta.analyticalAppointmentCount)}</dd>
      </div>
    </dl>
  )
}

export default function Methodology({ data, status }: MethodologyProps) {
  const baseUrl = import.meta.env.BASE_URL
  const unresolvedAffiliationIds = new Set(
    data?.affiliations
      .filter(({ status }) => status === 'unresolved')
      .map(({ id }) => id) ?? [],
  )
  const unresolvedLocationCount =
    data?.records.filter(({ affiliationId }) => unresolvedAffiliationIds.has(affiliationId))
      .length ?? 0

  return (
    <section id="metodika" className="section section--method" aria-labelledby="method-title">
      <div className="method-grid">
        <div>
          <h2 id="method-title">Metodika a pramene</h2>
        </div>
        <div className="method-copy">
          <p>
            Jednotkou je analytické profesorské vymenovanie, nie jedinečná fyzická osoba.
            Zhodné meno v rôznych dátumoch sa nezlučuje. Iba ručne preskúmané opakovania toho
            istého mena a dátumu sa viažu k ponechanému záznamu.
          </p>
          <p>
            Prezidentské obdobia poskytujú časové členenie; atlas z nich nerobí rebríček.
            Počty pri inštitúciách opisujú aktivitu vymenovaní, nie kvalitu školy.
          </p>
        </div>
      </div>

      {data === undefined ? (
        <div className="method-status" role="status">
          <h3>
            {status === 'error'
              ? 'Dátový audit nie je dostupný'
              : 'Dátový audit sa načítava'}
          </h3>
          <p>
            {status === 'error'
              ? 'Metodické vysvetlenie zostáva dostupné, presné súčty a kontrolné odtlačky však možno zobraziť až po bezpečnom načítaní dát.'
              : 'Presné súčty, kontrolné odtlačky a odkazy na uložené súbory doplníme po overení dát.'}
          </p>
          <p>
            <a href={MINISTRY_PAGE_URL}>Oficiálna stránka zoznamu profesorov</a>
          </p>
        </div>
      ) : (
        <>
          <SourceAudit data={data} />

          <details className="fold">
            <summary>Celá metodika, pramene a kontrolné súčty</summary>
            <div className="methodology-sections">
              <section aria-labelledby="method-records-title">
                <p className="methodology-sections__index" aria-hidden="true">01</p>
                <h3 id="method-records-title">Zdroj, čistenie a opakovania</h3>
                <p>
                  Ministerský zošit obsahuje {formatNumber(data.meta.sourceRowCount)} zdrojových
                  riadkov. Rozhodovacia tabuľka pomenúva {formatNumber(
                    data.meta.duplicateSourceRowCount,
                  )} preskúmaných sekundárnych riadkov a ich ponechané náprotivky. Rozlíšenie{' '}
                  <strong>
                    {formatNumber(data.meta.sourceRowCount)} →{' '}
                    {formatNumber(data.meta.analyticalAppointmentCount)}
                  </strong>{' '}
                  preto vytvára {formatNumber(data.meta.analyticalAppointmentCount)} analytických
                  vymenovaní. Nejde o otvorené fuzzy zlučovanie a opakované meno v inom dátume sa
                  zachováva ako samostatné vymenovanie.
                </p>
                <p>
                  Dátum sa prevádza na ISO zápis, text sa zbaví nezalomiteľných a opakovaných
                  medzier, no každý pôvodný variant ostáva v detaile. Druhý hárok ministerského
                  zošita je autoritou pre skratky 21 škôl; preskúmaná tabuľka aliasov rieši historické
                  a pravopisné varianty aj Vysokú školu DTI. Kanonický názov nikdy neprepisuje
                  zdrojový názov.
                </p>
                <p>
                  Zdroj v roku 2026 zatiaľ siaha po <strong>{formatDate(data.meta.appointmentDateMax)}</strong>;
                  rok 2026 je neúplný. Atlas preto toto obdobie označuje a nevytvára preň chýbajúci
                  národný menovateľ.
                </p>
              </section>

              <section aria-labelledby="method-context-title">
                <p className="methodology-sections__index" aria-hidden="true">02</p>
                <h3 id="method-context-title">Národný kontext nie je miestny pomer</h3>
                <p>
                  Vymenovania aj absolventi sú ročné toky. Študenti a interní učitelia sú stavom k
                  31. októbru príslušného akademického roka. Absolventi zahŕňajú prvý, druhý aj tretí
                  stupeň a denné, externé, slovenské aj zahraničné štúdium podľa presne určených
                  stĺpcov CVTI; každý stĺpec vstupuje do súčtu iba raz.
                </p>
                <p>
                  Porovnanie toku so stavom nie je zmenou počtu profesorov, konverziou ani dôkazom
                  príčiny. Miestne filtre atlasu nemenia národné súčty. CVTI od roku 2007 mení
                  definíciu interných učiteľov na ustanovený plný pracovný čas. Oficiálny rad sa
                  končí akademickým rokom 2025/2026, preto rok 2026 nemá kontextové pomery.
                </p>
              </section>

              <section aria-labelledby="method-fields-title">
                <p className="methodology-sections__index" aria-hidden="true">03</p>
                <h3 id="method-fields-title">Dostupné obdobie a recenzovaný katalóg odborov</h3>
                <p>
                  Odborová vrstva má spoločné dostupné obdobie <strong>2009 – 2025</strong>.
                  Ovládače volia inkluzívny podrozsah, ktorý sa zapisuje do URL ako{' '}
                  <code>fieldStartYear</code> a <code>fieldEndYear</code>. Súradnica bodu sčíta
                  udalosti vymenovania a dostupné počty absolventov iba vo vybraných rokoch; 17
                  ročných zošitov CVTI tvorí celý dostupný obal. Pomer <strong>tok ÷ tok</strong>{' '}
                  sa pri nulovom počte vymenovaní nezobrazuje. Aktuálni študenti zostávajú stavom
                  k roku 2025 a zobrazujú sa iba ako oddelený kontext, nie v osi ani v pomere.
                </p>
                <p>
                  Každý ročný zošit sa najprv sčíta po riadkoch študijných programov. Tie sa potom
                  priradia k ručne recenzovanému katalógu presných odborov. Katalóg zjednocuje iba
                  doložené historické, pravopisné a jazykové aliasy; samotná zhoda po odstránení
                  diakritiky alebo podobný význam nestačia. Zdrojové názvy vymenovaní ostávajú
                  viditeľné. Nula znamená pozorovanú nulu v zdroji, pomlčka chýbajúce pozorovanie.
                  Odbory bez bezpečnej zhody zostávajú explicitne mimo bodového grafu.
                </p>
              </section>

              <section aria-labelledby="method-bibliometrics-title">
                <p className="methodology-sections__index" aria-hidden="true">04</p>
                <h3 id="method-bibliometrics-title">Prečo atlas neuvádza citácie</h3>
                <p>
                  Ministerský zdroj neobsahuje ORCID ani rovnocenný stabilný vedecký identifikátor.
                  Párovanie iba podľa mena nie je bezpečné: menovci, zmeny priezviska a rôzne zápisy
                  mena môžu priradiť cudzie práce. Aj správne priradený hrubý počet citácií by
                  skresľovali rozdiely medzi odbormi a dĺžkou kariéry.
                </p>
                <p>
                  Budúca porovnateľná vrstva by musela párovať najprv cez ORCID a až potom cez ručne
                  preskúmané identifikátory autorov OpenAlex s dôkazmi o afiliácii a odbore; nejasné
                  zhody by vylúčila. H-index a celkové citácie by uvádzala iba opisne. Porovnanie
                  osôb by používalo citácie na aktívny rok a percentily citácií normalizované podľa
                  odboru aj roku publikovania, pričom nedávny výkon by zostal oddelený od celoživotného.
                  Súčasné dáta túto vrstvu neobsahujú, preto atlas citácie zámerne nezobrazuje.
                </p>
              </section>
            </div>

            <div className="method-sources">
              <section aria-labelledby="appointment-sources-title">
                <h3 id="appointment-sources-title">Profesorské vymenovania</h3>
                <ul>
                  <li>
                    <a href={MINISTRY_PAGE_URL}>Oficiálna stránka zoznamu profesorov</a>
                  </li>
                  <li>
                    <a href={data.sources.professors.url}>Priamy oficiálny zošit ministerstva (XLS)</a>
                  </li>
                  <li>
                    <a href={`${baseUrl}data/source/professors.xls`} download>
                      Uložený zoznam profesorov (XLS)
                    </a>
                  </li>
                </ul>
                <p className="method-sources__hash">
                  SHA-256: <code>{data.sources.professors.sha256}</code>
                </p>
              </section>

              <section aria-labelledby="context-sources-title">
                <h3 id="context-sources-title">Vysokoškolský kontext</h3>
                <ul>
                  <li>
                    <a href={CVTI_PAGE_URL}>Oficiálna stránka časových radov CVTI SR</a>
                  </li>
                  <li>
                    <a href={data.sources.higher_education.url}>Priamy oficiálny rad CVTI (XLS)</a>
                  </li>
                  <li>
                    <a href={`${baseUrl}data/source/higher-education.xls`} download>
                      Uložený rad CVTI (XLS)
                    </a>
                  </li>
                </ul>
                <p className="method-sources__hash">
                  SHA-256: <code>{data.sources.higher_education.sha256}</code>
                </p>
              </section>
              <section aria-labelledby="population-sources-title">
                <h3 id="population-sources-title">Obyvateľstvo Slovenska</h3>
                <ul>
                  <li>
                    <a href={data.sources.population.catalogUrl}>
                      Katalóg DATAcube Štatistického úradu SR
                    </a>
                  </li>
                  <li>
                    <a href={data.sources.population.url}>
                      Priamy oficiálny výber obyvateľstva (JSON-stat)
                    </a>
                  </li>
                  <li>
                    <a href={`${baseUrl}data/source/population.json`} download>
                      Uložený národný rad obyvateľstva (JSON)
                    </a>
                  </li>
                </ul>
                <p>
                  Menovateľom je národný stredný stav obyvateľstva o polnoci z 30. júna na
                  1. júla referenčného roka.
                </p>
                <p className="method-sources__hash">
                  SHA-256: <code>{data.sources.population.sha256}</code>
                </p>
              </section>


              <section aria-labelledby="field-education-sources-title">
                <h3 id="field-education-sources-title">Absolventi a študenti podľa odboru</h3>
                <ul>
                  <li>
                    <a href={data.fieldEducationComparison.catalogUrl}>
                      Katalóg štatistickej ročenky CVTI SR
                    </a>
                  </li>
                  <li>
                    <a href={data.fieldEducationComparison.currentStudentsSource.url}>
                      Oficiálny zošit aktuálnych študentov 2025 (XLS)
                    </a>
                  </li>
                  <li>
                    <a
                      href={`${baseUrl}data/source/${data.fieldEducationComparison.currentStudentsSource.localPath}`}
                      download
                    >
                      Uložený zošit aktuálnych študentov (XLS)
                    </a>
                  </li>
                </ul>
                <p className="method-sources__hash">
                  SHA-256 študentov:{' '}
                  <code>{data.fieldEducationComparison.currentStudentsSource.sha256}</code>
                </p>
                <details>
                  <summary>17 ročných zošitov absolventov, 2009 – 2025</summary>
                  <ul>
                    {data.fieldEducationComparison.graduateSources.map((source) => (
                      <li key={source.year}>
                        {source.year}:{' '}
                        <a href={source.url}>oficiálny zdroj</a>
                        {' · '}
                        <a href={`${baseUrl}data/source/${source.localPath}`} download>
                          uložený XLS
                        </a>
                        {' · '}
                        <code>{source.sha256}</code>
                      </li>
                    ))}
                  </ul>
                </details>
              </section>
            </div>

            <div className="method-citations">
              <section aria-labelledby="term-sources-title">
                <h3 id="term-sources-title">Prezidentské obdobia</h3>
                <p>
                  Hranice období sú explicitné: začiatok je zahrnutý a koniec vylúčený. Každý dátum
                  vymenovania musí patriť práve jednému obdobiu.
                </p>
                <ul>
                  {data.presidents.map(({ name, citationUrl }) => (
                    <li key={name}>
                      <a href={citationUrl} aria-label={`Oficiálne obdobie: ${name}`}>
                        {name} — oficiálny profil
                      </a>
                    </li>
                  ))}
                </ul>
              </section>

              <section aria-labelledby="geography-sources-title">
                <h3 id="geography-sources-title">Geografia a súradnice</h3>
                <p>
                  Mesto patrí navrhujúcemu pracovisku, nie bydlisku profesora. Overené fakultné
                  pravidlo má prednosť pred kanonickým sídlom školy. Ak zdroj neurčuje konkrétne
                  pracovisko, záznam zostáva vo všetkých súhrnoch, ale mapa ho nezobrazuje; takto
                  zostáva bez polohy {formatAppointmentCount(unresolvedLocationCount)}. Obrys
                  Slovenska pochádza z verejnej geometrie Natural Earth.
                </p>
                <ul>
                  <li>
                    <a href={data.geography.properties.sourceUrl}>Geometria Natural Earth</a>
                  </li>
                  <li>
                    <a href={data.geography.properties.licenseUrl}>Licenčné podmienky Natural Earth</a>
                  </li>
                  {data.institutions.map((institution) => (
                    <li key={institution.id}>
                      <a
                        href={institution.citationUrl}
                        aria-label={`Kanonická inštitúcia: ${institution.fullName}`}
                      >
                        {institution.fullName} — identita inštitúcie
                      </a>
                    </li>
                  ))}
                  {data.affiliations
                    .filter(
                      ({ facultyKeys, sourceUrl, status }) =>
                        sourceUrl !== null && (facultyKeys.length > 0 || status === 'unresolved'),
                    )
                    .map((affiliation) => (
                      <li key={affiliation.id}>
                        <a href={affiliation.sourceUrl ?? undefined}>
                          {affiliation.sourceLabel}
                        </a>
                      </li>
                    ))}
                </ul>
              </section>
            </div>
            <FieldCleanupReport records={data.records} catalog={data.fieldCatalog} />
          </details>
        </>
      )}
    </section>
  )
}
