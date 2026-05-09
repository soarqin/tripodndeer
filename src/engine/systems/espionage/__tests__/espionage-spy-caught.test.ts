import { describe, expect, it } from 'vitest'

import { espionagePhase } from '../espionage-phase'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import type {
  DiplomacyEvent,
  EspionageActionKind,
  General,
  Realm,
  RNGState,
  SpyMission,
  World,
} from '~/shared/types'

function makeRealm(id: string, overrides: Partial<Realm> = {}): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#ff0000',
    capital: `site_${id}`,
    initialSites: [],
    initialArmies: [],
    economy: { treasury: 1000, foodStores: 1000, taxRate: 10 },
    traits: [],
    politicalSystem: 'enfeoffment',
    ...overrides,
  }
}

function makeSpy(id: string, realmId: string, mou: number = 10): General {
  return {
    id,
    realmId,
    name: id,
    might: 10,
    command: 10,
    loyalty: 80,
    loyaltyState: 'loyal',
    posts: [],
    age: 35,
    ambition: 'mid',
    specialty: 'spy',
    attrs: { wu: 5, zheng: 5, jiao: 12, mou, xue: 8, po: 8 },
  }
}

function makeTargetGeneral(id: string, realmId: string): General {
  return {
    id,
    realmId,
    name: id,
    might: 50,
    command: 50,
    loyalty: 80,
    loyaltyState: 'loyal',
    posts: [],
    age: 40,
    ambition: 'mid',
    specialty: 'commander',
    attrs: { wu: 15, zheng: 10, jiao: 8, mou: 10, xue: 8, po: 12 },
  }
}

function makeMission(
  action: EspionageActionKind,
  overrides: Partial<SpyMission> = {},
): SpyMission {
  return {
    id: `mission_${action}`,
    spyGeneralId: 'spy_a',
    spyRealmId: 'realm_a',
    targetRealmId: 'realm_b',
    action,
    startTick: 0,
    resolveTick: 5,
    status: 'in_progress',
    targetGeneralId: null,
    ...overrides,
  }
}

function makeBaseWorld(overrides: Partial<World> = {}): World {
  return makeEmptyWorld({
    tick: 10,
    realms: new Map([
      ['realm_a', makeRealm('realm_a')],
      ['realm_b', makeRealm('realm_b')],
    ]),
    generals: new Map([['spy_a', makeSpy('spy_a', 'realm_a')]]),
    ...overrides,
  })
}

const SUCCESS_RNG: RNGState = { seed: 1, counter: 0 }

function findExposureSeed(world: World, missionId: string): number {
  for (let seed = 1; seed <= 500; seed++) {
    const r = espionagePhase(world, { seed, counter: 0 })
    if (r.world.spyMissions.get(missionId)!.status === 'exposed') return seed
  }
  throw new Error('No seed produced exposure within 500 attempts')
}

describe('espionagePhase: spy_caught GameEvent emission on exposure', () => {
  it('emits spy_caught GameEvent when mission is exposed (discord high-risk)', () => {
    const target = makeTargetGeneral('gen_target', 'realm_b')
    const generals = new Map<string, General>([
      ['spy_a', makeSpy('spy_a', 'realm_a', 0)],
      ['gen_target', target],
    ])
    const world = makeBaseWorld({
      generals,
      spyMissions: new Map([
        ['m1', makeMission('discord', { id: 'm1', targetGeneralId: 'gen_target' })],
      ]),
    })

    const seed = findExposureSeed(world, 'm1')
    const result = espionagePhase(world, { seed, counter: 0 })

    const spyCaughtEvents = result.events.filter((e) => e.type === 'spy_caught')
    expect(spyCaughtEvents).toHaveLength(1)

    const payload = spyCaughtEvents[0]!.payload as {
      observerRealmId: string
      subjectRealmId: string
      missionId: string
    }
    expect(payload.observerRealmId).toBe('realm_b')
    expect(payload.subjectRealmId).toBe('realm_a')
    expect(payload.missionId).toBe('m1')
  })
})

describe('espionagePhase: spy_caught DiplomacyEvent appended to diplomacyHistory', () => {
  it('appends spy_caught DiplomacyEvent with spyMissionId on exposure', () => {
    const target = makeTargetGeneral('gen_target', 'realm_b')
    const generals = new Map<string, General>([
      ['spy_a', makeSpy('spy_a', 'realm_a', 0)],
      ['gen_target', target],
    ])
    const world = makeBaseWorld({
      generals,
      spyMissions: new Map([
        ['m1', makeMission('discord', { id: 'm1', targetGeneralId: 'gen_target' })],
      ]),
    })

    const seed = findExposureSeed(world, 'm1')
    const result = espionagePhase(world, { seed, counter: 0 })

    const spyCaughtHistoryEntries = result.world.diplomacyHistory.filter(
      (e: DiplomacyEvent) => e.kind === 'spy_caught',
    )
    expect(spyCaughtHistoryEntries).toHaveLength(1)

    const entry = spyCaughtHistoryEntries[0]!
    expect(entry.actorRealmId).toBe('realm_a')
    expect(entry.targetRealmId).toBe('realm_b')
    expect(entry.spyMissionId).toBe('m1')
    expect(entry.occurredAt).toEqual(world.date)
  })
})

describe('espionagePhase: no spy_caught when mission succeeds', () => {
  it('does NOT emit spy_caught GameEvent when reconnaissance succeeds', () => {
    const world = makeBaseWorld({
      spyMissions: new Map([['m1', makeMission('reconnaissance', { id: 'm1' })]]),
    })
    const result = espionagePhase(world, SUCCESS_RNG)

    expect(result.world.spyMissions.get('m1')!.status).toBe('success')
    expect(result.events.filter((e) => e.type === 'spy_caught')).toHaveLength(0)
  })

  it('does NOT append spy_caught to diplomacyHistory when mission succeeds', () => {
    const world = makeBaseWorld({
      spyMissions: new Map([['m1', makeMission('reconnaissance', { id: 'm1' })]]),
    })
    const result = espionagePhase(world, SUCCESS_RNG)

    expect(result.world.spyMissions.get('m1')!.status).toBe('success')
    const spyCaughtHistory = result.world.diplomacyHistory.filter(
      (e: DiplomacyEvent) => e.kind === 'spy_caught',
    )
    expect(spyCaughtHistory).toHaveLength(0)
  })
})

describe('espionagePhase: no spy_caught when mission fails (not exposed)', () => {
  it('does NOT emit spy_caught when low-risk recon fails without exposure', () => {
    const world = makeBaseWorld({
      generals: new Map([['spy_a', makeSpy('spy_a', 'realm_a', 0)]]),
      spyMissions: new Map([['m1', makeMission('reconnaissance', { id: 'm1' })]]),
    })

    let foundFailedNotExposed = false
    for (let seed = 1; seed <= 500; seed++) {
      const r = espionagePhase(world, { seed, counter: 0 })
      const m = r.world.spyMissions.get('m1')!
      if (m.status === 'failed') {
        foundFailedNotExposed = true
        expect(r.events.filter((e) => e.type === 'spy_caught')).toHaveLength(0)
        const spyCaughtHistory = r.world.diplomacyHistory.filter(
          (e: DiplomacyEvent) => e.kind === 'spy_caught',
        )
        expect(spyCaughtHistory).toHaveLength(0)
        break
      }
    }
    expect(foundFailedNotExposed).toBe(true)
  })
})
