import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { AIStateSchema } from '~/shared/schemas'
import type { AIState } from '~/shared/types'

const example = {
  strategic: {
    targetSiteId: 'site_xianyang',
    mainEnemyRealmId: 'realm_chu',
    mainAllyRealmId: null,
    reformIntentId: 'reform_legalism',
    decidedAtTick: 100,
    decidedForYearBC: 260,
  },
  operational: [
    {
      id: 'directive_1',
      kind: 'dispatch_army' as const,
      priority: 10,
      targetRealmId: 'realm_chu',
      targetSiteId: 'site_chengpu',
      armyId: 'army_1',
      createdAtTick: 100,
      expiresAtTick: 120,
    },
  ],
} as const

describe('AIStateSchema', () => {
  it('accepts a valid AIState', () => {
    expect(AIStateSchema.parse(example).strategic?.mainEnemyRealmId).toBe('realm_chu')
  })

  it('rejects invalid priority type', () => {
    const bad = {
      ...example,
      operational: [{ ...example.operational[0], priority: 'high' }],
    }

    expect(AIStateSchema.safeParse(bad).success).toBe(false)
  })

  it('round-trips a parsed example', () => {
    expect(AIStateSchema.parse(example)).toEqual(example)
  })

  it('keeps z.infer assignable to AIState', () => {
    const parsed: AIState = AIStateSchema.parse(example)
    const inferred: z.infer<typeof AIStateSchema> = parsed

    expect(inferred.operational).toHaveLength(1)
  })
})
