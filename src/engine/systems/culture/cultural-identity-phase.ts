import type {
  CulturalTag,
  GameEvent,
  RealmId,
  RNGState,
  Site,
  SiteId,
  World,
} from '~/shared/types'
import {
  M6_CULTURAL_BARBARIAN_TO_BARBARIAN_YEARS,
  M6_CULTURAL_CHINESE_TO_BARBARIAN_YEARS,
  M6_CULTURAL_CHINESE_TO_CHINESE_YEARS,
  M6_CULTURAL_CONQUEST_DROP,
  M6_CULTURAL_DRIFT_PER_TICK,
  M6_CULTURAL_FLIP_THRESHOLD,
  M6_ENABLED,
  M6_TRIBUTE_CULTURAL_PULL_PER_YEAR,
} from '~/content/m2/balance'
import { getActiveTributeRelationships } from '~/engine/systems/peace/tribute-query'

const TICKS_PER_YEAR = 36
const POST_FLIP_IDENTITY = 50

export interface CulturalTagFlippedEvent {
  readonly type: 'culturalTagFlipped'
  readonly payload: {
    readonly siteId: SiteId
    readonly previousTag: CulturalTag
    readonly nextTag: CulturalTag
    readonly tick: number
  }
}

function isChineseTag(tag: CulturalTag): boolean {
  return tag.startsWith('chinese_')
}

function getFlipYears(fromTag: CulturalTag, toTag: CulturalTag): number {
  const fromChinese = isChineseTag(fromTag)
  const toChinese = isChineseTag(toTag)
  if (fromChinese && toChinese) return M6_CULTURAL_CHINESE_TO_CHINESE_YEARS
  if (!fromChinese && !toChinese) return M6_CULTURAL_BARBARIAN_TO_BARBARIAN_YEARS
  return M6_CULTURAL_CHINESE_TO_BARBARIAN_YEARS
}

function pickDominantTag(counts: ReadonlyMap<CulturalTag, number>): CulturalTag | null {
  let bestTag: CulturalTag | null = null
  let bestCount = -1
  for (const [tag, count] of [...counts.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    if (count > bestCount) {
      bestTag = tag
      bestCount = count
    }
  }
  return bestTag
}

function dominantTagAmongOwnerSites(
  world: World,
  realmId: RealmId,
): CulturalTag | null {
  const counts = new Map<CulturalTag, number>()
  const ownerSites = [...world.sites.values()]
    .filter((s) => s.ownerId === realmId)
    .sort((a, b) => a.id.localeCompare(b.id))
  for (const site of ownerSites) {
    if (!site.cultural) continue
    counts.set(site.cultural, (counts.get(site.cultural) ?? 0) + 1)
  }
  return pickDominantTag(counts)
}

function pickFlipTarget(
  world: World,
  site: Site,
  currentTag: CulturalTag,
): CulturalTag | null {
  const counts = new Map<CulturalTag, number>()
  for (const neighborId of site.adjacency) {
    const neighbor = world.sites.get(neighborId as SiteId)
    if (!neighbor || !neighbor.cultural) continue
    if (neighbor.cultural === currentTag) continue
    counts.set(neighbor.cultural, (counts.get(neighbor.cultural) ?? 0) + 1)
  }
  return pickDominantTag(counts)
}

export function culturalIdentityPhase(
  world: World,
  rng: RNGState,
): { world: World; nextRng: RNGState; events: readonly GameEvent[] } {
  if (!M6_ENABLED) return { world, nextRng: rng, events: [] }

  const events: GameEvent[] = []

  const tributeRelationships = getActiveTributeRelationships(world)
  const suzerainTagByTributary = new Map<RealmId, CulturalTag>()
  for (const rel of tributeRelationships) {
    if (suzerainTagByTributary.has(rel.tributaryRealmId)) continue
    const suzerainTag = dominantTagAmongOwnerSites(world, rel.suzerainRealmId)
    if (suzerainTag) {
      suzerainTagByTributary.set(rel.tributaryRealmId, suzerainTag)
    }
  }

  const tributePullPerTick = M6_TRIBUTE_CULTURAL_PULL_PER_YEAR / TICKS_PER_YEAR

  const sortedSites = [...world.sites.values()].sort((a, b) =>
    a.id.localeCompare(b.id),
  )

  let updatedSites: ReadonlyMap<SiteId, Site> = world.sites

  for (const site of sortedSites) {
    if (!site.cultural) continue

    let identity = site.culturalIdentityStrength ?? 100
    let cultural: CulturalTag = site.cultural
    const lastConquestTick = site.lastConquestTick ?? null
    let lowIdentitySinceTick = site.lowIdentitySinceTick ?? null
    let flipped = false

    if (lastConquestTick !== null && lastConquestTick === world.tick - 1) {
      identity = Math.max(0, identity - M6_CULTURAL_CONQUEST_DROP)
    }

    for (const neighborId of site.adjacency) {
      const neighbor = world.sites.get(neighborId as SiteId)
      if (!neighbor || !neighbor.cultural) continue
      if (neighbor.cultural !== cultural) {
        identity = Math.max(0, identity - M6_CULTURAL_DRIFT_PER_TICK)
      }
    }

    if (site.ownerId !== null) {
      const suzerainTag = suzerainTagByTributary.get(site.ownerId)
      if (suzerainTag && suzerainTag !== cultural) {
        identity = Math.max(0, identity - tributePullPerTick)
      }
    }

    if (identity < M6_CULTURAL_FLIP_THRESHOLD) {
      if (lowIdentitySinceTick === null) {
        lowIdentitySinceTick = world.tick
      }

      const flipTarget = pickFlipTarget(world, site, cultural)
      if (flipTarget) {
        const flipYears = getFlipYears(cultural, flipTarget)
        const requiredTicks = flipYears * TICKS_PER_YEAR
        const ticksLow = world.tick - lowIdentitySinceTick
        if (ticksLow >= requiredTicks) {
          events.push({
            type: 'culturalTagFlipped',
            payload: {
              siteId: site.id,
              previousTag: cultural,
              nextTag: flipTarget,
              tick: world.tick,
            },
          })
          cultural = flipTarget
          identity = POST_FLIP_IDENTITY
          lowIdentitySinceTick = null
          flipped = true
        }
      }
    } else {
      lowIdentitySinceTick = null
    }

    identity = Math.max(0, Math.min(100, identity))

    const unchanged =
      !flipped &&
      identity === (site.culturalIdentityStrength ?? 100) &&
      cultural === site.cultural &&
      lowIdentitySinceTick === (site.lowIdentitySinceTick ?? null)

    if (unchanged) continue

    const updatedSite: Site = {
      ...site,
      cultural,
      culturalIdentityStrength: identity,
      lowIdentitySinceTick,
    }
    const next = new Map(updatedSites)
    next.set(site.id, updatedSite)
    updatedSites = next
  }

  if (updatedSites === world.sites && events.length === 0) {
    return { world, nextRng: rng, events: [] }
  }

  return {
    world: { ...world, sites: updatedSites },
    nextRng: rng,
    events,
  }
}
