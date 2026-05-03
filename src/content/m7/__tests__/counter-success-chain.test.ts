import { describe, expect, it } from 'vitest'

import counterSuccessChain from '../counter-success-chain.json'
import { EventChainSchema } from '~/shared/schemas'
import { isValidEffectType } from '~/engine/systems/events/event-chain-engine'
import type { Effect } from '~/shared/schemas'

const parsed = EventChainSchema.parse(counterSuccessChain)

describe('counter-success-chain JSON', () => {
  it('parses against EventChainSchema', () => {
    expect(EventChainSchema.safeParse(counterSuccessChain).success).toBe(true)
  })

  it('has correct id and realm-scoped scope', () => {
    expect(parsed.id).toBe('counter_success_v1')
    expect(parsed.scope).toBe('realm-scoped')
  })

  it('has a single stage with execute and release choices', () => {
    expect(parsed.stages).toHaveLength(1)
    const stage = parsed.stages[0]!
    expect(stage.choices).toHaveLength(2)
    const choiceIds = stage.choices.map((c) => c.id).sort()
    expect(choiceIds).toEqual(['execute', 'release'])
  })

  it('execute choice applies character.loyalty with sufficient negative delta to drive captured spy to death/defection state', () => {
    const stage = parsed.stages[0]!
    const execute = stage.choices.find((c) => c.id === 'execute')
    expect(execute).toBeDefined()
    const effects = execute!.effects as readonly Effect[]
    const loyaltyEffect = effects.find((e) => e.type === 'character.loyalty')
    expect(loyaltyEffect).toBeDefined()
    if (loyaltyEffect && loyaltyEffect.type === 'character.loyalty') {
      expect(loyaltyEffect.delta).toBeLessThanOrEqual(-100)
    }
  })

  it('release choice applies realm.relation.delta with positive trust recovery', () => {
    const stage = parsed.stages[0]!
    const release = stage.choices.find((c) => c.id === 'release')
    expect(release).toBeDefined()
    const effects = release!.effects as readonly Effect[]
    const relationEffect = effects.find((e) => e.type === 'realm.relation.delta')
    expect(relationEffect).toBeDefined()
    if (relationEffect && relationEffect.type === 'realm.relation.delta') {
      expect(relationEffect.delta).toBe(5)
    }
  })

  it('all effects use D15 whitelist effect types only', () => {
    for (const stage of parsed.stages) {
      for (const choice of stage.choices) {
        for (const effect of choice.effects as readonly Effect[]) {
          expect(isValidEffectType(effect.type)).toBe(true)
        }
      }
    }
  })

  it('does NOT use forbidden assassination/defection/theft effects', () => {
    const FORBIDDEN = new Set(['character.assassinate', 'character.defect', 'realm.tactic.steal', 'realm.culture.steal'])
    for (const stage of parsed.stages) {
      for (const choice of stage.choices) {
        for (const effect of choice.effects as readonly Effect[]) {
          expect(FORBIDDEN.has(effect.type)).toBe(false)
        }
      }
    }
  })
})
