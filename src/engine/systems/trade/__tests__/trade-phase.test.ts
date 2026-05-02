import { describe, expect, it } from 'vitest'
import { tradePhase } from '../trade-phase'
import { makeTestWorld } from '~/engine/__tests__/world-test-fixtures'
import { warKey } from '~/engine/wars/wars'
import {
  M42_TRADE_FACTION_INFLUENCE_PER_ROUTE_PER_YEAR,
  M42_TRADE_ROUTE_DISTANCE_PENALTY_BP_PER_HOP,
} from '~/content/m2/balance'
import type {
  AdjacencyEdge,
  FactionId,
  FactionInfluenceState,
  Realm,
  Site,
  TradeRoute,
  WarState,
  World,
} from '~/shared/types'

function makeRealm(overrides: Partial<Realm> = {}): Realm {
  return {
    id: 'realm_qin',
    displayName: 'Qin',
    fullTitle: 'Qin',
    color: '#ff0000',
    capital: 'site_qin',
    initialSites: [],
    initialArmies: [],
    aiPersonality: 'cautious',
    economy: { treasury: 1000, foodStores: 0, taxRate: 10 },
    traits: [],
    politicalSystem: 'enfeoffment',
    ...overrides,
  }
}

function makeSite(overrides: Partial<Site> = {}): Site {
  return {
    id: 'site_qin',
    name: 'Qin Capital',
    position: [0, 0],
    boundary: [],
    ownerId: 'realm_qin',
    polygon: [],
    adjacency: [],
    economy: { population: 1000, households: 200, taxBase: 200, foodProduction: 100 },
    ...overrides,
  }
}

function makeRoute(overrides: Partial<TradeRoute> = {}): TradeRoute {
  return {
    id: 'route_a',
    fromSiteId: 'site_qin',
    toSiteId: 'site_qi',
    fromRealmId: 'realm_qin',
    toRealmId: 'realm_qi',
    establishedAtTick: 0,
    baseIncomePerXun: 100,
    status: 'active',
    ...overrides,
  }
}

function makeAdjacent(fromId: string, toId: string, edgeId = `edge_${fromId}_${toId}`): AdjacencyEdge {
  return {
    id: edgeId,
    fromSiteId: fromId,
    toSiteId: toId,
    passId: 'pass_test',
  }
}

function makeFactionInfluence(realmId: string, foreignClients = 10): [string, FactionInfluenceState] {
  const influences = new Map<FactionId, number>([['foreign_clients', foreignClients]])
  return [realmId, { realmId, influences }]
}

function setupTwoRealmWorld(overrides: Partial<World> = {}): World {
  const qinRealm = makeRealm({ id: 'realm_qin', economy: { treasury: 1000, foodStores: 0, taxRate: 10 } })
  const qiRealm = makeRealm({
    id: 'realm_qi',
    capital: 'site_qi',
    economy: { treasury: 2000, foodStores: 0, taxRate: 10 },
  })
  const qinSite = makeSite({ id: 'site_qin', ownerId: 'realm_qin', adjacency: ['site_qi'] })
  const qiSite = makeSite({ id: 'site_qi', ownerId: 'realm_qi', adjacency: ['site_qin'] })

  return makeTestWorld({
    realms: new Map([
      ['realm_qin', qinRealm],
      ['realm_qi', qiRealm],
    ]),
    sites: new Map([
      ['site_qin', qinSite],
      ['site_qi', qiSite],
    ]),
    adjacencyEdges: new Map([['edge_qin_qi', makeAdjacent('site_qin', 'site_qi')]]),
    factionInfluences: new Map([makeFactionInfluence('realm_qin'), makeFactionInfluence('realm_qi')]),
    ...overrides,
  })
}

describe('tradePhase: early return', () => {
  it('returns unchanged world when xun !== shang', () => {
    const world = setupTwoRealmWorld({
      date: { yearBC: 260, season: 'spring', month: 1, xun: 'zhong' },
      tradeRoutes: new Map([['route_a', makeRoute()]]),
    })
    const result = tradePhase(world, world.rngState)
    expect(result.world).toBe(world)
    expect(result.events).toEqual([])
  })

  it('returns unchanged world when xun is xia', () => {
    const world = setupTwoRealmWorld({
      date: { yearBC: 260, season: 'spring', month: 1, xun: 'xia' },
      tradeRoutes: new Map([['route_a', makeRoute()]]),
    })
    const result = tradePhase(world, world.rngState)
    expect(result.world).toBe(world)
  })
})

describe('tradePhase: income distribution', () => {
  it('distributes income 50/50 between two realms on active route', () => {
    const world = setupTwoRealmWorld({
      tradeRoutes: new Map([['route_a', makeRoute({ baseIncomePerXun: 100 })]]),
    })
    const result = tradePhase(world, world.rngState)

    const qinTreasury = result.world.realms.get('realm_qin')!.economy.treasury
    const qiTreasury = result.world.realms.get('realm_qi')!.economy.treasury

    const expectedHalf = Math.floor(Math.floor(100 * (1 - M42_TRADE_ROUTE_DISTANCE_PENALTY_BP_PER_HOP / 10000)) / 2)
    expect(qinTreasury).toBe(1000 + expectedHalf)
    expect(qiTreasury).toBe(2000 + expectedHalf)
  })

  it('applies distance penalty: longer routes earn less than shorter ones', () => {
    const sites = new Map<string, Site>()
    sites.set('site_a', makeSite({ id: 'site_a', ownerId: 'realm_qin', adjacency: ['site_b'] }))
    sites.set('site_b', makeSite({ id: 'site_b', ownerId: 'realm_qin', adjacency: ['site_a', 'site_c'] }))
    sites.set('site_c', makeSite({ id: 'site_c', ownerId: 'realm_qin', adjacency: ['site_b', 'site_d'] }))
    sites.set('site_d', makeSite({ id: 'site_d', ownerId: 'realm_qin', adjacency: ['site_c', 'site_e'] }))
    sites.set('site_e', makeSite({ id: 'site_e', ownerId: 'realm_qi', adjacency: ['site_d'] }))

    const adjacencyEdges = new Map([
      ['e_ab', makeAdjacent('site_a', 'site_b', 'e_ab')],
      ['e_bc', makeAdjacent('site_b', 'site_c', 'e_bc')],
      ['e_cd', makeAdjacent('site_c', 'site_d', 'e_cd')],
      ['e_de', makeAdjacent('site_d', 'site_e', 'e_de')],
    ])

    const world = setupTwoRealmWorld({
      sites,
      adjacencyEdges,
      tradeRoutes: new Map([
        [
          'route_long',
          makeRoute({
            id: 'route_long',
            fromSiteId: 'site_a',
            toSiteId: 'site_e',
            baseIncomePerXun: 100,
          }),
        ],
      ]),
    })

    const result = tradePhase(world, world.rngState)
    const qinAfter = result.world.realms.get('realm_qin')!.economy.treasury

    const longRouteHalf = Math.floor(Math.floor(100 * (1 - 4 * M42_TRADE_ROUTE_DISTANCE_PENALTY_BP_PER_HOP / 10000)) / 2)
    expect(qinAfter).toBe(1000 + longRouteHalf)
    expect(longRouteHalf).toBeLessThan(50)
  })
})

describe('tradePhase: route lifecycle', () => {
  it('cuts route when realms are at war', () => {
    const wars = new Map<string, WarState>([
      [
        warKey('realm_qin', 'realm_qi'),
        {
          casusBelli: null,
          declaredAt: { yearBC: 260, season: 'spring', month: 1, xun: 'shang' },
          occupiedSites: new Map(),
          peaceProposalId: null,
        },
      ],
    ])
    const world = setupTwoRealmWorld({
      wars,
      tradeRoutes: new Map([['route_a', makeRoute()]]),
    })
    const result = tradePhase(world, world.rngState)

    expect(result.world.tradeRoutes.get('route_a')!.status).toBe('cut')
    expect(result.world.realms.get('realm_qin')!.economy.treasury).toBe(1000)
    expect(result.world.realms.get('realm_qi')!.economy.treasury).toBe(2000)
  })

  it('cuts route when ownership changes (different new owners)', () => {
    const sites = new Map<string, Site>()
    sites.set('site_qin', makeSite({ id: 'site_qin', ownerId: 'realm_chu', adjacency: ['site_qi'] }))
    sites.set('site_qi', makeSite({ id: 'site_qi', ownerId: 'realm_qi', adjacency: ['site_qin'] }))

    const world = setupTwoRealmWorld({
      sites,
      tradeRoutes: new Map([['route_a', makeRoute()]]),
    })
    const result = tradePhase(world, world.rngState)

    expect(result.world.tradeRoutes.get('route_a')!.status).toBe('cut')
  })

  it('skips route with status=cut (no income, no faction change)', () => {
    const world = setupTwoRealmWorld({
      tradeRoutes: new Map([['route_a', makeRoute({ status: 'cut' })]]),
    })
    const result = tradePhase(world, world.rngState)

    expect(result.world.realms.get('realm_qin')!.economy.treasury).toBe(1000)
    expect(result.world.realms.get('realm_qi')!.economy.treasury).toBe(2000)
    const before = world.factionInfluences.get('realm_qin')!.influences.get('foreign_clients')
    const after = result.world.factionInfluences.get('realm_qin')!.influences.get('foreign_clients')
    expect(after).toBe(before)
  })
})

describe('tradePhase: ordering and multiplicity', () => {
  it('processes multiple active routes in id-sorted order', () => {
    const wei = makeRealm({
      id: 'realm_wei',
      capital: 'site_wei',
      economy: { treasury: 500, foodStores: 0, taxRate: 10 },
    })
    const realms = new Map([
      ['realm_qin', makeRealm({ economy: { treasury: 1000, foodStores: 0, taxRate: 10 } })],
      ['realm_qi', makeRealm({ id: 'realm_qi', economy: { treasury: 2000, foodStores: 0, taxRate: 10 } })],
      ['realm_wei', wei],
    ])
    const sites = new Map<string, Site>([
      ['site_qin', makeSite({ id: 'site_qin', ownerId: 'realm_qin', adjacency: ['site_qi'] })],
      ['site_qi', makeSite({ id: 'site_qi', ownerId: 'realm_qi', adjacency: ['site_qin', 'site_wei'] })],
      ['site_wei', makeSite({ id: 'site_wei', ownerId: 'realm_wei', adjacency: ['site_qi'] })],
    ])
    const world = makeTestWorld({
      realms,
      sites,
      adjacencyEdges: new Map([
        ['e1', makeAdjacent('site_qin', 'site_qi', 'e1')],
        ['e2', makeAdjacent('site_qi', 'site_wei', 'e2')],
      ]),
      factionInfluences: new Map([
        makeFactionInfluence('realm_qin'),
        makeFactionInfluence('realm_qi'),
        makeFactionInfluence('realm_wei'),
      ]),
      tradeRoutes: new Map([
        ['route_b', makeRoute({ id: 'route_b', baseIncomePerXun: 100 })],
        [
          'route_a',
          makeRoute({
            id: 'route_a',
            fromSiteId: 'site_qi',
            toSiteId: 'site_wei',
            fromRealmId: 'realm_qi',
            toRealmId: 'realm_wei',
            baseIncomePerXun: 100,
          }),
        ],
      ]),
    })

    const result = tradePhase(world, world.rngState)

    const oneHopHalf = Math.floor(Math.floor(100 * (1 - M42_TRADE_ROUTE_DISTANCE_PENALTY_BP_PER_HOP / 10000)) / 2)
    expect(result.world.realms.get('realm_qin')!.economy.treasury).toBe(1000 + oneHopHalf)
    expect(result.world.realms.get('realm_qi')!.economy.treasury).toBe(2000 + 2 * oneHopHalf)
    expect(result.world.realms.get('realm_wei')!.economy.treasury).toBe(500 + oneHopHalf)
  })
})

describe('tradePhase: faction influence', () => {
  it('increases foreign_clients influence on both endpoints per active route', () => {
    const world = setupTwoRealmWorld({
      tradeRoutes: new Map([['route_a', makeRoute()]]),
    })
    const result = tradePhase(world, world.rngState)

    const expectedDelta = M42_TRADE_FACTION_INFLUENCE_PER_ROUTE_PER_YEAR / 12
    const qinFC = result.world.factionInfluences.get('realm_qin')!.influences.get('foreign_clients')!
    const qiFC = result.world.factionInfluences.get('realm_qi')!.influences.get('foreign_clients')!

    expect(qinFC).toBeCloseTo(10 + expectedDelta, 5)
    expect(qiFC).toBeCloseTo(10 + expectedDelta, 5)
  })

  it('caps faction influence at 100 (no overflow)', () => {
    const world = setupTwoRealmWorld({
      factionInfluences: new Map([
        makeFactionInfluence('realm_qin', 99.9),
        makeFactionInfluence('realm_qi', 99.9),
      ]),
      tradeRoutes: new Map([['route_a', makeRoute()]]),
    })
    const result = tradePhase(world, world.rngState)

    const qinFC = result.world.factionInfluences.get('realm_qin')!.influences.get('foreign_clients')!
    expect(qinFC).toBeLessThanOrEqual(100)
  })
})
