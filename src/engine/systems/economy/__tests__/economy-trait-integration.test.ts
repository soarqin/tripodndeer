import { describe, expect, it } from 'vitest'

import { economyPhase } from '../economy-phase'
import type {
  GameDate,
  Realm,
  RNGState,
  Site,
  World,
} from '~/shared/types'
import {
  M4_BASE_FOOD_PRODUCTION_PER_HOUSEHOLD,
  M4_HOUSEHOLD_DIVISOR,
} from '~/content/m2/balance'

const shangDate: GameDate = { yearBC: 260, season: 'spring', month: 1, xun: 'shang' }
const rng: RNGState = { seed: 42, counter: 7 }

function makeRealm(id: string, traits: readonly string[] = [], treasury = 0, foodStores = 0): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#ffffff',
    capital: `${id}_capital`,
    initialSites: [],
    initialArmies: [],
    aiPersonality: 'cautious',
    economy: { treasury, foodStores, taxRate: 10 },
    traits,
    politicalSystem: 'enfeoffment',
  }
}

function makeSite(id: string, ownerId: string | null, population: number): Site {
  const households = Math.floor(population / M4_HOUSEHOLD_DIVISOR)
  return {
    id,
    name: id,
    position: [0, 0],
    boundary: [],
    ownerId,
    polygon: [],
    adjacency: [],
    economy: {
      population,
      households,
      taxBase: households,
      foodProduction: households * M4_BASE_FOOD_PRODUCTION_PER_HOUSEHOLD,
    },
  }
}

function makeWorld(realm: Realm, sites: readonly Site[]): World {
  return {
    date: shangDate,
    tick: 0,
    sites: new Map(sites.map((s) => [s.id, s])),
    realms: new Map([[realm.id, realm]]),
    armies: new Map(),
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
    rulers: new Map(),
    eventChainStates: new Map(),
    reformStates: new Map(),
    disasterStates: new Map(),
    tradeRoutes: new Map(),
    factionInfluences: new Map(),
    passes: new Map(),
    adjacencyEdges: new Map(),
    sieges: new Map(),
    edicts: new Map(),
    governorAssignments: new Map(),
    playerRealmId: realm.id,
    rngState: rng,
    phases: [],
    pendingOrders: [],
  }
}

describe('economy trait integration', () => {
  it('shang_yang_reform_done trait increases tax income (+30%)', () => {
    const sites = [makeSite('site_qin_a', 'realm_qin', 10000)]
    const baseRealm = makeRealm('realm_qin', [])
    const reformRealm = makeRealm('realm_qin', ['shang_yang_reform_done'])

    const baseResult = economyPhase(makeWorld(baseRealm, sites), rng)
    const reformResult = economyPhase(makeWorld(reformRealm, sites), rng)

    const baseTreasury = baseResult.world.realms.get('realm_qin')!.economy.treasury
    const reformTreasury = reformResult.world.realms.get('realm_qin')!.economy.treasury

    expect(reformTreasury).toBeGreaterThan(baseTreasury)
    expect(reformTreasury - baseTreasury).toBe(60)
  })

  it('reform_failed_scar trait decreases tax income (-10%)', () => {
    const sites = [makeSite('site_qin_a', 'realm_qin', 10000)]
    const baseRealm = makeRealm('realm_qin', [])
    const scarRealm = makeRealm('realm_qin', ['reform_failed_scar'])

    const baseResult = economyPhase(makeWorld(baseRealm, sites), rng)
    const scarResult = economyPhase(makeWorld(scarRealm, sites), rng)

    const baseTreasury = baseResult.world.realms.get('realm_qin')!.economy.treasury
    const scarTreasury = scarResult.world.realms.get('realm_qin')!.economy.treasury

    expect(scarTreasury).toBeLessThan(baseTreasury)
    expect(baseTreasury - scarTreasury).toBe(21)
  })

  it('realm with no traits produces same result as baseline (regression)', () => {
    const sites = [makeSite('site_qin_a', 'realm_qin', 10000)]
    const realm = makeRealm('realm_qin', [])

    const result = economyPhase(makeWorld(realm, sites), rng)

    expect(result.world.realms.get('realm_qin')!.economy.treasury).toBe(202)
  })

  it('multiple traits accumulate correctly', () => {
    const sites = [makeSite('site_qin_a', 'realm_qin', 10000)]
    const realm = makeRealm('realm_qin', ['shang_yang_reform_done', 'han_shen_buhai_done'])

    const result = economyPhase(makeWorld(realm, sites), rng)

    expect(result.world.realms.get('realm_qin')!.economy.treasury).toBe(292)
  })

  it('li_kui_reform_done trait increases food production (+15%)', () => {
    const sites = [makeSite('site_qin_a', 'realm_qin', 10000)]
    const baseRealm = makeRealm('realm_qin', [], 0, 100000)
    const reformRealm = makeRealm('realm_qin', ['li_kui_reform_done'], 0, 100000)

    const baseResult = economyPhase(makeWorld(baseRealm, sites), rng)
    const reformResult = economyPhase(makeWorld(reformRealm, sites), rng)

    const baseFood = baseResult.world.realms.get('realm_qin')!.economy.foodStores
    const reformFood = reformResult.world.realms.get('realm_qin')!.economy.foodStores

    expect(reformFood).toBeGreaterThan(baseFood)
  })
})
