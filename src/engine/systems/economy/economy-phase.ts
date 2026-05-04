import type { EconomySettlementEvent, GameEvent, Realm, RNGState, Site, World } from '~/shared/types'
import {
  M4_BASE_FOOD_PRODUCTION_PER_HOUSEHOLD,
  M4_BASE_TAX_PER_HOUSEHOLD,
  M4_BASIS_POINTS_DIVISOR,
  M4_FOOD_CONSUMPTION_PER_HOUSEHOLD,
  M4_HOUSEHOLD_DIVISOR,
  M4_POPULATION_GROWTH_BASIS_POINTS,
  M4_TAX_RATE_DIVISOR,
} from '~/content/m2/balance'
import {
  getEdictSettlementModifiers,
  settleRealmEdictsAfterMonthlySettlement,
  type EdictSettlementModifiers,
} from '~/engine/systems/statecraft/edicts'
import {
  getGovernorSettlementModifiers,
  type GovernorSettlementModifiers,
} from '~/engine/systems/statecraft/governors'
import { settlePeaceTributes } from '~/engine/systems/peace'
import { getTraitModifiers } from '~/content/m4_1/trait-effects'
import { applyAIEconomyDecision } from '~/engine/systems/ai/economy-decision'

export function economyPhase(
  world: World,
  rng: RNGState,
): { world: World; nextRng: RNGState; events: readonly GameEvent[] } {
  if (world.date.xun !== 'shang') {
    return { world, nextRng: rng, events: [] }
  }

  let workingWorld = world
  const sites = new Map(world.sites)
  let edicts = world.edicts

  for (const realm of sortedRealms(world.realms)) {
    if (realm.id !== world.playerRealmId) {
      workingWorld = applyAIEconomyDecision(workingWorld, realm.id)
    }

    const currentRealm = workingWorld.realms.get(realm.id) ?? realm
    const edictModifiers = getEdictSettlementModifiers(edicts, realm.id)
    const settlement = settleRealm(
      currentRealm,
      sortedSitesForRealm(world.sites, realm.id),
      sites,
      edictModifiers,
      world.governorAssignments,
      world.generals,
    )
    const realms = new Map(workingWorld.realms)
    realms.set(realm.id, settlement.realm)
    workingWorld = { ...workingWorld, realms }
    edicts = settleRealmEdictsAfterMonthlySettlement(edicts, realm.id)
  }

  const settledWorld = settlePeaceTributes({ ...workingWorld, sites, edicts })
  const events = buildSettlementEvents(world, settledWorld)

  return { world: settledWorld, nextRng: rng, events }
}

function settleRealm(
  realm: Realm,
  realmSites: readonly Site[],
  sites: Map<string, Site>,
  edictModifiers: EdictSettlementModifiers,
  governorAssignments: World['governorAssignments'],
  generals: World['generals'],
): { realm: Realm; treasuryDelta: number; foodStoresDelta: number } {
  let taxIncome = 0
  let foodProduction = 0
  let foodConsumption = 0

  for (const site of realmSites) {
    const governorModifiers = getGovernorSettlementModifiers(governorAssignments, generals, site)
    const nextSite = growSiteEconomy(site, edictModifiers, governorModifiers)
    sites.set(site.id, nextSite)
    taxIncome += Math.floor(
      nextSite.economy.taxBase * M4_BASE_TAX_PER_HOUSEHOLD * realm.economy.taxRate / M4_TAX_RATE_DIVISOR,
    )
    foodProduction += nextSite.economy.foodProduction
    foodConsumption += nextSite.economy.households * M4_FOOD_CONSUMPTION_PER_HOUSEHOLD
  }

  const traitModifiers = getTraitModifiers(realm)
  const effectiveTaxIncome = applyBasisPointsDelta(
    taxIncome,
    edictModifiers.taxIncomeBasisPoints + traitModifiers.taxIncomeMultiplierBp,
  )
  const effectiveFoodProduction = applyBasisPointsDelta(
    foodProduction,
    traitModifiers.foodProductionMultiplierBp,
  )
  const nextTreasury = Math.max(0, realm.economy.treasury + effectiveTaxIncome - edictModifiers.treasuryCost)
  const nextFoodStores = Math.max(0, realm.economy.foodStores + effectiveFoodProduction - foodConsumption)

  return {
    realm: {
      ...realm,
      economy: {
        ...realm.economy,
        treasury: nextTreasury,
        foodStores: nextFoodStores,
      },
    },
    treasuryDelta: nextTreasury - realm.economy.treasury,
    foodStoresDelta: nextFoodStores - realm.economy.foodStores,
  }
}

function growSiteEconomy(
  site: Site,
  edictModifiers: EdictSettlementModifiers,
  governorModifiers: GovernorSettlementModifiers,
): Site {
  const populationGrowth = Math.floor(
    site.economy.population
    * (M4_POPULATION_GROWTH_BASIS_POINTS + edictModifiers.populationGrowthBasisPoints)
    / M4_BASIS_POINTS_DIVISOR,
  )
  const population = site.economy.population + populationGrowth
  const households = Math.floor(population / M4_HOUSEHOLD_DIVISOR)
  const taxBase = households + governorModifiers.taxBaseDelta
  const foodProduction = applyBasisPointsDelta(
    households * M4_BASE_FOOD_PRODUCTION_PER_HOUSEHOLD,
    edictModifiers.foodProductionBasisPoints,
  ) + governorModifiers.foodProductionDelta

  return {
    ...site,
    economy: {
      population,
      households,
      taxBase,
      foodProduction,
    },
  }
}

function applyBasisPointsDelta(value: number, deltaBasisPoints: number): number {
  return Math.floor(value * (M4_BASIS_POINTS_DIVISOR + deltaBasisPoints) / M4_BASIS_POINTS_DIVISOR)
}

function sortedRealms(realms: ReadonlyMap<string, Realm>): readonly Realm[] {
  return [...realms.values()].sort((a, b) => a.id.localeCompare(b.id))
}

function sortedSitesForRealm(sites: ReadonlyMap<string, Site>, realmId: string): readonly Site[] {
  return [...sites.values()]
    .filter(site => site.ownerId === realmId)
    .sort((a, b) => a.id.localeCompare(b.id))
}

function buildSettlementEvents(before: World, after: World): readonly EconomySettlementEvent[] {
  return sortedRealms(after.realms).map(realm => {
    const previousEconomy = before.realms.get(realm.id)?.economy ?? realm.economy
    const previousSiteTotals = siteEconomyTotalsForRealm(before.sites, realm.id)
    const nextSiteTotals = siteEconomyTotalsForRealm(after.sites, realm.id)
    return {
      type: 'economySettlement',
      payload: {
        realmId: realm.id,
        treasuryDelta: realm.economy.treasury - previousEconomy.treasury,
        foodStoresDelta: realm.economy.foodStores - previousEconomy.foodStores,
        populationDelta: nextSiteTotals.population - previousSiteTotals.population,
        householdsDelta: nextSiteTotals.households - previousSiteTotals.households,
        settledAtTick: before.tick,
      },
    }
  })
}

function siteEconomyTotalsForRealm(
  sites: ReadonlyMap<string, Site>,
  realmId: string,
): { population: number; households: number } {
  let population = 0
  let households = 0

  for (const site of sites.values()) {
    if (site.ownerId !== realmId) continue
    population += site.economy.population
    households += site.economy.households
  }

  return { population, households }
}
