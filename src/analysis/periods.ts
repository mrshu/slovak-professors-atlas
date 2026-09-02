import type { Affiliation, Appointment } from '../data/types'
import { cityCounts } from './selectors'

export interface Period {
  startYear: number
  endYear: number
  label: string
}

export interface CityPeriodShare {
  city: string
  count: number
  share: number
}

export const FIVE_YEAR_PERIODS: readonly Period[] = [2000, 2005, 2010, 2015, 2020].map(
  (startYear) => ({
    startYear,
    endYear: startYear + 4,
    label: `${startYear}–${startYear + 4}`,
  }),
)

export function periodForRange(startYear: number, endYear: number): Period | null {
  return (
    FIVE_YEAR_PERIODS.find(
      (period) => period.startYear === startYear && period.endYear === endYear,
    ) ?? null
  )
}

export function cityShares(
  records: readonly Appointment[],
  affiliations: readonly Affiliation[],
): CityPeriodShare[] {
  const counts = cityCounts(records, affiliations)
  const located = counts.reduce((total, { count }) => total + count, 0)
  return counts.map(({ city, count }) => ({
    city,
    count,
    share: located === 0 ? 0 : count / located,
  }))
}

export function citySharesByPeriod(
  records: readonly Appointment[],
  affiliations: readonly Affiliation[],
): Map<string, CityPeriodShare[]> {
  const result = new Map<string, CityPeriodShare[]>()
  for (const period of FIVE_YEAR_PERIODS) {
    const inPeriod = records.filter((record) => {
      const year = Number.parseInt(record.appointedOn.slice(0, 4), 10)
      return year >= period.startYear && year <= period.endYear
    })
    if (inPeriod.length === 0) continue
    result.set(period.label, cityShares(inPeriod, affiliations))
  }
  return result
}
