import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { appointment } from '../test/atlasFixture'
import FindingCards from './FindingCards'

const years = Array.from({ length: 17 }, (_, index) => ({
  year: 2009 + index,
  programRowCount: 1,
  nationalGraduateCount: 100,
}))
const fields = [
  { fieldKey: 'socialna praca', canonicalLabel: 'sociálna práca', graduates: 900 },
  { fieldKey: 'psychologia', canonicalLabel: 'psychológia', graduates: 100 },
  { fieldKey: 'spravne pravo', canonicalLabel: 'správne právo', graduates: 10 },
  { fieldKey: 'materialy', canonicalLabel: 'materiály', graduates: 20 },
  { fieldKey: 'vyziva', canonicalLabel: 'výživa', graduates: 30 },
  { fieldKey: 'neurologia', canonicalLabel: 'neurológia', graduates: 40 },
]
const data = {
  records: [
    appointment({ appointedOn: '2011-11-28' }),
    ...fields.flatMap((field) =>
      Array.from({ length: 5 }, () =>
        appointment({
          appointedOn: '2011-11-28',
          fieldKey: field.fieldKey,
          field: field.canonicalLabel,
        }),
      ),
    ),
  ],
  fieldCatalog: {
    schemaVersion: 1,
    aliases: [],
    labels: Object.fromEntries(fields.map((field) => [field.fieldKey, field.canonicalLabel])),
  },
  fieldEducationComparison: {
    schemaVersion: 2,
    startYear: 2009,
    endYear: 2025,
    catalogUrl: '',
    graduateSources: [],
    currentStudentsSource: { year: 2025, archiveMember: null, localPath: '', url: '', sha256: '', retrievedOn: '' },
    years,
    rows: fields.map((field) => ({
      fieldKey: field.fieldKey,
      canonicalLabel: field.canonicalLabel,
      graduateCounts: years.map(() => field.graduates),
      currentStudentCount: 10,
    })),
  },
}

describe('FindingCards', () => {
  afterEach(cleanup)

  it('leads with the fields that need the fewest graduates per appointment', () => {
    render(<FindingCards data={data as never} onFieldSelect={() => {}} />)
    const section = screen.getByRole('region', { name: 'Tri zistenia' })
    const cards = within(section).getAllByRole('article')
    expect(cards).toHaveLength(3)
    expect(within(cards[0]!).getByRole('heading', { level: 3 })).toHaveTextContent(
      'Od 34 absolventov na vymenovanie po 3 060',
    )
    expect(within(cards[0]!).getByText(/Medián 119 z 6 odborov, ktoré majú absolventov aspoň v 12 zo 17 rokov/)).toBeVisible()
    expect(within(cards[0]!).getByRole('link', { name: 'Celé poradie odborov' })).toHaveAttribute(
      'href',
      '#odbory',
    )
    expect(within(cards[1]!).getByRole('heading', { level: 3 })).toHaveTextContent(
      'Každé piate vymenovanie je novembrové',
    )
    expect(within(cards[2]!).getByRole('link', { name: 'Celé porovnanie odborov' })).toHaveAttribute(
      'href',
      '#odbory',
    )
  })

  it('selects a field when an outlier row is activated', () => {
    const onFieldSelect = vi.fn()
    render(<FindingCards data={data as never} onFieldSelect={onFieldSelect} />)
    const row = screen.getByRole('button', {
      name: /^správne právo: 34 absolventov na jedno vymenovanie, 170 absolventov a 5 vymenovaní v 17 rokoch s dátami/,
    })
    fireEvent.click(row)
    expect(onFieldSelect).toHaveBeenCalledWith('spravne pravo')
  })

  it('selects a field when a dumbbell row is activated', () => {
    const onFieldSelect = vi.fn()
    render(<FindingCards data={data as never} onFieldSelect={onFieldSelect} />)
    const row = screen.getByRole('button', {
      name: /sociálna práca: 81,8 % absolventov, 16,7 % vymenovaní/,
    })
    expect(row.closest('svg')).toHaveAttribute('role', 'group')
    fireEvent.click(row)
    expect(onFieldSelect).toHaveBeenCalledWith('socialna praca')
  })

  it('falls back to a neutral headline when too few fields have a long graduate series', () => {
    render(
      <FindingCards
        data={{ ...data, records: [appointment({ appointedOn: '2011-11-28' })] } as never}
        onFieldSelect={() => {}}
      />,
    )
    expect(
      screen.getByRole('heading', { level: 3, name: 'Absolventi na jedno vymenovanie podľa odboru' }),
    ).toBeVisible()
  })
})
