import { describe, it, expect } from 'vitest'
import { M5_PERSONALITY_DIMS_BASELINE } from '../balance/m5'
import type { PersonalityArchetype } from '~/shared/types'

const ARCHETYPES: readonly PersonalityArchetype[] = [
  'conqueror',
  'steward',
  'schemer',
  'learned',
  'tyrant',
  'incompetent',
  'benevolent',
  'builder',
]

describe('M5_PERSONALITY_DIMS_BASELINE', () => {
  it('has all 8 archetypes', () => {
    for (const archetype of ARCHETYPES) {
      expect(M5_PERSONALITY_DIMS_BASELINE[archetype]).toBeDefined()
    }
    expect(Object.keys(M5_PERSONALITY_DIMS_BASELINE)).toHaveLength(8)
  })

  it('conqueror.expansionDrive > steward.expansionDrive', () => {
    expect(M5_PERSONALITY_DIMS_BASELINE.conqueror.expansionDrive).toBeGreaterThan(
      M5_PERSONALITY_DIMS_BASELINE.steward.expansionDrive,
    )
  })

  it('tyrant.vindictiveness > benevolent.vindictiveness', () => {
    expect(M5_PERSONALITY_DIMS_BASELINE.tyrant.vindictiveness).toBeGreaterThan(
      M5_PERSONALITY_DIMS_BASELINE.benevolent.vindictiveness,
    )
  })

  it('builder.reformInclination > steward.reformInclination', () => {
    expect(M5_PERSONALITY_DIMS_BASELINE.builder.reformInclination).toBeGreaterThan(
      M5_PERSONALITY_DIMS_BASELINE.steward.reformInclination,
    )
  })

  it('all numeric values are in [0, 1] range', () => {
    const numericDims = [
      'expansionDrive',
      'caution',
      'vindictiveness',
      'patience',
      'diplomaticTrust',
      'honor',
      'reformInclination',
    ] as const

    for (const archetype of ARCHETYPES) {
      const profile = M5_PERSONALITY_DIMS_BASELINE[archetype]
      for (const dim of numericDims) {
        const val = profile[dim]
        expect(val, `${archetype}.${dim} = ${val}`).toBeGreaterThanOrEqual(0)
        expect(val, `${archetype}.${dim} = ${val}`).toBeLessThanOrEqual(1)
      }
    }
  })

  it('incompetent has all numeric dims exactly 0.5', () => {
    const profile = M5_PERSONALITY_DIMS_BASELINE.incompetent
    expect(profile.expansionDrive).toBe(0.5)
    expect(profile.caution).toBe(0.5)
    expect(profile.vindictiveness).toBe(0.5)
    expect(profile.patience).toBe(0.5)
    expect(profile.diplomaticTrust).toBe(0.5)
    expect(profile.honor).toBe(0.5)
    expect(profile.reformInclination).toBe(0.5)
  })
})
