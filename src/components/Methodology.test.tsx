import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import type { Appointment, AtlasData } from '../data/types'
import { normalizeForSearch } from '../utils/search'
import Methodology from './Methodology'

const institutions: AtlasData['institutions'] = [
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

function appointment(
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

const lookupRecord = appointment(0, {
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

afterEach(() => {
  cleanup()
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
      records: [
        ...data.records,
        appointment(99, {
          id: 'unresolved-location',
          affiliationId: 'unresolved-location',
        }),
      ],
      affiliations: [
        ...data.affiliations,
        {
          id: 'unresolved-location',
          institutionId: 'tuke',
          facultyKeys: [],
          status: 'unresolved' as const,
          city: null,
          sourceUrl: 'https://example.test/unresolved-location',
          sourceLabel: 'Nevyriešené pracovisko',
          note: 'Zdroj neurčuje pracovisko.',
        },
      ],
    }
    render(<Methodology data={methodologyData} />)
    const methodology = screen.getByRole('region', { name: 'Metodika a pramene' })

    expect(methodology).toHaveTextContent(/2[\s ]419/)
    expect(methodology).toHaveTextContent(/2[\s ]378/)
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
    expect(methodology).toHaveTextContent(
      /Pomer sa počíta pre jeden recenzovaný kľúč odboru a neplatí pre nič širšie/i,
    )
    expect(methodology).toHaveTextContent(/menovateľ pomeru je potom malý/i)
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
    expect(
      within(methodology).getByRole('link', {
        name: 'Kanonická inštitúcia: Univerzita Komenského v Bratislave',
      }),
    ).toHaveAttribute('href', institutions[0]?.citationUrl)
    expect(methodology).toHaveTextContent(/bez polohy 1 vymenovanie/i)
    expect(within(methodology).getByRole('link', { name: 'Nevyriešené pracovisko' })).toHaveAttribute(
      'href',
      'https://example.test/unresolved-location',
    )
    expect(within(methodology).getByRole('link', { name: 'Geometria Natural Earth' })).toHaveAttribute(
      'href',
      data.geography.properties.sourceUrl,
    )
  })
})
