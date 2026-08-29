const numberFormatters = new Map<string, Intl.NumberFormat>()
const slovakDateFormatter = new Intl.DateTimeFormat('sk-SK', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

export function formatNumber(
  value: number,
  options: Intl.NumberFormatOptions = {},
): string {
  const key = JSON.stringify(options)
  let formatter = numberFormatters.get(key)
  if (formatter === undefined) {
    formatter = new Intl.NumberFormat('sk-SK', options)
    numberFormatters.set(key, formatter)
  }
  return formatter.format(value)
}

export function formatAppointmentCount(count: number): string {
  const noun =
    count === 1
      ? 'vymenovanie'
      : count >= 2 && count <= 4
        ? 'vymenovania'
        : 'vymenovaní'
  return `${formatNumber(count)} ${noun}`
}

export function formatDate(isoDate: string): string {
  return slovakDateFormatter.format(new Date(`${isoDate}T00:00:00Z`))
}
