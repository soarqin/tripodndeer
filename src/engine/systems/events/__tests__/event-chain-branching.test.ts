import { describe, expect, it } from 'vitest'

import fanJuEvent from '~/content/m5/events/fan-ju-strategy.json'
import lianPoEvent from '~/content/m5/events/lian-po-elder.json'
import linXiangruEvent from '~/content/m5/events/lin-xiangru-bi.json'
import { applyEventEffect } from '../event-chain-engine'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import { EffectSchema } from '~/shared/schemas'
import type { Effect } from '~/shared/schemas'
import type { General, Realm, World } from '~/shared/types'

function makeRealm(id: string, treasury = 1000, traits: readonly string[] = []): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#dc2626',
    capital: `site_${id}_capital`,
    initialSites: [],
    initialArmies: [],
    aiPersonality: 'cautious',
    economy: { treasury, foodStores: 500, taxRate: 0.1 },
    traits,
    politicalSystem: 'enfeoffment',
  }
}

function makeGeneral(id: string, realmId: string, loyalty = 80): General {
  return {
    id,
    realmId,
    name: `General ${id}`,
    might: 50,
    command: 50,
    loyalty,
    loyaltyState: 'loyal',
    age: 30,
  }
}

function applyChoice(world: World, effects: readonly Effect[]): World {
  return effects.reduce((w, e) => applyEventEffect(w, e), world)
}

function getChoiceEffects(
  event: { stages: ReadonlyArray<{ id: string; choices: ReadonlyArray<{ id: string; effects: unknown[] }> }> },
  stageId: string,
  choiceId: string,
): readonly Effect[] {
  const stage = event.stages.find((s) => s.id === stageId)
  if (!stage) throw new Error(`Stage ${stageId} not found`)
  const choice = stage.choices.find((c) => c.id === choiceId)
  if (!choice) throw new Error(`Choice ${choiceId} not found in stage ${stageId}`)
  return choice.effects.map((e) => EffectSchema.parse(e))
}

describe('event chain: lin-xiangru-bi (蔺相如完璧归赵)', () => {
  const setupWorld = (): World => {
    const realms = new Map([['realm_zhao', makeRealm('realm_zhao', 1000)]])
    const generals = new Map([['gen_lin_xiangru', makeGeneral('gen_lin_xiangru', 'realm_zhao', 70)]])
    return makeEmptyWorld({ realms, generals, playerRealmId: 'realm_zhao' })
  }

  it('trigger config: yearBC range 280-278, realmId realm_zhao', () => {
    expect(linXiangruEvent.trigger.type).toBe('date')
    expect(linXiangruEvent.trigger.between).toEqual([{ yearBC: 280 }, { yearBC: 278 }])
    expect(linXiangruEvent.trigger.realmId).toBe('realm_zhao')
  })

  it('branch A (send_lin): adds lin_xiangru_diplomacy trait and increases loyalty by 10', () => {
    const world = setupWorld()
    const effects = getChoiceEffects(linXiangruEvent, 'stage1', 'send_lin')

    const next = applyChoice(world, effects)

    expect(next.realms.get('realm_zhao')?.traits).toEqual(['lin_xiangru_diplomacy'])
    expect(next.generals.get('gen_lin_xiangru')?.loyalty).toBe(80)
    expect(next.realms.get('realm_zhao')?.economy.treasury).toBe(1000)
  })

  it('branch B (send_jade): decreases realm treasury by 500', () => {
    const world = setupWorld()
    const effects = getChoiceEffects(linXiangruEvent, 'stage1', 'send_jade')

    const next = applyChoice(world, effects)

    expect(next.realms.get('realm_zhao')?.economy.treasury).toBe(500)
    expect(next.realms.get('realm_zhao')?.traits ?? []).toEqual([])
    expect(next.generals.get('gen_lin_xiangru')?.loyalty).toBe(70)
  })

  it('branches A and B produce different world states', () => {
    const base = setupWorld()
    const effA = getChoiceEffects(linXiangruEvent, 'stage1', 'send_lin')
    const effB = getChoiceEffects(linXiangruEvent, 'stage1', 'send_jade')

    const worldA = applyChoice(base, effA)
    const worldB = applyChoice(base, effB)

    expect(worldA.realms.get('realm_zhao')?.economy.treasury).not.toBe(
      worldB.realms.get('realm_zhao')?.economy.treasury,
    )
    expect(worldA.realms.get('realm_zhao')?.traits ?? []).not.toEqual(
      worldB.realms.get('realm_zhao')?.traits ?? [],
    )
    expect(worldA.generals.get('gen_lin_xiangru')?.loyalty).not.toBe(
      worldB.generals.get('gen_lin_xiangru')?.loyalty,
    )
  })
})

describe('event chain: fan-ju-strategy (范雎远交近攻)', () => {
  const setupWorld = (): World => {
    const realms = new Map([['realm_qin', makeRealm('realm_qin', 1000)]])
    const generals = new Map([['gen_fanju', makeGeneral('gen_fanju', 'realm_qin', 60)]])
    return makeEmptyWorld({ realms, generals, playerRealmId: 'realm_qin' })
  }

  it('trigger config: yearBC range 268-264, realmId realm_qin', () => {
    expect(fanJuEvent.trigger.type).toBe('date')
    expect(fanJuEvent.trigger.between).toEqual([{ yearBC: 268 }, { yearBC: 264 }])
    expect(fanJuEvent.trigger.realmId).toBe('realm_qin')
  })

  it('branch A (adopt_strategy): adds far_ally_close_attack trait and increases loyalty by 20', () => {
    const world = setupWorld()
    const effects = getChoiceEffects(fanJuEvent, 'stage1', 'adopt_strategy')

    const next = applyChoice(world, effects)

    expect(next.realms.get('realm_qin')?.traits).toEqual(['far_ally_close_attack'])
    expect(next.generals.has('gen_fanju')).toBe(true)
    expect(next.generals.get('gen_fanju')?.loyalty).toBe(80)
  })

  it('branch B (expel_fan): removes gen_fanju from world.generals', () => {
    const world = setupWorld()
    const effects = getChoiceEffects(fanJuEvent, 'stage1', 'expel_fan')

    const next = applyChoice(world, effects)

    expect(next.generals.has('gen_fanju')).toBe(false)
    expect(next.realms.get('realm_qin')?.traits ?? []).toEqual([])
  })

  it('branches A and B produce different world states', () => {
    const base = setupWorld()
    const effA = getChoiceEffects(fanJuEvent, 'stage1', 'adopt_strategy')
    const effB = getChoiceEffects(fanJuEvent, 'stage1', 'expel_fan')

    const worldA = applyChoice(base, effA)
    const worldB = applyChoice(base, effB)

    expect(worldA.generals.has('gen_fanju')).toBe(true)
    expect(worldB.generals.has('gen_fanju')).toBe(false)
    expect(worldA.realms.get('realm_qin')?.traits ?? []).not.toEqual(
      worldB.realms.get('realm_qin')?.traits ?? [],
    )
  })
})

describe('event chain: lian-po-elder (廉颇老将)', () => {
  const setupWorld = (): World => {
    const realms = new Map([['realm_zhao', makeRealm('realm_zhao', 1000)]])
    const generals = new Map([['gen_lianpo', makeGeneral('gen_lianpo', 'realm_zhao', 75)]])
    return makeEmptyWorld({ realms, generals, playerRealmId: 'realm_zhao' })
  }

  it('trigger config: yearBC range 261-258, realmId realm_zhao', () => {
    expect(lianPoEvent.trigger.type).toBe('date')
    expect(lianPoEvent.trigger.between).toEqual([{ yearBC: 261 }, { yearBC: 258 }])
    expect(lianPoEvent.trigger.realmId).toBe('realm_zhao')
  })

  it('branch A (trust_lian): adds lian_po_command trait and increases loyalty by 15', () => {
    const world = setupWorld()
    const effects = getChoiceEffects(lianPoEvent, 'stage1', 'trust_lian')

    const next = applyChoice(world, effects)

    expect(next.realms.get('realm_zhao')?.traits).toEqual(['lian_po_command'])
    expect(next.generals.get('gen_lianpo')?.loyalty).toBe(90)
    expect(next.generals.has('gen_zhaokuo')).toBe(false)
  })

  it('branch B (replace_zhao_kuo): adds paper_general trait and creates gen_zhaokuo', () => {
    const world = setupWorld()
    const effects = getChoiceEffects(lianPoEvent, 'stage1', 'replace_zhao_kuo')

    const next = applyChoice(world, effects)

    expect(next.realms.get('realm_zhao')?.traits).toEqual(['paper_general'])
    expect(next.generals.has('gen_zhaokuo')).toBe(true)
    expect(next.generals.get('gen_zhaokuo')?.name).toBe('赵括')
    expect(next.generals.get('gen_zhaokuo')?.realmId).toBe('realm_zhao')
    expect(next.generals.get('gen_lianpo')?.loyalty).toBe(75)
  })

  it('branches A and B produce different world states', () => {
    const base = setupWorld()
    const effA = getChoiceEffects(lianPoEvent, 'stage1', 'trust_lian')
    const effB = getChoiceEffects(lianPoEvent, 'stage1', 'replace_zhao_kuo')

    const worldA = applyChoice(base, effA)
    const worldB = applyChoice(base, effB)

    expect(worldA.realms.get('realm_zhao')?.traits).toEqual(['lian_po_command'])
    expect(worldB.realms.get('realm_zhao')?.traits).toEqual(['paper_general'])
    expect(worldA.generals.has('gen_zhaokuo')).toBe(false)
    expect(worldB.generals.has('gen_zhaokuo')).toBe(true)
    expect(worldA.generals.get('gen_lianpo')?.loyalty).not.toBe(
      worldB.generals.get('gen_lianpo')?.loyalty,
    )
  })
})
