/* eslint-disable max-lines-per-function */
import { describe, expect, it } from 'vitest'
import { applyEventEffect, isValidEffectType } from '../event-chain-engine'
import { makeTestWorld } from '~/engine/__tests__/world-test-fixtures'
import type { Effect } from '~/shared/schemas'
import type { Realm, Site, World } from '~/shared/types'

function makeRealm(id: string, traits: readonly string[] = [], politicalSystem: Realm['politicalSystem'] = 'enfeoffment'): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#dc2626',
    capital: 'site_1',
    initialSites: [],
    initialArmies: [],
    aiPersonality: 'cautious',
    economy: { treasury: 1000, foodStores: 5000, taxRate: 10 },
    traits,
    politicalSystem,
  }
}

function makeSite(id: string, ownerId: string | null = null): Site {
  return {
    id,
    name: `Site ${id}`,
    ownerId,
    position: [0, 0],
    boundary: [],
    terrainType: 'plains',
    polygon: [],
    adjacency: [],
    economy: { population: 10000, households: 1000, taxBase: 500, foodProduction: 1000 },
  }
}

function worldWith(overrides: Partial<World> = {}): World {
  return makeTestWorld(overrides)
}

describe('M4.2 effect types', () => {
  describe('site.population.delta', () => {
    it('reduces site population', () => {
      const world = worldWith()
      const sites = new Map(world.sites)
      sites.set('site_01', makeSite('site_01', 'realm_qin'))
      const worldWithSite = { ...world, sites }

      const result = applyEventEffect(worldWithSite, {
        type: 'site.population.delta',
        siteId: 'site_01',
        delta: -2000,
      } as Effect)

      expect(result.sites.get('site_01')?.economy.population).toBe(8000)
    })

    it('increases site population', () => {
      const world = worldWith()
      const sites = new Map(world.sites)
      sites.set('site_01', makeSite('site_01', 'realm_qin'))
      const worldWithSite = { ...world, sites }

      const result = applyEventEffect(worldWithSite, {
        type: 'site.population.delta',
        siteId: 'site_01',
        delta: 5000,
      } as Effect)

      expect(result.sites.get('site_01')?.economy.population).toBe(15000)
    })

    it('clamps population to 0 minimum', () => {
      const world = worldWith()
      const sites = new Map(world.sites)
      sites.set('site_01', makeSite('site_01', 'realm_qin'))
      const worldWithSite = { ...world, sites }

      const result = applyEventEffect(worldWithSite, {
        type: 'site.population.delta',
        siteId: 'site_01',
        delta: -99999,
      } as Effect)

      expect(result.sites.get('site_01')?.economy.population).toBe(0)
    })

    it('returns world unchanged if site does not exist', () => {
      const world = worldWith()
      const result = applyEventEffect(world, {
        type: 'site.population.delta',
        siteId: 'nonexistent',
        delta: -1000,
      } as Effect)

      expect(result).toBe(world)
    })

    it('isValidEffectType accepts site.population.delta', () => {
      expect(isValidEffectType('site.population.delta')).toBe(true)
    })
  })

  describe('realm.faction.delta', () => {
    it('increases faction influence', () => {
      const world = worldWith()
      const factionInfluences = new Map(world.factionInfluences)
      factionInfluences.set('realm_qin', {
        realmId: 'realm_qin',
        influences: new Map([
          ['military_meritocracy', 50],
          ['reformists', 50],
          ['conservatives', 50],
          ['royal_kin', 50],
          ['noble_clans', 50],
          ['foreign_clients', 50],
        ]),
      })
      const worldWithFaction = { ...world, factionInfluences }

      const result = applyEventEffect(worldWithFaction, {
        type: 'realm.faction.delta',
        realmId: 'realm_qin',
        faction: 'military_meritocracy',
        delta: 20,
      } as Effect)

      expect(result.factionInfluences.get('realm_qin')?.influences.get('military_meritocracy')).toBe(70)
    })

    it('decreases faction influence', () => {
      const world = worldWith()
      const factionInfluences = new Map(world.factionInfluences)
      factionInfluences.set('realm_qin', {
        realmId: 'realm_qin',
        influences: new Map([
          ['military_meritocracy', 50],
          ['reformists', 50],
          ['conservatives', 50],
          ['royal_kin', 50],
          ['noble_clans', 50],
          ['foreign_clients', 50],
        ]),
      })
      const worldWithFaction = { ...world, factionInfluences }

      const result = applyEventEffect(worldWithFaction, {
        type: 'realm.faction.delta',
        realmId: 'realm_qin',
        faction: 'military_meritocracy',
        delta: -20,
      } as Effect)

      expect(result.factionInfluences.get('realm_qin')?.influences.get('military_meritocracy')).toBe(30)
    })

    it('clamps faction influence to 100 maximum', () => {
      const world = worldWith()
      const factionInfluences = new Map(world.factionInfluences)
      factionInfluences.set('realm_qin', {
        realmId: 'realm_qin',
        influences: new Map([
          ['military_meritocracy', 95],
          ['reformists', 50],
          ['conservatives', 50],
          ['royal_kin', 50],
          ['noble_clans', 50],
          ['foreign_clients', 50],
        ]),
      })
      const worldWithFaction = { ...world, factionInfluences }

      const result = applyEventEffect(worldWithFaction, {
        type: 'realm.faction.delta',
        realmId: 'realm_qin',
        faction: 'military_meritocracy',
        delta: 50,
      } as Effect)

      expect(result.factionInfluences.get('realm_qin')?.influences.get('military_meritocracy')).toBe(100)
    })

    it('clamps faction influence to 0 minimum', () => {
      const world = worldWith()
      const factionInfluences = new Map(world.factionInfluences)
      factionInfluences.set('realm_qin', {
        realmId: 'realm_qin',
        influences: new Map([
          ['military_meritocracy', 10],
          ['reformists', 50],
          ['conservatives', 50],
          ['royal_kin', 50],
          ['noble_clans', 50],
          ['foreign_clients', 50],
        ]),
      })
      const worldWithFaction = { ...world, factionInfluences }

      const result = applyEventEffect(worldWithFaction, {
        type: 'realm.faction.delta',
        realmId: 'realm_qin',
        faction: 'military_meritocracy',
        delta: -50,
      } as Effect)

      expect(result.factionInfluences.get('realm_qin')?.influences.get('military_meritocracy')).toBe(0)
    })

    it('returns world unchanged if realm has no faction influences', () => {
      const world = worldWith()
      const result = applyEventEffect(world, {
        type: 'realm.faction.delta',
        realmId: 'realm_unknown',
        faction: 'military_meritocracy',
        delta: 10,
      } as Effect)

      expect(result).toBe(world)
    })

    it('isValidEffectType accepts realm.faction.delta', () => {
      expect(isValidEffectType('realm.faction.delta')).toBe(true)
    })
  })

  describe('realm.warWeariness.delta', () => {
    it('increases warWeariness', () => {
      const world = worldWith()
      const realms = new Map(world.realms)
      realms.set('realm_qin', {
        ...makeRealm('realm_qin'),
        stats: { manpowerPool: 1000, manpowerCap: 2000, warWeariness: 20 },
      })
      const worldWithRealm = { ...world, realms }

      const result = applyEventEffect(worldWithRealm, {
        type: 'realm.warWeariness.delta',
        realmId: 'realm_qin',
        delta: 10,
      } as Effect)

      expect(result.realms.get('realm_qin')?.stats?.warWeariness).toBe(30)
    })

    it('decreases warWeariness', () => {
      const world = worldWith()
      const realms = new Map(world.realms)
      realms.set('realm_qin', {
        ...makeRealm('realm_qin'),
        stats: { manpowerPool: 1000, manpowerCap: 2000, warWeariness: 50 },
      })
      const worldWithRealm = { ...world, realms }

      const result = applyEventEffect(worldWithRealm, {
        type: 'realm.warWeariness.delta',
        realmId: 'realm_qin',
        delta: -20,
      } as Effect)

      expect(result.realms.get('realm_qin')?.stats?.warWeariness).toBe(30)
    })

    it('clamps warWeariness to 100 maximum', () => {
      const world = worldWith()
      const realms = new Map(world.realms)
      realms.set('realm_qin', {
        ...makeRealm('realm_qin'),
        stats: { manpowerPool: 1000, manpowerCap: 2000, warWeariness: 95 },
      })
      const worldWithRealm = { ...world, realms }

      const result = applyEventEffect(worldWithRealm, {
        type: 'realm.warWeariness.delta',
        realmId: 'realm_qin',
        delta: 50,
      } as Effect)

      expect(result.realms.get('realm_qin')?.stats?.warWeariness).toBe(100)
    })

    it('clamps warWeariness to 0 minimum', () => {
      const world = worldWith()
      const realms = new Map(world.realms)
      realms.set('realm_qin', {
        ...makeRealm('realm_qin'),
        stats: { manpowerPool: 1000, manpowerCap: 2000, warWeariness: 10 },
      })
      const worldWithRealm = { ...world, realms }

      const result = applyEventEffect(worldWithRealm, {
        type: 'realm.warWeariness.delta',
        realmId: 'realm_qin',
        delta: -50,
      } as Effect)

      expect(result.realms.get('realm_qin')?.stats?.warWeariness).toBe(0)
    })

    it('initializes stats if undefined', () => {
      const world = worldWith()
      const realms = new Map(world.realms)
      realms.set('realm_qin', makeRealm('realm_qin'))
      const worldWithRealm = { ...world, realms }

      const result = applyEventEffect(worldWithRealm, {
        type: 'realm.warWeariness.delta',
        realmId: 'realm_qin',
        delta: 25,
      } as Effect)

      expect(result.realms.get('realm_qin')?.stats?.warWeariness).toBe(25)
    })

    it('returns world unchanged if realm does not exist', () => {
      const world = worldWith()
      const result = applyEventEffect(world, {
        type: 'realm.warWeariness.delta',
        realmId: 'realm_unknown',
        delta: 10,
      } as Effect)

      expect(result).toBe(world)
    })

    it('isValidEffectType accepts realm.warWeariness.delta', () => {
      expect(isValidEffectType('realm.warWeariness.delta')).toBe(true)
    })
  })

  describe('realm.foodStores.delta', () => {
    it('increases foodStores', () => {
      const world = worldWith()
      const realms = new Map(world.realms)
      realms.set('realm_qin', makeRealm('realm_qin'))
      const worldWithRealm = { ...world, realms }

      const result = applyEventEffect(worldWithRealm, {
        type: 'realm.foodStores.delta',
        realmId: 'realm_qin',
        delta: 2000,
      } as Effect)

      expect(result.realms.get('realm_qin')?.economy.foodStores).toBe(7000)
    })

    it('decreases foodStores', () => {
      const world = worldWith()
      const realms = new Map(world.realms)
      realms.set('realm_qin', makeRealm('realm_qin'))
      const worldWithRealm = { ...world, realms }

      const result = applyEventEffect(worldWithRealm, {
        type: 'realm.foodStores.delta',
        realmId: 'realm_qin',
        delta: -2000,
      } as Effect)

      expect(result.realms.get('realm_qin')?.economy.foodStores).toBe(3000)
    })

    it('clamps foodStores to 0 minimum', () => {
      const world = worldWith()
      const realms = new Map(world.realms)
      realms.set('realm_qin', makeRealm('realm_qin'))
      const worldWithRealm = { ...world, realms }

      const result = applyEventEffect(worldWithRealm, {
        type: 'realm.foodStores.delta',
        realmId: 'realm_qin',
        delta: -99999,
      } as Effect)

      expect(result.realms.get('realm_qin')?.economy.foodStores).toBe(0)
    })

    it('returns world unchanged if realm does not exist', () => {
      const world = worldWith()
      const result = applyEventEffect(world, {
        type: 'realm.foodStores.delta',
        realmId: 'realm_unknown',
        delta: 1000,
      } as Effect)

      expect(result).toBe(world)
    })

    it('isValidEffectType accepts realm.foodStores.delta', () => {
      expect(isValidEffectType('realm.foodStores.delta')).toBe(true)
    })
  })

  describe('backward compatibility', () => {
    it('existing realm.treasury effect still works', () => {
      const world = worldWith()
      const realms = new Map(world.realms)
      realms.set('realm_qin', makeRealm('realm_qin'))
      const worldWithRealm = { ...world, realms }

      const result = applyEventEffect(worldWithRealm, {
        type: 'realm.treasury',
        realmId: 'realm_qin',
        delta: 500,
      } as Effect)

      expect(result.realms.get('realm_qin')?.economy.treasury).toBe(1500)
    })

    it('existing character.create effect still works', () => {
      const world = worldWith()

      const result = applyEventEffect(world, {
        type: 'character.create',
        generalId: 'gen_001',
        realmId: 'realm_qin',
        name: 'Test General',
      } as Effect)

      expect(result.generals.get('gen_001')).toBeDefined()
      expect(result.generals.get('gen_001')?.name).toBe('Test General')
    })
  })
})
