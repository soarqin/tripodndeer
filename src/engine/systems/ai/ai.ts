import type { Army, ArmyId, GameEvent, RealmId, RNGState, SiteId, WarKey, WarState, World } from '~/shared/types'
import { findTravelCost } from '~/engine/systems/march'
import { nextRng } from '~/engine/random'
import { declareWar, isAtWar } from '~/engine/wars'
import { getPersonality, pickAction, type AIOption } from './utility-scorer'

// IMPORTANT: realm and army iteration order is locked to lexicographic ID sort.
// This is a contract — changing iteration order breaks RNG reproducibility.

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

  for (const realm of [...world.realms.values()].sort((a, b) => a.id.localeCompare(b.id))) {
    if (realm.id === world.playerRealmId) continue

    const roll = nextRng(currentRng)
    currentRng = roll.nextState

    if (roll.value >= 0.2) continue

    const candidateTargets = findCandidateTargets(world, armies, realm.id)
    if (candidateTargets.length === 0) continue

    const options: AIOption[] = candidateTargets.map(candidate => ({
      kind: 'attack',
      targetSiteId: candidate.targetSiteId,
      armyId: candidate.armyId,
      score: 50,
    }))
    options.push({ kind: 'idle', score: 10 })

    const personality = getPersonality(realm.id)
    const { action, nextRng: pickRng } = pickAction(options, personality, currentRng)
    currentRng = pickRng

    if (action.kind === 'idle' || !action.targetSiteId || !action.armyId) continue

    const dispatch = dispatchCandidate(world, armies, wars, realm.id, {
      targetSiteId: action.targetSiteId,
      armyId: action.armyId,
    })
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
  const idleArmies = [...armies.values()]
    .filter(army => army.realmId === realmId && army.state === 'idle')
    .sort((a, b) => a.id.localeCompare(b.id))

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
  wars: ReadonlyMap<WarKey, WarState>,
  realmId: RealmId,
  candidate: { targetSiteId: SiteId; armyId: ArmyId },
): { wars: ReadonlyMap<WarKey, WarState>; events: GameEvent[] } {
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

