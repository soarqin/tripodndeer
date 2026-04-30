import type { DiplomaticRelation, DiplomacyEvent, GameEvent, RealmId, World } from '~/shared/types'
import {
  DIPLOMACY_RELATION_NEUTRAL_ATTITUDE,
  DIPLOMACY_RELATION_NEUTRAL_TRUST,
  DIPLOMACY_THIRD_PARTY_DECLARE_WAR_AGGRESSOR_ATTITUDE_DELTA,
  DIPLOMACY_THIRD_PARTY_DECLARE_WAR_AGGRESSOR_TRUST_DELTA,
  DIPLOMACY_THIRD_PARTY_DECLARE_WAR_TARGET_ATTITUDE_DELTA,
  DIPLOMACY_THIRD_PARTY_DECLARE_WAR_TARGET_TRUST_DELTA,
  DIPLOMACY_ZHOU_INVESTITURE_REACTION_MODIFIER,
} from '~/content/m2/balance'
import { clampRelation, relationKey } from './diplomacy-core'
import { appendDiplomacyHistory } from './history'

export function applyThirdPartyReactions(
  world: World,
  trigger: Pick<DiplomacyEvent, 'kind' | 'actorRealmId' | 'targetRealmId'>,
): { readonly world: World; readonly events: readonly GameEvent[] } {
  if (trigger.kind !== 'war_declared' || trigger.actorRealmId === null || trigger.targetRealmId === null) {
    return { world, events: [] }
  }

  const actorRealmId = trigger.actorRealmId
  const targetRealmId = trigger.targetRealmId
  const relations = new Map(world.relations)
  let history = [...world.diplomacyHistory]
  const events: GameEvent[] = []

  for (const realmId of sortedRealmIds(world)) {
    if (realmId === actorRealmId || realmId === targetRealmId) continue

    const actorChanged = applyRelationDelta(
      world,
      relations,
      history,
      events,
      realmId,
      actorRealmId,
      DIPLOMACY_THIRD_PARTY_DECLARE_WAR_AGGRESSOR_ATTITUDE_DELTA,
      DIPLOMACY_THIRD_PARTY_DECLARE_WAR_AGGRESSOR_TRUST_DELTA,
    )
    history = actorChanged.history

    const targetChanged = applyRelationDelta(
      { ...world, relations, diplomacyHistory: history },
      relations,
      history,
      events,
      realmId,
      targetRealmId,
      DIPLOMACY_THIRD_PARTY_DECLARE_WAR_TARGET_ATTITUDE_DELTA,
      DIPLOMACY_THIRD_PARTY_DECLARE_WAR_TARGET_TRUST_DELTA,
    )
    history = targetChanged.history
  }

  return { world: { ...world, relations, diplomacyHistory: history }, events }
}

function applyRelationDelta(
  world: World,
  relations: Map<string, DiplomaticRelation>,
  history: readonly DiplomacyEvent[],
  events: GameEvent[],
  realmAId: RealmId,
  realmBId: RealmId,
  attitudeDelta: number,
  trustDelta: number,
): { readonly history: DiplomacyEvent[] } {
  const key = relationKey(realmAId, realmBId)
  const current = relations.get(key) ?? createNeutralRelation(world, realmAId, realmBId)
  const reactionModifier = getZhouInvestitureReactionModifier(world, realmBId)
  const next = clampRelation({
    ...current,
    attitude: current.attitude + adjustReactionDelta(attitudeDelta, reactionModifier),
    trust: current.trust + adjustReactionDelta(trustDelta, reactionModifier),
    updatedAt: world.date,
  })

  if (next.attitude === current.attitude && next.trust === current.trust) return { history: [...history] }

  relations.set(key, next)
  const pushed = appendDiplomacyHistory(world, history, events, {
    kind: 'relation_changed',
    actorRealmId: realmAId,
    targetRealmId: realmBId,
    relationKey: key,
  })
  return { history: pushed.history }
}

function createNeutralRelation(world: World, realmAId: RealmId, realmBId: RealmId): DiplomaticRelation {
  const lowerRealmId = realmAId.localeCompare(realmBId) <= 0 ? realmAId : realmBId
  const higherRealmId = lowerRealmId === realmAId ? realmBId : realmAId
  return {
    key: relationKey(realmAId, realmBId),
    realmAId: lowerRealmId,
    realmBId: higherRealmId,
    attitude: DIPLOMACY_RELATION_NEUTRAL_ATTITUDE,
    trust: DIPLOMACY_RELATION_NEUTRAL_TRUST,
    updatedAt: world.date,
  }
}

function sortedRealmIds(world: World): readonly RealmId[] {
  return [...world.realms.keys()].sort((a, b) => a.localeCompare(b))
}

function getZhouInvestitureReactionModifier(world: World, realmId: RealmId): number {
  const investiture = world.zhouInvestiture.get(realmId)
  if (!investiture || investiture.source !== 'zhou') return 0
  return investiture.expiresAtTick === null || investiture.expiresAtTick > world.tick
    ? DIPLOMACY_ZHOU_INVESTITURE_REACTION_MODIFIER
    : 0
}

function adjustReactionDelta(delta: number, modifier: number): number {
  if (delta === 0 || modifier === 0) return delta
  return delta + Math.sign(delta) * modifier
}
