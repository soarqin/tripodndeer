import { describe, expect, it } from 'vitest'
import { proposeNewTradeRoutes } from '../trade-decision'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import { warKey } from '~/engine/wars/wars'
import {
  M42_TRADE_ROUTE_BASE_INCOME_PER_XUN,
  M42_TRADE_ROUTE_MAX_PER_REALM,
} from '~/content/m2/balance'
import type { Realm, Site, TradeRoute, WarState, World } from '~/shared/types'

function makeRealm(overrides: Partial<Realm> = {}): Realm {
  return {
    id: 'realm_qin',
    displayName: 'Qin',
    fullTitle: 'Qin',
    color: '#ff0000',
    capital: 'site_qin',
    initialSites: [],
    initialArmies: [],
    economy: { treasury: 1000, foodStores: 0, taxRate: 10 },
    traits: [],
    politicalSystem: 'enfeoffment',
    ...overrides,
  }
}

function makeSite(overrides: Partial<Site> = {}): Site {
  return {
    id: 'site_qin',
    name: 'Site',
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
    baseIncomePerXun: M42_TRADE_ROUTE_BASE_INCOME_PER_XUN,
    status: 'active',
    ...overrides,
  }
}

function makeWarState(): WarState {
  return {
    casusBelli: null,
    declaredAt: { yearBC: 260, season: 'spring', month: 1, xun: 'shang' },
    occupiedSites: new Map(),
    peaceProposalId: null,
  }
}

function setupTwoAIRealmsWithPlayerZhao(overrides: Partial<World> = {}): World {
  const qinRealm = makeRealm({ id: 'realm_qin' })
  const qiRealm = makeRealm({ id: 'realm_qi', capital: 'site_qi' })
  const qinSite = makeSite({ id: 'site_qin', ownerId: 'realm_qin' })
  const qiSite = makeSite({ id: 'site_qi', ownerId: 'realm_qi' })

  return makeEmptyWorld({
    realms: new Map([
      ['realm_qin', qinRealm],
      ['realm_qi', qiRealm],
    ]),
    sites: new Map([
      ['site_qin', qinSite],
      ['site_qi', qiSite],
    ]),
    playerRealmId: 'realm_zhao',
    ...overrides,
  })
}

describe('proposeNewTradeRoutes: positive path', () => {
  it('AI realm creates route with friendly neighbor', () => {
    const world = setupTwoAIRealmsWithPlayerZhao()
    const result = proposeNewTradeRoutes(world)

    expect(result.tradeRoutes.size).toBeGreaterThanOrEqual(1)
    const routes = [...result.tradeRoutes.values()]
    const involvesQin = routes.some(
      r => r.fromRealmId === 'realm_qin' || r.toRealmId === 'realm_qin',
    )
    const involvesQi = routes.some(
      r => r.fromRealmId === 'realm_qi' || r.toRealmId === 'realm_qi',
    )
    expect(involvesQin).toBe(true)
    expect(involvesQi).toBe(true)
    const first = routes[0]!
    expect(first.status).toBe('active')
    expect(first.baseIncomePerXun).toBe(M42_TRADE_ROUTE_BASE_INCOME_PER_XUN)
    expect(first.establishedAtTick).toBe(world.tick)
  })
})

describe('proposeNewTradeRoutes: skip player', () => {
  it('does not initiate routes for player realm', () => {
    const qinRealm = makeRealm({ id: 'realm_qin' })
    const qiRealm = makeRealm({ id: 'realm_qi', capital: 'site_qi' })
    const qinSite = makeSite({ id: 'site_qin', ownerId: 'realm_qin' })
    const qiSite = makeSite({ id: 'site_qi', ownerId: 'realm_qi' })

    const world = makeEmptyWorld({
      realms: new Map([
        ['realm_qin', qinRealm],
        ['realm_qi', qiRealm],
      ]),
      sites: new Map([
        ['site_qin', qinSite],
        ['site_qi', qiSite],
      ]),
      playerRealmId: 'realm_qin',
    })

    const result = proposeNewTradeRoutes(world)
    const routes = [...result.tradeRoutes.values()]
    const initiatedByPlayer = routes.some(r => r.fromRealmId === 'realm_qin')
    expect(initiatedByPlayer).toBe(false)
  })
})

describe('proposeNewTradeRoutes: war blocks routes', () => {
  it("AI realm doesn't create route with enemy (at war)", () => {
    const world = setupTwoAIRealmsWithPlayerZhao({
      wars: new Map([[warKey('realm_qin', 'realm_qi'), makeWarState()]]),
    })
    const result = proposeNewTradeRoutes(world)
    expect(result.tradeRoutes.size).toBe(0)
  })
})

describe('proposeNewTradeRoutes: cap enforcement', () => {
  it("AI realm doesn't exceed M42_TRADE_ROUTE_MAX_PER_REALM", () => {
    const realms = new Map<string, Realm>()
    const sites = new Map<string, Site>()
    const tradeRoutes = new Map<string, TradeRoute>()

    realms.set(
      'realm_qin',
      makeRealm({ id: 'realm_qin', capital: 'site_qin' }),
    )
    sites.set('site_qin', makeSite({ id: 'site_qin', ownerId: 'realm_qin' }))

    for (let i = 0; i < M42_TRADE_ROUTE_MAX_PER_REALM; i++) {
      const id = `realm_p${i.toString().padStart(2, '0')}`
      const siteId = `site_p${i.toString().padStart(2, '0')}`
      realms.set(id, makeRealm({ id, capital: siteId }))
      sites.set(siteId, makeSite({ id: siteId, ownerId: id }))
      tradeRoutes.set(`route_qin_${id}`, makeRoute({
        id: `route_qin_${id}`,
        fromSiteId: 'site_qin',
        toSiteId: siteId,
        fromRealmId: 'realm_qin',
        toRealmId: id,
      }))
    }

    const partnerId = 'realm_z_extra'
    const partnerSiteId = 'site_z_extra'
    realms.set(partnerId, makeRealm({ id: partnerId, capital: partnerSiteId }))
    sites.set(partnerSiteId, makeSite({ id: partnerSiteId, ownerId: partnerId }))

    const world = makeEmptyWorld({
      realms,
      sites,
      tradeRoutes,
      playerRealmId: 'realm_player_only',
    })

    const result = proposeNewTradeRoutes(world)

    const qinRoutes = [...result.tradeRoutes.values()].filter(
      r =>
        r.status === 'active' &&
        (r.fromRealmId === 'realm_qin' || r.toRealmId === 'realm_qin'),
    )
    expect(qinRoutes.length).toBeLessThanOrEqual(M42_TRADE_ROUTE_MAX_PER_REALM)
  })
})

describe('proposeNewTradeRoutes: no duplicates', () => {
  it("AI realm doesn't create duplicate route (already has active route)", () => {
    const existing = makeRoute({
      id: 'existing_route',
      fromRealmId: 'realm_qin',
      toRealmId: 'realm_qi',
    })
    const world = setupTwoAIRealmsWithPlayerZhao({
      tradeRoutes: new Map([['existing_route', existing]]),
    })
    const result = proposeNewTradeRoutes(world)

    const qinQiActive = [...result.tradeRoutes.values()].filter(
      r =>
        r.status === 'active' &&
        ((r.fromRealmId === 'realm_qin' && r.toRealmId === 'realm_qi') ||
          (r.fromRealmId === 'realm_qi' && r.toRealmId === 'realm_qin')),
    )
    expect(qinQiActive.length).toBe(1)
  })
})

describe('proposeNewTradeRoutes: determinism', () => {
  it('same world → same routes created', () => {
    const world = setupTwoAIRealmsWithPlayerZhao()
    const result1 = proposeNewTradeRoutes(world)
    const result2 = proposeNewTradeRoutes(world)

    const ids1 = [...result1.tradeRoutes.keys()].sort()
    const ids2 = [...result2.tradeRoutes.keys()].sort()
    expect(ids1).toEqual(ids2)

    for (const id of ids1) {
      expect(result1.tradeRoutes.get(id)).toEqual(result2.tradeRoutes.get(id))
    }
  })
})

describe('proposeNewTradeRoutes: edge cases', () => {
  it('returns unchanged world when no AI realms exist', () => {
    const world = makeEmptyWorld({
      realms: new Map([['realm_qin', makeRealm({ id: 'realm_qin' })]]),
      sites: new Map([['site_qin', makeSite({ id: 'site_qin', ownerId: 'realm_qin' })]]),
      playerRealmId: 'realm_qin',
    })
    const result = proposeNewTradeRoutes(world)
    expect(result.tradeRoutes.size).toBe(0)
  })

  it('skips realm with no owned sites', () => {
    const qinRealm = makeRealm({ id: 'realm_qin' })
    const qiRealmWithoutSites = makeRealm({ id: 'realm_qi', capital: 'site_qi' })
    const qinSite = makeSite({ id: 'site_qin', ownerId: 'realm_qin' })

    const world = makeEmptyWorld({
      realms: new Map([
        ['realm_qin', qinRealm],
        ['realm_qi', qiRealmWithoutSites],
      ]),
      sites: new Map([['site_qin', qinSite]]),
      playerRealmId: 'realm_zhao',
    })

    const result = proposeNewTradeRoutes(world)
    expect(result.tradeRoutes.size).toBe(0)
  })
})
