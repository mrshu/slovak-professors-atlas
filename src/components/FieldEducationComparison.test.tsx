import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type {
  Appointment,
  FieldCatalog,
  FieldEducationComparison as FieldEducationComparisonData,
} from '../data/types'
import FieldEducationComparison from './FieldEducationComparison'

afterEach(cleanup)

const years = Array.from({ length: 17 }, (_, index) => ({
  year: 2009 + index,
  programRowCount: 1,
  nationalGraduateCount: 1,
}))

function appointment(id: string, field: string, fieldKey: string): Appointment {
  return {
    id,
    name: id,
    titlesBefore: null,
    titlesAfter: null,
    faculty: null,
    institutionId: 'institution',
    affiliationId: 'institution',
    institutionSource: 'Institution',
    field,
    fieldKey,
    appointedOn: '2009-01-01',
    presidentId: 'president',
    sourceVariants: [],
  }
}

const matchedKeys = Array.from({ length: 232 }, (_, index) => `matched ${index}`)
const unmatchedKeys = Array.from({ length: 18 }, (_, index) => `unmatched ${index}`)
const allRecords: Appointment[] = []
for (const [index, key] of matchedKeys.entries()) {
  const count = index === 0 ? 1_116 : 1
  for (let recordIndex = 0; recordIndex < count; recordIndex += 1) {
    allRecords.push(appointment(`exact-${index}-${recordIndex}`, `Matched ${index}`, key))
  }
}
for (let index = 0; index < 7; index += 1) {
  allRecords.push(appointment(`alias-${index}`, `Alias ${index}`, matchedKeys[0]))
}
for (const [index, key] of unmatchedKeys.entries()) {
  const count = index === unmatchedKeys.length - 1 ? 29 : 1
  for (let recordIndex = 0; recordIndex < count; recordIndex += 1) {
    allRecords.push(appointment(`unmatched-${index}-${recordIndex}`, `Unmatched ${index}`, key))
  }
}

const fieldCatalog: FieldCatalog = {
  schemaVersion: 1,
  aliases: [],
  labels: Object.fromEntries([
    ...matchedKeys.map((key, index) => [key, `Matched ${index}`]),
    ...unmatchedKeys.map((key, index) => [key, `Unmatched ${index}`]),
  ]),
}

const comparison: FieldEducationComparisonData = {
  schemaVersion: 2,
  startYear: 2009,
  endYear: 2025,
  catalogUrl: 'https://example.test/catalog',
  graduateSources: years.map(({ year }) => ({
    year,
    url: `https://example.test/${year}.xls`,
    archiveMember: year === 2025 ? null : `${year}.xls`,
    localPath: `graduates-by-field/${year}.xls`,
    sha256: 'a'.repeat(64),
    retrievedOn: '2026-08-30',
  })),
  currentStudentsSource: {
    year: 2025,
    url: 'https://example.test/students.xls',
    archiveMember: null,
    localPath: 'current-students-by-field-2025.xls',
    sha256: 'b'.repeat(64),
    retrievedOn: '2026-08-30',
  },
  years,
  rows: [
    ...matchedKeys.map((fieldKey, index) => ({
      fieldKey,
      canonicalLabel: `Matched ${index}`,
      graduateCounts: Array<number | null>(17).fill(index + 1),
      currentStudentCount: index + 100,
    })),
    ...unmatchedKeys.map((fieldKey, index) => ({
      fieldKey,
      canonicalLabel: `Unmatched ${index}`,
      graduateCounts: Array<number | null>(17).fill(null),
      currentStudentCount: null,
    })),
  ],
}

describe('FieldEducationComparison', () => {
  it('pins coverage and uses the leading matched field as a local-only default', () => {
    const onFieldSelect = vi.fn()
    render(
      <FieldEducationComparison
        comparison={comparison}
        fieldCatalog={fieldCatalog}
        allRecords={allRecords}
        selectedField={null}
        onFieldSelect={onFieldSelect}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Profesorské vymenovania × absolventi' })).toBeInTheDocument()
    expect(screen.getByText(/1 347 presne \+ 7 aliasom/)).toBeInTheDocument()
    expect(screen.getByText(/1 354 z 1 400 vymenovaní/)).toBeInTheDocument()
    expect(screen.getByText(/232 z 250 odborov/)).toBeInTheDocument()
    expect(screen.getByText(/17 rokov/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Matched 0' })).toBeInTheDocument()
    expect(screen.getAllByTestId(/^field-point-/)).toHaveLength(232)
    expect(onFieldSelect).not.toHaveBeenCalled()
  })

  it('honors matched and unmatched URL selections without shrinking the cloud', () => {
    const onFieldSelect = vi.fn()
    const { rerender } = render(
      <FieldEducationComparison
        comparison={comparison}
        fieldCatalog={fieldCatalog}
        allRecords={allRecords}
        selectedField="matched 1"
        onFieldSelect={onFieldSelect}
      />,
    )
    expect(screen.getByRole('heading', { name: 'Matched 1' })).toBeInTheDocument()

    rerender(
      <FieldEducationComparison
        comparison={comparison}
        fieldCatalog={fieldCatalog}
        allRecords={allRecords}
        selectedField="unmatched 0"
        onFieldSelect={onFieldSelect}
      />,
    )
    expect(screen.getByRole('heading', { name: 'Unmatched 0' })).toBeInTheDocument()
    expect(screen.getByText(/údaje o absolventoch nie sú/i)).toBeInTheDocument()
    expect(screen.getAllByTestId(/^field-point-/)).toHaveLength(232)
  })

  it('routes ranking selection through the shared canonical callback', () => {
    const onFieldSelect = vi.fn()
    render(
      <FieldEducationComparison
        comparison={comparison}
        fieldCatalog={fieldCatalog}
        allRecords={allRecords}
        selectedField={null}
        onFieldSelect={onFieldSelect}
      />,
    )

    fireEvent.change(screen.getByRole('searchbox', { name: /hľadať odbor/i }), {
      target: { value: 'matched 1' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Matched 1' }))
    expect(onFieldSelect).toHaveBeenCalledWith('matched 1')
  })
})
