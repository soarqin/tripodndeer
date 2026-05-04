import { describe, expect, it } from 'vitest'
import { M5_PERSONALITY_WEIGHTS } from '~/content/m2/balance'
import type { PersonalityArchetype } from '~/shared/types'

const ARCHETYPES: PersonalityArchetype[] = [
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

describe('M8 tactical differentiation', () => {
  it('all 8 archetypes have a cut-supply column', () => {
    for (const archetype of ARCHETYPES) {
      const row = M5_PERSONALITY_WEIGHTS[archetype]
      expect(row, `archetype ${archetype} missing`).toBeDefined()
      expect(
        typeof row!['cut-supply'],
        `archetype ${archetype} missing cut-supply`
      ).toBe('number')
    }
  })

  it('schemer cut-supply > tyrant cut-supply (schemer prefers raids over assault)', () => {
    expect(M5_PERSONALITY_WEIGHTS.schemer!['cut-supply']).toBeGreaterThan(
      M5_PERSONALITY_WEIGHTS.tyrant!['cut-supply']!
    )
  })

  it('no idle column added to any archetype', () => {
    for (const archetype of ARCHETYPES) {
      const row = M5_PERSONALITY_WEIGHTS[archetype]
      expect(row!['idle']).toBeUndefined()
    }
  })

  it('builder differs from learned in at least 1 tactical column', () => {
    const builder = M5_PERSONALITY_WEIGHTS.builder!
    const learned = M5_PERSONALITY_WEIGHTS.learned!
    const hasDifference = TACTICAL_COLUMNS.some(
      (col) => builder[col] !== learned[col]
    )
    expect(hasDifference).toBe(true)
  })

  describe('All 28 archetype-pairs differ in ≥1 tactical column', () => {
    const pairs: [PersonalityArchetype, PersonalityArchetype][] = []
    for (let i = 0; i < ARCHETYPES.length; i++) {
      for (let j = i + 1; j < ARCHETYPES.length; j++) {
        pairs.push([ARCHETYPES[i]!, ARCHETYPES[j]!])
      }
    }

    it('there are exactly 28 archetype pairs', () => {
      expect(pairs).toHaveLength(28)
    })

    it.each(pairs)(
      'pair %s vs %s differs in ≥1 of {attack, siege-continue, retreat, cut-supply}',
      (a, b) => {
        const rowA = M5_PERSONALITY_WEIGHTS[a]!
        const rowB = M5_PERSONALITY_WEIGHTS[b]!
        const hasDifference = TACTICAL_COLUMNS.some(
          (col) => rowA[col] !== rowB[col]
        )
        expect(hasDifference).toBe(true)
      }
    )
  })
})
