import { describe, expect, it } from 'vitest'

import { applyEventEffect } from '../event-chain-engine'
import { relationKey } from '~/engine/systems/diplomacy/diplomacy-core'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import type {
  Academy,
  DiplomaticRelation,
  Realm,
  Site,
  World,
  ZhouInvestitureState,
} from '~/shared/types'

function makeRealm(overrides: Partial<Realm> = {}): Realm {
  return {
    id: 'realm_qin',
    displayName: 'Qin',
    fullTitle: 'Qin',
    color: '#ff0000',
    capital: 'site_qin_capital',
    initialSites: [],
    initialArmies: [],
    aiPersonality: 'cautious',
    economy: { treasury: 1000, foodStores: 500, taxRate: 10 },
    traits: [],
    politicalSystem: 'enfeoffment',
    prestige: 40,
    ideologyLean: { fa: 30, ru: 20, dao: 10, mo: 5, zonghen: 5, bing: 30 },
    warVictoriesThisYear: 0,
    ...overrides,
  }
}

function makeSite(overrides: Partial<Site> = {}): Site {
  return {
    id: 'site_01',
    name: 'Site 01',
    position: [0, 0],
    boundary: [],
    ownerId: 'realm_qin',
    polygon: [],
    adjacency: [],
    economy: { population: 1000, households: 250, taxBase: 1000, foodProduction: 1000 },
    cultural: 'chinese_qin',
    culturalIdentityStrength: 70,
    lastConquestTick: null,
    lowIdentitySinceTick: null,
    ...overrides,
  }
}

function worldWithRealm(overrides: Partial<World> = {}): World {
  return makeEmptyWorld({
    realms: new Map([['realm_qin', makeRealm()]]),
    ...overrides,
  })
}

describe('applyEventEffect: realm.prestige.delta', () => {
  it('increases realm prestige clamped to 100', () => {
    const world = worldWithRealm({ realms: new Map([['realm_qin', makeRealm({ prestige: 90 })]]) })
    const next = applyEventEffect(world, { type: 'realm.prestige.delta', realmId: 'realm_qin', delta: 50 })
    expect(next.realms.get('realm_qin')?.prestige).toBe(100)
  })

  it('decreases realm prestige clamped to 0', () => {
    const world = worldWithRealm({ realms: new Map([['realm_qin', makeRealm({ prestige: 10 })]]) })
    const next = applyEventEffect(world, { type: 'realm.prestige.delta', realmId: 'realm_qin', delta: -50 })
    expect(next.realms.get('realm_qin')?.prestige).toBe(0)
  })

  it('returns unchanged world when realm not found', () => {
    const world = worldWithRealm()
    const next = applyEventEffect(world, { type: 'realm.prestige.delta', realmId: 'nonexistent', delta: 10 })
    expect(next).toBe(world)
  })
})

describe('applyEventEffect: realm.ideology.delta', () => {
  it('increases ideology lean clamped to 100', () => {
    const world = worldWithRealm()
    const next = applyEventEffect(world, { type: 'realm.ideology.delta', realmId: 'realm_qin', ideology: 'fa', delta: 200 })
    expect(next.realms.get('realm_qin')?.ideologyLean?.fa).toBe(100)
  })

  it('decreases ideology lean clamped to 0', () => {
    const world = worldWithRealm()
    const next = applyEventEffect(world, { type: 'realm.ideology.delta', realmId: 'realm_qin', ideology: 'ru', delta: -100 })
    expect(next.realms.get('realm_qin')?.ideologyLean?.ru).toBe(0)
  })

  it('preserves other ideology values when only one is changed', () => {
    const world = worldWithRealm()
    const next = applyEventEffect(world, { type: 'realm.ideology.delta', realmId: 'realm_qin', ideology: 'fa', delta: 5 })
    expect(next.realms.get('realm_qin')?.ideologyLean?.ru).toBe(20)
    expect(next.realms.get('realm_qin')?.ideologyLean?.bing).toBe(30)
  })
})

describe('applyEventEffect: realm.relation.delta', () => {
  it('creates a new relation when none exists', () => {
    const realms = new Map([
      ['realm_qin', makeRealm({ id: 'realm_qin' })],
      ['realm_zhao', makeRealm({ id: 'realm_zhao' })],
    ])
    const world = makeEmptyWorld({ realms })
    const next = applyEventEffect(world, {
      type: 'realm.relation.delta',
      realmId: 'realm_qin',
      targetRealmId: 'realm_zhao',
      delta: 25,
    })
    const key = relationKey('realm_qin', 'realm_zhao')
    expect(next.relations.get(key)?.attitude).toBe(25)
  })

  it('updates existing relation attitude clamped within [-100, 100]', () => {
    const realms = new Map([
      ['realm_qin', makeRealm({ id: 'realm_qin' })],
      ['realm_zhao', makeRealm({ id: 'realm_zhao' })],
    ])
    const key = relationKey('realm_qin', 'realm_zhao')
    const existing: DiplomaticRelation = {
      key,
      realmAId: 'realm_qin',
      realmBId: 'realm_zhao',
      attitude: 80,
      trust: 10,
      updatedAt: { yearBC: 260, season: 'spring', month: 1, xun: 'shang' },
    }
    const world = makeEmptyWorld({ realms, relations: new Map([[key, existing]]) })
    const next = applyEventEffect(world, {
      type: 'realm.relation.delta',
      realmId: 'realm_qin',
      targetRealmId: 'realm_zhao',
      delta: 50,
    })
    expect(next.relations.get(key)?.attitude).toBe(100)
    expect(next.relations.get(key)?.trust).toBe(10)
  })

  it('returns unchanged world when realmId equals targetRealmId', () => {
    const world = worldWithRealm()
    const next = applyEventEffect(world, {
      type: 'realm.relation.delta',
      realmId: 'realm_qin',
      targetRealmId: 'realm_qin',
      delta: 10,
    })
    expect(next).toBe(world)
  })
})

describe('applyEventEffect: site.culturalIdentity.delta', () => {
  it('increases identity strength clamped to 100', () => {
    const world = worldWithRealm({ sites: new Map([['site_01', makeSite({ culturalIdentityStrength: 90 })]]) })
    const next = applyEventEffect(world, { type: 'site.culturalIdentity.delta', siteId: 'site_01', delta: 50 })
    expect(next.sites.get('site_01')?.culturalIdentityStrength).toBe(100)
  })

  it('decreases identity strength clamped to 0', () => {
    const world = worldWithRealm({ sites: new Map([['site_01', makeSite({ culturalIdentityStrength: 10 })]]) })
    const next = applyEventEffect(world, { type: 'site.culturalIdentity.delta', siteId: 'site_01', delta: -50 })
    expect(next.sites.get('site_01')?.culturalIdentityStrength).toBe(0)
  })

  it('returns unchanged world when site not found', () => {
    const world = worldWithRealm()
    const next = applyEventEffect(world, { type: 'site.culturalIdentity.delta', siteId: 'nonexistent', delta: 10 })
    expect(next).toBe(world)
  })
})

describe('applyEventEffect: site.cultural.set', () => {
  it('replaces site cultural tag', () => {
    const world = worldWithRealm({ sites: new Map([['site_01', makeSite({ cultural: 'chinese_qin' })]]) })
    const next = applyEventEffect(world, { type: 'site.cultural.set', siteId: 'site_01', tag: 'chinese_chu' })
    expect(next.sites.get('site_01')?.cultural).toBe('chinese_chu')
  })

  it('returns unchanged world when site not found', () => {
    const world = worldWithRealm()
    const next = applyEventEffect(world, { type: 'site.cultural.set', siteId: 'nonexistent', tag: 'chinese_chu' })
    expect(next).toBe(world)
  })
})

describe('applyEventEffect: academy.create', () => {
  it('creates a new academy with active status', () => {
    const world = worldWithRealm({ sites: new Map([['site_01', makeSite()]]) })
    const next = applyEventEffect(world, {
      type: 'academy.create',
      academyId: 'academy_jixia',
      hostRealmId: 'realm_qin',
      hostSiteId: 'site_01',
      primaryIdeology: 'fa',
    })
    const academy = next.academies.get('academy_jixia')
    expect(academy).toBeDefined()
    expect(academy?.status).toBe('active')
    expect(academy?.primaryIdeology).toBe('fa')
    expect(academy?.hostRealmId).toBe('realm_qin')
    expect(academy?.hostSiteId).toBe('site_01')
    expect(academy?.level).toBe(1)
  })

  it('returns unchanged world when host realm not found', () => {
    const world = worldWithRealm({ sites: new Map([['site_01', makeSite()]]) })
    const next = applyEventEffect(world, {
      type: 'academy.create',
      academyId: 'academy_x',
      hostRealmId: 'nonexistent',
      hostSiteId: 'site_01',
      primaryIdeology: 'ru',
    })
    expect(next).toBe(world)
  })

  it('returns unchanged world when academy id already exists', () => {
    const academy: Academy = {
      id: 'academy_jixia',
      hostRealmId: 'realm_qin',
      hostSiteId: 'site_01',
      primaryIdeology: 'ru',
      secondaryIdeology: null,
      founded: 300,
      level: 1,
      status: 'active',
    }
    const world = worldWithRealm({
      sites: new Map([['site_01', makeSite()]]),
      academies: new Map([['academy_jixia', academy]]),
    })
    const next = applyEventEffect(world, {
      type: 'academy.create',
      academyId: 'academy_jixia',
      hostRealmId: 'realm_qin',
      hostSiteId: 'site_01',
      primaryIdeology: 'fa',
    })
    expect(next).toBe(world)
  })
})

describe('applyEventEffect: academy.dormant', () => {
  it('marks an existing academy as dormant', () => {
    const academy: Academy = {
      id: 'academy_jixia',
      hostRealmId: 'realm_qin',
      hostSiteId: 'site_01',
      primaryIdeology: 'ru',
      secondaryIdeology: null,
      founded: 300,
      level: 1,
      status: 'active',
    }
    const world = worldWithRealm({ academies: new Map([['academy_jixia', academy]]) })
    const next = applyEventEffect(world, { type: 'academy.dormant', academyId: 'academy_jixia' })
    expect(next.academies.get('academy_jixia')?.status).toBe('dormant')
  })

  it('returns unchanged world when academy not found', () => {
    const world = worldWithRealm()
    const next = applyEventEffect(world, { type: 'academy.dormant', academyId: 'nonexistent' })
    expect(next).toBe(world)
  })
})

describe('applyEventEffect: zhouInvestiture.grant', () => {
  it('grants a fresh investiture to a realm with none', () => {
    const world = worldWithRealm()
    const next = applyEventEffect(world, {
      type: 'zhouInvestiture.grant',
      realmId: 'realm_qin',
      rank: 'duke',
    })
    const investiture = next.zhouInvestiture.get('realm_qin')
    expect(investiture?.rank).toBe('duke')
    expect(investiture?.recognizedTitle).toBe('duke')
    expect(investiture?.source).toBe('zhou')
  })

  it('upgrades existing investiture rank', () => {
    const existing: ZhouInvestitureState = {
      realmId: 'realm_qin',
      recognizedTitle: 'count',
      grantedAtTick: 100,
      expiresAtTick: null,
      source: 'zhou',
      rank: 'count',
    }
    const world = worldWithRealm({ zhouInvestiture: new Map([['realm_qin', existing]]) })
    const next = applyEventEffect(world, {
      type: 'zhouInvestiture.grant',
      realmId: 'realm_qin',
      rank: 'marquis',
    })
    expect(next.zhouInvestiture.get('realm_qin')?.rank).toBe('marquis')
    expect(next.zhouInvestiture.get('realm_qin')?.grantedAtTick).toBe(100)
  })

  it('returns unchanged world when realm not found', () => {
    const world = worldWithRealm()
    const next = applyEventEffect(world, {
      type: 'zhouInvestiture.grant',
      realmId: 'nonexistent',
      rank: 'duke',
    })
    expect(next).toBe(world)
  })
})
