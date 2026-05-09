import { describe, expect, it } from 'vitest'

import { WorldSchema } from '~/shared/schemas'

import { makeEmptyWorld } from './fixtures'

const validRuler = {
  realmId: 'realm_qin',
  generalId: 'gen_zhao_xiang',
  age: 45,
  lifespan: 70,
  health: 80,
  personality: 'conqueror' as const,
  personalityDims: {
    expansionDrive: 0.9,
    diplomaticTrust: 0.2,
    caution: 0.4,
    honor: 0.7,
    vindictiveness: 0.6,
    reformInclination: 0.3,
    patience: 0.5,
    preferredStrategy: 'blitz' as const,
  },
  successionLawId: 'primogeniture' as const,
  inOfficeSinceTick: 0,
}

describe('WorldSchema M8.2 fields', () => {
  it('parses a valid world with difficulty and diplomaticMemory', () => {
    const world = {
      ...makeEmptyWorld({
        difficulty: 'common',
        diplomaticMemory: new Map([
          [
            'realm_qin__realm_chu',
            {
              observerId: 'realm_qin',
              subjectId: 'realm_chu',
              betrayalScore: 12,
              events: [],
              lastUpdatedTick: 0,
              lastObservedHistoryIdx: 0,
            },
          ],
        ]),
      }),
      rulers: new Map([['realm_qin', validRuler]]),
    }

    const result = WorldSchema.safeParse(world)
    expect(result.success).toBe(true)
  })

  it('rejects a world missing difficulty', () => {
    const world = {
      ...makeEmptyWorld({
        difficulty: 'common',
        diplomaticMemory: new Map([
          [
            'realm_qin__realm_chu',
            {
              observerId: 'realm_qin',
              subjectId: 'realm_chu',
              betrayalScore: 12,
              events: [],
              lastUpdatedTick: 0,
              lastObservedHistoryIdx: 0,
            },
          ],
        ]),
      }),
      rulers: new Map([['realm_qin', validRuler]]),
    }

    const { difficulty: _difficulty, ...withoutDifficulty } = world
    const result = WorldSchema.safeParse(withoutDifficulty)
    expect(result.success).toBe(false)
  })
})
