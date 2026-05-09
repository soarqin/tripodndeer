import { describe, expect, it } from 'vitest'
import {
  M8_2_BORDER_SKIRMISH_ARMY_THRESHOLD,
  M8_2_DIFFICULTY_PROFILES,
  M8_2_DRIFT_CLAMP_MAX,
  M8_2_DRIFT_CLAMP_MIN,
  M8_2_DRIFT_RULES,
  M8_2_MEMORY_DECAY_FACTOR_PER_XUN,
  M8_2_MEMORY_EVENT_BASE_WEIGHT,
  M8_2_MEMORY_MAX_SCORE,
  M8_2_MEMORY_MIN_SCORE,
} from '~/content/m2/balance'

describe('M8_2 balance invariants', () => {
  it('has all 5 difficulty keys', () => {
    expect(Object.keys(M8_2_DIFFICULTY_PROFILES).sort()).toEqual(['common', 'hegemon', 'hero', 'sage', 'weak'])
  })

  it('has 6 memory event base weights', () => {
    expect(Object.keys(M8_2_MEMORY_EVENT_BASE_WEIGHT)).toHaveLength(6)
  })

  it('decay factor is between 0 and 1', () => {
    expect(M8_2_MEMORY_DECAY_FACTOR_PER_XUN).toBeGreaterThan(0)
    expect(M8_2_MEMORY_DECAY_FACTOR_PER_XUN).toBeLessThan(1)
  })

  it('hero difficulty has no AI economy bonus', () => {
    expect(M8_2_DIFFICULTY_PROFILES.hero.aiEconomyMul).toBe(1.0)
  })

  it('sage difficulty has strongest AI economy bonus', () => {
    expect(M8_2_DIFFICULTY_PROFILES.sage.aiEconomyMul).toBe(1.2)
  })

  it('weak difficulty boosts player economy', () => {
    expect(M8_2_DIFFICULTY_PROFILES.weak.playerEconomyMul).toBe(1.1)
  })

  it('drift rules and clamps are defined', () => {
    expect(M8_2_DRIFT_RULES).toHaveLength(3)
    expect(M8_2_DRIFT_CLAMP_MIN).toBe(0)
    expect(M8_2_DRIFT_CLAMP_MAX).toBe(1)
    expect(M8_2_MEMORY_MAX_SCORE).toBe(100)
    expect(M8_2_MEMORY_MIN_SCORE).toBe(1)
    expect(M8_2_BORDER_SKIRMISH_ARMY_THRESHOLD).toBe(1000)
  })
})
