import { describe, expect, it } from 'vitest'
import { makeTestWorld, TEST_WORLD_DATE } from '~/engine/__tests__/world-test-fixtures'
import type { Army, Siege, Site, World } from '~/shared/types'
import { evaluateCutSupplyOption, evaluateRetreatOption, evaluateSiegeOption } from '../index'

function makeArmy(overrides: Partial<Army> = {}): Army {
  return {
    id: 'army_attacker',
    realmId: 'realm_red',
    manpower: 10000,
    location: 'site_target',
    state: 'idle',
    destination: 'site_target',
    ticksRemaining: 0,
    source: 'site_origin',
    ...overrides,
  }
}

function makeSite(overrides: Partial<Site> & { id: string }): Site {
  return {
    name: overrides.id,
    position: [0, 0],
    boundary: [],
    polygon: [],
    adjacency: [],
    ownerId: null,
    ...overrides,
  }
}

function makeSiege(overrides: Partial<Siege> & { id: string }): Siege {
  return {
    attackerArmyIds: ['army_attacker'],
    defenderSiteId: 'site_target',
    startedAt: TEST_WORLD_DATE,
    durationTicks: 0,
    fortification: 100,
    supplyRemaining: 20,
    ...overrides,
  }
}

function makeWorld(overrides: Partial<World> = {}): World {
  return makeTestWorld({ playerRealmId: 'realm_red', ...overrides })
}

describe('evaluateSiegeOption', () => {
  it('triggers when attacker has 1.2x manpower advantage at enemy site', () => {
    const attacker = makeArmy({ manpower: 10000 })
    const defender: Army = {
      id: 'army_defender',
      realmId: 'realm_blue',
      manpower: 5000,
      location: 'site_target',
      state: 'idle',
      destination: null,
      ticksRemaining: 0,
      source: null,
    }
    const target = makeSite({ id: 'site_target', ownerId: 'realm_blue' })
    const world = makeWorld({
      sites: new Map([[target.id, target]]),
      armies: new Map([[attacker.id, attacker], [defender.id, defender]]),
    })

    const option = evaluateSiegeOption(attacker, world)

    expect(option).not.toBeNull()
    expect(option!.kind).toBe('siege-continue')
    expect(option!.armyId).toBe('army_attacker')
    expect(option!.targetSiteId).toBe('site_target')
    expect(option!.score).toBe(140)
  })

  it('returns null when manpower advantage is below 1.2x', () => {
    const attacker = makeArmy({ manpower: 5000 })
    const defender: Army = {
      id: 'army_defender',
      realmId: 'realm_blue',
      manpower: 5000,
      location: 'site_target',
      state: 'idle',
      destination: null,
      ticksRemaining: 0,
      source: null,
    }
    const target = makeSite({ id: 'site_target', ownerId: 'realm_blue' })
    const world = makeWorld({
      sites: new Map([[target.id, target]]),
      armies: new Map([[attacker.id, attacker], [defender.id, defender]]),
    })

    expect(evaluateSiegeOption(attacker, world)).toBeNull()
  })

  it('returns null when army is already in a siege', () => {
    const attacker = makeArmy({ manpower: 10000 })
    const defender: Army = {
      id: 'army_defender',
      realmId: 'realm_blue',
      manpower: 5000,
      location: 'site_target',
      state: 'idle',
      destination: null,
      ticksRemaining: 0,
      source: null,
    }
    const target = makeSite({ id: 'site_target', ownerId: 'realm_blue' })
    const siege = makeSiege({ id: 'siege_existing' })
    const world = makeWorld({
      sites: new Map([[target.id, target]]),
      armies: new Map([[attacker.id, attacker], [defender.id, defender]]),
      sieges: new Map([[siege.id, siege]]),
    })

    expect(evaluateSiegeOption(attacker, world)).toBeNull()
  })

  it('returns null when site is already owned by attacker realm', () => {
    const attacker = makeArmy()
    const target = makeSite({ id: 'site_target', ownerId: 'realm_red' })
    const world = makeWorld({
      sites: new Map([[target.id, target]]),
      armies: new Map([[attacker.id, attacker]]),
    })

    expect(evaluateSiegeOption(attacker, world)).toBeNull()
  })

  it('returns null when army state is not idle or destination missing', () => {
    const attacker = makeArmy({ state: 'marching' })
    const target = makeSite({ id: 'site_target', ownerId: 'realm_blue' })
    const world = makeWorld({
      sites: new Map([[target.id, target]]),
      armies: new Map([[attacker.id, attacker]]),
    })

    expect(evaluateSiegeOption(attacker, world)).toBeNull()
    expect(evaluateSiegeOption({ ...attacker, state: 'idle', destination: null }, world)).toBeNull()
  })
})

describe('evaluateCutSupplyOption', () => {
  it('triggers when army in siege and adjacent sites are mostly enemy-controlled', () => {
    const attacker = makeArmy({ manpower: 5000, state: 'besieging', destination: null })
    const target = makeSite({
      id: 'site_target',
      ownerId: 'realm_blue',
      adjacency: ['site_a', 'site_b', 'site_c'],
    })
    const enemyA = makeSite({ id: 'site_a', ownerId: 'realm_blue' })
    const enemyB = makeSite({ id: 'site_b', ownerId: 'realm_blue' })
    const enemyC = makeSite({ id: 'site_c', ownerId: 'realm_blue' })
    const siege = makeSiege({ id: 'siege_active' })
    const world = makeWorld({
      sites: new Map([
        [target.id, target],
        [enemyA.id, enemyA],
        [enemyB.id, enemyB],
        [enemyC.id, enemyC],
      ]),
      armies: new Map([[attacker.id, attacker]]),
      sieges: new Map([[siege.id, siege]]),
    })

    const option = evaluateCutSupplyOption(attacker, world)

    expect(option).not.toBeNull()
    expect(option!.kind).toBe('cut-supply')
    expect(option!.armyId).toBe('army_attacker')
    expect(option!.targetSiteId).toBe('site_a')
    expect(option!.score).toBe(70)
  })

  it('returns null when army has insufficient manpower (<1500)', () => {
    const attacker = makeArmy({ manpower: 1000, state: 'besieging', destination: null })
    const target = makeSite({
      id: 'site_target',
      ownerId: 'realm_blue',
      adjacency: ['site_a'],
    })
    const enemyA = makeSite({ id: 'site_a', ownerId: 'realm_blue' })
    const siege = makeSiege({ id: 'siege_active' })
    const world = makeWorld({
      sites: new Map([[target.id, target], [enemyA.id, enemyA]]),
      armies: new Map([[attacker.id, attacker]]),
      sieges: new Map([[siege.id, siege]]),
    })

    expect(evaluateCutSupplyOption(attacker, world)).toBeNull()
  })

  it('returns null when defender is already 50%+ encircled', () => {
    const attacker = makeArmy({ manpower: 5000, state: 'besieging', destination: null })
    const target = makeSite({
      id: 'site_target',
      ownerId: 'realm_blue',
      adjacency: ['site_a', 'site_b'],
    })
    // Both adjacent sites are friendly to attacker — encirclement = 1.0
    const friendlyA = makeSite({ id: 'site_a', ownerId: 'realm_red' })
    const friendlyB = makeSite({ id: 'site_b', ownerId: 'realm_red' })
    const siege = makeSiege({ id: 'siege_active' })
    const world = makeWorld({
      sites: new Map([
        [target.id, target],
        [friendlyA.id, friendlyA],
        [friendlyB.id, friendlyB],
      ]),
      armies: new Map([[attacker.id, attacker]]),
      sieges: new Map([[siege.id, siege]]),
    })

    expect(evaluateCutSupplyOption(attacker, world)).toBeNull()
  })

  it('returns null when army is not in any siege', () => {
    const attacker = makeArmy({ manpower: 5000 })
    const world = makeWorld({ armies: new Map([[attacker.id, attacker]]) })

    expect(evaluateCutSupplyOption(attacker, world)).toBeNull()
  })
})

describe('evaluateRetreatOption', () => {
  it('triggers when army manpower is below 70% of nearest enemy at same location', () => {
    const attacker = makeArmy({ manpower: 1000, state: 'idle', destination: null })
    const enemy: Army = {
      id: 'army_enemy',
      realmId: 'realm_blue',
      manpower: 2000,
      location: 'site_target',
      state: 'idle',
      destination: null,
      ticksRemaining: 0,
      source: null,
    }
    const here = makeSite({
      id: 'site_target',
      ownerId: 'realm_blue',
      adjacency: ['site_friendly'],
    })
    const friendly = makeSite({ id: 'site_friendly', ownerId: 'realm_red' })
    const world = makeWorld({
      sites: new Map([[here.id, here], [friendly.id, friendly]]),
      armies: new Map([[attacker.id, attacker], [enemy.id, enemy]]),
    })

    const option = evaluateRetreatOption(attacker, world)

    expect(option).not.toBeNull()
    expect(option!.kind).toBe('retreat')
    expect(option!.armyId).toBe('army_attacker')
    expect(option!.targetSiteId).toBe('site_friendly')
    expect(option!.score).toBe(90)
  })

  it('triggers when army is in siege with low supply (<5)', () => {
    const attacker = makeArmy({ manpower: 5000, state: 'besieging', destination: null })
    const here = makeSite({
      id: 'site_target',
      ownerId: 'realm_blue',
      adjacency: ['site_friendly'],
    })
    const friendly = makeSite({ id: 'site_friendly', ownerId: 'realm_red' })
    const siege = makeSiege({ id: 'siege_starving', supplyRemaining: 3 })
    const world = makeWorld({
      sites: new Map([[here.id, here], [friendly.id, friendly]]),
      armies: new Map([[attacker.id, attacker]]),
      sieges: new Map([[siege.id, siege]]),
    })

    const option = evaluateRetreatOption(attacker, world)

    expect(option).not.toBeNull()
    expect(option!.kind).toBe('retreat')
    expect(option!.targetSiteId).toBe('site_friendly')
  })

  it('returns null when no friendly adjacent site exists', () => {
    const attacker = makeArmy({ manpower: 1000, state: 'idle', destination: null })
    const enemy: Army = {
      id: 'army_enemy',
      realmId: 'realm_blue',
      manpower: 2000,
      location: 'site_target',
      state: 'idle',
      destination: null,
      ticksRemaining: 0,
      source: null,
    }
    // Only adjacent site is enemy-owned
    const here = makeSite({
      id: 'site_target',
      ownerId: 'realm_blue',
      adjacency: ['site_other_enemy'],
    })
    const otherEnemy = makeSite({ id: 'site_other_enemy', ownerId: 'realm_blue' })
    const world = makeWorld({
      sites: new Map([[here.id, here], [otherEnemy.id, otherEnemy]]),
      armies: new Map([[attacker.id, attacker], [enemy.id, enemy]]),
    })

    expect(evaluateRetreatOption(attacker, world)).toBeNull()
  })

  it('returns null when army is healthy and not starving', () => {
    const attacker = makeArmy({ manpower: 5000, state: 'idle', destination: null })
    const here = makeSite({
      id: 'site_target',
      ownerId: 'realm_red',
      adjacency: ['site_friendly'],
    })
    const friendly = makeSite({ id: 'site_friendly', ownerId: 'realm_red' })
    const world = makeWorld({
      sites: new Map([[here.id, here], [friendly.id, friendly]]),
      armies: new Map([[attacker.id, attacker]]),
    })

    expect(evaluateRetreatOption(attacker, world)).toBeNull()
  })
})
