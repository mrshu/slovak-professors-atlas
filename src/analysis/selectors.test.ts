import { describe, expect, it } from 'vitest'

import type { Appointment, AtlasData, Institution, President } from '../data/types'
import type { FilterState } from '../state/filters'
import {
  academicBreadth,
  ceremonyCadence,
  ceremonyCounts,
  cityCounts,
  facultyCounts,
  filterAppointments,
  institutionConcentration,
  institutionRanking,
  presidentialEraProfiles,
  yearCounts,
} from './selectors'

const institutions: Institution[] = [
  {
    id: 'uniba',
    shortName: 'UK v Bratislave',
    fullName: 'Univerzita Komenského v Bratislave',
    city: 'Bratislava',
    latitude: 48.15,
    longitude: 17.11,
    sourceLabels: ['UK v Bratislave'],
    citationUrl: 'https://example.test/uniba',
  },
  {
    id: 'tuke',
    shortName: 'TU v Košiciach',
    fullName: 'Technická univerzita v Košiciach',
    city: 'Košice',
    latitude: 48.72,
    longitude: 21.25,
    sourceLabels: ['TU v Košiciach'],
    citationUrl: 'https://example.test/tuke',
  },
  {
    id: 'aku',
    shortName: 'Akadémia umení',
    fullName: 'Akadémia umení v Banskej Bystrici',
    city: 'Banská Bystrica',
    latitude: 48.74,
    longitude: 19.15,
    sourceLabels: ['Akadémia umení'],
    citationUrl: 'https://example.test/aku',
  },
]

const presidents: President[] = [
  {
    id: 'later',
    name: 'Neskoršie obdobie',
    from: '2024-06-15',
    to: null,
    citationUrl: 'https://example.test/later',
  },
  {
    id: 'earlier',
    name: 'Skoršie obdobie',
    from: '2019-06-15',
    to: '2024-06-15',
    citationUrl: 'https://example.test/earlier',
  },
]

function record(overrides: Partial<Appointment> & Pick<Appointment, 'id'>): Appointment {
  return {
    name: 'Zuzana Čaputová',
    titlesBefore: null,
    titlesAfter: null,
    faculty: 'Lekárska fakulta',
    institutionId: 'uniba',
    institutionSource: 'UK v Bratislave',
    field: 'vnútorné lekárstvo',
    appointedOn: '2023-05-12',
    presidentId: 'caputova',
    sourceVariants: [],
    ...overrides,
  }
}

const records: Appointment[] = [
  record({ id: 'match' }),
  record({
    id: 'other-year',
    name: 'Ján Novák',
    appointedOn: '2022-05-12',
    field: 'chirurgia',
  }),
  record({
    id: 'other-city',
    name: 'Mária Šimková',
    faculty: 'Strojnícka fakulta',
    institutionId: 'tuke',
    institutionSource: 'TU v Košiciach',
    field: 'strojárstvo',
  }),
  record({
    id: 'other-president',
    name: 'Ábel Žitný',
    presidentId: 'kiska',
    institutionId: 'aku',
    institutionSource: 'Akadémia umení',
    faculty: 'Fakulta múzických umení',
    field: 'hudobné umenie',
  }),
]

const data = {
  records,
  institutions,
} as AtlasData

const allFilters: FilterState = {
  startYear: 2023,
  endYear: 2023,
  presidentId: 'caputova',
  city: 'Bratislava',
  institutionId: 'uniba',
  faculty: 'Lekárska fakulta',
  field: 'vnútorné lekárstvo',
  query: 'Caputova',
  selectedYear: 2023,
}

describe('filterAppointments', () => {
  it('intersects every active analytical filter dimension', () => {
    expect(filterAppointments(data, allFilters).map(({ id }) => id)).toEqual(['match'])
  })

  it.each([
    [
      'inclusive date bounds',
      { startYear: 2023, endYear: 2023 },
      ['match', 'other-city', 'other-president'],
    ],
    ['president', { presidentId: 'kiska' }, ['other-president']],
    ['city resolved from the canonical institution', { city: 'Košice' }, ['other-city']],
    ['canonical institution', { institutionId: 'aku' }, ['other-president']],
    ['source faculty', { faculty: 'Strojnícka fakulta' }, ['other-city']],
    ['raw field', { field: 'chirurgia' }, ['other-year']],
    ['normalized query', { query: 'Simkova' }, ['other-city']],
  ] satisfies ReadonlyArray<[string, Partial<FilterState>, string[]]>)(
    'applies the %s dimension independently',
    (_dimension, activeFilter, expectedIds) => {
      const neutralFilters: FilterState = {
        startYear: 2000,
        endYear: 2026,
        presidentId: null,
        city: null,
        institutionId: null,
        faculty: null,
        field: null,
        query: '',
        selectedYear: 2025,
      }

      expect(
        filterAppointments(data, { ...neutralFilters, ...activeFilter }).map(({ id }) => id),
      ).toEqual(expectedIds)
    },
  )

  it('matches canonical institution display text while preserving the source label', () => {
    const filters = { ...allFilters, query: 'Univerzita Komenskeho' }
    const before = records[0]?.institutionSource

    expect(filterAppointments(data, filters).map(({ id }) => id)).toEqual(['match'])
    expect(records[0]?.institutionSource).toBe(before)
  })

  it('returns the original record order when only default bounds are active', () => {
    const filters: FilterState = {
      startYear: 2000,
      endYear: 2026,
      presidentId: null,
      city: null,
      institutionId: null,
      faculty: null,
      field: null,
      query: '',
      selectedYear: 2025,
    }

    expect(filterAppointments(data, filters).map(({ id }) => id)).toEqual(records.map(({ id }) => id))
  })
})

describe('deterministic aggregate selectors', () => {
  it('sorts institution ties by Slovak display label after descending counts', () => {
    const ranked = institutionRanking(
      [
        record({ id: 'u1' }),
        record({ id: 'u2' }),
        record({ id: 't1', institutionId: 'tuke' }),
        record({ id: 'a1', institutionId: 'aku' }),
      ],
      institutions,
    )

    expect(ranked).toEqual([
      { institutionId: 'uniba', name: 'UK v Bratislave', count: 2 },
      { institutionId: 'aku', name: 'Akadémia umení', count: 1 },
      { institutionId: 'tuke', name: 'TU v Košiciach', count: 1 },
    ])
  })

  it('returns independently sorted city, faculty, year, and ceremony counts', () => {
    const cohort = [
      record({ id: 'u1', appointedOn: '2023-01-10' }),
      record({ id: 'u2', appointedOn: '2023-01-10' }),
      record({
        id: 't1',
        institutionId: 'tuke',
        faculty: null,
        appointedOn: '2022-02-20',
      }),
    ]

    expect(cityCounts(cohort, institutions)).toEqual([
      { city: 'Bratislava', count: 2 },
      { city: 'Košice', count: 1 },
    ])
    expect(facultyCounts(cohort)).toEqual([{ faculty: 'Lekárska fakulta', count: 2 }])
    expect(yearCounts(cohort)).toEqual([
      { year: 2022, count: 1 },
      { year: 2023, count: 2 },
    ])
    expect(ceremonyCounts(cohort)).toEqual([
      { appointedOn: '2022-02-20', count: 1 },
      { appointedOn: '2023-01-10', count: 2 },
    ])
  })

  it('derives Task 7 cadence, breadth, and top-three concentration from one cohort', () => {
    const cohort = [
      record({ id: 'u1', appointedOn: '2023-01-01' }),
      record({ id: 'u2', appointedOn: '2023-01-01' }),
      record({ id: 't1', institutionId: 'tuke', faculty: null, appointedOn: '2023-01-11' }),
      record({ id: 'a1', institutionId: 'aku', faculty: 'Fakulta umení', appointedOn: '2023-01-31' }),
    ]

    expect(ceremonyCadence(cohort)).toEqual({
      ceremonyCount: 3,
      medianBatchSize: 1,
      largestBatchSize: 2,
      medianElapsedDays: 15,
    })
    expect(academicBreadth(cohort, institutions)).toEqual({
      cityCount: 3,
      institutionCount: 3,
      facultyCount: 2,
    })
    expect(institutionConcentration(cohort, institutions)).toEqual({
      totalCount: 4,
      topThreeCount: 4,
      topThreeShare: 1,
      leadingInstitutionId: 'uniba',
      leadingInstitutionName: 'UK v Bratislave',
      leadingInstitutionCount: 2,
    })
  })

  it('excludes empty, whitespace-only, and null faculties from aggregation and breadth', () => {
    const cohort = [
      record({ id: 'named', faculty: 'Lekárska fakulta' }),
      record({ id: 'empty', faculty: '' }),
      record({ id: 'whitespace', faculty: '   ' }),
      record({ id: 'null', faculty: null }),
    ]

    expect(facultyCounts(cohort)).toEqual([{ faculty: 'Lekárska fakulta', count: 1 }])
    expect(academicBreadth(cohort, institutions).facultyCount).toBe(1)
  })

  it('orders represented presidential eras by official start and resolves leader ties by Slovak label', () => {
    const cohort = [
      record({ id: 'later-tuke', presidentId: 'later', institutionId: 'tuke' }),
      record({ id: 'later-aku', presidentId: 'later', institutionId: 'aku' }),
      record({ id: 'earlier-u', presidentId: 'earlier', institutionId: 'uniba' }),
    ]

    expect(presidentialEraProfiles(cohort, institutions, presidents)).toEqual([
      {
        presidentId: 'earlier',
        presidentName: 'Skoršie obdobie',
        from: '2019-06-15',
        to: '2024-06-15',
        leadingInstitutionId: 'uniba',
        leadingInstitutionName: 'UK v Bratislave',
        cityCount: 1,
        institutionCount: 1,
        facultyCount: 1,
        topThreeShare: 1,
      },
      {
        presidentId: 'later',
        presidentName: 'Neskoršie obdobie',
        from: '2024-06-15',
        to: null,
        leadingInstitutionId: 'aku',
        leadingInstitutionName: 'Akadémia umení',
        cityCount: 2,
        institutionCount: 2,
        facultyCount: 1,
        topThreeShare: 1,
      },
    ])
  })

  it('counts only distinct nonblank named faculties and computes each era top-three share', () => {
    const cohort = [
      record({
        id: 'u1',
        presidentId: 'earlier',
        institutionId: 'uniba',
        faculty: 'Fakulta A',
      }),
      record({
        id: 'u2',
        presidentId: 'earlier',
        institutionId: 'uniba',
        faculty: 'Fakulta A',
      }),
      record({ id: 't1', presidentId: 'earlier', institutionId: 'tuke', faculty: '' }),
      record({ id: 'a1', presidentId: 'earlier', institutionId: 'aku', faculty: '   ' }),
      record({ id: 'x1', presidentId: 'earlier', institutionId: 'stvrta', faculty: null }),
    ]
    const expandedInstitutions = [
      ...institutions,
      {
        ...institutions[0]!,
        id: 'stvrta',
        shortName: 'Žilinská univerzita',
        fullName: 'Žilinská univerzita v Žiline',
        city: 'Žilina',
      },
    ]

    expect(presidentialEraProfiles(cohort, expandedInstitutions, presidents)[0]).toMatchObject({
      facultyCount: 1,
      cityCount: 4,
      institutionCount: 4,
      topThreeShare: 0.8,
    })
  })

  it('uses the already-filtered cohort, omits unrepresented terms, and defines empty output', () => {
    const eraData = {
      records: [
        record({ id: 'earlier', presidentId: 'earlier', appointedOn: '2023-05-12' }),
        record({ id: 'later', presidentId: 'later', appointedOn: '2025-05-12' }),
      ],
      institutions,
    } as AtlasData
    const laterOnly = filterAppointments(eraData, {
      ...allFilters,
      startYear: 2025,
      endYear: 2025,
      presidentId: 'later',
      city: null,
      institutionId: null,
      faculty: null,
      field: null,
      query: '',
      selectedYear: 2025,
    })

    expect(
      presidentialEraProfiles(laterOnly, institutions, presidents).map(
        ({ presidentId }) => presidentId,
      ),
    ).toEqual(['later'])
    expect(presidentialEraProfiles([], institutions, presidents)).toEqual([])
  })

  it('never mutates record or institution source arrays', () => {
    const beforeRecords = structuredClone(records)
    const beforeInstitutions = structuredClone(institutions)

    filterAppointments(data, allFilters)
    institutionRanking(records, institutions)
    cityCounts(records, institutions)
    yearCounts(records)
    ceremonyCadence(records)
    academicBreadth(records, institutions)
    institutionConcentration(records, institutions)

    expect(records).toEqual(beforeRecords)
    expect(institutions).toEqual(beforeInstitutions)
  })
})
