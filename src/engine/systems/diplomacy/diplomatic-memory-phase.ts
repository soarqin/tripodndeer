import type {
  DiplomacyEvent,
  DiplomaticMemory,
  DiplomaticMemoryEvent,
  DiplomaticMemoryEventKind,
  RNGState,
  TickPhase,
  World,
} from '~/shared/types'
import { memoryKey } from '~/shared/types/diplomatic-memory'
import {
  M8_2_BORDER_SKIRMISH_ARMY_THRESHOLD,
  M8_2_MEMORY_BUFFER_SIZE,
  M8_2_MEMORY_DECAY_FACTOR_PER_XUN,
  M8_2_MEMORY_EVENT_BASE_WEIGHT,
  M8_2_MEMORY_MAX_SCORE,
  M8_2_MEMORY_MIN_SCORE,
} from '~/content/m2/balance'

export type PhaseResult = ReturnType<TickPhase>

function emptyMemory(observerId: string, subjectId: string): DiplomaticMemory {
  return {
    observerId,
    subjectId,
    betrayalScore: 0,
    events: [],
    lastUpdatedTick: 0,
    lastObservedHistoryIdx: 0,
  }
}

function isPairEvent(event: DiplomacyEvent, observerId: string, subjectId: string): boolean {
  return event.actorRealmId === subjectId && event.targetRealmId === observerId
}

function mapMemoryEventKind(event: DiplomacyEvent): DiplomaticMemoryEventKind | null {
  if (event.kind === 'betrayal' && event.treatyKind === 'alliance') return 'broken_alliance'
  if (event.kind === 'betrayal' && event.treatyKind === 'truce') return 'broken_peace'

  if (event.kind === 'treaty_ended' && event.reason) {
    if (event.treatyKind === 'alliance') return 'broken_alliance'
    if (event.treatyKind === 'truce') return 'broken_peace'
  }

  if (event.kind === 'war_declared' && event.unprovoked === true) return 'unprovoked_war'

  if (event.kind === 'combat_observed' && event.combatPayload) {
    if (
      event.combatPayload.armySizeTotal < M8_2_BORDER_SKIRMISH_ARMY_THRESHOLD &&
      event.combatPayload.borderSite
    ) {
      return 'border_skirmish'
    }
    return 'battlefield_victory'
  }

  if (event.kind === 'spy_caught') return 'spy_caught'

  return null
}

function pushMemoryEvent(
  events: readonly DiplomaticMemoryEvent[],
  event: DiplomaticMemoryEvent,
): readonly DiplomaticMemoryEvent[] {
  const retained =
    events.length >= M8_2_MEMORY_BUFFER_SIZE ? events.slice(1) : events
  return [...retained, event]
}

function updateMemoryForPair(
  world: World,
  memory: DiplomaticMemory,
): DiplomaticMemory | null {
  let betrayalScore = memory.betrayalScore * M8_2_MEMORY_DECAY_FACTOR_PER_XUN
  let events = memory.events
  let lastUpdatedTick = memory.lastUpdatedTick

  for (const event of world.diplomacyHistory.slice(memory.lastObservedHistoryIdx)) {
    if (!isPairEvent(event, memory.observerId, memory.subjectId)) continue

    const kind = mapMemoryEventKind(event)
    if (!kind) continue


    const weight = M8_2_MEMORY_EVENT_BASE_WEIGHT[kind]
    betrayalScore = Math.min(M8_2_MEMORY_MAX_SCORE, betrayalScore + weight)
    events = pushMemoryEvent(events, { kind, tick: world.tick, weight })
    lastUpdatedTick = world.tick
  }

  if (betrayalScore < M8_2_MEMORY_MIN_SCORE) return null

  return {
    ...memory,
    betrayalScore,
    events,
    lastUpdatedTick,
    lastObservedHistoryIdx: world.diplomacyHistory.length,
  }
}

export function diplomaticMemoryPhase(world: World, rng: RNGState): PhaseResult {
  const diplomaticMemory = new Map(world.diplomaticMemory)
  const sortedRealms = [...world.realms.values()].sort((a, b) => a.id.localeCompare(b.id))

  for (const observer of sortedRealms) {
    if (observer.id === world.playerRealmId) continue

    for (const subject of sortedRealms) {
      if (subject.id === observer.id) continue

      const key = memoryKey(observer.id, subject.id)
      const memory = diplomaticMemory.get(key) ?? emptyMemory(observer.id, subject.id)
      const updatedMemory = updateMemoryForPair(world, memory)

      if (updatedMemory) {
        diplomaticMemory.set(key, updatedMemory)
      } else {
        diplomaticMemory.delete(key)
      }
    }
  }

  return { world: { ...world, diplomaticMemory }, nextRng: rng, events: [] }
}
