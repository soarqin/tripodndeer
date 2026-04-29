import type { Army, ArmyId, GameEvent, RealmId, RNGState, SiteId, WarKey, World } from '~/shared/types'
import { nextInt, nextRng } from '~/engine/random'
import { declareWar, isAtWar } from '~/engine/wars'

/**
 * AI planning phase step.
 * Only executes every 3 ticks (monthly).
 * Each non-player realm has 20% chance to attack an adjacent enemy site.
 */
export function aiPlanStep(
  world: World,
  rng: RNGState,
): { world: World; nextRng: RNGState; events: readonly GameEvent[] } {
  if (world.tick % 3 !== 0) {
    return { world, nextRng: rng, events: [] }
  }

  const events: GameEvent[] = []
  let currentRng = rng
  const armies = new Map(world.armies)
  let wars = world.wars

  for (const realm of world.realms.values()) {
    if (realm.id === world.playerRealmId) continue

    const roll = nextRng(currentRng)
    currentRng = roll.nextState

    if (roll.value >= 0.2) continue

    const candidateTargets = findCandidateTargets(world, armies, realm.id)
    if (candidateTargets.length === 0) continue

    const targetPick = nextInt(currentRng, 0, candidateTargets.length - 1)
    currentRng = targetPick.nextState

    const candidate = candidateTargets[targetPick.value]
    if (!candidate) continue

    const dispatch = dispatchCandidate(world, armies, wars, realm.id, candidate)
    wars = dispatch.wars
    events.push(...dispatch.events)
  }

  return {
    world: { ...world, armies, wars },
    nextRng: currentRng,
    events,
  }
}

function findCandidateTargets(
  world: World,
  armies: ReadonlyMap<ArmyId, Army>,
  realmId: RealmId,
): Array<{ targetSiteId: SiteId; armyId: ArmyId }> {
  const candidateTargets: Array<{ targetSiteId: SiteId; armyId: ArmyId }> = []
  const idleArmies = [...armies.values()].filter(
    army => army.realmId === realmId && army.state === 'idle',
  )

  for (const army of idleArmies) {
    const armySite = world.sites.get(army.location)
    if (!armySite) continue

    for (const adjacentSiteId of armySite.adjacency) {
      const adjacentSite = world.sites.get(adjacentSiteId)
      if (adjacentSite && adjacentSite.ownerId !== realmId) {
        candidateTargets.push({ targetSiteId: adjacentSiteId, armyId: army.id })
      }
    }
  }

  return candidateTargets
}

function dispatchCandidate(
  world: World,
  armies: Map<ArmyId, Army>,
  wars: ReadonlyMap<WarKey, true>,
  realmId: RealmId,
  candidate: { targetSiteId: SiteId; armyId: ArmyId },
): { wars: ReadonlyMap<WarKey, true>; events: GameEvent[] } {
  const { targetSiteId, armyId } = candidate
  const targetSite = world.sites.get(targetSiteId)
  const army = armies.get(armyId)
  if (!targetSite || !army) return { wars, events: [] }

  const events: GameEvent[] = []
  let nextWars = wars
  if (targetSite.ownerId && !isAtWar(nextWars, realmId, targetSite.ownerId)) {
    nextWars = declareWar(nextWars, realmId, targetSite.ownerId)
    events.push({
      type: 'aiDeclaredWar',
      payload: { byRealm: realmId, againstRealm: targetSite.ownerId },
    })
  }

  armies.set(armyId, {
    ...army,
    state: 'marching',
    destination: targetSiteId,
    ticksRemaining: findTravelCost(world, army.location, targetSiteId),
    source: army.location,
  })
  events.push({ type: 'aiDispatchedArmy', payload: { realmId, armyId, targetSiteId } })

  return { wars: nextWars, events }
}

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
