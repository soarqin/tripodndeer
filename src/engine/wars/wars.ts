import type { CasusBelliId, GameDate, PeaceProposalId, RealmId, TradeRoute, TradeRouteId, WarKey, WarState, World } from '~/shared/types'

export function warKey(a: RealmId, b: RealmId): WarKey {
  if (a === b) throw new Error('Realm cannot be at war with itself')
  return [a, b].sort().join(':')
}

export function isAtWar(wars: ReadonlyMap<WarKey, WarState>, a: RealmId, b: RealmId): boolean {
  if (a === b) return false
  return wars.has(warKey(a, b))
}

export function getWarState(
  wars: ReadonlyMap<WarKey, WarState>,
  a: RealmId,
  b: RealmId,
): WarState | null {
  if (a === b) return null
  return wars.get(warKey(a, b)) ?? null
}

export function declareWar(
  wars: ReadonlyMap<WarKey, WarState>,
  a: RealmId,
  b: RealmId,
  date?: GameDate,
): ReadonlyMap<WarKey, WarState> {
  const key = warKey(a, b)
  if (wars.has(key)) return wars
  const next = new Map(wars)
  next.set(key, {
    casusBelli: null,
    declaredAt: date ?? { yearBC: 260, season: 'spring', month: 1, xun: 'shang' },
    occupiedSites: new Map(),
    peaceProposalId: null,
  })
  return next
}

export function declareWarWithCasus(
  wars: ReadonlyMap<WarKey, WarState>,
  a: RealmId,
  b: RealmId,
  casusBelli: CasusBelliId | null,
  date: GameDate,
): ReadonlyMap<WarKey, WarState> {
  const key = warKey(a, b)
  if (wars.has(key)) return wars
  const next = new Map(wars)
  next.set(key, {
    casusBelli,
    declaredAt: date,
    occupiedSites: new Map(),
    peaceProposalId: null,
  })
  return next
}

export function endWar(
  wars: ReadonlyMap<WarKey, WarState>,
  key: WarKey,
): ReadonlyMap<WarKey, WarState> {
  if (!wars.has(key)) return wars
  const next = new Map(wars)
  next.delete(key)
  return next
}

export function attachPeaceProposal(
  wars: ReadonlyMap<WarKey, WarState>,
  key: WarKey,
  proposalId: PeaceProposalId,
): ReadonlyMap<WarKey, WarState> {
  const state = wars.get(key)
  if (!state) throw new Error(`No war for key ${key}`)
  const next = new Map(wars)
  next.set(key, { ...state, peaceProposalId: proposalId })
  return next
}

export function cutTradeRoutesBetween(world: World, a: RealmId, b: RealmId): World {
  if (a === b) return world
  const tradeRoutes = new Map<TradeRouteId, TradeRoute>(world.tradeRoutes)
  let changed = false
  for (const [id, route] of tradeRoutes) {
    if (route.status !== 'active') continue
    const matches =
      (route.fromRealmId === a && route.toRealmId === b) ||
      (route.fromRealmId === b && route.toRealmId === a)
    if (matches) {
      tradeRoutes.set(id, { ...route, status: 'cut' })
      changed = true
    }
  }
  if (!changed) return world
  return { ...world, tradeRoutes }
}
