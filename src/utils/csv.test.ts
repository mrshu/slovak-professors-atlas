import { describe, expect, it } from 'vitest'

import type { Appointment } from '../data/types'
import { METHODOLOGY_URL, recordsToCsv } from './csv'

function record(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: 'abc-1',
    name: 'Anna "A." Žitná',
    titlesBefore: 'doc.',
    titlesAfter: 'PhD.',
    faculty: 'Lekárska fakulta',
    institutionId: 'uniba',
    institutionSource: 'UK v Bratislave',
    field: 'vnútorné lekárstvo',
    appointedOn: '2023-05-12',
    presidentId: 'caputova',
    sourceVariants: [
      {
        rowNumber: 42,
        titlesBefore: 'doc.',
        titlesAfter: 'PhD.',
        faculty: 'Lekárska fakulta',
        institution: 'Univerzita "Komenského"; Bratislava',
        field: 'vnútorné lekárstvo',
      },
      {
        rowNumber: 43,
        titlesBefore: 'doc. ',
        titlesAfter: 'PhD.',
        faculty: 'Lekárska  fakulta',
        institution: 'UK v Bratislave',
        field: 'interná medicína',
      },
    ],
    ...overrides,
  }
}

describe('recordsToCsv', () => {
  it('writes a BOM, Slovak semicolon header, CRLF rows, canonical/source data, source rows, and methodology URL', () => {
    const csv = recordsToCsv([record()])
    const rows = csv.split('\r\n')

    expect(csv.charCodeAt(0)).toBe(0xfeff)
    expect(rows[0]).toBe(
      '\uFEFFID záznamu;Meno;Tituly pred menom;Tituly za menom;Dátum vymenovania;Prezident (ID);Kanonická inštitúcia (ID);Zdrojová inštitúcia;Fakulta;Odbor;Zdrojové riadky;Zdrojové varianty;Metodika',
    )
    expect(csv.replaceAll('\r\n', '')).not.toContain('\n')
    expect(rows).toHaveLength(3)
    expect(rows[2]).toBe('')
    expect(rows[1]).toContain('uniba;UK v Bratislave;Lekárska fakulta;vnútorné lekárstvo')
    expect(rows[1]).toContain('42 | 43')
    expect(rows[1]).toContain('Univerzita ""Komenského""; Bratislava')
    expect(rows[1]).toContain('Lekárska  fakulta')
    expect(rows[1]).toContain(METHODOLOGY_URL)
  })

  it('doubles quotes and encloses fields containing RFC4180 control characters', () => {
    const csv = recordsToCsv([record({ name: 'Anna "A."; Žitná\nNová' })])

    expect(csv).toContain('"Anna ""A.""; Žitná\nNová"')
    expect(csv).toContain('"Riadok 42:')
  })
  it.each([
    ['equals', '=1+1'],
    ['plus', '+1'],
    ['minus', '-1'],
    ['at sign', '@SUM'],
    ['leading whitespace', '  =1+1'],
  ])('prefixes %s formula-like cells with an apostrophe', (_case, value) => {
    const csv = recordsToCsv([record({ name: value })])

    expect(csv).toContain(`;'${value}`)
  })

  it('exports analytical records only, with one data row per input record', () => {
    const csv = recordsToCsv([record({ id: 'one' }), record({ id: 'two' })])

    expect(csv.split('\r\n')).toHaveLength(4)
  })
})
