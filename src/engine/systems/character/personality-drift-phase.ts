import type {
  DiplomacyEvent,
  GameEvent,
  RealmId,
  RNGState,
  RulerPersonalityProfile,
  RulerState,
  World,
} from '~/shared/types'
import {
  M4_DEFAULT_REALM_TREASURY,
  M8_2_DRIFT_CLAMP_MAX,
  M8_2_DRIFT_CLAMP_MIN,
  M8_2_DRIFT_RULES,
} from '~/content/m2/balance'

type DriftDimension = keyof Omit<RulerPersonalityProfile, 'preferredStrategy'>
type DriftTrigger = (typeof M8_2_DRIFT_RULES)[number]['trigger']

const RECENT_EVENT_LIMIT = 50

function clampDimension(value: number): number {
  return Math.max(M8_2_DRIFT_CLAMP_MIN, Math.min(M8_2_DRIFT_CLAMP_MAX, value))
}

function warInvolvesRealm(warKey: string, realmId: RealmId): boolean {
  return warKey.split(':').includes(realmId)
}

function eventInvolvesRealm(event: DiplomacyEvent, realmId: RealmId): boolean {
  return event.actorRealmId === realmId || event.targetRealmId === realmId
}

function hadCatastrophicLoss(recentEvents: readonly DiplomacyEvent[], realmId: RealmId): boolean {
  return recentEvents.some(
    (event) =>
      event.kind === 'combat_observed' &&
      eventInvolvesRealm(event, realmId) &&
      event.combatPayload?.victorRealmId !== undefined &&
      event.combatPayload.victorRealmId !== realmId,
  )
}

function committedBetrayal(recentEvents: readonly DiplomacyEvent[], realmId: RealmId): boolean {
  return recentEvents.some(
    (event) => event.kind === 'betrayal' && event.actorRealmId === realmId,
  )
}

function hadRecentWar(recentEvents: readonly DiplomacyEvent[], realmId: RealmId): boolean {
  return recentEvents.some(
    (event) =>
      (event.kind === 'war_declared' || event.kind === 'combat_observed') &&
      eventInvolvesRealm(event, realmId),
  )
}

function isAtPeace(world: World, recentEvents: readonly DiplomacyEvent[], realmId: RealmId): boolean {
  const hasCurrentWar = [...world.wars.keys()].some((key) => warInvolvesRealm(key, realmId))
  return !hasCurrentWar && !hadRecentWar(recentEvents, realmId)
}

function hasProlongedProsperity(
  world: World,
  recentEvents: readonly DiplomacyEvent[],
  realmId: RealmId,
): boolean {
  const realm = world.realms.get(realmId)
  return (
    realm !== undefined &&
    realm.economy.treasury > M4_DEFAULT_REALM_TREASURY &&
    isAtPeace(world, recentEvents, realmId)
  )
}

function triggerMatches(
  trigger: DriftTrigger,
  world: World,
  recentEvents: readonly DiplomacyEvent[],
  realmId: RealmId,
): boolean {
  if (trigger === 'catastrophic_loss') return hadCatastrophicLoss(recentEvents, realmId)
  if (trigger === 'repeated_betrayal_success') return committedBetrayal(recentEvents, realmId)
  return hasProlongedProsperity(world, recentEvents, realmId)
}

function applyDelta(
  profile: RulerPersonalityProfile,
  dimension: DriftDimension,
  delta: number,
): RulerPersonalityProfile {
  return {
    ...profile,
    [dimension]: clampDimension(profile[dimension] + delta),
  }
}

function clampProfile(profile: RulerPersonalityProfile): RulerPersonalityProfile {
  return {
    ...profile,
    expansionDrive: clampDimension(profile.expansionDrive),
    diplomaticTrust: clampDimension(profile.diplomaticTrust),
    caution: clampDimension(profile.caution),
    honor: clampDimension(profile.honor),
    vindictiveness: clampDimension(profile.vindictiveness),
    reformInclination: clampDimension(profile.reformInclination),
    patience: clampDimension(profile.patience),
  }
}

function driftRuler(
  world: World,
  recentEvents: readonly DiplomacyEvent[],
  ruler: RulerState,
): RulerState {
  let personalityDims = clampProfile(ruler.personalityDims)

  for (const rule of M8_2_DRIFT_RULES) {
    if (!triggerMatches(rule.trigger, world, recentEvents, ruler.realmId)) continue
    personalityDims = applyDelta(personalityDims, rule.dimension, rule.delta)
  }

  return { ...ruler, personalityDims }
}

export function personalityDriftPhase(
  world: World,
  rng: RNGState,
): { world: World; nextRng: RNGState; events: readonly GameEvent[] } {
  const rulers = new Map(world.rulers)
  const recentEvents = world.diplomacyHistory.slice(-RECENT_EVENT_LIMIT)
  const sortedRealms = [...world.realms.values()].sort((a, b) => a.id.localeCompare(b.id))

  for (const realm of sortedRealms) {
    if (realm.id === world.playerRealmId) continue

    const ruler = rulers.get(realm.id)
    if (ruler === undefined) continue

    rulers.set(realm.id, driftRuler(world, recentEvents, ruler))
  }

  return {
    world: { ...world, rulers },
    nextRng: rng,
    events: [],
  }
}
