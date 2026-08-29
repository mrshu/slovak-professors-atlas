import { prepareSearchIndex } from '../utils/search'
import type { AtlasData } from './types'

export const ATLAS_LOAD_MESSAGE =
  'Dáta sa teraz nedajú bezpečne zobraziť. Skúste stránku načítať znova.'

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
    graduates_by_field_2025?: Partial<
      Record<keyof AtlasData['sources']['graduates_by_field_2025'], unknown>
    >
    population?: Partial<Record<keyof AtlasData['sources']['population'], unknown>>
  }
  records?: unknown
  institutions?: unknown
  cities?: unknown
  presidents?: unknown
  context?: unknown
  fieldGraduateComparison?: unknown
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

  for (const key of ['records', 'institutions', 'cities', 'presidents', 'context'] as const) {
    if (!Array.isArray(candidate[key])) {
      throw new TypeError(`Atlas field ${key} is not an array`)
    }
  }

  for (const [label, source] of [
    ['professors', candidate.sources?.professors],
    ['higher_education', candidate.sources?.higher_education],
    ['graduates_by_field_2025', candidate.sources?.graduates_by_field_2025],
    ['population', candidate.sources?.population],
  ] as const) {
    if (
      typeof source !== 'object' ||
      source === null ||
      Array.isArray(source) ||
      typeof source.url !== 'string' ||
      source.url.length === 0 ||
      typeof source.sha256 !== 'string' ||
      source.sha256.length === 0 ||
      typeof source.retrievedOn !== 'string' ||
      source.retrievedOn.length === 0
    ) {
      throw new TypeError(`Atlas source ${label} is incomplete`)
    }
  }

  const graduateSource = candidate.sources?.graduates_by_field_2025
  if (
    typeof graduateSource?.catalogUrl !== 'string' ||
    graduateSource.catalogUrl.length === 0
  ) {
    throw new TypeError('Atlas source graduates_by_field_2025 is incomplete')
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

  for (const value of candidate.context as unknown[]) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new TypeError('Atlas context row is invalid')
    }
    const context = value as Record<string, unknown>
    if (
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
  }


  const comparison = candidate.fieldGraduateComparison
  if (typeof comparison !== 'object' || comparison === null || Array.isArray(comparison)) {
    throw new TypeError('Atlas field graduate comparison is missing')
  }
  const comparisonRecord = comparison as Record<string, unknown>
  if (comparisonRecord.schemaVersion !== 1 || comparisonRecord.year !== 2025) {
    throw new TypeError('Atlas field graduate comparison version is not supported')
  }

  for (const key of [
    'appointmentCount',
    'matchedAppointmentCount',
    'distinctFieldCount',
    'matchedDistinctFieldCount',
  ] as const) {
    const count = comparisonRecord[key]
    if (typeof count !== 'number' || !Number.isInteger(count) || count < 0) {
      throw new TypeError(`Atlas field graduate comparison ${key} is invalid`)
    }
  }
  if (
    typeof comparisonRecord.matchedAppointmentShare !== 'number' ||
    !Number.isFinite(comparisonRecord.matchedAppointmentShare) ||
    comparisonRecord.matchedAppointmentShare < 0 ||
    comparisonRecord.matchedAppointmentShare > 100
  ) {
    throw new TypeError('Atlas field graduate comparison coverage is invalid')
  }

  const comparisonSource = comparisonRecord.source
  if (
    typeof comparisonSource !== 'object' ||
    comparisonSource === null ||
    Array.isArray(comparisonSource)
  ) {
    throw new TypeError('Atlas field graduate comparison source is missing')
  }
  for (const key of ['url', 'catalogUrl', 'sha256', 'retrievedOn'] as const) {
    if (
      typeof (comparisonSource as Record<string, unknown>)[key] !== 'string' ||
      ((comparisonSource as Record<string, string>)[key]?.length ?? 0) === 0
    ) {
      throw new TypeError(`Atlas field graduate comparison source ${key} is missing`)
    }
  }

  if (!Array.isArray(comparisonRecord.rows)) {
    throw new TypeError('Atlas field graduate comparison rows are missing')
  }
  let appointmentCount = 0
  let matchedAppointmentCount = 0
  let matchedDistinctFieldCount = 0
  for (const value of comparisonRecord.rows) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new TypeError('Atlas field graduate comparison row is invalid')
    }
    const row = value as Record<string, unknown>
    if (
      typeof row.field !== 'string' ||
      row.field.trim().length === 0 ||
      typeof row.appointmentCount !== 'number' ||
      !Number.isInteger(row.appointmentCount) ||
      row.appointmentCount <= 0
    ) {
      throw new TypeError('Atlas field graduate comparison row is incomplete')
    }

    const exact = row.matchStatus === 'exact'
    const unmatched = row.matchStatus === 'unmatched'
    if (
      (!exact && !unmatched) ||
      (exact &&
        (typeof row.graduateCount !== 'number' ||
          !Number.isInteger(row.graduateCount) ||
          row.graduateCount < 0 ||
          typeof row.graduatesPerAppointment !== 'number' ||
          !Number.isFinite(row.graduatesPerAppointment) ||
          row.graduatesPerAppointment < 0)) ||
      (unmatched && (row.graduateCount !== null || row.graduatesPerAppointment !== null))
    ) {
      throw new TypeError('Atlas field graduate comparison row match is inconsistent')
    }

    appointmentCount += row.appointmentCount
    if (exact) {
      matchedAppointmentCount += row.appointmentCount
      matchedDistinctFieldCount += 1
    }
  }
  if (
    appointmentCount !== comparisonRecord.appointmentCount ||
    matchedAppointmentCount !== comparisonRecord.matchedAppointmentCount ||
    comparisonRecord.rows.length !== comparisonRecord.distinctFieldCount ||
    matchedDistinctFieldCount !== comparisonRecord.matchedDistinctFieldCount
  ) {
    throw new TypeError('Atlas field graduate comparison totals are inconsistent')
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
