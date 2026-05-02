import type {
  FactionId,
  FactionInfluenceState,
  GameEvent,
  Realm,
  RealmId,
  RNGState,
  SiteId,
  TradeRoute,
  TradeRouteId,
  World,
} from '~/shared/types'
import {
  M42_TRADE_FACTION_INFLUENCE_PER_ROUTE_PER_YEAR,
  M42_TRADE_ROUTE_DISTANCE_PENALTY_BP_PER_HOP,
} from '~/content/m2/balance'
import { warKey } from '~/engine/wars/wars'
import { getTraitModifiers } from '~/content/m4_1/trait-effects'

const BASIS_POINTS_DIVISOR = 10000
const MONTHS_PER_YEAR = 12
const FOREIGN_CLIENTS: FactionId = 'foreign_clients'
const MAX_HOPS_FALLBACK = 5

export function tradePhase(
  world: World,
  rng: RNGState,
): { world: World; nextRng: RNGState; events: readonly GameEvent[] } {
  if (world.date.xun !== 'shang') {
    return { world, nextRng: rng, events: [] }
  }

  let currentWorld = world
  const events: GameEvent[] = []

  const sortedRoutes = [...world.tradeRoutes.values()].sort((a, b) => a.id.localeCompare(b.id))

  for (const route of sortedRoutes) {
    if (route.status !== 'active') continue

    const fromSite = currentWorld.sites.get(route.fromSiteId)
    const toSite = currentWorld.sites.get(route.toSiteId)

    if (!fromSite || !toSite) {
      currentWorld = cutRoute(currentWorld, route.id)
      continue
    }

    if (fromSite.ownerId !== route.fromRealmId || toSite.ownerId !== route.toRealmId) {
      if (fromSite.ownerId && fromSite.ownerId === toSite.ownerId) {
        currentWorld = transferRoute(currentWorld, route.id, fromSite.ownerId)
        continue
      }
      currentWorld = cutRoute(currentWorld, route.id)
      continue
    }

    if (areAtWar(currentWorld, route.fromRealmId, route.toRealmId)) {
      currentWorld = cutRoute(currentWorld, route.id)
      continue
    }

    const fromRealm = currentWorld.realms.get(route.fromRealmId)
    const toRealm = currentWorld.realms.get(route.toRealmId)
    if (!fromRealm || !toRealm) continue

    const hopCount = calculateHopCount(currentWorld, route.fromSiteId, route.toSiteId)
    const distancePenaltyBp = hopCount * M42_TRADE_ROUTE_DISTANCE_PENALTY_BP_PER_HOP
    const penaltyMultiplier = Math.max(0, 1 - distancePenaltyBp / BASIS_POINTS_DIVISOR)

    const fromTradeBonus = getTradeIncomeMultiplier(fromRealm)
    const toTradeBonus = getTradeIncomeMultiplier(toRealm)

    const totalIncome = Math.floor(
      route.baseIncomePerXun * penaltyMultiplier * (1 + fromTradeBonus) * (1 + toTradeBonus),
    )
    const halfIncome = Math.floor(totalIncome / 2)

    if (halfIncome > 0) {
      currentWorld = applyTreasury(currentWorld, route.fromRealmId, halfIncome)
      currentWorld = applyTreasury(currentWorld, route.toRealmId, halfIncome)
    }

    const factionDeltaPerMonth = M42_TRADE_FACTION_INFLUENCE_PER_ROUTE_PER_YEAR / MONTHS_PER_YEAR
    currentWorld = applyFactionDelta(currentWorld, route.fromRealmId, FOREIGN_CLIENTS, factionDeltaPerMonth)
    currentWorld = applyFactionDelta(currentWorld, route.toRealmId, FOREIGN_CLIENTS, factionDeltaPerMonth)
  }

  return { world: currentWorld, nextRng: rng, events }
}

function cutRoute(world: World, routeId: TradeRouteId): World {
  const route = world.tradeRoutes.get(routeId)
  if (!route) return world
  const tradeRoutes = new Map(world.tradeRoutes)
  tradeRoutes.set(routeId, { ...route, status: 'cut' })
  return { ...world, tradeRoutes }
}

function transferRoute(world: World, routeId: TradeRouteId, newOwner: RealmId): World {
  const route = world.tradeRoutes.get(routeId)
  if (!route) return world
  const tradeRoutes = new Map(world.tradeRoutes)
  const next: TradeRoute = {
    ...route,
    fromRealmId: newOwner,
    toRealmId: newOwner,
  }
  tradeRoutes.set(routeId, next)
  return { ...world, tradeRoutes }
}

function areAtWar(world: World, a: RealmId, b: RealmId): boolean {
  if (a === b) return false
  return world.wars.has(warKey(a, b))
}

function applyTreasury(world: World, realmId: RealmId, delta: number): World {
  const realm = world.realms.get(realmId)
  if (!realm) return world
  const realms = new Map(world.realms)
  const nextRealm: Realm = {
    ...realm,
    economy: { ...realm.economy, treasury: realm.economy.treasury + delta },
  }
  realms.set(realmId, nextRealm)
  return { ...world, realms }
}

function getTradeIncomeMultiplier(realm: Realm): number {
  const mods = getTraitModifiers(realm)
  return mods.tradeIncomeMultiplierBp / BASIS_POINTS_DIVISOR
}

function applyFactionDelta(
  world: World,
  realmId: RealmId,
  faction: FactionId,
  delta: number,
): World {
  const current = world.factionInfluences.get(realmId)
  if (!current) return world
  const oldVal = current.influences.get(faction) ?? 0
  const newVal = Math.min(100, Math.max(0, oldVal + delta))
  const influences = new Map(current.influences)
  influences.set(faction, newVal)
  const next: FactionInfluenceState = { ...current, influences }
  const factionInfluences = new Map(world.factionInfluences)
  factionInfluences.set(realmId, next)
  return { ...world, factionInfluences }
}

function calculateHopCount(world: World, fromSiteId: SiteId, toSiteId: SiteId): number {
  if (fromSiteId === toSiteId) return 0

  const visited = new Set<SiteId>([fromSiteId])
  const queue: Array<{ siteId: SiteId; hops: number }> = [{ siteId: fromSiteId, hops: 0 }]

  const adjacency = new Map<SiteId, SiteId[]>()
  for (const edge of world.adjacencyEdges.values()) {
    if (!adjacency.has(edge.fromSiteId)) adjacency.set(edge.fromSiteId, [])
    if (!adjacency.has(edge.toSiteId)) adjacency.set(edge.toSiteId, [])
    adjacency.get(edge.fromSiteId)!.push(edge.toSiteId)
    adjacency.get(edge.toSiteId)!.push(edge.fromSiteId)
  }

  for (const site of world.sites.values()) {
    if (!adjacency.has(site.id)) adjacency.set(site.id, [])
    const list = adjacency.get(site.id)!
    for (const neighbor of site.adjacency) {
      if (!list.includes(neighbor)) list.push(neighbor)
    }
  }

  while (queue.length > 0) {
    const head = queue.shift()
    if (!head) break
    const neighbors = adjacency.get(head.siteId) ?? []
    for (const neighbor of neighbors) {
      if (visited.has(neighbor)) continue
      if (neighbor === toSiteId) return head.hops + 1
      visited.add(neighbor)
      queue.push({ siteId: neighbor, hops: head.hops + 1 })
    }
  }

  return MAX_HOPS_FALLBACK
}
