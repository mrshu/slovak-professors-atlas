import { describe, expect, it } from 'vitest'

import type { Affiliation, Appointment, AtlasData, Institution, President } from '../data/types'
import type { FilterState } from '../state/filters'
import {
  academicBreadth,
  ceremonyCadence,
  ceremonyCounts,
  cityCounts,
  facultyCounts,
  fieldAppointmentLandscape,
  fieldAppointmentRanking,
  filterAppointments,
  institutionConcentration,
  institutionRanking,
  presidentialEraProfiles,
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
    expect(academicBreadth(cohort, affiliations)).toMatchObject({
      cityCount: 2,
      institutionCount: 3,
    })
    expect(cohort).toHaveLength(3)
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
    expect(academicBreadth(cohort, affiliations)).toEqual({
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
    expect(academicBreadth(cohort, affiliations).facultyCount).toBe(1)
  })

  it('orders represented presidential eras by official start and resolves leader ties by Slovak label', () => {
    const cohort = [
      record({ id: 'later-tuke', presidentId: 'later', institutionId: 'tuke' }),
      record({ id: 'later-aku', presidentId: 'later', institutionId: 'aku' }),
      record({ id: 'earlier-u', presidentId: 'earlier', institutionId: 'uniba' }),
    ]

    expect(presidentialEraProfiles(cohort, institutions, affiliations, presidents)).toEqual([
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
        citationUrl: 'https://example.test/stvrta',
      },
    ]

    const expandedAffiliations: Affiliation[] = [
      ...affiliations,
      {
        id: 'stvrta-default',
        institutionId: 'stvrta',
        facultyKeys: [],
        status: 'resolved',
        city: 'Žilina',
        sourceUrl: 'https://www.uniza.sk/',
        sourceLabel: 'Žilinská univerzita',
        note: null,
      },
    ]
    expect(
      presidentialEraProfiles(cohort, expandedInstitutions, expandedAffiliations, presidents)[0],
    ).toMatchObject({
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
      affiliations,
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
      appointedOn: null,
      query: '',
      selectedYear: 2025,
    })

    expect(
      presidentialEraProfiles(laterOnly, institutions, affiliations, presidents).map(
        ({ presidentId }) => presidentId,
      ),
    ).toEqual(['later'])
    expect(presidentialEraProfiles([], institutions, affiliations, presidents)).toEqual([])
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

  it('summarizes whole-register and selected-cohort shares without applying the field facet', () => {
    const wholeRegister = [
      record({ id: 'art-2000', field: 'Teória a dejiny umenia', appointedOn: '2000-02-22' }),
      record({ id: 'art-2010', field: ' teoria  A dejiny umenia ', appointedOn: '2010-05-12' }),
      record({ id: 'art-2025', field: 'Teória a dejiny umenia', appointedOn: '2025-05-12' }),
      record({ id: 'music-1', field: 'teória a dejiny hudby' }),
      record({ id: 'music-2', field: 'TEORIA A DEJINY HUDBY' }),
      record({ id: 'hyphenated', field: 'Teória-a dejiny umenia' }),
    ]
    const selection = [wholeRegister[0], wholeRegister[1], wholeRegister[3]].filter(
      (appointment): appointment is Appointment => appointment !== undefined,
    )

    expect(
      fieldAppointmentLandscape(wholeRegister, selection, fieldLabels(wholeRegister)),
    ).toEqual({
      wholeRegister: {
        appointmentCount: 6,
        distinctFieldCount: 3,
        singletonFieldCount: 1,
        leadingFieldKey: 'teoria a dejiny umenia',
        leadingField: 'Teória a dejiny umenia',
        leadingAppointmentCount: 3,
        leadingShare: 0.5,
        topTenCount: 6,
        topTenShare: 1,
        firstYear: 2000,
        lastYear: 2025,
      },
      selection: {
        appointmentCount: 3,
        distinctFieldCount: 2,
        singletonFieldCount: 1,
        leadingFieldKey: 'teoria a dejiny umenia',
        leadingField: 'Teória a dejiny umenia',
        leadingAppointmentCount: 2,
        leadingShare: 2 / 3,
        topTenCount: 3,
        topTenShare: 1,
        firstYear: 2000,
        lastYear: 2023,
      },
      rows: [
        {
          fieldKey: 'teoria a dejiny umenia',
          field: 'Teória a dejiny umenia',
          wholeRegisterAppointmentCount: 3,
          wholeRegisterShare: 0.5,
          selectionAppointmentCount: 2,
          selectionShare: 2 / 3,
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
          wholeRegisterAppointmentCount: 2,
          wholeRegisterShare: 1 / 3,
          selectionAppointmentCount: 1,
          selectionShare: 1 / 3,
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
          wholeRegisterAppointmentCount: 1,
          wholeRegisterShare: 1 / 6,
          selectionAppointmentCount: 0,
          selectionShare: 0,
          firstYear: 2023,
          lastYear: 2023,
          variants: [{ label: 'Teória-a dejiny umenia', count: 1 }],
        },
      ],
    })
  })

  it('defines empty field landscape summaries without invented leaders or years', () => {
    expect(fieldAppointmentLandscape([], [], {})).toEqual({
      wholeRegister: {
        appointmentCount: 0,
        distinctFieldCount: 0,
        singletonFieldCount: 0,
        leadingFieldKey: null,
        leadingField: null,
        leadingAppointmentCount: 0,
        leadingShare: 0,
        topTenCount: 0,
        topTenShare: 0,
        firstYear: null,
        lastYear: null,
      },
      selection: {
        appointmentCount: 0,
        distinctFieldCount: 0,
        singletonFieldCount: 0,
        leadingFieldKey: null,
        leadingField: null,
        leadingAppointmentCount: 0,
        leadingShare: 0,
        topTenCount: 0,
        topTenShare: 0,
        firstYear: null,
        lastYear: null,
      },
      rows: [],
    })
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
    ceremonyCadence(records)
    academicBreadth(records, affiliations)
    institutionConcentration(records, institutions)
    fieldAppointmentRanking(records, fieldLabels(records))

    expect(records).toEqual(beforeRecords)
    expect(institutions).toEqual(beforeInstitutions)
  })
})
