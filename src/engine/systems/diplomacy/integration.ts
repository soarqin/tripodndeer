import type {
  DiplomaticTreatyKind,
  GameEvent,
  World,
} from '~/shared/types'
import { DIPLOMACY_BETRAYAL_TRUST_DELTA } from '~/content/m2/balance'
import { declareWarWithCasus } from '~/engine/wars'
import { updateCoalitionPressure } from './coalitions'
import {
  clampRelation,
  createNeutralRelation,
  relationKey,
  type DiplomacyActionRequest,
  type DiplomacyValidationReason,
  validateDiplomacyAction,
} from './diplomacy-core'
import { appendDiplomacyHistory } from './history'
import { applyThirdPartyReactions } from './reactions'

type DiplomacyIntegrationResult =
  | { readonly ok: true; readonly world: World; readonly events: readonly GameEvent[] }
  | { readonly ok: false; readonly world: World; readonly reason: DiplomacyValidationReason; readonly events: readonly GameEvent[] }

const WAR_CANCELLED_TREATIES: readonly DiplomaticTreatyKind[] = [
  'alliance',
  'non_aggression',
  'marriage',
  'tribute',
]

export function applyDiplomacyAction(world: World, request: DiplomacyActionRequest): DiplomacyIntegrationResult {
  const validation = validateDiplomacyAction(world, request)
  if (!validation.ok) return { ok: false, world, reason: validation.reason, events: [] }

  if (validation.proposalOrOrder.type === 'proposal') {
    const diplomaticProposals = new Map(world.diplomaticProposals)
    diplomaticProposals.set(validation.proposalOrOrder.proposal.id, validation.proposalOrOrder.proposal)
    const { history, events } = appendDiplomacyHistory({ ...world, diplomaticProposals }, world.diplomacyHistory, [], {
      kind: 'proposal_created',
      actorRealmId: request.proposingRealmId,
      targetRealmId: request.targetRealmId,
      proposalId: validation.proposalOrOrder.proposal.id,
      relationKey: validation.proposalOrOrder.relationKey,
    })
    return {
      ok: true,
      world: { ...world, diplomaticProposals, diplomacyHistory: history },
      events,
    }
  }

  const wars = declareWarWithCasus(
    world.wars,
    request.proposingRealmId,
    request.targetRealmId,
    validation.proposalOrOrder.order.casusBelli ?? null,
    world.date,
  )
  const nextWorld: World = { ...world, wars }
  const events: GameEvent[] = []
  let history = [...world.diplomacyHistory]

  const declared = appendDiplomacyHistory(nextWorld, history, events, {
    kind: 'war_declared',
    actorRealmId: request.proposingRealmId,
    targetRealmId: request.targetRealmId,
    relationKey: validation.proposalOrOrder.relationKey,
  })
  history = declared.history

  const cancellation = cancelBelligerentTreaties({ ...nextWorld, diplomacyHistory: history }, request, declared.events)
  const reactions = applyThirdPartyReactions(cancellation.world, {
    kind: 'war_declared',
    actorRealmId: request.proposingRealmId,
    targetRealmId: request.targetRealmId,
  })
  const coalitions = updateCoalitionPressure(reactions.world)
  return {
    ok: true,
    world: coalitions.world,
    events: [...cancellation.events, ...reactions.events, ...coalitions.events],
  }
}

function cancelBelligerentTreaties(
  world: World,
  request: DiplomacyActionRequest,
  events: GameEvent[],
): { readonly world: World; readonly events: readonly GameEvent[] } {
  const key = relationKey(request.proposingRealmId, request.targetRealmId)
  const treaties = new Map(world.treaties)
  const relations = new Map(world.relations)
  let history = [...world.diplomacyHistory]
  let betrayalTreatyId: string | null = null

  for (const treaty of [...world.treaties.values()].sort((a, b) => a.id.localeCompare(b.id))) {
    if (treaty.status !== 'active') continue
    if (!WAR_CANCELLED_TREATIES.includes(treaty.kind)) continue
    if (relationKey(treaty.realmAId, treaty.realmBId) !== key) continue

    treaties.set(treaty.id, {
      ...treaty,
      status: 'cancelled',
      endedAt: world.date,
      endedAtTick: world.tick,
    })
    betrayalTreatyId ??= treaty.id
    const pushed = appendDiplomacyHistory({ ...world, treaties, diplomacyHistory: history }, history, events, {
      kind: 'treaty_ended',
      actorRealmId: request.proposingRealmId,
      targetRealmId: request.targetRealmId,
      treatyId: treaty.id,
      relationKey: key,
    })
    history = pushed.history
  }

  if (betrayalTreatyId !== null) {
    const current = relations.get(key) ?? createNeutralRelation(world, request.proposingRealmId, request.targetRealmId)
    const next = clampRelation({
      ...current,
      trust: current.trust + DIPLOMACY_BETRAYAL_TRUST_DELTA,
      updatedAt: world.date,
    })
    relations.set(key, next)

    const betrayed = appendDiplomacyHistory({ ...world, treaties, relations, diplomacyHistory: history }, history, events, {
      kind: 'betrayal',
      reason: 'war_declaration_against_treaty',
      actorRealmId: request.proposingRealmId,
      targetRealmId: request.targetRealmId,
      treatyId: betrayalTreatyId,
      relationKey: key,
    })
    history = betrayed.history

    const changed = appendDiplomacyHistory({ ...world, treaties, relations, diplomacyHistory: history }, history, events, {
      kind: 'relation_changed',
      actorRealmId: request.proposingRealmId,
      targetRealmId: request.targetRealmId,
      relationKey: key,
    })
    history = changed.history
  }

  return { world: { ...world, treaties, relations, diplomacyHistory: history }, events }
}
