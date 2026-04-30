import { describe, expect, it } from 'vitest'
import type { Army, MapEdge, Realm, RNGState, Site, WarState, World } from '~/shared/types'
import { createInitialRng } from '~/engine/random'
import { warKey } from '~/engine/wars'
import { createWorldFromM1Data, loadM1Data } from '~/engine/world/factory'
import { aiPlanStep } from '../index'

function makeWarState(): WarState {
  return {
    casusBelli: null,
    declaredAt: { yearBC: 300, season: 'spring', month: 1, xun: 'shang' },
    occupiedSites: new Map(),
    peaceProposalId: null,
  }
}

const playerRealmId = 'realm_player'
const aiRealmId = 'realm_ai'
const enemyRealmId = 'realm_enemy'

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

function makeSite(id: string, ownerId: string | null, adjacency: readonly string[], edgeIds: readonly string[]): Site {
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

function makeArmy(id: string, realmId: string, location: string, state: Army['state'] = 'idle'): Army {
  return {
    id,
    realmId,
    manpower: 100,
    location,
    state,
    destination: null,
    ticksRemaining: 0,
    source: null,
  }
}

function baseWorld(overrides: Partial<World> = {}): World {
  const sharedEdge: MapEdge = {
    id: 'edge_ai_enemy',
    curveType: 'polyline',
    travel_cost: 5,
    anchors: [],
  }
  const distantEdge: MapEdge = {
    id: 'edge_enemy_distant',
    curveType: 'polyline',
    travel_cost: 9,
    anchors: [],
  }

  return {
    date: { yearBC: 300, season: 'spring', month: 1, xun: 'shang' },
    tick: 3,
    sites: new Map([
      ['site_player', makeSite('site_player', playerRealmId, [], [])],
      ['site_ai', makeSite('site_ai', aiRealmId, ['site_enemy'], ['edge_ai_enemy'])],
      ['site_enemy', makeSite('site_enemy', enemyRealmId, ['site_ai', 'site_distant'], ['edge_ai_enemy', 'edge_enemy_distant'])],
      ['site_distant', makeSite('site_distant', enemyRealmId, ['site_enemy'], ['edge_enemy_distant'])],
    ]),
    realms: new Map([
      [playerRealmId, makeRealm(playerRealmId, 'site_player')],
      [aiRealmId, makeRealm(aiRealmId, 'site_ai')],
      [enemyRealmId, makeRealm(enemyRealmId, 'site_enemy')],
    ]),
    armies: new Map([
      ['army_player', makeArmy('army_player', playerRealmId, 'site_player')],
      ['army_ai', makeArmy('army_ai', aiRealmId, 'site_ai')],
      ['army_enemy', makeArmy('army_enemy', enemyRealmId, 'site_enemy', 'marching')],
    ]),
    edges: new Map([
      ['edge_ai_enemy', sharedEdge],
      ['edge_enemy_distant', distantEdge],
    ]),
    wars: new Map(),
    peaceProposals: new Map(),
    generals: new Map(),
    passes: new Map(),
    adjacencyEdges: new Map(),
    playerRealmId,
    rngState: createInitialRng(1),
    phases: [],
    pendingOrders: [],
    ...overrides,
  }
}

describe('aiPlanStep cadence and realm eligibility', () => {
  it('does nothing off monthly ticks', () => {
    const world = baseWorld({ tick: 1 })
    const rng = createInitialRng(1)

    const result = aiPlanStep(world, rng)

    expect(result).toEqual({ world, nextRng: rng, events: [] })
  })

  it('may act on monthly ticks', () => {
    const result = aiPlanStep(baseWorld(), createInitialRng(1))

    expect(result.events.map(event => event.type)).toContain('aiDispatchedArmy')
  })
})

describe('aiPlanStep skip conditions', () => {
  it('skips the player realm', () => {
    const world = baseWorld({
      playerRealmId: aiRealmId,
      realms: new Map([[aiRealmId, makeRealm(aiRealmId, 'site_ai')]]),
    })
    const rng = createInitialRng(1)

    const result = aiPlanStep(world, rng)

    expect(result.events).toEqual([])
    expect(result.nextRng).toEqual(rng)
    expect(result.world.armies.get('army_ai')).toEqual(world.armies.get('army_ai'))
  })

  it('skips a realm with zero idle armies', () => {
    const world = baseWorld({
      armies: new Map([['army_ai', makeArmy('army_ai', aiRealmId, 'site_ai', 'marching')]]),
      realms: new Map([[aiRealmId, makeRealm(aiRealmId, 'site_ai')]]),
    })

    const result = aiPlanStep(world, createInitialRng(1))

    expect(result.events).toEqual([])
    expect(result.nextRng.counter).toBe(1)
  })

  it('skips a realm with no adjacent enemy sites', () => {
    const sites = new Map(baseWorld().sites)
    sites.set('site_ai', makeSite('site_ai', aiRealmId, ['site_friend'], ['edge_ai_enemy']))
    sites.set('site_friend', makeSite('site_friend', aiRealmId, ['site_ai'], ['edge_ai_enemy']))

    const result = aiPlanStep(baseWorld({ sites }), createInitialRng(1))

    expect(result.events).toEqual([])
  })

  it('is deterministic for the same seed and same world', () => {
    const world = baseWorld()
    const rng = createInitialRng(1)

    const first = aiPlanStep(world, rng)
    const second = aiPlanStep(world, rng)

    expect(second).toEqual(first)
  })
})

describe('AI determinism', () => {
  it('produces identical orders across 3 runs with same seed and world', () => {
    const data = loadM1Data()
    const world = createWorldFromM1Data(data, 42, 'realm_qin')
    const rng: RNGState = { seed: 42, counter: 0 }

    const result1 = aiPlanStep(world, rng)
    const result2 = aiPlanStep(world, rng)
    const result3 = aiPlanStep(world, rng)

    const armies1 = [...result1.world.armies.values()].map(army => `${army.state}:${army.destination ?? ''}`)
    const armies2 = [...result2.world.armies.values()].map(army => `${army.state}:${army.destination ?? ''}`)
    const armies3 = [...result3.world.armies.values()].map(army => `${army.state}:${army.destination ?? ''}`)

    expect(armies1).toEqual(armies2)
    expect(armies1).toEqual(armies3)
    expect(result1.nextRng).toEqual(result2.nextRng)
    expect(result1.nextRng).toEqual(result3.nextRng)
  })
})

describe('aiPlanStep target selection', () => {
  it('keeps the action rate near 20 percent over 100 monthly opportunities', () => {
    let rng: RNGState = createInitialRng(2)
    let actions = 0

    for (let i = 0; i < 100; i += 1) {
      const result = aiPlanStep(
        baseWorld({ realms: new Map([[aiRealmId, makeRealm(aiRealmId, 'site_ai')]]) }),
        rng,
      )
      rng = result.nextRng
      if (result.events.some(event => event.type === 'aiDispatchedArmy')) actions += 1
    }

    expect(actions).toBeGreaterThanOrEqual(15)
    expect(actions).toBeLessThanOrEqual(25)
  })

  it('only attacks adjacent sites, not long-range enemy sites', () => {
    const sites = new Map(baseWorld().sites)
    sites.set('site_ai', makeSite('site_ai', aiRealmId, ['site_player'], ['edge_ai_enemy']))
    sites.set('site_player', makeSite('site_player', aiRealmId, ['site_ai', 'site_enemy'], ['edge_ai_enemy', 'edge_enemy_distant']))

    const result = aiPlanStep(baseWorld({ sites }), createInitialRng(1))

    expect(result.events).toEqual([])
    expect(result.world.armies.get('army_ai')?.destination).toBeNull()
  })
})

describe('aiPlanStep war and dispatch effects', () => {
  it('declares war on the first attack against an owned target realm', () => {
    const result = aiPlanStep(baseWorld(), createInitialRng(1))

    expect(result.world.wars.has(warKey(aiRealmId, enemyRealmId))).toBe(true)
    expect(result.events[0]).toEqual({
      type: 'aiDeclaredWar',
      payload: { byRealm: aiRealmId, againstRealm: enemyRealmId },
    })
  })

  it('does not redeclare war when already at war', () => {
    const world = baseWorld({ wars: new Map([[warKey(aiRealmId, enemyRealmId), makeWarState()]]) })

    const result = aiPlanStep(world, createInitialRng(1))

    expect(result.events.filter(event => event.type === 'aiDeclaredWar')).toEqual([])
    expect(result.events.map(event => event.type)).toEqual(['aiDispatchedArmy'])
  })

  it('changes the dispatched army state to marching', () => {
    const result = aiPlanStep(baseWorld(), createInitialRng(1))
    const army = result.world.armies.get('army_ai')

    expect(army).toMatchObject({
      state: 'marching',
      destination: 'site_enemy',
      ticksRemaining: 5,
      source: 'site_ai',
    })
  })

  it('does not modify non-AI realm armies', () => {
    const world = baseWorld()

    const result = aiPlanStep(world, createInitialRng(1))

    expect(result.world.armies.get('army_player')).toEqual(world.armies.get('army_player'))
    expect(result.world.armies.get('army_enemy')).toEqual(world.armies.get('army_enemy'))
  })
})
