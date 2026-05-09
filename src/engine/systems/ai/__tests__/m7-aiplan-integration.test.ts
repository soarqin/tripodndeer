import { describe, expect, it, vi } from 'vitest'

import { aiPlanStep } from '../ai'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import type {
  General,
  GeneralId,
  PersonalityArchetype,
  Realm,
  RealmId,
  RulerState,
  World,
} from '~/shared/types'

const QIN: RealmId = 'realm_qin'
const CHU: RealmId = 'realm_chu'
const ZHAO: RealmId = 'realm_zhao'

function makeRealm(id: RealmId): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#000000',
    capital: `site_${id}`,
    initialSites: [],
    initialArmies: [],
    aiPersonality: 'aggressive_random',
    economy: { treasury: 0, foodStores: 0, taxRate: 10 },
    traits: [],
    politicalSystem: 'enfeoffment',
  }
}

function makeRuler(realmId: RealmId, personality: PersonalityArchetype): RulerState {
  return {
    realmId,
    generalId: `general_${realmId}_ruler`,
    age: 40,
    lifespan: 70,
    health: 80,
    personality,
    personalityDims: {
      expansionDrive: 0.5,
      diplomaticTrust: 0.5,
      caution: 0.5,
      honor: 0.5,
      vindictiveness: 0.5,
      reformInclination: 0.5,
      patience: 0.5,
      preferredStrategy: 'diplomatic',
    },
    successionLawId: 'primogeniture',
    inOfficeSinceTick: 0,
  }
}

function makeSpy(id: GeneralId, realmId: RealmId): General {
  return {
    id,
    realmId,
    name: id,
    might: 10,
    command: 10,
    loyalty: 80,
    specialty: 'spy',
    attrs: { wu: 10, zheng: 10, jiao: 16, mou: 18, xue: 10, po: 10 },
  }
}

function makeCommander(id: GeneralId, realmId: RealmId): General {
  return {
    id,
    realmId,
    name: id,
    might: 50,
    command: 50,
    loyalty: 80,
    specialty: 'commander',
  }
}

function buildWorld(opts: {
  spyRealmId: RealmId
  withSpy: boolean
  personality?: PersonalityArchetype
  targets?: readonly RealmId[]
  tick?: number
  playerRealmId?: RealmId
}): World {
  const targets = opts.targets ?? [CHU, ZHAO]
  const realms = new Map<RealmId, Realm>()
  realms.set(opts.spyRealmId, makeRealm(opts.spyRealmId))
  for (const t of targets) realms.set(t, makeRealm(t))

  const generals = new Map<GeneralId, General>()
  if (opts.withSpy) {
    generals.set(
      `general_${opts.spyRealmId}_spy`,
      makeSpy(`general_${opts.spyRealmId}_spy`, opts.spyRealmId),
    )
  }
  for (const t of targets) {
    generals.set(`general_${t}_commander`, makeCommander(`general_${t}_commander`, t))
  }

  const rulers = new Map<RealmId, RulerState>()
  if (opts.personality) {
    rulers.set(opts.spyRealmId, makeRuler(opts.spyRealmId, opts.personality))
  }

  return makeEmptyWorld({
    tick: opts.tick ?? 0,
    realms,
    generals,
    rulers,
    playerRealmId: opts.playerRealmId ?? 'realm_player_unused',
  })
}

describe('aiPlanStep + planEspionageAction integration', () => {
  it('§12.3.B — Schemer + low trust env produces a mission with kind=rumor', () => {
    const world = buildWorld({
      spyRealmId: QIN,
      withSpy: true,
      personality: 'schemer',
      tick: 0,
    })

    const result = aiPlanStep(world, { seed: 1, counter: 0 })

    expect(result.world.spyMissions.size).toBeGreaterThan(0)
    const mission = [...result.world.spyMissions.values()].find(
      (m) => m.spyRealmId === QIN,
    )
    expect(mission).toBeDefined()
    expect(mission!.action).toBe('rumor')
  })

  it('Tyrant + spy general produces a discord mission', () => {
    const world = buildWorld({
      spyRealmId: QIN,
      withSpy: true,
      personality: 'tyrant',
      tick: 0,
    })

    const result = aiPlanStep(world, { seed: 1, counter: 0 })

    const mission = [...result.world.spyMissions.values()].find(
      (m) => m.spyRealmId === QIN,
    )
    expect(mission).toBeDefined()
    expect(mission!.action).toBe('discord')
  })

  it('Skips espionage when realm has no spy specialty general', () => {
    const world = buildWorld({
      spyRealmId: QIN,
      withSpy: false,
      personality: 'schemer',
      tick: 0,
    })

    const result = aiPlanStep(world, { seed: 1, counter: 0 })
    const qinMissions = [...result.world.spyMissions.values()].filter(
      (m) => m.spyRealmId === QIN,
    )
    expect(qinMissions).toHaveLength(0)
  })

  it('Determinism: same seed + same world → same espionage outcome', () => {
    const world = buildWorld({
      spyRealmId: QIN,
      withSpy: true,
      personality: 'schemer',
      tick: 0,
    })

    const r1 = aiPlanStep(world, { seed: 42, counter: 0 })
    const r2 = aiPlanStep(world, { seed: 42, counter: 0 })

    const m1 = [...r1.world.spyMissions.values()][0]
    const m2 = [...r2.world.spyMissions.values()][0]
    expect(m1).toEqual(m2)
    expect(r1.nextRng).toEqual(r2.nextRng)
  })

  it('Skips entire espionage hook when M7_ENABLED=false', async () => {
    vi.resetModules()
    vi.doMock('~/content/m2/balance', async () => {
      const actual = await vi.importActual<typeof import('~/content/m2/balance')>(
        '~/content/m2/balance',
      )
      return { ...actual, M7_ENABLED: false }
    })
    const { aiPlanStep: gatedPlan } = await import('../ai')

    const world = buildWorld({
      spyRealmId: QIN,
      withSpy: true,
      personality: 'schemer',
      tick: 0,
    })
    const result = gatedPlan(world, { seed: 1, counter: 0 })

    expect(result.world.spyMissions.size).toBe(0)

    vi.doUnmock('~/content/m2/balance')
    vi.resetModules()
  })

  it('Player realm is not subject to AI espionage planning', () => {
    const world = buildWorld({
      spyRealmId: QIN,
      withSpy: true,
      personality: 'schemer',
      tick: 0,
      playerRealmId: QIN,
    })

    const result = aiPlanStep(world, { seed: 1, counter: 0 })
    const qinMissions = [...result.world.spyMissions.values()].filter(
      (m) => m.spyRealmId === QIN,
    )
    expect(qinMissions).toHaveLength(0)
  })

  it('Skips espionage when AI tick is not divisible by 3 (planning cadence)', () => {
    const world = buildWorld({
      spyRealmId: QIN,
      withSpy: true,
      personality: 'schemer',
      tick: 1,
    })

    const result = aiPlanStep(world, { seed: 1, counter: 0 })
    expect(result.world.spyMissions.size).toBe(0)
  })
})
