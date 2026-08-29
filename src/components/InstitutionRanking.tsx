import { useMemo } from 'react'

import { facultyDistribution, institutionRanking } from '../analysis/selectors'
import type { Appointment, Institution } from '../data/types'
import { formatAppointmentCount, formatNumber } from '../utils/format'

interface InstitutionRankingProps {
  records: readonly Appointment[]
  institutions: readonly Institution[]
  selectedInstitutionId: string | null
  onToggleInstitution: (institutionId: string) => void
}

export default function InstitutionRanking({
  records,
  institutions,
  selectedInstitutionId,
  onToggleInstitution,
}: InstitutionRankingProps) {
  const ranking = useMemo(
    () => institutionRanking(records, institutions),
    [institutions, records],
  )
  const maxCount = ranking[0]?.count ?? 0
  const selectedInstitution = institutions.find(({ id }) => id === selectedInstitutionId)
  const selectedRecords = useMemo(
    () =>
      selectedInstitutionId === null
        ? []
        : records.filter(({ institutionId }) => institutionId === selectedInstitutionId),
    [records, selectedInstitutionId],
  )
  const faculties = useMemo(() => facultyDistribution(selectedRecords), [selectedRecords])
  const maxFacultyCount = faculties[0]?.count ?? 0

  return (
    <section className="institution-ranking" aria-labelledby="institution-ranking-title">
      <div className="institution-ranking__heading">
        <div>
          <p className="eyebrow eyebrow--light">Rebríček podľa počtu</p>
          <h3 id="institution-ranking-title">Inštitúcie v aktívnom výbere</h3>
        </div>
        <p>Poradie vyjadruje iba rozdelenie vymenovaní, nie kvalitu pracoviska.</p>
      </div>

      {ranking.length === 0 ? (
        <p className="institution-ranking__empty">Aktívnym filtrom nezodpovedá žiadna inštitúcia.</p>
      ) : (
        <ol className="institution-ranking__list">
          {ranking.map((institution, index) => {
            const selected = institution.institutionId === selectedInstitutionId
            return (
              <li key={institution.institutionId}>
                <button
                  className="institution-ranking__button"
                  type="button"
                  aria-label={`${institution.name}: ${formatAppointmentCount(institution.count)}, ${
                    selected ? 'vybrané' : 'nevybrané'
                  }`}
                  aria-pressed={selected}
                  onClick={() => onToggleInstitution(institution.institutionId)}
                >
                  <span className="institution-ranking__ordinal" aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="institution-ranking__name" aria-hidden="true">
                    {institution.name}
                  </span>
                  <span className="institution-ranking__count" aria-hidden="true">
                    {formatNumber(institution.count)}
                  </span>
                  <span
                    className="institution-ranking__bar"
                    style={{ width: `${maxCount === 0 ? 0 : (institution.count / maxCount) * 100}%` }}
                    aria-hidden="true"
                  />
                </button>
              </li>
            )
          })}
        </ol>
      )}

      {selectedInstitution !== undefined && selectedRecords.length > 0 && (
        <div className="institution-ranking__faculties">
          <div className="institution-ranking__faculty-heading">
            <h4>Fakulty {selectedInstitution.shortName}</h4>
            <p>Zdrojové názvy; prázdna hodnota zostáva označená „neuvedené“.</p>
          </div>
          <ol>
            {faculties.map((faculty) => (
              <li key={faculty.faculty}>
                <span>{faculty.faculty}</span>
                <span className="institution-ranking__faculty-count">
                  {formatNumber(faculty.count)}
                </span>
                <span
                  className="institution-ranking__faculty-bar"
                  style={{
                    width: `${maxFacultyCount === 0 ? 0 : (faculty.count / maxFacultyCount) * 100}%`,
                  }}
                  aria-hidden="true"
                />
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  )
}
