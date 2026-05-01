import { describe, it, expect } from 'vitest'
import * as balance from '../balance'
import {
  M5_RULER_BASE_LIFESPAN,
  M5_RULER_LIFESPAN_VARIANCE,
  M5_HEALTH_DECREASE_PER_YEAR,
  M5_HEALTH_DEATH_THRESHOLD,
  M5_LOYALTY_SHIRKING_THRESHOLD,
  M5_LOYALTY_DEPARTURE_THRESHOLD,
  M5_LOYALTY_SECRET_CONTACT_THRESHOLD,
  M5_LOYALTY_DEFECTION_THRESHOLD,
  M5_RECRUITMENT_PER_REALM_PER_YEAR,
  M5_RECRUITMENT_NAMING_POOL_SIZE,
  M5_GOVERNOR_TAX_BONUS_PER_ZHENG,
  M5_GOVERNOR_FOOD_BONUS_PER_ZHENG,
  M5_ARMY_CAP_BONUS_PER_WU,
  M5_PERSONALITY_WEIGHTS,
  M5_SPECIALTY_WEIGHTS_RECRUITMENT,
} from '../balance'

describe('M5 balance constants', () => {
  it('all 8 archetypes present in M5_PERSONALITY_WEIGHTS', () => {
    const expectedArchetypes = [
      'conqueror', 'steward', 'schemer', 'learned',
      'tyrant', 'incompetent', 'benevolent', 'builder',
    ]
    for (const archetype of expectedArchetypes) {
      expect(M5_PERSONALITY_WEIGHTS[archetype]).toBeDefined()
    }
    expect(Object.keys(M5_PERSONALITY_WEIGHTS).length).toBe(8)
  })

  it('each archetype has at least 3 action kinds with positive weights', () => {
    for (const archetype of Object.keys(M5_PERSONALITY_WEIGHTS)) {
      const weights = M5_PERSONALITY_WEIGHTS[archetype]
      expect(weights).toBeDefined()
      if (!weights) continue
      const actionKinds = Object.keys(weights)
      expect(actionKinds.length).toBeGreaterThanOrEqual(3)
      for (const kind of actionKinds) {
        const w = weights[kind]
        expect(w).toBeDefined()
        expect(w).toBeGreaterThan(0)
      }
    }
  })

  it('all 9 specialties present in M5_SPECIALTY_WEIGHTS_RECRUITMENT', () => {
    const expectedSpecialties = [
      'commander', 'warrior', 'strategist', 'administrator',
      'reformer', 'diplomat', 'spy', 'scholar', 'engineer',
    ]
    for (const specialty of expectedSpecialties) {
      expect(M5_SPECIALTY_WEIGHTS_RECRUITMENT[specialty]).toBeDefined()
    }
    expect(Object.keys(M5_SPECIALTY_WEIGHTS_RECRUITMENT).length).toBe(9)
  })

  it('specialty weights sum to ~1.0 (within 0.01 tolerance)', () => {
    const sum = Object.values(M5_SPECIALTY_WEIGHTS_RECRUITMENT).reduce(
      (a, b) => a + b,
      0,
    )
    expect(sum).toBeGreaterThanOrEqual(0.99)
    expect(sum).toBeLessThanOrEqual(1.01)
  })

  it('loyalty thresholds are monotonically decreasing', () => {
    expect(M5_LOYALTY_DEFECTION_THRESHOLD).toBeLessThan(
      M5_LOYALTY_SECRET_CONTACT_THRESHOLD,
    )
    expect(M5_LOYALTY_SECRET_CONTACT_THRESHOLD).toBeLessThan(
      M5_LOYALTY_DEPARTURE_THRESHOLD,
    )
    expect(M5_LOYALTY_DEPARTURE_THRESHOLD).toBeLessThan(
      M5_LOYALTY_SHIRKING_THRESHOLD,
    )
  })

  it('at least 14 M5_ constants exported from balance.ts', () => {
    const m5Keys = Object.keys(balance).filter((k) => k.startsWith('M5_'))
    expect(m5Keys.length).toBeGreaterThanOrEqual(14)
  })

  it('M5_GOVERNOR_TAX_BONUS_PER_ZHENG × 10 = 5 (backward compat with old fixed M4_GOVERNOR_TAX_MODIFIER)', () => {
    expect(M5_GOVERNOR_TAX_BONUS_PER_ZHENG * 10).toBe(5)
    expect(M5_GOVERNOR_FOOD_BONUS_PER_ZHENG * 10).toBe(5)
  })

  it('ruler lifecycle constants are sensible', () => {
    expect(M5_RULER_BASE_LIFESPAN).toBeGreaterThan(0)
    expect(M5_RULER_LIFESPAN_VARIANCE).toBeGreaterThanOrEqual(0)
    expect(M5_HEALTH_DECREASE_PER_YEAR).toBeGreaterThan(0)
    expect(M5_HEALTH_DEATH_THRESHOLD).toBeGreaterThanOrEqual(0)
  })

  it('recruitment and army cap constants are positive', () => {
    expect(M5_RECRUITMENT_PER_REALM_PER_YEAR).toBeGreaterThan(0)
    expect(M5_RECRUITMENT_NAMING_POOL_SIZE).toBeGreaterThan(0)
    expect(M5_ARMY_CAP_BONUS_PER_WU).toBeGreaterThan(0)
  })
})
