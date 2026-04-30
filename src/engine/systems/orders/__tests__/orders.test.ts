import { describe, expect, it } from 'vitest'
import type { Army, MapEdge, Order, RNGState, Realm, Site, WarState, World } from '~/shared/types'
import { warKey } from '~/engine/wars'

function makeWarState(): WarState {
  return {
    casusBelli: null,
    declaredAt: { yearBC: 260, season: 'spring', month: 1, xun: 'shang' },
    occupiedSites: new Map(),
    peaceProposalId: null,
  }
}
import { applyOrder, orderApplyStep } from '../index'

const playerRealmId = 'realm_qin'
const enemyRealmId = 'realm_han'

function makeRealm(id: string, capital: string): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#000000',
    capital,
    initialSites: [capital],
    initialArmies: [],
    aiPersonality: 'aggressive_random',
  }
}

function makeSite(
  id: string,
  ownerId: string | null,
  adjacency: readonly string[],
  edgeIds: readonly string[],
): Site {
  return {
    id,
    name: id,
    position: [0, 0],
    boundary: edgeIds.map(edge => ({ edge, reverse: false })),
    ownerId,
    polygon: [],
    adjacency,
  }
}

function makeArmy(overrides: Partial<Army> = {}): Army {
  return {
    id: 'army_1',
    realmId: playerRealmId,
    manpower: 5000,
    location: 'site_a',
    state: 'idle',
    destination: null,
    ticksRemaining: 0,
    source: null,
    ...overrides,
  }
}

function baseWorld(overrides: Partial<World> = {}): World {
  const sharedEdge: MapEdge = {
    id: 'edge_a_b',
    curveType: 'polyline',
    travel_cost: 4,
    anchors: [],
  }
  const otherEdge: MapEdge = {
    id: 'edge_b_c',
    curveType: 'polyline',
    travel_cost: 2,
    anchors: [],
  }

  return {
    date: { yearBC: 260, season: 'spring', month: 1, xun: 'shang' },
    tick: 0,
    sites: new Map([
      ['site_a', makeSite('site_a', playerRealmId, ['site_b'], ['edge_a_b'])],
      ['site_b', makeSite('site_b', enemyRealmId, ['site_a', 'site_c'], ['edge_a_b', 'edge_b_c'])],
      ['site_c', makeSite('site_c', enemyRealmId, ['site_b'], ['edge_b_c'])],
    ]),
    realms: new Map([
      [playerRealmId, makeRealm(playerRealmId, 'site_a')],
      [enemyRealmId, makeRealm(enemyRealmId, 'site_b')],
    ]),
    armies: new Map([['army_1', makeArmy()]]),
    edges: new Map([
      ['edge_a_b', sharedEdge],
      ['edge_b_c', otherEdge],
    ]),
    wars: new Map(),
    peaceProposals: new Map(),
    playerRealmId,
    rngState: { seed: 0, counter: 0 },
    phases: [],
    pendingOrders: [],
    ...overrides,
  }
}

const rng: RNGState = { seed: 0, counter: 0 }

describe('applyOrder declareWarAndMarch', () => {
  it('declares war and starts marching', () => {
    const world = baseWorld()
    const order: Order = {
      type: 'declareWarAndMarch',
      armyId: 'army_1',
      targetSiteId: 'site_b',
    }

    const { world: newWorld, events } = applyOrder(world, order)

    expect(newWorld.wars.has(warKey(playerRealmId, enemyRealmId))).toBe(true)
    const army = newWorld.armies.get('army_1')!
    expect(army.state).toBe('marching')
    expect(army.destination).toBe('site_b')
    expect(army.source).toBe('site_a')
    expect(army.ticksRemaining).toBe(4)
    expect(events.map(e => e.type)).toContain('warDeclared')
    expect(events.map(e => e.type)).toContain('orderApplied')
  })

  it('does not redeclare war when already at war', () => {
    const world = baseWorld({
      wars: new Map([[warKey(playerRealmId, enemyRealmId), makeWarState()]]),
    })
    const order: Order = {
      type: 'declareWarAndMarch',
      armyId: 'army_1',
      targetSiteId: 'site_b',
    }

    const { events } = applyOrder(world, order)

    expect(events.filter(e => e.type === 'warDeclared')).toHaveLength(0)
    expect(events.map(e => e.type)).toContain('orderApplied')
  })
})

describe('applyOrder march (already at war)', () => {
  it('army starts marching when realms are at war', () => {
    const world = baseWorld({
      wars: new Map([[warKey(playerRealmId, enemyRealmId), makeWarState()]]),
    })
    const order: Order = {
      type: 'march',
      armyId: 'army_1',
      targetSiteId: 'site_b',
    }

    const { world: newWorld, events } = applyOrder(world, order)

    const army = newWorld.armies.get('army_1')!
    expect(army.state).toBe('marching')
    expect(army.destination).toBe('site_b')
    expect(army.ticksRemaining).toBe(4)
    expect(events).toEqual([
      { type: 'orderApplied', payload: { armyId: 'army_1', targetSiteId: 'site_b' } },
    ])
  })

  it('marching to a friendly site requires no war', () => {
    const world = baseWorld({
      sites: new Map([
        ['site_a', makeSite('site_a', playerRealmId, ['site_b'], ['edge_a_b'])],
        ['site_b', makeSite('site_b', playerRealmId, ['site_a'], ['edge_a_b'])],
      ]),
    })
    const order: Order = {
      type: 'march',
      armyId: 'army_1',
      targetSiteId: 'site_b',
    }

    const { world: newWorld, events } = applyOrder(world, order)

    expect(newWorld.armies.get('army_1')!.state).toBe('marching')
    expect(events.map(e => e.type)).toEqual(['orderApplied'])
  })
})

describe('applyOrder rejection - war state', () => {
  it('rejects march when not at war', () => {
    const world = baseWorld()
    const order: Order = { type: 'march', armyId: 'army_1', targetSiteId: 'site_b' }

    const { world: newWorld, events } = applyOrder(world, order)

    expect(newWorld).toBe(world)
    expect(events).toEqual([{ type: 'orderRejected', payload: { reason: 'notAtWar', order } }])
  })

  it('rejects when army is not idle', () => {
    const world = baseWorld({
      armies: new Map([
        [
          'army_1',
          makeArmy({ state: 'marching', destination: 'site_b', ticksRemaining: 2, source: 'site_a' }),
        ],
      ]),
    })
    const order: Order = { type: 'declareWarAndMarch', armyId: 'army_1', targetSiteId: 'site_b' }

    const { world: newWorld, events } = applyOrder(world, order)

    expect(newWorld).toBe(world)
    expect(events).toEqual([{ type: 'orderRejected', payload: { reason: 'armyNotIdle', order } }])
  })
})

describe('applyOrder rejection - target validation', () => {
  it('rejects when target is not adjacent', () => {
    const world = baseWorld()
    const order: Order = { type: 'declareWarAndMarch', armyId: 'army_1', targetSiteId: 'site_c' }

    const { world: newWorld, events } = applyOrder(world, order)

    expect(newWorld).toBe(world)
    expect(events).toEqual([{ type: 'orderRejected', payload: { reason: 'notAdjacent', order } }])
  })

  it('rejects when armyId does not exist', () => {
    const world = baseWorld()
    const order: Order = {
      type: 'declareWarAndMarch',
      armyId: 'army_missing',
      targetSiteId: 'site_b',
    }

    const { world: newWorld, events } = applyOrder(world, order)

    expect(newWorld).toBe(world)
    expect(events).toEqual([{ type: 'orderRejected', payload: { reason: 'armyNotFound', order } }])
  })
})

describe('orderApplyStep batch processing', () => {
  it('applies multiple orders in sequence and clears pendingOrders', () => {
    const army2 = makeArmy({ id: 'army_2', location: 'site_b', realmId: enemyRealmId })
    const world = baseWorld({
      wars: new Map([[warKey(playerRealmId, enemyRealmId), makeWarState()]]),
      armies: new Map([
        ['army_1', makeArmy()],
        ['army_2', army2],
      ]),
      pendingOrders: [
        { type: 'march', armyId: 'army_1', targetSiteId: 'site_b' },
        { type: 'march', armyId: 'army_2', targetSiteId: 'site_c' },
      ],
    })

    const { world: newWorld, events, nextRng } = orderApplyStep(world, rng)

    expect(newWorld.pendingOrders).toEqual([])
    expect(newWorld.armies.get('army_1')!.state).toBe('marching')
    expect(newWorld.armies.get('army_2')!.state).toBe('marching')
    expect(events.filter(e => e.type === 'orderApplied')).toHaveLength(2)
    expect(nextRng).toBe(rng)
  })

  it('clears pendingOrders even when all orders are rejected', () => {
    const order: Order = { type: 'march', armyId: 'army_missing', targetSiteId: 'site_b' }
    const world = baseWorld({ pendingOrders: [order] })

    const { world: newWorld, events } = orderApplyStep(world, rng)

    expect(newWorld.pendingOrders).toEqual([])
    expect(events).toEqual([
      { type: 'orderRejected', payload: { reason: 'armyNotFound', order } },
    ])
  })
})

describe('orderApplyStep determinism and immutability', () => {
  it('returns nextRng equal to input rng (orders are deterministic)', () => {
    const world = baseWorld({ pendingOrders: [] })

    const { nextRng } = orderApplyStep(world, rng)

    expect(nextRng).toBe(rng)
  })

  it('does not mutate input world.armies', () => {
    const world = baseWorld({
      pendingOrders: [
        { type: 'declareWarAndMarch', armyId: 'army_1', targetSiteId: 'site_b' },
      ],
    })
    const originalArmy = world.armies.get('army_1')!

    orderApplyStep(world, rng)

    expect(world.armies.get('army_1')).toBe(originalArmy)
    expect(world.armies.get('army_1')!.state).toBe('idle')
  })
})
