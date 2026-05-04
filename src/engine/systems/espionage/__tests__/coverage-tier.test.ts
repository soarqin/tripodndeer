import { describe, expect, it } from 'vitest'

import { getCoverageTier } from '../coverage-tier'

describe('getCoverageTier', () => {
  it('returns "hidden" for coverage 0', () => {
    expect(getCoverageTier(0)).toBe('hidden')
  })

  it('returns "hidden" for coverage 29', () => {
    expect(getCoverageTier(29)).toBe('hidden')
  })

  it('returns "low" for coverage 30 (tier 1 boundary)', () => {
    expect(getCoverageTier(30)).toBe('low')
  })

  it('returns "low" for coverage 59', () => {
    expect(getCoverageTier(59)).toBe('low')
  })

  it('returns "mid" for coverage 60 (tier 2 boundary)', () => {
    expect(getCoverageTier(60)).toBe('mid')
  })

  it('returns "mid" for coverage 89', () => {
    expect(getCoverageTier(89)).toBe('mid')
  })

  it('returns "high" for coverage 90 (tier 3 boundary)', () => {
    expect(getCoverageTier(90)).toBe('high')
  })

  it('returns "high" for coverage 100', () => {
    expect(getCoverageTier(100)).toBe('high')
  })

  it('returns "hidden" for negative coverage -1 (defensive)', () => {
    expect(getCoverageTier(-1)).toBe('hidden')
  })

  it('returns "high" for coverage 200 (defensive: > 100)', () => {
    expect(getCoverageTier(200)).toBe('high')
  })
})
