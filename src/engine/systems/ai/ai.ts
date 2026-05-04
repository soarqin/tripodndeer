import type {
  AIEspionageOption,
  Army,
  ArmyId,
  DiplomaticActionKind,
  DiplomaticRelation,
  EspionageActionKind,
  GameEvent,
  GeneralId,
  PersonalityArchetype,
  Realm,
  RealmId,
  RelationKey,
  RNGState,
  SiteId,
  SpyMission,
  WarKey,
  World,
} from '~/shared/types'
import { ESPIONAGE_ACTION_KINDS } from '~/shared/types'
import { findTravelCost } from '~/engine/systems/march'
import { nextRng } from '~/engine/random'
import { startSiege } from '~/engine/systems/siege'
import { isAtWar } from '~/engine/wars'
import {
  applyDiplomacyAction,
  scoreDiplomacyAcceptance,
  validateDiplomacyAction,
} from '~/engine/systems/diplomacy'
import { scoreEspionageOption } from '~/engine/systems/espionage/score-espionage'
import {
  M8_ALLIANCE_PROPENSITY,
  M8_PEACE_ACCEPTANCE_THRESHOLD,
  M8_WAR_DECLARATION_BIAS,
  M7_DISCORD_DURATION_TICKS,
  M7_ENABLED,
  M7_RECON_DURATION_TICKS,
  M7_RUMOR_DURATION_TICKS,
} from '~/content/m2/balance'
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
  rng: RNGState
): { world: World; nextRng: RNGState; events: readonly GameEvent[] } {
  if (world.tick % 3 !== 0) {
    return { world, nextRng: rng, events: [] }
  }

  const events: GameEvent[] = []
  let currentRng = rng
  let phaseState = createAiPhaseState(world)

  for (const realm of [...world.realms.values()].sort((a, b) =>
    a.id.localeCompare(b.id)
  )) {
    if (realm.id === world.playerRealmId) continue

    const diplomacyWorld = worldWithAiPhaseState(world, phaseState)
    const diplomacy = planDiplomacyAction(diplomacyWorld, realm)
    if (diplomacy.ok) {
      phaseState = phaseStateWithDiplomacyResult(phaseState, diplomacy.world)
      events.push(...diplomacy.events)
    }

    if (M7_ENABLED) {
      const espionageWorld = worldWithAiPhaseState(world, phaseState)
      const espionage = planEspionageAction(espionageWorld, realm, currentRng)
      if (espionage.ok) {
        phaseState = phaseStateWithEspionageResult(phaseState, espionage.world)
        events.push(...espionage.events)
        currentRng = espionage.nextRng
      }
    }

    const roll = nextRng(currentRng)
    currentRng = roll.nextState

    if (roll.value >= 0.2) continue

    const options = collectTacticalOptions(world, phaseState, realm.id)

    // If there are no concrete options (only idle) skip the action entirely so
    // we keep the historical "no candidate → no events / no extra rng draws" contract.
    if (options.length === 1) continue

    const personality = getPersonality(world, realm.id)
    const { action, nextRng: pickRng } = pickAction(
      options,
      personality,
      currentRng
    )
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
  readonly spyMissions: World['spyMissions']
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
    spyMissions: world.spyMissions,
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
    spyMissions: phaseState.spyMissions,
  }
}

function phaseStateWithDiplomacyResult(
  phaseState: AiPhaseState,
  world: World
): AiPhaseState {
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

function phaseStateWithEspionageResult(
  phaseState: AiPhaseState,
  world: World
): AiPhaseState {
  return {
    ...phaseState,
    spyMissions: world.spyMissions,
  }
}

function phaseStateWithBattlefieldResult(
  phaseState: AiPhaseState,
  world: World
): AiPhaseState {
  return {
    ...phaseState,
    armies: new Map(world.armies),
    sieges: new Map(world.sieges),
    sites: new Map(world.sites),
  }
}

function collectTacticalOptions(
  world: World,
  phaseState: AiPhaseState,
  realmId: RealmId
): AIOption[] {
  const candidateTargets = findCandidateTargets(
    world,
    phaseState.armies,
    realmId
  )

  const options: AIOption[] = candidateTargets.map((candidate) => ({
    kind: 'attack',
    targetSiteId: candidate.targetSiteId,
    armyId: candidate.armyId,
    score: 50,
  }))
  options.push({ kind: 'idle', score: 10 })

  const worldSnapshot = worldWithAiPhaseState(world, phaseState)
  for (const army of [...phaseState.armies.values()]
    .filter((a) => a.realmId === realmId)
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
  action: AIOption
): {
  readonly phaseState: AiPhaseState
  readonly events: readonly GameEvent[]
} {
  if (!action.targetSiteId || !action.armyId) return { phaseState, events: [] }

  if (action.kind === 'attack' || action.kind === 'cut-supply') {
    const dispatch = dispatchCandidate(
      worldWithAiPhaseState(world, phaseState),
      phaseState.armies,
      realmId,
      {
        targetSiteId: action.targetSiteId,
        armyId: action.armyId,
      }
    )
    return {
      phaseState: phaseStateWithDiplomacyResult(phaseState, dispatch.world),
      events: dispatch.events,
    }
  }

  if (action.kind === 'siege-continue') {
    const newWorld = startSiege(
      worldWithAiPhaseState(world, phaseState),
      action.armyId,
      action.targetSiteId
    )
    return {
      phaseState: phaseStateWithBattlefieldResult(phaseState, newWorld),
      events: [
        {
          type: 'aiStartedSiege',
          payload: {
            realmId,
            armyId: action.armyId,
            siteId: action.targetSiteId,
          },
        },
      ],
    }
  }

  if (action.kind === 'retreat') {
    const army = phaseState.armies.get(action.armyId)
    if (!army) return { phaseState, events: [] }
    phaseState.armies.set(action.armyId, {
      ...army,
      state: 'retreating',
      destination: action.targetSiteId,
      ticksRemaining: findTravelCost(
        world,
        army.location,
        action.targetSiteId,
        realmId
      ),
      source: army.location,
    })
    return {
      phaseState,
      events: [
        {
          type: 'aiRetreatedArmy',
          payload: {
            realmId,
            armyId: action.armyId,
            targetSiteId: action.targetSiteId,
          },
        },
      ],
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
  realm: Realm
):
  | {
      readonly ok: true
      readonly world: World
      readonly events: readonly GameEvent[]
    }
  | { readonly ok: false } {
  const personality = getPersonality(world, realm.id)
  const candidates = collectDiplomacyCandidates(world, realm.id, personality)
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

function collectDiplomacyCandidates(
  world: World,
  realmId: RealmId,
  personality: PersonalityArchetype
): readonly DiplomacyCandidate[] {
  const candidates: DiplomacyCandidate[] = []

  for (const coalition of [...world.coalitions.values()].sort((a, b) =>
    a.id.localeCompare(b.id)
  )) {
    if (
      (coalition.status !== 'active' && coalition.status !== 'forming') ||
      !coalition.memberRealmIds.includes(realmId)
    ) {
      continue
    }
    if (
      !world.realms.has(coalition.targetRealmId) ||
      isAtWar(world.wars, realmId, coalition.targetRealmId)
    )
      continue

    for (const memberRealmId of [...coalition.memberRealmIds].sort((a, b) =>
      a.localeCompare(b)
    )) {
      if (memberRealmId === realmId || !world.realms.has(memberRealmId))
        continue
      pushCandidate(world, candidates, realmId, memberRealmId, 'alliance', personality)
      pushCandidate(world, candidates, realmId, memberRealmId, 'non_aggression', personality)
    }
    pushCandidate(
      world,
      candidates,
      realmId,
      coalition.targetRealmId,
      'declare_war',
      personality
    )
  }

  for (const war of [...world.wars.entries()].sort(([a], [b]) =>
    a.localeCompare(b)
  )) {
    const targetRealmId = getWarOpponent(war[0], realmId)
    if (targetRealmId && world.realms.has(targetRealmId))
      pushCandidate(world, candidates, realmId, targetRealmId, 'peace', personality)
  }

  for (const relation of sortedRelations(world.relations)) {
    const targetRealmId = getRelationPartner(relation, realmId)
    if (!targetRealmId || !world.realms.has(targetRealmId)) continue
    if (relation.attitude >= 35 && relation.trust >= 65) {
      pushCandidate(world, candidates, realmId, targetRealmId, 'alliance', personality)
      pushCandidate(world, candidates, realmId, targetRealmId, 'non_aggression', personality)
    } else if (relation.attitude <= -50 && relation.trust <= 35) {
      pushCandidate(world, candidates, realmId, targetRealmId, 'declare_war', personality)
    }
  }

  return candidates.sort(
    (a, b) =>
      b.score - a.score ||
      a.kind.localeCompare(b.kind) ||
      a.targetRealmId.localeCompare(b.targetRealmId)
  )
}

function pushCandidate(
  world: World,
  candidates: DiplomacyCandidate[],
  proposingRealmId: RealmId,
  targetRealmId: RealmId,
  kind: DiplomaticActionKind,
  personality: PersonalityArchetype
): void {
  if (hasPendingProposalForPair(world, proposingRealmId, targetRealmId)) return

  const request = { kind, proposingRealmId, targetRealmId }
  const validation = validateDiplomacyAction(world, request)
  if (!validation.ok) return

  const receiverPersonality = getPersonality(world, targetRealmId)
  const acceptanceScore = scoreDiplomacyAcceptance(world, request, receiverPersonality)
  const score = scoreDiplomacyCandidate(acceptanceScore, kind, personality)
  if (score < 0) return
  candidates.push({ kind, targetRealmId, score })
}

function scoreDiplomacyCandidate(
  acceptanceScore: number,
  kind: DiplomaticActionKind,
  personality: PersonalityArchetype
): number {
  if (kind === 'declare_war') return acceptanceScore * (1 + M8_WAR_DECLARATION_BIAS[personality])
  if (kind === 'peace') return acceptanceScore * (1 + M8_PEACE_ACCEPTANCE_THRESHOLD[personality])
  if (kind === 'alliance' || kind === 'non_aggression') {
    return acceptanceScore * (1 + M8_ALLIANCE_PROPENSITY[personality])
  }
  return acceptanceScore
}

function hasPendingProposalForPair(
  world: World,
  a: RealmId,
  b: RealmId
): boolean {
  const key = relationKeyForRealms(a, b)
  return [...world.diplomaticProposals.values()]
    .sort((left, right) => left.id.localeCompare(right.id))
    .some(
      (proposal) =>
        proposal.status === 'pending' &&
        relationKeyForRealms(
          proposal.proposingRealmId,
          proposal.targetRealmId
        ) === key
    )
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

function getRelationPartner(
  relation: DiplomaticRelation,
  realmId: RealmId
): RealmId | null {
  if (relation.realmAId === realmId) return relation.realmBId
  if (relation.realmBId === realmId) return relation.realmAId
  return null
}

function sortedRelations(
  relations: ReadonlyMap<RelationKey, DiplomaticRelation>
): readonly DiplomaticRelation[] {
  return [...relations.values()].sort((a, b) => a.key.localeCompare(b.key))
}

function findCandidateTargets(
  world: World,
  armies: ReadonlyMap<ArmyId, Army>,
  realmId: RealmId
): Array<{ targetSiteId: SiteId; armyId: ArmyId }> {
  const candidateTargets: Array<{ targetSiteId: SiteId; armyId: ArmyId }> = []
  const idleArmies = [...armies.values()]
    .filter((army) => army.realmId === realmId && army.state === 'idle')
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
  candidate: { targetSiteId: SiteId; armyId: ArmyId }
): { world: World; events: GameEvent[] } {
  const { targetSiteId, armyId } = candidate
  const targetSite = world.sites.get(targetSiteId)
  const army = armies.get(armyId)
  if (!targetSite || !army) return { world, events: [] }

  const events: GameEvent[] = []
  let nextWorld = world
  if (
    targetSite.ownerId &&
    world.realms.has(targetSite.ownerId) &&
    !isAtWar(nextWorld.wars, realmId, targetSite.ownerId)
  ) {
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
  events.push({
    type: 'aiDispatchedArmy',
    payload: { realmId, armyId, targetSiteId },
  })
  if (nextWorld !== world)
    events.push(
      ...nextWorld.diplomacyHistory
        .slice(world.diplomacyHistory.length)
        .map((event) => ({
          type: 'diplomacyEvent',
          payload: event,
        }))
    )

  return { world: nextWorld, events }
}

function computeEspionageBaseScore(
  _world: World,
  _realm: Realm,
  _targetRealm: Realm,
  _action: EspionageActionKind
): number {
  return 50
}

function getMissionDuration(action: EspionageActionKind): number {
  switch (action) {
    case 'reconnaissance':
      return M7_RECON_DURATION_TICKS
    case 'rumor':
      return M7_RUMOR_DURATION_TICKS
    case 'discord':
      return M7_DISCORD_DURATION_TICKS
    case 'counter_intel':
      return M7_RECON_DURATION_TICKS
  }
}

function pickDiscordTarget(
  world: World,
  targetRealmId: RealmId
): GeneralId | null {
  const candidates = [...world.generals.values()]
    .filter((g) => g.realmId === targetRealmId && g.specialty !== 'spy')
    .sort((a, b) => a.id.localeCompare(b.id))
  return candidates[0]?.id ?? null
}

export function planEspionageAction(
  world: World,
  realm: Realm,
  rng: RNGState
): { ok: boolean; world: World; events: GameEvent[]; nextRng: RNGState } {
  if (!M7_ENABLED) return { ok: false, world, events: [], nextRng: rng }

  const spyGeneral = [...world.generals.values()]
    .sort((a, b) => a.id.localeCompare(b.id))
    .find((g) => g.realmId === realm.id && g.specialty === 'spy')
  if (!spyGeneral) return { ok: false, world, events: [], nextRng: rng }

  const hasActiveMission = [...world.spyMissions.values()].some(
    (m) => m.spyRealmId === realm.id && m.status === 'in_progress'
  )
  if (hasActiveMission) return { ok: false, world, events: [], nextRng: rng }

  const personality = getPersonality(world, realm.id)

  const candidates: AIEspionageOption[] = []
  const sortedRealms = [...world.realms.values()].sort((a, b) =>
    a.id.localeCompare(b.id)
  )
  for (const targetRealm of sortedRealms) {
    if (targetRealm.id === realm.id) continue
    for (const action of ESPIONAGE_ACTION_KINDS) {
      if (action === 'counter_intel') continue
      const baseScore = computeEspionageBaseScore(
        world,
        realm,
        targetRealm,
        action
      )
      candidates.push({
        kind: action,
        spyRealmId: realm.id,
        targetRealmId: targetRealm.id,
        score: baseScore,
      })
    }
  }

  if (candidates.length === 0)
    return { ok: false, world, events: [], nextRng: rng }

  const scored: AIEspionageOption[] = candidates.map((c) => ({
    ...c,
    score: scoreEspionageOption(c, personality),
  }))

  scored.sort((a, b) => {
    const sa = a.score ?? 0
    const sb = b.score ?? 0
    if (sb !== sa) return sb - sa
    if (a.kind !== b.kind) return a.kind.localeCompare(b.kind)
    return a.targetRealmId.localeCompare(b.targetRealmId)
  })

  const best = scored[0]!
  if ((best.score ?? 0) <= 0)
    return { ok: false, world, events: [], nextRng: rng }

  const duration = getMissionDuration(best.kind)
  const missionId = `mission_${realm.id}_${world.tick}`
  const mission: SpyMission = {
    id: missionId,
    spyGeneralId: spyGeneral.id,
    spyRealmId: realm.id,
    targetRealmId: best.targetRealmId,
    action: best.kind,
    startTick: world.tick,
    resolveTick: world.tick + duration,
    status: 'in_progress',
    targetGeneralId:
      best.kind === 'discord'
        ? pickDiscordTarget(world, best.targetRealmId)
        : null,
  }

  const newMissions = new Map(world.spyMissions)
  newMissions.set(missionId, mission)

  return {
    ok: true,
    world: { ...world, spyMissions: newMissions },
    events: [],
    nextRng: rng,
  }
}
