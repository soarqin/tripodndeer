import type {
  DiplomacyEvent,
  DiplomacyEventId,
  DiplomaticActionKind,
  DiplomaticProposal,
  DiplomaticProposalStatus,
  DiplomaticRelation,
  DiplomaticTreatyKind,
  GameEvent,
  RelationKey,
  RNGState,
  Treaty,
  TreatyId,
  WarKey,
  WarState,
  World,
} from '~/shared/types'
import {
  DIPLOMACY_NON_AGGRESSION_DURATION_TICKS,
  DIPLOMACY_RELATION_DRIFT_DELTA,
  DIPLOMACY_RELATION_DRIFT_INTERVAL_TICKS,
  DIPLOMACY_RELATION_NEUTRAL_ATTITUDE,
  DIPLOMACY_RELATION_NEUTRAL_TRUST,
  DIPLOMACY_TRUCE_DURATION_TICKS,
} from '~/content/m2/balance'
import { endWar, warKey } from '~/engine/wars'
import { updateCoalitionPressure } from './coalitions'
import { clampRelation, relationKey, scoreDiplomacyAcceptance } from './diplomacy-core'

interface LifecycleState {
  readonly proposals: Map<string, DiplomaticProposal>
  readonly treaties: Map<string, Treaty>
  wars: Map<WarKey, WarState>
  readonly relations: Map<RelationKey, DiplomaticRelation>
  readonly history: DiplomacyEvent[]
  readonly events: GameEvent[]
}

const ACCEPTANCE_THRESHOLD = 0

export function diplomacyLifecycleStep(
  world: World,
  rng: RNGState,
): { world: World; nextRng: RNGState; events: readonly GameEvent[] } {
  const state: LifecycleState = {
    proposals: new Map(world.diplomaticProposals),
    treaties: new Map(world.treaties),
    wars: new Map(world.wars),
    relations: new Map(world.relations),
    history: [...world.diplomacyHistory],
    events: [],
  }

  resolveProposals(world, state)
  updateTreaties(world, state)
  driftRelations(world, state)

  const nextWorld: World = {
    ...world,
    diplomaticProposals: state.proposals,
    treaties: state.treaties,
    wars: state.wars,
    relations: state.relations,
    diplomacyHistory: state.history,
  }
  const coalitionResult = updateCoalitionPressure(nextWorld)

  return { world: coalitionResult.world, nextRng: rng, events: [...state.events, ...coalitionResult.events] }
}

function resolveProposals(world: World, state: LifecycleState): void {
  for (const proposal of sortedProposals(state.proposals)) {
    if (proposal.status !== 'pending') continue

    if (!world.realms.has(proposal.proposingRealmId) || !world.realms.has(proposal.targetRealmId)) {
      removeProposal(world, state, proposal, 'cancelled')
      continue
    }

    if (world.tick >= proposal.expiresAtTick) {
      removeProposal(world, state, proposal, 'expired')
      continue
    }

    const score = scoreDiplomacyAcceptance(worldWithLifecycleState(world, state), {
      kind: proposal.kind,
      proposingRealmId: proposal.proposingRealmId,
      targetRealmId: proposal.targetRealmId,
      proposalId: proposal.id,
    })

    if (score >= ACCEPTANCE_THRESHOLD) {
      acceptProposal(world, state, proposal)
    } else {
      removeProposal(world, state, proposal, 'rejected')
    }
  }
}

function updateTreaties(world: World, state: LifecycleState): void {
  for (const treaty of sortedTreaties(state.treaties)) {
    if (treaty.status !== 'active') continue

    if (!world.realms.has(treaty.realmAId) || !world.realms.has(treaty.realmBId)) {
      endTreaty(world, state, treaty, 'cancelled')
      continue
    }

    if (treaty.expiresAtTick !== null && world.tick >= treaty.expiresAtTick) {
      endTreaty(world, state, treaty, 'expired')
    }
  }
}

function driftRelations(world: World, state: LifecycleState): void {
  if (world.tick === 0 || world.tick % DIPLOMACY_RELATION_DRIFT_INTERVAL_TICKS !== 0) return

  for (const relation of sortedRelations(state.relations)) {
    if (!world.realms.has(relation.realmAId) || !world.realms.has(relation.realmBId)) continue

    const next = clampRelation({
      ...relation,
      attitude: driftValue(
        relation.attitude,
        DIPLOMACY_RELATION_NEUTRAL_ATTITUDE,
        DIPLOMACY_RELATION_DRIFT_DELTA,
      ),
      trust: driftValue(
        relation.trust,
        DIPLOMACY_RELATION_NEUTRAL_TRUST,
        DIPLOMACY_RELATION_DRIFT_DELTA,
      ),
      updatedAt: world.date,
    })

    if (next.attitude === relation.attitude && next.trust === relation.trust) continue
    state.relations.set(relation.key, next)
    pushHistory(world, state, {
      kind: 'relation_changed',
      actorRealmId: relation.realmAId,
      targetRealmId: relation.realmBId,
      relationKey: relation.key,
    })
  }
}

function acceptProposal(world: World, state: LifecycleState, proposal: DiplomaticProposal): void {
  const treatyKind = treatyKindForProposal(proposal.kind)
  const treaty = proposal.kind === 'peace'
    ? createOrRefreshTruce(world, state, proposal)
    : createTreaty(world, proposal, treatyKind, createTreatyId(proposal, treatyKind, world.tick))
  state.treaties.set(treaty.id, treaty)
  state.proposals.delete(proposal.id)

  if (proposal.kind === 'peace') {
    const key = warKey(proposal.proposingRealmId, proposal.targetRealmId)
    state.wars = new Map(endWar(state.wars, key))
  }

  pushHistory(world, state, {
    kind: 'proposal_resolved',
    actorRealmId: proposal.proposingRealmId,
    targetRealmId: proposal.targetRealmId,
    proposalId: proposal.id,
  })
  pushHistory(world, state, {
    kind: 'treaty_created',
    actorRealmId: proposal.proposingRealmId,
    targetRealmId: proposal.targetRealmId,
    proposalId: proposal.id,
    treatyId: treaty.id,
  })
}

function createOrRefreshTruce(world: World, state: LifecycleState, proposal: DiplomaticProposal): Treaty {
  const existing = sortedTreaties(state.treaties).find(treaty => treaty.kind === 'truce'
    && treaty.status === 'active'
    && relationKey(treaty.realmAId, treaty.realmBId) === relationKey(proposal.proposingRealmId, proposal.targetRealmId))
  if (!existing) return createTreaty(world, proposal, 'truce', createTreatyId(proposal, 'truce', world.tick))

  return {
    ...existing,
    signedAt: world.date,
    signedAtTick: world.tick,
    expiresAt: world.date,
    expiresAtTick: world.tick + DIPLOMACY_TRUCE_DURATION_TICKS,
    endedAt: null,
    endedAtTick: null,
    sourceProposalId: proposal.id,
  }
}

function removeProposal(
  world: World,
  state: LifecycleState,
  proposal: DiplomaticProposal,
  status: Exclude<DiplomaticProposalStatus, 'pending' | 'accepted'>,
): void {
  state.proposals.delete(proposal.id)
  pushHistory(world, state, {
    kind: 'proposal_resolved',
    actorRealmId: proposal.proposingRealmId,
    targetRealmId: proposal.targetRealmId,
    proposalId: proposal.id,
  }, status)
}

function endTreaty(
  world: World,
  state: LifecycleState,
  treaty: Treaty,
  status: 'expired' | 'cancelled',
): void {
  const ended: Treaty = {
    ...treaty,
    status,
    endedAt: world.date,
    endedAtTick: world.tick,
  }
  state.treaties.set(treaty.id, ended)
  pushHistory(world, state, {
    kind: 'treaty_ended',
    actorRealmId: treaty.realmAId,
    targetRealmId: treaty.realmBId,
    treatyId: treaty.id,
  })
}

function createTreaty(
  world: World,
  proposal: DiplomaticProposal,
  kind: DiplomaticTreatyKind,
  id: TreatyId,
): Treaty {
  const duration = treatyExpiresAt(kind)
  return {
    id,
    kind,
    realmAId: proposal.proposingRealmId,
    realmBId: proposal.targetRealmId,
    status: 'active',
    signedAt: world.date,
    signedAtTick: world.tick,
    expiresAt: duration === null ? null : world.date,
    expiresAtTick: duration === null ? null : world.tick + duration,
    endedAt: null,
    endedAtTick: null,
    sourceProposalId: proposal.id,
  }
}

function worldWithLifecycleState(world: World, state: LifecycleState): World {
  return {
    ...world,
    diplomaticProposals: state.proposals,
    treaties: state.treaties,
    relations: state.relations,
    diplomacyHistory: state.history,
  }
}

function treatyKindForProposal(kind: DiplomaticActionKind): DiplomaticTreatyKind {
  if (kind === 'peace') return 'truce'
  if (kind === 'envoy' || kind === 'declare_war') return 'non_aggression'
  return kind
}

function treatyExpiresAt(kind: DiplomaticTreatyKind): number | null {
  if (kind === 'truce') return DIPLOMACY_TRUCE_DURATION_TICKS
  if (kind === 'non_aggression') return DIPLOMACY_NON_AGGRESSION_DURATION_TICKS
  return null
}

function createTreatyId(
  proposal: DiplomaticProposal,
  kind: DiplomaticTreatyKind,
  tick: number,
): TreatyId {
  return `treaty_${kind}_${relationKey(proposal.proposingRealmId, proposal.targetRealmId)}_${proposal.id}_${tick}`
}

function driftValue(value: number, neutral: number, delta: number): number {
  if (value < neutral) return Math.min(neutral, value + delta)
  if (value > neutral) return Math.max(neutral, value - delta)
  return value
}

function pushHistory(
  world: World,
  state: LifecycleState,
  event: Omit<DiplomacyEvent, 'id' | 'occurredAt'>,
  idSuffix = '',
): void {
  const nextEvent: DiplomacyEvent = {
    id: createHistoryId(world.tick, state.history.length, event, idSuffix),
    occurredAt: world.date,
    ...event,
  }
  state.history.push(nextEvent)
  state.events.push({ type: 'diplomacyEvent', payload: nextEvent })
}

function createHistoryId(
  tick: number,
  index: number,
  event: Omit<DiplomacyEvent, 'id' | 'occurredAt'>,
  suffix: string,
): DiplomacyEventId {
  const subject = event.proposalId ?? event.treatyId ?? event.relationKey ?? 'world'
  const suffixPart = suffix === '' ? '' : `_${suffix}`
  return `diplomacy_history_${tick}_${event.kind}_${subject}${suffixPart}_${index}`
}

function sortedProposals(proposals: ReadonlyMap<string, DiplomaticProposal>): readonly DiplomaticProposal[] {
  return [...proposals.values()].sort((a, b) => a.id.localeCompare(b.id))
}

function sortedTreaties(treaties: ReadonlyMap<string, Treaty>): readonly Treaty[] {
  return [...treaties.values()].sort((a, b) => a.id.localeCompare(b.id))
}

function sortedRelations(relations: ReadonlyMap<RelationKey, DiplomaticRelation>): readonly DiplomaticRelation[] {
  return [...relations.values()].sort((a, b) => a.key.localeCompare(b.key))
}
