import { describe, expect, it } from 'vitest'
import type {
  DiplomaticRelation,
  Realm,
  RealmId,
  ReformState,
  RulerState,
  Site,
  World,
} from '~/shared/types'
import type { StrategicPlan } from '~/shared/types/ai-state'
import { createInitialRng } from '~/engine/random'
import { declareWar } from '~/engine/wars'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import { aiStrategicStep, isStrategicPlanStale } from '../strategic'

function makeRealm(id: RealmId, capital: string, status?: Realm['status']): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#000000',
    capital,
    initialSites: [capital],
    initialArmies: [],
    economy: { treasury: 1000, foodStores: 1000, taxRate: 10 },
    traits: [],
    politicalSystem: 'enfeoffment',
    status,
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

function makeRuler(realmId: RealmId, inOfficeSinceTick = 0): RulerState {
  return {
    realmId,
    generalId: `general_${realmId}`,
    age: 40,
    lifespan: 70,
    health: 100,
    personality: 'conqueror',
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
    inOfficeSinceTick,
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

function reformState(realmId: RealmId): ReformState {
  return {
    realmId,
    reformId: 'hu_fu_qi_she',
    currentStageId: 'stage_1',
    startedAtTick: 20,
    stageEnteredAtTick: 20,
    status: 'in_progress',
    choiceHistory: [],
  }
}

const plan: StrategicPlan = {
  targetSiteId: 'site_enemy',
  mainEnemyRealmId: 'realm_enemy',
  mainAllyRealmId: 'realm_friend',
  reformIntentId: 'hu_fu_qi_she',
  decidedAtTick: 10,
  decidedForYearBC: 300,
}

function baseWorld(overrides: Partial<World> = {}): World {
  return makeEmptyWorld({
    date: { yearBC: 300, season: 'summer', month: 1, xun: 'shang' },
    tick: 18,
    playerRealmId: 'realm_player',
    realms: new Map([
      ['realm_player', makeRealm('realm_player', 'site_player')],
      ['realm_ai', makeRealm('realm_ai', 'site_ai')],
      ['realm_enemy', makeRealm('realm_enemy', 'site_enemy')],
      ['realm_friend', makeRealm('realm_friend', 'site_friend')],
    ]),
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
    rulers: new Map([
      ['realm_ai', makeRuler('realm_ai')],
      ['realm_enemy', makeRuler('realm_enemy')],
      ['realm_friend', makeRuler('realm_friend')],
    ]),
    aiState: new Map([['realm_ai', { strategic: plan, operational: [] }]]),
    ...overrides,
  })
}

describe('isStrategicPlanStale', () => {
  it('detects deactivated main enemy', () => {
    const world = baseWorld({
      realms: new Map([
        ['realm_player', makeRealm('realm_player', 'site_player')],
        ['realm_ai', makeRealm('realm_ai', 'site_ai')],
        ['realm_enemy', makeRealm('realm_enemy', 'site_enemy', 'deactivated')],
        ['realm_friend', makeRealm('realm_friend', 'site_friend')],
      ]),
    })

    expect(isStrategicPlanStale(world, 'realm_ai', plan)).toBe(true)
  })

  it('detects main ally becoming a war enemy', () => {
    const world = baseWorld({ wars: declareWar(new Map(), 'realm_ai', 'realm_friend') })

    expect(isStrategicPlanStale(world, 'realm_ai', plan)).toBe(true)
  })

  it('detects target site now owned by us', () => {
    const sites = new Map(baseWorld().sites)
    sites.set('site_enemy', makeSite('site_enemy', 'realm_ai', ['site_ai']))

    expect(isStrategicPlanStale(baseWorld({ sites }), 'realm_ai', plan)).toBe(true)
  })

  it('detects target site no longer adjacent to our territory', () => {
    const sites = new Map(baseWorld().sites)
    sites.set('site_ai', makeSite('site_ai', 'realm_ai', []))

    expect(isStrategicPlanStale(baseWorld({ sites }), 'realm_ai', plan)).toBe(true)
  })

  it('detects reform intent becoming active', () => {
    const world = baseWorld({ reformStates: new Map([['realm_ai', reformState('realm_ai')]]) })

    expect(isStrategicPlanStale(world, 'realm_ai', plan)).toBe(true)
  })

  it('detects ruler changes after plan decision', () => {
    const world = baseWorld({ rulers: new Map([['realm_ai', makeRuler('realm_ai', 12)]]) })

    expect(isStrategicPlanStale(world, 'realm_ai', plan)).toBe(true)
  })

  it('keeps a valid current plan fresh', () => {
    const currentPlan = { ...plan, reformIntentId: null }

    expect(isStrategicPlanStale(baseWorld(), 'realm_ai', currentPlan)).toBe(false)
  })
})

describe('aiStrategicStep stale off-year recompute', () => {
  it('recomputes stale plans outside yearly trigger', () => {
    const stalePlan = { ...plan, targetSiteId: 'site_player' }
    const world = baseWorld({
      aiState: new Map([['realm_ai', { strategic: stalePlan, operational: [] }]]),
    })
    const rng = createInitialRng(4)

    const result = aiStrategicStep(world, rng)

    expect(result.world.aiState.get('realm_ai')?.strategic?.targetSiteId).toBe('site_enemy')
    expect(result.world.aiState.get('realm_ai')?.strategic?.decidedAtTick).toBe(18)
    expect(result.events.map((event) => event.type)).toEqual(['aiStrategicDecided'])
  })

  it('skips off-year fresh plans without consuming RNG', () => {
    const currentPlan = { ...plan, reformIntentId: null }
    const world = baseWorld({
      aiState: new Map([['realm_ai', { strategic: currentPlan, operational: [] }]]),
    })
    const rng = createInitialRng(4)

    const result = aiStrategicStep(world, rng)

    expect(result).toEqual({ world, nextRng: rng, events: [] })
  })
})
