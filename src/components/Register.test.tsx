import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Appointment, AtlasData } from '../data/types'
import { useAtlasState } from '../state/useAtlasState'
import type { AtlasState } from '../state/useAtlasState'
import { affiliation, appointment, city, institution, president } from '../test/atlasFixture'
import { normalizeForSearch } from '../utils/search'
import Register from './Register'

beforeEach(() => {
  window.history.replaceState({}, '', '/')
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const records = Array.from({ length: 35 }, (_, index) =>
  appointment({
    appointedOn: index < 20 ? '2026-06-03' : '2026-03-31',
    name: `Osoba ${String(index).padStart(2, '0')}`,
    presidentId: 'pellegrini',
  }),
)
const data = {
  records,
  institutions: [institution()],
  affiliations: [affiliation()],
  cities: [city()],
  presidents: [president({ id: 'pellegrini', name: 'Peter Pellegrini', from: '2024-06-15', to: null })],
  meta: {
    schemaVersion: 1, sourceRowCount: 35, duplicateSourceRowCount: 0, analyticalAppointmentCount: 35,
    ceremonyCount: 2, appointmentDateMin: '2026-03-31', appointmentDateMax: '2026-06-03',
  },
  sources: { professors: { url: 'https://example.test/p', sha256: '', retrievedOn: '' } },
}

function atlasState(): AtlasState {
  const defaults = {
    startYear: 2000, endYear: 2026, fieldStartYear: 2009, fieldEndYear: 2025,
    presidentId: null, city: null, institutionId: null, faculty: null, field: null,
    appointedOn: null, query: '', selectedYear: 2025,
  }
  return {
    filters: defaults,
    defaults,
    filteredRecords: records,
    options: {
      defaults,
      presidentIds: ['pellegrini'],
      cities: ['Bratislava'],
      institutionIds: ['uniba'],
      faculties: ['Prírodovedecká fakulta'],
      fieldKeys: ['fyzika'],
      fields: [{ key: 'fyzika', canonicalLabel: 'fyzika' }],
      appointmentDates: ['2026-03-31', '2026-06-03'],
    },
    setFilter: vi.fn(), setExclusiveFilter: vi.fn(), setDateRange: vi.fn(), setFieldEducationRange: vi.fn(),
    setSelectedYear: vi.fn(), setTimelineYear: vi.fn(), setAppointmentDate: vi.fn(), setQuery: vi.fn(), resetFilters: vi.fn(),
  }
}

describe('Register', () => {
  it('groups rows by ceremony date and loads thirty at a time', () => {
    render(<Register data={data as never} atlasState={atlasState()} />)
    const section = screen.getByRole('region', { name: 'Úplný register profesorských vymenovaní' })
    expect(within(section).getByRole('status')).toHaveTextContent('35 vymenovaní vo výbere')
    const groups = within(section).getAllByRole('row', { name: /vymenovaní · Peter Pellegrini/ })
    expect(groups[0]).toHaveTextContent('3. júna 2026')
    expect(within(section).getAllByText(/^Osoba \d\d$/)).toHaveLength(30)
    fireEvent.click(within(section).getByRole('button', { name: 'Zobraziť ďalších 5 záznamov' }))
    expect(within(section).getAllByText(/^Osoba \d\d$/)).toHaveLength(35)
  })

  it('keeps the secondary filters and the timeline in closed folds', () => {
    render(<Register data={data as never} atlasState={atlasState()} />)
    expect(screen.getByText('Viac filtrov').closest('details')).not.toHaveAttribute('open')
    expect(screen.getByText('Časová os slávností').closest('details')).not.toHaveAttribute('open')
    expect(screen.getByRole('combobox', { name: 'Fakulta' })).toBeInTheDocument()
  })

  it('writes the query through setQuery on every keystroke', () => {
    const state = atlasState()
    render(<Register data={data as never} atlasState={state} />)
    fireEvent.change(screen.getByRole('searchbox', { name: 'Hľadať v záznamoch' }), {
      target: { value: 'Osoba 0' },
    })
    expect(state.setQuery).toHaveBeenCalledWith('Osoba 0')
  })
})

const legacyInstitutions: AtlasData['institutions'] = [
  {
    id: 'uniba',
    shortName: 'UK v Bratislave',
    fullName: 'Univerzita Komenského v Bratislave',
    sourceLabels: ['UK v Bratislave'],
    citationUrl: 'https://www.wikidata.org/wiki/Q159241',
  },
  {
    id: 'tuke',
    shortName: 'TU v Košiciach',
    fullName: 'Technická univerzita v Košiciach',
    sourceLabels: ['TU v Košiciach'],
    citationUrl: 'https://www.wikidata.org/wiki/Q1366024',
  },
]

function legacyAppointment(
  index: number,
  overrides: Partial<Appointment> = {},
): Appointment {
  const field = overrides.field ?? 'robotika'
  return {
    id: `appointment-${index}`,
    name: `Profesor ${String(index).padStart(2, '0')}`,
    titlesBefore: 'doc.',
    titlesAfter: 'PhD.',
    faculty: 'Strojnícka fakulta',
    institutionId: 'tuke',
    institutionSource: 'TU v Košiciach',
    field,
    fieldKey: overrides.fieldKey ?? normalizeForSearch(field),
    appointedOn: '2024-06-12',
    presidentId: 'pellegrini',
    sourceVariants: [
      {
        rowNumber: index + 2,
        titlesBefore: 'doc.',
        titlesAfter: 'PhD.',
        faculty: 'Strojnícka fakulta',
        institution: 'TU v Košiciach',
        field: 'robotika',
      },
    ],
    ...overrides,
    affiliationId:
      overrides.affiliationId ?? `${overrides.institutionId ?? 'tuke'}-default`,
  }
}

const legacyLookupRecord = legacyAppointment(0, {
  id: 'stefan-simek',
  name: 'Štefan Šimek',
  titlesBefore: 'prof. RNDr.',
  titlesAfter: 'CSc.',
  faculty: null,
  institutionId: 'uniba',
  affiliationId: 'uniba-default',
  institutionSource: 'UK v Bratislave',
  field: 'história',
  appointedOn: '2010-01-25',
  presidentId: 'gasparovic',
  sourceVariants: [
    {
      rowNumber: 2,
      titlesBefore: 'prof. RNDr.',
      titlesAfter: 'CSc.',
      faculty: null,
      institution: 'UK v Bratislave',
      field: 'história',
    },
    {
      rowNumber: 45,
      titlesBefore: 'prof. RNDr.',
      titlesAfter: 'CSc.',
      faculty: 'Filozofická fakulta',
      institution: 'Univerzita Komenského v Bratislave',
      field: 'história ',
    },
  ],
})

const legacyRecords = [
  legacyLookupRecord,
  legacyAppointment(1, { faculty: 'Filozofická fakulta' }),
  ...Array.from({ length: 28 }, (_, index) => legacyAppointment(index + 2)),
]

const legacyData: AtlasData = {
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
      url: 'https://www.minedu.sk/data/att/41c/36688.d8c1fd.xls',
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
  records: legacyRecords,
  institutions: legacyInstitutions,
  affiliations: [
    {
      id: 'uniba-default',
      institutionId: 'uniba',
      facultyKeys: [],
      status: 'resolved',
      city: 'Bratislava',
      sourceUrl: 'https://example.test/uniba',
      sourceLabel: 'UK',
      note: null,
    },
    {
      id: 'tuke-default',
      institutionId: 'tuke',
      facultyKeys: [],
      status: 'resolved',
      city: 'Košice',
      sourceUrl: 'https://example.test/tuke',
      sourceLabel: 'TUKE',
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
    {
      name: 'Košice',
      latitude: 48.7164,
      longitude: 21.2611,
      affiliationIds: ['tuke-default'],
    },
  ],
  presidents: [
    {
      id: 'gasparovic',
      name: 'Ivan Gašparovič',
      from: '2004-06-15',
      to: '2014-06-15',
      citationUrl: 'https://www.prezident.sk/ivan-gasparovic/',
    },
    {
      id: 'pellegrini',
      name: 'Peter Pellegrini',
      from: '2024-06-15',
      to: null,
      citationUrl: 'https://www.prezident.sk/zivotopis-petra-pellegriniho',
    },
  ],
  fieldCatalog: {
    schemaVersion: 1,
    aliases: [],
    labels: {
      historia: 'história',
      robotika: 'robotika',
    },
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
      nationalGraduateCount: 1,
    })),
    rows: [
      {
        fieldKey: 'historia',
        canonicalLabel: 'história',
        graduateCounts: Array.from({ length: 17 }, () => 1),
        currentStudentCount: 1,
      },
      {
        fieldKey: 'robotika',
        canonicalLabel: 'robotika',
        graduateCounts: Array.from({ length: 17 }, () => null),
        currentStudentCount: null,
      },
    ],
  },
  context: [],
  geography: {
    type: 'Feature',
    bbox: [16.83, 47.73, 22.57, 49.61],
    properties: {
      ADM0_A3: 'SVK',
      ADMIN: 'Slovakia',
      ISO_A2: 'SK',
      ISO_A3: 'SVK',
      NAME: 'Slovakia',
      NAME_EN: 'Slovakia',
      license: 'Public domain',
      licenseUrl: 'https://www.naturalearthdata.com/about/terms-of-use/',
      simplificationTolerance: 0.01,
      source: 'Natural Earth',
      sourceDataset: 'ne_10m_admin_0_countries',
      sourceUrl:
        'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson',
    },
    geometry: { type: 'Polygon', coordinates: [] },
  },
  editorialFacts: {} as AtlasData['editorialFacts'],
}

function RegisterHarness({ atlasData = legacyData }: { atlasData?: AtlasData }) {
  const atlasState = useAtlasState(atlasData)
  return (
    <>
      <output data-testid="linked-count">{atlasState.filteredRecords.length}</output>
      <Register data={atlasData} atlasState={atlasState} />
    </>
  )
}

describe('úplný register', () => {
  it('vyhľadáva okamžite bez ohľadu na diakritiku, zapisuje URL cez replace a vynuluje celý výber', () => {
    const replaceState = vi.spyOn(window.history, 'replaceState')
    render(<RegisterHarness />)

    const register = screen.getByRole('region', { name: 'Úplný register profesorských vymenovaní' })
    const query = within(register).getByLabelText('Hľadať v záznamoch')

    fireEvent.change(query, { target: { value: 'simek' } })

    expect(within(register).getByText('Štefan Šimek')).toBeVisible()
    expect(screen.getByTestId('linked-count')).toHaveTextContent('1')
    expect(window.location.search).toBe('?query=simek')
    expect(replaceState).toHaveBeenCalled()
    expect(within(register).getByRole('button', { name: /Odstrániť filter Hľadanie: simek/ })).toBeVisible()

    fireEvent.change(query, { target: { value: 'Šimek' } })
    expect(within(register).getByText('Štefan Šimek')).toBeVisible()

    fireEvent.click(within(register).getByRole('button', { name: 'Vynulovať všetky filtre' }))
    expect(query).toHaveValue('')
    expect(screen.getByTestId('linked-count')).toHaveTextContent(String(legacyRecords.length))
    expect(window.location.search).toBe('')
  })

  it('filtruje každú zdieľanú dimenziu a ponúka iba neprázdne fakulty', () => {
    render(<RegisterHarness />)
    const register = screen.getByRole('region', { name: 'Úplný register profesorských vymenovaní' })
    const reset = () => fireEvent.click(within(register).getByRole('button', { name: 'Vynulovať všetky filtre' }))

    fireEvent.change(within(register).getByLabelText('Prezident'), { target: { value: 'gasparovic' } })
    expect(screen.getByTestId('linked-count')).toHaveTextContent('1')
    reset()

    fireEvent.change(within(register).getByLabelText('Mesto'), { target: { value: 'Bratislava' } })
    expect(screen.getByTestId('linked-count')).toHaveTextContent('1')
    reset()

    fireEvent.change(within(register).getByLabelText('Kanonická inštitúcia'), { target: { value: 'uniba' } })
    expect(screen.getByTestId('linked-count')).toHaveTextContent('1')
    reset()

    const faculty = within(register).getByLabelText('Fakulta')
    expect(within(faculty).queryByRole('option', { name: 'neuvedené' })).not.toBeInTheDocument()
    fireEvent.change(faculty, { target: { value: 'Filozofická fakulta' } })
    expect(screen.getByTestId('linked-count')).toHaveTextContent('1')
    reset()

    const field = within(register).getByLabelText('Odbor')
    expect(within(field).getByRole('option', { name: 'história' })).toHaveValue('historia')
    fireEvent.change(field, { target: { value: 'historia' } })
    expect(
      within(register).getByRole('button', { name: 'Odstrániť filter Odbor: história' }),
    ).toBeVisible()
    expect(screen.getByTestId('linked-count')).toHaveTextContent('1')
    reset()

    fireEvent.change(within(register).getByLabelText('Od roku'), { target: { value: '2010' } })
    fireEvent.change(within(register).getByLabelText('Do roku'), { target: { value: '2010' } })
    expect(screen.getByTestId('linked-count')).toHaveTextContent('1')
  })

  it('ponúka viditeľné mobilné zoradenie so stavom zhodným s hlavičkou tabuľky', () => {
    const { container } = render(<RegisterHarness />)
    const register = screen.getByRole('region', { name: 'Úplný register profesorských vymenovaní' })
    const toolbar = within(register).getByRole('group', { name: 'Zoradenie záznamov' })
    const table = within(register).getByRole('table', { name: 'Záznamy v aktívnom výbere' })
    const mobileColumn = within(toolbar).getByLabelText('Zoradiť záznamy podľa')

    expect(toolbar).toBeVisible()
    expect(mobileColumn).toHaveValue('appointedOn')
    expect(
      within(toolbar).getByRole('button', {
        name: 'Zmeniť smer zoradenia, teraz zostupne',
      }),
    ).toBeVisible()
    expect(container.querySelectorAll('tbody > tr')).toHaveLength(32)

    fireEvent.change(mobileColumn, { target: { value: 'name' } })
    const desktopNameSort = within(table).getByRole('button', { name: 'Zoradiť podľa mena' })
    expect(desktopNameSort.closest('th')).toHaveAttribute('aria-sort', 'ascending')

    fireEvent.click(desktopNameSort)
    expect(mobileColumn).toHaveValue('name')
    expect(
      within(toolbar).getByRole('button', {
        name: 'Zmeniť smer zoradenia, teraz zostupne',
      }),
    ).toBeVisible()
  })

  it('zverejňuje celý zdrojový detail a rozdiely preskúmaného opakovania', () => {
    render(<RegisterHarness />)
    const register = screen.getByRole('region', { name: 'Úplný register profesorských vymenovaní' })
    fireEvent.change(within(register).getByLabelText('Hľadať v záznamoch'), {
      target: { value: 'Štefan Šimek' },
    })
    fireEvent.click(within(register).getByText('Zobraziť detail'))

    const detail = within(register).getByRole('group', { name: 'Detail záznamu Štefan Šimek' })
    const detailRow = detail.closest('tr')
    expect(detailRow).toHaveClass('record-detail-row')
    expect(detailRow?.querySelector('td')).toHaveAttribute('colspan', '6')
    expect(detailRow?.previousElementSibling).toHaveClass('record-row')
    expect(detail).toHaveTextContent('prof. RNDr.')
    expect(detail).toHaveTextContent('CSc.')
    expect(detail).toHaveTextContent('Univerzita Komenského v Bratislave')
    expect(detail).toHaveTextContent('UK v Bratislave')
    expect(detail).toHaveTextContent('neuvedené')
    expect(detail).toHaveTextContent('história')
    expect(detail).toHaveTextContent('25. januára 2010')
    expect(detail).toHaveTextContent('Ivan Gašparovič')
    expect(detail).toHaveTextContent('Zdrojový riadok 2')
    expect(detail).toHaveTextContent('Zdrojový riadok 45')
    expect(detail).toHaveTextContent('Rozdiel oproti ponechanému riadku')
    expect(detail).toHaveTextContent('fakulta')
    expect(detail).toHaveTextContent('inštitúcia')
  })

  it('vytvorí bezpečný filtrovaný CSV súbor až po aktivácii a zruší objektovú URL', () => {
    const createObjectURL = vi.fn((_blob: Blob) => 'blob:profesori')
    const revokeObjectURL = vi.fn((_url: string) => undefined)
    const NativeURL = URL
    class BlobURL extends NativeURL {
      static createObjectURL = createObjectURL
      static revokeObjectURL = revokeObjectURL
    }
    vi.stubGlobal('URL', BlobURL)
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    vi.setSystemTime(new Date('2026-08-29T12:00:00Z'))

    render(<RegisterHarness />)
    const register = screen.getByRole('region', { name: 'Úplný register profesorských vymenovaní' })
    expect(createObjectURL).not.toHaveBeenCalled()

    fireEvent.change(within(register).getByLabelText('Hľadať v záznamoch'), {
      target: { value: 'Šimek' },
    })
    fireEvent.click(within(register).getByRole('button', { name: 'Stiahnuť filtrované CSV' }))

    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(createObjectURL.mock.calls[0]?.[0]).toBeInstanceOf(Blob)
    expect(click).toHaveBeenCalledTimes(1)
    expect(click.mock.instances[0]).toHaveAttribute('download', 'profesori-filter-2026-08-29.csv')
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:profesori')
  })

  it('oznámi chybu serializácie pri chýbajúcich metadátach bez pádu stránky', () => {
    const createObjectURL = vi.fn((_blob: Blob) => 'blob:profesori')
    const revokeObjectURL = vi.fn((_url: string) => undefined)
    const NativeURL = URL
    class BlobURL extends NativeURL {
      static createObjectURL = createObjectURL
      static revokeObjectURL = revokeObjectURL
    }
    vi.stubGlobal('URL', BlobURL)
    const incompleteData: AtlasData = {
      ...legacyData,
      institutions: legacyData.institutions.filter(({ id }) => id !== legacyLookupRecord.institutionId),
    }

    render(<RegisterHarness atlasData={incompleteData} />)
    const register = screen.getByRole('region', { name: 'Úplný register profesorských vymenovaní' })
    fireEvent.click(within(register).getByRole('button', { name: 'Stiahnuť filtrované CSV' }))

    expect(within(register).getByRole('alert')).toHaveTextContent(
      'CSV sa nepodarilo stiahnuť. Skúste to znova.',
    )
    expect(createObjectURL).not.toHaveBeenCalled()
    expect(revokeObjectURL).not.toHaveBeenCalled()
    fireEvent.change(within(register).getByLabelText('Hľadať v záznamoch'), {
      target: { value: 'Šimek' },
    })
    expect(screen.getByTestId('linked-count')).toHaveTextContent('1')
  })

  it('oznámi zlyhanie objektovej URL bez pokusu o jej zrušenie', () => {
    const createObjectURL = vi.fn((_blob: Blob) => {
      throw new Error('object URLs are unavailable')
    })
    const revokeObjectURL = vi.fn((_url: string) => undefined)
    const NativeURL = URL
    class BlobURL extends NativeURL {
      static createObjectURL = createObjectURL
      static revokeObjectURL = revokeObjectURL
    }
    vi.stubGlobal('URL', BlobURL)

    render(<RegisterHarness />)
    const register = screen.getByRole('region', { name: 'Úplný register profesorských vymenovaní' })
    fireEvent.click(within(register).getByRole('button', { name: 'Stiahnuť filtrované CSV' }))

    expect(within(register).getByRole('alert')).toHaveTextContent(
      'CSV sa nepodarilo stiahnuť. Skúste to znova.',
    )
    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).not.toHaveBeenCalled()
  })

  it('pri zlyhaní kliknutia zruší URL a po úspešnom opakovaní odstráni starú chybu', () => {
    const createObjectURL = vi.fn((_blob: Blob) => 'blob:profesori')
    const revokeObjectURL = vi.fn((_url: string) => undefined)
    const NativeURL = URL
    class BlobURL extends NativeURL {
      static createObjectURL = createObjectURL
      static revokeObjectURL = revokeObjectURL
    }
    vi.stubGlobal('URL', BlobURL)
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementationOnce(() => {
        throw new Error('download blocked')
      })
      .mockImplementation(() => undefined)

    render(<RegisterHarness />)
    const register = screen.getByRole('region', { name: 'Úplný register profesorských vymenovaní' })
    const exportButton = within(register).getByRole('button', { name: 'Stiahnuť filtrované CSV' })

    fireEvent.click(exportButton)
    expect(within(register).getByRole('alert')).toHaveTextContent(
      'CSV sa nepodarilo stiahnuť. Skúste to znova.',
    )
    expect(revokeObjectURL).toHaveBeenNthCalledWith(1, 'blob:profesori')

    fireEvent.click(exportButton)
    expect(within(register).queryByRole('alert')).not.toBeInTheDocument()
    expect(click).toHaveBeenCalledTimes(2)
    expect(revokeObjectURL).toHaveBeenNthCalledWith(2, 'blob:profesori')
  })
})
