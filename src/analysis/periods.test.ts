import { describe, expect, it } from 'vitest'

import { affiliation, appointment } from '../test/atlasFixture'
import { FIVE_YEAR_PERIODS, cityShares, citySharesByPeriod, periodForRange } from './periods'

const affiliations = [
  affiliation(),
  affiliation({ id: 'tuke-default', institutionId: 'tuke', city: 'Košice' }),
  affiliation({ id: 'unknown', institutionId: 'x', status: 'unresolved', city: null }),
]
const records = [
  appointment({ appointedOn: '2001-05-17' }),
  appointment({ appointedOn: '2003-05-17' }),
  appointment({ appointedOn: '2002-05-17', affiliationId: 'tuke-default' }),
  appointment({ appointedOn: '2002-05-17', affiliationId: 'unknown' }),
  appointment({ appointedOn: '2011-01-24', affiliationId: 'tuke-default' }),
]

describe('periods', () => {
  it('defines five labelled five-year periods', () => {
    expect(FIVE_YEAR_PERIODS.map(({ label }) => label)).toEqual([
      '2000–2004',
      '2005–2009',
      '2010–2014',
      '2015–2019',
      '2020–2024',
    ])
  })

  it('finds a period only for an exact match', () => {
    expect(periodForRange(2010, 2014)?.label).toBe('2010–2014')
    expect(periodForRange(2010, 2015)).toBeNull()
    expect(periodForRange(2000, 2026)).toBeNull()
  })

  it('computes city shares over located records only', () => {
    const shares = cityShares(records.slice(0, 4), affiliations)
    expect(shares).toEqual([
      { city: 'Bratislava', count: 2, share: 2 / 3 },
      { city: 'Košice', count: 1, share: 1 / 3 },
    ])
  })

  it('splits shares by five-year period and skips empty periods', () => {
    const byPeriod = citySharesByPeriod(records, affiliations)
    expect([...byPeriod.keys()]).toEqual(['2000–2004', '2010–2014'])
    expect(byPeriod.get('2010–2014')).toEqual([{ city: 'Košice', count: 1, share: 1 }])
  })
})
