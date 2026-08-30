import { describe, expect, it } from 'vitest'
import productionAtlasValue from '../../public/data/atlas.json'

import type {
  Appointment,
  AtlasData,
  FieldCatalog,
  FieldEducationComparison,
} from '../data/types'
import { normalizeForSearch } from '../utils/search'
import { buildFieldEducationLandscape } from './fieldEducation'

const productionAtlas = productionAtlasValue as unknown as AtlasData

const years = Array.from({ length: 17 }, (_, index) => ({
  year: 2009 + index,
  programRowCount: 1,
  nationalGraduateCount: 10,
}))

const fieldCatalog: FieldCatalog = {
  schemaVersion: 1,
  aliases: [
    {
      sourceLabel: 'Matematické vedy',
      sourceKey: 'matematicke vedy',
      targetLabel: 'Matematika',
      targetKey: 'matematika',
    },
  ],
  labels: {
    matematika: 'Matematika',
    pravo: 'Právo',
  },
}

const comparison: FieldEducationComparison = {
  schemaVersion: 2,
  startYear: 2009,
  endYear: 2025,
  catalogUrl: 'https://example.test/catalog',
  graduateSources: years.map(({ year }) => ({
    year,
    url: `https://example.test/graduates-${year}.xls`,
    archiveMember: year === 2025 ? null : `graduates-${year}.xls`,
    localPath: `graduates-by-field/${year}.xls`,
    sha256: `${year}`.padEnd(64, '0'),
    retrievedOn: '2026-08-30',
  })),
  currentStudentsSource: {
    year: 2025,
    url: 'https://example.test/students.xls',
    archiveMember: null,
    localPath: 'current-students-by-field-2025.xls',
    sha256: 'a'.repeat(64),
    retrievedOn: '2026-08-30',
  },
  years,
  rows: [
    {
      fieldKey: 'matematika',
      canonicalLabel: 'Matematika',
      graduateCounts: [10, null, ...Array<number | null>(14).fill(2), 0],
      currentStudentCount: 99_999,
    },
    {
      fieldKey: 'pravo',
      canonicalLabel: 'Právo',
      graduateCounts: Array<number | null>(17).fill(null),
      currentStudentCount: 5_000,
    },
  ],
}

function appointment(
  id: string,
  year: number,
  field: string,
  fieldKey = normalizeForSearch(field),
): Appointment {
  return {
    id,
    name: `Profesor ${id}`,
    titlesBefore: null,
    titlesAfter: null,
    faculty: null,
    institutionId: 'institution',
    affiliationId: 'institution',
    institutionSource: 'Institution',
    field,
    fieldKey,
    appointedOn: `${year}-06-12`,
    presidentId: 'president',
    sourceVariants: [],
  }
}

const records = [
  appointment('outside-before', 2008, 'Matematické vedy', 'matematika'),
  appointment('exact-start', 2009, 'Matematika'),
  appointment('alias', 2010, 'Matematické vedy', 'matematika'),
  appointment('exact-end', 2025, 'Matematika'),
  appointment('unmatched', 2025, 'Právo'),
  appointment('outside-after', 2026, 'Matematika'),
]

describe('buildFieldEducationLandscape', () => {
  it('uses only fixed-window appointment and graduate events', () => {
    const landscape = buildFieldEducationLandscape(records, fieldCatalog, comparison)

    expect(landscape.coverage).toEqual({
      exactAppointmentCount: 2,
      aliasAppointmentCount: 1,
      matchedAppointmentCount: 3,
      appointmentCount: 4,
      matchedFieldCount: 1,
      fieldCount: 2,
      yearCount: 17,
    })
    expect(landscape.points).toHaveLength(1)
    expect(landscape.unmatched).toHaveLength(1)

    const point = landscape.points[0]
    expect(point.fieldKey).toBe('matematika')
    expect(point.appointmentCount).toBe(3)
    expect(point.exactAppointmentCount).toBe(2)
    expect(point.aliasAppointmentCount).toBe(1)
    expect(point.graduateCount).toBe(38)
    expect(point.graduatesPerAppointment).toBe(38 / 3)
    expect(point.currentStudentCount).toBe(99_999)
    expect(point.annual[0]).toEqual({ year: 2009, appointmentCount: 1, graduateCount: 10 })
    expect(point.annual[1]).toEqual({ year: 2010, appointmentCount: 1, graduateCount: null })
    expect(point.annual[16]).toEqual({ year: 2025, appointmentCount: 1, graduateCount: 0 })
  })

  it('recomputes totals and annual values for a selected subrange', () => {
    const landscape = buildFieldEducationLandscape(
      records,
      fieldCatalog,
      comparison,
      { startYear: 2009, endYear: 2010 },
    )

    expect(landscape.coverage).toEqual({
      exactAppointmentCount: 1,
      aliasAppointmentCount: 1,
      matchedAppointmentCount: 2,
      appointmentCount: 2,
      matchedFieldCount: 1,
      fieldCount: 1,
      yearCount: 2,
    })
    expect(landscape.points[0]).toMatchObject({
      fieldKey: 'matematika',
      appointmentCount: 2,
      graduateCount: 10,
      graduatesPerAppointment: 5,
      currentStudentCount: 99_999,
      annual: [
        { year: 2009, appointmentCount: 1, graduateCount: 10 },
        { year: 2010, appointmentCount: 1, graduateCount: null },
      ],
    })
  })

  it('retains unmatched keys and never uses student stock in the ratio', () => {
    const landscape = buildFieldEducationLandscape(records, fieldCatalog, comparison)
    const unmatched = landscape.unmatched[0]

    expect(unmatched).toMatchObject({
      fieldKey: 'pravo',
      canonicalLabel: 'Právo',
      appointmentCount: 1,
      graduateCount: null,
      graduatesPerAppointment: null,
      currentStudentCount: 5_000,
    })
    expect(landscape.allRows).toHaveLength(2)
    expect(landscape.points[0].graduatesPerAppointment).not.toBe(
      99_999 / landscape.points[0].appointmentCount,
    )
  })

  it('pins production coverage for the complete generated atlas', () => {
    const landscape = buildFieldEducationLandscape(
      productionAtlas.records,
      productionAtlas.fieldCatalog,
      productionAtlas.fieldEducationComparison,
    )

    expect(landscape.coverage).toEqual({
      exactAppointmentCount: 1_347,
      aliasAppointmentCount: 7,
      matchedAppointmentCount: 1_354,
      appointmentCount: 1_400,
      matchedFieldCount: 232,
      fieldCount: 250,
      yearCount: 17,
    })
    expect(landscape.points).toHaveLength(232)
    expect(landscape.unmatched).toHaveLength(18)
  })
})
