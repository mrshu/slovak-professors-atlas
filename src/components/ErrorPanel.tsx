import { ATLAS_LOAD_MESSAGE } from '../data/load'

const MINISTRY_SOURCE_URL = 'https://www.minedu.sk/data/att/41c/36688.d8c1fd.xls'

export default function ErrorPanel() {
  return (
    <div className="error-panel" role="alert">
      <div className="error-panel__mark" aria-hidden="true">
        !
      </div>
      <div>
        <p className="eyebrow">Dátový archív je nedostupný</p>
        <h2 id="load-error-title">Atlas sa nepodarilo načítať</h2>
        <p>{ATLAS_LOAD_MESSAGE}</p>
        <p>
          Rozhranie zámerne nezobrazuje neúplné alebo nekompatibilné dáta. Pôvodný súbor
          si môžete overiť priamo na stránke ministerstva.
        </p>
        <a className="text-link" href={MINISTRY_SOURCE_URL}>
          Otvoriť zdrojový zoznam ministerstva
        </a>
      </div>
    </div>
  )
}
