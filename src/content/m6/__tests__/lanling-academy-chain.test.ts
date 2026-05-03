import { describe, expect, it } from 'vitest'

import lanlingAcademyChain from '../lanling-academy-chain.json'
import scenario from '~/content/m1/scenario.json'
import { EventChainSchema } from '~/shared/schemas'
import { isValidEffectType } from '~/engine/systems/events/event-chain-engine'
import type { Effect } from '~/shared/schemas'

const parsed = EventChainSchema.parse(lanlingAcademyChain)

describe('lanling-academy-chain JSON', () => {
  it('parses against EventChainSchema', () => {
    expect(EventChainSchema.safeParse(lanlingAcademyChain).success).toBe(true)
  })

  it('has correct id, scope, and oneShot flag', () => {
    expect(parsed.id).toBe('lanling_academy_founding')
    expect(parsed.scope).toBe('fixed-realm')
    expect(parsed.oneShot).toBe(true)
  })

  it('trigger is date type with yearBC === 258 range bound to realm_chu', () => {
    expect(parsed.trigger.type).toBe('date')
    if (parsed.trigger.type !== 'date') throw new Error('expected date trigger')
    expect(parsed.trigger.between[0]!.yearBC).toBe(258)
    expect(parsed.trigger.between[1]!.yearBC).toBe(258)
    expect(parsed.trigger.realmId).toBe('realm_chu')
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

  it('accept choice creates academy with valid hostSiteId existing in scenario', () => {
    const stage = parsed.stages.find((s) => s.id === 'xunzi_arrives')
    expect(stage).toBeDefined()
    const accept = stage!.choices.find((c) => c.id === 'accept')
    expect(accept).toBeDefined()
    const createEffect = (accept!.effects as readonly Effect[]).find(
      (e) => e.type === 'academy.create',
    )
    expect(createEffect).toBeDefined()
    if (createEffect && createEffect.type === 'academy.create') {
      expect(createEffect.hostRealmId).toBe('realm_chu')
      expect(createEffect.primaryIdeology).toBe('ru')
      const siteIds = new Set((scenario.sites as readonly { id: string }[]).map((s) => s.id))
      expect(siteIds.has(createEffect.hostSiteId)).toBe(true)
    }
  })

  it('hostSiteId belongs to realm_chu in scenario ownership map', () => {
    const accept = parsed.stages[0]!.choices.find((c) => c.id === 'accept')!
    const createEffect = (accept.effects as readonly Effect[]).find(
      (e) => e.type === 'academy.create',
    )!
    if (createEffect.type !== 'academy.create') throw new Error('expected academy.create')
    const initialOwnership = (scenario as unknown as { initialOwnership: Record<string, string> }).initialOwnership
    expect(initialOwnership[createEffect.hostSiteId]).toBe('realm_chu')
  })

  it('decline choice has relation delta but no academy.create', () => {
    const decline = parsed.stages[0]!.choices.find((c) => c.id === 'decline')
    expect(decline).toBeDefined()
    const effects = decline!.effects as readonly Effect[]
    const academyEffect = effects.find((e) => e.type === 'academy.create')
    expect(academyEffect).toBeUndefined()
    const relationEffect = effects.find((e) => e.type === 'realm.relation.delta')
    expect(relationEffect).toBeDefined()
    if (relationEffect && relationEffect.type === 'realm.relation.delta') {
      expect(relationEffect.delta).toBe(-5)
    }
  })
})
