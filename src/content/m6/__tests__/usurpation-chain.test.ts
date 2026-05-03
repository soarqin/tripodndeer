import { describe, expect, it } from 'vitest'

import usurpationChain from '../usurpation-chain.json'
import { EventChainSchema } from '~/shared/schemas'
import { isValidEffectType } from '~/engine/systems/events/event-chain-engine'
import type { Effect } from '~/shared/schemas'

const parsed = EventChainSchema.parse(usurpationChain)

describe('usurpation-chain JSON', () => {
  it('parses against EventChainSchema', () => {
    expect(EventChainSchema.safeParse(usurpationChain).success).toBe(true)
  })

  it('has correct id and realm-scoped scope', () => {
    expect(parsed.id).toBe('usurpation_wang')
    expect(parsed.scope).toBe('realm-scoped')
    expect(parsed.oneShot).toBe(true)
  })

  it('trigger uses state type with and-compound predicate', () => {
    expect(parsed.trigger.type).toBe('state')
    if (parsed.trigger.type !== 'state') throw new Error('expected state trigger')
    expect(parsed.trigger.predicate.kind).toBe('and')
  })

  it('trigger predicate combines prestige.gte 80 + zhouInvestiture.has + relation.attitude neutral', () => {
    if (parsed.trigger.type !== 'state') throw new Error('expected state trigger')
    const predicate = parsed.trigger.predicate
    if (predicate.kind !== 'and') throw new Error('expected and-compound')
    const prestigeNode = predicate.children.find((c) => c.kind === 'realm.prestige.gte')
    expect(prestigeNode).toBeDefined()
    if (prestigeNode && prestigeNode.kind === 'realm.prestige.gte') {
      expect(prestigeNode.threshold).toBe(80)
    }
    const investitureNode = predicate.children.find((c) => c.kind === 'realm.zhouInvestiture.has')
    expect(investitureNode).toBeDefined()
    const relationNode = predicate.children.find((c) => c.kind === 'realm.relation.attitude')
    expect(relationNode).toBeDefined()
    if (relationNode && relationNode.kind === 'realm.relation.attitude') {
      expect(relationNode.targetRealmId).toBe('realm_zhou')
      expect(relationNode.minAttitude).toBe('neutral')
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

  it('usurp choice applies prestige -30 and relation to Zhou -50', () => {
    const stage = parsed.stages.find((s) => s.id === 'usurpation_choice')
    expect(stage).toBeDefined()
    const usurp = stage!.choices.find((c) => c.id === 'usurp')
    expect(usurp).toBeDefined()
    const effects = usurp!.effects as readonly Effect[]
    const prestigeEffect = effects.find((e) => e.type === 'realm.prestige.delta')
    expect(prestigeEffect).toBeDefined()
    if (prestigeEffect && prestigeEffect.type === 'realm.prestige.delta') {
      expect(prestigeEffect.delta).toBe(-30)
    }
    const relationEffect = effects.find((e) => e.type === 'realm.relation.delta')
    expect(relationEffect).toBeDefined()
    if (relationEffect && relationEffect.type === 'realm.relation.delta') {
      expect(relationEffect.targetRealmId).toBe('realm_zhou')
      expect(relationEffect.delta).toBe(-50)
    }
  })

  it('decline choice has no effects', () => {
    const stage = parsed.stages[0]!
    const decline = stage.choices.find((c) => c.id === 'decline')
    expect(decline).toBeDefined()
    expect(decline!.effects).toEqual([])
  })
})
