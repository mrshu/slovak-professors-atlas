import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Appointment, AtlasData } from '../data/types'
import { useAtlasState } from '../state/useAtlasState'
import Explorer from './Explorer'
import Methodology from './Methodology'

const institutions: AtlasData['institutions'] = [
  {
    id: 'uniba',
    shortName: 'UK v Bratislave',
    fullName: 'Univerzita Komenského v Bratislave',
    city: 'Bratislava',
    latitude: 48.1412,
    longitude: 17.1159,
    sourceLabels: ['UK v Bratislave'],
    citationUrl: 'https://www.wikidata.org/wiki/Q159241',
  },
  {
    id: 'tuke',
    shortName: 'TU v Košiciach',
    fullName: 'Technická univerzita v Košiciach',
    city: 'Košice',
    latitude: 48.7314,
    longitude: 21.2447,
    sourceLabels: ['TU v Košiciach'],
    citationUrl: 'https://www.wikidata.org/wiki/Q1366024',
  },
]

function appointment(
  index: number,
  overrides: Partial<Appointment> = {},
): Appointment {
  return {
    id: `appointment-${index}`,
    name: `Profesor ${String(index).padStart(2, '0')}`,
    titlesBefore: 'doc.',
    titlesAfter: 'PhD.',
    faculty: 'Strojnícka fakulta',
    institutionId: 'tuke',
    institutionSource: 'TU v Košiciach',
    field: 'robotika',
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
  }
}

const lookupRecord = appointment(0, {
  id: 'stefan-simek',
  name: 'Štefan Šimek',
  titlesBefore: 'prof. RNDr.',
  titlesAfter: 'CSc.',
  faculty: null,
  institutionId: 'uniba',
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

const records = [
  lookupRecord,
  appointment(1, { faculty: 'Filozofická fakulta' }),
  ...Array.from({ length: 28 }, (_, index) => appointment(index + 2)),
]

const data: AtlasData = {
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
    graduates_by_field_2025: {
      url: 'https://www.cvtisr.sk/buxus/docs//JC/ROCENKA/VS/abvs_2.xls',
      catalogUrl:
        'https://www.cvtisr.sk/cvti-sr-vedecka-kniznica/informacie-o-skolstve/statistiky/statisticka-rocenka-publikacia/statisticka-rocenka-vysoke-skoly.html?page_id=9596',
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
  records,
  institutions,
  cities: [
    { name: 'Bratislava', institutionIds: ['uniba'] },
    { name: 'Košice', institutionIds: ['tuke'] },
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
  fieldGraduateComparison: {
    schemaVersion: 1,
    year: 2025,
    source: {
      url: 'https://www.cvtisr.sk/buxus/docs//JC/ROCENKA/VS/abvs_2.xls',
      catalogUrl:
        'https://www.cvtisr.sk/cvti-sr-vedecka-kniznica/informacie-o-skolstve/statistiky/statisticka-rocenka-publikacia/statisticka-rocenka-vysoke-skoly.html?page_id=9596',
      sha256: '2bfc9bf67bcf7c1d4ed5e80296d498f634a9c8c9b949bf70f839a9bf90ba7729',
      retrievedOn: '2026-08-29',
    },
    appointmentCount: 0,
    matchedAppointmentCount: 0,
    matchedAppointmentShare: 0,
    distinctFieldCount: 0,
    matchedDistinctFieldCount: 0,
    rows: [],
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

function ExplorerHarness({ atlasData = data }: { atlasData?: AtlasData }) {
  const atlasState = useAtlasState(atlasData)
  return (
    <>
      <output data-testid="linked-count">{atlasState.filteredRecords.length}</output>
      <Explorer data={atlasData} atlasState={atlasState} />
    </>
  )
}

beforeEach(() => {
  window.history.replaceState({}, '', '/')
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('úplný register', () => {
  it('vyhľadáva okamžite bez ohľadu na diakritiku, zapisuje URL cez replace a vynuluje celý výber', () => {
    const replaceState = vi.spyOn(window.history, 'replaceState')
    render(<ExplorerHarness />)

    const explorer = screen.getByRole('region', { name: 'Úplný register profesorských vymenovaní' })
    const query = within(explorer).getByLabelText('Hľadať v záznamoch')

    fireEvent.change(query, { target: { value: 'simek' } })

    expect(within(explorer).getByText('Štefan Šimek')).toBeVisible()
    expect(screen.getByTestId('linked-count')).toHaveTextContent('1')
    expect(window.location.search).toBe('?query=simek')
    expect(replaceState).toHaveBeenCalled()
    expect(within(explorer).getByRole('button', { name: /Odstrániť filter Hľadanie: simek/ })).toBeVisible()

    fireEvent.change(query, { target: { value: 'Šimek' } })
    expect(within(explorer).getByText('Štefan Šimek')).toBeVisible()

    fireEvent.click(within(explorer).getByRole('button', { name: 'Vynulovať všetky filtre' }))
    expect(query).toHaveValue('')
    expect(screen.getByTestId('linked-count')).toHaveTextContent(String(records.length))
    expect(window.location.search).toBe('')
  })

  it('filtruje každú zdieľanú dimenziu a ponúka iba neprázdne fakulty', () => {
    render(<ExplorerHarness />)
    const explorer = screen.getByRole('region', { name: 'Úplný register profesorských vymenovaní' })
    const reset = () => fireEvent.click(within(explorer).getByRole('button', { name: 'Vynulovať všetky filtre' }))

    fireEvent.change(within(explorer).getByLabelText('Prezident'), { target: { value: 'gasparovic' } })
    expect(screen.getByTestId('linked-count')).toHaveTextContent('1')
    reset()

    fireEvent.change(within(explorer).getByLabelText('Mesto'), { target: { value: 'Bratislava' } })
    expect(screen.getByTestId('linked-count')).toHaveTextContent('1')
    reset()

    fireEvent.change(within(explorer).getByLabelText('Kanonická inštitúcia'), { target: { value: 'uniba' } })
    expect(screen.getByTestId('linked-count')).toHaveTextContent('1')
    reset()

    const faculty = within(explorer).getByLabelText('Fakulta')
    expect(within(faculty).queryByRole('option', { name: 'neuvedené' })).not.toBeInTheDocument()
    fireEvent.change(faculty, { target: { value: 'Filozofická fakulta' } })
    expect(screen.getByTestId('linked-count')).toHaveTextContent('1')
    reset()

    fireEvent.change(within(explorer).getByLabelText('Odbor'), { target: { value: 'historia' } })
    expect(screen.getByTestId('linked-count')).toHaveTextContent('1')
    reset()

    fireEvent.change(within(explorer).getByLabelText('Od roku'), { target: { value: '2010' } })
    fireEvent.change(within(explorer).getByLabelText('Do roku'), { target: { value: '2010' } })
    expect(screen.getByTestId('linked-count')).toHaveTextContent('1')
  })

  it('stránkuje po 25 záznamoch, radí tlačidlami a ukazuje prázdny výsledok', () => {
    const { container } = render(<ExplorerHarness />)
    const explorer = screen.getByRole('region', { name: 'Úplný register profesorských vymenovaní' })
    const table = within(explorer).getByRole('table', { name: 'Záznamy v aktívnom výbere' })

    expect(within(table).getByText('Meno', { selector: 'th button span:first-child' })).toBeVisible()
    expect(container.querySelectorAll('tbody > tr')).toHaveLength(25)
    expect(within(explorer).getByText('Strana 1 z 2')).toBeVisible()

    const nameSort = within(table).getByRole('button', { name: 'Zoradiť podľa mena' })
    fireEvent.click(nameSort)
    expect(nameSort.closest('th')).toHaveAttribute('aria-sort', 'ascending')
    fireEvent.click(nameSort)
    expect(nameSort.closest('th')).toHaveAttribute('aria-sort', 'descending')

    fireEvent.click(within(explorer).getByRole('button', { name: 'Nasledujúca strana' }))
    expect(container.querySelectorAll('tbody > tr')).toHaveLength(5)
    expect(within(explorer).getByText('Strana 2 z 2')).toBeVisible()

    fireEvent.change(within(explorer).getByLabelText('Hľadať v záznamoch'), {
      target: { value: 'nikto taký' },
    })
    expect(within(explorer).getByText('Výberu nezodpovedá nijaký záznam.')).toBeVisible()
    expect(container.querySelectorAll('tbody > tr')).toHaveLength(0)
  })

  it('ponúka viditeľné mobilné zoradenie so stavom zhodným s hlavičkou tabuľky', () => {
    const { container } = render(<ExplorerHarness />)
    const explorer = screen.getByRole('region', { name: 'Úplný register profesorských vymenovaní' })
    const toolbar = within(explorer).getByRole('group', { name: 'Zoradenie záznamov' })
    const table = within(explorer).getByRole('table', { name: 'Záznamy v aktívnom výbere' })
    const mobileColumn = within(toolbar).getByLabelText('Zoradiť záznamy podľa')

    expect(toolbar).toBeVisible()
    expect(mobileColumn).toHaveValue('appointedOn')
    expect(
      within(toolbar).getByRole('button', {
        name: 'Zmeniť smer zoradenia, teraz zostupne',
      }),
    ).toBeVisible()
    expect(container.querySelectorAll('tbody > tr')).toHaveLength(25)

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
    render(<ExplorerHarness />)
    const explorer = screen.getByRole('region', { name: 'Úplný register profesorských vymenovaní' })
    fireEvent.change(within(explorer).getByLabelText('Hľadať v záznamoch'), {
      target: { value: 'Štefan Šimek' },
    })
    fireEvent.click(within(explorer).getByText('Zobraziť detail'))

    const detail = within(explorer).getByRole('group', { name: 'Detail záznamu Štefan Šimek' })
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

    render(<ExplorerHarness />)
    const explorer = screen.getByRole('region', { name: 'Úplný register profesorských vymenovaní' })
    expect(createObjectURL).not.toHaveBeenCalled()

    fireEvent.change(within(explorer).getByLabelText('Hľadať v záznamoch'), {
      target: { value: 'Šimek' },
    })
    fireEvent.click(within(explorer).getByRole('button', { name: 'Stiahnuť filtrované CSV' }))

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
      ...data,
      institutions: data.institutions.filter(({ id }) => id !== lookupRecord.institutionId),
    }

    render(<ExplorerHarness atlasData={incompleteData} />)
    const explorer = screen.getByRole('region', { name: 'Úplný register profesorských vymenovaní' })
    fireEvent.click(within(explorer).getByRole('button', { name: 'Stiahnuť filtrované CSV' }))

    expect(within(explorer).getByRole('alert')).toHaveTextContent(
      'CSV sa nepodarilo stiahnuť. Skúste to znova.',
    )
    expect(createObjectURL).not.toHaveBeenCalled()
    expect(revokeObjectURL).not.toHaveBeenCalled()
    fireEvent.change(within(explorer).getByLabelText('Hľadať v záznamoch'), {
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

    render(<ExplorerHarness />)
    const explorer = screen.getByRole('region', { name: 'Úplný register profesorských vymenovaní' })
    fireEvent.click(within(explorer).getByRole('button', { name: 'Stiahnuť filtrované CSV' }))

    expect(within(explorer).getByRole('alert')).toHaveTextContent(
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

    render(<ExplorerHarness />)
    const explorer = screen.getByRole('region', { name: 'Úplný register profesorských vymenovaní' })
    const exportButton = within(explorer).getByRole('button', { name: 'Stiahnuť filtrované CSV' })

    fireEvent.click(exportButton)
    expect(within(explorer).getByRole('alert')).toHaveTextContent(
      'CSV sa nepodarilo stiahnuť. Skúste to znova.',
    )
    expect(revokeObjectURL).toHaveBeenNthCalledWith(1, 'blob:profesori')

    fireEvent.click(exportButton)
    expect(within(explorer).queryByRole('alert')).not.toBeInTheDocument()
    expect(click).toHaveBeenCalledTimes(2)
    expect(revokeObjectURL).toHaveBeenNthCalledWith(2, 'blob:profesori')
  })

  it('reštartuje 150 ms odklad pri každej zmene dopytu aj pri rovnakom počte', () => {
    vi.useFakeTimers()
    render(<ExplorerHarness />)
    const explorer = screen.getByRole('region', { name: 'Úplný register profesorských vymenovaní' })
    const query = within(explorer).getByLabelText('Hľadať v záznamoch')
    const announcement = within(explorer).getByRole('status')

    fireEvent.change(query, { target: { value: 'sime' } })
    expect(within(explorer).getByText('1 vymenovanie').parentElement).toHaveTextContent(
      '1 vymenovanie vo výbere',
    )
    expect(announcement).toHaveTextContent('30 vymenovaní vo výbere')

    act(() => vi.advanceTimersByTime(100))
    fireEvent.change(query, { target: { value: 'simek' } })
    expect(within(explorer).getByText('Štefan Šimek')).toBeVisible()
    expect(window.location.search).toBe('?query=simek')

    act(() => vi.advanceTimersByTime(149))
    expect(announcement).toHaveTextContent('30 vymenovaní vo výbere')
    act(() => vi.advanceTimersByTime(1))
    expect(announcement).toHaveTextContent('1 vymenovanie vo výbere')
  })
})

describe('metodika a pramene', () => {
  it('uvádza úplnú provenienciu, obmedzenia a vylúčenie bibliometrie', () => {
    const methodologyData = {
      ...data,
      presidents: data.presidents.map((president) => ({
        ...president,
        citationUrl:
          president.id === 'pellegrini'
            ? 'https://www.prezident.sk/zivotopis-petra-pellegriniho'
            : `https://example.test/presidential-terms/${president.id}`,
      })),
    }
    render(<Methodology data={methodologyData} />)
    const methodology = screen.getByRole('region', { name: 'Metodika a pramene' })

    expect(methodology).toHaveTextContent(/2[\s ]419/)
    expect(methodology).toHaveTextContent(/2[\s ]378/)
    expect(methodology).toHaveTextContent('41')
    expect(within(methodology).getByRole('link', { name: 'Oficiálna stránka zoznamu profesorov' })).toHaveAttribute(
      'href',
      'https://www.minedu.sk/profesori-vysokych-skol/',
    )
    expect(within(methodology).getByRole('link', { name: 'Oficiálna stránka časových radov CVTI SR' })).toHaveAttribute(
      'href',
      'https://www.cvtisr.sk/cvti-sr-vedecka-kniznica/informacie-o-skolstve/statistiky/casove-rady.html?page_id=9724',
    )
    expect(within(methodology).getByRole('link', { name: 'Uložený zoznam profesorov (XLS)' })).toHaveAttribute(
      'href',
      '/data/source/professors.xls',
    )
    expect(within(methodology).getByRole('link', { name: 'Uložený rad CVTI (XLS)' })).toHaveAttribute(
      'href',
      '/data/source/higher-education.xls',
    )
    expect(methodology).toHaveTextContent(data.sources.professors.sha256)
    expect(methodology).toHaveTextContent(data.sources.higher_education.sha256)
    expect(methodology).toHaveTextContent('3. júna 2026')
    expect(methodology).toHaveTextContent(/vymenovania aj absolventi sú ročné toky/i)
    expect(methodology).toHaveTextContent(/študenti a interní učitelia sú stavom k 31\. októbru/i)
    expect(
      within(methodology).getByRole('link', {
        name: 'Katalóg DATAcube Štatistického úradu SR',
      }),
    ).toHaveAttribute('href', data.sources.population.catalogUrl)
    expect(methodology).toHaveTextContent(data.sources.population.sha256)
    expect(methodology).toHaveTextContent(/stredný stav obyvateľstva.*30\. júna.*1\. júla/i)
    expect(methodology).toHaveTextContent(/ORCID ani rovnocenný stabilný vedecký identifikátor/i)
    expect(methodology).toHaveTextContent(/párovanie iba podľa mena nie je bezpečné/i)
    expect(methodology).toHaveTextContent(/normalizované podľa odboru aj roku publikovania/i)
    expect(methodology).toHaveTextContent(/ručne preskúmané identifikátory autorov OpenAlex/i)
    expect(within(methodology).queryByRole('button', { name: /citáci/i })).not.toBeInTheDocument()
    expect(within(methodology).getByRole('link', { name: /Oficiálne obdobie: Ivan Gašparovič/ })).toHaveAttribute(
      'href',
      'https://example.test/presidential-terms/gasparovic',
    )
    expect(within(methodology).getByRole('link', { name: /Oficiálne obdobie: Peter Pellegrini/ })).toHaveAttribute(
      'href',
      'https://www.prezident.sk/zivotopis-petra-pellegriniho',
    )
    expect(within(methodology).getByRole('link', { name: /Wikidata: Univerzita Komenského/ })).toHaveAttribute(
      'href',
      institutions[0]?.citationUrl,
    )
    expect(within(methodology).getByRole('link', { name: 'Geometria Natural Earth' })).toHaveAttribute(
      'href',
      data.geography.properties.sourceUrl,
    )
  })
})
