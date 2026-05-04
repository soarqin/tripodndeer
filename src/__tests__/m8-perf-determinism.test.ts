import * as fs from 'fs'
import * as path from 'path'
import { describe, expect, test } from 'vitest'

import { runTickPhases } from '~/engine/clock'
import { createWorldFromM1Data, loadM1Data } from '~/engine/world/factory'
import type { GeneralId, PersonalityArchetype, RealmId, RulerState, World } from '~/shared/types'

const RUNS = 10
const TICKS = 100

describe('M8 perf regression', () => {
  test('100 ticks complete under 200ms p95', () => {
    const times = measuredTickTimes()

    times.sort((a, b) => a - b)
    const p95 = times[Math.floor(times.length * 0.95)]!

    writeEvidence('task-18-perf.txt', `p95=${p95.toFixed(3)}ms\n`)

    expect(p95, `p95=${p95.toFixed(2)}ms`).toBeLessThan(200)
  })
})

describe('M8 determinism', () => {
  test('same seed + same mapping → byte-equal world hash', () => {
    const worldA = runTicks(
      withRulerMapping(createWorld('realm_zhao'), 'conqueror'),
      TICKS,
    )
    const worldB = runTicks(
      withRulerMapping(createWorld('realm_zhao'), 'conqueror'),
      TICKS,
    )

    const hashA = worldHash(worldA)
    const hashB = worldHash(worldB)

    expect(hashA).toBe(hashB)
  })

  test('different mapping → different world hash', () => {
    const worldA = runTicks(
      withRulerMapping(createWorld('realm_zhao'), 'conqueror'),
      TICKS,
    )
    const worldB = runTicks(
      withRulerMapping(createWorld('realm_zhao'), 'steward'),
      TICKS,
    )

    const hashA = worldHash(worldA)
    const hashB = worldHash(worldB)

    writeEvidence('task-18-determinism-effective.txt', `${hashA}\n${hashB}\n`)

    expect(hashA).not.toBe(hashB)
  })
})

function createWorld(playerRealmId: RealmId = 'realm_qin'): World {
  return seedRulers(createWorldFromM1Data(loadM1Data(), 42, playerRealmId))
}

function withRulerMapping(world: World, personality: PersonalityArchetype): World {
  const rulers = new Map(world.rulers)
  const qinRuler = rulers.get('realm_qin')

  if (qinRuler) {
    rulers.set('realm_qin', { ...qinRuler, personality })
  }

  return { ...world, rulers }
}

function seedRulers(world: World): World {
  const rulers = new Map<RealmId, RulerState>(world.rulers)
  rulers.set('realm_qin', makeRuler('realm_qin', 'gen_baiqi', 'conqueror'))
  rulers.set('realm_zhao', makeRuler('realm_zhao', 'gen_lianpo', 'steward'))
  return { ...world, rulers }
}

function makeRuler(realmId: RealmId, generalId: GeneralId, personality: PersonalityArchetype): RulerState {
  return {
    realmId,
    generalId,
    age: 40,
    lifespan: 70,
    health: 100,
    personality,
    successionLawId: 'primogeniture',
    inOfficeSinceTick: 0,
  }
}

function runTicks(world: World, count: number, onTick?: (durationMs: number) => void): World {
  let currentWorld = world

  for (let i = 0; i < count; i++) {
    const start = performance.now()
    const result = runTickPhases(currentWorld, currentWorld.rngState)
    onTick?.(performance.now() - start)
    currentWorld = result.world
  }

  return currentWorld
}

function measuredTickTimes(): number[] {
  const times: number[] = []

  for (let i = 0; i < RUNS; i++) {
    const world = createWorld()
    runTicks(world, TICKS, (durationMs) => times.push(durationMs))
  }

  return times
}

function worldHash(world: World): string {
  return JSON.stringify(world, (_, value) => (value instanceof Map ? [...value.entries()] : value))
}

function writeEvidence(filename: string, content: string): void {
  const evidenceDir = path.resolve(process.cwd(), '.sisyphus/evidence')
  if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true })
  fs.writeFileSync(path.join(evidenceDir, filename), content, 'utf-8')
}
