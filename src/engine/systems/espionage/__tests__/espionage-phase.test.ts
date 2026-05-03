import { describe, expect, it, vi } from 'vitest'

import { espionagePhase } from '../espionage-phase'
import { makeTestWorld } from '~/engine/__tests__/world-test-fixtures'
import { relationKey } from '~/engine/systems/diplomacy'
import type {
  CounterIntelState,
  DiplomaticRelation,
  EspionageActionKind,
  FactionInfluenceState,
  General,
  Realm,
  RNGState,
  SpyMission,
  World,
} from '~/shared/types'
import { makeCoverageKey } from '~/shared/types'

function makeRealm(id: string, overrides: Partial<Realm> = {}): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#ff0000',
    capital: `site_${id}`,
    initialSites: [],
    initialArmies: [],
    aiPersonality: 'cautious',
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

function makeFactionInfluence(realmId: string, conservatives: number = 50): FactionInfluenceState {
  return {
    realmId,
    influences: new Map([
      ['royal_kin', 50],
      ['noble_clans', 50],
      ['military_meritocracy', 50],
      ['reformists', 50],
      ['conservatives', conservatives],
      ['foreign_clients', 50],
    ]),
  }
}

const SUCCESS_RNG: RNGState = { seed: 1, counter: 0 }
const FAILURE_RNG: RNGState = { seed: 999_999, counter: 0 }

function makeBaseWorld(overrides: Partial<World> = {}): World {
  return makeTestWorld({
    tick: 10,
    realms: new Map([
      ['realm_a', makeRealm('realm_a')],
      ['realm_b', makeRealm('realm_b')],
    ]),
    generals: new Map([['spy_a', makeSpy('spy_a', 'realm_a')]]),
    factionInfluences: new Map([['realm_b', makeFactionInfluence('realm_b')]]),
    ...overrides,
  })
}

describe('espionagePhase: feature flag', () => {
  it('returns unchanged world when M7_ENABLED=false', async () => {
    vi.resetModules()
    vi.doMock('~/content/m2/balance', async () => {
      const actual = await vi.importActual<typeof import('~/content/m2/balance')>(
        '~/content/m2/balance',
      )
      return { ...actual, M7_ENABLED: false }
    })
    const { espionagePhase: gatedPhase } = await import('../espionage-phase')

    const world = makeBaseWorld({
      spyMissions: new Map([['mission_recon', makeMission('reconnaissance')]]),
    })
    const result = gatedPhase(world, SUCCESS_RNG)
    expect(result.world).toBe(world)
    expect(result.events).toHaveLength(0)

    vi.doUnmock('~/content/m2/balance')
    vi.resetModules()
  })
})

describe('espionagePhase: reconnaissance success', () => {
  it('increases intelligenceCoverage when recon succeeds', () => {
    const world = makeBaseWorld({
      spyMissions: new Map([['m1', makeMission('reconnaissance', { id: 'm1' })]]),
    })
    const result = espionagePhase(world, SUCCESS_RNG)
    const key = makeCoverageKey('realm_a', 'realm_b')
    const coverage = result.world.intelligenceCoverage.get(key) ?? 0
    expect(coverage).toBeGreaterThan(0)
    const mission = result.world.spyMissions.get('m1')!
    expect(mission.status).toBe('success')
  })
})

describe('espionagePhase: rumor success', () => {
  it('decreases conservative faction influence on success', () => {
    const world = makeBaseWorld({
      spyMissions: new Map([['m1', makeMission('rumor', { id: 'm1' })]]),
    })
    const result = espionagePhase(world, SUCCESS_RNG)
    const target = result.world.factionInfluences.get('realm_b')!
    const conservatives = target.influences.get('conservatives') ?? 0
    expect(conservatives).toBeLessThan(50)
    expect(result.world.spyMissions.get('m1')!.status).toBe('success')
  })
})

describe('espionagePhase: discord success', () => {
  it('decreases target general loyalty via Effect on success', () => {
    const target = makeTargetGeneral('gen_target', 'realm_b')
    const generals = new Map<string, General>([
      ['spy_a', makeSpy('spy_a', 'realm_a')],
      ['gen_target', target],
    ])
    const world = makeBaseWorld({
      generals,
      spyMissions: new Map([
        [
          'm1',
          makeMission('discord', { id: 'm1', targetGeneralId: 'gen_target' }),
        ],
      ]),
    })
    const result = espionagePhase(world, SUCCESS_RNG)
    const updated = result.world.generals.get('gen_target')!
    expect(updated.loyalty).toBeLessThan(80)
    expect(result.world.spyMissions.get('m1')!.status).toBe('success')
  })
})

describe('espionagePhase: counter_intel success', () => {
  it('increments detectionLevel on success', () => {
    const world = makeBaseWorld({
      counterIntelStates: new Map<string, CounterIntelState>([
        ['realm_a', { realmId: 'realm_a', detectionLevel: 3, lastUpdatedTick: 0 }],
      ]),
      spyMissions: new Map([
        [
          'm1',
          makeMission('counter_intel', {
            id: 'm1',
            spyRealmId: 'realm_a',
            targetRealmId: 'realm_a',
          }),
        ],
      ]),
    })
    const result = espionagePhase(world, SUCCESS_RNG)
    const ci = result.world.counterIntelStates.get('realm_a')!
    expect(ci.detectionLevel).toBe(4)
    expect(result.world.spyMissions.get('m1')!.status).toBe('success')
  })
})

describe('espionagePhase: failure paths', () => {
  it('marks mission as exposed for high-risk discord on failure (M7_HIGH_RISK_EXPOSE_PROB=1.0)', () => {
    const target = makeTargetGeneral('gen_target', 'realm_b')
    const generals = new Map<string, General>([
      ['spy_a', makeSpy('spy_a', 'realm_a', 0)],
      ['gen_target', target],
    ])
    const world = makeBaseWorld({
      generals,
      spyMissions: new Map([
        [
          'm1',
          makeMission('discord', { id: 'm1', targetGeneralId: 'gen_target' }),
        ],
      ]),
    })

    let foundExposed = false
    for (let seed = 1; seed <= 500; seed++) {
      const r = espionagePhase(world, { seed, counter: 0 })
      const m = r.world.spyMissions.get('m1')!
      if (m.status === 'exposed') {
        foundExposed = true
        expect(r.events.some((e) => e.type === 'spyExposed')).toBe(true)
        break
      }
    }
    expect(foundExposed).toBe(true)
  })

  it('marks mission as failed (not exposed) when low-risk recon fails without exposure', () => {
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
        break
      }
    }
    expect(foundFailedNotExposed).toBe(true)
  })
})

describe('espionagePhase: determinism', () => {
  it('returns same outcome for same RNG seed', () => {
    const world = makeBaseWorld({
      spyMissions: new Map([['m1', makeMission('reconnaissance', { id: 'm1' })]]),
    })
    const r1 = espionagePhase(world, { seed: 42, counter: 0 })
    const r2 = espionagePhase(world, { seed: 42, counter: 0 })
    expect(r1.world.spyMissions.get('m1')!.status).toBe(
      r2.world.spyMissions.get('m1')!.status,
    )
    expect(r1.nextRng).toEqual(r2.nextRng)
  })
})

describe('espionagePhase: missions sorted by ID', () => {
  it('processes missions in ID-sorted order (RNG reproducibility contract)', () => {
    const target = makeTargetGeneral('gen_target', 'realm_b')
    const spy1 = makeSpy('spy_a', 'realm_a')
    const spy2 = makeSpy('spy_b', 'realm_a')
    const generals = new Map<string, General>([
      ['spy_a', spy1],
      ['spy_b', spy2],
      ['gen_target', target],
    ])

    const missions: ReadonlyMap<string, SpyMission> = new Map([
      [
        'mission_z',
        makeMission('reconnaissance', { id: 'mission_z', spyGeneralId: 'spy_a' }),
      ],
      [
        'mission_a',
        makeMission('reconnaissance', { id: 'mission_a', spyGeneralId: 'spy_b' }),
      ],
    ])

    const world = makeBaseWorld({ generals, spyMissions: missions })
    const result = espionagePhase(world, { seed: 42, counter: 0 })

    // mission_a is processed first because of localeCompare sort
    // Both should have a deterministic outcome
    const mA = result.world.spyMissions.get('mission_a')!
    const mZ = result.world.spyMissions.get('mission_z')!
    expect(['success', 'failed', 'exposed']).toContain(mA.status)
    expect(['success', 'failed', 'exposed']).toContain(mZ.status)

    // Reverse insertion order — output must be identical (proves sort works)
    const missionsReversed: ReadonlyMap<string, SpyMission> = new Map([
      [
        'mission_a',
        makeMission('reconnaissance', { id: 'mission_a', spyGeneralId: 'spy_b' }),
      ],
      [
        'mission_z',
        makeMission('reconnaissance', { id: 'mission_z', spyGeneralId: 'spy_a' }),
      ],
    ])
    const world2 = makeBaseWorld({ generals, spyMissions: missionsReversed })
    const result2 = espionagePhase(world2, { seed: 42, counter: 0 })
    expect(result2.world.spyMissions.get('mission_a')!.status).toBe(mA.status)
    expect(result2.world.spyMissions.get('mission_z')!.status).toBe(mZ.status)
  })
})

describe('espionagePhase: exposure invokes diplomatic reactions', () => {
  it('updates relations attitude/trust and emits spyExposed event when discord mission is exposed', () => {
    const target = makeTargetGeneral('gen_target', 'realm_b')
    const generals = new Map<string, General>([
      ['spy_a', makeSpy('spy_a', 'realm_a', 0)],
      ['gen_target', target],
    ])
    const initialRelation: DiplomaticRelation = {
      key: relationKey('realm_a', 'realm_b'),
      realmAId: 'realm_a',
      realmBId: 'realm_b',
      attitude: 0,
      trust: 50,
      updatedAt: { yearBC: 260, season: 'spring', month: 1, xun: 'shang' },
    }
    const world = makeBaseWorld({
      generals,
      relations: new Map([[relationKey('realm_a', 'realm_b'), initialRelation]]),
      spyMissions: new Map([
        [
          'm1',
          makeMission('discord', { id: 'm1', targetGeneralId: 'gen_target' }),
        ],
      ]),
    })

    const result = espionagePhase(world, FAILURE_RNG)
    expect(result.world.spyMissions.get('m1')!.status).toBe('exposed')
    expect(result.events.some((e) => e.type === 'spyExposed')).toBe(true)
    const relation = result.world.relations.get(relationKey('realm_a', 'realm_b'))!
    expect(relation).toBeDefined()
    expect(relation.attitude).toBeLessThan(0)
    expect(relation.trust).toBeLessThan(50)
  })
})

describe('espionagePhase: skipping cases', () => {
  it('skips missions before resolveTick', () => {
    const world = makeBaseWorld({
      tick: 3,
      spyMissions: new Map([
        [
          'm1',
          makeMission('reconnaissance', { id: 'm1', resolveTick: 5 }),
        ],
      ]),
    })
    const result = espionagePhase(world, SUCCESS_RNG)
    expect(result.world.spyMissions.get('m1')!.status).toBe('in_progress')
    expect(result.events).toHaveLength(0)
  })

  it('cancels mission when spy is missing', () => {
    const world = makeBaseWorld({
      generals: new Map(),
      spyMissions: new Map([['m1', makeMission('reconnaissance', { id: 'm1' })]]),
    })
    const result = espionagePhase(world, SUCCESS_RNG)
    expect(result.world.spyMissions.get('m1')!.status).toBe('cancelled')
  })
})
