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
const fixtureFieldLabels = {
  historia: 'história',
  psychologia: 'Psychológia',
  mikrobiologia: 'mikrobiológia',
  ...Object.fromEntries(
    Array.from({ length: 13 }, (_, index) => [`ciel-${index}`, `cieľ ${index}`]),
  ),
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
  affiliations: [],
  cities: [],
  presidents: [],
  context: Array.from({ length: 17 }, (_, index) => ({
    year: 2009 + index,
    academicYear: `${2009 + index}/${2010 + index}`,
    students: 100_000,
    graduates: 1_000 + index,
    internalTeachers: 10_000,
    internalProfessors: 1_000,
    appointments: 10,
    appointmentsPer1kGraduates: 10,
    graduatesPerAppointment: 100,
    appointmentsPer10kStudents: 1,
    appointmentsPer1kTeachers: 1,
    appointmentsPer100Professors: 1,
    professorShare: 10,
    population: 5_000_000,
    appointmentsPerMillionResidents: 2,
    professorsPer100kResidents: 20,
  })),
  fieldCatalog: {
    schemaVersion: 1,
    aliases: Array.from({ length: 13 }, (_, index) => ({
      sourceLabel: `zdroj ${index}`,
      sourceKey: `zdroj-${index}`,
      targetLabel: `cieľ ${index}`,
      targetKey: `ciel-${index}`,
    })),
    labels: fixtureFieldLabels,
  },
  fieldEducationComparison: {
    schemaVersion: 2,
    startYear: 2009,
    endYear: 2025,
    catalogUrl: 'https://www.cvtisr.sk/catalog',
    graduateSources: Array.from({ length: 17 }, (_, index) => ({
      year: 2009 + index,
      url: `https://www.cvtisr.sk/graduates/${2009 + index}.xls`,
      archiveMember: index < 16 ? `archive/${2009 + index}.xls` : null,
      sha256: '2bfc9bf67bcf7c1d4ed5e80296d498f634a9c8c9b949bf70f839a9bf90ba7729',
      retrievedOn: '2026-08-29',
      localPath: `graduates-by-field/${2009 + index}.xls`,
    })),
    currentStudentsSource: {
      year: 2025,
      url: 'https://www.cvtisr.sk/students/2025.xls',
      archiveMember: null,
      sha256: '2bfc9bf67bcf7c1d4ed5e80296d498f634a9c8c9b949bf70f839a9bf90ba7729',
      retrievedOn: '2026-08-29',
      localPath: 'current-students-by-field-2025.xls',
    },
    years: Array.from({ length: 17 }, (_, index) => ({
      year: 2009 + index,
      programRowCount: 1,
      nationalGraduateCount: 1_000 + index,
    })),
    rows: Object.entries(fixtureFieldLabels).map(([fieldKey, canonicalLabel], rowIndex) => ({
      fieldKey,
      canonicalLabel,
      graduateCounts: Array.from({ length: 17 }, (_, index) =>
        rowIndex === 0 ? 10 + index : null,
      ),
      currentStudentCount: rowIndex === 0 ? 200 : null,
    })),
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
      affiliationId: 'uniba-default',
      institutionSource: 'Univerzita Komenského v Bratislave',
      field: 'história',
      fieldKey: 'historia',
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
      sourceLabels: ['Univerzita Komenského v Bratislave'],
      citationUrl: 'https://uniba.sk/',
    },
  ],
  affiliations: [
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
  ],
  cities: [
    {
      name: 'Bratislava',
      latitude: 48.1486,
      longitude: 17.1077,
      affiliationIds: ['uniba-default'],
    },
  ],
  presidents: [
    {
      id: 'schuster',
      name: 'Rudolf Schuster',
      from: '1999-06-15',
      to: '2004-06-15',
      citationUrl: 'https://www.prezident.sk/rudolf-schuster/',
    },
  ],
  context: [context2000, ...validAtlas.context],
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
      fieldKey: 'historia',
    },
    {
      ...atlasWithActiveLocalFilters.records[0],
      id: 'psychology',
      name: 'Psychológia',
      field: 'Psychológia',
      fieldKey: 'psychologia',
    },
  ],
}

const atlasWithFieldWindow = {
  ...atlasWithFieldVariants,
  records: atlasWithFieldVariants.records.map((record) => ({
    ...record,
    appointedOn: '2009-02-22',
    presidentId: 'gasparovic',
  })),
  presidents: [
    {
      id: 'gasparovic',
      name: 'Ivan Gašparovič',
      from: '2004-06-15',
      to: '2014-06-15',
      citationUrl: 'https://www.prezident.sk/ivan-gasparovic/',
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
    expect(
      within(context).getByRole('group', {
        name: 'Presné národné hodnoty pre rok 2025',
      }),
    ).toBeVisible()
    expect(within(context).getByText('Najnovší dostupný kontext: 2025/2026')).toBeVisible()

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

  it('deep-links the canonical field while the field landscape remains globally invariant', async () => {
    window.history.replaceState({}, '', '/slovak-professors/?field=historia')
    vi.stubGlobal('fetch', vi.fn(async () => successfulResponse(atlasWithFieldWindow)))

    render(<App />)

    const section = await screen.findByRole('region', {
      name: 'Profesorské vymenovania × absolventi',
    })
    expect(window.location.search).toBe('?field=historia')
    const explorer = screen.getByRole('region', {
      name: 'Úplný register profesorských vymenovaní',
    })
    expect(within(explorer).getByRole('status')).toHaveTextContent('2')
    const coverageBefore = within(section)
      .getByLabelText('Pokrytie odborového porovnania')
      .textContent
    const pointCountBefore = within(section).queryAllByTestId(/^field-point-/).length

    fireEvent.click(within(section).getByRole('button', { name: 'Psychológia' }))

    expect(window.location.search).toBe('?field=psychologia')
    await waitFor(() => expect(within(explorer).getByRole('status')).toHaveTextContent('1'))
    expect(
      within(section).getByLabelText('Pokrytie odborového porovnania').textContent,
    ).toBe(coverageBefore)
    expect(within(section).queryAllByTestId(/^field-point-/)).toHaveLength(pointCountBefore)
    expect(within(section).getByRole('heading', { name: 'Psychológia' })).toBeVisible()
  })

  it('opens a finding from defaults in one history entry instead of intersecting stale filters', async () => {
    window.history.replaceState({}, '', '/slovak-professors/?field=psychologia')
    const pushState = vi.spyOn(window.history, 'pushState')
    vi.stubGlobal('fetch', vi.fn(async () => successfulResponse(atlasWithFieldVariants)))

    render(<App />)

    const findings = await screen.findByRole('region', { name: 'Čísla, ktoré menia mierku' })
    fireEvent.click(within(findings).getByRole('button', { name: 'Zobraziť Bratislavu' }))

    expect(pushState).toHaveBeenCalledTimes(1)
    expect(window.location.search).toBe('?city=Bratislava')
    expect(window.location.hash).toBe('#atlas')
    const explorer = screen.getByRole('region', {
      name: 'Úplný register profesorských vymenovaní',
    })
    await waitFor(() => expect(within(explorer).getByRole('status')).toHaveTextContent('3'))
    expect(
      within(explorer).queryByRole('button', { name: /Odstrániť filter Odbor:/ }),
    ).not.toBeInTheDocument()
  })
  it('opens the ceremony finding without retaining an unrelated active field', async () => {
    window.history.replaceState({}, '', '/slovak-professors/?field=psychologia')
    const pushState = vi.spyOn(window.history, 'pushState')
    vi.stubGlobal('fetch', vi.fn(async () => successfulResponse(atlasWithFieldVariants)))

    render(<App />)

    const findings = await screen.findByRole('region', { name: 'Čísla, ktoré menia mierku' })
    fireEvent.click(within(findings).getByRole('button', { name: 'Otvoriť ceremoniál' }))

    expect(pushState).toHaveBeenCalledTimes(1)
    expect(window.location.search).toBe('?appointedOn=2000-02-22&selectedYear=2000')
    expect(window.location.hash).toBe('#atlas')
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
      { ...validAtlas, fieldEducationComparison: undefined },
    ],
    [
      'nepodporovanú verziu porovnania odborov',
      {
        ...validAtlas,
        fieldEducationComparison: {
          ...validAtlas.fieldEducationComparison,
          schemaVersion: 1,
        },
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
