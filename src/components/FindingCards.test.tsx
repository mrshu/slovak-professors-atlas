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
const data = {
  records: [
    appointment({ appointedOn: '2007-06-26', titlesAfter: 'CSc.' }),
    appointment({ appointedOn: '2008-11-15', titlesAfter: 'PhD.' }),
    appointment({ appointedOn: '2011-11-28', titlesAfter: 'PhD.', fieldKey: 'socialna praca', field: 'sociálna práca' }),
    appointment({ appointedOn: '2011-11-28', titlesAfter: 'PhD.', fieldKey: 'psychologia', field: 'psychológia' }),
  ],
  fieldCatalog: {
    schemaVersion: 1,
    aliases: [],
    labels: { 'socialna praca': 'sociálna práca', psychologia: 'psychológia' },
  },
  fieldEducationComparison: {
    schemaVersion: 2,
    startYear: 2009,
    endYear: 2025,
    catalogUrl: '',
    graduateSources: [],
    currentStudentsSource: { year: 2025, archiveMember: null, localPath: '', url: '', sha256: '', retrievedOn: '' },
    years,
    rows: [
      { fieldKey: 'socialna praca', canonicalLabel: 'sociálna práca', graduateCounts: years.map(() => 900), currentStudentCount: 10 },
      { fieldKey: 'psychologia', canonicalLabel: 'psychológia', graduateCounts: years.map(() => 100), currentStudentCount: 10 },
    ],
  },
}

describe('FindingCards', () => {
  afterEach(cleanup)

  it('renders three cards with the crossover year in the first headline', () => {
    render(<FindingCards data={data as never} onFieldSelect={() => {}} />)
    const section = screen.getByRole('region', { name: 'Tri zistenia' })
    const cards = within(section).getAllByRole('article')
    expect(cards).toHaveLength(3)
    expect(within(cards[0]!).getByRole('heading', { level: 3 })).toHaveTextContent(
      'PhD. predbehol CSc. v roku 2008',
    )
    expect(within(cards[1]!).getByRole('heading', { level: 3 })).toHaveTextContent(
      'Každé piate vymenovanie je novembrové',
    )
    expect(within(cards[2]!).getByRole('link', { name: 'Celé porovnanie odborov' })).toHaveAttribute(
      'href',
      '#odbory',
    )
  })

  it('selects a field when a dumbbell row is activated', () => {
    const onFieldSelect = vi.fn()
    render(<FindingCards data={data as never} onFieldSelect={onFieldSelect} />)
    const row = screen.getByRole('button', {
      name: /sociálna práca: 90,0 % absolventov, 50,0 % vymenovaní/,
    })
    expect(row.closest('svg')).toHaveAttribute('role', 'group')
    fireEvent.click(row)
    expect(onFieldSelect).toHaveBeenCalledWith('socialna praca')
  })

  it('falls back to a neutral headline when there is no crossover', () => {
    render(
      <FindingCards
        data={{ ...data, records: [appointment({ appointedOn: '2000-02-22', titlesAfter: 'CSc.' })] } as never}
        onFieldSelect={() => {}}
      />,
    )
    expect(
      screen.getByRole('heading', { level: 3, name: 'Podiel vedeckých hodností po rokoch' }),
    ).toBeVisible()
  })
})
