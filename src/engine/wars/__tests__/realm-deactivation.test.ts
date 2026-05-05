import { describe, expect, it } from 'vitest'

import { aiPlanStep } from '~/engine/systems/ai'
import { applyEventEffect } from '~/engine/systems/events/event-chain-engine'
import { realmDeactivationPhase } from '~/engine/wars/realm-deactivation'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import type { Army, General, PeaceProposal, Realm, RealmId, Siege, Site, WarState, World } from '~/shared/types'

const date = { yearBC: 260, season: 'spring', month: 1, xun: 'shang' } as const

function realm(id: RealmId, status: Realm['status'] = 'active'): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#dc2626',
    capital: `site_${id}`,
    initialSites: [],
    initialArmies: [],
    aiPersonality: 'cautious',
    economy: { treasury: 1000, foodStores: 1000, taxRate: 0.1 },
    traits: [],
    politicalSystem: 'enfeoffment',
    prestige: 40,
    ideologyLean: { fa: 0, ru: 0, dao: 0, mo: 0, zonghen: 0, bing: 0 },
    warVictoriesThisYear: 0,
    status,
  }
}

function site(id: string, ownerId: RealmId | null): Site {
  return {
    id,
    name: id,
    position: [0, 0],
    boundary: [],
    ownerId,
    polygon: [],
    adjacency: [],
    economy: { population: 1000, households: 100, taxBase: 100, foodProduction: 100 },
    cultural: 'di_xirong',
    culturalIdentityStrength: 100,
    lastConquestTick: null,
    lowIdentitySinceTick: null,
  }
}

function general(id: string, realmId: RealmId, loyalty = 80): General {
  return {
    id,
    realmId,
    name: id,
    might: 50,
    command: 50,
    loyalty,
  }
}

function baseWorld(overrides: Partial<World> = {}): World {
  return makeEmptyWorld({
    realms: new Map([
      ['realm_qin', realm('realm_qin')],
      ['realm_han', realm('realm_han')],
    ]),
    sites: new Map([['site_qin', site('site_qin', 'realm_qin')]]),
    playerRealmId: 'realm_qin',
    ...overrides,
  })
}

describe('realmDeactivationPhase', () => {
  it('deactivates an active realm after it loses its last site', () => {
    const world = baseWorld()

    const result = realmDeactivationPhase(world, world.rngState)

    expect(result.world.realms.get('realm_han')?.status).toBe('deactivated')
    expect(result.events).toEqual([
      {
        type: 'realmDeactivated',
        payload: { realmId: 'realm_han', reason: 'conquered', tick: 0 },
      },
    ])
    expect(result.nextRng).toBe(world.rngState)
  })

  it('sets all deactivated realm generals loyalty to zero', () => {
    const world = baseWorld({
      generals: new Map([
        ['general_han_1', general('general_han_1', 'realm_han', 80)],
        ['general_han_2', general('general_han_2', 'realm_han', 60)],
        ['general_qin_1', general('general_qin_1', 'realm_qin', 70)],
      ]),
    })

    const result = realmDeactivationPhase(world, world.rngState)

    expect(result.world.generals.get('general_han_1')?.loyalty).toBe(0)
    expect(result.world.generals.get('general_han_2')?.loyalty).toBe(0)
    expect(result.world.generals.get('general_qin_1')?.loyalty).toBe(70)
  })

  it('cancels wars, peace proposals, and sieges involving the deactivated realm', () => {
    const war: WarState = {
      casusBelli: null,
      declaredAt: date,
      occupiedSites: new Map(),
      peaceProposalId: null,
    }
    const proposal: PeaceProposal = {
      id: 'peace_1',
      proposingRealmId: 'realm_han',
      targetRealmId: 'realm_qin',
      terms: [],
      proposedAt: date,
      status: 'pending',
      acknowledgedAt: null,
    }
    const army: Army = {
      id: 'army_han',
      realmId: 'realm_han',
      manpower: 1000,
      location: 'site_qin',
      state: 'besieging',
      destination: null,
      ticksRemaining: 0,
      source: null,
    }
    const siege: Siege = {
      id: 'siege_1',
      attackerArmyIds: ['army_han'],
      defenderSiteId: 'site_qin',
      startedAt: date,
      durationTicks: 1,
      fortification: 1,
      supplyRemaining: 1,
    }
    const world = baseWorld({
      armies: new Map([['army_han', army]]),
      wars: new Map([['realm_han:realm_qin', war]]),
      peaceProposals: new Map([['peace_1', proposal]]),
      sieges: new Map([['siege_1', siege]]),
    })

    const result = realmDeactivationPhase(world, world.rngState)

    expect(result.world.wars.has('realm_han:realm_qin')).toBe(false)
    expect(result.world.peaceProposals.has('peace_1')).toBe(false)
    expect(result.world.sieges.has('siege_1')).toBe(false)
  })

  it('skips deactivated realms during AI planning', () => {
    const world = baseWorld({
      realms: new Map([
        ['realm_qin', realm('realm_qin')],
        ['realm_han', realm('realm_han', 'deactivated')],
      ]),
      rngState: { seed: 123, counter: 0 },
    })

    const result = aiPlanStep(world, world.rngState)

    expect(result.nextRng).toEqual(world.rngState)
    expect(result.events).toEqual([])
    expect(result.world.realms.get('realm_han')?.status).toBe('deactivated')
  })

  it('applies realm.deactivate event effects through the same cleanup path', () => {
    const world = baseWorld({
      sites: new Map([
        ['site_qin', site('site_qin', 'realm_qin')],
        ['site_han', site('site_han', 'realm_han')],
      ]),
      generals: new Map([['general_han_1', general('general_han_1', 'realm_han', 90)]]),
    })

    const result = applyEventEffect(world, {
      type: 'realm.deactivate',
      realmId: 'realm_han',
      reason: 'extinguished',
    })

    expect(result.realms.get('realm_han')?.status).toBe('deactivated')
    expect(result.generals.get('general_han_1')?.loyalty).toBe(0)
    expect(result.sites.get('site_han')?.ownerId).toBe('realm_han')
  })

  it('does nothing when a realm is already deactivated', () => {
    const world = baseWorld({
      realms: new Map([
        ['realm_qin', realm('realm_qin')],
        ['realm_han', realm('realm_han', 'deactivated')],
      ]),
      generals: new Map([['general_han_1', general('general_han_1', 'realm_han', 20)]]),
    })

    const result = realmDeactivationPhase(world, world.rngState)
    const effectResult = applyEventEffect(result.world, {
      type: 'realm.deactivate',
      realmId: 'realm_han',
      reason: 'conquered',
    })

    expect(result.world).toBe(world)
    expect(result.events).toEqual([])
    expect(effectResult).toBe(result.world)
    expect(effectResult.generals.get('general_han_1')?.loyalty).toBe(20)
  })
})
