import { describe, expect, it } from 'vitest'
import { createWorldFromM1Data, loadM1Data } from '~/engine/world/factory'
import { runTickPhases } from '~/engine/clock'
import { applyDiplomacyAction, relationKey } from '~/engine/systems/diplomacy'
import type { RealmId, World, ZhouInvestitureState } from '~/shared/types'
import * as fs from 'fs'
import * as path from 'path'

describe('performance budget', () => {
  it('100 ticks complete under 200ms p95', () => {
    const data = loadM1Data()
    const world = createWorldFromM1Data(data, 42, 'realm_qin')
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
      path.join(evidenceDir, 'm2-perf-baseline.json'),
      JSON.stringify({ p50, p95, p99, timestamp: new Date().toISOString() }, null, 2),
      'utf-8',
    )

    expect(p95, `p95 tick time ${p95.toFixed(2)}ms should be < 200ms`).toBeLessThan(200)
  }, { timeout: 60000 })

  it('100 diplomacy-loaded ticks complete under 200ms p95', () => {
    const world = createDiplomacyPerfWorld()
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
      path.join(evidenceDir, 'm3-diplomacy-perf.json'),
      JSON.stringify({ scenario: 'm3-diplomacy-tick-path', p50, p95, p99, timestamp: new Date().toISOString() }, null, 2),
      'utf-8',
    )

    expect(p95, `diplomacy-loaded p95 tick time ${p95.toFixed(2)}ms should be < 200ms`).toBeLessThan(200)
  }, { timeout: 60000 })

  it('100 M4 economy-loaded ticks complete under 200ms p95', () => {
    const world = createM4EconomyPerfWorld()
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
      path.join(evidenceDir, 'task-10-perf.json'),
      JSON.stringify({ scenario: 'm4-economy-loaded-tick-path', p50, p95, p99, timestamp: new Date().toISOString() }, null, 2),
      'utf-8',
    )

    expect(p95, `M4 economy-loaded p95 tick time ${p95.toFixed(2)}ms should be < 200ms`).toBeLessThan(200)
  }, { timeout: 60000 })
})

function createDiplomacyPerfWorld(): World {
  const baseWorld = createWorldFromM1Data(loadM1Data(), 42, 'realm_qin')
  const counterpartRealmIds = [...baseWorld.realms.keys()]
    .filter((realmId) => realmId !== baseWorld.playerRealmId)
    .sort((left, right) => left.localeCompare(right))

  const firstCounterpart = counterpartRealmIds[0]
  const secondCounterpart = counterpartRealmIds[1]
  const thirdCounterpart = counterpartRealmIds[2]

  if (!firstCounterpart || !secondCounterpart || !thirdCounterpart) {
    throw new Error('Expected at least three non-player realms for diplomacy perf coverage')
  }

  let world = baseWorld
  world = withRelation(world, firstCounterpart, 90, 90)
  world = withRelation(world, secondCounterpart, 30, 25)
  world = withRelation(world, thirdCounterpart, -10, 5)
  world = withActiveInvestiture(world, {
    realmId: world.playerRealmId,
    recognizedTitle: '王',
    grantedAtTick: world.tick,
    expiresAtTick: world.tick + 50,
    source: 'zhou',
  })
  world = applyAcceptedAction(world, { kind: 'envoy', proposingRealmId: world.playerRealmId, targetRealmId: firstCounterpart })
  world = applyAcceptedAction(world, { kind: 'alliance', proposingRealmId: world.playerRealmId, targetRealmId: firstCounterpart })
  world = applyAcceptedAction(world, { kind: 'declare_war', proposingRealmId: world.playerRealmId, targetRealmId: secondCounterpart })
  world = applyAcceptedAction(world, { kind: 'peace', proposingRealmId: world.playerRealmId, targetRealmId: secondCounterpart })
  return world
}

function withRelation(world: World, counterpartRealmId: RealmId, attitude: number, trust: number): World {
  const key = relationKey(world.playerRealmId, counterpartRealmId)
  const realmAId = world.playerRealmId.localeCompare(counterpartRealmId) <= 0
    ? world.playerRealmId
    : counterpartRealmId
  const realmBId = realmAId === world.playerRealmId ? counterpartRealmId : world.playerRealmId
  const relations = new Map(world.relations)
  relations.set(key, {
    key,
    realmAId,
    realmBId,
    attitude,
    trust,
    updatedAt: world.date,
  })
  return { ...world, relations }
}

function withActiveInvestiture(world: World, investiture: ZhouInvestitureState): World {
  const zhouInvestiture = new Map(world.zhouInvestiture)
  zhouInvestiture.set(investiture.realmId, investiture)
  return { ...world, zhouInvestiture }
}

function applyAcceptedAction(
  world: World,
  request: { readonly kind: 'envoy' | 'alliance' | 'declare_war' | 'peace'; readonly proposingRealmId: RealmId; readonly targetRealmId: RealmId },
): World {
  const result = applyDiplomacyAction(world, request)
  if (!result.ok) {
    throw new Error(`Expected diplomacy action ${request.kind} to succeed for perf coverage, got ${result.reason}`)
  }
  return result.world
}

function createM4EconomyPerfWorld(): World {
  const baseWorld = createWorldFromM1Data(loadM1Data(), 42, 'realm_qin')
  const playerSite = [...baseWorld.sites.values()]
    .filter((site) => site.ownerId === baseWorld.playerRealmId)
    .sort((left, right) => left.id.localeCompare(right.id))[0]
  const playerGeneral = [...baseWorld.generals.values()]
    .filter((general) => general.realmId === baseWorld.playerRealmId)
    .sort((left, right) => left.id.localeCompare(right.id))[0]

  if (!playerSite || !playerGeneral) {
    throw new Error('Expected at least one owned site and one player general for M4 perf coverage')
  }

  const edicts = new Map(baseWorld.edicts)
  edicts.set('edict_perf_tax_relief', {
    id: 'edict_perf_tax_relief',
    realmId: baseWorld.playerRealmId,
    kind: 'edict_tax_relief',
    startedAtTick: baseWorld.tick,
    durationMonths: 100,
    remainingMonths: 100,
    status: 'active',
  })
  edicts.set('edict_perf_grain_reserve', {
    id: 'edict_perf_grain_reserve',
    realmId: baseWorld.playerRealmId,
    kind: 'edict_grain_reserve',
    startedAtTick: baseWorld.tick,
    durationMonths: 100,
    remainingMonths: 100,
    status: 'active',
  })

  const governorAssignments = new Map(baseWorld.governorAssignments)
  governorAssignments.set(playerSite.id, {
    siteId: playerSite.id,
    realmId: baseWorld.playerRealmId,
    generalId: playerGeneral.id,
    assignedAtTick: baseWorld.tick,
    modifierKind: 'tax_efficiency',
  })

  return {
    ...baseWorld,
    edicts,
    governorAssignments,
  }
}
