import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { runTickPhases } from '~/engine/clock'
import { createWorldFromM1Data, loadM1Data } from '~/engine/world/factory'
import type { GameEvent, World } from '~/shared/types'

const SEED = 42
const TICKS = 100
const PLAYER_REALM_ID = 'realm_qin'
const EVIDENCE_DIR = '.sisyphus/evidence'
const BASELINE_FILE = `${EVIDENCE_DIR}/task-T8.6-hero-baseline.json`
const PRE_M8_1_BASELINE_FILE = `${EVIDENCE_DIR}/m8-baseline-pre-m8_1/conqueror.json`

interface EventTrace {
  readonly tick: number
  readonly kind: string
  readonly realmId: string | null
  readonly target: string | null
}

interface BaselineRun {
  readonly seed: number
  readonly ticks: number
  readonly difficulty: 'hero'
  readonly finalWorldHash: string
  readonly eventCount: number
  readonly eventDigest: string
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
    for (const [key, entryValue] of value as Map<unknown, unknown>) {
      entries.push([String(key), canonicalize(entryValue)])
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
  for (const key of keys) {
    if (key === 'phases') continue
    result[key] = canonicalize(obj[key])
  }
  return result
}

function hashWorld(world: World): string {
  return createHash('sha256').update(JSON.stringify(canonicalize(world))).digest('hex')
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
    traces.push({ tick, kind: event.type, realmId, target })
  }
  return traces
}

function digestEvents(traces: readonly EventTrace[]): string {
  return createHash('sha256').update(JSON.stringify(traces)).digest('hex')
}

function runHeroBaseline(): BaselineRun & { traces: readonly EventTrace[] } {
  let world = createWorldFromM1Data(loadM1Data(), SEED, PLAYER_REALM_ID)
  let rng = world.rngState
  const traces: EventTrace[] = []

  for (let tick = 0; tick < TICKS; tick++) {
    const result = runTickPhases(world, rng)
    world = result.world
    rng = result.nextRng
    traces.push(...extractTrace(tick, result.events))
  }

  return {
    seed: SEED,
    ticks: TICKS,
    difficulty: 'hero',
    finalWorldHash: hashWorld(world),
    eventCount: traces.length,
    eventDigest: digestEvents(traces),
    traces,
  }
}

describe('M8.1 baseline pinning at hero difficulty', () => {
  it(
    'AI decisions are deterministic: same seed → same event log + same world hash',
    () => {
      const first = runHeroBaseline()
      const second = runHeroBaseline()

      expect(first.finalWorldHash).toBe(second.finalWorldHash)
      expect(first.eventCount).toBe(second.eventCount)
      expect(first.eventDigest).toBe(second.eventDigest)
      expect(first.traces).toEqual(second.traces)
      expect(first.finalWorldHash).toMatch(/^[a-f0-9]{64}$/)
    },
    180_000,
  )

  it(
    'hero default difficulty: factory yields difficulty === hero',
    () => {
      const world = createWorldFromM1Data(loadM1Data(), SEED, PLAYER_REALM_ID)
      expect(world.difficulty).toBe('hero')
    },
  )

  it(
    'pins hero baseline to evidence file (no regression from M8.1)',
    () => {
      ensureDir(EVIDENCE_DIR)
      const run = runHeroBaseline()

      const baseline: BaselineRun = {
        seed: run.seed,
        ticks: run.ticks,
        difficulty: run.difficulty,
        finalWorldHash: run.finalWorldHash,
        eventCount: run.eventCount,
        eventDigest: run.eventDigest,
      }

      writeFileSync(BASELINE_FILE, JSON.stringify(baseline, null, 2) + '\n', 'utf8')

      expect(run.eventCount).toBeGreaterThan(0)
      expect(run.finalWorldHash).toMatch(/^[a-f0-9]{64}$/)
      expect(run.eventDigest).toMatch(/^[a-f0-9]{64}$/)
    },
    180_000,
  )

  it(
    'hero hash matches pre-M8.1 baseline (formal no-regression assertion)',
    () => {
      const preBaseline = JSON.parse(readFileSync(PRE_M8_1_BASELINE_FILE, 'utf8')) as {
        finalWorldHash: string
        eventCount: number
        seed: number
      }
      const run = runHeroBaseline()

      expect(preBaseline.seed).toBe(SEED)
      expect(run.finalWorldHash).toBe(preBaseline.finalWorldHash)
      expect(run.eventCount).toBe(preBaseline.eventCount)
    },
    180_000,
  )
})
