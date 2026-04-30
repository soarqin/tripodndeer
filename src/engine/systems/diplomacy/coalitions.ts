import type { CoalitionId, CoalitionState, DiplomacyEvent, GameEvent, RealmId, WarState, World } from '~/shared/types'
import {
  DIPLOMACY_COALITION_DISSOLVE_THREAT_THRESHOLD,
  DIPLOMACY_COALITION_MIN_MEMBERS,
  DIPLOMACY_COALITION_THREAT_THRESHOLD,
  DIPLOMACY_COALITION_WAR_THREAT_BONUS,
  DIPLOMACY_THREAT_ARMY_MANPOWER_DIVISOR,
  DIPLOMACY_THREAT_MANPOWER_DIVISOR,
  DIPLOMACY_THREAT_SITE_POWER,
} from '~/content/m2/balance'
import { isAtWar } from '~/engine/wars'
import { appendDiplomacyHistory } from './history'

export function updateCoalitionPressure(world: World): { readonly world: World; readonly events: readonly GameEvent[] } {
  const coalitions = new Map(world.coalitions)
  let history = [...world.diplomacyHistory]
  const events: GameEvent[] = []
  const touched = new Set<CoalitionId>()

  for (const targetRealmId of sortedRealmIds(world)) {
    const coalitionId = createCoalitionId(targetRealmId)
    touched.add(coalitionId)
    const current = coalitions.get(coalitionId)
    const memberRealmIds = getCoalitionMembers(world, targetRealmId, current)

    if (memberRealmIds.length === 0) {
      if (current && current.status !== 'dissolved') {
        const dissolved: CoalitionState = { ...current, memberRealmIds: [], status: 'dissolved', dissolvedAt: world.date }
        coalitions.set(coalitionId, dissolved)
        const pushed = appendCoalitionHistory(world, history, events, coalitionId, targetRealmId)
        history = pushed.history
      }
      continue
    }

    const status = memberRealmIds.length >= DIPLOMACY_COALITION_MIN_MEMBERS ? 'active' : 'forming'
    const next: CoalitionState = {
      id: coalitionId,
      targetRealmId,
      memberRealmIds,
      status,
      formedAt: current?.status === 'dissolved' || !current ? world.date : current.formedAt,
      dissolvedAt: null,
    }

    if (!sameCoalition(current, next)) {
      coalitions.set(coalitionId, next)
      const pushed = appendCoalitionHistory(world, history, events, coalitionId, targetRealmId)
      history = pushed.history
    }
  }

  for (const coalition of sortedCoalitions(coalitions)) {
    if (touched.has(coalition.id) || coalition.status === 'dissolved') continue
    const dissolved: CoalitionState = { ...coalition, memberRealmIds: [], status: 'dissolved', dissolvedAt: world.date }
    coalitions.set(coalition.id, dissolved)
    const pushed = appendCoalitionHistory(world, history, events, coalition.id, coalition.targetRealmId)
    history = pushed.history
  }

  return { world: { ...world, coalitions, diplomacyHistory: history }, events }
}

export function createCoalitionId(targetRealmId: RealmId): CoalitionId {
  return `coalition_against_${targetRealmId}`
}

function getCoalitionMembers(
  world: World,
  targetRealmId: RealmId,
  current: CoalitionState | undefined,
): readonly RealmId[] {
  return sortedRealmIds(world)
    .filter(realmId => realmId !== targetRealmId)
    .filter(realmId => {
      const threat = scoreCoalitionThreat(world, targetRealmId, realmId)
      const threshold = current?.status === 'active' || current?.status === 'forming'
        ? DIPLOMACY_COALITION_DISSOLVE_THREAT_THRESHOLD
        : DIPLOMACY_COALITION_THREAT_THRESHOLD
      return threat >= threshold
    })
}

function scoreCoalitionThreat(world: World, targetRealmId: RealmId, memberRealmId: RealmId): number {
  return getRealmThreatPower(world, targetRealmId)
    - getRealmThreatPower(world, memberRealmId)
    + getWarThreatBonus(world.wars, targetRealmId, memberRealmId)
}

function getRealmThreatPower(world: World, realmId: RealmId): number {
  const sitePower = [...world.sites.values()]
    .sort((a, b) => a.id.localeCompare(b.id))
    .filter(site => site.ownerId === realmId).length * DIPLOMACY_THREAT_SITE_POWER
  const armyPower = [...world.armies.values()]
    .sort((a, b) => a.id.localeCompare(b.id))
    .filter(army => army.realmId === realmId)
    .reduce((sum, army) => sum + army.manpower / DIPLOMACY_THREAT_ARMY_MANPOWER_DIVISOR, 0)
  const realm = world.realms.get(realmId)
  const manpowerPower = (realm?.stats?.manpowerPool ?? 0) / DIPLOMACY_THREAT_MANPOWER_DIVISOR
  return sitePower + armyPower + manpowerPower
}

function getWarThreatBonus(wars: ReadonlyMap<string, WarState>, targetRealmId: RealmId, memberRealmId: RealmId): number {
  return [...wars.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .some(() => isAtWar(wars, targetRealmId, memberRealmId))
    ? DIPLOMACY_COALITION_WAR_THREAT_BONUS
    : 0
}

function appendCoalitionHistory(
  world: World,
  history: readonly DiplomacyEvent[],
  events: GameEvent[],
  coalitionId: CoalitionId,
  targetRealmId: RealmId,
): { readonly history: DiplomacyEvent[] } {
  const pushed = appendDiplomacyHistory(world, history, events, {
    kind: 'coalition_changed',
    actorRealmId: null,
    targetRealmId,
    coalitionId,
  })
  return { history: pushed.history }
}

function sameCoalition(current: CoalitionState | undefined, next: CoalitionState): boolean {
  return current?.targetRealmId === next.targetRealmId
    && current.status === next.status
    && current.dissolvedAt === next.dissolvedAt
    && current.memberRealmIds.length === next.memberRealmIds.length
    && current.memberRealmIds.every((realmId, index) => realmId === next.memberRealmIds[index])
}

function sortedRealmIds(world: World): readonly RealmId[] {
  return [...world.realms.keys()].sort((a, b) => a.localeCompare(b))
}

function sortedCoalitions(coalitions: ReadonlyMap<CoalitionId, CoalitionState>): readonly CoalitionState[] {
  return [...coalitions.values()].sort((a, b) => a.id.localeCompare(b.id))
}
