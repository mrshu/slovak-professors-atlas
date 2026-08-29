import type { Appointment, SourceVariant } from '../data/types'

export const METHODOLOGY_URL = 'https://mrshu.github.io/slovak-professors/#metodika'

const CSV_HEADERS = [
  'ID záznamu',
  'Meno',
  'Tituly pred menom',
  'Tituly za menom',
  'Dátum vymenovania',
  'Prezident (ID)',
  'Kanonická inštitúcia (ID)',
  'Zdrojová inštitúcia',
  'Fakulta',
  'Odbor',
  'Zdrojové riadky',
  'Zdrojové varianty',
  'Metodika',
] as const

function protectFormula(value: string): string {
  return /^\s*[=+\-@]/u.test(value) ? `'${value}` : value
}

function csvCell(value: string | number | null): string {
  const protectedValue = protectFormula(value === null ? '' : String(value))
  return /[;"\r\n]/u.test(protectedValue)
    ? `"${protectedValue.replaceAll('"', '""')}"`
    : protectedValue
}

function sourceVariantText(variant: SourceVariant): string {
  const values = [
    `tituly pred menom: ${variant.titlesBefore ?? ''}`,
    `tituly za menom: ${variant.titlesAfter ?? ''}`,
    `inštitúcia: ${variant.institution}`,
    `fakulta: ${variant.faculty ?? ''}`,
    `odbor: ${variant.field}`,
  ]
  return `Riadok ${variant.rowNumber}: ${values.join('; ')}`
}

function csvRecord(record: Appointment): string {
  const sourceRows = record.sourceVariants.map(({ rowNumber }) => rowNumber).join(' | ')
  const sourceVariants = record.sourceVariants.map(sourceVariantText).join(' || ')
  const values: readonly (string | number | null)[] = [
    record.id,
    record.name,
    record.titlesBefore,
    record.titlesAfter,
    record.appointedOn,
    record.presidentId,
    record.institutionId,
    record.institutionSource,
    record.faculty,
    record.field,
    sourceRows,
    sourceVariants,
    METHODOLOGY_URL,
  ]

  return values.map(csvCell).join(';')
}

export function recordsToCsv(records: readonly Appointment[]): string {
  const lines = [CSV_HEADERS.map(csvCell).join(';'), ...records.map(csvRecord)]
  return `\uFEFF${lines.join('\r\n')}\r\n`
}
