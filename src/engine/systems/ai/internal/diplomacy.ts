import type {
  Army,
  ArmyId,
  DiplomaticActionKind,
  DiplomaticRelation,
  GameEvent,
  PersonalityArchetype,
  Realm,
  RealmId,
  RelationKey,
  SiteId,
  WarKey,
  World,
} from '~/shared/types'
import { findTravelCost } from '~/engine/systems/march'
import { isAtWar } from '~/engine/wars'
import {
  applyDiplomacyAction,
  scoreDiplomacyAcceptance,
  validateDiplomacyAction,
} from '~/engine/systems/diplomacy'
import {
  M8_ALLIANCE_PROPENSITY,
  M8_PEACE_ACCEPTANCE_THRESHOLD,
  M8_WAR_DECLARATION_BIAS,
} from '~/content/m2/balance'
import { getPersonality } from '../utility-scorer'

interface DiplomacyCandidate {
  readonly kind: DiplomaticActionKind
  readonly targetRealmId: RealmId
  readonly score: number
}

export function planDiplomacyAction(
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
      pushCandidate(
        world,
        candidates,
        realmId,
        memberRealmId,
        'alliance',
        personality
      )
      pushCandidate(
        world,
        candidates,
        realmId,
        memberRealmId,
        'non_aggression',
        personality
      )
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
      pushCandidate(
        world,
        candidates,
        realmId,
        targetRealmId,
        'non_aggression',
        personality
      )
    } else if (relation.attitude <= -50 && relation.trust <= 35) {
      pushCandidate(
        world,
        candidates,
        realmId,
        targetRealmId,
        'declare_war',
        personality
      )
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
  if (kind === 'declare_war')
    return acceptanceScore * (1 + M8_WAR_DECLARATION_BIAS[personality])
  if (kind === 'peace')
    return acceptanceScore * (1 + M8_PEACE_ACCEPTANCE_THRESHOLD[personality])
  if (kind === 'alliance' || kind === 'non_aggression') {
    return acceptanceScore * (1 + M8_ALLIANCE_PROPENSITY[personality])
  }
  return acceptanceScore
}

function hasPendingProposalForPair(world: World, a: RealmId, b: RealmId): boolean {
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

export function findCandidateTargets(
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

export function dispatchCandidate(
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
