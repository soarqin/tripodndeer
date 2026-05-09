import { describe, expect, it } from 'vitest'

import { DiplomaticMemoryEventKindSchema, DiplomaticMemorySchema } from '~/shared/schemas'
import { memoryKey } from '~/shared/types'

describe('DiplomaticMemory key', () => {
  it('is directional', () => {
    expect(memoryKey('a', 'b')).not.toBe(memoryKey('b', 'a'))
    expect(memoryKey('a', 'b')).toBe('a__b')
  })
})

describe('DiplomaticMemory schemas', () => {
  it('accept all six event kinds', () => {
    for (const kind of ['broken_alliance', 'broken_peace', 'spy_caught', 'unprovoked_war', 'battlefield_victory', 'border_skirmish'] as const) {
      expect(DiplomaticMemoryEventKindSchema.parse(kind)).toBe(kind)
    }
  })

  it('requires lastObservedHistoryIdx as a number', () => {
    const valid = {
      observerId: 'realm_a',
      subjectId: 'realm_b',
      betrayalScore: 0,
      events: [],
      lastUpdatedTick: 1,
      lastObservedHistoryIdx: 0,
    }

    expect(DiplomaticMemorySchema.parse(valid).lastObservedHistoryIdx).toBe(0)
    expect(DiplomaticMemorySchema.safeParse({ ...valid, lastObservedHistoryIdx: undefined }).success).toBe(false)
  })
})
