import { prepareSearchIndex } from '../utils/search'
import type { AtlasData } from './types'

export const ATLAS_LOAD_MESSAGE =
  'Dáta sa teraz nedajú bezpečne zobraziť. Skúste stránku načítať znova.'
const SHA256 = /^[0-9a-f]{64}$/u
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/u

export class AtlasLoadError extends Error {
  constructor(cause: unknown) {
    super(ATLAS_LOAD_MESSAGE, { cause })
    this.name = 'AtlasLoadError'
  }
}

interface AtlasCandidate {
  meta?: Partial<Record<keyof AtlasData['meta'], unknown>>
  sources?: {
    professors?: Partial<Record<keyof AtlasData['sources']['professors'], unknown>>
    higher_education?: Partial<
      Record<keyof AtlasData['sources']['higher_education'], unknown>
    >
    population?: Partial<Record<keyof AtlasData['sources']['population'], unknown>>
  }
  records?: unknown
  institutions?: unknown
  affiliations?: unknown
  cities?: unknown
  presidents?: unknown
  context?: unknown
  fieldCatalog?: unknown
  fieldEducationComparison?: unknown
  geography?: { type?: unknown }
  editorialFacts?: {
    graduateThroughputPeak?: { statementSk?: unknown }
    appointmentGraduateRateMaximum?: { statementSk?: unknown }
    appointmentProfessorStockRateMaximum?: { statementSk?: unknown }
  }
}

function assertAtlasData(value: unknown): asserts value is AtlasData {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('Atlas payload is not an object')
  }
  const candidate = value as AtlasCandidate
  const rawCandidate = value as Record<string, unknown>
  if ('fieldGraduateComparison' in rawCandidate) {
    throw new TypeError('Atlas contains the retired field graduate comparison')
  }
  if (
    typeof candidate.sources !== 'object' ||
    candidate.sources === null ||
    Array.isArray(candidate.sources) ||
    Object.keys(candidate.sources).sort().join(',') !==
      ['higher_education', 'population', 'professors'].sort().join(',')
  ) {
    throw new TypeError('Atlas source set is invalid')
  }
  const meta = candidate.meta

  if (
    typeof meta !== 'object' ||
    meta === null ||
    Array.isArray(meta) ||
    meta.schemaVersion !== 1
  ) {
    throw new TypeError('Atlas schema version is not supported')
  }

  for (const key of [
    'sourceRowCount',
    'duplicateSourceRowCount',
    'analyticalAppointmentCount',
    'ceremonyCount',
  ] as const) {
    if (typeof meta[key] !== 'number' || !Number.isFinite(meta[key])) {
      throw new TypeError(`Atlas metadata ${key} is missing`)
    }
  }
  for (const key of ['appointmentDateMin', 'appointmentDateMax'] as const) {
    if (typeof meta[key] !== 'string' || meta[key].length === 0) {
      throw new TypeError(`Atlas metadata ${key} is missing`)
    }
  }

  for (const key of [
    'records',
    'institutions',
    'affiliations',
    'cities',
    'presidents',
    'context',
  ] as const) {
    if (!Array.isArray(candidate[key])) {
      throw new TypeError(`Atlas field ${key} is not an array`)
    }
  }

  const institutionIds = new Set<string>()
  for (const value of candidate.institutions as unknown[]) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new TypeError('Atlas institution is invalid')
    }
    const institution = value as Record<string, unknown>
    if (
      typeof institution.id !== 'string' ||
      institution.id.length === 0 ||
      institutionIds.has(institution.id)
    ) {
      throw new TypeError('Atlas institution id is invalid')
    }
    institutionIds.add(institution.id)
  }

  const affiliationsById = new Map<string, Record<string, unknown>>()
  for (const value of candidate.affiliations as unknown[]) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new TypeError('Atlas affiliation is invalid')
    }
    const affiliation = value as Record<string, unknown>
    const resolved = affiliation.status === 'resolved'
    const unresolved = affiliation.status === 'unresolved'
    if (
      typeof affiliation.id !== 'string' ||
      affiliation.id.length === 0 ||
      affiliationsById.has(affiliation.id) ||
      typeof affiliation.institutionId !== 'string' ||
      !institutionIds.has(affiliation.institutionId) ||
      !Array.isArray(affiliation.facultyKeys) ||
      !affiliation.facultyKeys.every(
        (facultyKey) => typeof facultyKey === 'string' && facultyKey.length > 0,
      ) ||
      (!resolved && !unresolved) ||
      typeof affiliation.sourceLabel !== 'string' ||
      affiliation.sourceLabel.length === 0 ||
      !(
        affiliation.note === null ||
        (typeof affiliation.note === 'string' && affiliation.note.length > 0)
      ) ||
      (resolved &&
        (typeof affiliation.city !== 'string' ||
          affiliation.city.length === 0 ||
          typeof affiliation.sourceUrl !== 'string' ||
          !/^https?:\/\//u.test(affiliation.sourceUrl))) ||
      (unresolved &&
        (affiliation.city !== null ||
          !(
            affiliation.sourceUrl === null ||
            (typeof affiliation.sourceUrl === 'string' &&
              /^https?:\/\//u.test(affiliation.sourceUrl))
          )))
    ) {
      throw new TypeError('Atlas affiliation fields are inconsistent')
    }
    affiliationsById.set(affiliation.id, affiliation)
  }

  const cityByAffiliationId = new Map<string, string>()
  const cityNames = new Set<string>()
  for (const value of candidate.cities as unknown[]) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new TypeError('Atlas city is invalid')
    }
    const city = value as Record<string, unknown>
    if (
      typeof city.name !== 'string' ||
      city.name.length === 0 ||
      cityNames.has(city.name) ||
      typeof city.latitude !== 'number' ||
      !Number.isFinite(city.latitude) ||
      city.latitude < -90 ||
      city.latitude > 90 ||
      typeof city.longitude !== 'number' ||
      !Number.isFinite(city.longitude) ||
      city.longitude < -180 ||
      city.longitude > 180 ||
      !Array.isArray(city.affiliationIds)
    ) {
      throw new TypeError('Atlas city fields are invalid')
    }
    cityNames.add(city.name)
    for (const affiliationId of city.affiliationIds) {
      const affiliation =
        typeof affiliationId === 'string' ? affiliationsById.get(affiliationId) : undefined
      if (
        affiliation === undefined ||
        affiliation.status !== 'resolved' ||
        affiliation.city !== city.name ||
        cityByAffiliationId.has(affiliationId)
      ) {
        throw new TypeError('Atlas city affiliation reference is invalid')
      }
      cityByAffiliationId.set(affiliationId, city.name)
    }
  }
  for (const [affiliationId, affiliation] of affiliationsById) {
    if (
      affiliation.status === 'resolved' &&
      cityByAffiliationId.get(affiliationId) !== affiliation.city
    ) {
      throw new TypeError('Atlas resolved affiliation is missing from its city')
    }
  }

  const fieldCatalog = candidate.fieldCatalog
  if (
    typeof fieldCatalog !== 'object' ||
    fieldCatalog === null ||
    Array.isArray(fieldCatalog)
  ) {
    throw new TypeError('Atlas field catalog is missing')
  }
  const fieldCatalogRecord = fieldCatalog as Record<string, unknown>
  if (
    fieldCatalogRecord.schemaVersion !== 1 ||
    !Array.isArray(fieldCatalogRecord.aliases) ||
    fieldCatalogRecord.aliases.length !== 13 ||
    typeof fieldCatalogRecord.labels !== 'object' ||
    fieldCatalogRecord.labels === null ||
    Array.isArray(fieldCatalogRecord.labels)
  ) {
    throw new TypeError('Atlas field catalog version is not supported')
  }
  const fieldLabels = fieldCatalogRecord.labels as Record<string, unknown>
  if (
    Object.keys(fieldLabels).length === 0 ||
    Object.entries(fieldLabels).some(
      ([key, label]) =>
        key.length === 0 || typeof label !== 'string' || label.trim().length === 0,
    )
  ) {
    throw new TypeError('Atlas field catalog labels are invalid')
  }
  const aliasSources = new Set<string>()
  for (const value of fieldCatalogRecord.aliases) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new TypeError('Atlas field alias is invalid')
    }
    const alias = value as Record<string, unknown>
    if (
      typeof alias.sourceLabel !== 'string' ||
      alias.sourceLabel.length === 0 ||
      typeof alias.sourceKey !== 'string' ||
      alias.sourceKey.length === 0 ||
      aliasSources.has(alias.sourceKey) ||
      typeof alias.targetLabel !== 'string' ||
      alias.targetLabel.length === 0 ||
      typeof alias.targetKey !== 'string' ||
      !(alias.targetKey in fieldLabels)
    ) {
      throw new TypeError('Atlas field alias fields are invalid')
    }
    aliasSources.add(alias.sourceKey)
  }

  for (const value of candidate.records as unknown[]) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new TypeError('Atlas record is invalid')
    }
    const record = value as Record<string, unknown>
    const affiliation =
      typeof record.affiliationId === 'string'
        ? affiliationsById.get(record.affiliationId)
        : undefined
    if (
      typeof record.institutionId !== 'string' ||
      !institutionIds.has(record.institutionId) ||
      affiliation === undefined ||
      affiliation.institutionId !== record.institutionId ||
      typeof record.field !== 'string' ||
      record.field.length === 0 ||
      typeof record.fieldKey !== 'string' ||
      !(record.fieldKey in fieldLabels)
    ) {
      throw new TypeError('Atlas record affiliation reference is invalid')
    }
  }

  for (const [label, source] of [
    ['professors', candidate.sources?.professors],
    ['higher_education', candidate.sources?.higher_education],
    ['population', candidate.sources?.population],
  ] as const) {
    if (
      typeof source !== 'object' ||
      source === null ||
      Array.isArray(source) ||
      typeof source.url !== 'string' ||
      source.url.length === 0 ||
      typeof source.sha256 !== 'string' ||
      !SHA256.test(source.sha256) ||
      typeof source.retrievedOn !== 'string' ||
      !ISO_DATE.test(source.retrievedOn)
    ) {
      throw new TypeError(`Atlas source ${label} is incomplete`)
    }
  }

  const populationSource = candidate.sources?.population
  if (
    typeof populationSource?.catalogUrl !== 'string' ||
    populationSource.catalogUrl.length === 0 ||
    typeof populationSource.denominatorDateConvention !== 'string' ||
    populationSource.denominatorDateConvention.length === 0
  ) {
    throw new TypeError('Atlas source population is incomplete')
  }

  const contextByYear = new Map<number, Record<string, unknown>>()
  for (const value of candidate.context as unknown[]) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new TypeError('Atlas context row is invalid')
    }
    const context = value as Record<string, unknown>
    if (
      typeof context.year !== 'number' ||
      !Number.isInteger(context.year) ||
      contextByYear.has(context.year) ||
      typeof context.students !== 'number' ||
      !Number.isInteger(context.students) ||
      context.students < 0 ||
      typeof context.graduates !== 'number' ||
      !Number.isInteger(context.graduates) ||
      context.graduates < 0 ||
      typeof context.population !== 'number' ||
      !Number.isInteger(context.population) ||
      context.population <= 0 ||
      typeof context.appointmentsPerMillionResidents !== 'number' ||
      !Number.isFinite(context.appointmentsPerMillionResidents) ||
      context.appointmentsPerMillionResidents < 0 ||
      typeof context.professorsPer100kResidents !== 'number' ||
      !Number.isFinite(context.professorsPer100kResidents) ||
      context.professorsPer100kResidents < 0
    ) {
      throw new TypeError('Atlas context population metrics are invalid')
    }
    contextByYear.set(context.year, context)
  }


  const comparison = candidate.fieldEducationComparison
  if (
    typeof comparison !== 'object' ||
    comparison === null ||
    Array.isArray(comparison)
  ) {
    throw new TypeError('Atlas field education comparison is missing')
  }
  const comparisonRecord = comparison as Record<string, unknown>
  if (
    comparisonRecord.schemaVersion !== 2 ||
    comparisonRecord.startYear !== 2009 ||
    comparisonRecord.endYear !== 2025 ||
    typeof comparisonRecord.catalogUrl !== 'string' ||
    comparisonRecord.catalogUrl.length === 0 ||
    Object.keys(comparisonRecord).sort().join(',') !==
      [
        'catalogUrl',
        'currentStudentsSource',
        'endYear',
        'graduateSources',
        'rows',
        'schemaVersion',
        'startYear',
        'years',
      ].sort().join(',')
  ) {
    throw new TypeError('Atlas field education comparison version is not supported')
  }
  if (
    !Array.isArray(comparisonRecord.graduateSources) ||
    !Array.isArray(comparisonRecord.years) ||
    !Array.isArray(comparisonRecord.rows) ||
    comparisonRecord.graduateSources.length !== 17 ||
    comparisonRecord.years.length !== 17
  ) {
    throw new TypeError('Atlas field education annual arrays are incomplete')
  }

  for (let index = 0; index < 17; index += 1) {
    const expectedYear = 2009 + index
    const sourceValue = comparisonRecord.graduateSources[index]
    if (
      typeof sourceValue !== 'object' ||
      sourceValue === null ||
      Array.isArray(sourceValue)
    ) {
      throw new TypeError(`Atlas graduate source ${expectedYear} is invalid`)
    }
    const source = sourceValue as Record<string, unknown>
    if (
      source.year !== expectedYear ||
      typeof source.url !== 'string' ||
      source.url.length === 0 ||
      typeof source.sha256 !== 'string' ||
      !SHA256.test(source.sha256) ||
      typeof source.retrievedOn !== 'string' ||
      !ISO_DATE.test(source.retrievedOn) ||
      source.localPath !== `graduates-by-field/${expectedYear}.xls` ||
      (expectedYear < 2025
        ? typeof source.archiveMember !== 'string' || source.archiveMember.length === 0
        : source.archiveMember !== null)
    ) {
      throw new TypeError(`Atlas graduate source ${expectedYear} is incomplete`)
    }

    const metadataValue = comparisonRecord.years[index]
    if (
      typeof metadataValue !== 'object' ||
      metadataValue === null ||
      Array.isArray(metadataValue)
    ) {
      throw new TypeError(`Atlas field education year ${expectedYear} is invalid`)
    }
    const metadata = metadataValue as Record<string, unknown>
    const context = contextByYear.get(expectedYear)
    if (
      metadata.year !== expectedYear ||
      typeof metadata.programRowCount !== 'number' ||
      !Number.isInteger(metadata.programRowCount) ||
      metadata.programRowCount <= 0 ||
      typeof metadata.nationalGraduateCount !== 'number' ||
      !Number.isInteger(metadata.nationalGraduateCount) ||
      metadata.nationalGraduateCount < 0 ||
      metadata.nationalGraduateCount !== context?.graduates
    ) {
      throw new TypeError(`Atlas field education year ${expectedYear} is inconsistent`)
    }
  }

  const currentSourceValue = comparisonRecord.currentStudentsSource
  if (
    typeof currentSourceValue !== 'object' ||
    currentSourceValue === null ||
    Array.isArray(currentSourceValue)
  ) {
    throw new TypeError('Atlas current-student source is invalid')
  }
  const currentSource = currentSourceValue as Record<string, unknown>
  if (
    currentSource.year !== 2025 ||
    currentSource.archiveMember !== null ||
    currentSource.localPath !== 'current-students-by-field-2025.xls' ||
    typeof currentSource.url !== 'string' ||
    currentSource.url.length === 0 ||
    typeof currentSource.sha256 !== 'string' ||
    !SHA256.test(currentSource.sha256) ||
    typeof currentSource.retrievedOn !== 'string' ||
    !ISO_DATE.test(currentSource.retrievedOn)
  ) {
    throw new TypeError('Atlas current-student source is incomplete')
  }

  const comparisonFieldKeys = new Set<string>()
  for (const value of comparisonRecord.rows) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new TypeError('Atlas field education row is invalid')
    }
    const row = value as Record<string, unknown>
    const fieldKey = row.fieldKey
    if (
      typeof fieldKey !== 'string' ||
      comparisonFieldKeys.has(fieldKey) ||
      !(fieldKey in fieldLabels) ||
      row.canonicalLabel !== fieldLabels[fieldKey] ||
      !Array.isArray(row.graduateCounts) ||
      row.graduateCounts.length !== 17 ||
      row.graduateCounts.some(
        (count) =>
          count !== null &&
          (typeof count !== 'number' || !Number.isInteger(count) || count < 0),
      ) ||
      !(
        row.currentStudentCount === null ||
        (typeof row.currentStudentCount === 'number' &&
          Number.isInteger(row.currentStudentCount) &&
          row.currentStudentCount >= 0)
      )
    ) {
      throw new TypeError('Atlas field education row is inconsistent')
    }
    comparisonFieldKeys.add(fieldKey)
  }
  if (
    comparisonFieldKeys.size !== Object.keys(fieldLabels).length ||
    Object.keys(fieldLabels).some((fieldKey) => !comparisonFieldKeys.has(fieldKey))
  ) {
    throw new TypeError('Atlas field education rows do not cover the reviewed catalog')
  }

  if (
    typeof candidate.geography !== 'object' ||
    candidate.geography === null ||
    candidate.geography.type !== 'Feature'
  ) {
    throw new TypeError('Atlas geography is missing')
  }

  for (const [label, fact] of [
    ['graduateThroughputPeak', candidate.editorialFacts?.graduateThroughputPeak],
    [
      'appointmentGraduateRateMaximum',
      candidate.editorialFacts?.appointmentGraduateRateMaximum,
    ],
    [
      'appointmentProfessorStockRateMaximum',
      candidate.editorialFacts?.appointmentProfessorStockRateMaximum,
    ],
  ] as const) {
    if (
      typeof fact !== 'object' ||
      fact === null ||
      typeof fact.statementSk !== 'string' ||
      fact.statementSk.length === 0
    ) {
      throw new TypeError(`Atlas editorial fact ${label} is incomplete`)
    }
  }
}

export async function loadAtlas(signal?: AbortSignal): Promise<AtlasData> {
  try {
    const atlasUrl = new URL(
      'data/atlas.json',
      new URL(import.meta.env.BASE_URL, window.location.href),
    )
    const response = await fetch(atlasUrl, { signal })
    if (!response.ok) {
      throw new Error(`Atlas request returned HTTP ${response.status}`)
    }

    const payload: unknown = await response.json()
    assertAtlasData(payload)
    prepareSearchIndex(payload.records)
    return payload
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') {
      throw cause
    }

    const error = new AtlasLoadError(cause)
    console.error('Načítanie atlasu zlyhalo.', cause)
    throw error
  }
}
