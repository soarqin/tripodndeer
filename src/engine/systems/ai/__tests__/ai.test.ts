// M8.1 three-layer AI model: Strategic (yearly) / Operational (monthly) / Tactical (per-tick)
// Tests target aiStrategicStep / aiOperationalStep / aiTacticalStep directly.
import { describe, expect, it } from 'vitest'
import type { Army, GameEvent, MapEdge, Realm, RNGState, Site, WarState, World } from '~/shared/types'
import type { OperationalDirective } from '~/shared/types/ai-state'
import { createInitialRng } from '~/engine/random'
import { warKey } from '~/engine/wars'
import { createWorldFromM1Data, loadM1Data } from '~/engine/world/factory'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import { aiStrategicStep } from '../strategic'
import { aiOperationalStep } from '../operational'
import { aiTacticalStep } from '../tactical-step'

function runThreeLayer(
  world: World,
  rng: RNGState
): { world: World; nextRng: RNGState; events: readonly GameEvent[] } {
  const s = aiStrategicStep(world, rng)
  const o = aiOperationalStep(s.world, s.nextRng)
  const t = aiTacticalStep(o.world, o.nextRng)
  return {
    world: t.world,
    nextRng: t.nextRng,
    events: [...s.events, ...o.events, ...t.events],
  }
}

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
    economy: { treasury: 0, foodStores: 0, taxRate: 10 },
    traits: [],
    politicalSystem: 'enfeoffment',
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
    economy: { population: 0, households: 0, taxBase: 0, foodProduction: 0 },
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

  return makeEmptyWorld({
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
    playerRealmId,
    rngState: createInitialRng(1),
    ...overrides,
  })
}

describe('three-layer cadence (M8.1)', () => {
  it('aiStrategicStep fires only on yearly trigger (spring/month=1/xun=shang)', () => {
    const yearlyWorld = baseWorld({
      date: { yearBC: 300, season: 'spring', month: 1, xun: 'shang' },
    })
    const offYearWorld = baseWorld({
      date: { yearBC: 300, season: 'summer', month: 1, xun: 'shang' },
    })

    const yearlyResult = aiStrategicStep(yearlyWorld, createInitialRng(1))
    const offYearResult = aiStrategicStep(offYearWorld, createInitialRng(1))

    expect(yearlyResult.events.length).toBeGreaterThan(0)
    expect(offYearResult.events).toEqual([])
    expect(offYearResult.world).toBe(offYearWorld)
  })

  it('aiOperationalStep fires monthly (xun=shang) and is no-op otherwise', () => {
    const monthStartWorld = baseWorld({
      date: { yearBC: 300, season: 'spring', month: 2, xun: 'shang' },
    })
    const midMonthWorld = baseWorld({
      date: { yearBC: 300, season: 'spring', month: 2, xun: 'zhong' },
    })

    const monthStart = aiOperationalStep(monthStartWorld, createInitialRng(1))
    const midMonth = aiOperationalStep(midMonthWorld, createInitialRng(1))

    expect(monthStart.world).not.toBe(monthStartWorld)
    expect(midMonth.events).toEqual([])
    expect(midMonth.world).toBe(midMonthWorld)
  })

  it('aiTacticalStep runs every tick regardless of date', () => {
    const tickA = baseWorld({
      date: { yearBC: 300, season: 'spring', month: 1, xun: 'zhong' },
      tick: 1,
    })
    const tickB = baseWorld({
      date: { yearBC: 300, season: 'autumn', month: 2, xun: 'xia' },
      tick: 17,
    })

    const resultA = aiTacticalStep(tickA, createInitialRng(1))
    const resultB = aiTacticalStep(tickB, createInitialRng(1))

    expect(resultA.events).toBeDefined()
    expect(resultB.events).toBeDefined()
  })
})

describe('3-layer AI skip conditions', () => {
  it('aiOperationalStep skips the player realm', () => {
    const world = baseWorld({
      playerRealmId: aiRealmId,
      realms: new Map([[aiRealmId, makeRealm(aiRealmId, 'site_ai')]]),
    })
    const rng = createInitialRng(1)

    const result = aiOperationalStep(world, rng)

    expect(result.events).toEqual([])
    expect(result.nextRng).toEqual(rng)
    expect(result.world.armies.get('army_ai')).toEqual(world.armies.get('army_ai'))
  })

  it('aiOperationalStep produces no events when the only AI realm has no plan or peers', () => {
    const world = baseWorld({
      armies: new Map([['army_ai', makeArmy('army_ai', aiRealmId, 'site_ai', 'marching')]]),
      realms: new Map([[aiRealmId, makeRealm(aiRealmId, 'site_ai')]]),
    })

    const result = aiOperationalStep(world, createInitialRng(1))

    expect(result.events).toEqual([])
  })

  it('aiOperationalStep produces no events when no adjacent enemy sites exist', () => {
    const sites = new Map(baseWorld().sites)
    sites.set('site_ai', makeSite('site_ai', aiRealmId, ['site_friend'], ['edge_ai_enemy']))
    sites.set('site_friend', makeSite('site_friend', aiRealmId, ['site_ai'], ['edge_ai_enemy']))

    const result = aiOperationalStep(baseWorld({ sites }), createInitialRng(1))

    expect(result.events).toEqual([])
  })

  it('aiOperationalStep is deterministic for the same seed and same world', () => {
    const world = baseWorld()
    const rng = createInitialRng(1)

    const first = aiOperationalStep(world, rng)
    const second = aiOperationalStep(world, rng)

    expect(second).toEqual(first)
  })
})

describe('AI determinism', () => {
  it('produces identical orders across 3 runs with same seed and world', () => {
    const data = loadM1Data()
    const world = createWorldFromM1Data(data, 42, 'realm_qin')
    const rng: RNGState = { seed: 42, counter: 0 }

    const result1 = runThreeLayer(world, rng)
    const result2 = runThreeLayer(world, rng)
    const result3 = runThreeLayer(world, rng)

    const armies1 = [...result1.world.armies.values()].map(army => `${army.state}:${army.destination ?? ''}`)
    const armies2 = [...result2.world.armies.values()].map(army => `${army.state}:${army.destination ?? ''}`)
    const armies3 = [...result3.world.armies.values()].map(army => `${army.state}:${army.destination ?? ''}`)

    expect(armies1).toEqual(armies2)
    expect(armies1).toEqual(armies3)
    expect(result1.nextRng).toEqual(result2.nextRng)
    expect(result1.nextRng).toEqual(result3.nextRng)
  })
})

describe('3-layer AI personality resolution', () => {
  it('aiTacticalStep applies retreat for steward and dispatch+war for conqueror', () => {
    const baseRulerDims = {
      expansionDrive: 0.5,
      diplomaticTrust: 0.5,
      caution: 0.5,
      honor: 0.5,
      vindictiveness: 0.5,
      reformInclination: 0.5,
      patience: 0.5,
      preferredStrategy: 'diplomatic' as const,
    }
    const stewardRuler = {
      realmId: aiRealmId,
      generalId: 'gen_ai_ruler',
      age: 40,
      lifespan: 65,
      health: 80,
      personality: 'steward' as const,
      personalityDims: baseRulerDims,
      successionLawId: 'primogeniture' as const,
      inOfficeSinceTick: 0,
    }
    const conquerorRuler = { ...stewardRuler, personality: 'conqueror' as const }

    const dispatchDirective: OperationalDirective = {
      id: 'dispatch_1',
      kind: 'dispatch_army',
      priority: 10,
      armyId: 'army_ai',
      targetRealmId: enemyRealmId,
      targetSiteId: 'site_enemy',
      createdAtTick: 0,
      expiresAtTick: 100,
    }

    const cautiousWorld = baseWorld({
      sites: new Map([
        ['site_player', makeSite('site_player', playerRealmId, [], [])],
        ['site_ai', makeSite('site_ai', aiRealmId, ['site_enemy', 'site_friend'], ['edge_ai_enemy'])],
        ['site_enemy', makeSite('site_enemy', enemyRealmId, ['site_ai'], ['edge_ai_enemy'])],
        ['site_friend', makeSite('site_friend', aiRealmId, ['site_ai'], ['edge_enemy_distant'])],
      ]),
      armies: new Map([
        ['army_player', makeArmy('army_player', playerRealmId, 'site_player')],
        ['army_ai', { ...makeArmy('army_ai', aiRealmId, 'site_ai'), manpower: 45 }],
        ['army_enemy', { ...makeArmy('army_enemy', enemyRealmId, 'site_ai'), manpower: 70 }],
      ]),
      rulers: new Map([[aiRealmId, stewardRuler]]),
      aiState: new Map([[aiRealmId, { strategic: null, operational: [dispatchDirective] }]]),
    })

    const cautiousResult = aiTacticalStep(cautiousWorld, createInitialRng(1))

    expect(cautiousResult.events[0]).toEqual({
      type: 'aiRetreatedArmy',
      payload: { realmId: aiRealmId, armyId: 'army_ai', targetSiteId: 'site_friend' },
    })

    const aggressiveWorld: World = {
      ...cautiousWorld,
      rulers: new Map([[aiRealmId, conquerorRuler]]),
    }

    const aggressiveResult = aiTacticalStep(aggressiveWorld, createInitialRng(1))

    expect(aggressiveResult.events[0]).toEqual({
      type: 'aiDeclaredWar',
      payload: { byRealm: aiRealmId, againstRealm: enemyRealmId },
    })
    expect(aggressiveResult.events[1]).toEqual({
      type: 'aiDispatchedArmy',
      payload: { realmId: aiRealmId, armyId: 'army_ai', targetSiteId: 'site_enemy' },
    })
  })
})

describe('3-layer AI target selection', () => {
  it('aiOperationalStep does not dispatch when no adjacent enemy site exists', () => {
    const sites = new Map(baseWorld().sites)
    sites.set('site_ai', makeSite('site_ai', aiRealmId, ['site_player'], ['edge_ai_enemy']))
    sites.set('site_player', makeSite('site_player', aiRealmId, ['site_ai', 'site_enemy'], ['edge_ai_enemy', 'edge_enemy_distant']))

    const result = aiOperationalStep(baseWorld({ sites }), createInitialRng(1))

    expect(result.events).toEqual([])
    expect(result.world.armies.get('army_ai')?.destination).toBeNull()
  })
})

describe('3-layer AI war and dispatch effects', () => {
  it('aiTacticalStep declares war on the first attack against an owned target realm', () => {
    const dispatchDirective: OperationalDirective = {
      id: 'dispatch_1',
      kind: 'dispatch_army',
      priority: 10,
      armyId: 'army_ai',
      targetRealmId: enemyRealmId,
      targetSiteId: 'site_enemy',
      createdAtTick: 0,
      expiresAtTick: 100,
    }
    const world = baseWorld({
      aiState: new Map([[aiRealmId, { strategic: null, operational: [dispatchDirective] }]]),
    })

    const result = aiTacticalStep(world, createInitialRng(1))

    expect(result.world.wars.has(warKey(aiRealmId, enemyRealmId))).toBe(true)
    expect(result.events[0]).toEqual({
      type: 'aiDeclaredWar',
      payload: { byRealm: aiRealmId, againstRealm: enemyRealmId },
    })
  })

  it('aiTacticalStep does not modify non-AI realm armies', () => {
    const dispatchDirective: OperationalDirective = {
      id: 'dispatch_1',
      kind: 'dispatch_army',
      priority: 10,
      armyId: 'army_ai',
      targetRealmId: enemyRealmId,
      targetSiteId: 'site_enemy',
      createdAtTick: 0,
      expiresAtTick: 100,
    }
    const world = baseWorld({
      wars: new Map([[warKey(aiRealmId, enemyRealmId), makeWarState()]]),
      aiState: new Map([[aiRealmId, { strategic: null, operational: [dispatchDirective] }]]),
    })

    const result = aiTacticalStep(world, createInitialRng(1))

    expect(result.world.armies.get('army_player')).toEqual(world.armies.get('army_player'))
    expect(result.world.armies.get('army_enemy')).toEqual(world.armies.get('army_enemy'))
  })
})
