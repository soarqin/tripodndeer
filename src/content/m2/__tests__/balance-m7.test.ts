import { describe, expect, it } from 'vitest'
import * as balance from '../balance'
import {
  M7_COUNTER_DETECTION_BONUS_PER_LEVEL,
  M7_COVERAGE_TIER_1,
  M7_COVERAGE_TIER_2,
  M7_COVERAGE_TIER_3,
  M7_DISCORD_BASE_SUCCESS,
  M7_DISCORD_DURATION_TICKS,
  M7_DISCORD_LOYALTY_DELTA,
  M7_ENABLED,
  M7_ESPIONAGE_WEIGHTS,
  M7_FAILURE_ATTITUDE_DELTA,
  M7_FAILURE_TRUST_DELTA,
  M7_HIGH_RISK_EXPOSE_PROB,
  M7_LOW_RISK_EXPOSE_PROB,
  M7_MID_RISK_EXPOSE_PROB,
  M7_RECON_BASE_SUCCESS,
  M7_RECON_COVERAGE_GAIN,
  M7_RECON_DURATION_TICKS,
  M7_RUMOR_BASE_SUCCESS,
  M7_RUMOR_DURATION_TICKS,
  M7_RUMOR_FACTION_DELTA,
  M7_SPY_SKILL_BONUS_PER_MOU,
} from '../balance'
import { ESPIONAGE_ACTION_KINDS } from '~/shared/types'

describe('M7 balance constants', () => {
  it('exports at least 22 M7_ constants', () => {
    const m7Keys = Object.keys(balance).filter((key) => key.startsWith('M7_'))
    expect(m7Keys.length).toBeGreaterThanOrEqual(22)
  })

  it('M7_ENABLED is a boolean feature flag', () => {
    expect(typeof M7_ENABLED).toBe('boolean')
    expect(M7_ENABLED).toBe(true)
  })

  it('all probability values are in [0, 1]', () => {
    const probs = [
      M7_RECON_BASE_SUCCESS,
      M7_RUMOR_BASE_SUCCESS,
      M7_DISCORD_BASE_SUCCESS,
      M7_LOW_RISK_EXPOSE_PROB,
      M7_MID_RISK_EXPOSE_PROB,
      M7_HIGH_RISK_EXPOSE_PROB,
      M7_COUNTER_DETECTION_BONUS_PER_LEVEL,
      M7_SPY_SKILL_BONUS_PER_MOU,
    ]
    for (const p of probs) {
      expect(p).toBeGreaterThanOrEqual(0)
      expect(p).toBeLessThanOrEqual(1)
    }
  })

  it('failure penalties are non-zero negatives (attitude/trust deltas)', () => {
    expect(M7_FAILURE_ATTITUDE_DELTA).toBeLessThan(0)
    expect(M7_FAILURE_TRUST_DELTA).toBeLessThan(0)
    expect(M7_RUMOR_FACTION_DELTA).toBeLessThan(0)
    expect(M7_DISCORD_LOYALTY_DELTA).toBeLessThan(0)
  })

  it('recon coverage gain is positive', () => {
    expect(M7_RECON_COVERAGE_GAIN).toBeGreaterThan(0)
  })

  it('mission durations are positive integers', () => {
    expect(M7_RECON_DURATION_TICKS).toBeGreaterThan(0)
    expect(M7_RUMOR_DURATION_TICKS).toBeGreaterThan(0)
    expect(M7_DISCORD_DURATION_TICKS).toBeGreaterThan(0)
    expect(Number.isInteger(M7_RECON_DURATION_TICKS)).toBe(true)
    expect(Number.isInteger(M7_RUMOR_DURATION_TICKS)).toBe(true)
    expect(Number.isInteger(M7_DISCORD_DURATION_TICKS)).toBe(true)
  })

  it('exposure probability monotonically increases with risk tier', () => {
    expect(M7_LOW_RISK_EXPOSE_PROB).toBeLessThan(M7_MID_RISK_EXPOSE_PROB)
    expect(M7_MID_RISK_EXPOSE_PROB).toBeLessThan(M7_HIGH_RISK_EXPOSE_PROB)
  })

  it('coverage thresholds are strictly increasing (30 < 60 < 90)', () => {
    expect(M7_COVERAGE_TIER_1).toBeLessThan(M7_COVERAGE_TIER_2)
    expect(M7_COVERAGE_TIER_2).toBeLessThan(M7_COVERAGE_TIER_3)
  })

  it('M7_ESPIONAGE_WEIGHTS has 8 archetypes × 4 actions = 32 entries', () => {
    const archetypes = Object.keys(M7_ESPIONAGE_WEIGHTS)
    expect(archetypes.length).toBe(8)

    let totalEntries = 0
    for (const archetype of archetypes) {
      const weights = M7_ESPIONAGE_WEIGHTS[archetype as keyof typeof M7_ESPIONAGE_WEIGHTS]
      const actions = Object.keys(weights)
      expect(actions.length).toBe(4)
      totalEntries += actions.length
    }

    expect(totalEntries).toBe(32)
  })

  it('every M7_ESPIONAGE_WEIGHTS entry covers all 4 ESPIONAGE_ACTION_KINDS', () => {
    for (const archetype of Object.keys(M7_ESPIONAGE_WEIGHTS)) {
      const weights = M7_ESPIONAGE_WEIGHTS[archetype as keyof typeof M7_ESPIONAGE_WEIGHTS]
      for (const action of ESPIONAGE_ACTION_KINDS) {
        expect(weights[action]).toBeDefined()
        expect(weights[action]).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('schemer.discord weight ≥ 2.0 (§12.3.B guard — schemers favor sabotage)', () => {
    expect(M7_ESPIONAGE_WEIGHTS.schemer.discord).toBeGreaterThanOrEqual(2.0)
  })

  it('tyrant.discord weight ≥ 2.0 (§12.3.B guard — tyrants favor sabotage)', () => {
    expect(M7_ESPIONAGE_WEIGHTS.tyrant.discord).toBeGreaterThanOrEqual(2.0)
  })

  it('benevolent.discord weight ≤ 0.5 (benevolent rulers avoid sabotage)', () => {
    expect(M7_ESPIONAGE_WEIGHTS.benevolent.discord).toBeLessThanOrEqual(0.5)
  })

  it('all 8 archetypes are present in M7_ESPIONAGE_WEIGHTS', () => {
    const expectedArchetypes = [
      'conqueror', 'steward', 'schemer', 'learned',
      'tyrant', 'incompetent', 'benevolent', 'builder',
    ]
    for (const archetype of expectedArchetypes) {
      expect(M7_ESPIONAGE_WEIGHTS[archetype as keyof typeof M7_ESPIONAGE_WEIGHTS]).toBeDefined()
    }
  })
})
