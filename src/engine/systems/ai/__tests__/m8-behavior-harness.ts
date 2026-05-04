import { runTickPhases } from '~/engine/clock'
import { createWorldFromM1Data, loadM1Data } from '~/engine/world/factory'
import type { M1DataV7 } from '~/shared/schemas'
import {
  ESPIONAGE_ACTION_KINDS,
  type EdictKind,
  type EspionageActionKind,
  type GameEvent,
  type PersonalityArchetype,
  type RealmId,
  type Specialty,
  type World,
} from '~/shared/types'

export type M1Data = M1DataV7

export type TacticalActionKind =
  | 'attack'
  | 'siege-continue'
  | 'cut-supply'
  | 'retreat'

export interface BehaviorCounters {
  readonly warDeclarations: number
  readonly peaceAcceptances: number
  readonly peaceRejections: number
  readonly allianceAcceptances: number
  readonly allianceRejections: number
  readonly coalitionJoins: number
  readonly coalitionLeaves: number
  readonly recruitmentBySpecialty: Record<Specialty, number>
  readonly edictsIssuedByKind: Record<EdictKind, number>
  readonly reformsAttempted: number
  readonly espionageActionsByKind: Record<EspionageActionKind, number>
  readonly tacticalActionsByKind: Record<TacticalActionKind, number>
  readonly taxRateFinal: number
  readonly taxRateInitial: number
  readonly treasuryFinal: number
  readonly traitsFinal: readonly string[]
  readonly tacticalActionTotal: number
  readonly espionageActionTotal: number
  readonly taxRateDelta: number
}

export type BehaviorReport = Record<PersonalityArchetype, BehaviorCounters>

export interface BehaviorHarnessOptions {
  readonly seeds: number[]
  readonly ticks: number
  readonly archetypeMapping: Record<RealmId, PersonalityArchetype>
  readonly scenario?: M1Data
}

export const DEFAULT_ARCHETYPE_MAPPING: Record<
  RealmId,
  PersonalityArchetype
> = {
  realm_qin: 'conqueror',
  realm_chu: 'steward',
  realm_qi: 'schemer',
  realm_zhao: 'learned',
  realm_yan: 'tyrant',
  realm_wei: 'incompetent',
  realm_han: 'benevolent',
  realm_zhou: 'builder',
}

const PLAYER_OBSERVER_REALM_ID = 'realm_test_observer'

const PERSONALITY_ARCHETYPES: readonly PersonalityArchetype[] = [
  'conqueror',
  'steward',
  'schemer',
  'learned',
  'tyrant',
  'incompetent',
  'benevolent',
  'builder',
]

const SPECIALTIES: readonly Specialty[] = [
  'commander',
  'warrior',
  'strategist',
  'administrator',
  'reformer',
  'diplomat',
  'spy',
  'scholar',
  'engineer',
]

const EDICT_KINDS: readonly EdictKind[] = [
  'edict_tax_relief',
  'edict_grain_reserve',
]

const TACTICAL_ACTION_KINDS: readonly TacticalActionKind[] = [
  'attack',
  'siege-continue',
  'cut-supply',
  'retreat',
]

export function runBehaviorHarness(
  opts: BehaviorHarnessOptions
): BehaviorReport {
  const report = createEmptyReport()
  const scenario = opts.scenario ?? loadM1Data()

  for (const seed of opts.seeds) {
    let world = withMappedRulerPersonalities(
      createWorldFromM1Data(scenario, seed, PLAYER_OBSERVER_REALM_ID),
      opts.archetypeMapping
    )

    recordInitialRealmState(report, world, opts.archetypeMapping)

    for (let tick = 0; tick < opts.ticks; tick++) {
      const before = world
      const result = runTickPhases(world, world.rngState)
      world = result.world
      recordTickDeltas(report, before, world, result.events, opts.archetypeMapping)
    }

    recordFinalRealmState(report, world, opts.archetypeMapping)
  }

  return finalizeReport(report)
}

function withMappedRulerPersonalities(
  world: World,
  archetypeMapping: Record<RealmId, PersonalityArchetype>
): World {
  const rulers = new Map(world.rulers)
  for (const [realmId, personality] of Object.entries(archetypeMapping)) {
    const ruler = rulers.get(realmId)
    if (!ruler) continue
    rulers.set(realmId, { ...ruler, personality })
  }
  return { ...world, rulers }
}

function recordInitialRealmState(
  report: MutableBehaviorReport,
  world: World,
  archetypeMapping: Record<RealmId, PersonalityArchetype>
): void {
  for (const [realmId, archetype] of sortedMappedRealms(archetypeMapping)) {
    const realm = world.realms.get(realmId)
    if (!realm) continue
    report[archetype].taxRateInitial += realm.economy.taxRate
  }
}

function recordFinalRealmState(
  report: MutableBehaviorReport,
  world: World,
  archetypeMapping: Record<RealmId, PersonalityArchetype>
): void {
  for (const [realmId, archetype] of sortedMappedRealms(archetypeMapping)) {
    const realm = world.realms.get(realmId)
    if (!realm) continue
    const counters = report[archetype]
    counters.taxRateFinal += realm.economy.taxRate
    counters.treasuryFinal += realm.economy.treasury
    counters.traitsFinal.push(...realm.traits)
  }
}

function recordTickDeltas(
  report: MutableBehaviorReport,
  before: World,
  after: World,
  events: readonly GameEvent[],
  archetypeMapping: Record<RealmId, PersonalityArchetype>
): void {
  recordEvents(report, events, archetypeMapping)
  recordCoalitionDeltas(report, before, after, archetypeMapping)
  recordRecruitmentDeltas(report, before, after, archetypeMapping)
  recordEdictDeltas(report, before, after, archetypeMapping)
  recordReformDeltas(report, before, after, archetypeMapping)
  recordEspionageDeltas(report, before, after, archetypeMapping)
}

function recordEvents(
  report: MutableBehaviorReport,
  events: readonly GameEvent[],
  archetypeMapping: Record<RealmId, PersonalityArchetype>
): void {
  for (const event of events) {
    const payload = payloadRecord(event)
    if (!payload) continue

    if (event.type === 'warDeclared') {
      incrementForRealm(
        report,
        archetypeMapping,
        stringField(payload, 'byRealm'),
        'warDeclarations'
      )
      continue
    }

    if (event.type === 'diplomacyEvent') {
      recordDiplomacyEvent(report, payload, archetypeMapping)
      continue
    }

    if (event.type === 'aiDispatchedArmy') {
      incrementTactical(report, archetypeMapping, payload, 'attack')
      continue
    }

    if (event.type === 'aiStartedSiege') {
      incrementTactical(report, archetypeMapping, payload, 'siege-continue')
      continue
    }

    if (event.type === 'aiRetreatedArmy') {
      incrementTactical(report, archetypeMapping, payload, 'retreat')
    }
  }
}

function recordDiplomacyEvent(
  report: MutableBehaviorReport,
  payload: EventPayload,
  archetypeMapping: Record<RealmId, PersonalityArchetype>
): void {
  const kind = stringField(payload, 'kind')
  const actorRealmId = stringField(payload, 'actorRealmId')
  if (kind === 'war_declared') {
    incrementForRealm(report, archetypeMapping, actorRealmId, 'warDeclarations')
    return
  }

  if (kind !== 'proposal_resolved') return
  const proposalId = stringField(payload, 'proposalId')
  if (!proposalId) return

  const accepted = !proposalId.includes('_rejected_')
  if (proposalId.includes('peace')) {
    incrementForRealm(
      report,
      archetypeMapping,
      actorRealmId,
      accepted ? 'peaceAcceptances' : 'peaceRejections'
    )
  }
  if (proposalId.includes('alliance')) {
    incrementForRealm(
      report,
      archetypeMapping,
      actorRealmId,
      accepted ? 'allianceAcceptances' : 'allianceRejections'
    )
  }
}

function recordCoalitionDeltas(
  report: MutableBehaviorReport,
  before: World,
  after: World,
  archetypeMapping: Record<RealmId, PersonalityArchetype>
): void {
  const beforeMemberships = coalitionMemberships(before)
  const afterMemberships = coalitionMemberships(after)

  for (const [realmId, afterIds] of afterMemberships) {
    const beforeIds = beforeMemberships.get(realmId) ?? new Set<string>()
    for (const coalitionId of afterIds) {
      if (beforeIds.has(coalitionId)) continue
      incrementForRealm(report, archetypeMapping, realmId, 'coalitionJoins')
    }
  }

  for (const [realmId, beforeIds] of beforeMemberships) {
    const afterIds = afterMemberships.get(realmId) ?? new Set<string>()
    for (const coalitionId of beforeIds) {
      if (afterIds.has(coalitionId)) continue
      incrementForRealm(report, archetypeMapping, realmId, 'coalitionLeaves')
    }
  }
}

function coalitionMemberships(world: World): Map<RealmId, Set<string>> {
  const memberships = new Map<RealmId, Set<string>>()
  for (const coalition of [...world.coalitions.values()].sort((a, b) =>
    a.id.localeCompare(b.id)
  )) {
    if (coalition.status === 'dissolved') continue
    for (const realmId of [...coalition.memberRealmIds].sort((a, b) =>
      a.localeCompare(b)
    )) {
      const current = memberships.get(realmId) ?? new Set<string>()
      current.add(coalition.id)
      memberships.set(realmId, current)
    }
  }
  return memberships
}

function recordRecruitmentDeltas(
  report: MutableBehaviorReport,
  before: World,
  after: World,
  archetypeMapping: Record<RealmId, PersonalityArchetype>
): void {
  for (const general of [...after.generals.values()].sort((a, b) =>
    a.id.localeCompare(b.id)
  )) {
    if (before.generals.has(general.id) || !general.specialty) continue
    const archetype = archetypeMapping[general.realmId]
    if (!archetype) continue
    report[archetype].recruitmentBySpecialty[general.specialty] += 1
  }
}

function recordEdictDeltas(
  report: MutableBehaviorReport,
  before: World,
  after: World,
  archetypeMapping: Record<RealmId, PersonalityArchetype>
): void {
  for (const edict of [...after.edicts.values()].sort((a, b) =>
    a.id.localeCompare(b.id)
  )) {
    if (before.edicts.has(edict.id)) continue
    const archetype = archetypeMapping[edict.realmId]
    if (!archetype) continue
    report[archetype].edictsIssuedByKind[edict.kind] += 1
  }
}

function recordReformDeltas(
  report: MutableBehaviorReport,
  before: World,
  after: World,
  archetypeMapping: Record<RealmId, PersonalityArchetype>
): void {
  for (const reformState of [...after.reformStates.values()].sort((a, b) =>
    a.realmId.localeCompare(b.realmId)
  )) {
    if (before.reformStates.has(reformState.realmId)) continue
    incrementForRealm(
      report,
      archetypeMapping,
      reformState.realmId,
      'reformsAttempted'
    )
  }
}

function recordEspionageDeltas(
  report: MutableBehaviorReport,
  before: World,
  after: World,
  archetypeMapping: Record<RealmId, PersonalityArchetype>
): void {
  for (const mission of [...after.spyMissions.values()].sort((a, b) =>
    a.id.localeCompare(b.id)
  )) {
    if (before.spyMissions.has(mission.id)) continue
    const archetype = archetypeMapping[mission.spyRealmId]
    if (!archetype) continue
    report[archetype].espionageActionsByKind[mission.action] += 1
  }
}

type EventPayload = Readonly<Record<string, unknown>>

function payloadRecord(event: GameEvent): EventPayload | null {
  if (
    typeof event.payload !== 'object' ||
    event.payload === null ||
    Array.isArray(event.payload)
  ) {
    return null
  }
  return event.payload as EventPayload
}

function stringField(payload: EventPayload, key: string): string | null {
  const value = payload[key]
  return typeof value === 'string' ? value : null
}

type IncrementKey =
  | 'warDeclarations'
  | 'peaceAcceptances'
  | 'peaceRejections'
  | 'allianceAcceptances'
  | 'allianceRejections'
  | 'coalitionJoins'
  | 'coalitionLeaves'
  | 'reformsAttempted'

function incrementForRealm(
  report: MutableBehaviorReport,
  archetypeMapping: Record<RealmId, PersonalityArchetype>,
  realmId: RealmId | null,
  key: IncrementKey
): void {
  if (!realmId) return
  const archetype = archetypeMapping[realmId]
  if (!archetype) return
  report[archetype][key] += 1
}

function incrementTactical(
  report: MutableBehaviorReport,
  archetypeMapping: Record<RealmId, PersonalityArchetype>,
  payload: EventPayload,
  kind: TacticalActionKind
): void {
  const realmId = stringField(payload, 'realmId')
  const archetype = realmId ? archetypeMapping[realmId] : undefined
  if (!archetype) return
  report[archetype].tacticalActionsByKind[kind] += 1
}

function sortedMappedRealms(
  archetypeMapping: Record<RealmId, PersonalityArchetype>
): readonly (readonly [RealmId, PersonalityArchetype])[] {
  return Object.entries(archetypeMapping).sort(([left], [right]) =>
    left.localeCompare(right)
  )
}

type MutableBehaviorCounters = {
  -readonly [Key in keyof BehaviorCounters]: BehaviorCounters[Key]
} & {
  recruitmentBySpecialty: Record<Specialty, number>
  edictsIssuedByKind: Record<EdictKind, number>
  espionageActionsByKind: Record<EspionageActionKind, number>
  tacticalActionsByKind: Record<TacticalActionKind, number>
  traitsFinal: string[]
}

type MutableBehaviorReport = Record<PersonalityArchetype, MutableBehaviorCounters>

function createEmptyReport(): MutableBehaviorReport {
  const reportEntries = PERSONALITY_ARCHETYPES.map((archetype) => [
    archetype,
    createEmptyCounters(),
  ])
  return Object.fromEntries(reportEntries) as MutableBehaviorReport
}

function createEmptyCounters(): MutableBehaviorCounters {
  return {
    warDeclarations: 0,
    peaceAcceptances: 0,
    peaceRejections: 0,
    allianceAcceptances: 0,
    allianceRejections: 0,
    coalitionJoins: 0,
    coalitionLeaves: 0,
    recruitmentBySpecialty: zeroSpecialtyCounters(),
    edictsIssuedByKind: zeroEdictCounters(),
    reformsAttempted: 0,
    espionageActionsByKind: zeroEspionageCounters(),
    tacticalActionsByKind: zeroTacticalCounters(),
    taxRateFinal: 0,
    taxRateInitial: 0,
    treasuryFinal: 0,
    traitsFinal: [],
    tacticalActionTotal: 0,
    espionageActionTotal: 0,
    taxRateDelta: 0,
  }
}

function zeroSpecialtyCounters(): Record<Specialty, number> {
  const entries = SPECIALTIES.map((specialty) => [specialty, 0])
  return Object.fromEntries(entries) as Record<Specialty, number>
}

function zeroEdictCounters(): Record<EdictKind, number> {
  const entries = EDICT_KINDS.map((kind) => [kind, 0])
  return Object.fromEntries(entries) as Record<EdictKind, number>
}

function zeroEspionageCounters(): Record<EspionageActionKind, number> {
  const entries = ESPIONAGE_ACTION_KINDS.map((kind) => [kind, 0])
  return Object.fromEntries(entries) as Record<EspionageActionKind, number>
}

function zeroTacticalCounters(): Record<TacticalActionKind, number> {
  const entries = TACTICAL_ACTION_KINDS.map((kind) => [kind, 0])
  return Object.fromEntries(entries) as Record<TacticalActionKind, number>
}

function finalizeReport(report: MutableBehaviorReport): BehaviorReport {
  for (const archetype of PERSONALITY_ARCHETYPES) {
    const counters = report[archetype]
    counters.traitsFinal.sort((a, b) => a.localeCompare(b))
    counters.tacticalActionTotal = sumRecord(counters.tacticalActionsByKind)
    counters.espionageActionTotal = sumRecord(counters.espionageActionsByKind)
    counters.taxRateDelta = counters.taxRateFinal - counters.taxRateInitial
  }
  return report
}

function sumRecord(record: Readonly<Record<string, number>>): number {
  return Object.values(record).reduce((sum, value) => sum + value, 0)
}
