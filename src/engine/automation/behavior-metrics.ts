import type { GameDate, PersonalityArchetype, RealmId, World } from '~/shared/types'

import { gameDateToTick } from './date-utils'

export interface BehaviorMetrics {
  readonly conqueror: { readonly warsDeclared: number; readonly sampleSize: number }
  readonly steward: { readonly warYears: number; readonly sampleSize: number }
  readonly schemer: { readonly alliances: number; readonly sampleSize: number }
  readonly unattributedActions: number
}

export function getCurrentArchetype(
  world: World,
  realmId: RealmId,
): PersonalityArchetype | null {
  return world.rulers.get(realmId)?.personality ?? null
}

interface Interval {
  start: number
  end: number
}

function mergeIntervals(intervals: readonly Interval[]): Interval[] {
  if (intervals.length === 0) return []
  const sorted = [...intervals].sort((a, b) => a.start - b.start)
  const first = sorted[0]!
  const merged: Interval[] = [{ start: first.start, end: first.end }]
  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i]!
    const last = merged[merged.length - 1]!
    if (cur.start <= last.end) {
      last.end = Math.max(last.end, cur.end)
    } else {
      merged.push({ start: cur.start, end: cur.end })
    }
  }
  return merged
}

function parseWarKey(key: string): [RealmId, RealmId] | null {
  const parts = key.split(':')
  if (parts.length !== 2) return null
  const [a, b] = parts
  if (!a || !b) return null
  return [a, b]
}

function findEarliestMatchingTruce(
  world: World,
  realmA: RealmId,
  realmB: RealmId,
  afterTick: number,
): number | null {
  let earliest: number | null = null
  for (const treaty of world.treaties.values()) {
    if (treaty.kind !== 'truce') continue
    const matches =
      (treaty.realmAId === realmA && treaty.realmBId === realmB) ||
      (treaty.realmAId === realmB && treaty.realmBId === realmA)
    if (!matches) continue
    if (treaty.signedAtTick <= afterTick) continue
    if (earliest === null || treaty.signedAtTick < earliest) {
      earliest = treaty.signedAtTick
    }
  }
  return earliest
}

function groupRealmsByArchetype(world: World): {
  byArchetype: Map<PersonalityArchetype, Set<RealmId>>
  withoutRuler: Set<RealmId>
} {
  const byArchetype = new Map<PersonalityArchetype, Set<RealmId>>()
  const withoutRuler = new Set<RealmId>()
  for (const realm of world.realms.values()) {
    const archetype = getCurrentArchetype(world, realm.id)
    if (archetype === null) {
      withoutRuler.add(realm.id)
      continue
    }
    let set = byArchetype.get(archetype)
    if (!set) {
      set = new Set()
      byArchetype.set(archetype, set)
    }
    set.add(realm.id)
  }
  return { byArchetype, withoutRuler }
}

function computeStewardWarYears(
  world: World,
  stewardRealms: ReadonlySet<RealmId>,
  scenarioStart: GameDate,
): number {
  if (stewardRealms.size === 0) return 0

  const perRealmIntervals = new Map<RealmId, Interval[]>()
  for (const id of stewardRealms) perRealmIntervals.set(id, [])

  for (const [key, warState] of world.wars.entries()) {
    const pair = parseWarKey(key)
    if (!pair) continue
    const startTick = gameDateToTick(warState.declaredAt, scenarioStart)
    const endTick = world.tick
    if (endTick <= startTick) continue
    for (const realmId of pair) {
      const list = perRealmIntervals.get(realmId)
      if (list) list.push({ start: startTick, end: endTick })
    }
  }

  for (const event of world.diplomacyHistory) {
    if (event.kind !== 'war_declared') continue
    const actor = event.actorRealmId
    const target = event.targetRealmId
    if (!actor || !target) continue
    const startTick = gameDateToTick(event.occurredAt, scenarioStart)
    const truceTick = findEarliestMatchingTruce(world, actor, target, startTick)
    if (truceTick === null) continue
    if (truceTick <= startTick) continue
    for (const realmId of [actor, target]) {
      const list = perRealmIntervals.get(realmId)
      if (list) list.push({ start: startTick, end: truceTick })
    }
  }

  let totalYears = 0
  for (const intervals of perRealmIntervals.values()) {
    for (const merged of mergeIntervals(intervals)) {
      totalYears += (merged.end - merged.start) / 36
    }
  }
  return totalYears
}

export function computeBehaviorMetrics(
  world: World,
  scenarioStart: GameDate,
): BehaviorMetrics {
  const { byArchetype, withoutRuler } = groupRealmsByArchetype(world)

  const conquerorRealms = byArchetype.get('conqueror') ?? new Set<RealmId>()
  const stewardRealms = byArchetype.get('steward') ?? new Set<RealmId>()
  const schemerRealms = byArchetype.get('schemer') ?? new Set<RealmId>()

  let warsDeclared = 0
  let unattributedActions = 0
  for (const event of world.diplomacyHistory) {
    if (event.kind !== 'war_declared') continue
    const actor = event.actorRealmId
    if (!actor) continue
    if (conquerorRealms.has(actor)) warsDeclared++
    if (withoutRuler.has(actor)) unattributedActions++
  }

  const warYears = computeStewardWarYears(world, stewardRealms, scenarioStart)

  let alliances = 0
  for (const treaty of world.treaties.values()) {
    if (treaty.kind !== 'alliance') continue
    if (schemerRealms.has(treaty.realmAId)) alliances++
    if (schemerRealms.has(treaty.realmBId)) alliances++
  }

  return {
    conqueror: { warsDeclared, sampleSize: conquerorRealms.size },
    steward: { warYears, sampleSize: stewardRealms.size },
    schemer: { alliances, sampleSize: schemerRealms.size },
    unattributedActions,
  }
}
