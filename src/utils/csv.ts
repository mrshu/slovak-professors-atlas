import type { Appointment, AtlasData, Institution, President, SourceVariant } from '../data/types'

export const METHODOLOGY_URL = 'https://mrshu.github.io/slovak-professors/#metodika'

const CSV_HEADERS = [
  'ID záznamu',
  'Meno',
  'Tituly pred menom',
  'Tituly za menom',
  'Dátum vymenovania',
  'Prezident',
  'Prezident (ID)',
  'Kanonická inštitúcia',
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

function csvRecord(
  record: Appointment,
  institutionById: ReadonlyMap<string, Institution>,
  presidentById: ReadonlyMap<string, President>,
): string {
  const institution = institutionById.get(record.institutionId)
  if (institution === undefined) {
    throw new Error(
      `Cannot export record "${record.id}": missing institution metadata for ID "${record.institutionId}".`,
    )
  }

  const president = presidentById.get(record.presidentId)
  if (president === undefined) {
    throw new Error(
      `Cannot export record "${record.id}": missing president metadata for ID "${record.presidentId}".`,
    )
  }

  const sourceRows = record.sourceVariants.map(({ rowNumber }) => rowNumber).join(' | ')
  const sourceVariants = record.sourceVariants.map(sourceVariantText).join(' || ')
  const values: readonly (string | number | null)[] = [
    record.id,
    record.name,
    record.titlesBefore,
    record.titlesAfter,
    record.appointedOn,
    president.name,
    record.presidentId,
    institution.fullName,
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

export type CsvMetadata = Pick<AtlasData, 'institutions' | 'presidents'>

export function recordsToCsv(
  records: readonly Appointment[],
  metadata: CsvMetadata,
): string {
  const institutionById = new Map(
    metadata.institutions.map((institution) => [institution.id, institution] as const),
  )
  const presidentById = new Map(
    metadata.presidents.map((president) => [president.id, president] as const),
  )
  const lines = [
    CSV_HEADERS.map(csvCell).join(';'),
    ...records.map((record) => csvRecord(record, institutionById, presidentById)),
  ]
  return `\uFEFF${lines.join('\r\n')}\r\n`
}
