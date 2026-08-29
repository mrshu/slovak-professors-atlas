import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'

const MINISTRY_SOURCE_URL = 'https://www.minedu.sk/data/att/41c/36688.d8c1fd.xls'

const context2000 = {
  year: 2000,
  academicYear: '2000/2001',
  students: 137_908,
  graduates: 20_558,
  internalTeachers: 9_535,
  internalProfessors: 938,
  appointments: 105,
  appointmentsPer1kGraduates: 5.11,
  graduatesPerAppointment: 195.79,
  appointmentsPer10kStudents: 7.61,
  appointmentsPer1kTeachers: 11.01,
  appointmentsPer100Professors: 11.19,
  professorShare: 9.8,
  population: 5_400_637,
  appointmentsPerMillionResidents: 19.44,
  professorsPer100kResidents: 17.37,
}

const validAtlas = {
  meta: {
    schemaVersion: 1,
    sourceRowCount: 2419,
    duplicateSourceRowCount: 41,
    analyticalAppointmentCount: 2378,
    ceremonyCount: 67,
    appointmentDateMin: '2000-02-22',
    appointmentDateMax: '2026-06-03',
  },
  sources: {
    professors: {
      url: MINISTRY_SOURCE_URL,
      sha256: '0730645dfe3310e25665f5daef3126fbe5fe21469c773cd4a6e16b2bdaa69b5d',
      retrievedOn: '2026-08-29',
    },
    higher_education: {
      url: 'https://www.cvtisr.sk/buxus/docs//JC/rady/radtab10.xls',
      sha256: 'def7a52f5fe139dfcd01d88a141d3d65fafc33581a19082bf07fa62b1d06f59e',
      retrievedOn: '2026-08-29',
    },
    graduates_by_field_2025: {
      url: 'https://www.cvtisr.sk/buxus/docs//JC/ROCENKA/VS/abvs_2.xls',
      catalogUrl: 'https://www.cvtisr.sk/catalog',
      sha256: '2bfc9bf67bcf7c1d4ed5e80296d498f634a9c8c9b949bf70f839a9bf90ba7729',
      retrievedOn: '2026-08-29',
    },
    population: {
      url: 'https://data.statistics.sk/api/v2/dataset/om7102rr/SK0/2000:2025/IN010114/SPOLU?lang=en&type=json',
      catalogUrl:
        'https://datacube.statistics.sk/#!/view/en/VBD_DEM/om7102rr/v_om7102rr_00_00_00_en',
      sha256: 'd09a892509ac4c746fe87ac4f825502d491ad4b2ac5b79e9751b2cec0431efa6',
      retrievedOn: '2026-08-29',
      denominatorDateConvention:
        'Mid-year population at midnight from 30 June to 1 July of the reference calendar year.',
    },
  },
  records: [],
  institutions: [],
  cities: [],
  presidents: [],
  context: [],
  fieldGraduateComparison: {
    schemaVersion: 1,
    year: 2025,
    source: {
      url: 'https://www.cvtisr.sk/buxus/docs//JC/ROCENKA/VS/abvs_2.xls',
      catalogUrl: 'https://www.cvtisr.sk/catalog',
      sha256: '2bfc9bf67bcf7c1d4ed5e80296d498f634a9c8c9b949bf70f839a9bf90ba7729',
      retrievedOn: '2026-08-29',
    },
    appointmentCount: 2,
    matchedAppointmentCount: 1,
    matchedAppointmentShare: 50,
    distinctFieldCount: 2,
    matchedDistinctFieldCount: 1,
    rows: [
      {
        field: 'psychológia',
        appointmentCount: 1,
        graduateCount: 1146,
        graduatesPerAppointment: 1146,
        matchStatus: 'exact',
      },
      {
        field: 'mikrobiológia',
        appointmentCount: 1,
        graduateCount: null,
        graduatesPerAppointment: null,
        matchStatus: 'unmatched',
      },
    ],
  },
  geography: {
    type: 'Feature',
    bbox: [16.83, 47.73, 22.57, 49.61],
    properties: {
      source: 'Natural Earth',
      sourceUrl: 'https://www.naturalearthdata.com/',
      license: 'Public domain',
      licenseUrl: 'https://www.naturalearthdata.com/about/terms-of-use/',
    },
    geometry: {
      type: 'Polygon',
      coordinates: [],
    },
  },
  editorialFacts: {
    studentPeak: {
      year: 2008,
      academicYear: '2008/2009',
      students: 230519,
    },
    graduateThroughputPeak: {
      year: 2010,
      graduates: 73970,
      statementSk:
        'V roku 2010 evidovalo CVTI 73 970 absolventov I., II. a III. stupňa, najviac v sledovanom období.',
    },
    appointmentRateMaximum: {
      year: 2023,
      appointments: 112,
      students: 137680,
      appointmentsPer10kStudents: 8.13,
    },
    appointmentGraduateRateMaximum: {
      year: 2000,
      appointments: 105,
      graduates: 20558,
      appointmentsPer1kGraduates: 5.11,
      graduatesPerAppointment: 195.79,
      statementSk:
        'V roku 2000 pripadlo 5,11 profesorských vymenovaní na 1 000 absolventov, najviac v sledovanom období; oba údaje sú ročné toky.',
    },
    appointmentProfessorStockRateMaximum: {
      year: 2001,
      appointments: 117,
      internalProfessors: 1017,
      appointmentsPer100Professors: 11.5,
      statementSk:
        'V roku 2001 pripadlo 11,5 profesorských vymenovaní na 100 profesorov medzi internými učiteľmi; ide o porovnanie ročného toku so stavom, nie o zmenu počtu profesorov.',
    },
    largestCeremony: {
      appointedOn: '2011-01-24',
      appointments: 108,
    },
  },
}

const atlasWithActiveLocalFilters = {
  ...validAtlas,
  records: [
    {
      id: 'local-uniba-appointment',
      name: 'Lokálny záznam',
      titlesBefore: null,
      titlesAfter: null,
      faculty: 'Filozofická fakulta',
      institutionId: 'uniba',
      institutionSource: 'Univerzita Komenského v Bratislave',
      field: 'história',
      appointedOn: '2000-02-22',
      presidentId: 'schuster',
      sourceVariants: [
        {
          rowNumber: 2,
          titlesBefore: null,
          titlesAfter: null,
          faculty: 'Filozofická fakulta',
          institution: 'Univerzita Komenského v Bratislave',
          field: 'história',
        },
      ],
    },
  ],
  institutions: [
    {
      id: 'uniba',
      shortName: 'UK',
      fullName: 'Univerzita Komenského v Bratislave',
      city: 'Bratislava',
      latitude: 48.141,
      longitude: 17.115,
      sourceLabels: ['Univerzita Komenského v Bratislave'],
      citationUrl: 'https://uniba.sk/',
    },
  ],
  cities: [{ name: 'Bratislava', institutionIds: ['uniba'] }],
  presidents: [
    {
      id: 'schuster',
      name: 'Rudolf Schuster',
      from: '1999-06-15',
      to: '2004-06-15',
      citationUrl: 'https://www.prezident.sk/rudolf-schuster/',
    },
  ],
  context: [context2000],
}

const atlasWithFieldVariants = {
  ...atlasWithActiveLocalFilters,
  records: [
    atlasWithActiveLocalFilters.records[0],
    {
      ...atlasWithActiveLocalFilters.records[0],
      id: 'history-variant',
      name: 'Variant histórie',
      field: ' HISTÓRIA ',
    },
    {
      ...atlasWithActiveLocalFilters.records[0],
      id: 'psychology',
      name: 'Psychológia',
      field: 'Psychológia',
    },
  ],
}

function successfulResponse(payload: unknown = validAtlas) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

beforeEach(() => {
  vi.stubEnv('BASE_URL', '/slovak-professors/')
  window.history.replaceState({}, '', '/slovak-professors/')
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('archívny atlas', () => {
  it('loads from the project Pages base and renders the Slovak story landmarks in order', async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) => successfulResponse(),
    )
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    expect(screen.getByRole('heading', { name: 'Kde vzniká slovenská profesúra?' })).toBeVisible()
    const ledger = await screen.findByLabelText('Rozsah analytického súboru')
    expect(within(ledger).getByText(/2[\s ]378/)).toBeVisible()
    expect(within(ledger).getByText(/22\. februára 2000/)).toBeVisible()

    const findings = screen.getByRole('region', { name: 'Čísla, ktoré menia mierku' })
    expect(within(findings).getAllByRole('article')).toHaveLength(3)
    expect(
      within(findings).getByRole('article', { name: 'Najväčší ceremoniál' }),
    ).toBeVisible()
    expect(
      within(findings).getByRole('article', { name: 'Podiel Bratislavy' }),
    ).toBeVisible()
    expect(
      within(findings).getByRole('article', { name: 'Rozmanitosť odborov' }),
    ).toBeVisible()

    const context = screen.getByRole('region', { name: 'Vymenovania v národnom kontexte' })
    const unavailable = within(context)
      .getByText('Kontext CVTI pre rok 2026 nie je k dispozícii')
      .closest('[role="status"]')
    expect(unavailable).toHaveTextContent('Kontext CVTI pre rok 2026 nie je k dispozícii')
    expect(unavailable).toHaveTextContent(
      'Oficiálny rad sa končí akademickým rokom 2025/2026.',
    )
    expect(unavailable).toHaveTextContent(
      'Pre vymenovania v roku 2026 preto nezobrazujeme menovatele ani pomery.',
    )

    const banner = screen.getByRole('banner')
    const navigation = screen.getByRole('navigation', { name: 'Navigácia atlasu' })
    const main = screen.getByRole('main')
    expect(banner.nextElementSibling).toBe(navigation)
    expect(navigation.nextElementSibling).toBe(main)
    expect(banner).not.toContainElement(navigation)

    const mainSections = Array.from(main.children).map((section) => section.id)
    expect(mainSections).toEqual([
      'zistenia',
      'kontext',
      'odbory-absolventi',
      'atlas',
      'zaznamy',
      'metodika',
    ])

    expect(screen.getByRole('link', { name: 'Zdrojový zoznam ministerstva' })).toHaveAttribute(
      'href',
      MINISTRY_SOURCE_URL,
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      'https://example.test/slovak-professors/data/atlas.json',
    )
  })

  it('keeps national appointment values when valid city and institution URL filters are active', async () => {
    window.history.replaceState(
      {},
      '',
      '/slovak-professors/?city=Bratislava&institutionId=uniba&selectedYear=2000',
    )
    vi.stubGlobal('fetch', vi.fn(async () => successfulResponse(atlasWithActiveLocalFilters)))

    render(<App />)

    const context = await screen.findByRole('region', {
      name: 'Vymenovania v národnom kontexte',
    })
    const panel = await screen.findByRole('group', {
      name: 'Presné národné hodnoty pre rok 2000',
    })
    expect(
      within(panel).getByRole('listitem', {
        name: 'Vymenovania: 105; ročný tok',
      }),
    ).toBeInTheDocument()
    expect(
      within(panel).getByText('Vymenovania na milión obyvateľov').parentElement,
    ).toHaveTextContent('19,44')
    expect(window.location.search).toBe(
      '?city=Bratislava&institutionId=uniba&selectedYear=2000',
    )
  })

  it('deep-links the normalized field facet while the field comparison excludes only that facet', async () => {
    window.history.replaceState({}, '', '/slovak-professors/?field=historia')
    vi.stubGlobal('fetch', vi.fn(async () => successfulResponse(atlasWithFieldVariants)))

    render(<App />)

    const section = await screen.findByRole('region', {
      name: 'Odbory vymenovaní a absolventi v roku 2025',
    })
    expect(window.location.search).toBe('?field=historia')
    const explorer = screen.getByRole('region', {
      name: 'Úplný register profesorských vymenovaní',
    })
    expect(within(explorer).getByRole('status')).toHaveTextContent('2')
    expect(
      within(section).getByRole('group', {
        name: 'Súhrn aktívneho výberu bez filtra odboru',
      }),
    ).toHaveTextContent('3')

    fireEvent.click(within(section).getByRole('button', { name: 'Psychológia' }))

    expect(window.location.search).toBe('?field=psychologia')
    await waitFor(() => expect(within(explorer).getByRole('status')).toHaveTextContent('1'))
    expect(
      within(section).getByRole('group', {
        name: 'Súhrn aktívneho výberu bez filtra odboru',
      }),
    ).toHaveTextContent('3')
    expect(
      within(section).getByRole('table', {
        name: 'Presné porovnanie odborov a absolventov',
      }),
    ).toHaveTextContent('bez presnej zhody')
  })

  it('keeps the Slovak shell and source link visible when the payload request fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 503 })))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    render(<App />)

    const loadingContext = screen.getByRole('region', {
      name: 'Vymenovania v národnom kontexte',
    })
    expect(loadingContext).toHaveAttribute('id', 'kontext')
    expect(screen.getByRole('link', { name: 'Kontext' })).toHaveAttribute('href', '#kontext')

    expect(await screen.findByRole('heading', { name: 'Atlas sa nepodarilo načítať' })).toBeVisible()
    expect(screen.getByText('Dáta sa teraz nedajú bezpečne zobraziť. Skúste stránku načítať znova.')).toBeVisible()
    expect(screen.getByRole('link', { name: 'Otvoriť zdrojový zoznam ministerstva' })).toHaveAttribute(
      'href',
      MINISTRY_SOURCE_URL,
    )
    expect(screen.getByRole('heading', { name: 'Kde vzniká slovenská profesúra?' })).toBeVisible()
    expect(consoleError).toHaveBeenCalledTimes(1)
    expect(
      screen.getByRole('region', { name: 'Vymenovania v národnom kontexte' }),
    ).toHaveAttribute('id', 'kontext')
  })

  it.each([
    ['nepodporovanú verziu', { ...validAtlas, meta: { ...validAtlas.meta, schemaVersion: 2 } }],
    ['chýbajúce povinné pole', { ...validAtlas, context: undefined }],
    [
      'chýbajúci zdroj obyvateľstva',
      { ...validAtlas, sources: { ...validAtlas.sources, population: undefined } },
    ],
    [
      'neplatný menovateľ obyvateľstva',
      {
        ...validAtlas,
        context: [{ ...context2000, population: 0 }],
      },
    ],
    [
      'chýbajúce porovnanie odborov',
      { ...validAtlas, fieldGraduateComparison: undefined },
    ],
    [
      'nepodporovanú verziu porovnania odborov',
      {
        ...validAtlas,
        fieldGraduateComparison: { ...validAtlas.fieldGraduateComparison, schemaVersion: 2 },
      },
    ],
  ])('fails closed for %s payloadu', async (_case, payload) => {
    vi.stubGlobal('fetch', vi.fn(async () => successfulResponse(payload)))
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Atlas sa nepodarilo načítať' })).toBeVisible()
    expect(screen.queryByText(/2[\s ]378/)).not.toBeInTheDocument()
  })
})
