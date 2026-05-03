import type { DiplomacyEvent, DiplomaticRelation, GameEvent, SpyMission, World } from '~/shared/types'
import { M7_FAILURE_ATTITUDE_DELTA, M7_FAILURE_TRUST_DELTA } from '~/content/m2/balance'
import { applyRelationDelta } from '~/engine/systems/diplomacy/reactions'

export interface SpyExposedEvent {
  readonly type: 'spyExposed'
  readonly payload: {
    readonly missionId: SpyMission['id']
    readonly spyRealmId: SpyMission['spyRealmId']
    readonly targetRealmId: SpyMission['targetRealmId']
    readonly action: SpyMission['action']
  }
}

export function applyEspionageReactions(
  world: World,
  exposedMission: SpyMission,
): { readonly world: World; readonly events: readonly GameEvent[] } {
  const relations = new Map<string, DiplomaticRelation>(world.relations)
  const events: GameEvent[] = []
  const initialHistory: readonly DiplomacyEvent[] = world.diplomacyHistory

  const result = applyRelationDelta(
    world,
    relations,
    initialHistory,
    events,
    exposedMission.spyRealmId,
    exposedMission.targetRealmId,
    M7_FAILURE_ATTITUDE_DELTA,
    M7_FAILURE_TRUST_DELTA,
  )

  events.push({
    type: 'spyExposed',
    payload: {
      missionId: exposedMission.id,
      spyRealmId: exposedMission.spyRealmId,
      targetRealmId: exposedMission.targetRealmId,
      action: exposedMission.action,
    },
  })

  return {
    world: { ...world, relations, diplomacyHistory: result.history },
    events,
  }
}
