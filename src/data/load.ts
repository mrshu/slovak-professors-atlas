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
  }
  records?: unknown
  institutions?: unknown
  cities?: unknown
  presidents?: unknown
  context?: unknown
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
