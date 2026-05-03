import { describe, expect, it } from 'vitest'
import type { DiplomaticRelation, GameDate, Realm, SpyMission, World } from '~/shared/types'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import { relationKey } from '~/engine/systems/diplomacy'
import { applyEspionageReactions } from '../espionage-reactions'

const DATE: GameDate = { yearBC: 260, season: 'spring', month: 1, xun: 'shang' }
const qin = 'realm_qin'
const han = 'realm_han'

function makeRealm(id: string): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#000000',
    capital: `${id}_capital`,
    initialSites: [],
    initialArmies: [],
    aiPersonality: 'aggressive_random',
    economy: { treasury: 0, foodStores: 0, taxRate: 10 },
    stats: { manpowerPool: 1000, manpowerCap: 5000, warWeariness: 0 },
    traits: [],
    politicalSystem: 'enfeoffment',
  }
}

function makeRelation(a: string, b: string, attitude: number, trust: number): DiplomaticRelation {
  const realmAId = a.localeCompare(b) <= 0 ? a : b
  const realmBId = realmAId === a ? b : a
  return { key: relationKey(a, b), realmAId, realmBId, attitude, trust, updatedAt: DATE }
}

function makeMission(overrides: Partial<SpyMission> = {}): SpyMission {
  return {
    id: 'spy_mission_1',
    spyGeneralId: 'general_qin_spy',
    spyRealmId: qin,
    targetRealmId: han,
    action: 'rumor',
    startTick: 0,
    resolveTick: 9,
    status: 'exposed',
    targetGeneralId: null,
    ...overrides,
  }
}

function baseWorld(overrides: Partial<World> = {}): World {
  return makeEmptyWorld({
    date: DATE,
    tick: 8,
    realms: new Map([
      [qin, makeRealm(qin)],
      [han, makeRealm(han)],
    ]),
    relations: new Map([[relationKey(qin, han), makeRelation(qin, han, 0, 50)]]),
    playerRealmId: qin,
    rngState: { seed: 42, counter: 0 },
    ...overrides,
  })
}

describe('applyEspionageReactions', () => {
  it('applies attitude delta of -30 between spy realm and target realm on exposure', () => {
    const world = baseWorld()
    const mission = makeMission()

    const result = applyEspionageReactions(world, mission)
    const relation = result.world.relations.get(relationKey(qin, han))

    expect(relation).toBeDefined()
    expect(relation!.attitude).toBe(0 + -30)
  })

  it('applies trust delta of -40 between spy realm and target realm on exposure', () => {
    const world = baseWorld()
    const mission = makeMission()

    const result = applyEspionageReactions(world, mission)
    const relation = result.world.relations.get(relationKey(qin, han))

    expect(relation).toBeDefined()
    expect(relation!.trust).toBe(50 + -40)
  })

  it('emits a spyExposed GameEvent with mission metadata', () => {
    const world = baseWorld()
    const mission = makeMission({ id: 'spy_mission_42', action: 'discord' })

    const result = applyEspionageReactions(world, mission)
    const exposedEvents = result.events.filter(e => e.type === 'spyExposed')

    expect(exposedEvents).toHaveLength(1)
    expect(exposedEvents[0]!.payload).toEqual({
      missionId: 'spy_mission_42',
      spyRealmId: qin,
      targetRealmId: han,
      action: 'discord',
    })
  })

  it('appends a relation_changed entry to diplomacyHistory', () => {
    const world = baseWorld()
    const mission = makeMission()

    const result = applyEspionageReactions(world, mission)
    const lastEvent = result.world.diplomacyHistory.at(-1)

    expect(lastEvent?.kind).toBe('relation_changed')
    expect(lastEvent?.relationKey).toBe(relationKey(qin, han))
  })

  it('clamps attitude/trust to bounds when relation is already near minimum', () => {
    const world = baseWorld({
      relations: new Map([[relationKey(qin, han), makeRelation(qin, han, -90, -90)]]),
    })
    const mission = makeMission()

    const result = applyEspionageReactions(world, mission)
    const relation = result.world.relations.get(relationKey(qin, han))

    expect(relation).toBeDefined()
    expect(relation!.attitude).toBeGreaterThanOrEqual(-100)
    expect(relation!.attitude).toBeLessThanOrEqual(100)
    expect(relation!.trust).toBeGreaterThanOrEqual(-100)
  })

  it('creates a neutral relation when none exists, then applies the delta', () => {
    const world = baseWorld({ relations: new Map() })
    const mission = makeMission()

    const result = applyEspionageReactions(world, mission)
    const relation = result.world.relations.get(relationKey(qin, han))

    expect(relation).toBeDefined()
    expect(relation!.attitude).toBe(-30)
    expect(relation!.trust).toBe(10)
  })
})
