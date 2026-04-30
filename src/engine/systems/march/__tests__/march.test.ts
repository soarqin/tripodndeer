import { describe, expect, it } from 'vitest'

import { computeMarchTicks, findTravelCost, marchStep } from '../march'
import type { Army, RNGState, Site, World } from '~/shared/types'

function makeWorld(armies: Army[]): World {
  return {
    date: { yearBC: 260, season: 'spring', month: 1, xun: 'shang' },
    tick: 0,
    sites: new Map(),
    realms: new Map(),
    armies: new Map(armies.map((army) => [army.id, army])),
    edges: new Map(),
    wars: new Map(),
    peaceProposals: new Map(),
    relations: new Map(),
    diplomaticProposals: new Map(),
    treaties: new Map(),
    diplomacyHistory: [],
    coalitions: new Map(),
    zhouInvestiture: new Map(),
    generals: new Map(),
    passes: new Map(),
    adjacencyEdges: new Map(),
    sieges: new Map(),
    playerRealmId: 'realm_qin',
    rngState: { seed: 0, counter: 0 },
    phases: [],
    pendingOrders: [],
  }
}

function makeArmy(overrides: Partial<Army> = {}): Army {
  return {
    id: 'army_1',
    realmId: 'realm_qin',
    manpower: 5000,
    location: 'site_a',
    state: 'idle',
    destination: null,
    ticksRemaining: 0,
    source: null,
    ...overrides,
  }
}

function makeSite(id: string, terrainType: Site['terrainType']): Site {
  return {
    id,
    name: id,
    position: [0, 0],
    boundary: [{ edge: 'edge_1', reverse: false }],
    terrainType,
    ownerId: null,
    polygon: [],
    adjacency: [],
  }
}

const rng: RNGState = { seed: 0, counter: 0 }

describe('computeMarchTicks', () => {
  it('returns travel_cost when speedFactor=1', () => {
    expect(computeMarchTicks(3, 1)).toBe(3)
  })

  it('halves ticks when speedFactor=2 with ceil', () => {
    expect(computeMarchTicks(3, 2)).toBe(2)
  })

  it('minimum is 1', () => {
    expect(computeMarchTicks(0, 1)).toBe(1)
  })
})

describe('findTravelCost', () => {
  it('doubles mountain march cost', () => {
    const world: World = {
      date: { yearBC: 260, season: 'spring', month: 1, xun: 'shang' },
      tick: 0,
      sites: new Map([
        ['site_a', makeSite('site_a', 'plains')],
        ['site_b', makeSite('site_b', 'mountains')],
      ]),
      realms: new Map(),
      armies: new Map(),
      edges: new Map([
        ['edge_1', { id: 'edge_1', curveType: 'polyline', travel_cost: 3, anchors: [[0, 0], [1, 0]] }],
      ]),
      wars: new Map(),
      peaceProposals: new Map(),
    relations: new Map(),
    diplomaticProposals: new Map(),
    treaties: new Map(),
    diplomacyHistory: [],
    coalitions: new Map(),
    zhouInvestiture: new Map(),
      generals: new Map(),
      passes: new Map(),
      adjacencyEdges: new Map(),
      sieges: new Map(),
      playerRealmId: 'realm_qin',
      rngState: { seed: 0, counter: 0 },
      phases: [],
      pendingOrders: [],
    }

    expect(findTravelCost(world, 'site_a', 'site_b')).toBe(6)
  })

  it('friendly-controlled pass reduces travel cost by 20%', () => {
    const world: World = {
      date: { yearBC: 260, season: 'spring', month: 1, xun: 'shang' },
      tick: 0,
      sites: new Map([
        ['site_a', makeSite('site_a', 'plains')],
        ['site_b', makeSite('site_b', 'plains')],
      ]),
      realms: new Map(),
      armies: new Map(),
      edges: new Map([
        ['edge_1', { id: 'edge_1', curveType: 'polyline', travel_cost: 5, anchors: [[0, 0], [1, 0]] }],
      ]),
      wars: new Map(),
      peaceProposals: new Map(),
    relations: new Map(),
    diplomaticProposals: new Map(),
    treaties: new Map(),
    diplomacyHistory: [],
    coalitions: new Map(),
    zhouInvestiture: new Map(),
      generals: new Map(),
      passes: new Map([
        [
          'pass_1',
          {
            id: 'pass_1',
            name: 'Pass 1',
            edgeId: 'edge_1',
            defenseBonus: 0,
            controllerId: 'realm_qin',
            fortification: 0,
          },
        ],
      ]),
      adjacencyEdges: new Map([
        [
          'ae_1',
          {
            id: 'ae_1',
            fromSiteId: 'site_a',
            toSiteId: 'site_b',
            passId: 'pass_1',
          },
        ],
      ]),
      sieges: new Map(),
      playerRealmId: 'realm_qin',
      rngState: { seed: 0, counter: 0 },
      phases: [],
      pendingOrders: [],
    }

    expect(findTravelCost(world, 'site_a', 'site_b')).toBe(5)
    expect(findTravelCost(world, 'site_a', 'site_b', 'realm_qin')).toBe(4)
  })
})

describe('marchStep marching armies', () => {
  it('decrements ticksRemaining for marching army', () => {
    const army = makeArmy({
      state: 'marching',
      destination: 'site_b',
      ticksRemaining: 3,
      source: 'site_a',
    })
    const world = makeWorld([army])

    const { world: newWorld } = marchStep(world, rng)

    expect(newWorld.armies.get('army_1')!.ticksRemaining).toBe(2)
  })

  it('does not change idle army', () => {
    const army = makeArmy({ state: 'idle', ticksRemaining: 0 })
    const world = makeWorld([army])

    const { world: newWorld } = marchStep(world, rng)

    expect(newWorld.armies.get('army_1')).toEqual(army)
  })
})

describe('marchStep marching tick countdowns', () => {
  it('travel_cost=3: after 3 ticks, ticksRemaining=0', () => {
    const army = makeArmy({
      state: 'marching',
      destination: 'site_b',
      ticksRemaining: computeMarchTicks(3),
      source: 'site_a',
    })
    let world = makeWorld([army])

    for (let i = 0; i < 3; i += 1) {
      world = marchStep(world, rng).world
    }

    expect(world.armies.get('army_1')!.ticksRemaining).toBe(0)
  })

  it('multiple armies advance independently', () => {
    const army1 = makeArmy({
      id: 'army_1',
      state: 'marching',
      destination: 'site_b',
      ticksRemaining: 3,
      source: 'site_a',
    })
    const army2 = makeArmy({
      id: 'army_2',
      state: 'marching',
      destination: 'site_c',
      ticksRemaining: 5,
      source: 'site_a',
    })
    const world = makeWorld([army1, army2])

    const { world: newWorld } = marchStep(world, rng)

    expect(newWorld.armies.get('army_1')!.ticksRemaining).toBe(2)
    expect(newWorld.armies.get('army_2')!.ticksRemaining).toBe(4)
  })
})

describe('marchStep completion behavior', () => {
  it('marching army at zero remains marching for combatStep', () => {
    const army = makeArmy({
      state: 'marching',
      destination: 'site_b',
      ticksRemaining: 1,
      source: 'site_a',
    })
    const world = makeWorld([army])

    const { world: newWorld, events } = marchStep(world, rng)
    const updated = newWorld.armies.get('army_1')!

    expect(updated.state).toBe('marching')
    expect(updated.location).toBe('site_a')
    expect(updated.destination).toBe('site_b')
    expect(updated.ticksRemaining).toBe(0)
    expect(events).toEqual([])
  })
})

describe('marchStep retreat completion', () => {
  it('retreating army completes: state=idle, location=destination, destination=null', () => {
    const army = makeArmy({
      state: 'retreating',
      destination: 'site_a',
      ticksRemaining: 1,
      source: 'site_b',
      location: 'site_b',
    })
    const world = makeWorld([army])

    const { world: newWorld } = marchStep(world, rng)
    const updated = newWorld.armies.get('army_1')!

    expect(updated.state).toBe('idle')
    expect(updated.location).toBe('site_a')
    expect(updated.destination).toBeNull()
    expect(updated.source).toBeNull()
  })

  it('emits armyRetreated event on completed retreat', () => {
    const army = makeArmy({
      state: 'retreating',
      destination: 'site_a',
      ticksRemaining: 1,
      source: 'site_b',
      location: 'site_b',
    })
    const world = makeWorld([army])

    const { events } = marchStep(world, rng)

    expect(events).toEqual([
      { type: 'armyRetreated', payload: { armyId: 'army_1', toSite: 'site_a' } },
    ])
  })
})

describe('marchStep invariants', () => {
  it('ticksRemaining never goes below 0', () => {
    const army = makeArmy({
      state: 'marching',
      destination: 'site_b',
      ticksRemaining: 0,
      source: 'site_a',
    })
    const world = makeWorld([army])

    const { world: newWorld } = marchStep(world, rng)

    expect(newWorld.armies.get('army_1')!.ticksRemaining).toBe(0)
  })

  it('returns the original rng state unchanged', () => {
    const army = makeArmy({ state: 'marching', destination: 'site_b', ticksRemaining: 2 })
    const world = makeWorld([army])

    const { nextRng } = marchStep(world, rng)

    expect(nextRng).toBe(rng)
  })
})
