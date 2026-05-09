import { describe, expect, it } from 'vitest'
import { DIFFICULTY_TIERS, type DifficultyTier } from '~/shared/types'
import { DifficultyTierSchema } from '../schemas/difficulty'

describe('DifficultyTier', () => {
  it('exports the five literal tiers', () => {
    expect(DIFFICULTY_TIERS).toEqual(['weak', 'common', 'hero', 'hegemon', 'sage'])
    const tiers: readonly DifficultyTier[] = DIFFICULTY_TIERS
    expect(tiers).toHaveLength(5)
  })

  it('accepts valid tier values', () => {
    for (const tier of DIFFICULTY_TIERS) {
      expect(DifficultyTierSchema.parse(tier)).toBe(tier)
    }
  })

  it('rejects invalid tier values', () => {
    expect(DifficultyTierSchema.safeParse('novice').success).toBe(false)
    expect(DifficultyTierSchema.safeParse('').success).toBe(false)
  })
})
