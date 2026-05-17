import { describe, expect, it } from 'vitest'

import {
  M11_AUTOSAVE_INTERVAL_TICKS,
  M11_AUTOSAVE_RING_SIZE,
  M11_COMPRESSION_SPEED_MS,
  M11_COMPRESSION_TARGET_KB,
  M11_QUOTA_BLOCK_THRESHOLD_PCT,
  M11_QUOTA_CACHE_TTL_MS,
  M11_QUOTA_PRIVATE_FALLBACK_MB,
  M11_QUOTA_WARN_THRESHOLD_PCT,
  M11_SCENARIO_VERSIONS,
} from '~/content/m2/balance'

describe('M11 balance constants', () => {
  it('exports the expected scenario versions', () => {
    expect(M11_SCENARIO_VERSIONS).toEqual({
      m1: '1.0.0',
      m9: '1.0.0',
      tutorial: '1.0.0',
    })
  })

  it('exports the expected autosave constants', () => {
    expect(M11_AUTOSAVE_RING_SIZE).toBe(10)
    expect(M11_AUTOSAVE_INTERVAL_TICKS).toBe(100)
  })

  it('exports the expected compression constants', () => {
    expect(M11_COMPRESSION_TARGET_KB).toBe(50)
    expect(M11_COMPRESSION_SPEED_MS).toBe(100)
  })

  it('exports the expected quota constants', () => {
    expect(M11_QUOTA_WARN_THRESHOLD_PCT).toBe(80)
    expect(M11_QUOTA_BLOCK_THRESHOLD_PCT).toBe(95)
    expect(M11_QUOTA_CACHE_TTL_MS).toBe(5 * 60 * 1000)
    expect(M11_QUOTA_PRIVATE_FALLBACK_MB).toBe(5)
  })
})
