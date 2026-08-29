import type { Appointment } from '../data/types'

const appointmentSearchIndex = new WeakMap<Appointment, string>()

export function normalizeForSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('sk-SK')
    .replace(/\s+/g, ' ')
    .trim()
}

function indexedAppointmentText(appointment: Appointment): string {
  const cached = appointmentSearchIndex.get(appointment)
  if (cached !== undefined) {
    return cached
  }

  const sourceVariantText = appointment.sourceVariants.flatMap((variant) => [
    variant.titlesBefore ?? '',
    variant.titlesAfter ?? '',
    variant.faculty ?? '',
    variant.institution,
    variant.field,
  ])
  const indexed = normalizeForSearch(
    [
      appointment.name,
      appointment.titlesBefore ?? '',
      appointment.titlesAfter ?? '',
      appointment.faculty ?? '',
      appointment.institutionSource,
      appointment.field,
      ...sourceVariantText,
    ].join(' '),
  )
  appointmentSearchIndex.set(appointment, indexed)
  return indexed
}

export function prepareSearchIndex(appointments: readonly Appointment[]): void {
  for (const appointment of appointments) {
    indexedAppointmentText(appointment)
  }
}

export function createSearchMatcher(query: string): (appointment: Appointment) => boolean {
  const normalizedQuery = normalizeForSearch(query)
  if (normalizedQuery.length === 0) {
    return () => true
  }

  return (appointment) => indexedAppointmentText(appointment).includes(normalizedQuery)
}

export function matchesSearch(appointment: Appointment, query: string): boolean {
  return createSearchMatcher(query)(appointment)
}
