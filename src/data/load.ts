import { prepareSearchIndex } from '../utils/search'
import type { AtlasData } from './types'

export const ATLAS_LOAD_MESSAGE =
  'Dáta sa teraz nedajú bezpečne zobraziť. Skúste stránku načítať znova.'

// `atlas.json` is produced by this repo's own pipeline, whose AtlasBuildError
// checks and pytest suite both run before the bundle is built. What survives here
// is what the browser alone can hit: a payload that never parsed, or a stale
// atlas.json served from cache beside a newer bundle.
function assertAtlasData(value: unknown): asserts value is AtlasData {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('Atlas payload is not an object')
  }

  const candidate = value as Partial<AtlasData>
  if (candidate.meta?.schemaVersion !== 1) {
    throw new TypeError('Atlas schema version is not supported')
  }
  if (candidate.fieldEducationComparison?.schemaVersion !== 2) {
    throw new TypeError('Atlas field education comparison version is not supported')
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

  if (
    typeof candidate.sources?.population !== 'object' ||
    candidate.sources.population === null ||
    typeof candidate.fieldCatalog?.labels !== 'object' ||
    candidate.fieldCatalog.labels === null ||
    candidate.geography?.type !== 'Feature'
  ) {
    throw new TypeError('Atlas payload is missing a required section')
  }

  // The pipeline divides by this to produce the per-capita rates it ships, so a
  // non-positive value means those shipped numbers are meaningless.
  if (candidate.context?.some(({ population }) => !(population > 0))) {
    throw new TypeError('Atlas context population metrics are invalid')
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
    if (!(cause instanceof DOMException && cause.name === 'AbortError')) {
      console.error('Načítanie atlasu zlyhalo.', cause)
    }
    throw cause
  }
}
