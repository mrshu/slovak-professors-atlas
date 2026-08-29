import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ComponentProps } from 'react'

import type {
  Appointment,
  FieldGraduateComparison as FieldGraduateComparisonData,
} from '../data/types'
import FieldGraduateComparison from './FieldGraduateComparison'


const comparison: FieldGraduateComparisonData = {
  schemaVersion: 1,
  year: 2025,
  source: {
    url: 'https://www.cvtisr.sk/buxus/docs//JC/ROCENKA/VS/abvs_2.xls',
    catalogUrl: 'https://www.cvtisr.sk/catalog',
    sha256: '2bfc9bf67bcf7c1d4ed5e80296d498f634a9c8c9b949bf70f839a9bf90ba7729',
    retrievedOn: '2026-08-29',
  },
  appointmentCount: 55,
  matchedAppointmentCount: 47,
  matchedAppointmentShare: 85.45,
  distinctFieldCount: 46,
  matchedDistinctFieldCount: 39,
  rows: [
    {
      field: 'strojárske technológie a materiály',
      appointmentCount: 4,
      graduateCount: 17,
      graduatesPerAppointment: 4.25,
      matchStatus: 'exact',
    },
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
}

function appointment(id: string, field: string, appointedOn: string): Appointment {
  return {
    id,
    name: id,
    titlesBefore: null,
    titlesAfter: null,
    faculty: null,
    institutionId: 'uniba',
    affiliationId: 'uniba-default',
    institutionSource: 'UK',
    field,
    appointedOn,
    presidentId: 'caputova',
    sourceVariants: [],
  }
}

const allRecords = [
  appointment('psych-2000', 'Psychológia', '2000-02-22'),
  appointment('psych-2010', 'Psychológia', '2010-05-12'),
  appointment('psych-variant', ' psychologia ', '2015-05-12'),
  appointment('micro-2025', 'mikrobiológia', '2025-05-12'),
  appointment('history-2023', 'história', '2023-05-12'),
]
const comparisonRecords = [allRecords[0], allRecords[3], allRecords[4]].filter(
  (record): record is Appointment => record !== undefined,
)

function renderComparison(
  props: Partial<ComponentProps<typeof FieldGraduateComparison>> = {},
) {
  const onFieldSelect = props.onFieldSelect ?? vi.fn()
  const view = render(
    <FieldGraduateComparison
      comparison={comparison}
      allRecords={allRecords}
      comparisonRecords={comparisonRecords}
      selectedField={null}
      onFieldSelect={onFieldSelect}
      {...props}
    />,
  )
  return { ...view, onFieldSelect }
}

beforeEach(() => {
  vi.stubEnv('BASE_URL', '/slovak-professors/')
})

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
})

describe('FieldGraduateComparison', () => {
  it('renders the exact 2025 coverage, every matched and unmatched field row, and ratios', () => {
    renderComparison()

    const section = screen.getByRole('region', {
      name: 'Odbory vymenovaní a absolventi v roku 2025',
    })
    expect(section).toHaveTextContent('Snapshot kalendárneho roka 2025')
    expect(section).toHaveTextContent('47 z 55')
    expect(section).toHaveTextContent('85,45 %')
    expect(section).toHaveTextContent('39 zo 46 odborov')

    const tableRegion = within(section).getByRole('region', {
      name: 'Porovnávacia tabuľka odborov v roku 2025',
    })
    expect(tableRegion).toHaveAttribute('tabindex', '0')
    const rows = within(tableRegion).getAllByRole('row')
    expect(rows).toHaveLength(comparison.rows.length + 1)

    const matched = within(tableRegion).getByText('strojárske technológie a materiály').closest('tr')
    expect(matched).toHaveTextContent('4')
    expect(matched).toHaveTextContent('17')
    expect(matched).toHaveTextContent('4,25')

    const unmatched = within(tableRegion).getByText('mikrobiológia').closest('tr')
    expect(unmatched).toHaveTextContent('bez presnej zhody')
    expect(unmatched).toHaveAccessibleName(/mikrobiológia.*bez presnej zhody/i)
  })

  it('sorts with native header buttons and exposes the active order semantically', () => {
    renderComparison()

    const table = screen.getByRole('table', { name: 'Presné porovnanie odborov a absolventov' })
    const appointmentHeader = within(table).getByRole('columnheader', { name: /Vymenovania/ })
    expect(appointmentHeader).toHaveAttribute('aria-sort', 'descending')

    fireEvent.click(within(table).getByRole('button', { name: 'Odbor' }))
    const fieldHeader = within(table).getByRole('columnheader', { name: /Odbor/ })
    expect(fieldHeader).toHaveAttribute('aria-sort', 'ascending')
    expect(within(table).getAllByRole('row')[1]).toHaveTextContent('mikrobiológia')

    fireEvent.click(within(table).getByRole('button', { name: 'Absolventi' }))
    const graduateHeader = within(table).getByRole('columnheader', { name: /^Absolventi(?: ↓)?$/ })
    expect(graduateHeader).toHaveAttribute('aria-sort', 'descending')
    expect(within(table).getAllByRole('row')[1]).toHaveTextContent('psychológia')
  })

  it('pairs whole-register and live selection shares, summaries, and raw-label variants', () => {
    const { onFieldSelect } = renderComparison()

    const wholeRegister = screen.getByRole('group', { name: 'Súhrn celého registra odborov' })
    expect(wholeRegister).toHaveTextContent('5')
    expect(wholeRegister).toHaveTextContent('3')
    expect(wholeRegister).toHaveTextContent('Psychológia')
    expect(wholeRegister).toHaveTextContent('60 %')
    expect(wholeRegister).toHaveTextContent('2000 – 2025')

    const selection = screen.getByRole('group', {
      name: 'Súhrn aktívneho výberu bez filtra odboru',
    })
    expect(selection).toHaveTextContent('3')
    expect(selection).toHaveTextContent('100 %')

    const landscape = screen.getByRole('table', {
      name: 'Podiely odborov v celom registri a aktívnom výbere',
    })
    const psychology = within(landscape).getByRole('button', { name: 'Psychológia' })
    const psychologyRow = psychology.closest('tr')
    expect(psychologyRow).toHaveTextContent('3')
    expect(psychologyRow).toHaveTextContent('60 %')
    expect(psychologyRow).toHaveTextContent('1')
    expect(psychologyRow).toHaveTextContent('33,33 %')
    expect(psychologyRow).toHaveTextContent('2 podoby názvu')

    fireEvent.click(psychology)
    expect(onFieldSelect).toHaveBeenCalledWith('psychologia')
  })

  it('marks the selected normalized key, toggles it off, and defines an empty cohort', () => {
    const onFieldSelect = vi.fn()
    renderComparison({
      comparisonRecords: [],
      selectedField: 'psychologia',
      onFieldSelect,
    })

    const selection = screen.getByRole('group', {
      name: 'Súhrn aktívneho výberu bez filtra odboru',
    })
    expect(selection).toHaveTextContent('0')
    expect(selection).toHaveTextContent('—')

    const psychology = screen.getByRole('button', { name: 'Psychológia' })
    expect(psychology).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(psychology)
    expect(onFieldSelect).toHaveBeenCalledWith(null)
  })

  it('publishes source links, the pinned subpath-safe download, and the registry caveat', () => {
    renderComparison()

    expect(screen.getByRole('link', { name: 'Katalóg štatistickej ročenky CVTI SR' })).toHaveAttribute(
      'href',
      comparison.source.catalogUrl,
    )
    expect(screen.getByRole('link', { name: 'Priamy oficiálny zošit absolventov (XLS)' })).toHaveAttribute(
      'href',
      comparison.source.url,
    )
    expect(screen.getByRole('link', { name: 'Stiahnuť uložený zošit absolventov (XLS)' })).toHaveAttribute(
      'href',
      '/slovak-professors/data/source/graduates-by-field-2025.xls',
    )

    const caveat = screen.getByRole('note', { name: 'Ako čítať porovnanie' })
    expect(caveat).toHaveTextContent('dva odlišné registre')
    expect(caveat).toHaveTextContent('iba presne rovnaké normalizované názvy')
    expect(caveat).toHaveTextContent('nevytvára taxonómiu')
    expect(caveat).toHaveTextContent('nevyplýva príčina ani kvalita')
  })
})
