import { describe, expect, it } from 'vitest'

import { applyEventEffect, isValidEffectType } from '../event-chain-engine'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import type { Effect } from '~/shared/schemas'
import type { Realm, World } from '~/shared/types'

function makeRealm(id: string, traits: readonly string[] = [], politicalSystem: Realm['politicalSystem'] = 'enfeoffment'): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#dc2626',
    capital: 'site_1',
    initialSites: [],
    initialArmies: [],
    aiPersonality: 'cautious',
    economy: { treasury: 1000, foodStores: 500, taxRate: 10 },
    traits,
    politicalSystem,
  }
}

function worldWith(overrides: Partial<World> = {}): World {
  return makeEmptyWorld(overrides)
}

describe('applyEventEffect — realm.trait.add idempotency', () => {
  it('adds a new trait to empty list', () => {
    const realms = new Map([['realm_qin', makeRealm('realm_qin')]])
    const world = worldWith({ realms })

    const effect: Effect = { type: 'realm.trait.add', realmId: 'realm_qin', trait: 'shang_yang_reform_done' }
    const next = applyEventEffect(world, effect)

    expect(next.realms.get('realm_qin')?.traits).toEqual(['shang_yang_reform_done'])
  })

  it('does not duplicate when trait already exists', () => {
    const realms = new Map([['realm_qin', makeRealm('realm_qin', ['shang_yang_reform_done'])]])
    const world = worldWith({ realms })

    const effect: Effect = { type: 'realm.trait.add', realmId: 'realm_qin', trait: 'shang_yang_reform_done' }
    const next = applyEventEffect(world, effect)

    expect(next.realms.get('realm_qin')?.traits).toEqual(['shang_yang_reform_done'])
    expect(next.realms.get('realm_qin')?.traits.length).toBe(1)
  })

  it('returns same world reference when trait already present (no-op)', () => {
    const realms = new Map([['realm_qin', makeRealm('realm_qin', ['hu_fu_qi_she_done'])]])
    const world = worldWith({ realms })

    const effect: Effect = { type: 'realm.trait.add', realmId: 'realm_qin', trait: 'hu_fu_qi_she_done' }
    const next = applyEventEffect(world, effect)

    expect(next).toBe(world)
  })

  it('appends a different trait when other traits exist', () => {
    const realms = new Map([['realm_qin', makeRealm('realm_qin', ['shang_yang_reform_done'])]])
    const world = worldWith({ realms })

    const effect: Effect = { type: 'realm.trait.add', realmId: 'realm_qin', trait: 'reform_failed_scar' }
    const next = applyEventEffect(world, effect)

    expect(next.realms.get('realm_qin')?.traits).toEqual(['shang_yang_reform_done', 'reform_failed_scar'])
  })
})

describe('applyEventEffect — realm.politicalSystem.set', () => {
  it('changes politicalSystem from enfeoffment to commandery', () => {
    const realms = new Map([['realm_qin', makeRealm('realm_qin', [], 'enfeoffment')]])
    const world = worldWith({ realms })

    const effect: Effect = { type: 'realm.politicalSystem.set', realmId: 'realm_qin', system: 'commandery' }
    const next = applyEventEffect(world, effect)

    expect(next.realms.get('realm_qin')?.politicalSystem).toBe('commandery')
  })

  it('changes politicalSystem to legalist_centralized', () => {
    const realms = new Map([['realm_qin', makeRealm('realm_qin', [], 'enfeoffment')]])
    const world = worldWith({ realms })

    const effect: Effect = { type: 'realm.politicalSystem.set', realmId: 'realm_qin', system: 'legalist_centralized' }
    const next = applyEventEffect(world, effect)

    expect(next.realms.get('realm_qin')?.politicalSystem).toBe('legalist_centralized')
  })

  it('returns world unchanged if realm does not exist', () => {
    const realms = new Map([['realm_qin', makeRealm('realm_qin')]])
    const world = worldWith({ realms })

    const effect: Effect = { type: 'realm.politicalSystem.set', realmId: 'realm_unknown', system: 'commandery' }
    const next = applyEventEffect(world, effect)

    expect(next).toBe(world)
  })

  it('preserves other realm fields when changing politicalSystem', () => {
    const realms = new Map([['realm_qin', makeRealm('realm_qin', ['shang_yang_reform_done'], 'enfeoffment')]])
    const world = worldWith({ realms })

    const effect: Effect = { type: 'realm.politicalSystem.set', realmId: 'realm_qin', system: 'legalist_centralized' }
    const next = applyEventEffect(world, effect)

    const updated = next.realms.get('realm_qin')!
    expect(updated.politicalSystem).toBe('legalist_centralized')
    expect(updated.traits).toEqual(['shang_yang_reform_done'])
    expect(updated.economy.treasury).toBe(1000)
    expect(updated.color).toBe('#dc2626')
  })

  it('isValidEffectType accepts realm.politicalSystem.set', () => {
    expect(isValidEffectType('realm.politicalSystem.set')).toBe(true)
  })
})
