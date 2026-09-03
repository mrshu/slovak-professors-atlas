import { useMemo } from 'react'

import { buildFieldCleanupReport, type SpellingDifference } from '../analysis/fieldCleanup'
import type { Appointment, FieldCatalog } from '../data/types'
import { formatDate, formatNumber } from '../utils/format'

interface FieldCleanupReportProps {
  records: readonly Appointment[]
  catalog: FieldCatalog
}

const DIFFERENCE_LABEL: Record<SpellingDifference, string> = {
  medzery: 'medzery',
  'veľkosť písmen': 'veľkosť písmen',
  diakritika: 'diakritika',
  alias: 'preskúmaný alias',
  'iný zápis': 'iný zápis v opakovanom riadku',
}

function showSpaces(value: string): string {
  return value.replace(/ /g, '⍽').replace(/ {2,}/g, (match) => '␣'.repeat(match.length)).replace(/^ | $/g, '␣')
}

export default function FieldCleanupReport({ records, catalog }: FieldCleanupReportProps) {
  const report = useMemo(() => buildFieldCleanupReport(records, catalog), [catalog, records])
  const differenceCounts = new Map<SpellingDifference, number>()
  for (const field of report.mergedSpellings) {
    for (const variant of field.variants) {
      if (variant.difference !== null) {
        differenceCounts.set(variant.difference, (differenceCounts.get(variant.difference) ?? 0) + 1)
      }
    }
  }

  return (
    <details className="fold field-cleanup">
      <summary>Čistenie názvov odborov</summary>
      <div className="field-cleanup__body">
        <p>
          Názvy odborov sú v ministerskom zošite písané voľne. Atlas ich zjednocuje tromi krokmi
          a každý pôvodný zápis ponecháva pri zázname, takže nič sa neprepisuje bez stopy.
        </p>
        <dl className="field-cleanup__funnel" aria-label="Postup zjednotenia názvov odborov">
          <div>
            <dt>Zdrojové zápisy</dt>
            <dd>{formatNumber(report.rawVariantCount)}</dd>
            <p>odlišných reťazcov v zdroji</p>
          </div>
          <div>
            <dt>Po úprave medzier</dt>
            <dd>{formatNumber(report.displayVariantCount)}</dd>
            <p>zrušené medzery na okrajoch, zdvojené a nezalomiteľné</p>
          </div>
          <div>
            <dt>Po zjednotení zápisu</dt>
            <dd>{formatNumber(report.keyCount)}</dd>
            <p>bez rozdielu veľkosti písmen a diakritiky</p>
          </div>
          <div>
            <dt>Recenzované odbory</dt>
            <dd>{formatNumber(report.fieldCount)}</dd>
            <p>po {formatNumber(report.aliases.length)} preskúmaných aliasoch preklepov</p>
          </div>
        </dl>

        <h4>Preskúmané aliasy preklepov</h4>
        <p>
          Každý alias je ručne overený preklep bez inej možnej interpretácie. Synonymá, jednotné a
          množné číslo, podreťazce ani odborové kódy sa nezlučujú.
        </p>
        <table className="field-cleanup__table">
          <thead>
            <tr>
              <th>Zdrojový zápis</th>
              <th>Recenzovaný odbor</th>
              <th>Záznamy</th>
            </tr>
          </thead>
          <tbody>
            {report.aliases.map((alias) => (
              <tr key={alias.sourceKey}>
                <td>
                  <s>{alias.sourceLabel}</s>
                </td>
                <td>{alias.targetLabel}</td>
                <td>{formatNumber(alias.recordCount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h4>Odbory s viacerými zdrojovými zápismi</h4>
        <p>
          {formatNumber(report.mergedSpellings.length)} odborov sa v zdroji vyskytuje vo viacerých
          podobách:{' '}
          {Array.from(differenceCounts, ([difference, count]) => `${formatNumber(count)}× ${DIFFERENCE_LABEL[difference]}`).join(', ')}.
          Znak ␣ označuje medzeru navyše, ⍽ nezalomiteľnú medzeru.
        </p>
        <table className="field-cleanup__table">
          <thead>
            <tr>
              <th>Recenzovaný odbor</th>
              <th>Zdrojové zápisy</th>
              <th>Záznamy</th>
            </tr>
          </thead>
          <tbody>
            {report.mergedSpellings.map((field) => (
              <tr key={field.fieldKey}>
                <td>{field.label}</td>
                <td>
                  <ul>
                    {field.variants.map((variant) => (
                      <li key={variant.label}>
                        <code>{showSpaces(variant.label)}</code> · {formatNumber(variant.count)}
                        {variant.difference === null ? '' : ` · ${DIFFERENCE_LABEL[variant.difference]}`}
                      </li>
                    ))}
                  </ul>
                </td>
                <td>{formatNumber(field.recordCount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {report.duplicateDisagreements.length > 0 ? (
          <>
            <h4>Opakované riadky s odlišným odborom</h4>
            <p>
              Pri preskúmaných opakovaniach toho istého mena a dátumu platí odbor ponechaného
              riadku; odlišný zápis druhého riadku ostáva v detaile záznamu.
            </p>
            <ul className="field-cleanup__list">
              {report.duplicateDisagreements.map((item) => (
                <li key={`${item.name}-${item.appointedOn}`}>
                  <strong>{item.name}</strong>, {formatDate(item.appointedOn)}: ponechané „{item.retained}“,
                  v opakovanom riadku {item.discarded.map((label) => `„${label}“`).join(', ')}
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {report.unmergedCandidates.length > 0 ? (
          <>
            <h4>Nezlúčené kandidáti</h4>
            <p>
              Tieto názvy sa líšia iba interpunkciou alebo medzerou pri pomlčke. Zatiaľ ostávajú
              samostatné, lebo nejde o overený preklep; sú na rade pri ďalšej recenzii aliasov.
            </p>
            <ul className="field-cleanup__list">
              {report.unmergedCandidates.map((candidate) => (
                <li key={candidate.labels.join('|')}>
                  {candidate.labels.map((label) => `„${label}“`).join(' · ')} ({formatNumber(candidate.recordCount)} záznamov)
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
    </details>
  )
}
