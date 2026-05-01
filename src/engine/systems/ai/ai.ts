import type {
  Army,
  ArmyId,
  DiplomaticActionKind,
  DiplomaticRelation,
  GameEvent,
  Realm,
  RealmId,
  RelationKey,
  RNGState,
  SiteId,
  WarKey,
  World,
} from '~/shared/types'
import { findTravelCost } from '~/engine/systems/march'
import { nextRng } from '~/engine/random'
import { startSiege } from '~/engine/systems/siege'
import { isAtWar } from '~/engine/wars'
import { applyDiplomacyAction, scoreDiplomacyAcceptance, validateDiplomacyAction } from '~/engine/systems/diplomacy'
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
  let phaseState = createAiPhaseState(world)

  for (const realm of [...world.realms.values()].sort((a, b) => a.id.localeCompare(b.id))) {
    if (realm.id === world.playerRealmId) continue

    const diplomacyWorld = worldWithAiPhaseState(world, phaseState)
    const diplomacy = planDiplomacyAction(diplomacyWorld, realm)
    if (diplomacy.ok) {
      phaseState = phaseStateWithDiplomacyResult(phaseState, diplomacy.world)
      events.push(...diplomacy.events)
    }

    const roll = nextRng(currentRng)
    currentRng = roll.nextState

    if (roll.value >= 0.2) continue

    const options = collectTacticalOptions(world, phaseState, realm.id)

    // If there are no concrete options (only idle) skip the action entirely so
    // we keep the historical "no candidate → no events / no extra rng draws" contract.
    if (options.length === 1) continue

    const personality = getPersonality(world, realm.id)
    const { action, nextRng: pickRng } = pickAction(options, personality, currentRng)
    currentRng = pickRng

    if (action.kind === 'idle') continue
    if (!action.targetSiteId || !action.armyId) continue

    const result = applyTacticalAction(world, phaseState, realm.id, action)
    phaseState = result.phaseState
    events.push(...result.events)
  }

  return {
    world: worldWithAiPhaseState(world, phaseState),
    nextRng: currentRng,
    events,
  }
}

interface AiPhaseState {
  readonly armies: Map<ArmyId, Army>
  readonly sieges: World['sieges']
  readonly sites: World['sites']
  readonly wars: World['wars']
  readonly relations: World['relations']
  readonly diplomaticProposals: World['diplomaticProposals']
  readonly treaties: World['treaties']
  readonly diplomacyHistory: World['diplomacyHistory']
  readonly coalitions: World['coalitions']
}

function createAiPhaseState(world: World): AiPhaseState {
  return {
    armies: new Map(world.armies),
    sieges: new Map(world.sieges),
    sites: new Map(world.sites),
    wars: world.wars,
    relations: world.relations,
    diplomaticProposals: world.diplomaticProposals,
    treaties: world.treaties,
    diplomacyHistory: world.diplomacyHistory,
    coalitions: world.coalitions,
  }
}

function worldWithAiPhaseState(world: World, phaseState: AiPhaseState): World {
  return {
    ...world,
    armies: phaseState.armies,
    sieges: phaseState.sieges,
    sites: phaseState.sites,
    wars: phaseState.wars,
    relations: phaseState.relations,
    diplomaticProposals: phaseState.diplomaticProposals,
    treaties: phaseState.treaties,
    diplomacyHistory: phaseState.diplomacyHistory,
    coalitions: phaseState.coalitions,
  }
}

function phaseStateWithDiplomacyResult(phaseState: AiPhaseState, world: World): AiPhaseState {
  return {
    ...phaseState,
    wars: world.wars,
    relations: world.relations,
    diplomaticProposals: world.diplomaticProposals,
    treaties: world.treaties,
    diplomacyHistory: world.diplomacyHistory,
    coalitions: world.coalitions,
  }
}

function phaseStateWithBattlefieldResult(phaseState: AiPhaseState, world: World): AiPhaseState {
  return {
    ...phaseState,
    armies: new Map(world.armies),
    sieges: new Map(world.sieges),
    sites: new Map(world.sites),
  }
}

function collectTacticalOptions(world: World, phaseState: AiPhaseState, realmId: RealmId): AIOption[] {
  const candidateTargets = findCandidateTargets(world, phaseState.armies, realmId)

  const options: AIOption[] = candidateTargets.map(candidate => ({
    kind: 'attack',
    targetSiteId: candidate.targetSiteId,
    armyId: candidate.armyId,
    score: 50,
  }))
  options.push({ kind: 'idle', score: 10 })

  const worldSnapshot = worldWithAiPhaseState(world, phaseState)
  for (const army of [...phaseState.armies.values()]
    .filter(a => a.realmId === realmId)
    .sort((a, b) => a.id.localeCompare(b.id))) {
    const siegeOpt = evaluateSiegeOption(army, worldSnapshot)
    if (siegeOpt) options.push(siegeOpt)
    const cutSupplyOpt = evaluateCutSupplyOption(army, worldSnapshot)
    if (cutSupplyOpt) options.push(cutSupplyOpt)
    const retreatOpt = evaluateRetreatOption(army, worldSnapshot)
    if (retreatOpt) options.push(retreatOpt)
  }

  return options
}

function applyTacticalAction(
  world: World,
  phaseState: AiPhaseState,
  realmId: RealmId,
  action: AIOption,
): { readonly phaseState: AiPhaseState; readonly events: readonly GameEvent[] } {
  if (!action.targetSiteId || !action.armyId) return { phaseState, events: [] }

  if (action.kind === 'attack' || action.kind === 'cut-supply') {
    const dispatch = dispatchCandidate(
      worldWithAiPhaseState(world, phaseState),
      phaseState.armies,
      realmId,
      {
        targetSiteId: action.targetSiteId,
        armyId: action.armyId,
      },
    )
    return {
      phaseState: phaseStateWithDiplomacyResult(phaseState, dispatch.world),
      events: dispatch.events,
    }
  }

  if (action.kind === 'siege-continue') {
    const newWorld = startSiege(worldWithAiPhaseState(world, phaseState), action.armyId, action.targetSiteId)
    return {
      phaseState: phaseStateWithBattlefieldResult(phaseState, newWorld),
      events: [{
        type: 'aiStartedSiege',
        payload: {
          realmId,
          armyId: action.armyId,
          siteId: action.targetSiteId,
        },
      }],
    }
  }

  if (action.kind === 'retreat') {
    const army = phaseState.armies.get(action.armyId)
    if (!army) return { phaseState, events: [] }
    phaseState.armies.set(action.armyId, {
      ...army,
      state: 'retreating',
      destination: action.targetSiteId,
      ticksRemaining: findTravelCost(world, army.location, action.targetSiteId, realmId),
      source: army.location,
    })
    return {
      phaseState,
      events: [{
        type: 'aiRetreatedArmy',
        payload: {
          realmId,
          armyId: action.armyId,
          targetSiteId: action.targetSiteId,
        },
      }],
    }
  }

  return { phaseState, events: [] }
}

interface DiplomacyCandidate {
  readonly kind: DiplomaticActionKind
  readonly targetRealmId: RealmId
  readonly score: number
}

function planDiplomacyAction(
  world: World,
  realm: Realm,
): { readonly ok: true; readonly world: World; readonly events: readonly GameEvent[] } | { readonly ok: false } {
  const candidates = collectDiplomacyCandidates(world, realm.id)
  for (const candidate of candidates) {
    const result = applyDiplomacyAction(world, {
      kind: candidate.kind,
      proposingRealmId: realm.id,
      targetRealmId: candidate.targetRealmId,
    })
    if (result.ok) return result
  }
  return { ok: false }
}

function collectDiplomacyCandidates(world: World, realmId: RealmId): readonly DiplomacyCandidate[] {
  const candidates: DiplomacyCandidate[] = []

  for (const coalition of [...world.coalitions.values()].sort((a, b) => a.id.localeCompare(b.id))) {
    if ((coalition.status !== 'active' && coalition.status !== 'forming') || !coalition.memberRealmIds.includes(realmId)) {
      continue
    }
    if (!world.realms.has(coalition.targetRealmId) || isAtWar(world.wars, realmId, coalition.targetRealmId)) continue

    for (const memberRealmId of [...coalition.memberRealmIds].sort((a, b) => a.localeCompare(b))) {
      if (memberRealmId === realmId || !world.realms.has(memberRealmId)) continue
      pushCandidate(world, candidates, realmId, memberRealmId, 'alliance')
      pushCandidate(world, candidates, realmId, memberRealmId, 'non_aggression')
    }
    pushCandidate(world, candidates, realmId, coalition.targetRealmId, 'declare_war')
  }

  for (const war of [...world.wars.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const targetRealmId = getWarOpponent(war[0], realmId)
    if (targetRealmId && world.realms.has(targetRealmId)) pushCandidate(world, candidates, realmId, targetRealmId, 'peace')
  }

  for (const relation of sortedRelations(world.relations)) {
    const targetRealmId = getRelationPartner(relation, realmId)
    if (!targetRealmId || !world.realms.has(targetRealmId)) continue
    if (relation.attitude >= 35 && relation.trust >= 65) {
      pushCandidate(world, candidates, realmId, targetRealmId, 'alliance')
      pushCandidate(world, candidates, realmId, targetRealmId, 'non_aggression')
    } else if (relation.attitude <= -50 && relation.trust <= 35) {
      pushCandidate(world, candidates, realmId, targetRealmId, 'declare_war')
    }
  }

  return candidates.sort((a, b) => b.score - a.score
    || a.kind.localeCompare(b.kind)
    || a.targetRealmId.localeCompare(b.targetRealmId))
}

function pushCandidate(
  world: World,
  candidates: DiplomacyCandidate[],
  proposingRealmId: RealmId,
  targetRealmId: RealmId,
  kind: DiplomaticActionKind,
): void {
  if (hasPendingProposalForPair(world, proposingRealmId, targetRealmId)) return

  const request = { kind, proposingRealmId, targetRealmId }
  const validation = validateDiplomacyAction(world, request)
  if (!validation.ok) return

  const score = scoreDiplomacyAcceptance(world, request)
  if (score < 0) return
  candidates.push({ kind, targetRealmId, score })
}

function hasPendingProposalForPair(world: World, a: RealmId, b: RealmId): boolean {
  const key = relationKeyForRealms(a, b)
  return [...world.diplomaticProposals.values()]
    .sort((left, right) => left.id.localeCompare(right.id))
    .some(proposal => proposal.status === 'pending'
      && relationKeyForRealms(proposal.proposingRealmId, proposal.targetRealmId) === key)
}

function relationKeyForRealms(a: RealmId, b: RealmId): RelationKey {
  return [a, b].sort((left, right) => left.localeCompare(right)).join('__')
}

function getWarOpponent(key: WarKey, realmId: RealmId): RealmId | null {
  const [left, right] = key.split(':')
  if (left === realmId) return right ?? null
  if (right === realmId) return left ?? null
  return null
}

function getRelationPartner(relation: DiplomaticRelation, realmId: RealmId): RealmId | null {
  if (relation.realmAId === realmId) return relation.realmBId
  if (relation.realmBId === realmId) return relation.realmAId
  return null
}

function sortedRelations(relations: ReadonlyMap<RelationKey, DiplomaticRelation>): readonly DiplomaticRelation[] {
  return [...relations.values()].sort((a, b) => a.key.localeCompare(b.key))
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
  realmId: RealmId,
  candidate: { targetSiteId: SiteId; armyId: ArmyId },
): { world: World; events: GameEvent[] } {
  const { targetSiteId, armyId } = candidate
  const targetSite = world.sites.get(targetSiteId)
  const army = armies.get(armyId)
  if (!targetSite || !army) return { world, events: [] }

  const events: GameEvent[] = []
  let nextWorld = world
  if (targetSite.ownerId && world.realms.has(targetSite.ownerId) && !isAtWar(nextWorld.wars, realmId, targetSite.ownerId)) {
    const declaration = applyDiplomacyAction(nextWorld, {
      kind: 'declare_war',
      proposingRealmId: realmId,
      targetRealmId: targetSite.ownerId,
    })
    if (!declaration.ok) return { world: nextWorld, events }
    nextWorld = declaration.world
    events.push({
      type: 'aiDeclaredWar',
      payload: { byRealm: realmId, againstRealm: targetSite.ownerId },
    })
  }

  armies.set(armyId, {
    ...army,
    state: 'marching',
    destination: targetSiteId,
    ticksRemaining: findTravelCost(world, army.location, targetSiteId, realmId),
    source: army.location,
  })
  events.push({ type: 'aiDispatchedArmy', payload: { realmId, armyId, targetSiteId } })
  if (nextWorld !== world) events.push(...nextWorld.diplomacyHistory.slice(world.diplomacyHistory.length).map(event => ({
    type: 'diplomacyEvent',
    payload: event,
  })))

  return { world: nextWorld, events }
}
