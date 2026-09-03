import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { affiliation, appointment } from '../test/atlasFixture'
import FieldSection from './FieldSection'

afterEach(cleanup)

const years = Array.from({ length: 17 }, (_, index) => ({
  year: 2009 + index,
  programRowCount: 1,
  nationalGraduateCount: 100,
}))
const data = {
  affiliations: [affiliation(), affiliation({ id: 'tuke-default', institutionId: 'tuke', city: 'Košice' })],
  records: [
    appointment({ appointedOn: '2011-01-24', fieldKey: 'socialna praca', field: 'sociálna práca' }),
    appointment({ appointedOn: '2012-07-10', fieldKey: 'hudobne umenie', field: 'hudobné umenie' }),
    appointment({
      appointedOn: '2013-07-10',
      fieldKey: 'socialna praca',
      field: 'sociálna práca',
      institutionId: 'tuke',
      affiliationId: 'tuke-default',
    }),
  ],
  fieldCatalog: {
    schemaVersion: 1,
    aliases: [],
    labels: { 'socialna praca': 'sociálna práca', 'hudobne umenie': 'hudobné umenie' },
  },
  fieldEducationComparison: {
    schemaVersion: 2,
    startYear: 2009,
    endYear: 2025,
    catalogUrl: 'https://example.test/katalog',
    graduateSources: [],
    currentStudentsSource: { year: 2025, archiveMember: null, localPath: 'x.xls', url: 'https://example.test/x', sha256: '', retrievedOn: '2026-08-30' },
    years,
    rows: [
      { fieldKey: 'socialna praca', canonicalLabel: 'sociálna práca', graduateCounts: years.map(() => 100), currentStudentCount: 10 },
      { fieldKey: 'hudobne umenie', canonicalLabel: 'hudobné umenie', graduateCounts: years.map(() => 0), currentStudentCount: null },
    ],
  },
}
const range = { startYear: 2009, endYear: 2025 }

describe('FieldSection', () => {
  it('renders the scatter, the rail and the detail for the selected field', () => {
    render(
      <FieldSection data={data as never} selectedField="socialna praca" onFieldSelect={vi.fn()} selectedCity={null} onCityClear={vi.fn()} fieldRange={range} onFieldRangeChange={vi.fn()} />,
    )
    const section = screen.getByRole('region', {
      name: 'Profesorské vymenovania a absolventi v rovnakom odbore',
    })
    expect(within(section).getByTestId('field-point-socialna praca')).toBeInTheDocument()
    expect(within(section).getByTestId('field-rail-hudobne umenie')).toBeInTheDocument()
    expect(within(section).getByRole('heading', { name: 'sociálna práca' })).toBeVisible()
    expect(within(section).getByText('Rebríček odborov').closest('details')).not.toHaveAttribute('open')
    const sourcesDetails = within(section).getByText(/ročných zdrojov absolventov/).closest('details')
    expect(sourcesDetails).toBeInTheDocument()
    expect(sourcesDetails).not.toHaveAttribute('open')
    expect(within(section).getByRole('link', { name: 'Uložený XLS aktuálnych študentov' })).toHaveAttribute(
      'href',
      expect.stringMatching(/data\/source\/x\.xls$/),
    )
  })

  it('leaves the national comparison alone and lists the city fields when a city is selected', () => {
    render(
      <FieldSection data={data as never} selectedField={null} onFieldSelect={vi.fn()} selectedCity={null} onCityClear={vi.fn()} fieldRange={range} onFieldRangeChange={vi.fn()} />,
    )
    expect(screen.queryByRole('region', { name: /Odbory v meste/ })).not.toBeInTheDocument()
    cleanup()

    const onFieldSelect = vi.fn()
    const onCityClear = vi.fn()
    render(
      <FieldSection data={data as never} selectedField={null} onFieldSelect={onFieldSelect} selectedCity="Košice" onCityClear={onCityClear} fieldRange={range} onFieldRangeChange={vi.fn()} />,
    )
    const panel = screen.getByRole('region', { name: 'Odbory v meste Košice' })
    expect(within(panel).getByRole('status')).toHaveTextContent(
      '1 z 3 vymenovaní (33 %) v 1 odbore',
    )
    const row = within(panel).getByRole('button', {
      name: 'sociálna práca: 1 z 2 celoštátnych vymenovaní, 50 %; vybrať odbor',
    })
    fireEvent.click(row)
    expect(onFieldSelect).toHaveBeenCalledWith('socialna praca')
    fireEvent.click(within(panel).getByRole('button', { name: /Zrušiť výber mesta/ }))
    expect(onCityClear).toHaveBeenCalled()
    expect(within(panel).getByText(/Absolventi ostávajú celoštátni/)).toBeVisible()
    expect(screen.getByTestId('field-point-socialna praca')).toBeInTheDocument()
  })

  it('selects a field from the search box on Enter and switches the scale', () => {
    const onFieldSelect = vi.fn()
    render(
      <FieldSection data={data as never} selectedField={null} onFieldSelect={onFieldSelect} selectedCity={null} onCityClear={vi.fn()} fieldRange={range} onFieldRangeChange={vi.fn()} />,
    )
    const search = screen.getByLabelText('Nájsť odbor')
    fireEvent.change(search, { target: { value: 'hudobne' } })
    fireEvent.keyDown(search, { key: 'Enter' })
    expect(onFieldSelect).toHaveBeenCalledWith('hudobne umenie')
    fireEvent.click(screen.getByRole('button', { name: 'Absolútna' }))
    expect(screen.getByRole('button', { name: 'Absolútna' })).toHaveAttribute('aria-pressed', 'true')
  })
})
