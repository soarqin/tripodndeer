import m9RawData from '~/content/m9/scenario-453bc.json'
import { runTickPhases } from '~/engine/clock'
import { createWorldFromM1Data, createWorldFromM9Data, loadM1Data } from '~/engine/world/factory'
import { mapM9RawToM9Data } from '~/engine/world/m9-mapper'
import { M9DataSchema, M9RawDataSchema } from '~/shared/schemas'
import type { DifficultyTier, RealmId, World } from '~/shared/types'

import { AI_ONLY_PLAYER_REALM_ID } from './sentinels'

export interface AutoBattleConfig {
  scenarioId: 'm1' | 'm9'
  difficulty: DifficultyTier
  seed: number
  maxTicks: number
  stopCondition: 'unification' | 'tickLimit' | 'extinction-1'
}

export interface RealmFinalStats {
  sites: number
  active: boolean
}

export interface AutoBattleResult {
  winnerRealmId: RealmId | null
  endTick: number
  finalRealmStats: ReadonlyMap<RealmId, RealmFinalStats>
}

function createAutoBattleWorld(config: AutoBattleConfig): World {
  if (config.scenarioId === 'm1') {
    return createWorldFromM1Data(
      loadM1Data(),
      config.seed,
      AI_ONLY_PLAYER_REALM_ID,
      config.difficulty,
    )
  }

  const raw = M9RawDataSchema.parse(m9RawData as unknown)
  const data = M9DataSchema.parse(mapM9RawToM9Data(raw))
  return createWorldFromM9Data(data, config.seed, AI_ONLY_PLAYER_REALM_ID, config.difficulty)
}

function countSitesByRealm(world: World): Map<RealmId, number> {
  const counts = new Map<RealmId, number>()
  for (const site of world.sites.values()) {
    if (!site.ownerId) continue
    counts.set(site.ownerId, (counts.get(site.ownerId) ?? 0) + 1)
  }
  return counts
}

function getActiveRealmIds(world: World): RealmId[] {
  return [...world.realms.values()]
    .filter((realm) => (realm.status ?? 'active') === 'active')
    .map((realm) => realm.id)
    .sort((a, b) => a.localeCompare(b))
}

function getUnifiedRealmId(world: World): RealmId | null {
  const ownerIds = new Set<RealmId>()
  for (const site of world.sites.values()) {
    if (site.ownerId) ownerIds.add(site.ownerId)
  }

  if (ownerIds.size !== 1) return null

  const [realmId] = ownerIds
  if (!realmId) return null


  const realm = world.realms.get(realmId)
  return (realm?.status ?? 'active') === 'active' ? realmId : null
}

export function getWinnerRealmId(world: World): RealmId | null {
  const unifiedRealmId = getUnifiedRealmId(world)
  if (unifiedRealmId) return unifiedRealmId

  const activeRealmIds = getActiveRealmIds(world)
  return activeRealmIds.length === 1 ? activeRealmIds[0]! : null
}

function shouldStop(world: World, config: AutoBattleConfig): boolean {
  if (world.tick >= config.maxTicks) return true
  if (config.stopCondition === 'tickLimit') return false
  if (config.stopCondition === 'unification') return getUnifiedRealmId(world) !== null

  return getActiveRealmIds(world).length <= 1
}

function buildFinalRealmStats(world: World): ReadonlyMap<RealmId, RealmFinalStats> {
  const siteCounts = countSitesByRealm(world)
  const stats = new Map<RealmId, RealmFinalStats>()

  for (const realm of world.realms.values()) {
    stats.set(realm.id, {
      sites: siteCounts.get(realm.id) ?? 0,
      active: (realm.status ?? 'active') === 'active',
    })
  }

  return stats
}

export function runAutoBattle(config: AutoBattleConfig): AutoBattleResult {
  let world = createAutoBattleWorld(config)

  while (!shouldStop(world, config)) {
    world = runTickPhases(world, world.rngState).world
  }

  return {
    winnerRealmId: getWinnerRealmId(world),
    endTick: world.tick,
    finalRealmStats: buildFinalRealmStats(world),
  }
}

/**
 * Like runAutoBattle but also returns the final World for post-hoc analysis (M8.3 batch use).
 * The returned world is in the same state as when runAutoBattle would have stopped.
 */
export function runAutoBattleWithFinalWorld(config: AutoBattleConfig): { result: AutoBattleResult; finalWorld: World } {
  let world = createAutoBattleWorld(config)
  while (!shouldStop(world, config)) {
    world = runTickPhases(world, world.rngState).world
  }
  const result: AutoBattleResult = {
    winnerRealmId: getWinnerRealmId(world),
    endTick: world.tick,
    finalRealmStats: buildFinalRealmStats(world),
  }
  return { result, finalWorld: world }
}
