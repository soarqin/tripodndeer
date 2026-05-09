import { describe, expect, it, vi } from 'vitest'
import type {
  Academy,
  General,
  Realm,
  RNGState,
  RulerState,
  World,
} from '~/shared/types'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import { ideologyDriftPhase } from '../ideology-drift-phase'

const RNG: RNGState = { seed: 1, counter: 0 }

const ZERO_LEAN = { fa: 0, ru: 0, dao: 0, mo: 0, zonghen: 0, bing: 0 } as const

function makeRealm(id: string, overrides: Partial<Realm> = {}): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#000',
    capital: 'site_capital',
    initialSites: [],
    initialArmies: [],
    economy: { treasury: 0, foodStores: 0, taxRate: 0.1 },
    traits: [],
    politicalSystem: 'enfeoffment',
    prestige: 40,
    ideologyLean: { ...ZERO_LEAN },
    warVictoriesThisYear: 0,
    ...overrides,
  }
}

function makeRuler(realmId: string, personality: RulerState['personality']): RulerState {
  return {
    realmId,
    generalId: `gen_${realmId}_ruler`,
    age: 40,
    lifespan: 70,
    health: 100,
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

function makeAcademy(overrides: Partial<Academy> = {}): Academy {
  return {
    id: 'academy_jixia',
    hostRealmId: 'realm_qi',
    hostSiteId: 'site_qi_capital',
    primaryIdeology: 'ru',
    secondaryIdeology: 'dao',
    founded: 318,
    level: 1,
    status: 'active',
    ...overrides,
  }
}

describe('ideologyDriftPhase', () => {
  it('triggers at year-start (spring/1/shang)', () => {
    const realm = makeRealm('realm_qin')
    const world: World = makeEmptyWorld({
      date: { yearBC: 260, season: 'spring', month: 1, xun: 'shang' },
      realms: new Map([[realm.id, realm]]),
      rulers: new Map([[realm.id, makeRuler(realm.id, 'tyrant')]]),
    })

    const result = ideologyDriftPhase(world, RNG)
    const updated = result.world.realms.get(realm.id)
    expect(updated?.ideologyLean?.fa).toBeGreaterThan(0)
  })

  it('does NOT trigger mid-year (summer/2/zhong)', () => {
    const realm = makeRealm('realm_qin')
    const world: World = makeEmptyWorld({
      date: { yearBC: 260, season: 'summer', month: 2, xun: 'zhong' },
      realms: new Map([[realm.id, realm]]),
      rulers: new Map([[realm.id, makeRuler(realm.id, 'tyrant')]]),
    })

    const result = ideologyDriftPhase(world, RNG)
    expect(result.world).toBe(world)
    expect(result.events).toEqual([])
  })

  it('shifts ideology toward fa for tyrant ruler', () => {
    const realm = makeRealm('realm_qin')
    const world: World = makeEmptyWorld({
      realms: new Map([[realm.id, realm]]),
      rulers: new Map([[realm.id, makeRuler(realm.id, 'tyrant')]]),
    })

    const result = ideologyDriftPhase(world, RNG)
    const updated = result.world.realms.get(realm.id)!
    expect(updated.ideologyLean!.fa).toBeGreaterThan(updated.ideologyLean!.ru)
  })

  it('shifts ideology toward ru for benevolent ruler', () => {
    const realm = makeRealm('realm_chu')
    const world: World = makeEmptyWorld({
      realms: new Map([[realm.id, realm]]),
      rulers: new Map([[realm.id, makeRuler(realm.id, 'benevolent')]]),
    })

    const result = ideologyDriftPhase(world, RNG)
    const updated = result.world.realms.get(realm.id)!
    expect(updated.ideologyLean!.ru).toBeGreaterThan(updated.ideologyLean!.fa)
  })

  it('uses trait ideologyDeltaBp via getTraitModifiers (policy source)', () => {
    const realm = makeRealm('realm_qin', { traits: ['shang_yang_reform_done'] })
    const world: World = makeEmptyWorld({
      realms: new Map([[realm.id, realm]]),
    })

    const result = ideologyDriftPhase(world, RNG)
    const updated = result.world.realms.get(realm.id)!
    expect(updated.ideologyLean!.fa).toBeGreaterThan(0)
  })

  it('boosts primary ideology when an active academy is in the realm', () => {
    const realm = makeRealm('realm_qi')
    const academy = makeAcademy()
    const world: World = makeEmptyWorld({
      realms: new Map([[realm.id, realm]]),
      academies: new Map([[academy.id, academy]]),
    })

    const result = ideologyDriftPhase(world, RNG)
    const updated = result.world.realms.get(realm.id)!
    expect(updated.ideologyLean!.ru).toBeGreaterThan(0)
    expect(updated.ideologyLean!.dao).toBeGreaterThan(0)
  })

  it('ignores dormant academies', () => {
    const realm = makeRealm('realm_qi')
    const academy = makeAcademy({ status: 'dormant' })
    const world: World = makeEmptyWorld({
      realms: new Map([[realm.id, realm]]),
      academies: new Map([[academy.id, academy]]),
    })

    const result = ideologyDriftPhase(world, RNG)
    const updated = result.world.realms.get(realm.id)!
    expect(updated.ideologyLean!.ru).toBe(0)
    expect(updated.ideologyLean!.dao).toBe(0)
  })

  it('weighs talent specialty into the talent source', () => {
    const realm = makeRealm('realm_qin')
    const general: General = {
      id: 'gen_admin_1',
      realmId: realm.id,
      name: 'admin',
      might: 50,
      command: 50,
      loyalty: 80,
      specialty: 'administrator',
    }
    const world: World = makeEmptyWorld({
      realms: new Map([[realm.id, realm]]),
      generals: new Map([[general.id, general]]),
    })

    const result = ideologyDriftPhase(world, RNG)
    const updated = result.world.realms.get(realm.id)!
    expect(updated.ideologyLean!.fa).toBeGreaterThan(0)
  })

  it('emits ideologyShifted event when shift exceeds threshold', () => {
    const realm = makeRealm('realm_qin')
    const world: World = makeEmptyWorld({
      realms: new Map([[realm.id, realm]]),
      rulers: new Map([[realm.id, makeRuler(realm.id, 'tyrant')]]),
    })

    const result = ideologyDriftPhase(world, RNG)
    expect(result.events.some((e) => e.type === 'ideologyShifted')).toBe(true)
  })

  it('is deterministic (same input → same output)', () => {
    const realm = makeRealm('realm_qin', { traits: ['shang_yang_reform_done'] })
    const world: World = makeEmptyWorld({
      realms: new Map([[realm.id, realm]]),
      rulers: new Map([[realm.id, makeRuler(realm.id, 'conqueror')]]),
    })

    const a = ideologyDriftPhase(world, RNG)
    const b = ideologyDriftPhase(world, RNG)
    expect(a.world.realms.get(realm.id)?.ideologyLean).toEqual(
      b.world.realms.get(realm.id)?.ideologyLean,
    )
    expect(a.events).toEqual(b.events)
  })

  it('returns world unchanged when M6_ENABLED is false', async () => {
    vi.resetModules()
    vi.doMock('~/content/m2/balance', async () => {
      const actual = await vi.importActual<typeof import('~/content/m2/balance')>(
        '~/content/m2/balance',
      )
      return { ...actual, M6_ENABLED: false }
    })

    const { ideologyDriftPhase: ideologyDriftPhaseDisabled } = await import(
      '../ideology-drift-phase'
    )
    const realm = makeRealm('realm_qin')
    const world: World = makeEmptyWorld({
      realms: new Map([[realm.id, realm]]),
      rulers: new Map([[realm.id, makeRuler(realm.id, 'tyrant')]]),
    })

    const result = ideologyDriftPhaseDisabled(world, RNG)
    expect(result.world).toBe(world)
    expect(result.events).toEqual([])

    vi.doUnmock('~/content/m2/balance')
    vi.resetModules()
  })
})
