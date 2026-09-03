import type { Appointment, FieldAlias, FieldCatalog } from '../data/types'
import { normalizeForSearch } from '../utils/search'

export type SpellingDifference = 'medzery' | 'veľkosť písmen' | 'diakritika' | 'alias' | 'iný zápis'

export interface SpellingVariant {
  label: string
  count: number
  difference: SpellingDifference | null
}

export interface MergedSpelling {
  fieldKey: string
  label: string
  recordCount: number
  variants: SpellingVariant[]
}

export interface AliasUse extends FieldAlias {
  recordCount: number
}

export interface DuplicateDisagreement {
  name: string
  appointedOn: string
  retained: string
  discarded: string[]
}

export interface UnmergedCandidate {
  labels: string[]
  recordCount: number
}

export interface FieldCleanupReport {
  rawVariantCount: number
  displayVariantCount: number
  keyCount: number
  fieldCount: number
  aliases: AliasUse[]
  mergedSpellings: MergedSpelling[]
  duplicateDisagreements: DuplicateDisagreement[]
  unmergedCandidates: UnmergedCandidate[]
}

const slovakCollator = new Intl.Collator('sk-SK')

function collapseWhitespace(value: string): string {
  return value.replace(/ /g, ' ').replace(/\s+/g, ' ').trim()
}

function stripDiacritics(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '')
}

function squash(value: string): string {
  return normalizeForSearch(value).replace(/[^a-z0-9]/g, '')
}

export function classifyDifference(
  variant: string,
  canonical: string,
  aliasKeys: ReadonlySet<string>,
): SpellingDifference | null {
  if (variant === canonical) return null
  if (aliasKeys.has(normalizeForSearch(variant))) return 'alias'
  if (collapseWhitespace(variant) === canonical) return 'medzery'
  if (collapseWhitespace(variant).toLocaleLowerCase('sk-SK') === canonical.toLocaleLowerCase('sk-SK')) {
    return 'veľkosť písmen'
  }
  if (stripDiacritics(collapseWhitespace(variant)).toLocaleLowerCase('sk-SK') === stripDiacritics(canonical).toLocaleLowerCase('sk-SK')) {
    return 'diakritika'
  }
  return 'iný zápis'
}

export function buildFieldCleanupReport(
  records: readonly Appointment[],
  catalog: FieldCatalog,
): FieldCleanupReport {
  const aliasKeys = new Set(catalog.aliases.map(({ sourceKey }) => sourceKey))
  const rawStrings = new Set<string>()
  const displayStrings = new Set<string>()
  const keys = new Set<string>()
  const variantsByField = new Map<string, Map<string, number>>()
  const aliasCounts = new Map<string, number>()
  const disagreements: DuplicateDisagreement[] = []

  for (const record of records) {
    const sources = record.sourceVariants.length === 0 ? [record.field] : record.sourceVariants.map(({ field }) => field)
    const canonical = record.field
    const discarded: string[] = []
    for (const source of sources) {
      rawStrings.add(source)
      displayStrings.add(collapseWhitespace(source))
      const key = normalizeForSearch(source)
      keys.add(key)
      if (aliasKeys.has(key)) aliasCounts.set(key, (aliasCounts.get(key) ?? 0) + 1)
      let variants = variantsByField.get(record.fieldKey)
      if (variants === undefined) {
        variants = new Map()
        variantsByField.set(record.fieldKey, variants)
      }
      variants.set(source, (variants.get(source) ?? 0) + 1)
      if (classifyDifference(source, canonical, aliasKeys) === 'iný zápis') discarded.push(source)
    }
    if (discarded.length > 0) {
      disagreements.push({ name: record.name, appointedOn: record.appointedOn, retained: canonical, discarded })
    }
  }

  const labelByKey = new Map<string, string>()
  for (const record of records) labelByKey.set(record.fieldKey, catalog.labels[record.fieldKey] ?? record.field)

  const mergedSpellings: MergedSpelling[] = Array.from(variantsByField, ([fieldKey, variants]) => {
    const label = labelByKey.get(fieldKey) ?? fieldKey
    return {
      fieldKey,
      label,
      recordCount: Array.from(variants.values()).reduce((total, count) => total + count, 0),
      variants: Array.from(variants, ([variant, count]) => ({
        label: variant,
        count,
        difference: classifyDifference(variant, label, aliasKeys),
      })).sort((left, right) => right.count - left.count || slovakCollator.compare(left.label, right.label)),
    }
  })
    .filter(({ variants }) => variants.length > 1)
    .sort((left, right) => right.recordCount - left.recordCount || slovakCollator.compare(left.label, right.label))

  const recordsByKey = new Map<string, number>()
  for (const record of records) recordsByKey.set(record.fieldKey, (recordsByKey.get(record.fieldKey) ?? 0) + 1)
  const squashed = new Map<string, string[]>()
  for (const fieldKey of recordsByKey.keys()) {
    const group = squashed.get(squash(fieldKey))
    if (group === undefined) squashed.set(squash(fieldKey), [fieldKey])
    else group.push(fieldKey)
  }
  const unmergedCandidates: UnmergedCandidate[] = Array.from(squashed.values())
    .filter((group) => group.length > 1)
    .map((group) => ({
      labels: group.map((fieldKey) => labelByKey.get(fieldKey) ?? fieldKey).sort(slovakCollator.compare),
      recordCount: group.reduce((total, fieldKey) => total + (recordsByKey.get(fieldKey) ?? 0), 0),
    }))
    .sort((left, right) => right.recordCount - left.recordCount || slovakCollator.compare(left.labels[0] ?? '', right.labels[0] ?? ''))

  return {
    rawVariantCount: rawStrings.size,
    displayVariantCount: displayStrings.size,
    keyCount: keys.size,
    fieldCount: recordsByKey.size,
    aliases: catalog.aliases.map((alias) => ({ ...alias, recordCount: aliasCounts.get(alias.sourceKey) ?? 0 })),
    mergedSpellings,
    duplicateDisagreements: disagreements.sort(
      (left, right) => left.appointedOn.localeCompare(right.appointedOn) || slovakCollator.compare(left.name, right.name),
    ),
    unmergedCandidates,
  }
}
