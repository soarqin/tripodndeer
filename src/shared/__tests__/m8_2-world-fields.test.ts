import { describe, it, expect } from 'vitest'

import type { World } from '~/shared/types/world'
import type { DifficultyTier } from '~/shared/types/difficulty'
import type { MemoryKey, DiplomaticMemory } from '~/shared/types/diplomatic-memory'

describe('World interface fields', () => {
  it('includes difficulty and diplomaticMemory', () => {
    const fields = {
      difficulty: 'hero' as DifficultyTier,
      diplomaticMemory: new Map<MemoryKey, DiplomaticMemory>(),
    } satisfies Pick<World, 'difficulty' | 'diplomaticMemory'>

    expect(fields.difficulty).toBe('hero')
    expect(fields.diplomaticMemory.size).toBe(0)
  })
})
