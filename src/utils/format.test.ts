import { describe, expect, it } from 'vitest'

import { formatDate, formatNumber } from './format'

describe('Slovak value formatting', () => {
  it('formats grouped numbers and decimal commas in Slovak', () => {
    expect(formatNumber(2378)).toBe('2 378')
    expect(formatNumber(8.13, { minimumFractionDigits: 2, maximumFractionDigits: 2 })).toBe(
      '8,13',
    )
  })

  it('formats ISO calendar dates without a local-time shift', () => {
    expect(formatDate('2000-02-22')).toBe('22. februára 2000')
    expect(formatDate('2026-06-03')).toBe('3. júna 2026')
  })
})
