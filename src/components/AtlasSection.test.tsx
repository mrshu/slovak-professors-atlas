import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import type * as D3Geo from 'd3-geo'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Appointment, AtlasData, Institution } from '../data/types'
import { useAtlasState } from '../state/useAtlasState'
import AtlasSection from './AtlasSection'

const { projectPointSpy } = vi.hoisted(() => ({
  projectPointSpy: vi.fn(),
}))

vi.mock('d3-geo', async (importOriginal) => {
  const actual = await importOriginal<typeof D3Geo>()

  return {
    ...actual,
    geoMercator: () => {
      const projection = actual.geoMercator()

      return new Proxy(projection, {
        apply(target, thisArg, args) {
          projectPointSpy(...args)
          return Reflect.apply(target, thisArg, args)
        },
        get(target, property, receiver) {
          const value = Reflect.get(target, property, target)
          if (typeof value !== 'function') {
            return value
          }

          return (...args: unknown[]) => {
            const result = Reflect.apply(value, target, args)
            return result === target ? receiver : result
          }
        },
      })
    },
  }
})


const institutions: Institution[] = [
  {
    id: 'uniba',
    shortName: 'UK v Bratislave',
    fullName: 'Univerzita Komenského v Bratislave',
    city: 'Bratislava',
    latitude: 48.1412,
    longitude: 17.1159,
    sourceLabels: ['UK v Bratislave'],
    citationUrl: 'https://example.test/uniba',
  },
  {
    id: 'tuke',
    shortName: 'TU v Košiciach',
    fullName: 'Technická univerzita v Košiciach',
    city: 'Košice',
    latitude: 48.7314,
    longitude: 21.2447,
    sourceLabels: ['TU v Košiciach'],
    citationUrl: 'https://example.test/tuke',
  },
  {
    id: 'au',
    shortName: 'AU v Banskej Bystrici',
    fullName: 'Akadémia umení v Banskej Bystrici',
    city: 'Banská Bystrica',
    latitude: 48.7361,
    longitude: 19.1461,
    sourceLabels: ['AU v Banskej Bystrici'],
    citationUrl: 'https://example.test/au',
  },
]

function appointment(
  overrides: Partial<Appointment> & Pick<Appointment, 'id' | 'institutionId' | 'appointedOn'>,
): Appointment {
  const institution = institutions.find(({ id }) => id === overrides.institutionId)
  return {
    name: `Profesor ${overrides.id}`,
    titlesBefore: null,
    titlesAfter: null,
    faculty: 'Lekárska fakulta',
    institutionSource: institution?.shortName ?? overrides.institutionId,
    field: 'odbor',
    presidentId: 'caputova',
    sourceVariants: [],
    ...overrides,
  }
}

const records: Appointment[] = [
  appointment({
    id: 'u1',
    institutionId: 'uniba',
    faculty: 'Lekárska fakulta',
    appointedOn: '2023-01-01',
  }),
  appointment({
    id: 'u2',
    institutionId: 'uniba',
    faculty: null,
    appointedOn: '2023-01-01',
  }),
  appointment({
    id: 't1',
    institutionId: 'tuke',
    faculty: 'Strojnícka fakulta',
    appointedOn: '2023-01-11',
  }),
  appointment({
    id: 'a1',
    institutionId: 'au',
    faculty: 'Fakulta umení',
    appointedOn: '2023-01-31',
  }),
  appointment({
    id: 't2',
    institutionId: 'tuke',
    faculty: 'Fakulta baníctva',
    appointedOn: '2024-06-20',
    presidentId: 'pellegrini',
  }),
]

const data = {
  meta: {
    schemaVersion: 1,
    sourceRowCount: 5,
    duplicateSourceRowCount: 0,
    analyticalAppointmentCount: 5,
    ceremonyCount: 4,
    appointmentDateMin: '2000-02-22',
    appointmentDateMax: '2026-06-03',
  },
  records,
  institutions,
  cities: [
    { name: 'Banská Bystrica', institutionIds: ['au'] },
    { name: 'Bratislava', institutionIds: ['uniba'] },
    { name: 'Košice', institutionIds: ['tuke'] },
  ],
  presidents: [
    { id: 'schuster', name: 'Rudolf Schuster', from: '1999-06-15', to: '2004-06-15' },
    { id: 'gasparovic', name: 'Ivan Gašparovič', from: '2004-06-15', to: '2014-06-15' },
    { id: 'kiska', name: 'Andrej Kiska', from: '2014-06-15', to: '2019-06-15' },
    { id: 'caputova', name: 'Zuzana Čaputová', from: '2019-06-15', to: '2024-06-15' },
    { id: 'pellegrini', name: 'Peter Pellegrini', from: '2024-06-15', to: null },
  ],
  context: [{ year: 2025 }],
  geography: {
    type: 'Feature',
    bbox: [16.84448, 47.750006, 22.539637, 49.60178],
    properties: {
      ADM0_A3: 'SVK',
      ADMIN: 'Slovakia',
      ISO_A2: 'SK',
      ISO_A3: 'SVK',
      NAME: 'Slovakia',
      NAME_EN: 'Slovakia',
      license: 'Public domain',
      licenseUrl: 'https://example.test/license',
      simplificationTolerance: 0.01,
      source: 'Natural Earth',
      sourceDataset: 'fixture',
      sourceUrl: 'https://example.test/geography',
    },
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [16.84448, 47.750006],
          [22.539637, 47.750006],
          [22.539637, 49.60178],
          [16.84448, 49.60178],
          [16.84448, 47.750006],
        ],
      ],
    },
  },
} as unknown as AtlasData

function AtlasHarness() {
  const atlasState = useAtlasState(data)
  return <AtlasSection data={data} atlasState={atlasState} />
}


function metricValue(cardName: string, metricName: string): string {
  const card = screen.getByRole('article', { name: cardName })
  const term = within(card).getByText(metricName, { selector: 'dt' })
  return term.parentElement?.querySelector('dd')?.textContent ?? ''
}

function keyboardActivate(button: HTMLElement, key: 'Enter' | ' ') {
  fireEvent.keyDown(button, { key, code: key === 'Enter' ? 'Enter' : 'Space' })
  fireEvent.keyUp(button, { key, code: key === 'Enter' ? 'Enter' : 'Space' })
  fireEvent.click(button, { detail: 0 })
}

beforeEach(() => {
  window.history.replaceState(null, '', '/slovak-professors/index.html')
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('AtlasSection linked selection', () => {
  it('filters every view from city and institution native-button actions and expands missing faculties', () => {
    render(<AtlasHarness />)

    expect(screen.getByRole('status')).toHaveTextContent('5 vymenovaní v aktívnom výbere')

    const city = screen.getByRole('button', {
      name: 'Bratislava: 2 vymenovania, nevybrané',
    })
    expect(city.tagName).toBe('BUTTON')
    fireEvent.click(city)

    expect(screen.getByRole('status')).toHaveTextContent('2 vymenovania v aktívnom výbere')
    expect(
      screen.getByRole('button', { name: 'Bratislava: 2 vymenovania, vybrané' }),
    ).toHaveAttribute('aria-pressed', 'true')
    expect(
      screen.getByRole('button', { name: 'UK v Bratislave: 2 vymenovania, nevybrané' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /TU v Košiciach:/ })).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Odstrániť filter Mesto: Bratislava' }),
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', { name: 'Bratislava: 2 vymenovania, vybrané' }),
    )
    const institution = screen.getByRole('button', {
      name: 'UK v Bratislave: 2 vymenovania, nevybrané',
    })
    expect(institution.tagName).toBe('BUTTON')
    fireEvent.click(institution)

    expect(screen.getByRole('heading', { name: 'Fakulty UK v Bratislave' })).toBeInTheDocument()
    expect(screen.getByText('Lekárska fakulta')).toBeInTheDocument()
    expect(screen.getByText('neuvedené')).toBeInTheDocument()
    expect(screen.getAllByText('1', { selector: '.institution-ranking__faculty-count' })).toHaveLength(2)
  })

  it('applies and clears timeline years atomically while context-year history stays independent', () => {
    render(<AtlasHarness />)

    const year = screen.getByRole('button', {
      name: 'Rok 2023: 4 vymenovania, nevybrané',
    })
    fireEvent.click(year)

    expect(screen.getByRole('status')).toHaveTextContent('4 vymenovania v aktívnom výbere')
    expect(
      screen.getByRole('button', { name: 'Rok 2023: 4 vymenovania, vybrané' }),
    ).toHaveAttribute('aria-pressed', 'true')
    const selectedYear = screen.getByRole('button', {
      name: 'Rok 2023: 4 vymenovania, vybrané',
    }).closest('.appointment-timeline__year')
    expect(selectedYear).toHaveClass('appointment-timeline__year--selected')
    expect(selectedYear?.querySelector('.appointment-timeline__selection-outline')).toBeInTheDocument()
    expect(
      screen
        .getByRole('button', { name: 'Rok 2024: 0 vymenovaní, nevybrané' })
        .closest('.appointment-timeline__year')
        ?.querySelector('.appointment-timeline__selection-outline'),
    ).not.toBeInTheDocument()
    expect(Array.from(new URLSearchParams(window.location.search).entries())).toEqual([
      ['startYear', '2023'],
      ['endYear', '2023'],
      ['selectedYear', '2023'],
    ])

    fireEvent.click(screen.getByRole('button', { name: 'Rok 2023: 4 vymenovania, vybrané' }))
    expect(screen.getByRole('status')).toHaveTextContent('5 vymenovaní v aktívnom výbere')
    expect(window.location.search).toBe('')
  })

  it('pushes president and date controls, filters map and timeline, and resets actual active state', () => {
    const pushState = vi.spyOn(window.history, 'pushState')
    render(<AtlasHarness />)

    fireEvent.change(screen.getByRole('combobox', { name: 'Prezident' }), {
      target: { value: 'caputova' },
    })
    expect(pushState).toHaveBeenCalled()
    expect(window.location.search).toBe('?presidentId=caputova')
    expect(screen.getByRole('status')).toHaveTextContent('4 vymenovania v aktívnom výbere')
    expect(
      screen.getByRole('button', { name: 'Košice: 1 vymenovanie, nevybrané' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: 'Slávnosť 20. júna 2024: 1 vymenovanie' })).not.toBeInTheDocument()

    fireEvent.change(screen.getByRole('combobox', { name: 'Od roku' }), {
      target: { value: '2022' },
    })
    expect(new URLSearchParams(window.location.search).get('startYear')).toBe('2022')
    expect(screen.getByRole('button', { name: 'Vynulovať všetky filtre' })).toBeEnabled()

    fireEvent.click(screen.getByRole('button', { name: 'Vynulovať všetky filtre' }))
    expect(screen.getByRole('combobox', { name: 'Prezident' })).toHaveValue('')
    expect(screen.getByRole('combobox', { name: 'Od roku' })).toHaveValue('2000')
    expect(screen.getByRole('status')).toHaveTextContent('5 vymenovaní v aktívnom výbere')
    expect(screen.getByRole('button', { name: 'Vynulovať všetky filtre' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: /Odstrániť filter/ })).not.toBeInTheDocument()
  })

  it('treats Enter and Space activation like pointer clicks on native linked controls', () => {
    render(<AtlasHarness />)

    const city = screen.getByRole('button', {
      name: 'Bratislava: 2 vymenovania, nevybrané',
    })
    keyboardActivate(city, 'Enter')
    expect(screen.getByRole('status')).toHaveTextContent('2 vymenovania v aktívnom výbere')

    keyboardActivate(
      screen.getByRole('button', { name: 'Bratislava: 2 vymenovania, vybrané' }),
      ' ',
    )
    keyboardActivate(
      screen.getByRole('button', { name: 'UK v Bratislave: 2 vymenovania, nevybrané' }),
      ' ',
    )
    expect(screen.getByRole('heading', { name: 'Fakulty UK v Bratislave' })).toBeInTheDocument()
  })
})

describe('AtlasSection visual and analytical contracts', () => {
  it('renders committed geography, minimum visible city marks, 44px targets, annual bars, bands, and exact labels', () => {
    render(<AtlasHarness />)

    expect(screen.getByTestId('slovakia-outline')).toHaveAttribute('d')
    const mark = screen.getByTestId('city-mark-Bratislava')
    const radius = Number(mark.getAttribute('r'))
    const target = screen.getByRole('button', {
      name: 'Bratislava: 2 vymenovania, nevybrané',
    }).parentElement
    const targetWidth = Number(target?.getAttribute('width'))
    const targetHeight = Number(target?.getAttribute('height'))
    expect(radius).toBe(29)
    expect(targetWidth).toBe(Math.max(44, 2 * radius))
    expect(targetHeight).toBe(Math.max(44, 2 * radius))
    expect(Number(target?.getAttribute('x')) + targetWidth / 2).toBe(Number(mark.getAttribute('cx')))
    expect(Number(target?.getAttribute('y')) + targetHeight / 2).toBe(Number(mark.getAttribute('cy')))
    expect(screen.getAllByRole('button', { name: /^Rok / })).toHaveLength(27)
    expect(
      screen.getByRole('button', {
        name: 'Rok 2026: 0 vymenovaní, nevybrané. Neúplný rok.',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: 'Slávnosť 1. januára 2023: 2 vymenovania' }),
    ).toHaveAttribute('tabindex', '0')
    expect(
      screen.getByRole('img', {
        name: 'Prezidentské obdobie Zuzana Čaputová: od 15. júna 2019 do 15. júna 2024, koniec sa nezapočítava',
      }),
    ).toBeInTheDocument()
  })

  it('does not project fixed city coordinates again when record filters change', () => {
    render(<AtlasHarness />)
    projectPointSpy.mockClear()

    fireEvent.click(
      screen.getByRole('button', { name: 'Bratislava: 2 vymenovania, nevybrané' }),
    )

    expect(projectPointSpy).not.toHaveBeenCalled()
  })

  it('derives cadence, breadth, concentration, and leader from the same year-filtered cohort', () => {
    render(<AtlasHarness />)
    fireEvent.click(
      screen.getByRole('button', { name: 'Rok 2023: 4 vymenovania, nevybrané' }),
    )

    expect(metricValue('Rytmus slávností', 'Počet slávností')).toBe('3')
    expect(metricValue('Rytmus slávností', 'Medián dávky')).toBe('1')
    expect(metricValue('Rytmus slávností', 'Najväčšia dávka')).toBe('2')
    expect(metricValue('Rytmus slávností', 'Medián rozostupu')).toBe('15 dní')
    expect(metricValue('Akademická šírka', 'Mestá')).toBe('3')
    expect(metricValue('Akademická šírka', 'Inštitúcie')).toBe('3')
    expect(metricValue('Akademická šírka', 'Fakulty s názvom')).toBe('3')
    expect(metricValue('Koncentrácia inštitúcií', 'Podiel prvých troch')).toBe('100 %')
    expect(metricValue('Vedúca inštitúcia', 'Inštitúcia')).toBe('UK v Bratislave')
    expect(metricValue('Vedúca inštitúcia', 'Vymenovania')).toBe('2 z 4')
  })

  it('defines one-ceremony and empty-cohort lens behavior without quality claims', () => {
    render(<AtlasHarness />)

    fireEvent.click(
      screen.getByRole('button', { name: 'Bratislava: 2 vymenovania, nevybrané' }),
    )
    expect(metricValue('Rytmus slávností', 'Počet slávností')).toBe('1')
    expect(metricValue('Rytmus slávností', 'Medián dávky')).toBe('2')
    expect(metricValue('Rytmus slávností', 'Medián rozostupu')).toBe('—')
    expect(screen.getByText('Pri jedinej slávnosti sa medián rozostupu neurčuje.')).toBeInTheDocument()

    fireEvent.change(screen.getByRole('combobox', { name: 'Prezident' }), {
      target: { value: 'schuster' },
    })
    expect(screen.getByRole('status')).toHaveTextContent('0 vymenovaní v aktívnom výbere')
    expect(metricValue('Rytmus slávností', 'Medián dávky')).toBe('—')
    expect(metricValue('Rytmus slávností', 'Najväčšia dávka')).toBe('0')
    expect(metricValue('Koncentrácia inštitúcií', 'Podiel prvých troch')).toBe('—')
    expect(metricValue('Vedúca inštitúcia', 'Inštitúcia')).toBe('Žiadna inštitúcia')
    expect(
      screen.getByText('Pri prázdnom výbere sa mediány dávky a rozostupu neurčujú.'),
    ).toBeInTheDocument()
    expect(screen.getByText(/opisuje rozdelenie vymenovaní, nie kvalitu/)).toBeInTheDocument()
  })
})
