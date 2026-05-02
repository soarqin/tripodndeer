import type { TradeRoute, TradeRouteId, World } from '~/shared/types'
import {
  M42_TRADE_ROUTE_BASE_INCOME_PER_XUN,
  M42_TRADE_ROUTE_MAX_PER_REALM,
} from '~/content/m2/balance'
import { warKey } from '~/engine/wars/wars'

export function proposeNewTradeRoutes(world: World): World {
  let currentWorld = world

  const sortedRealms = [...world.realms.values()].sort((a, b) => a.id.localeCompare(b.id))

  for (const realm of sortedRealms) {
    if (realm.id === world.playerRealmId) continue

    const activeRoutes = [...currentWorld.tradeRoutes.values()].filter(
      r =>
        r.status === 'active' &&
        (r.fromRealmId === realm.id || r.toRealmId === realm.id),
    )
    if (activeRoutes.length >= M42_TRADE_ROUTE_MAX_PER_REALM) continue

    const candidateRealms = [...currentWorld.realms.values()]
      .filter(other => {
        if (other.id === realm.id) return false
        if (currentWorld.wars.has(warKey(realm.id, other.id))) return false
        const hasRoute = [...currentWorld.tradeRoutes.values()].some(
          r =>
            r.status === 'active' &&
            ((r.fromRealmId === realm.id && r.toRealmId === other.id) ||
              (r.fromRealmId === other.id && r.toRealmId === realm.id)),
        )
        if (hasRoute) return false
        return true
      })
      .sort((a, b) => a.id.localeCompare(b.id))

    if (candidateRealms.length === 0) continue

    const target = candidateRealms[0]!

    const fromSites = [...currentWorld.sites.values()]
      .filter(s => s.ownerId === realm.id)
      .sort((a, b) => a.id.localeCompare(b.id))
    const toSites = [...currentWorld.sites.values()]
      .filter(s => s.ownerId === target.id)
      .sort((a, b) => a.id.localeCompare(b.id))
    if (fromSites.length === 0 || toSites.length === 0) continue

    const fromSite = fromSites[0]!
    const toSite = toSites[0]!

    const routeId: TradeRouteId = `route_${realm.id}_${target.id}_${currentWorld.tick}`
    const newRoute: TradeRoute = {
      id: routeId,
      fromSiteId: fromSite.id,
      toSiteId: toSite.id,
      fromRealmId: realm.id,
      toRealmId: target.id,
      establishedAtTick: currentWorld.tick,
      baseIncomePerXun: M42_TRADE_ROUTE_BASE_INCOME_PER_XUN,
      status: 'active',
    }

    const tradeRoutes = new Map(currentWorld.tradeRoutes)
    tradeRoutes.set(routeId, newRoute)
    currentWorld = { ...currentWorld, tradeRoutes }
  }

  return currentWorld
}
