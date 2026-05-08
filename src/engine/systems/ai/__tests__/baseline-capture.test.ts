import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { performance } from 'node:perf_hooks'
import { describe, expect, it } from 'vitest'
import { runTickPhases } from '~/engine/clock'
import {
  createWorldFromM1Data,
  createWorldFromM9Data,
  loadM1Data,
  loadM9Data,
} from '~/engine/world/factory'
import type {
  GameEvent,
  PersonalityArchetype,
  RealmId,
  RulerState,
  World,
} from '~/shared/types'

const ARCHETYPES: readonly PersonalityArchetype[] = [
  'conqueror',
  'steward',
  'schemer',
  'learned',
  'tyrant',
  'incompetent',
  'benevolent',
  'builder',
]

const ARCHETYPE_DIR = '.sisyphus/evidence/m8-baseline-pre-m8_1'
const PERF_FILE = '.sisyphus/evidence/task-T1.1-perf-baseline.json'
const SEED = 42
const TICKS = 100
const PERF_RUNS = 5

interface EventTrace {
  readonly tick: number
  readonly realmId: string | null
  readonly kind: string
  readonly target: string | null
}

interface ArchetypeBaseline {
  readonly archetype: PersonalityArchetype
  readonly seed: number
  readonly finalWorldHash: string
  readonly eventCount: number
  readonly events: readonly EventTrace[]
}

interface PerfScenario {
  readonly scenario: string
  readonly siteCount: number
  readonly ticks: number
  readonly runs: number
  readonly p50: number
  readonly p95: number
  readonly p99: number
}

interface PerfBaselineFile {
  readonly m1: PerfScenario
  readonly m9: PerfScenario
  readonly capturedAt: string
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

function canonicalize(value: unknown): unknown {
  if (value === null || typeof value === 'undefined') return null
  if (typeof value === 'function') return null
  if (typeof value !== 'object') return value
  if (value instanceof Map) {
    const entries: [string, unknown][] = []
    for (const [k, v] of value as Map<unknown, unknown>) {
      entries.push([String(k), canonicalize(v)])
    }
    entries.sort(([a], [b]) => a.localeCompare(b))
    return entries
  }
  if (value instanceof Set) {
    const items = [...value].map(canonicalize)
    items.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
    return items
  }
  if (Array.isArray(value)) return value.map(canonicalize)
  const obj = value as Record<string, unknown>
  const keys = Object.keys(obj).sort()
  const result: Record<string, unknown> = {}
  for (const k of keys) {
    if (k === 'phases') continue
    result[k] = canonicalize(obj[k])
  }
  return result
}

function hashWorld(world: World): string {
  const json = JSON.stringify(canonicalize(world))
  return createHash('sha256').update(json).digest('hex')
}

function forceAllRulersToArchetype(
  world: World,
  archetype: PersonalityArchetype,
): World {
  const rulers = new Map<RealmId, RulerState>()
  for (const [realmId, ruler] of world.rulers) {
    rulers.set(realmId, { ...ruler, personality: archetype })
  }
  return { ...world, rulers }
}

function pickStr(record: Record<string, unknown>, key: string): string | null {
  const value = record[key]
  return typeof value === 'string' && value.length > 0 ? value : null
}

function extractTrace(tick: number, events: readonly GameEvent[]): EventTrace[] {
  const traces: EventTrace[] = []
  for (const event of events) {
    const payload =
      event.payload && typeof event.payload === 'object' && !Array.isArray(event.payload)
        ? (event.payload as Record<string, unknown>)
        : {}
    const realmId =
      pickStr(payload, 'realmId') ??
      pickStr(payload, 'byRealm') ??
      pickStr(payload, 'actorRealmId') ??
      pickStr(payload, 'observerRealmId') ??
      pickStr(payload, 'spyRealmId') ??
      null
    const target =
      pickStr(payload, 'targetSiteId') ??
      pickStr(payload, 'againstRealm') ??
      pickStr(payload, 'targetRealmId') ??
      pickStr(payload, 'targetGeneralId') ??
      pickStr(payload, 'armyId') ??
      pickStr(payload, 'siteId') ??
      pickStr(payload, 'generalId') ??
      pickStr(payload, 'proposalId') ??
      pickStr(payload, 'relationKey') ??
      pickStr(payload, 'coalitionId') ??
      null
    traces.push({ tick, realmId, kind: event.type, target })
  }
  return traces
}

function captureArchetypeBaseline(
  archetype: PersonalityArchetype,
): ArchetypeBaseline {
  let world = forceAllRulersToArchetype(
    createWorldFromM1Data(loadM1Data(), SEED, 'realm_qin'),
    archetype,
  )

  let rng = world.rngState
  const events: EventTrace[] = []

  for (let tick = 0; tick < TICKS; tick++) {
    const result = runTickPhases(world, rng)
    world = result.world
    rng = result.nextRng
    events.push(...extractTrace(tick, result.events))
  }

  return {
    archetype,
    seed: SEED,
    finalWorldHash: hashWorld(world),
    eventCount: events.length,
    events,
  }
}

function percentile(sortedSamples: readonly number[], p: number): number {
  if (sortedSamples.length === 0) return 0
  const idx = Math.min(
    sortedSamples.length - 1,
    Math.max(0, Math.ceil((p / 100) * sortedSamples.length) - 1),
  )
  return sortedSamples[idx] ?? 0
}

function timePerTickRun(world0: World): readonly number[] {
  let world = world0
  let rng = world.rngState
  const samples: number[] = []
  for (let i = 0; i < TICKS; i++) {
    const start = performance.now()
    const result = runTickPhases(world, rng)
    samples.push(performance.now() - start)
    world = result.world
    rng = result.nextRng
  }
  return samples
}

function buildPerfScenario(
  scenario: string,
  siteCount: number,
  buildWorld: () => World,
): PerfScenario {
  const all: number[] = []
  for (let r = 0; r < PERF_RUNS; r++) {
    all.push(...timePerTickRun(buildWorld()))
  }
  all.sort((a, b) => a - b)
  return {
    scenario,
    siteCount,
    ticks: TICKS,
    runs: PERF_RUNS,
    p50: percentile(all, 50),
    p95: percentile(all, 95),
    p99: percentile(all, 99),
  }
}

describe('M8 baseline capture (pre-M8.1)', () => {
  it(
    'captures 8 archetype × 100-tick traces deterministically',
    () => {
      ensureDir(ARCHETYPE_DIR)

      for (const archetype of ARCHETYPES) {
        const baseline = captureArchetypeBaseline(archetype)
        const second = captureArchetypeBaseline(archetype)

        expect(second.finalWorldHash).toBe(baseline.finalWorldHash)
        expect(second.eventCount).toBe(baseline.eventCount)
        expect(second.events).toEqual(baseline.events)
        expect(baseline.finalWorldHash).toMatch(/^[a-f0-9]{64}$/)

        const filePath = `${ARCHETYPE_DIR}/${archetype}.json`
        const content = JSON.stringify(baseline, null, 2) + '\n'
        writeFileSync(filePath, content, 'utf8')
      }
    },
    180_000,
  )

  it(
    'captures perf baseline for M1 (50 sites) and M9 (250 sites) fixtures',
    async () => {
      const m1Data = loadM1Data()
      const m9Data = await loadM9Data()

      const m1 = buildPerfScenario('m1-50sites', 50, () =>
        createWorldFromM1Data(m1Data, SEED, 'realm_qin'),
      )
      const m9 = buildPerfScenario('m9-250sites', 250, () =>
        createWorldFromM9Data(m9Data, SEED, 'realm_qin'),
      )

      const file: PerfBaselineFile = {
        m1,
        m9,
        capturedAt: new Date().toISOString(),
      }

      writeFileSync(PERF_FILE, JSON.stringify(file, null, 2) + '\n', 'utf8')

      expect(m1.p50).toBeGreaterThan(0)
      expect(m9.p50).toBeGreaterThan(0)
      expect(m1.p99).toBeGreaterThanOrEqual(m1.p50)
      expect(m9.p99).toBeGreaterThanOrEqual(m9.p50)
    },
    240_000,
  )
})
