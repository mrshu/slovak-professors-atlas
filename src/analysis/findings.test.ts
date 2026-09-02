import { describe, expect, it } from 'vitest'

import { appointment } from '../test/atlasFixture'
import { fieldShareRows, monthTotals, titleCrossoverYear, titleSharesByYear } from './findings'

describe('findings', () => {
  it('counts title shares per year from titlesAfter', () => {
    const rows = titleSharesByYear([
      appointment({ appointedOn: '2007-06-26', titlesAfter: 'CSc.' }),
      appointment({ appointedOn: '2007-06-26', titlesAfter: 'PhD.' }),
      appointment({ appointedOn: '2008-01-15', titlesAfter: 'PhD.' }),
      appointment({ appointedOn: '2008-05-12', titlesAfter: 'DrSc. PhD.' }),
      appointment({ appointedOn: '2008-05-12', titlesAfter: null }),
    ])
    expect(rows).toEqual([
      { year: 2007, total: 2, phd: 1, csc: 1, drsc: 0 },
      { year: 2008, total: 3, phd: 2, csc: 0, drsc: 1 },
    ])
    expect(titleCrossoverYear(rows)).toBe(2008)
  })

  it('returns null when PhD. never overtakes CSc.', () => {
    expect(titleCrossoverYear([{ year: 2000, total: 2, phd: 1, csc: 1, drsc: 0 }])).toBeNull()
  })

  it('totals appointments and ceremonies for all twelve months', () => {
    const totals = monthTotals([
      appointment({ appointedOn: '2011-11-28' }),
      appointment({ appointedOn: '2011-11-28' }),
      appointment({ appointedOn: '2012-11-16' }),
      appointment({ appointedOn: '2012-07-10' }),
    ])
    expect(totals).toHaveLength(12)
    expect(totals[10]).toEqual({ month: 11, appointments: 3, ceremonies: 2 })
    expect(totals[6]).toEqual({ month: 7, appointments: 1, ceremonies: 1 })
    expect(totals[0]).toEqual({ month: 1, appointments: 0, ceremonies: 0 })
  })

  it('computes graduate and appointment shares over all points', () => {
    const rows = fieldShareRows([
      { fieldKey: 'a', canonicalLabel: 'A', appointmentCount: 3, graduateCount: 900 } as never,
      { fieldKey: 'b', canonicalLabel: 'B', appointmentCount: 1, graduateCount: 100 } as never,
    ])
    expect(rows).toEqual([
      { fieldKey: 'a', label: 'A', appointments: 3, graduates: 900, appointmentShare: 0.75, graduateShare: 0.9 },
      { fieldKey: 'b', label: 'B', appointments: 1, graduates: 100, appointmentShare: 0.25, graduateShare: 0.1 },
    ])
  })
})
