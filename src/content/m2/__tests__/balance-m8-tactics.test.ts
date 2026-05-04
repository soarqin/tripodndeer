import { describe, expect, it } from 'vitest'
import { M5_PERSONALITY_WEIGHTS } from '~/content/m2/balance'
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

const TACTICAL_COLUMNS = [
  'attack',
  'siege-continue',
  'retreat',
  'cut-supply',
] as const

describe('M8 tactical personality balance invariants', () => {
  it('all archetype pairs differ in at least one tactical scoring column', () => {
    let pairsChecked = 0

    for (let i = 0; i < ARCHETYPES.length; i += 1) {
      for (let j = i + 1; j < ARCHETYPES.length; j += 1) {
        const a = ARCHETYPES[i]!
        const b = ARCHETYPES[j]!
        const weightsA = M5_PERSONALITY_WEIGHTS[a]!
        const weightsB = M5_PERSONALITY_WEIGHTS[b]!

        pairsChecked += 1
        expect(
          TACTICAL_COLUMNS.some((column) => weightsA[column] !== weightsB[column]),
          `${a} and ${b} should differ in at least one tactical column`,
        ).toBe(true)
      }
    }

    expect(pairsChecked).toBe(28)
  })

  it('schemer values cut-supply more than tyrant', () => {
    expect(M5_PERSONALITY_WEIGHTS['schemer']!['cut-supply']).toBeGreaterThan(
      M5_PERSONALITY_WEIGHTS['tyrant']!['cut-supply']!,
    )
  })

  it('cut-supply weights preserve tactical semantics', () => {
    expect(M5_PERSONALITY_WEIGHTS['schemer']!['cut-supply']).toBeGreaterThanOrEqual(
      M5_PERSONALITY_WEIGHTS['conqueror']!['cut-supply']!,
    )
    expect(M5_PERSONALITY_WEIGHTS['conqueror']!['cut-supply']).toBeGreaterThanOrEqual(1.0)
    expect(M5_PERSONALITY_WEIGHTS['tyrant']!['cut-supply']).toBeLessThan(1.0)
  })
})
