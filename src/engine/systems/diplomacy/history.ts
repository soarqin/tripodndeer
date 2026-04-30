import type { DiplomacyEvent, DiplomacyEventId, GameEvent, World } from '~/shared/types'

export function appendDiplomacyHistory(
  world: World,
  history: readonly DiplomacyEvent[],
  events: GameEvent[],
  event: Omit<DiplomacyEvent, 'id' | 'occurredAt'>,
  idSuffix = '',
): { readonly history: DiplomacyEvent[]; readonly events: GameEvent[] } {
  const nextEvent: DiplomacyEvent = {
    id: createDiplomacyHistoryId(world.tick, history.length, event, idSuffix),
    occurredAt: world.date,
    ...event,
  }
  events.push({ type: 'diplomacyEvent', payload: nextEvent })
  return { history: [...history, nextEvent], events }
}

export function pushDiplomacyHistory(
  world: World,
  history: DiplomacyEvent[],
  events: GameEvent[],
  event: Omit<DiplomacyEvent, 'id' | 'occurredAt'>,
  idSuffix = '',
): void {
  const nextEvent: DiplomacyEvent = {
    id: createDiplomacyHistoryId(world.tick, history.length, event, idSuffix),
    occurredAt: world.date,
    ...event,
  }
  history.push(nextEvent)
  events.push({ type: 'diplomacyEvent', payload: nextEvent })
}

function createDiplomacyHistoryId(
  tick: number,
  index: number,
  event: Omit<DiplomacyEvent, 'id' | 'occurredAt'>,
  suffix: string,
): DiplomacyEventId {
  const subject = event.proposalId ?? event.treatyId ?? event.coalitionId ?? event.relationKey ?? 'world'
  const suffixPart = suffix === '' ? '' : `_${suffix}`
  return `diplomacy_history_${tick}_${event.kind}_${subject}${suffixPart}_${index}`
}
