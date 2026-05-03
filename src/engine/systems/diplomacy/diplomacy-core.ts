import type {
  DiplomaticActionKind,
  DiplomaticProposal,
  DiplomaticProposalId,
  DiplomaticRelation,
  Order,
  RealmId,
  RelationKey,
  Treaty,
  World,
} from '~/shared/types'
import {
  DIPLOMACY_ACCEPTANCE_ATTITUDE_THRESHOLD,
  DIPLOMACY_ACCEPTANCE_ATTITUDE_WEIGHT,
  DIPLOMACY_ACCEPTANCE_BASE,
  DIPLOMACY_ACCEPTANCE_EXISTING_WAR_MODIFIER,
  DIPLOMACY_ACCEPTANCE_THREAT_WEIGHT,
  DIPLOMACY_ACCEPTANCE_TREATY_CONFLICT_MODIFIER,
  DIPLOMACY_ACCEPTANCE_TRUCE_MODIFIER,
  DIPLOMACY_ACCEPTANCE_TRUST_THRESHOLD,
  DIPLOMACY_ACCEPTANCE_TRUST_WEIGHT,
  DIPLOMACY_ACTION_COSTS,
  DIPLOMACY_ATTITUDE_MAX,
  DIPLOMACY_ATTITUDE_MIN,
  DIPLOMACY_PROPOSAL_DURATION_TICKS,
  DIPLOMACY_RELATION_NEUTRAL_ATTITUDE,
  DIPLOMACY_RELATION_NEUTRAL_TRUST,
  DIPLOMACY_THREAT_ARMY_MANPOWER_DIVISOR,
  DIPLOMACY_THREAT_MANPOWER_DIVISOR,
  DIPLOMACY_THREAT_SITE_POWER,
  DIPLOMACY_TRUST_MAX,
  DIPLOMACY_TRUST_MIN,
  DIPLOMACY_ZHOU_INVESTITURE_ACCEPTANCE_MODIFIER,
  M6_ENABLED,
  M6_IDEOLOGY_DISTANCE_WEIGHT,
  M6_PRESTIGE_DIFFERENTIAL_WEIGHT,
} from '~/content/m2/balance'
import { isAtWar } from '~/engine/wars'
import { cosineSimilarity } from '~/engine/systems/culture/ideology-distance'

export const DIPLOMATIC_ACTIONS: readonly DiplomaticActionKind[] = [
  'alliance',
  'non_aggression',
  'tribute',
  'marriage',
  'envoy',
  'declare_war',
  'peace',
]

export type DiplomacyValidationReason =
  | 'unsupported_action'
  | 'same_realm'
  | 'realm_not_found'
  | 'duplicate_proposal'
  | 'current_enemy'
  | 'truce_active'
  | 'already_at_war'
  | 'not_at_war'

export interface DiplomacyActionRequest {
  readonly kind: DiplomaticActionKind
  readonly proposingRealmId: RealmId
  readonly targetRealmId: RealmId
  readonly proposalId?: DiplomaticProposalId
}

export type DiplomacyProposalOrOrder =
  | {
    readonly type: 'proposal'
    readonly relationKey: RelationKey
    readonly proposal: DiplomaticProposal
    readonly acceptanceScore: number
  }
  | {
    readonly type: 'order'
    readonly relationKey: RelationKey
    readonly order: Order
    readonly acceptanceScore: number
  }

export type DiplomacyValidationResult =
  | { readonly ok: true; readonly proposalOrOrder: DiplomacyProposalOrOrder }
  | { readonly ok: false; readonly reason: DiplomacyValidationReason }

export function relationKey(a: RealmId, b: RealmId): RelationKey {
  if (a === b) throw new Error('Realm cannot have a relation with itself')
  return [a, b].sort((left, right) => left.localeCompare(right)).join('__')
}

export function clampAttitude(value: number): number {
  return clamp(value, DIPLOMACY_ATTITUDE_MIN, DIPLOMACY_ATTITUDE_MAX)
}

export function clampTrust(value: number): number {
  return clamp(value, DIPLOMACY_TRUST_MIN, DIPLOMACY_TRUST_MAX)
}

export function clampRelation(relation: DiplomaticRelation): DiplomaticRelation {
  return {
    ...relation,
    attitude: clampAttitude(relation.attitude),
    trust: clampTrust(relation.trust),
  }
}

export function createNeutralRelation(world: World, realmAId: RealmId, realmBId: RealmId): DiplomaticRelation {
  const [lowerRealmId, higherRealmId] = sortedRealmPair(realmAId, realmBId)
  return {
    key: relationKey(realmAId, realmBId),
    realmAId: lowerRealmId,
    realmBId: higherRealmId,
    attitude: DIPLOMACY_RELATION_NEUTRAL_ATTITUDE,
    trust: DIPLOMACY_RELATION_NEUTRAL_TRUST,
    updatedAt: world.date,
  }
}

export function validateDiplomacyAction(world: World, request: DiplomacyActionRequest): DiplomacyValidationResult {
  if (!DIPLOMATIC_ACTIONS.includes(request.kind)) return { ok: false, reason: 'unsupported_action' }
  if (request.proposingRealmId === request.targetRealmId) return { ok: false, reason: 'same_realm' }
  if (!world.realms.has(request.proposingRealmId) || !world.realms.has(request.targetRealmId)) {
    return { ok: false, reason: 'realm_not_found' }
  }

  const key = relationKey(request.proposingRealmId, request.targetRealmId)
  if (hasDuplicateProposal(world, request.kind, key)) return { ok: false, reason: 'duplicate_proposal' }

  const atWar = isAtWar(world.wars, request.proposingRealmId, request.targetRealmId)
  if (request.kind === 'declare_war') {
    if (hasActiveTruce(world, key)) return { ok: false, reason: 'truce_active' }
    if (atWar) return { ok: false, reason: 'already_at_war' }
    return {
      ok: true,
      proposalOrOrder: {
        type: 'order',
        relationKey: key,
        order: { type: 'declare-war', targetRealmId: request.targetRealmId },
        acceptanceScore: scoreDiplomacyAcceptance(world, request),
      },
    }
  }

  if (request.kind === 'peace' && !atWar) return { ok: false, reason: 'not_at_war' }
  if ((request.kind === 'alliance' || request.kind === 'non_aggression') && atWar) {
    return { ok: false, reason: 'current_enemy' }
  }

  return {
    ok: true,
    proposalOrOrder: {
      type: 'proposal',
      relationKey: key,
      proposal: createDiplomaticProposal(world, request),
      acceptanceScore: scoreDiplomacyAcceptance(world, request),
    },
  }
}

export function scoreDiplomacyAcceptance(world: World, request: DiplomacyActionRequest): number {
  const key = relationKey(request.proposingRealmId, request.targetRealmId)
  const relation = world.relations.get(key)
  const attitude = relation ? clampAttitude(relation.attitude) : DIPLOMACY_ACCEPTANCE_ATTITUDE_THRESHOLD
  const trust = relation ? clampTrust(relation.trust) : DIPLOMACY_ACCEPTANCE_TRUST_THRESHOLD
  const warModifier = isAtWar(world.wars, request.proposingRealmId, request.targetRealmId)
    ? DIPLOMACY_ACCEPTANCE_EXISTING_WAR_MODIFIER
    : 0
  const truceModifier = hasActiveTruce(world, key) ? DIPLOMACY_ACCEPTANCE_TRUCE_MODIFIER : 0
  const treatyConflictModifier = hasTreatyConflict(world, request.kind, key)
    ? DIPLOMACY_ACCEPTANCE_TREATY_CONFLICT_MODIFIER
    : 0
  const threatModifier = getThreatModifier(world, request)
  const investitureModifier = hasActiveZhouInvestiture(world, request.proposingRealmId)
    ? DIPLOMACY_ZHOU_INVESTITURE_ACCEPTANCE_MODIFIER
    : 0
  const actionCost = DIPLOMACY_ACTION_COSTS[request.kind]

  const baseScore = DIPLOMACY_ACCEPTANCE_BASE
    + (attitude - DIPLOMACY_ACCEPTANCE_ATTITUDE_THRESHOLD) * DIPLOMACY_ACCEPTANCE_ATTITUDE_WEIGHT
    + (trust - DIPLOMACY_ACCEPTANCE_TRUST_THRESHOLD) * DIPLOMACY_ACCEPTANCE_TRUST_WEIGHT
    + warModifier
    + truceModifier
    + treatyConflictModifier
    + threatModifier
    + investitureModifier
    - actionCost

  const m6Modifier = getM6Modifier(world, request)
  const score = m6Modifier === 0 ? baseScore : Math.max(0, Math.min(100, baseScore + m6Modifier))

  return roundScore(score)
}

function getM6Modifier(world: World, request: DiplomacyActionRequest): number {
  if (!M6_ENABLED) return 0
  if (request.kind === 'declare_war') return 0

  const proposerRealm = world.realms.get(request.proposingRealmId)
  const targetRealm = world.realms.get(request.targetRealmId)
  if (!proposerRealm || !targetRealm) return 0

  const proposerPrestige = proposerRealm.prestige ?? 0
  const targetPrestige = targetRealm.prestige ?? 0
  const prestigeDelta = M6_PRESTIGE_DIFFERENTIAL_WEIGHT * (proposerPrestige - targetPrestige)

  const proposerLean = proposerRealm.ideologyLean
  const targetLean = targetRealm.ideologyLean
  if (!proposerLean || !targetLean) return prestigeDelta

  const similarity = cosineSimilarity(proposerLean, targetLean)
  const ideologyDelta = M6_IDEOLOGY_DISTANCE_WEIGHT * similarity

  return prestigeDelta + ideologyDelta
}

function createDiplomaticProposal(world: World, request: DiplomacyActionRequest): DiplomaticProposal {
  return {
    id: request.proposalId ?? createProposalId(request, world.tick),
    kind: request.kind,
    proposingRealmId: request.proposingRealmId,
    targetRealmId: request.targetRealmId,
    status: 'pending',
    proposedAt: world.date,
    proposedAtTick: world.tick,
    expiresAt: world.date,
    expiresAtTick: world.tick + DIPLOMACY_PROPOSAL_DURATION_TICKS,
    resolvedAt: null,
    resolvedAtTick: null,
    treatyId: null,
  }
}

function createProposalId(request: DiplomacyActionRequest, tick: number): DiplomaticProposalId {
  return `diplomacy_${request.kind}_${relationKey(request.proposingRealmId, request.targetRealmId)}_${tick}`
}

function sortedRealmPair(a: RealmId, b: RealmId): readonly [RealmId, RealmId] {
  return a.localeCompare(b) <= 0 ? [a, b] : [b, a]
}

function hasDuplicateProposal(world: World, kind: DiplomaticActionKind, key: RelationKey): boolean {
  return [...world.diplomaticProposals.values()]
    .sort((a, b) => a.id.localeCompare(b.id))
    .some(proposal => proposal.status === 'pending'
      && proposal.kind === kind
      && relationKey(proposal.proposingRealmId, proposal.targetRealmId) === key)
}

function hasActiveTruce(world: World, key: RelationKey): boolean {
  return getActiveTreaties(world, key).some(treaty => treaty.kind === 'truce')
}

function hasTreatyConflict(world: World, kind: DiplomaticActionKind, key: RelationKey): boolean {
  if (kind === 'envoy' || kind === 'declare_war' || kind === 'peace') return false
  return getActiveTreaties(world, key).some(treaty => treaty.kind === kind || treaty.kind === 'truce')
}

function getActiveTreaties(world: World, key: RelationKey): readonly Treaty[] {
  return [...world.treaties.values()]
    .sort((a, b) => a.id.localeCompare(b.id))
    .filter(treaty => treaty.status === 'active'
      && (treaty.expiresAtTick === null || treaty.expiresAtTick > world.tick)
      && relationKey(treaty.realmAId, treaty.realmBId) === key)
}

function getThreatModifier(world: World, request: DiplomacyActionRequest): number {
  const proposerPower = getRealmThreatPower(world, request.proposingRealmId)
  const targetPower = getRealmThreatPower(world, request.targetRealmId)
  const threat = proposerPower - targetPower
  if (request.kind === 'tribute' || request.kind === 'peace' || request.kind === 'non_aggression') {
    return threat * DIPLOMACY_ACCEPTANCE_THREAT_WEIGHT
  }
  if (request.kind === 'declare_war') return -threat * DIPLOMACY_ACCEPTANCE_THREAT_WEIGHT
  return threat > 0 ? threat * DIPLOMACY_ACCEPTANCE_THREAT_WEIGHT : 0
}

function getRealmThreatPower(world: World, realmId: RealmId): number {
  const sitePower = [...world.sites.values()]
    .sort((a, b) => a.id.localeCompare(b.id))
    .filter(site => site.ownerId === realmId).length * DIPLOMACY_THREAT_SITE_POWER
  const armyPower = [...world.armies.values()]
    .sort((a, b) => a.id.localeCompare(b.id))
    .filter(army => army.realmId === realmId)
    .reduce((sum, army) => sum + army.manpower / DIPLOMACY_THREAT_ARMY_MANPOWER_DIVISOR, 0)
  const realm = world.realms.get(realmId)
  const manpowerPower = (realm?.stats?.manpowerPool ?? 0) / DIPLOMACY_THREAT_MANPOWER_DIVISOR
  return sitePower + armyPower + manpowerPower
}

function hasActiveZhouInvestiture(world: World, realmId: RealmId): boolean {
  const investiture = world.zhouInvestiture.get(realmId)
  if (!investiture || investiture.source !== 'zhou') return false
  return investiture.expiresAtTick === null || investiture.expiresAtTick > world.tick
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function roundScore(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000
}
