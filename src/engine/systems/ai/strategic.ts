import type {
  DiplomaticRelation,
  GameEvent,
  Realm,
  RealmId,
  RNGState,
  SiteId,
  World,
} from '~/shared/types'
import type { AIState, StrategicPlan } from '~/shared/types/ai-state'
import type { ReformId } from '~/shared/types'
import { M8_1_STRATEGIC_WEIGHTS } from '~/content/m2/balance/m8_1'
import { nextRng } from '~/engine/random'
import { isAtWar } from '~/engine/wars'
import { loadReformDefinitions } from '~/engine/systems/reform/reform-phase'
import { evaluatePredicate } from '~/engine/systems/reform/predicate'
import { getPersonality } from './utility-scorer'

function isYearlyTrigger(world: World): boolean {
  return (
    world.date.season === 'spring' &&
    world.date.month === 1 &&
    world.date.xun === 'shang'
  )
}

function getRelation(
  world: World,
  realmA: RealmId,
  realmB: RealmId
): DiplomaticRelation | null {
  for (const rel of world.relations.values()) {
    if (
      (rel.realmAId === realmA && rel.realmBId === realmB) ||
      (rel.realmAId === realmB && rel.realmBId === realmA)
    ) {
      return rel
    }
  }
  return null
}

function relationScore(world: World, realmA: RealmId, realmB: RealmId): number {
  const relation = getRelation(world, realmA, realmB)
  return (relation?.attitude ?? 0) + (relation?.trust ?? 0)
}

function isEnemy(world: World, realmA: RealmId, realmB: RealmId): boolean {
  if (isAtWar(world.wars, realmA, realmB)) return true
  const relation = getRelation(world, realmA, realmB)
  return (relation?.attitude ?? 0) < 0
}

function countOwnedSites(world: World, realmId: RealmId): number {
  let count = 0
  for (const site of world.sites.values()) {
    if (site.ownerId === realmId) count += 1
  }
  return count
}

function findTargetSiteId(
  world: World,
  realm: Realm,
  expansionAggression: number,
  rng: RNGState
): { targetSiteId: SiteId | null; nextRng: RNGState } {
  const candidateIds = new Set<SiteId>()
  for (const site of world.sites.values()) {
    if (site.ownerId !== realm.id) continue
    for (const adjacentId of site.adjacency) candidateIds.add(adjacentId)
  }

  const candidates = [...candidateIds]
    .flatMap((siteId) => {
      const site = world.sites.get(siteId)
      if (!site?.ownerId || site.ownerId === realm.id) return []
      if (!isEnemy(world, realm.id, site.ownerId)) return []
      return [site]
    })
    .sort((a, b) => a.id.localeCompare(b.id))

  if (candidates.length === 0) return { targetSiteId: null, nextRng: rng }
  if (candidates.length === 1) return { targetSiteId: candidates[0]!.id, nextRng: rng }

  let currentRng = rng
  let bestSiteId: SiteId | null = null
  let bestScore = Number.NEGATIVE_INFINITY

  for (const site of candidates) {
    const ownerId = site.ownerId
    if (!ownerId) continue
    const sizeFactor = countOwnedSites(world, ownerId)
    const roll = nextRng(currentRng)
    currentRng = roll.nextState
    const score = expansionAggression * (1 / (sizeFactor + 1)) + roll.value * 0.1
    if (score > bestScore) {
      bestScore = score
      bestSiteId = site.id
    }
  }

  return { targetSiteId: bestSiteId, nextRng: currentRng }
}

function findMainEnemyRealmId(
  world: World,
  realm: Realm,
  enemyPersistence: number
): RealmId | null {
  const existingEnemyId = world.aiState.get(realm.id)?.strategic?.mainEnemyRealmId
  let bestRealmId: RealmId | null = null
  let bestScore = Number.NEGATIVE_INFINITY

  for (const other of [...world.realms.values()].sort((a, b) =>
    a.id.localeCompare(b.id)
  )) {
    if (other.id === realm.id) continue
    if (other.status === 'deactivated') continue
    const persistence = other.id === existingEnemyId ? enemyPersistence : 1
    const score = -relationScore(world, realm.id, other.id) * persistence
    if (score > bestScore) {
      bestScore = score
      bestRealmId = other.id
    }
  }

  return bestRealmId
}

function findMainAllyRealmId(
  world: World,
  realm: Realm,
  allyPriority: number
): RealmId | null {
  let bestRealmId: RealmId | null = null
  let bestScore = Number.NEGATIVE_INFINITY

  for (const other of [...world.realms.values()].sort((a, b) =>
    a.id.localeCompare(b.id)
  )) {
    if (other.id === realm.id) continue
    if (other.status === 'deactivated') continue
    if (isAtWar(world.wars, realm.id, other.id)) continue
    const baseScore = relationScore(world, realm.id, other.id)
    if (allyPriority < 1 && baseScore <= 0) continue
    const score = baseScore * allyPriority
    if (score > bestScore) {
      bestScore = score
      bestRealmId = other.id
    }
  }

  return bestRealmId
}

function findReformIntentId(
  world: World,
  realm: Realm,
  reformInclination: number
): ReformId | null {
  if (reformInclination <= 1.5) return null
  if (world.reformStates.has(realm.id)) return null

  for (const def of [...loadReformDefinitions()].sort((a, b) =>
    a.id.localeCompare(b.id)
  )) {
    if (evaluatePredicate(world, realm, def.trigger)) return def.id
  }

  return null
}

function planStrategicForRealm(
  world: World,
  realm: Realm,
  rng: RNGState
): { plan: StrategicPlan; nextRng: RNGState } {
  const archetype = getPersonality(world, realm.id)
  const weights = M8_1_STRATEGIC_WEIGHTS[archetype]
  const target = findTargetSiteId(world, realm, weights.expansionAggression, rng)

  return {
    plan: {
      targetSiteId: target.targetSiteId,
      mainEnemyRealmId: findMainEnemyRealmId(world, realm, weights.enemyPersistence),
      mainAllyRealmId: findMainAllyRealmId(world, realm, weights.allyPriority),
      reformIntentId: findReformIntentId(world, realm, weights.reformInclination),
      decidedAtTick: world.tick,
      decidedForYearBC: world.date.yearBC,
    },
    nextRng: target.nextRng,
  }
}

function isAdjacentToOwnedTerritory(
  world: World,
  realmId: RealmId,
  siteId: SiteId
): boolean {
  for (const site of world.sites.values()) {
    if (site.ownerId === realmId && site.adjacency.includes(siteId)) return true
  }
  return false
}

export function isStrategicPlanStale(
  world: World,
  realmId: RealmId,
  plan: StrategicPlan
): boolean {
  if (
    plan.mainEnemyRealmId &&
    world.realms.get(plan.mainEnemyRealmId)?.status === 'deactivated'
  ) {
    return true
  }

  if (plan.mainAllyRealmId && isAtWar(world.wars, realmId, plan.mainAllyRealmId)) {
    return true
  }

  if (plan.targetSiteId) {
    const targetSite = world.sites.get(plan.targetSiteId)
    if (targetSite?.ownerId === realmId) return true
    if (!isAdjacentToOwnedTerritory(world, realmId, plan.targetSiteId)) return true
  }

  if (plan.reformIntentId && world.reformStates.has(realmId)) {
    return true
  }

  const ruler = world.rulers.get(realmId)
  if (ruler && ruler.inOfficeSinceTick > plan.decidedAtTick) {
    return true
  }

  return false
}

export function aiStrategicStep(
  world: World,
  rng: RNGState
): { world: World; nextRng: RNGState; events: readonly GameEvent[] } {
  const yearlyTrigger = isYearlyTrigger(world)
  const events: GameEvent[] = []
  let currentRng = rng
  const newAiState = new Map(world.aiState)

  for (const realm of [...world.realms.values()].sort((a, b) =>
    a.id.localeCompare(b.id)
  )) {
    if (realm.id === world.playerRealmId) continue
    if (realm.status === 'deactivated') continue

    const existingAiState = newAiState.get(realm.id)
    const existingPlan = existingAiState?.strategic ?? null
    if (!yearlyTrigger && (!existingPlan || !isStrategicPlanStale(world, realm.id, existingPlan))) {
      continue
    }

    const planResult = planStrategicForRealm(world, realm, currentRng)
    currentRng = planResult.nextRng

    const newState: AIState = {
      strategic: planResult.plan,
      operational: existingAiState?.operational ?? [],
    }
    newAiState.set(realm.id, newState)

    events.push({
      type: 'aiStrategicDecided',
      payload: { realmId: realm.id, plan: planResult.plan },
    })
  }

  if (events.length === 0) {
    return { world, nextRng: rng, events: [] }
  }

  return {
    world: { ...world, aiState: newAiState },
    nextRng: currentRng,
    events,
  }
}
