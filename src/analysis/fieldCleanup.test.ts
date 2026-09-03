import { describe, expect, it } from 'vitest'

import { appointment } from '../test/atlasFixture'
import { buildFieldCleanupReport, classifyDifference } from './fieldCleanup'

const catalog = {
  schemaVersion: 1 as const,
  aliases: [
    { sourceLabel: 'tretsné právo', sourceKey: 'tretsne pravo', targetLabel: 'trestné právo', targetKey: 'trestne pravo' },
  ],
  labels: {
    'trestne pravo': 'trestné právo',
    'verejne zdravotnictvo': 'verejné zdravotníctvo',
    farmacia: 'farmácia',
    'vytvarne umenie - volna tvorba': 'výtvarné umenie - voľná tvorba',
    'vytvarne umenie-volna tvorba': 'výtvarné umenie-voľná tvorba',
  },
}

function variant(field: string) {
  return { rowNumber: 1, titlesBefore: null, titlesAfter: null, faculty: null, institution: 'UK v Bratislave', field }
}

const records = [
  appointment({ appointedOn: '2010-01-25', field: 'trestné právo', fieldKey: 'trestne pravo', sourceVariants: [variant('trestné právo')] }),
  appointment({ appointedOn: '2011-01-24', field: 'trestné právo', fieldKey: 'trestne pravo', sourceVariants: [variant('tretsné právo')] }),
  appointment({ appointedOn: '2012-07-10', field: 'verejné zdravotníctvo', fieldKey: 'verejne zdravotnictvo', sourceVariants: [variant('verejné zdravotníctvo ')] }),
  appointment({ appointedOn: '2012-07-10', field: 'verejné zdravotníctvo', fieldKey: 'verejne zdravotnictvo', sourceVariants: [variant('verejné zdravotníctvo ')] }),
  appointment({ appointedOn: '2012-07-10', field: 'verejné zdravotníctvo', fieldKey: 'verejne zdravotnictvo', sourceVariants: [variant('Verejné zdravotníctvo')] }),
  appointment({ appointedOn: '2009-01-20', name: 'Ján Kyselovič', field: 'farmácia', fieldKey: 'farmacia', sourceVariants: [variant('farmácia'), variant('farmakológia')] }),
  appointment({ appointedOn: '2013-03-05', field: 'výtvarné umenie - voľná tvorba', fieldKey: 'vytvarne umenie - volna tvorba', sourceVariants: [variant('výtvarné umenie - voľná tvorba')] }),
  appointment({ appointedOn: '2014-05-26', field: 'výtvarné umenie-voľná tvorba', fieldKey: 'vytvarne umenie-volna tvorba', sourceVariants: [variant('výtvarné umenie-voľná tvorba')] }),
]

describe('field cleanup report', () => {
  it('classifies how a source spelling differs from the canonical label', () => {
    const aliases = new Set(['tretsne pravo'])
    expect(classifyDifference('trestné právo', 'trestné právo', aliases)).toBeNull()
    expect(classifyDifference('trestné právo ', 'trestné právo', aliases)).toBe('medzery')
    expect(classifyDifference('Trestné právo', 'trestné právo', aliases)).toBe('veľkosť písmen')
    expect(classifyDifference('trestne pravo', 'trestné právo', aliases)).toBe('diakritika')
    expect(classifyDifference('tretsné právo', 'trestné právo', aliases)).toBe('alias')
    expect(classifyDifference('farmakológia', 'farmácia', aliases)).toBe('iný zápis')
  })

  it('counts the cleanup funnel, aliases, merged spellings, disagreements and unmerged candidates', () => {
    const report = buildFieldCleanupReport(records, catalog)
    expect(report.rawVariantCount).toBe(8)
    expect(report.displayVariantCount).toBe(8)
    expect(report.keyCount).toBe(7)
    expect(report.fieldCount).toBe(5)
    expect(report.aliases).toEqual([{ ...catalog.aliases[0], recordCount: 1 }])
    expect(report.mergedSpellings.map(({ label }) => label)).toEqual([
      'verejné zdravotníctvo',
      'farmácia',
      'trestné právo',
    ])
    expect(report.mergedSpellings[0]?.variants.map(({ label, count, difference }) => [label, count, difference])).toEqual([
      ['verejné zdravotníctvo ', 2, 'medzery'],
      ['Verejné zdravotníctvo', 1, 'veľkosť písmen'],
    ])
    expect(report.duplicateDisagreements).toEqual([
      { name: 'Ján Kyselovič', appointedOn: '2009-01-20', retained: 'farmácia', discarded: ['farmakológia'] },
    ])
    expect(report.unmergedCandidates).toEqual([
      { labels: ['výtvarné umenie - voľná tvorba', 'výtvarné umenie-voľná tvorba'], recordCount: 2 },
    ])
  })
})
