import { describe, expect, it } from 'vitest'

import { espionagePhase } from '../espionage-phase'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import { M7_RUMOR_FACTION_DELTA } from '~/content/m2/balance'
import type {
  FactionInfluenceState,
  General,
  Realm,
  RNGState,
  SpyMission,
  World,
} from '~/shared/types'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const SUCCESS_RNG: RNGState = { seed: 1, counter: 0 }

function makeRealm(id: string): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#000000',
    capital: `site_${id}`,
    initialSites: [],
    initialArmies: [],
    aiPersonality: 'cautious',
    economy: { treasury: 0, foodStores: 0, taxRate: 10 },
    traits: [],
    politicalSystem: 'enfeoffment',
  }
}

function makeSpy(id: string, realmId: string, mou: number = 18): General {
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
    attrs: { wu: 5, zheng: 5, jiao: 16, mou, xue: 8, po: 8 },
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

function makeMission(overrides: Partial<SpyMission> = {}): SpyMission {
  return {
    id: 'mission_rumor_test',
    spyGeneralId: 'spy_a',
    spyRealmId: 'realm_a',
    targetRealmId: 'realm_b',
    action: 'rumor',
    startTick: 0,
    resolveTick: 5,
    status: 'in_progress',
    targetGeneralId: null,
    ...overrides,
  }
}

function makeBaseWorld(initialConservatives: number = 50, overrides: Partial<World> = {}): World {
  return makeEmptyWorld({
    tick: 10,
    realms: new Map([
      ['realm_a', makeRealm('realm_a')],
      ['realm_b', makeRealm('realm_b')],
    ]),
    generals: new Map<string, General>([
      ['spy_a', makeSpy('spy_a', 'realm_a')],
    ]),
    factionInfluences: new Map([
      ['realm_b', makeFactionInfluence('realm_b', initialConservatives)],
    ]),
    spyMissions: new Map([['mission_rumor_test', makeMission()]]),
    ...overrides,
  })
}

describe('rumor → Effect.realm.faction.delta integration: success path', () => {
  it('decreases conservative faction influence by exactly M7_RUMOR_FACTION_DELTA on success', () => {
    const initialConservatives = 50
    const world = makeBaseWorld(initialConservatives)
    const result = espionagePhase(world, SUCCESS_RNG)

    const targetFactions = result.world.factionInfluences.get('realm_b')!
    const conservatives = targetFactions.influences.get('conservatives') ?? 0
    expect(M7_RUMOR_FACTION_DELTA).toBe(-25)
    expect(conservatives).toBe(initialConservatives + M7_RUMOR_FACTION_DELTA)
    expect(conservatives).toBe(25)
  })

  it('marks rumor mission status as success', () => {
    const world = makeBaseWorld()
    const result = espionagePhase(world, SUCCESS_RNG)
    const mission = result.world.spyMissions.get('mission_rumor_test')!
    expect(mission.status).toBe('success')
  })

  it('emits spyMissionResolved event with action=rumor and outcome=success', () => {
    const world = makeBaseWorld()
    const result = espionagePhase(world, SUCCESS_RNG)
    const resolvedEvents = result.events.filter((e) => e.type === 'spyMissionResolved')
    expect(resolvedEvents).toHaveLength(1)
    const payload = resolvedEvents[0]!.payload as Record<string, unknown>
    expect(payload).toMatchObject({
      missionId: 'mission_rumor_test',
      action: 'rumor',
      outcome: 'success',
      spyRealmId: 'realm_a',
      targetRealmId: 'realm_b',
    })
  })

  it('preserves other faction influences when rumor only touches conservatives', () => {
    const world = makeBaseWorld(50)
    const result = espionagePhase(world, SUCCESS_RNG)
    const targetFactions = result.world.factionInfluences.get('realm_b')!
    expect(targetFactions.influences.get('royal_kin')).toBe(50)
    expect(targetFactions.influences.get('noble_clans')).toBe(50)
    expect(targetFactions.influences.get('military_meritocracy')).toBe(50)
    expect(targetFactions.influences.get('reformists')).toBe(50)
    expect(targetFactions.influences.get('foreign_clients')).toBe(50)
  })

  it('clamps conservatives at 0 when delta would push below zero', () => {
    const world = makeBaseWorld(10)
    const result = espionagePhase(world, SUCCESS_RNG)
    const targetFactions = result.world.factionInfluences.get('realm_b')!
    const conservatives = targetFactions.influences.get('conservatives') ?? -1
    expect(conservatives).toBe(0)
  })

  it('does not touch faction influences when target realm has no factionInfluences entry', () => {
    const world = makeBaseWorld(50, {
      factionInfluences: new Map(),
    })
    const result = espionagePhase(world, SUCCESS_RNG)
    expect(result.world.factionInfluences.size).toBe(0)
    expect(result.world.spyMissions.get('mission_rumor_test')!.status).toBe('success')
  })

  it('returns a new World reference and leaves original world untouched', () => {
    const world = makeBaseWorld(50)
    const result = espionagePhase(world, SUCCESS_RNG)
    expect(result.world).not.toBe(world)
    expect(result.world.factionInfluences).not.toBe(world.factionInfluences)
    expect(world.factionInfluences.get('realm_b')!.influences.get('conservatives')).toBe(50)
  })
})

describe('rumor integration guardrails: types.ts has no Realm.stability field', () => {
  it('Realm interface in types.ts must NOT contain a `stability` field (D-G2 guard)', () => {
    const typesPath = join(process.cwd(), 'src', 'shared', 'types.ts')
    const typesContent = readFileSync(typesPath, 'utf-8')
    expect(typesContent).not.toMatch(/^\s*stability\s*[:?]/m)
    expect(typesContent).not.toMatch(/^\s*readonly\s+stability\s*[:?]/m)
  })

  it('schemas.ts must NOT contain a `stability` field on RealmSchema', () => {
    const schemasPath = join(process.cwd(), 'src', 'shared', 'schemas.ts')
    const schemasContent = readFileSync(schemasPath, 'utf-8')
    expect(schemasContent).not.toMatch(/stability\s*:\s*z\./)
  })
})

describe('rumor integration guardrails: faction-phase.ts unchanged', () => {
  it('faction-phase.ts contains expected M4.2 imbalance event constants and no espionage hook', () => {
    const factionPhasePath = join(
      process.cwd(),
      'src',
      'engine',
      'systems',
      'faction',
      'faction-phase.ts',
    )
    const content = readFileSync(factionPhasePath, 'utf-8')
    expect(content).not.toContain('espionage')
    expect(content).not.toContain('SpyMission')
    expect(content).not.toContain('spyMission')
    expect(content).not.toContain('M7_RUMOR_FACTION_DELTA')
  })
})
