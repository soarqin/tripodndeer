import type {
  GameEvent,
  PersonalityArchetype,
  Realm,
  RNGState,
  World,
  ZhouInvestitureRank,
} from '~/shared/types'
import {
  M6_ENABLED,
  M6_PRESTIGE_ALLIANCE_WEIGHT,
  M6_PRESTIGE_CULTURE_DIFFUSION_WEIGHT,
  M6_PRESTIGE_LEGITIMACY_WEIGHT,
  M6_PRESTIGE_MILITARY_WEIGHT,
  M6_PRESTIGE_RITUAL_WEIGHT,
  M6_PRESTIGE_VICTORY_BONUS,
} from '~/content/m2/balance'

const SHIFT_THRESHOLD = 5

const RANK_PRESTIGE_BONUS: Record<ZhouInvestitureRank, number> = {
  duke: 15,
  marquis: 12,
  count: 9,
  viscount: 6,
  baron: 3,
}

const RITUAL_PERSONALITIES: ReadonlySet<PersonalityArchetype> = new Set(['benevolent', 'steward'])

export interface PrestigeUpdatedEvent {
  readonly type: 'prestigeUpdated'
  readonly payload: {
    readonly realmId: string
    readonly previous: number
    readonly next: number
    readonly delta: number
  }
}

function isYearEnd(world: World): boolean {
  return world.date.season === 'winter' && world.date.month === 3 && world.date.xun === 'xia'
}

function legitimacyContribution(world: World, realm: Realm): number {
  const investiture = world.zhouInvestiture.get(realm.id)
  if (!investiture?.rank) return 0
  return RANK_PRESTIGE_BONUS[investiture.rank]
}

function cultureDiffusionContribution(world: World, realm: Realm): number {
  const realmSites = [...world.sites.values()].filter((s) => s.ownerId === realm.id)
  if (realmSites.length === 0) return 0
  const totalIdentity = realmSites.reduce(
    (sum, s) => sum + (s.culturalIdentityStrength ?? 0),
    0,
  )
  const avgIdentity = totalIdentity / realmSites.length
  return (avgIdentity / 100) * 10
}

function militaryContribution(realm: Realm): number {
  const victories = realm.warVictoriesThisYear ?? 0
  return victories * M6_PRESTIGE_VICTORY_BONUS
}

function ritualContribution(world: World, realm: Realm): number {
  const ruler = world.rulers.get(realm.id)
  if (!ruler) return 0
  return RITUAL_PERSONALITIES.has(ruler.personality) ? 5 : 0
}

function allianceContribution(world: World, realm: Realm): number {
  const count = [...world.treaties.values()].filter(
    (t) =>
      (t.realmAId === realm.id || t.realmBId === realm.id) &&
      t.kind === 'alliance' &&
      t.status === 'active',
  ).length
  return count * 3
}

function computePrestige(world: World, realm: Realm): number {
  const previous = realm.prestige ?? 0

  const score =
    previous +
    legitimacyContribution(world, realm) * M6_PRESTIGE_LEGITIMACY_WEIGHT +
    cultureDiffusionContribution(world, realm) * M6_PRESTIGE_CULTURE_DIFFUSION_WEIGHT +
    militaryContribution(realm) * M6_PRESTIGE_MILITARY_WEIGHT +
    ritualContribution(world, realm) * M6_PRESTIGE_RITUAL_WEIGHT +
    allianceContribution(world, realm) * M6_PRESTIGE_ALLIANCE_WEIGHT

  return Math.max(0, Math.min(100, Math.round(score)))
}

export function prestigeUpdatePhase(
  world: World,
  rng: RNGState,
): { world: World; nextRng: RNGState; events: readonly GameEvent[] } {
  if (!M6_ENABLED) return { world, nextRng: rng, events: [] }
  if (!isYearEnd(world)) return { world, nextRng: rng, events: [] }

  const sortedRealms = [...world.realms.values()].sort((a, b) => a.id.localeCompare(b.id))

  const events: GameEvent[] = []
  let updatedRealms: ReadonlyMap<string, Realm> = world.realms

  for (const realm of sortedRealms) {
    const previous = realm.prestige ?? 0
    const next = computePrestige(world, realm)
    const delta = next - previous

    if (Math.abs(delta) > SHIFT_THRESHOLD) {
      events.push({
        type: 'prestigeUpdated',
        payload: {
          realmId: realm.id,
          previous,
          next,
          delta,
        },
      })
    }

    const nextRealms = new Map(updatedRealms)
    nextRealms.set(realm.id, {
      ...realm,
      prestige: next,
      warVictoriesThisYear: 0,
    })
    updatedRealms = nextRealms
  }

  return { world: { ...world, realms: updatedRealms }, nextRng: rng, events }
}
