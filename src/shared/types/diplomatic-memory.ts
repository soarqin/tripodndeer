import type { RealmId } from './core'

export type MemoryKey = string
export type DiplomaticMemoryEventKind = 'broken_alliance' | 'broken_peace' | 'spy_caught' | 'unprovoked_war' | 'battlefield_victory' | 'border_skirmish'

export interface DiplomaticMemoryEvent {
  readonly kind: DiplomaticMemoryEventKind
  readonly tick: number
  readonly weight: number
}

export interface DiplomaticMemory {
  readonly observerId: RealmId
  readonly subjectId: RealmId
  readonly betrayalScore: number
  readonly events: readonly DiplomaticMemoryEvent[]
  readonly lastUpdatedTick: number
  readonly lastObservedHistoryIdx: number
}

export function memoryKey(observer: RealmId, subject: RealmId): MemoryKey {
  return `${observer}__${subject}`
}
