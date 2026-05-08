import { describe, expect, it } from 'vitest'
import type {
  DiplomaticRelation,
  PersonalityArchetype,
  Realm,
  RealmId,
  RulerState,
  Site,
  World,
} from '~/shared/types'
import { createInitialRng } from '~/engine/random'
import { declareWar } from '~/engine/wars'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import { aiStrategicStep } from '../strategic'

const archetypes: readonly PersonalityArchetype[] = [
  'conqueror',
  'steward',
  'schemer',
  'learned',
  'tyrant',
  'incompetent',
  'benevolent',
  'builder',
]

function makeRealm(id: RealmId, capital: string): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#000000',
    capital,
    initialSites: [capital],
    initialArmies: [],
    aiPersonality: 'cautious',
    economy: { treasury: 1000, foodStores: 1000, taxRate: 10 },
    traits: [],
    politicalSystem: 'enfeoffment',
  }
}

function makeSite(id: string, ownerId: RealmId, adjacency: readonly string[]): Site {
  return {
    id,
    name: id,
    position: [0, 0],
    boundary: [],
    ownerId,
    polygon: [],
    adjacency,
    economy: { population: 1000, households: 100, taxBase: 100, foodProduction: 100 },
  }
}

function makeRuler(realmId: RealmId, personality: PersonalityArchetype): RulerState {
  return {
    realmId,
    generalId: `general_${realmId}`,
    age: 40,
    lifespan: 70,
    health: 100,
    personality,
    successionLawId: 'primogeniture',
    inOfficeSinceTick: 0,
  }
}

function relation(a: RealmId, b: RealmId, attitude: number, trust: number): DiplomaticRelation {
  return {
    key: `${a}__${b}`,
    realmAId: a,
    realmBId: b,
    attitude,
    trust,
    updatedAt: { yearBC: 300, season: 'spring', month: 1, xun: 'shang' },
  }
}

function baseWorld(overrides: Partial<World> = {}): World {
  const realms = new Map<RealmId, Realm>([
    ['realm_player', makeRealm('realm_player', 'site_player')],
    ['realm_ai', makeRealm('realm_ai', 'site_ai')],
    ['realm_enemy', makeRealm('realm_enemy', 'site_enemy')],
    ['realm_friend', makeRealm('realm_friend', 'site_friend')],
  ])
  return makeEmptyWorld({
    date: { yearBC: 300, season: 'spring', month: 1, xun: 'shang' },
    tick: 36,
    playerRealmId: 'realm_player',
    realms,
    sites: new Map([
      ['site_player', makeSite('site_player', 'realm_player', [])],
      ['site_ai', makeSite('site_ai', 'realm_ai', ['site_enemy'])],
      ['site_enemy', makeSite('site_enemy', 'realm_enemy', ['site_ai'])],
      ['site_friend', makeSite('site_friend', 'realm_friend', [])],
    ]),
    relations: new Map([
      ['realm_ai__realm_enemy', relation('realm_ai', 'realm_enemy', -50, -20)],
      ['realm_ai__realm_friend', relation('realm_ai', 'realm_friend', 50, 20)],
    ]),
    wars: declareWar(new Map(), 'realm_ai', 'realm_enemy'),
    rulers: new Map([
      ['realm_ai', makeRuler('realm_ai', 'conqueror')],
      ['realm_enemy', makeRuler('realm_enemy', 'steward')],
      ['realm_friend', makeRuler('realm_friend', 'benevolent')],
    ]),
    ...overrides,
  })
}

describe('aiStrategicStep cadence', () => {
  it('skips non-yearly ticks without consuming RNG', () => {
    const world = baseWorld({ date: { yearBC: 300, season: 'spring', month: 1, xun: 'zhong' } })
    const rng = createInitialRng(7)

    const result = aiStrategicStep(world, rng)

    expect(result).toEqual({ world, nextRng: rng, events: [] })
  })

  it('does not fire in other seasons month 1 shang-xun', () => {
    const world = baseWorld({ date: { yearBC: 300, season: 'summer', month: 1, xun: 'shang' } })
    const rng = createInitialRng(7)

    const result = aiStrategicStep(world, rng)

    expect(result.nextRng).toEqual(rng)
    expect(result.world).toBe(world)
    expect(result.events).toEqual([])
  })
})

describe('aiStrategicStep yearly planning', () => {
  it('bootstraps empty aiState for AI realms', () => {
    const result = aiStrategicStep(baseWorld(), createInitialRng(1))

    const aiPlan = result.world.aiState.get('realm_ai')?.strategic
    expect(aiPlan).toMatchObject({
      targetSiteId: 'site_enemy',
      mainEnemyRealmId: 'realm_enemy',
      mainAllyRealmId: 'realm_friend',
      decidedAtTick: 36,
      decidedForYearBC: 300,
    })
    expect(result.world.aiState.has('realm_player')).toBe(false)
    expect(result.events.map((event) => event.type)).toContain('aiStrategicDecided')
  })

  it('is deterministic for the same seed and world', () => {
    const world = baseWorld({
      sites: new Map([
        ['site_player', makeSite('site_player', 'realm_player', [])],
        ['site_ai', makeSite('site_ai', 'realm_ai', ['site_enemy', 'site_friend'])],
        ['site_enemy', makeSite('site_enemy', 'realm_enemy', ['site_ai'])],
        ['site_friend', makeSite('site_friend', 'realm_friend', ['site_ai'])],
      ]),
      relations: new Map([
        ['realm_ai__realm_enemy', relation('realm_ai', 'realm_enemy', -10, 0)],
        ['realm_ai__realm_friend', relation('realm_ai', 'realm_friend', -10, 0)],
      ]),
    })
    const rng = createInitialRng(9)

    expect(aiStrategicStep(world, rng)).toEqual(aiStrategicStep(world, rng))
  })

  it('runs all 8 archetypes without error', () => {
    for (const archetype of archetypes) {
      const result = aiStrategicStep(
        baseWorld({ rulers: new Map([['realm_ai', makeRuler('realm_ai', archetype)]]) }),
        createInitialRng(3)
      )

      expect(result.world.aiState.get('realm_ai')?.strategic?.decidedForYearBC).toBe(300)
    }
  })
})
