import { describe, expect, it } from 'vitest'

import zhouInvestitureChain from '../zhou-investiture-chain.json'
import { EventChainSchema } from '~/shared/schemas'
import { isValidEffectType } from '~/engine/systems/events/event-chain-engine'
import type { Effect } from '~/shared/schemas'

const parsed = EventChainSchema.parse(zhouInvestitureChain)

describe('zhou-investiture-chain JSON', () => {
  it('parses against EventChainSchema', () => {
    expect(EventChainSchema.safeParse(zhouInvestitureChain).success).toBe(true)
  })

  it('has correct id and realm-scoped scope', () => {
    expect(parsed.id).toBe('zhou_investiture_v1')
    expect(parsed.scope).toBe('realm-scoped')
    expect(parsed.oneShot).toBe(true)
  })

  it('trigger uses state type with and-compound predicate', () => {
    expect(parsed.trigger.type).toBe('state')
    if (parsed.trigger.type !== 'state') throw new Error('expected state trigger')
    expect(parsed.trigger.predicate.kind).toBe('and')
  })

  it('trigger predicate includes zhouInvestiture.absent + relation.attitude + prestige.gte', () => {
    if (parsed.trigger.type !== 'state') throw new Error('expected state trigger')
    const predicate = parsed.trigger.predicate
    if (predicate.kind !== 'and') throw new Error('expected and-compound')
    const kinds = predicate.children.map((child) => child.kind)
    expect(kinds).toContain('realm.zhouInvestiture.absent')
    expect(kinds).toContain('realm.relation.attitude')
    expect(kinds).toContain('realm.prestige.gte')
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

  it('accept_duke choice grants duke rank via zhouInvestiture.grant', () => {
    const stage = parsed.stages.find((s) => s.id === 'request_investiture')
    expect(stage).toBeDefined()
    const acceptDuke = stage!.choices.find((c) => c.id === 'accept_duke')
    expect(acceptDuke).toBeDefined()
    const grantEffect = (acceptDuke!.effects as readonly Effect[]).find(
      (e) => e.type === 'zhouInvestiture.grant',
    )
    expect(grantEffect).toBeDefined()
    if (grantEffect && grantEffect.type === 'zhouInvestiture.grant') {
      expect(grantEffect.rank).toBe('duke')
    }
  })

  it('accept_marquis choice grants marquis rank with prestige +7', () => {
    const stage = parsed.stages[0]!
    const acceptMarquis = stage.choices.find((c) => c.id === 'accept_marquis')
    expect(acceptMarquis).toBeDefined()
    const effects = acceptMarquis!.effects as readonly Effect[]
    const grant = effects.find((e) => e.type === 'zhouInvestiture.grant')
    expect(grant).toBeDefined()
    if (grant && grant.type === 'zhouInvestiture.grant') {
      expect(grant.rank).toBe('marquis')
    }
    const prestigeEffect = effects.find((e) => e.type === 'realm.prestige.delta')
    expect(prestigeEffect).toBeDefined()
    if (prestigeEffect && prestigeEffect.type === 'realm.prestige.delta') {
      expect(prestigeEffect.delta).toBe(7)
    }
  })

  it('decline choice has no effects', () => {
    const stage = parsed.stages[0]!
    const decline = stage.choices.find((c) => c.id === 'decline')
    expect(decline).toBeDefined()
    expect(decline!.effects).toEqual([])
  })
})
