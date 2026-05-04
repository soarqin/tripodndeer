import { describe, expect, it } from 'vitest'
import {
  M8_PERSONALITY_DIMENSIONS_COUNT,
  M8_PERSONALITY_ARCHETYPE_LIST,
  M8_WAR_DECLARATION_BIAS,
  M8_PEACE_ACCEPTANCE_THRESHOLD,
  M8_ALLIANCE_PROPENSITY,
  M8_COALITION_JOIN_BIAS,
  M8_RECRUITMENT_SPECIALTY_PREFERENCE,
  M8_TAX_RATE_TARGET,
  M8_TREASURY_RESERVE_FLOOR,
  M8_EDICT_ENACTMENT_BIAS,
} from '~/content/m2/balance'
import type { PersonalityArchetype } from '~/shared/types'

const ARCHETYPES: PersonalityArchetype[] = ['conqueror', 'steward', 'schemer', 'learned', 'tyrant', 'incompetent', 'benevolent', 'builder']

describe('M8 balance invariants', () => {
  it('M8_PERSONALITY_DIMENSIONS_COUNT === 8', () => {
    expect(M8_PERSONALITY_DIMENSIONS_COUNT).toBe(8)
  })

  it('M8_PERSONALITY_ARCHETYPE_LIST has 8 entries', () => {
    expect(M8_PERSONALITY_ARCHETYPE_LIST).toHaveLength(8)
  })

  it('All M8_* Record tables cover exactly 8 archetypes', () => {
    const tables = [
      M8_WAR_DECLARATION_BIAS,
      M8_PEACE_ACCEPTANCE_THRESHOLD,
      M8_ALLIANCE_PROPENSITY,
      M8_COALITION_JOIN_BIAS,
      M8_RECRUITMENT_SPECIALTY_PREFERENCE,
      M8_TAX_RATE_TARGET,
      M8_TREASURY_RESERVE_FLOOR,
      M8_EDICT_ENACTMENT_BIAS,
    ]

    for (const table of tables) {
      expect(Object.keys(table)).toHaveLength(8)
      for (const archetype of ARCHETYPES) {
        expect(table[archetype as keyof typeof table]).toBeDefined()
      }
    }
  })

  it('M8_WAR_DECLARATION_BIAS has non-zero values for each archetype', () => {
    for (const archetype of ARCHETYPES) {
      expect(M8_WAR_DECLARATION_BIAS[archetype]).not.toBe(0)
    }
  })

  it('conqueror peace threshold < benevolent peace threshold (semantic invariant)', () => {
    expect(M8_PEACE_ACCEPTANCE_THRESHOLD['conqueror']).toBeLessThan(M8_PEACE_ACCEPTANCE_THRESHOLD['benevolent'])
  })

  it('tyrant tax rate target > benevolent tax rate target', () => {
    expect(M8_TAX_RATE_TARGET['tyrant']).toBeGreaterThan(M8_TAX_RATE_TARGET['benevolent'])
  })
})
