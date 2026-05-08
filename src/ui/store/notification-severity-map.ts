import { detectCriticalEvent } from './critical-events'
import type { GameEvent, RealmId } from '~/shared/types'

export type NotificationSeverity = 'L1' | 'L2' | 'L3' | 'L4' | 'hidden'

const L2_TYPES = new Set([
  'peaceProposed',
  'characterDefected',
  'spyExposedHighRisk',
  'factionImbalance',
  'reformCompleted',
])

const L3_TYPES = new Set([
  'battleResolved',
  'siegeStarvation',
  'economySettlement',
  'culturalTagFlipped',
  'ideologyShifted',
  'prestigeUpdated',
  'disasterResolved',
  'eventChainAdvanced',
  'eventChainCompleted',
  'victoryAchieved',
  'realmDeactivated',
])

const L4_TYPES = new Set([
  'orderApplied',
  'orderRejected',
  'academyDormant',
  'passCaptured',
  'generalDied',
  'characterSpawned',
  'characterRecruited',
  'governorAssignmentRevoked',
  'spyMissionCancelled',
  'spyMissionResolved',
  'spyExposed',
  'diplomacyEvent',
  'characterDied',
  'successionResolved',
  'realmSplit',
])

export function getSeverity(event: GameEvent, playerRealmId: RealmId): NotificationSeverity {
  // L1: delegate to detectCriticalEvent (preserves existing auto-pause behavior)
  if (detectCriticalEvent(event, playerRealmId) !== null) return 'L1'

  // disasterTriggered: L2 if player realm, L4 otherwise
  if (event.type === 'disasterTriggered') {
    const payload = event.payload as Record<string, unknown>
    return payload.realmId === playerRealmId ? 'L2' : 'L4'
  }

  if (L2_TYPES.has(event.type)) return 'L2'
  if (L3_TYPES.has(event.type)) return 'L3'
  if (L4_TYPES.has(event.type)) return 'L4'

  // dot-notation engine effects → hidden
  if (event.type.includes('.')) return 'hidden'

  // default fallback
  return 'L4'
}
