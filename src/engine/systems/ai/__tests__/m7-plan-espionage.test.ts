import { describe, expect, it } from 'vitest'
import type {
  General,
  GeneralId,
  PersonalityArchetype,
  Realm,
  RealmId,
  RulerState,
  SpyMission,
  World,
} from '~/shared/types'
import { createInitialRng } from '~/engine/random'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import { planEspionageAction } from '../ai'

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
  spyMissions?: ReadonlyMap<string, SpyMission>
  tick?: number
}): World {
  const targets = opts.targets ?? [CHU, ZHAO]
  const realms = new Map<RealmId, Realm>()
  realms.set(opts.spyRealmId, makeRealm(opts.spyRealmId))
  for (const t of targets) realms.set(t, makeRealm(t))

  const generals = new Map<GeneralId, General>()
  if (opts.withSpy) {
    generals.set(`general_${opts.spyRealmId}_spy`, makeSpy(`general_${opts.spyRealmId}_spy`, opts.spyRealmId))
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
    spyMissions: opts.spyMissions ?? new Map(),
    playerRealmId: 'realm_player_unused',
  })
}

describe('planEspionageAction', () => {
  it('returns { ok: false } when realm has no spy specialty general', () => {
    const world = buildWorld({ spyRealmId: QIN, withSpy: false })
    const realm = world.realms.get(QIN)!

    const result = planEspionageAction(world, realm, createInitialRng(1))

    expect(result.ok).toBe(false)
    expect(result.world.spyMissions.size).toBe(0)
  })

  it('returns { ok: false } when realm already has an in-progress mission', () => {
    const existing: SpyMission = {
      id: 'mission_existing',
      spyGeneralId: `general_${QIN}_spy`,
      spyRealmId: QIN,
      targetRealmId: CHU,
      action: 'reconnaissance',
      startTick: 0,
      resolveTick: 6,
      status: 'in_progress',
      targetGeneralId: null,
    }
    const world = buildWorld({
      spyRealmId: QIN,
      withSpy: true,
      personality: 'schemer',
      spyMissions: new Map([[existing.id, existing]]),
    })
    const realm = world.realms.get(QIN)!

    const result = planEspionageAction(world, realm, createInitialRng(1))

    expect(result.ok).toBe(false)
    expect(result.world.spyMissions.size).toBe(1)
    expect(result.world.spyMissions.get('mission_existing')).toEqual(existing)
  })

  it('creates a SpyMission with correct fields when spy + target available', () => {
    const world = buildWorld({
      spyRealmId: QIN,
      withSpy: true,
      personality: 'schemer',
      tick: 5,
    })
    const realm = world.realms.get(QIN)!

    const result = planEspionageAction(world, realm, createInitialRng(1))

    expect(result.ok).toBe(true)
    expect(result.world.spyMissions.size).toBe(1)
    const created = [...result.world.spyMissions.values()][0]!
    expect(created.spyRealmId).toBe(QIN)
    expect(created.spyGeneralId).toBe(`general_${QIN}_spy`)
    expect(created.status).toBe('in_progress')
    expect(created.startTick).toBe(5)
    expect(created.resolveTick).toBeGreaterThan(5)
    expect([CHU, ZHAO]).toContain(created.targetRealmId)
    expect(created.action).not.toBe('counter_intel')
  })

  it('schemer personality picks rumor (highest weight 2.5 in M7_ESPIONAGE_WEIGHTS §12.3.B)', () => {
    const world = buildWorld({
      spyRealmId: QIN,
      withSpy: true,
      personality: 'schemer',
    })
    const realm = world.realms.get(QIN)!

    const result = planEspionageAction(world, realm, createInitialRng(1))

    expect(result.ok).toBe(true)
    const created = [...result.world.spyMissions.values()][0]!
    expect(created.action).toBe('rumor')
    expect(created.targetGeneralId).toBe(null)
  })

  it('tyrant personality picks discord (highest weight 2.5 in M7_ESPIONAGE_WEIGHTS §12.3.B)', () => {
    const world = buildWorld({
      spyRealmId: QIN,
      withSpy: true,
      personality: 'tyrant',
    })
    const realm = world.realms.get(QIN)!

    const result = planEspionageAction(world, realm, createInitialRng(1))

    expect(result.ok).toBe(true)
    const created = [...result.world.spyMissions.values()][0]!
    expect(created.action).toBe('discord')
    expect(created.targetGeneralId).not.toBe(null)
    const targetGeneral = world.generals.get(created.targetGeneralId!)
    expect(targetGeneral?.realmId).toBe(created.targetRealmId)
  })

  it('determinism: same input produces same output', () => {
    const world = buildWorld({
      spyRealmId: QIN,
      withSpy: true,
      personality: 'schemer',
      tick: 7,
    })
    const realm = world.realms.get(QIN)!

    const r1 = planEspionageAction(world, realm, createInitialRng(42))
    const r2 = planEspionageAction(world, realm, createInitialRng(42))

    expect(r1.ok).toBe(true)
    expect(r2.ok).toBe(true)
    const m1 = [...r1.world.spyMissions.values()][0]!
    const m2 = [...r2.world.spyMissions.values()][0]!
    expect(m1).toEqual(m2)
  })

  it('does not propose counter_intel as a planned mission (continuous, handled separately)', () => {
    const world = buildWorld({
      spyRealmId: QIN,
      withSpy: true,
      personality: 'benevolent',
    })
    const realm = world.realms.get(QIN)!

    const result = planEspionageAction(world, realm, createInitialRng(3))

    expect(result.ok).toBe(true)
    const created = [...result.world.spyMissions.values()][0]!
    expect(created.action).not.toBe('counter_intel')
  })

  it('mission resolveTick respects M7 duration constants per action kind', () => {
    const tyrantWorld = buildWorld({
      spyRealmId: QIN,
      withSpy: true,
      personality: 'tyrant',
      tick: 10,
    })
    const tyrantRealm = tyrantWorld.realms.get(QIN)!
    const tyrantResult = planEspionageAction(tyrantWorld, tyrantRealm, createInitialRng(1))
    const tyrantMission = [...tyrantResult.world.spyMissions.values()][0]!

    expect(tyrantMission.action).toBe('discord')
    expect(tyrantMission.resolveTick - tyrantMission.startTick).toBe(12)

    const schemerWorld = buildWorld({
      spyRealmId: QIN,
      withSpy: true,
      personality: 'schemer',
      tick: 10,
    })
    const schemerRealm = schemerWorld.realms.get(QIN)!
    const schemerResult = planEspionageAction(schemerWorld, schemerRealm, createInitialRng(1))
    const schemerMission = [...schemerResult.world.spyMissions.values()][0]!

    expect(schemerMission.action).toBe('rumor')
    expect(schemerMission.resolveTick - schemerMission.startTick).toBe(9)
  })

  it('returns ok: false when no other realms exist (no targets)', () => {
    const world = buildWorld({
      spyRealmId: QIN,
      withSpy: true,
      personality: 'schemer',
      targets: [],
    })
    const realm = world.realms.get(QIN)!

    const result = planEspionageAction(world, realm, createInitialRng(1))

    expect(result.ok).toBe(false)
    expect(result.world.spyMissions.size).toBe(0)
  })
})
