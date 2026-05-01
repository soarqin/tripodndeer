import { describe, expect, it } from 'vitest'

import { economyPhase } from '../economy-phase'
import type {
  EdictKind,
  EdictState,
  GameDate,
  General,
  GovernorAssignment,
  Realm,
  RNGState,
  Site,
  World,
} from '~/shared/types'
import {
  M4_BASE_FOOD_PRODUCTION_PER_HOUSEHOLD,
  M4_BASIS_POINTS_DIVISOR,
  M4_EDICT_GRAIN_RESERVE_FOOD_PRODUCTION_BASIS_POINTS,
  M4_EDICT_GRAIN_RESERVE_TREASURY_COST,
  M4_HOUSEHOLD_DIVISOR,
  M5_GOVERNOR_FOOD_BONUS_PER_ZHENG,
  M5_GOVERNOR_TAX_BONUS_PER_ZHENG,
} from '~/content/m2/balance'

const shangDate: GameDate = { yearBC: 260, season: 'spring', month: 1, xun: 'shang' }
const zhongDate: GameDate = { ...shangDate, xun: 'zhong' }
const rng: RNGState = { seed: 42, counter: 7 }

function makeRealm(id: string, treasury: number, foodStores: number, taxRate: number): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#ffffff',
    capital: `${id}_capital`,
    initialSites: [],
    initialArmies: [],
    aiPersonality: 'cautious',
    economy: { treasury, foodStores, taxRate },
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

function makeEdict(id: string, realmId: string, kind: EdictKind, remainingMonths: number): EdictState {
  return {
    id,
    realmId,
    kind,
    startedAtTick: 12,
    durationMonths: Math.max(1, remainingMonths),
    remainingMonths,
    status: 'active',
  }
}

function makeGovernorAssignment(siteId: string, realmId: string, generalId: string, modifierKind: GovernorAssignment['modifierKind']): GovernorAssignment {
  return {
    siteId,
    realmId,
    generalId,
    assignedAtTick: 12,
    modifierKind,
  }
}

function makeGeneral(id: string, realmId: string, might: number, command: number, loyalty: number): General {
  return {
    id,
    realmId,
    name: id,
    might,
    command,
    loyalty,
    strategy: might,
    learning: command,
  }
}

function makeGovernorGeneral(id: string, realmId: string, zheng: number): General {
  return {
    id,
    realmId,
    name: id,
    might: 50,
    command: 50,
    loyalty: 50,
    attrs: { wu: 0, zheng, jiao: 0, mou: 0, xue: 0, po: 0 },
  }
}

function makeWorld(date: GameDate = shangDate): World {
  return {
    date,
    tick: 12,
    sites: new Map([
      ['site_zhao_b', makeSite('site_zhao_b', 'realm_zhao', 555)],
      ['site_qin_a', makeSite('site_qin_a', 'realm_qin', 50)],
      ['site_zhao_a', makeSite('site_zhao_a', 'realm_zhao', 1000)],
      ['site_unowned', makeSite('site_unowned', null, 1000)],
    ]),
    realms: new Map([
      ['realm_zhao', makeRealm('realm_zhao', 7, 500, 10)],
      ['realm_qin', makeRealm('realm_qin', 3, 3, 50)],
    ]),
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
    passes: new Map(),
    adjacencyEdges: new Map(),
    sieges: new Map(),
    edicts: new Map(),
    governorAssignments: new Map(),
    playerRealmId: 'realm_qin',
    rngState: rng,
    phases: [],
    pendingOrders: [],
  }
}

describe('economyPhase monthly settlement', () => {
  it('settles monthly tax, food, population, households, and tax base with exact integers', () => {
    const result = economyPhase(makeWorld(), rng)

    expect(result.world.realms.get('realm_zhao')?.economy).toEqual({
      treasury: 38,
      foodStores: 186,
      taxRate: 10,
    })
    expect(result.world.sites.get('site_zhao_a')?.economy).toEqual({
      population: 1010,
      households: 202,
      taxBase: 202,
      foodProduction: 404,
    })
    expect(result.world.sites.get('site_zhao_b')?.economy).toEqual({
      population: 560,
      households: 112,
      taxBase: 112,
      foodProduction: 224,
    })
    expect(result.world.sites.get('site_unowned')?.economy.population).toBe(1000)
  })

  it('does nothing outside shang xun and preserves original object identities', () => {
    const world = makeWorld(zhongDate)
    const result = economyPhase(world, rng)

    expect(result.world).toBe(world)
    expect(result.nextRng).toBe(rng)
    expect(result.events).toEqual([])
  })

  it('replays deterministically and leaves RNG unchanged by reference', () => {
    const world = makeWorld()

    const first = economyPhase(world, rng)
    const second = economyPhase(world, rng)

    expect(first.world).toEqual(second.world)
    expect(first.events).toEqual(second.events)
    expect(first.nextRng).toBe(rng)
    expect(second.nextRng).toBe(rng)
  })

  it('emits sorted settlement summary events with actual applied deltas', () => {
    const result = economyPhase(makeWorld(), rng)

    expect(result.events).toEqual([
      {
        type: 'economySettlement',
        payload: {
          realmId: 'realm_qin',
          treasuryDelta: 5,
          foodStoresDelta: -3,
          populationDelta: 0,
          householdsDelta: 0,
          settledAtTick: 12,
        },
      },
      {
        type: 'economySettlement',
        payload: {
          realmId: 'realm_zhao',
          treasuryDelta: 31,
          foodStoresDelta: -314,
          populationDelta: 15,
          householdsDelta: 3,
          settledAtTick: 12,
        },
      },
    ])
  })

  it('clamps persisted resource balances at zero', () => {
    const result = economyPhase(makeWorld(), rng)
    const qin = result.world.realms.get('realm_qin')

    expect(qin?.economy.treasury).toBe(8)
    expect(qin?.economy.foodStores).toBe(0)
    for (const realm of result.world.realms.values()) {
      expect(realm.economy.treasury).toBeGreaterThanOrEqual(0)
      expect(realm.economy.foodStores).toBeGreaterThanOrEqual(0)
    }
  })

})

describe('economyPhase edicts', () => {
  it('applies active tax relief once by reducing effective tax income and increasing population growth', () => {
    const world = makeWorld()
    const sites = new Map(world.sites)
    sites.set('site_qin_a', makeSite('site_qin_a', 'realm_qin', 10000))
    const edict = makeEdict('edict_qin_tax', 'realm_qin', 'edict_tax_relief', 2)
    const edicts = new Map([
      ['edict_qin_tax', edict],
    ])

    const result = economyPhase({ ...world, sites, edicts }, rng)

    expect(result.world.sites.get('site_qin_a')?.economy).toEqual({
      population: 10105,
      households: 2021,
      taxBase: 2021,
      foodProduction: 4042,
    })
    expect(result.world.realms.get('realm_qin')?.economy.treasury).toBe(760)
    expect(result.world.edicts.get('edict_qin_tax')).toEqual({
      ...edict,
      remainingMonths: 1,
      status: 'active',
    })
  })

  it('applies grain reserve food production and treasury cost while active', () => {
    const world = makeWorld()
    const sites = new Map(world.sites)
    sites.set('site_qin_a', makeSite('site_qin_a', 'realm_qin', 10000))
    const realms = new Map(world.realms)
    realms.set('realm_qin', makeRealm('realm_qin', 3, 10000, 50))
    const edicts = new Map([
      ['edict_qin_grain', makeEdict('edict_qin_grain', 'realm_qin', 'edict_grain_reserve', 2)],
    ])

    const result = economyPhase({ ...world, realms, sites, edicts }, rng)
    const baseFoodProduction = 2020 * M4_BASE_FOOD_PRODUCTION_PER_HOUSEHOLD
    const boostedFoodProduction = Math.floor(
      baseFoodProduction
      * (M4_BASIS_POINTS_DIVISOR + M4_EDICT_GRAIN_RESERVE_FOOD_PRODUCTION_BASIS_POINTS)
      / M4_BASIS_POINTS_DIVISOR,
    )

    expect(result.world.sites.get('site_qin_a')?.economy.foodProduction).toBe(boostedFoodProduction)
    expect(result.world.realms.get('realm_qin')?.economy).toEqual({
      treasury: 3 + 1010 - M4_EDICT_GRAIN_RESERVE_TREASURY_COST,
      foodStores: 10000 + boostedFoodProduction - 6060,
      taxRate: 50,
    })
  })

  it('expires a one-month edict after it affects exactly one monthly settlement', () => {
    const world = makeWorld()
    const sites = new Map(world.sites)
    sites.set('site_qin_a', makeSite('site_qin_a', 'realm_qin', 10000))
    const edicts = new Map([
      ['edict_qin_tax', makeEdict('edict_qin_tax', 'realm_qin', 'edict_tax_relief', 1)],
    ])

    const first = economyPhase({ ...world, sites, edicts }, rng)
    const second = economyPhase(first.world, rng)

    expect(first.world.realms.get('realm_qin')?.economy.treasury).toBe(760)
    expect(first.world.edicts.get('edict_qin_tax')?.status).toBe('expired')
    expect(first.world.edicts.get('edict_qin_tax')?.remainingMonths).toBe(0)
    expect(second.world.realms.get('realm_qin')?.economy.treasury).toBe(1780)
  })

  it('ignores expired edicts on later settlements', () => {
    const world = makeWorld()
    const sites = new Map(world.sites)
    sites.set('site_qin_a', makeSite('site_qin_a', 'realm_qin', 10000))
    const realms = new Map(world.realms)
    realms.set('realm_qin', makeRealm('realm_qin', 3, 10000, 50))
    const edict = makeEdict('edict_qin_grain', 'realm_qin', 'edict_grain_reserve', 0)
    const edicts = new Map([
      ['edict_qin_grain', { ...edict, status: 'expired' as const }],
    ])

    const result = economyPhase({ ...world, realms, sites, edicts }, rng)

    expect(result.world.sites.get('site_qin_a')?.economy.foodProduction).toBe(4040)
    expect(result.world.realms.get('realm_qin')?.economy).toEqual({
      treasury: 1013,
      foodStores: 7980,
      taxRate: 50,
    })
    expect(result.world.edicts.get('edict_qin_grain')?.status).toBe('expired')
  })

  it('isolates active edicts to their owning realm', () => {
    const world = makeWorld()
    const sites = new Map(world.sites)
    sites.set('site_qin_a', makeSite('site_qin_a', 'realm_qin', 10000))
    const edicts = new Map([
      ['edict_zhao_tax', makeEdict('edict_zhao_tax', 'realm_zhao', 'edict_tax_relief', 2)],
    ])

    const result = economyPhase({ ...world, sites, edicts }, rng)

    expect(result.world.realms.get('realm_qin')?.economy.treasury).toBe(1013)
    expect(result.world.realms.get('realm_zhao')?.economy.treasury).toBe(30)
    expect(result.world.edicts.get('edict_zhao_tax')?.remainingMonths).toBe(1)
  })

})

describe('economyPhase governors', () => {
  it('applies tax governor attrs.zheng-based modifier to owned site tax base and settlement income', () => {
    const world = makeWorld()
    const sites = new Map(world.sites)
    sites.set('site_qin_a', makeSite('site_qin_a', 'realm_qin', 10000))
    const governorAssignments = new Map([
      ['site_qin_a', makeGovernorAssignment('site_qin_a', 'realm_qin', 'general_qin', 'tax_efficiency')],
    ])
    const generals = new Map([
      ['general_qin', makeGovernorGeneral('general_qin', 'realm_qin', 10)],
    ])
    const taxBonus = Math.floor(M5_GOVERNOR_TAX_BONUS_PER_ZHENG * 10)

    const result = economyPhase({ ...world, sites, governorAssignments, generals }, rng)

    expect(result.world.sites.get('site_qin_a')?.economy).toEqual({
      population: 10100,
      households: 2020,
      taxBase: 2020 + taxBonus,
      foodProduction: 4040,
    })
    expect(result.world.realms.get('realm_qin')?.economy.treasury).toBe(1015)
  })

  it('applies food governor attrs.zheng-based modifier to owned site food production only', () => {
    const world = makeWorld()
    const sites = new Map(world.sites)
    sites.set('site_qin_a', makeSite('site_qin_a', 'realm_qin', 10000))
    const realms = new Map(world.realms)
    realms.set('realm_qin', makeRealm('realm_qin', 3, 10000, 50))
    const governorAssignments = new Map([
      ['site_qin_a', makeGovernorAssignment('site_qin_a', 'realm_qin', 'general_qin', 'food_efficiency')],
    ])
    const generals = new Map([
      ['general_qin', makeGovernorGeneral('general_qin', 'realm_qin', 10)],
    ])
    const foodBonus = Math.floor(M5_GOVERNOR_FOOD_BONUS_PER_ZHENG * 10)

    const result = economyPhase({ ...world, realms, sites, governorAssignments, generals }, rng)

    expect(result.world.sites.get('site_qin_a')?.economy).toEqual({
      population: 10100,
      households: 2020,
      taxBase: 2020,
      foodProduction: 4040 + foodBonus,
    })
    expect(result.world.realms.get('realm_qin')?.economy.foodStores).toBe(7985)
  })

  it('ignores governor assignments for enemy-owned and unowned sites', () => {
    const world = makeWorld()
    const governorAssignments = new Map([
      ['site_qin_a', makeGovernorAssignment('site_qin_a', 'realm_zhao', 'general_zhao', 'tax_efficiency')],
      ['site_zhao_a', makeGovernorAssignment('site_zhao_a', 'realm_qin', 'general_qin', 'food_efficiency')],
      ['site_unowned', makeGovernorAssignment('site_unowned', 'realm_qin', 'general_qin', 'tax_efficiency')],
    ])

    const baseline = economyPhase(world, rng)
    const result = economyPhase({ ...world, governorAssignments }, rng)

    expect(result.world.realms.get('realm_qin')?.economy).toEqual(baseline.world.realms.get('realm_qin')?.economy)
    expect(result.world.realms.get('realm_zhao')?.economy).toEqual(baseline.world.realms.get('realm_zhao')?.economy)
    expect(result.world.sites.get('site_qin_a')?.economy).toEqual(baseline.world.sites.get('site_qin_a')?.economy)
    expect(result.world.sites.get('site_zhao_a')?.economy).toEqual(baseline.world.sites.get('site_zhao_a')?.economy)
    expect(result.world.sites.get('site_unowned')?.economy).toEqual(world.sites.get('site_unowned')?.economy)
  })

  it('governor output depends on attrs.zheng only, not on might/command/loyalty', () => {
    const world = makeWorld()
    const sites = new Map(world.sites)
    sites.set('site_qin_a', makeSite('site_qin_a', 'realm_qin', 10000))
    const governorAssignments = new Map([
      ['site_qin_a', makeGovernorAssignment('site_qin_a', 'realm_qin', 'general_qin', 'tax_efficiency')],
    ])
    const lowOtherStatsGenerals = new Map([
      ['general_qin', { ...makeGeneral('general_qin', 'realm_qin', 1, 2, 3), attrs: { wu: 0, zheng: 10, jiao: 0, mou: 0, xue: 0, po: 0 } }],
    ])
    const highOtherStatsGenerals = new Map([
      ['general_qin', { ...makeGeneral('general_qin', 'realm_qin', 99, 98, 97), attrs: { wu: 0, zheng: 10, jiao: 0, mou: 0, xue: 0, po: 0 } }],
    ])

    const lowStats = economyPhase({ ...world, sites, governorAssignments, generals: lowOtherStatsGenerals }, rng)
    const highStats = economyPhase({ ...world, sites, governorAssignments, generals: highOtherStatsGenerals }, rng)

    expect(lowStats.world.realms.get('realm_qin')?.economy).toEqual(highStats.world.realms.get('realm_qin')?.economy)
    expect(lowStats.world.sites.get('site_qin_a')?.economy).toEqual(highStats.world.sites.get('site_qin_a')?.economy)
    expect(lowStats.events).toEqual(highStats.events)
  })

  it('replays deterministically with multiple active governor-free and edict-active inputs and leaves RNG unchanged', () => {
    const world = makeWorld()
    const edicts = new Map([
      ['edict_zhao_grain', makeEdict('edict_zhao_grain', 'realm_zhao', 'edict_grain_reserve', 2)],
      ['edict_qin_tax', makeEdict('edict_qin_tax', 'realm_qin', 'edict_tax_relief', 2)],
    ])

    const first = economyPhase({ ...world, edicts }, rng)
    const second = economyPhase({ ...world, edicts }, rng)

    expect(first.world).toEqual(second.world)
    expect(first.events).toEqual(second.events)
    expect(first.nextRng).toBe(rng)
    expect(second.nextRng).toBe(rng)
  })
})
