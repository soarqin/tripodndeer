import type {
  DiplomacyEvent,
  DiplomacyEventId,
  DiplomaticTreatyKind,
  GameEvent,
  World,
} from '~/shared/types'
import { declareWarWithCasus } from '~/engine/wars'
import { relationKey, type DiplomacyActionRequest, type DiplomacyValidationReason, validateDiplomacyAction } from './diplomacy-core'

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
    const { history, events } = pushHistory({ ...world, diplomaticProposals }, world.diplomacyHistory, [], {
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

  const declared = pushHistory(nextWorld, history, events, {
    kind: 'war_declared',
    actorRealmId: request.proposingRealmId,
    targetRealmId: request.targetRealmId,
    relationKey: validation.proposalOrOrder.relationKey,
  })
  history = declared.history

  const cancellation = cancelBelligerentTreaties({ ...nextWorld, diplomacyHistory: history }, request, declared.events)
  return {
    ok: true,
    world: cancellation.world,
    events: cancellation.events,
  }
}

function cancelBelligerentTreaties(
  world: World,
  request: DiplomacyActionRequest,
  events: GameEvent[],
): { readonly world: World; readonly events: readonly GameEvent[] } {
  const key = relationKey(request.proposingRealmId, request.targetRealmId)
  const treaties = new Map(world.treaties)
  let history = [...world.diplomacyHistory]

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
    const pushed = pushHistory({ ...world, treaties, diplomacyHistory: history }, history, events, {
      kind: 'treaty_ended',
      actorRealmId: request.proposingRealmId,
      targetRealmId: request.targetRealmId,
      treatyId: treaty.id,
      relationKey: key,
    })
    history = pushed.history
  }

  return { world: { ...world, treaties, diplomacyHistory: history }, events }
}

function pushHistory(
  world: World,
  history: readonly DiplomacyEvent[],
  events: GameEvent[],
  event: Omit<DiplomacyEvent, 'id' | 'occurredAt'>,
): { readonly history: DiplomacyEvent[]; readonly events: GameEvent[] } {
  const nextEvent: DiplomacyEvent = {
    id: createHistoryId(world.tick, history.length, event),
    occurredAt: world.date,
    ...event,
  }
  events.push({ type: 'diplomacyEvent', payload: nextEvent })
  return { history: [...history, nextEvent], events }
}

function createHistoryId(
  tick: number,
  index: number,
  event: Omit<DiplomacyEvent, 'id' | 'occurredAt'>,
): DiplomacyEventId {
  const subject = event.proposalId ?? event.treatyId ?? event.relationKey ?? 'world'
  return `diplomacy_history_${tick}_${event.kind}_${subject}_${index}`
}
