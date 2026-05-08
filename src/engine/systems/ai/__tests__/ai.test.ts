// M8.1 three-layer AI model: Strategic (yearly) / Operational (monthly) / Tactical (per-tick)
// aiPlanStep is @deprecated; tests below preserve its monolithic-monthly behavior for
// backward compatibility. New per-layer cadence assertions live in the
// 'three-layer cadence (M8.1)' describe block and target aiStrategicStep,
// aiOperationalStep, and aiTacticalStep directly.
import { describe, expect, it } from 'vitest'
import type { Army, GameEvent, MapEdge, Realm, RNGState, Site, WarState, World } from '~/shared/types'
import { createInitialRng } from '~/engine/random'
import { warKey } from '~/engine/wars'
import { createWorldFromM1Data, loadM1Data } from '~/engine/world/factory'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import { aiPlanStep } from '../index'
import { aiStrategicStep } from '../strategic'
import { aiOperationalStep } from '../operational'
import { aiTacticalStep } from '../tactical-step'

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

function eventOrderKey(event: GameEvent): string {
  if (event.type === 'diplomacyEvent') {
    const payload = event.payload as { kind: string; relationKey?: string; coalitionId?: string }
    return `${event.type}:${payload.kind}:${payload.relationKey ?? payload.coalitionId ?? ''}`
  }
  const payload = event.payload as { byRealm?: string; againstRealm?: string; realmId?: string; targetSiteId?: string }
  return `${event.type}:${payload.byRealm ?? payload.realmId ?? ''}->${payload.againstRealm ?? payload.targetSiteId ?? ''}`
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

describe('aiPlanStep cadence and realm eligibility (deprecated, M8 monolith)', () => {
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

  it('locks fixed-seed M1 action and diplomacy event ordering', () => {
    const world = createWorldFromM1Data(loadM1Data(), 42, 'realm_qin')
    const result = aiPlanStep(world, { seed: 42, counter: 0 })

    expect(result.nextRng).toEqual({ seed: 42, counter: 9 })
    expect(result.events.map(eventOrderKey)).toEqual([
      'aiDeclaredWar:realm_chu->realm_wei',
      'aiDispatchedArmy:realm_chu->site_020',
      'diplomacyEvent:war_declared:realm_chu__realm_wei',
      'diplomacyEvent:relation_changed:realm_chu__realm_han',
      'diplomacyEvent:relation_changed:realm_han__realm_wei',
      'diplomacyEvent:relation_changed:realm_chu__realm_qi',
      'diplomacyEvent:relation_changed:realm_qi__realm_wei',
      'diplomacyEvent:relation_changed:realm_chu__realm_qin',
      'diplomacyEvent:relation_changed:realm_qin__realm_wei',
      'diplomacyEvent:relation_changed:realm_chu__realm_yan',
      'diplomacyEvent:relation_changed:realm_wei__realm_yan',
      'diplomacyEvent:relation_changed:realm_chu__realm_zhao',
      'diplomacyEvent:relation_changed:realm_wei__realm_zhao',
      'diplomacyEvent:relation_changed:realm_chu__realm_zhou',
      'diplomacyEvent:relation_changed:realm_wei__realm_zhou',
      'diplomacyEvent:coalition_changed:coalition_against_realm_chu',
      'diplomacyEvent:coalition_changed:coalition_against_realm_qi',
      'diplomacyEvent:coalition_changed:coalition_against_realm_qin',
      'diplomacyEvent:coalition_changed:coalition_against_realm_zhao',
      'diplomacyEvent:proposal_created:realm_han__realm_qi',
      'diplomacyEvent:proposal_created:realm_qi__realm_wei',
      'diplomacyEvent:proposal_created:realm_wei__realm_zhou',
      'diplomacyEvent:proposal_created:realm_qi__realm_yan',
      'aiDeclaredWar:realm_yan->realm_qi',
      'aiDispatchedArmy:realm_yan->site_045',
      'diplomacyEvent:war_declared:realm_qi__realm_yan',
      'diplomacyEvent:relation_changed:realm_chu__realm_yan',
      'diplomacyEvent:relation_changed:realm_chu__realm_qi',
      'diplomacyEvent:relation_changed:realm_han__realm_yan',
      'diplomacyEvent:relation_changed:realm_han__realm_qi',
      'diplomacyEvent:relation_changed:realm_qin__realm_yan',
      'diplomacyEvent:relation_changed:realm_qi__realm_qin',
      'diplomacyEvent:relation_changed:realm_wei__realm_yan',
      'diplomacyEvent:relation_changed:realm_qi__realm_wei',
      'diplomacyEvent:relation_changed:realm_yan__realm_zhao',
      'diplomacyEvent:relation_changed:realm_qi__realm_zhao',
      'diplomacyEvent:relation_changed:realm_yan__realm_zhou',
      'diplomacyEvent:relation_changed:realm_qi__realm_zhou',
      'diplomacyEvent:coalition_changed:coalition_against_realm_chu',
      'diplomacyEvent:proposal_created:realm_qi__realm_zhao',
      'diplomacyEvent:proposal_created:realm_han__realm_zhou',
    ])
    expect([...result.world.armies.values()].filter(army => army.state !== 'idle').map(army => ({
      id: army.id,
      state: army.state,
      destination: army.destination,
      ticksRemaining: army.ticksRemaining,
      source: army.source,
    }))).toEqual([
      { id: 'army_chu_2', state: 'marching', destination: 'site_020', ticksRemaining: 1, source: 'site_009' },
      { id: 'army_yan_2', state: 'marching', destination: 'site_045', ticksRemaining: 1, source: 'site_013' },
    ])
  })
})

describe('aiPlanStep personality resolution', () => {
  it('uses the configured realm personality when choosing actions', () => {
    const world = baseWorld({
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
      realms: new Map([
        [playerRealmId, makeRealm(playerRealmId, 'site_player')],
        [aiRealmId, { ...makeRealm(aiRealmId, 'site_ai'), aiPersonality: 'cautious' }],
        [enemyRealmId, makeRealm(enemyRealmId, 'site_enemy')],
      ]),
    })

    const cautiousResult = aiPlanStep(world, createInitialRng(1))

    expect(cautiousResult.events[0]).toEqual({
      type: 'aiRetreatedArmy',
      payload: { realmId: aiRealmId, armyId: 'army_ai', targetSiteId: 'site_friend' },
    })

    const aggressiveWorld: World = {
      ...world,
      realms: new Map([
        [playerRealmId, makeRealm(playerRealmId, 'site_player')],
        [aiRealmId, { ...makeRealm(aiRealmId, 'site_ai'), aiPersonality: 'aggressive' as const }],
        [enemyRealmId, makeRealm(enemyRealmId, 'site_enemy')],
      ]),
    }

    const aggressiveResult = aiPlanStep(aggressiveWorld, createInitialRng(1))

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
