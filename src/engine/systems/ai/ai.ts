import type { Army, ArmyId, GameEvent, RealmId, RNGState, SiteId, WarKey, WarState, World } from '~/shared/types'
import { findTravelCost } from '~/engine/systems/march'
import { nextRng } from '~/engine/random'
import { startSiege } from '~/engine/systems/siege'
import { declareWar, isAtWar } from '~/engine/wars'
import { getPersonality, pickAction, type AIOption } from './utility-scorer'
import {
  evaluateCutSupplyOption,
  evaluateRetreatOption,
  evaluateSiegeOption,
} from './tactics'

// IMPORTANT: realm and army iteration order is locked to lexicographic ID sort.
// This is a contract — changing iteration order breaks RNG reproducibility.

/**
 * AI planning phase step.
 * Only executes every 3 ticks (monthly).
 * Each non-player realm has 20% chance to pick one tactical action.
 *
 * Options considered per realm:
 *  - attack: march an idle army into an adjacent enemy site
 *  - siege-continue: start a siege on the enemy site the army is parked at
 *  - cut-supply: march to an adjacent enemy site to tighten an existing siege
 *  - retreat: fall back to a friendly adjacent site when outmatched or starving
 *  - idle: do nothing (always available, low score)
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
  let armies = new Map(world.armies)
  let sieges = new Map(world.sieges)
  let sites = new Map(world.sites)
  let wars = world.wars

  for (const realm of [...world.realms.values()].sort((a, b) => a.id.localeCompare(b.id))) {
    if (realm.id === world.playerRealmId) continue

    const roll = nextRng(currentRng)
    currentRng = roll.nextState

    if (roll.value >= 0.2) continue

    const candidateTargets = findCandidateTargets(world, armies, realm.id)

    const options: AIOption[] = candidateTargets.map(candidate => ({
      kind: 'attack',
      targetSiteId: candidate.targetSiteId,
      armyId: candidate.armyId,
      score: 50,
    }))
    options.push({ kind: 'idle', score: 10 })

    const worldSnapshot: World = { ...world, armies, sieges, sites, wars }
    for (const army of [...armies.values()]
      .filter(a => a.realmId === realm.id)
      .sort((a, b) => a.id.localeCompare(b.id))) {
      const siegeOpt = evaluateSiegeOption(army, worldSnapshot)
      if (siegeOpt) options.push(siegeOpt)
      const cutSupplyOpt = evaluateCutSupplyOption(army, worldSnapshot)
      if (cutSupplyOpt) options.push(cutSupplyOpt)
      const retreatOpt = evaluateRetreatOption(army, worldSnapshot)
      if (retreatOpt) options.push(retreatOpt)
    }

    // If there are no concrete options (only idle) skip the action entirely so
    // we keep the historical "no candidate → no events / no extra rng draws" contract.
    if (options.length === 1) continue

    const personality = getPersonality(realm.id)
    const { action, nextRng: pickRng } = pickAction(options, personality, currentRng)
    currentRng = pickRng

    if (action.kind === 'idle') continue
    if (!action.targetSiteId || !action.armyId) continue

    if (action.kind === 'attack' || action.kind === 'cut-supply') {
      const dispatch = dispatchCandidate(world, armies, wars, realm.id, {
        targetSiteId: action.targetSiteId,
        armyId: action.armyId,
      })
      wars = dispatch.wars
      events.push(...dispatch.events)
    } else if (action.kind === 'siege-continue') {
      const tempWorld: World = { ...world, armies, sieges, sites, wars }
      const newWorld = startSiege(tempWorld, action.armyId, action.targetSiteId)
      armies = new Map(newWorld.armies)
      sieges = new Map(newWorld.sieges)
      sites = new Map(newWorld.sites)
      events.push({
        type: 'aiStartedSiege',
        payload: {
          realmId: realm.id,
          armyId: action.armyId,
          siteId: action.targetSiteId,
        },
      })
    } else if (action.kind === 'retreat') {
      const army = armies.get(action.armyId)
      if (!army) continue
      armies.set(action.armyId, {
        ...army,
        state: 'retreating',
        destination: action.targetSiteId,
        ticksRemaining: findTravelCost(world, army.location, action.targetSiteId),
        source: army.location,
      })
      events.push({
        type: 'aiRetreatedArmy',
        payload: {
          realmId: realm.id,
          armyId: action.armyId,
          targetSiteId: action.targetSiteId,
        },
      })
    }
  }

  return {
    world: { ...world, armies, sieges, sites, wars },
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
