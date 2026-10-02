import { describe, expect, it } from 'vitest'

import type { Affiliation, Appointment, AtlasData, Institution } from '../data/types'
import type { FilterState } from '../state/filters'
import {
  ceremonyCounts,
  cityCounts,
  cityFieldRanking,
  fieldAppointmentRanking,
  facultyDistribution,
  filterAppointments,
  institutionRanking,
  yearCounts,
} from './selectors'
import { normalizeForSearch } from '../utils/search'

const institutions: Institution[] = [
  {
    id: 'uniba',
    shortName: 'UK v Bratislave',
    fullName: 'Univerzita Komenského v Bratislave',
    sourceLabels: ['UK v Bratislave'],
    citationUrl: 'https://example.test/uniba',
  },
  {
    id: 'tuke',
    shortName: 'TU v Košiciach',
    fullName: 'Technická univerzita v Košiciach',
    sourceLabels: ['TU v Košiciach'],
    citationUrl: 'https://example.test/tuke',
  },
  {
    id: 'aku',
    shortName: 'Akadémia umení',
    fullName: 'Akadémia umení v Banskej Bystrici',
    sourceLabels: ['Akadémia umení'],
    citationUrl: 'https://example.test/aku',
  },
  {
    id: 'vszasp',
    shortName: 'VŠZaSP',
    fullName: 'Vysoká škola zdravotníctva a sociálnej práce sv. Alžbety',
    sourceLabels: ['VŠZaSP'],
    citationUrl: 'https://www.vssvalzbety.sk/',
  },
]
const affiliations: Affiliation[] = [
  {
    id: 'uniba-default',
    institutionId: 'uniba',
    facultyKeys: [],
    status: 'resolved',
    city: 'Bratislava',
    sourceUrl: 'https://uniba.sk/',
    sourceLabel: 'UK',
    note: null,
  },
  {
    id: 'uniba-jlf',
    institutionId: 'uniba',
    facultyKeys: ['jesseniova lekarska fakulta'],
    status: 'resolved',
    city: 'Martin',
    sourceUrl: 'https://www.jfmed.uniba.sk/',
    sourceLabel: 'JLF UK',
    note: null,
  },
  {
    id: 'tuke-default',
    institutionId: 'tuke',
    facultyKeys: [],
    status: 'resolved',
    city: 'Košice',
    sourceUrl: 'https://www.tuke.sk/',
    sourceLabel: 'TUKE',
    note: null,
  },
  {
    id: 'tuke-fvt',
    institutionId: 'tuke',
    facultyKeys: ['fakulta vyrobnych technologii'],
    status: 'resolved',
    city: 'Prešov',
    sourceUrl: 'https://fvt.tuke.sk/',
    sourceLabel: 'FVT TUKE',
    note: null,
  },
  {
    id: 'aku-default',
    institutionId: 'aku',
    facultyKeys: [],
    status: 'resolved',
    city: 'Banská Bystrica',
    sourceUrl: 'https://aku.sk/',
    sourceLabel: 'Akadémia umení',
    note: null,
  },
  {
    id: 'vszasp-unresolved',
    institutionId: 'vszasp',
    facultyKeys: [],
    status: 'unresolved',
    city: null,
    sourceUrl: null,
    sourceLabel: 'VŠZaSP',
    note: 'Viac pracovísk',
  },
]

function record(overrides: Partial<Appointment> & Pick<Appointment, 'id'>): Appointment {
  const field = overrides.field ?? 'vnútorné lekárstvo'
  return {
    name: 'Zuzana Čaputová',
    titlesBefore: null,
    titlesAfter: null,
    faculty: 'Lekárska fakulta',
    institutionId: 'uniba',
    institutionSource: 'UK v Bratislave',
    field,
    fieldKey: overrides.fieldKey ?? normalizeForSearch(field),
    appointedOn: '2023-05-12',
    presidentId: 'caputova',
    sourceVariants: [],
    ...overrides,
    affiliationId:
      overrides.affiliationId ?? `${overrides.institutionId ?? 'uniba'}-default`,
  }
}

function fieldLabels(items: readonly Appointment[]): Record<string, string> {
  return Object.fromEntries(items.map(({ fieldKey, field }) => [fieldKey, field.trim()]))
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
    affiliationId: 'tuke-default',
    institutionSource: 'TU v Košiciach',
    field: 'strojárstvo',
  }),
  record({
    id: 'other-president',
    name: 'Ábel Žitný',
    presidentId: 'kiska',
    institutionId: 'aku',
    affiliationId: 'aku-default',
    institutionSource: 'Akadémia umení',
    faculty: 'Fakulta múzických umení',
    field: 'hudobné umenie',
  }),
]

const data = {
  records,
  institutions,
  affiliations,
} as AtlasData

const allFilters: FilterState = {
  startYear: 2023,
  endYear: 2023,
  fieldStartYear: 2009,
  fieldEndYear: 2025,
  presidentId: 'caputova',
  city: 'Bratislava',
  institutionId: 'uniba',
  faculty: 'Lekárska fakulta',
  field: 'vnutorne lekarstvo',
  appointedOn: null,
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
    ['city resolved from the record affiliation', { city: 'Košice' }, ['other-city']],
    ['canonical institution', { institutionId: 'aku' }, ['other-president']],
    ['source faculty', { faculty: 'Strojnícka fakulta' }, ['other-city']],
    ['normalized field key', { field: 'chirurgia' }, ['other-year']],
    ['normalized query', { query: 'Simkova' }, ['other-city']],
    ['ceremony date', { appointedOn: '2022-05-12' }, ['other-year']],
  ] satisfies ReadonlyArray<[string, Partial<FilterState>, string[]]>)(
    'applies the %s dimension independently',
    (_dimension, activeFilter, expectedIds) => {
      const neutralFilters: FilterState = {
        startYear: 2000,
        endYear: 2026,
        fieldStartYear: 2009,
        fieldEndYear: 2025,
        presidentId: null,
        city: null,
        institutionId: null,
        faculty: null,
        field: null,
        appointedOn: null,
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
      fieldStartYear: 2009,
      fieldEndYear: 2025,
      presidentId: null,
      city: null,
      institutionId: null,
      faculty: null,
      field: null,
      appointedOn: null,
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
        affiliationId: 'tuke-default',
        faculty: null,
        appointedOn: '2022-02-20',
      }),
    ]

    expect(cityCounts(cohort, affiliations)).toEqual([
      { city: 'Bratislava', count: 2 },
      { city: 'Košice', count: 1 },
    ])
    expect(facultyDistribution(cohort)).toEqual([
      { faculty: 'Lekárska fakulta', count: 2 },
      { faculty: 'neuvedené', count: 1 },
    ])
    expect(yearCounts(cohort)).toEqual([
      { year: 2022, count: 1 },
      { year: 2023, count: 2 },
    ])
    expect(ceremonyCounts(cohort)).toEqual([
      { appointedOn: '2022-02-20', count: 1 },
      { appointedOn: '2023-01-10', count: 2 },
    ])
  })

  it('uses faculty affiliations and excludes unresolved locations without dropping records', () => {
    const cohort = [
      record({
        id: 'jlf',
        faculty: 'Jesseniova lekárska fakulta',
        affiliationId: 'uniba-jlf',
      }),
      record({
        id: 'fvt',
        institutionId: 'tuke',
        faculty: 'Fakulta výrobných technológií',
        affiliationId: 'tuke-fvt',
      }),
      record({
        id: 'vszasp',
        institutionId: 'vszasp',
        institutionSource: 'VŠZaSP',
        affiliationId: 'vszasp-unresolved',
      }),
    ]

    expect(cityCounts(cohort, affiliations)).toEqual([
      { city: 'Martin', count: 1 },
      { city: 'Prešov', count: 1 },
    ])
    expect(cohort).toHaveLength(3)
  })

  it('buckets empty, whitespace-only, and null faculties as unstated', () => {
    const cohort = [
      record({ id: 'named', faculty: 'Lekárska fakulta' }),
      record({ id: 'empty', faculty: '' }),
      record({ id: 'whitespace', faculty: '   ' }),
      record({ id: 'null', faculty: null }),
    ]

    expect(facultyDistribution(cohort)).toEqual([
      { faculty: 'neuvedené', count: 3 },
      { faculty: 'Lekárska fakulta', count: 1 },
    ])
  })

  it('groups all-time fields only across accent, case, and whitespace variants', () => {
    const cohort = [
      record({
        id: 'art-2000',
        field: 'Teória a dejiny umenia',
        appointedOn: '2000-02-22',
      }),
      record({
        id: 'art-2010',
        field: ' teoria  A dejiny umenia ',
        appointedOn: '2010-05-12',
      }),
      record({
        id: 'art-2025',
        field: 'Teória a dejiny umenia',
        appointedOn: '2025-05-12',
      }),
      record({ id: 'music-1', field: 'teória a dejiny hudby' }),
      record({ id: 'music-2', field: 'TEORIA A DEJINY HUDBY' }),
      record({ id: 'hyphenated', field: 'Teória-a dejiny umenia' }),
    ]

    expect(fieldAppointmentRanking(cohort, fieldLabels(cohort))).toEqual([
      {
        fieldKey: 'teoria a dejiny umenia',
        field: 'Teória a dejiny umenia',
        appointmentCount: 3,
        appointmentShare: 0.5,
        firstYear: 2000,
        lastYear: 2025,
        variants: [
          { label: 'Teória a dejiny umenia', count: 2 },
          { label: ' teoria  A dejiny umenia ', count: 1 },
        ],
      },
      {
        fieldKey: 'teoria a dejiny hudby',
        field: 'TEORIA A DEJINY HUDBY',
        appointmentCount: 2,
        appointmentShare: 2 / 6,
        firstYear: 2023,
        lastYear: 2023,
        variants: [
          { label: 'TEORIA A DEJINY HUDBY', count: 1 },
          { label: 'teória a dejiny hudby', count: 1 },
        ],
      },
      {
        fieldKey: 'teoria-a dejiny umenia',
        field: 'Teória-a dejiny umenia',
        appointmentCount: 1,
        appointmentShare: 1 / 6,
        firstYear: 2023,
        lastYear: 2023,
        variants: [{ label: 'Teória-a dejiny umenia', count: 1 }],
      },
    ])
  })

  it('does not infer broad categories and defines an empty ranking', () => {
    const distinctProgrammeNames = [
      record({ id: 'program-1', field: 'učiteľstvo psychológie' }),
      record({ id: 'program-2', field: 'psychológia' }),
    ]

    expect(
      fieldAppointmentRanking(distinctProgrammeNames, fieldLabels(distinctProgrammeNames)),
    ).toHaveLength(2)
    expect(fieldAppointmentRanking([], {})).toEqual([])
  })

  it('never mutates record or institution source arrays', () => {
    const beforeRecords = structuredClone(records)
    const beforeInstitutions = structuredClone(institutions)

    filterAppointments(data, allFilters)
    institutionRanking(records, institutions)
    cityCounts(records, affiliations)
    yearCounts(records)
    fieldAppointmentRanking(records, fieldLabels(records))

    expect(records).toEqual(beforeRecords)
    expect(institutions).toEqual(beforeInstitutions)
  })
})

describe('cityFieldRanking', () => {
  const cohort = [
    record({ id: 'b1', appointedOn: '2012-01-10', fieldKey: 'informatika', field: 'informatika' }),
    record({ id: 'b2', appointedOn: '2013-01-10', fieldKey: 'informatika', field: 'informatika' }),
    record({
      id: 'k1',
      appointedOn: '2014-01-10',
      institutionId: 'tuke',
      affiliationId: 'tuke-default',
      fieldKey: 'informatika',
      field: 'informatika',
    }),
    record({ id: 'b3', appointedOn: '2015-01-10', fieldKey: 'fyzika', field: 'fyzika' }),
    record({
      id: 'k2',
      appointedOn: '2016-01-10',
      institutionId: 'tuke',
      affiliationId: 'tuke-default',
      fieldKey: 'hutnictvo',
      field: 'hutníctvo',
    }),
    record({ id: 'old', appointedOn: '2005-01-10', fieldKey: 'fyzika', field: 'fyzika' }),
  ]

  it('ranks the fields a city appoints in with its share of the national count', () => {
    const ranking = cityFieldRanking(
      cohort,
      affiliations,
      { informatika: 'informatika', fyzika: 'fyzika' },
      'Bratislava',
      { startYear: 2009, endYear: 2025 },
    )

    expect(ranking).toMatchObject({ city: 'Bratislava', cityTotal: 3, nationalTotal: 5 })
    expect(ranking.rows).toEqual([
      { fieldKey: 'informatika', label: 'informatika', cityCount: 2, nationalCount: 3, share: 2 / 3 },
      { fieldKey: 'fyzika', label: 'fyzika', cityCount: 1, nationalCount: 1, share: 1 },
    ])
  })

  it('counts the national side over the same period and leaves other cities out of the rows', () => {
    const ranking = cityFieldRanking(
      cohort,
      affiliations,
      {},
      'Košice',
      { startYear: 2014, endYear: 2016 },
    )

    expect(ranking).toMatchObject({ cityTotal: 2, nationalTotal: 3 })
    expect(ranking.rows).toEqual([
      { fieldKey: 'hutnictvo', label: 'hutníctvo', cityCount: 1, nationalCount: 1, share: 1 },
      { fieldKey: 'informatika', label: 'informatika', cityCount: 1, nationalCount: 1, share: 1 },
    ])
  })

  it('returns no rows for a city without appointments in the period', () => {
    expect(
      cityFieldRanking(cohort, affiliations, {}, 'Bratislava', { startYear: 2016, endYear: 2016 }).rows,
    ).toEqual([])
  })
})
