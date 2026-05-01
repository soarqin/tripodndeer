import type { Army, GameEvent, GovernorModifierKind, Order, RNGState, Site, WarKey, WarState, World } from '~/shared/types'
import { findTravelCost } from '~/engine/systems/march'
import { declareWar, declareWarWithCasus, isAtWar } from '~/engine/wars'
import { createPeaceProposal } from '~/engine/systems/peace'

type OrderResult = { world: World; events: readonly GameEvent[] }

type OrderRejectionReason =
  | 'armyNotFound'
  | 'armyNotIdle'
  | 'notAdjacent'
  | 'targetNotFound'
  | 'notAtWar'
  | 'realmNotFound'
  | 'invalidOrder'
  | 'invalidDuration'
  | 'siteNotFound'
  | 'siteNotOwned'
  | 'generalNotFound'
  | 'generalWrongRealm'

type ValidationResult =
  | { kind: 'ok'; army: Army; targetSite: Site }
  | { kind: 'rejected'; reason: OrderRejectionReason }

/**
 * Apply a single player order to the world.
 * Validation order: armyNotFound -> armyNotIdle -> notAdjacent -> targetNotFound -> notAtWar (march only).
 */
export function applyOrder(world: World, order: Order): OrderResult {
  if (order.type === 'declare-war') {
    if (!order.targetRealmId) {
      return rejected(world, order, 'targetNotFound')
    }
    const casusBelli = order.casusBelli ?? null
    const nextWars = declareWarWithCasus(world.wars, world.playerRealmId, order.targetRealmId, casusBelli, world.date)
    return {
      world: { ...world, wars: nextWars, pendingOrders: [] },
      events: [{ type: 'warDeclared', payload: { byRealm: world.playerRealmId, againstRealm: order.targetRealmId, casusBelli } }],
    }
  }

  if (order.type === 'propose-peace') {
    if (!order.peaceProposalData) {
      return rejected(world, order, 'targetNotFound')
    }
    const pd = order.peaceProposalData
    const { world: newWorld, proposalId } = createPeaceProposal(world, {
      id: pd.proposalId,
      proposingRealmId: pd.proposingRealmId,
      targetRealmId: pd.targetRealmId,
      terms: pd.terms,
      proposedAt: world.date,
    })
    return {
      world: newWorld,
      events: [{ type: 'peaceProposed', payload: { proposalId } }],
    }
  }

  if (order.type === 'activate-edict') {
    return applyActivateEdictOrder(world, order)
  }

  if (order.type === 'assign-governor') {
    return applyAssignGovernorOrder(world, order)
  }

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
    destination: order.targetSiteId ?? null,
    ticksRemaining: findTravelCost(world, army.location, order.targetSiteId ?? '', army.realmId),
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

function applyActivateEdictOrder(world: World, order: Order): OrderResult {
  if (!world.realms.has(world.playerRealmId)) {
    return rejected(world, order, 'realmNotFound')
  }
  if (!order.realmId || order.realmId !== world.playerRealmId || !world.realms.has(order.realmId)) {
    return rejected(world, order, 'realmNotFound')
  }
  if (!order.edictId || !order.kind) {
    return rejected(world, order, 'invalidOrder')
  }
  if (order.durationMonths === undefined || order.durationMonths <= 0) {
    return rejected(world, order, 'invalidDuration')
  }

  const edicts = new Map(world.edicts)
  edicts.set(order.edictId, {
    id: order.edictId,
    realmId: order.realmId,
    kind: order.kind,
    startedAtTick: world.tick,
    durationMonths: order.durationMonths,
    remainingMonths: order.durationMonths,
    status: 'active',
  })

  return {
    world: { ...world, edicts },
    events: [{ type: 'orderApplied', payload: { edictId: order.edictId, realmId: order.realmId } }],
  }
}

function applyAssignGovernorOrder(world: World, order: Order): OrderResult {
  if (!world.realms.has(world.playerRealmId)) {
    return rejected(world, order, 'realmNotFound')
  }
  if (!order.siteId || !order.generalId) {
    return rejected(world, order, 'invalidOrder')
  }

  const site = world.sites.get(order.siteId)
  if (!site) {
    return rejected(world, order, 'siteNotFound')
  }
  if (site.ownerId !== world.playerRealmId) {
    return rejected(world, order, 'siteNotOwned')
  }

  if (world.generals.size > 0) {
    const general = world.generals.get(order.generalId)
    if (!general) {
      return rejected(world, order, 'generalNotFound')
    }
    if (general.realmId !== world.playerRealmId) {
      return rejected(world, order, 'generalWrongRealm')
    }
  }

  const modifierKind: GovernorModifierKind = 'tax_efficiency'
  const governorAssignments = new Map(world.governorAssignments)
  governorAssignments.set(order.siteId, {
    siteId: order.siteId,
    realmId: world.playerRealmId,
    generalId: order.generalId,
    assignedAtTick: world.tick,
    modifierKind,
  })

  return {
    world: { ...world, governorAssignments },
    events: [{ type: 'orderApplied', payload: { siteId: order.siteId, generalId: order.generalId } }],
  }
}

function validateOrder(world: World, order: Order): ValidationResult {
  const army = world.armies.get(order.armyId!)
  if (!army) return { kind: 'rejected', reason: 'armyNotFound' }
  if (army.state !== 'idle') return { kind: 'rejected', reason: 'armyNotIdle' }

  const armySite = world.sites.get(army.location)
  if (!armySite || !armySite.adjacency.includes(order.targetSiteId!)) {
    return { kind: 'rejected', reason: 'notAdjacent' }
  }

  const targetSite = world.sites.get(order.targetSiteId!)
  if (!targetSite) return { kind: 'rejected', reason: 'targetNotFound' }

  if (order.type === 'march' && targetSite.ownerId && targetSite.ownerId !== army.realmId) {
    if (!isAtWar(world.wars, army.realmId, targetSite.ownerId)) {
      return { kind: 'rejected', reason: 'notAtWar' }
    }
  }

  return { kind: 'ok', army, targetSite }
}

function maybeDeclareWar(
  wars: ReadonlyMap<WarKey, WarState>,
  order: Order,
  army: Army,
  targetSite: Site,
  events: GameEvent[],
): ReadonlyMap<WarKey, WarState> {
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

