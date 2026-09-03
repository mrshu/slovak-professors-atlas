import { describe, expect, it } from 'vitest'

import { appointment } from '../test/atlasFixture'
import { fieldRatioSpread, fieldShareRows, monthTotals } from './findings'

function landscapeRow(
  fieldKey: string,
  canonicalLabel: string,
  annual: readonly { year: number; appointmentCount: number; graduateCount: number | null }[],
) {
  return {
    fieldKey,
    canonicalLabel,
    appointmentCount: annual.reduce((total, value) => total + value.appointmentCount, 0),
    exactAppointmentCount: 0,
    aliasAppointmentCount: 0,
    graduateCount: null,
    graduatesPerAppointment: null,
    currentStudentCount: null,
    annual: [...annual],
    variants: [],
  }
}

describe('findings', () => {
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

  it('ranks fields by graduates per appointment over the years with graduate data', () => {
    const spread = fieldRatioSpread(
      [
        landscapeRow('pravo', 'právo', [
          { year: 2009, appointmentCount: 2, graduateCount: 10 },
          { year: 2010, appointmentCount: 2, graduateCount: 10 },
        ]),
        landscapeRow('psychologia', 'psychológia', [
          { year: 2009, appointmentCount: 1, graduateCount: 500 },
          { year: 2010, appointmentCount: 1, graduateCount: 500 },
        ]),
        landscapeRow('matematika', 'matematika', [
          { year: 2009, appointmentCount: 2, graduateCount: 100 },
          { year: 2010, appointmentCount: 2, graduateCount: 100 },
        ]),
      ],
      { minYears: 2, minAppointments: 2 },
    )
    expect(spread.rows.map(({ label, graduatesPerAppointment }) => [label, graduatesPerAppointment])).toEqual([
      ['právo', 5],
      ['matematika', 50],
      ['psychológia', 500],
    ])
    expect(spread.rows[0]).toMatchObject({ appointments: 4, graduates: 20, coveredYears: 2 })
    expect(spread.median).toBe(50)
  })

  it('ignores years without graduate data instead of treating them as zero', () => {
    const spread = fieldRatioSpread(
      [
        landscapeRow('hudobne umenie', 'hudobné umenie', [
          { year: 2009, appointmentCount: 5, graduateCount: null },
          { year: 2010, appointmentCount: 2, graduateCount: 20 },
          { year: 2011, appointmentCount: 2, graduateCount: 20 },
        ]),
      ],
      { minYears: 2, minAppointments: 2 },
    )
    expect(spread.rows[0]).toMatchObject({ appointments: 4, graduates: 40, graduatesPerAppointment: 10 })
  })

  it('drops fields whose graduate series is too sparse or whose appointments are too few', () => {
    const sparse = landscapeRow('doprava', 'doprava', [
      { year: 2009, appointmentCount: 3, graduateCount: null },
      { year: 2010, appointmentCount: 3, graduateCount: 3 },
    ])
    const rare = landscapeRow('reštaurovanie', 'reštaurovanie', [
      { year: 2009, appointmentCount: 1, graduateCount: 2 },
      { year: 2010, appointmentCount: 0, graduateCount: 2 },
    ])
    expect(fieldRatioSpread([sparse, rare], { minYears: 2, minAppointments: 2 }).rows).toEqual([])
    expect(fieldRatioSpread([sparse, rare], { minYears: 2, minAppointments: 2 }).median).toBeNull()
  })

  it('averages the two middle fields for an even count', () => {
    const spread = fieldRatioSpread(
      [
        landscapeRow('a', 'a', [{ year: 2009, appointmentCount: 1, graduateCount: 10 }]),
        landscapeRow('b', 'b', [{ year: 2009, appointmentCount: 1, graduateCount: 20 }]),
        landscapeRow('c', 'c', [{ year: 2009, appointmentCount: 1, graduateCount: 30 }]),
        landscapeRow('d', 'd', [{ year: 2009, appointmentCount: 1, graduateCount: 40 }]),
      ],
      { minYears: 1, minAppointments: 1 },
    )
    expect(spread.median).toBe(25)
  })
})
