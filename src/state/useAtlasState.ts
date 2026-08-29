import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { filterAppointments } from '../analysis/selectors'
import type { Appointment, AtlasData } from '../data/types'
import {
  createFilterOptions,
  type FilterState,
  type FilterValueKey,
  type HistoryMode,
} from './filters'
import { parseFilters, serializeFilters } from './url'

export interface AtlasState {
  filters: FilterState
  filteredRecords: Appointment[]
  setFilter: (key: FilterValueKey, value: string | null, mode?: HistoryMode) => void
  setDateRange: (startYear: number, endYear: number, mode?: HistoryMode) => void
  setSelectedYear: (year: number, mode?: HistoryMode) => void
  setTimelineYear: (year: number | null, mode?: HistoryMode) => void
  setAppointmentDate: (appointedOn: string | null, mode?: HistoryMode) => void
  setQuery: (query: string) => void
  resetFilters: (mode?: HistoryMode) => void
}

interface AtlasHistoryState {
  atlas?: {
    lastContextYear: number
  }
}

const OPTION_KEY_BY_FILTER: Record<
  FilterValueKey,
  | 'presidentIds'
  | 'cities'
  | 'institutionIds'
  | 'faculties'
  | 'fields'
  | 'appointmentDates'
> = {
  presidentId: 'presidentIds',
  city: 'cities',
  institutionId: 'institutionIds',
  faculty: 'faculties',
  field: 'fields',
  appointedOn: 'appointmentDates',
}

function historyStateWithContextYear(lastContextYear: number): AtlasHistoryState {
  const currentState = window.history.state
  const preserved =
    typeof currentState === 'object' && currentState !== null
      ? (currentState as Record<string, unknown>)
      : {}

  return { ...preserved, atlas: { lastContextYear } }
}

export function useAtlasState(data: AtlasData): AtlasState {
  const options = useMemo(() => createFilterOptions(data), [data])
  const { defaults } = options
  const [filters, setFilters] = useState<FilterState>(() =>
    parseFilters(window.location.search, options),
  )
  const filtersRef = useRef(filters)
  const lastContextYearRef = useRef(filters.selectedYear)

  const writeHistory = useCallback(
    (nextFilters: FilterState, mode: HistoryMode) => {
      const url = new URL(window.location.href)
      url.search = serializeFilters(nextFilters, defaults)
      const state = historyStateWithContextYear(lastContextYearRef.current)
      window.history[mode === 'push' ? 'pushState' : 'replaceState'](state, '', url)
    },
    [defaults],
  )

  const commit = useCallback(
    (nextFilters: FilterState, mode: HistoryMode) => {
      filtersRef.current = nextFilters
      setFilters(nextFilters)
      writeHistory(nextFilters, mode)
    },
    [writeHistory],
  )

  useEffect(() => {
    const restoreFromHistory = (event: PopStateEvent) => {
      const restored = parseFilters(window.location.search, options)
      const savedContextYear = (event.state as AtlasHistoryState | null)?.atlas?.lastContextYear
      lastContextYearRef.current =
        typeof savedContextYear === 'number' &&
        Number.isInteger(savedContextYear) &&
        savedContextYear >= defaults.startYear &&
        savedContextYear <= defaults.endYear
          ? savedContextYear
          : restored.selectedYear
      filtersRef.current = restored
      setFilters(restored)
    }

    window.addEventListener('popstate', restoreFromHistory)
    return () => window.removeEventListener('popstate', restoreFromHistory)
  }, [defaults.endYear, defaults.startYear, options])

  const setFilter = useCallback(
    (key: FilterValueKey, value: string | null, mode: HistoryMode = 'push') => {
      if (value !== null && !options[OPTION_KEY_BY_FILTER[key]].includes(value)) {
        return
      }
      commit({ ...filtersRef.current, [key]: value }, mode)
    },
    [commit, options],
  )

  const setDateRange = useCallback(
    (startYear: number, endYear: number, mode: HistoryMode = 'push') => {
      if (
        !Number.isInteger(startYear) ||
        !Number.isInteger(endYear) ||
        startYear < defaults.startYear ||
        endYear > defaults.endYear ||
        startYear > endYear
      ) {
        return
      }
      commit({ ...filtersRef.current, startYear, endYear, appointedOn: null }, mode)
    },
    [commit, defaults.endYear, defaults.startYear],
  )

  const setSelectedYear = useCallback(
    (year: number, mode: HistoryMode = 'push') => {
      if (
        !Number.isInteger(year) ||
        year < defaults.startYear ||
        year > defaults.endYear
      ) {
        return
      }
      lastContextYearRef.current = year
      commit({ ...filtersRef.current, selectedYear: year }, mode)
    },
    [commit, defaults.endYear, defaults.startYear],
  )

  const setTimelineYear = useCallback(
    (year: number | null, mode: HistoryMode = 'push') => {
      if (year === null) {
        commit(
          {
            ...filtersRef.current,
            startYear: defaults.startYear,
            endYear: defaults.endYear,
            appointedOn: null,
            selectedYear: lastContextYearRef.current,
          },
          mode,
        )
        return
      }
      if (
        !Number.isInteger(year) ||
        year < defaults.startYear ||
        year > defaults.endYear
      ) {
        return
      }
      commit(
        {
          ...filtersRef.current,
          startYear: year,
          endYear: year,
          appointedOn: null,
          selectedYear: year,
        },
        mode,
      )
    },
    [commit, defaults.endYear, defaults.startYear],
  )

  const setQuery = useCallback(
    (query: string) => {
      commit({ ...filtersRef.current, query }, 'replace')
    },
    [commit],
  )
  const setAppointmentDate = useCallback(
    (appointedOn: string | null, mode: HistoryMode = 'push') => {
      if (appointedOn === null) {
        commit({ ...filtersRef.current, appointedOn: null }, mode)
        return
      }
      if (!options.appointmentDates.includes(appointedOn)) {
        return
      }
      const year = Number.parseInt(appointedOn.slice(0, 4), 10)
      lastContextYearRef.current = year
      commit(
        {
          ...filtersRef.current,
          startYear: defaults.startYear,
          endYear: defaults.endYear,
          appointedOn,
          selectedYear: year,
        },
        mode,
      )
    },
    [commit, defaults.endYear, defaults.startYear, options.appointmentDates],
  )


  const resetFilters = useCallback(
    (mode: HistoryMode = 'push') => {
      lastContextYearRef.current = defaults.selectedYear
      commit({ ...defaults }, mode)
    },
    [commit, defaults],
  )

  const filteredRecords = useMemo(
    () => filterAppointments(data, filters),
    [data, filters],
  )

  return {
    filters,
    filteredRecords,
    setFilter,
    setDateRange,
    setSelectedYear,
    setTimelineYear,
    setAppointmentDate,
    setQuery,
    resetFilters,
  }
}
