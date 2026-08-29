import { useMemo } from 'react'

import {
  academicBreadth,
  ceremonyCadence,
  institutionConcentration,
  presidentialEraProfiles,
} from '../analysis/selectors'
import type { Affiliation, Appointment, Institution, President } from '../data/types'
import { formatDate, formatNumber } from '../utils/format'

interface AnalysisLensesProps {
  records: readonly Appointment[]
  institutions: readonly Institution[]
  affiliations: readonly Affiliation[]
  presidents: readonly President[]
}

function formatMedian(value: number | null, suffix = ''): string {
  if (value === null) {
    return '—'
  }
  return `${formatNumber(value, { maximumFractionDigits: 1 })}${suffix}`
}

export default function AnalysisLenses({
  records,
  institutions,
  affiliations,
  presidents,
}: AnalysisLensesProps) {
  const cadence = useMemo(() => ceremonyCadence(records), [records])
  const breadth = useMemo(
    () => academicBreadth(records, affiliations),
    [affiliations, records],
  )
  const concentration = useMemo(
    () => institutionConcentration(records, institutions),
    [institutions, records],
  )
  const eraProfiles = useMemo(
    () => presidentialEraProfiles(records, institutions, affiliations, presidents),
    [affiliations, institutions, presidents, records],
  )

  let cadenceNote = 'Rozostup je počet kalendárnych dní medzi po sebe idúcimi slávnosťami.'
  if (cadence.ceremonyCount === 0) {
    cadenceNote = 'Pri prázdnom výbere sa mediány dávky a rozostupu neurčujú.'
  } else if (cadence.ceremonyCount === 1) {
    cadenceNote = 'Pri jedinej slávnosti sa medián rozostupu neurčuje.'
  }

  return (
    <div className="analysis-lenses" aria-label="Analytické pohľady aktívneho výberu">
      <article className="analysis-lens" aria-labelledby="cadence-lens-title">
        <p className="analysis-lens__index" aria-hidden="true">
          01
        </p>
        <h3 id="cadence-lens-title">Rytmus slávností</h3>
        <dl>
          <div>
            <dt>Počet slávností</dt>
            <dd>{formatNumber(cadence.ceremonyCount)}</dd>
          </div>
          <div>
            <dt>Medián dávky</dt>
            <dd>{formatMedian(cadence.medianBatchSize)}</dd>
          </div>
          <div>
            <dt>Najväčšia dávka</dt>
            <dd>{formatNumber(cadence.largestBatchSize)}</dd>
          </div>
          <div>
            <dt>Medián rozostupu</dt>
            <dd>{formatMedian(cadence.medianElapsedDays, ' dní')}</dd>
          </div>
        </dl>
        <p className="analysis-lens__note">{cadenceNote}</p>
      </article>

      <article className="analysis-lens" aria-labelledby="breadth-lens-title">
        <p className="analysis-lens__index" aria-hidden="true">
          02
        </p>
        <h3 id="breadth-lens-title">Akademická šírka</h3>
        <dl>
          <div>
            <dt>Mestá</dt>
            <dd>{formatNumber(breadth.cityCount)}</dd>
          </div>
          <div>
            <dt>Inštitúcie</dt>
            <dd>{formatNumber(breadth.institutionCount)}</dd>
          </div>
          <div>
            <dt>Fakulty s názvom</dt>
            <dd>{formatNumber(breadth.facultyCount)}</dd>
          </div>
        </dl>
        <p className="analysis-lens__note">
          Šírka počíta odlišné sídla, kanonické školy a iba neprázdne zdrojové názvy fakúlt.
        </p>
      </article>

      <article className="analysis-lens" aria-labelledby="concentration-lens-title">
        <p className="analysis-lens__index" aria-hidden="true">
          03
        </p>
        <h3 id="concentration-lens-title">Koncentrácia inštitúcií</h3>
        <dl>
          <div>
            <dt>Podiel prvých troch</dt>
            <dd>
              {concentration.totalCount === 0
                ? '—'
                : `${formatNumber(concentration.topThreeShare * 100, { maximumFractionDigits: 1 })} %`}
            </dd>
          </div>
          <div>
            <dt>Spolu v prvej trojici</dt>
            <dd>
              {formatNumber(concentration.topThreeCount)} z {formatNumber(concentration.totalCount)}
            </dd>
          </div>
        </dl>
        <p className="analysis-lens__note">
          Koncentrácia opisuje rozdelenie vymenovaní, nie kvalitu školy ani výkon prezidenta.
        </p>
      </article>

      <article className="analysis-lens" aria-labelledby="leader-lens-title">
        <p className="analysis-lens__index" aria-hidden="true">
          04
        </p>
        <h3 id="leader-lens-title">Vedúca inštitúcia</h3>
        <dl>
          <div>
            <dt>Inštitúcia</dt>
            <dd>{concentration.leadingInstitutionName ?? 'Žiadna inštitúcia'}</dd>
          </div>
          <div>
            <dt>Vymenovania</dt>
            <dd>
              {formatNumber(concentration.leadingInstitutionCount)} z{' '}
              {formatNumber(concentration.totalCount)}
            </dd>
          </div>
        </dl>
        <p className="analysis-lens__note">
          Vedúca znamená najvyšší počet v aktívnom výbere; nejde o hodnotenie pracoviska.
        </p>
      </article>

      <section className="analysis-era-profile" aria-labelledby="era-profile-title">
        <div className="analysis-era-profile__heading">
          <div>
            <p className="eyebrow">Historický kontext aktívneho výberu</p>
            <h3 id="era-profile-title">Profil prezidentských období</h3>
          </div>
          <p className="analysis-lens__note">
            Profily sú zoradené podľa oficiálneho začiatku obdobia. Porovnávajú šírku
            zastúpenia a koncentráciu; nejde o rebríček prezidentov ani hodnotenie kvality.
          </p>
        </div>

        {eraProfiles.length === 0 ? (
          <p className="analysis-era-profile__empty">
            Aktívny výber neobsahuje vymenovanie v žiadnom prezidentskom období.
          </p>
        ) : (
          <ol className="analysis-era-profile__list">
            {eraProfiles.map((profile) => {
              const endLabel = profile.to === null ? 'súčasnosti' : formatDate(profile.to)
              const dateSpan = `od ${formatDate(profile.from)} do ${endLabel}`
              return (
                <li key={profile.presidentId}>
                  <article
                    className="analysis-era-profile__term"
                    aria-label={`Prezidentské obdobie ${profile.presidentName}: ${dateSpan}${
                      profile.to === null ? '' : ', koniec sa nezapočítava'
                    }`}
                  >
                    <header>
                      <h4>{profile.presidentName}</h4>
                      <p>
                        {dateSpan}
                        {profile.to === null ? '' : ' · koniec sa nezapočítava'}
                      </p>
                    </header>
                    <dl>
                      <div>
                        <dt>Vedúca inštitúcia</dt>
                        <dd>{profile.leadingInstitutionName}</dd>
                      </div>
                      <div>
                        <dt>Odlišné mestá</dt>
                        <dd>{formatNumber(profile.cityCount)}</dd>
                      </div>
                      <div>
                        <dt>Kanonické inštitúcie</dt>
                        <dd>{formatNumber(profile.institutionCount)}</dd>
                      </div>
                      <div>
                        <dt>Fakulty s názvom</dt>
                        <dd>{formatNumber(profile.facultyCount)}</dd>
                      </div>
                      <div>
                        <dt>Podiel prvej trojice</dt>
                        <dd>
                          {formatNumber(profile.topThreeShare * 100, {
                            maximumFractionDigits: 1,
                          })}{' '}
                          %
                        </dd>
                      </div>
                    </dl>
                  </article>
                </li>
              )
            })}
          </ol>
        )}
      </section>
    </div>
  )
}
