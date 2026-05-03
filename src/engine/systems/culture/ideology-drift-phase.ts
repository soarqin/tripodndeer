import type {
  GameEvent,
  Ideology,
  IdeologyLean,
  PersonalityArchetype,
  Realm,
  RNGState,
  Specialty,
  World,
} from '~/shared/types'
import {
  M6_ENABLED,
  M6_IDEOLOGY_ACADEMY_WEIGHT,
  M6_IDEOLOGY_POLICY_WEIGHT,
  M6_IDEOLOGY_RULER_PERSONALITY_WEIGHT,
  M6_IDEOLOGY_TALENT_WEIGHT,
} from '~/content/m2/balance'
import { getTraitModifiers } from '~/content/m4_1/trait-effects'
import { isYearStart } from '~/engine/calendar'

const ALL_IDEOLOGIES: readonly Ideology[] = ['fa', 'ru', 'dao', 'mo', 'zonghen', 'bing']

const PERSONALITY_IDEOLOGY_AFFINITY: Record<PersonalityArchetype, Partial<Record<Ideology, number>>> = {
  conqueror: { fa: 30, bing: 20 },
  tyrant: { fa: 40 },
  steward: { dao: 30, ru: 10 },
  benevolent: { ru: 40 },
  learned: { ru: 30, dao: 10 },
  schemer: { zonghen: 40 },
  builder: { mo: 30, fa: 10 },
  incompetent: {},
}

const SPECIALTY_IDEOLOGY_AFFINITY: Record<Specialty, Partial<Record<Ideology, number>>> = {
  commander: { bing: 30 },
  warrior: { bing: 30 },
  strategist: { bing: 20, zonghen: 10 },
  administrator: { fa: 30 },
  reformer: { fa: 30 },
  diplomat: { zonghen: 30 },
  spy: { zonghen: 30 },
  scholar: { ru: 30 },
  engineer: { mo: 30 },
}

const SHIFT_THRESHOLD = 5

export interface IdeologyShiftedEvent {
  readonly type: 'ideologyShifted'
  readonly payload: {
    readonly realmId: string
    readonly previous: IdeologyLean
    readonly next: IdeologyLean
  }
}

function emptyAffinity(): Record<Ideology, number> {
  return { fa: 0, ru: 0, dao: 0, mo: 0, zonghen: 0, bing: 0 }
}

function clampLean(score: Record<Ideology, number>): IdeologyLean {
  const result = emptyAffinity()
  for (const ideology of ALL_IDEOLOGIES) {
    result[ideology] = Math.max(0, Math.min(100, Math.round(score[ideology])))
  }
  return result as IdeologyLean
}

function leanChangedSignificantly(prev: IdeologyLean, next: IdeologyLean): boolean {
  return ALL_IDEOLOGIES.some((k) => Math.abs(next[k] - prev[k]) > SHIFT_THRESHOLD)
}

function computeRulerSource(world: World, realm: Realm): Record<Ideology, number> {
  const result = emptyAffinity()
  const ruler = world.rulers.get(realm.id)
  if (!ruler) return result
  const affinity = PERSONALITY_IDEOLOGY_AFFINITY[ruler.personality] ?? {}
  for (const ideology of ALL_IDEOLOGIES) {
    result[ideology] = affinity[ideology] ?? 0
  }
  return result
}

function computeTalentSource(world: World, realm: Realm): Record<Ideology, number> {
  const result = emptyAffinity()
  const generals = [...world.generals.values()]
    .filter((g) => g.realmId === realm.id)
    .sort((a, b) => a.id.localeCompare(b.id))
  if (generals.length === 0) return result

  for (const general of generals) {
    if (!general.specialty) continue
    const affinity = SPECIALTY_IDEOLOGY_AFFINITY[general.specialty] ?? {}
    for (const ideology of ALL_IDEOLOGIES) {
      result[ideology] += affinity[ideology] ?? 0
    }
  }

  for (const ideology of ALL_IDEOLOGIES) {
    result[ideology] = result[ideology] / generals.length
  }
  return result
}

function computePolicySource(realm: Realm): Record<Ideology, number> {
  const result = emptyAffinity()
  const traitMods = getTraitModifiers(realm)
  if (!traitMods.ideologyDeltaBp) return result
  for (const [ideology, bp] of Object.entries(traitMods.ideologyDeltaBp) as readonly [Ideology, number][]) {
    result[ideology] = bp / 100
  }
  return result
}

function computeAcademySource(world: World, realm: Realm): Record<Ideology, number> {
  const result = emptyAffinity()
  const realmAcademies = [...world.academies.values()]
    .filter((a) => a.hostRealmId === realm.id && a.status === 'active')
    .sort((a, b) => a.id.localeCompare(b.id))
  for (const academy of realmAcademies) {
    result[academy.primaryIdeology] += 30
    if (academy.secondaryIdeology) {
      result[academy.secondaryIdeology] += 15
    }
  }
  return result
}

function computeIdeologyLean(world: World, realm: Realm): IdeologyLean {
  const ruler = computeRulerSource(world, realm)
  const talent = computeTalentSource(world, realm)
  const policy = computePolicySource(realm)
  const academy = computeAcademySource(world, realm)

  const aggregated = emptyAffinity()
  for (const ideology of ALL_IDEOLOGIES) {
    aggregated[ideology] =
      ruler[ideology] * M6_IDEOLOGY_RULER_PERSONALITY_WEIGHT +
      talent[ideology] * M6_IDEOLOGY_TALENT_WEIGHT +
      policy[ideology] * M6_IDEOLOGY_POLICY_WEIGHT +
      academy[ideology] * M6_IDEOLOGY_ACADEMY_WEIGHT
  }

  return clampLean(aggregated)
}

export function ideologyDriftPhase(
  world: World,
  rng: RNGState,
): { world: World; nextRng: RNGState; events: readonly GameEvent[] } {
  if (!M6_ENABLED) return { world, nextRng: rng, events: [] }
  if (!isYearStart(world)) return { world, nextRng: rng, events: [] }

  const sortedRealms = [...world.realms.values()].sort((a, b) => a.id.localeCompare(b.id))

  const events: GameEvent[] = []
  let updatedRealms: ReadonlyMap<string, Realm> = world.realms

  for (const realm of sortedRealms) {
    const previousLean: IdeologyLean =
      realm.ideologyLean ?? { fa: 0, ru: 0, dao: 0, mo: 0, zonghen: 0, bing: 0 }
    const nextLean = computeIdeologyLean(world, realm)

    if (leanChangedSignificantly(previousLean, nextLean)) {
      events.push({
        type: 'ideologyShifted',
        payload: {
          realmId: realm.id,
          previous: previousLean,
          next: nextLean,
        },
      })
    }

    const next = new Map(updatedRealms)
    next.set(realm.id, { ...realm, ideologyLean: nextLean })
    updatedRealms = next
  }

  return { world: { ...world, realms: updatedRealms }, nextRng: rng, events }
}
