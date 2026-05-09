import { describe, expect, it } from 'vitest'
import type { Army, Realm, RealmId, RulerState, Site, World } from '~/shared/types'
import type { AIState, OperationalDirective } from '~/shared/types/ai-state'
import { createInitialRng } from '~/engine/random'
import { declareWar } from '~/engine/wars'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import { aiTacticalStep } from '../tactical-step'

const playerRealmId = 'realm_player'
const aiRealmId = 'realm_ai'
const enemyRealmId = 'realm_enemy'

function makeRealm(id: RealmId, capital: string): Realm {
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

function makeArmy(id: string, location: string): Army {
  return {
    id,
    realmId: aiRealmId,
    manpower: 1000,
    location,
    state: 'idle',
    destination: null,
    ticksRemaining: 0,
    source: null,
  }
}

function makeRuler(realmId: RealmId): RulerState {
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
    inOfficeSinceTick: 0,
  }
}

function directive(overrides: Partial<OperationalDirective> = {}): OperationalDirective {
  return {
    id: 'directive_1',
    kind: 'dispatch_army',
    priority: 10,
    armyId: 'army_directed',
    targetRealmId: enemyRealmId,
    targetSiteId: 'site_enemy_directed',
    createdAtTick: 1,
    expiresAtTick: 10,
    ...overrides,
  }
}

function aiState(operational: readonly OperationalDirective[]): AIState {
  return { strategic: null, operational }
}

function baseWorld(overrides: Partial<World> = {}): World {
  return makeEmptyWorld({
    tick: 1,
    playerRealmId,
    realms: new Map([
      [playerRealmId, makeRealm(playerRealmId, 'site_player')],
      [aiRealmId, makeRealm(aiRealmId, 'site_ai_directed')],
      [enemyRealmId, makeRealm(enemyRealmId, 'site_enemy_directed')],
    ]),
    sites: new Map([
      ['site_player', makeSite('site_player', playerRealmId, [])],
      ['site_ai_directed', makeSite('site_ai_directed', aiRealmId, ['site_enemy_directed'])],
      ['site_enemy_directed', makeSite('site_enemy_directed', enemyRealmId, ['site_ai_directed'])],
      ['site_ai_other', makeSite('site_ai_other', aiRealmId, ['site_enemy_other'])],
      ['site_enemy_other', makeSite('site_enemy_other', enemyRealmId, ['site_ai_other'])],
    ]),
    armies: new Map([
      ['army_directed', makeArmy('army_directed', 'site_ai_directed')],
      ['army_other', makeArmy('army_other', 'site_ai_other')],
    ]),
    wars: declareWar(new Map(), aiRealmId, enemyRealmId),
    rulers: new Map([[aiRealmId, makeRuler(aiRealmId)]]),
    aiState: new Map([[aiRealmId, aiState([directive()])]]),
    ...overrides,
  })
}

describe('aiTacticalStep', () => {
  it('runs every tick without cadence skipping', () => {
    const result = aiTacticalStep(baseWorld({ tick: 2 }), createInitialRng(1))

    expect(result.world.armies.get('army_directed')?.state).toBe('marching')
    expect(result.events.map((event) => event.type)).toContain('aiDispatchedArmy')
  })

  it('does not act or consume RNG when directives are empty', () => {
    const world = baseWorld({ aiState: new Map([[aiRealmId, aiState([])]]) })
    const rng = createInitialRng(1)

    const result = aiTacticalStep(world, rng)

    expect(result.world.armies).toEqual(world.armies)
    expect(result.nextRng).toEqual(rng)
    expect(result.events).toEqual([])
  })

  it('bounds dispatch_army options to the referenced army', () => {
    const result = aiTacticalStep(baseWorld(), createInitialRng(1))

    expect(result.world.armies.get('army_directed')).toEqual(
      expect.objectContaining({
        state: 'marching',
        destination: 'site_enemy_directed',
      })
    )
    expect(result.world.armies.get('army_other')).toEqual(
      expect.objectContaining({ state: 'idle', destination: null })
    )
  })

  it('does not affect wars while executing tactical dispatches for active wars', () => {
    const world = baseWorld()

    const result = aiTacticalStep(world, createInitialRng(1))

    expect(result.world.wars).toEqual(world.wars)
  })

  it('is deterministic for the same seed', () => {
    const world = baseWorld()
    const left = aiTacticalStep(world, createInitialRng(7))
    const right = aiTacticalStep(world, createInitialRng(7))

    expect([...left.world.armies.entries()]).toEqual([...right.world.armies.entries()])
    expect(left.nextRng).toEqual(right.nextRng)
    expect(left.events).toEqual(right.events)
  })
})
