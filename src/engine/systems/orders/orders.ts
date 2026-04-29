import type { Army, GameEvent, Order, RNGState, Site, SiteId, WarKey, World } from '~/shared/types'
import { declareWar, isAtWar } from '~/engine/wars'

type OrderResult = { world: World; events: readonly GameEvent[] }

type OrderRejectionReason =
  | 'armyNotFound'
  | 'armyNotIdle'
  | 'notAdjacent'
  | 'targetNotFound'
  | 'notAtWar'

type ValidationResult =
  | { kind: 'ok'; army: Army; targetSite: Site }
  | { kind: 'rejected'; reason: OrderRejectionReason }

/**
 * Apply a single player order to the world.
 * Validation order: armyNotFound -> armyNotIdle -> notAdjacent -> targetNotFound -> notAtWar (march only).
 */
export function applyOrder(world: World, order: Order): OrderResult {
  const validation = validateOrder(world, order)
  if (validation.kind === 'rejected') {
    return rejected(world, order, validation.reason)
  }

  const { army, targetSite } = validation
  const events: GameEvent[] = []
  const wars = maybeDeclareWar(world.wars, order, army, targetSite, events)

  const armies = new Map(world.armies)
  armies.set(army.id, {
    ...army,
    state: 'marching',
    destination: order.targetSiteId,
    ticksRemaining: findTravelCost(world, army.location, order.targetSiteId),
    source: army.location,
  })

  events.push({
    type: 'orderApplied',
    payload: { armyId: army.id, targetSiteId: order.targetSiteId },
  })

  return { world: { ...world, armies, wars }, events }
}

function rejected(world: World, order: Order, reason: OrderRejectionReason): OrderResult {
  return {
    world,
    events: [{ type: 'orderRejected', payload: { reason, order } }],
  }
}

function validateOrder(world: World, order: Order): ValidationResult {
  const army = world.armies.get(order.armyId)
  if (!army) return { kind: 'rejected', reason: 'armyNotFound' }
  if (army.state !== 'idle') return { kind: 'rejected', reason: 'armyNotIdle' }

  const armySite = world.sites.get(army.location)
  if (!armySite || !armySite.adjacency.includes(order.targetSiteId)) {
    return { kind: 'rejected', reason: 'notAdjacent' }
  }

  const targetSite = world.sites.get(order.targetSiteId)
  if (!targetSite) return { kind: 'rejected', reason: 'targetNotFound' }

  if (order.type === 'march' && targetSite.ownerId && targetSite.ownerId !== army.realmId) {
    if (!isAtWar(world.wars, army.realmId, targetSite.ownerId)) {
      return { kind: 'rejected', reason: 'notAtWar' }
    }
  }

  return { kind: 'ok', army, targetSite }
}

function maybeDeclareWar(
  wars: ReadonlyMap<WarKey, true>,
  order: Order,
  army: Army,
  targetSite: Site,
  events: GameEvent[],
): ReadonlyMap<WarKey, true> {
  if (order.type !== 'declareWarAndMarch') return wars
  if (!targetSite.ownerId || targetSite.ownerId === army.realmId) return wars
  if (isAtWar(wars, army.realmId, targetSite.ownerId)) return wars

  const next = declareWar(wars, army.realmId, targetSite.ownerId)
  events.push({
    type: 'warDeclared',
    payload: { byRealm: army.realmId, againstRealm: targetSite.ownerId },
  })
  return next
}

/**
 * Order apply phase step.
 * Consumes all pending orders from world.pendingOrders sequentially,
 * then clears the queue.
 */
export function orderApplyStep(
  world: World,
  rng: RNGState,
): { world: World; nextRng: RNGState; events: readonly GameEvent[] } {
  const allEvents: GameEvent[] = []
  let currentWorld = world

  for (const order of world.pendingOrders) {
    const { world: newWorld, events } = applyOrder(currentWorld, order)
    currentWorld = newWorld
    allEvents.push(...events)
  }

  // Clear pending orders after processing
  return {
    world: { ...currentWorld, pendingOrders: [] },
    nextRng: rng,
    events: allEvents,
  }
}

/**
 * Find travel cost between two adjacent sites by their shared edge.
 * Defaults to 3 if no shared edge or sites are missing.
 */
function findTravelCost(world: World, fromSiteId: SiteId, toSiteId: SiteId): number {
  const fromSite = world.sites.get(fromSiteId)
  const toSite = world.sites.get(toSiteId)
  if (!fromSite || !toSite) return 3

  const fromEdgeIds = new Set(fromSite.boundary.map(ref => ref.edge))
  for (const ref of toSite.boundary) {
    if (fromEdgeIds.has(ref.edge)) {
      return world.edges.get(ref.edge)?.travel_cost ?? 3
    }
  }
  return 3
}
