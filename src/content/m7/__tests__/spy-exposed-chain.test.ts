import { describe, expect, it } from 'vitest'

import spyExposedChain from '../spy-exposed-chain.json'
import { EventChainSchema } from '~/shared/schemas'
import { isValidEffectType } from '~/engine/systems/events/event-chain-engine'
import type { Effect } from '~/shared/schemas'

const parsed = EventChainSchema.parse(spyExposedChain)

describe('spy-exposed-chain JSON', () => {
  it('parses against EventChainSchema', () => {
    expect(EventChainSchema.safeParse(spyExposedChain).success).toBe(true)
  })

  it('has correct id and realm-scoped scope', () => {
    expect(parsed.id).toBe('spy_exposed_high_risk_v1')
    expect(parsed.scope).toBe('realm-scoped')
  })

  it('has a single stage with two choices', () => {
    expect(parsed.stages).toHaveLength(1)
    const stage = parsed.stages[0]!
    expect(stage.choices).toHaveLength(2)
    const choiceIds = stage.choices.map((c) => c.id).sort()
    expect(choiceIds).toEqual(['admit', 'deny'])
  })

  it('deny choice has no effects', () => {
    const stage = parsed.stages[0]!
    const deny = stage.choices.find((c) => c.id === 'deny')
    expect(deny).toBeDefined()
    expect(deny!.effects).toEqual([])
  })

  it('admit choice applies realm.relation.delta with positive partial recovery', () => {
    const stage = parsed.stages[0]!
    const admit = stage.choices.find((c) => c.id === 'admit')
    expect(admit).toBeDefined()
    const effects = admit!.effects as readonly Effect[]
    expect(effects).toHaveLength(1)
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
