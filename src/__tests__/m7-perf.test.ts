import * as fs from 'fs'
import * as path from 'path'
import { describe, expect, it } from 'vitest'

import { runTickPhases } from '~/engine/clock'
import { espionagePhase } from '~/engine/systems/espionage/espionage-phase'
import { createWorldFromM1Data, loadM1Data } from '~/engine/world/factory'
import {
  M7_DISCORD_DURATION_TICKS,
  M7_ENABLED,
  M7_RECON_DURATION_TICKS,
  M7_RUMOR_DURATION_TICKS,
} from '~/content/m2/balance'
import type {
  EspionageActionKind,
  General,
  RealmId,
  SpyMission,
  SpyMissionId,
  World,
} from '~/shared/types'

const ESPIONAGE_DURATIONS: Record<Exclude<EspionageActionKind, 'counter_intel'>, number> = {
  reconnaissance: M7_RECON_DURATION_TICKS,
  rumor: M7_RUMOR_DURATION_TICKS,
  discord: M7_DISCORD_DURATION_TICKS,
}

function pickFirstNonSpy(world: World, realmId: RealmId): General | null {
  return (
    [...world.generals.values()]
      .filter((g) => g.realmId === realmId && g.specialty !== 'spy')
      .sort((a, b) => a.id.localeCompare(b.id))[0] ?? null
  )
}

function buildSeededMissions(world: World): ReadonlyMap<SpyMissionId, SpyMission> {
  const spies = [...world.generals.values()]
    .filter((g) => g.specialty === 'spy')
    .sort((a, b) => a.id.localeCompare(b.id))
  const realmIds = [...world.realms.keys()].sort((a, b) => a.localeCompare(b))
  const actions: ReadonlyArray<Exclude<EspionageActionKind, 'counter_intel'>> = [
    'reconnaissance',
    'rumor',
    'discord',
  ]

  const missions = new Map<SpyMissionId, SpyMission>()
  for (let i = 0; i < spies.length; i++) {
    const spy = spies[i]!
    const targetRealmId =
      realmIds.find((id) => id !== spy.realmId) ?? realmIds[0]!
    const action = actions[i % actions.length]!
    const mission: SpyMission = {
      id: `perf_mission_${i}`,
      spyGeneralId: spy.id,
      spyRealmId: spy.realmId,
      targetRealmId,
      action,
      startTick: 0,
      resolveTick: world.tick + ESPIONAGE_DURATIONS[action],
      status: 'in_progress',
      targetGeneralId:
        action === 'discord' ? pickFirstNonSpy(world, targetRealmId)?.id ?? null : null,
    }
    missions.set(mission.id, mission)
  }
  return missions
}

describe('M7 performance budget', () => {
  it('confirms M7 espionage subsystem is enabled for perf test', () => {
    expect(M7_ENABLED).toBe(true)
  })

  it('100 ticks complete under 200ms p95 (with M7 espionage phase enabled, 6 spies, active missions)', () => {
    const data = loadM1Data()
    const baseWorld = createWorldFromM1Data(data, 42, 'realm_qin')
    const world: World = {
      ...baseWorld,
      spyMissions: buildSeededMissions(baseWorld),
    }

    const times: number[] = []
    let currentWorld = world
    for (let i = 0; i < 100; i++) {
      const start = performance.now()
      const result = runTickPhases(currentWorld, currentWorld.rngState)
      times.push(performance.now() - start)
      currentWorld = result.world
    }

    times.sort((a, b) => a - b)
    const p50 = times[Math.floor(times.length * 0.5)]!
    const p95 = times[Math.floor(times.length * 0.95)]!
    const p99 = times[Math.floor(times.length * 0.99)]!

    const evidenceDir = path.resolve(process.cwd(), '.sisyphus/evidence')
    if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true })
    fs.writeFileSync(
      path.join(evidenceDir, 'm7-espionage-perf.json'),
      JSON.stringify(
        {
          scenario: 'm7-with-espionage-phase',
          p50,
          p95,
          p99,
          timestamp: new Date().toISOString(),
        },
        null,
        2,
      ),
      'utf-8',
    )

    expect(p95, `p95 tick time ${p95.toFixed(2)}ms should be < 200ms`).toBeLessThan(200)
  }, { timeout: 60000 })

  it('espionagePhase isolated < 15ms per tick (p95) over 100 invocations', () => {
    const data = loadM1Data()
    const baseWorld = createWorldFromM1Data(data, 42, 'realm_qin')
    const world: World = {
      ...baseWorld,
      spyMissions: buildSeededMissions(baseWorld),
    }

    const phaseTimes: number[] = []
    let currentWorld = world
    let currentRng = currentWorld.rngState

    for (let i = 0; i < 100; i++) {
      const start = performance.now()
      const result = espionagePhase(currentWorld, currentRng)
      phaseTimes.push(performance.now() - start)
      currentWorld = { ...result.world, tick: currentWorld.tick + 1 }
      currentRng = result.nextRng

      if (i % 10 === 9) {
        currentWorld = { ...currentWorld, spyMissions: buildSeededMissions(currentWorld) }
      }
    }

    phaseTimes.sort((a, b) => a - b)
    const p95 = phaseTimes[Math.floor(phaseTimes.length * 0.95)]!
    const avg = phaseTimes.reduce((a, b) => a + b, 0) / phaseTimes.length

    const evidenceDir = path.resolve(process.cwd(), '.sisyphus/evidence')
    if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true })
    fs.writeFileSync(
      path.join(evidenceDir, 'm7-espionage-phase-perf.json'),
      JSON.stringify(
        {
          scenario: 'm7-espionage-phase-only',
          p95,
          avg,
          samples: phaseTimes.slice(0, 10),
          timestamp: new Date().toISOString(),
        },
        null,
        2,
      ),
      'utf-8',
    )

    expect(
      p95,
      `espionagePhase p95 per-tick ${p95.toFixed(2)}ms should be < 15ms`,
    ).toBeLessThan(15)
  }, { timeout: 60000 })
})
