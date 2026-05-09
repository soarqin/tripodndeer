import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { createInitialRng } from '~/engine/random'
import { declareWar } from '~/engine/wars'
import { aiTacticalStep } from '../tactical-step'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import type { OperationalDirective } from '~/shared/types/ai-state'
import type { Army, Realm, RealmId, RulerState, Site, World } from '~/shared/types'

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

function makeDirective(overrides: Partial<OperationalDirective> = {}): OperationalDirective {
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

function makeWorld(overrides: Partial<World> = {}): World {
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
    ]),
    armies: new Map([['army_directed', makeArmy('army_directed', 'site_ai_directed')]]),
    rulers: new Map([[aiRealmId, makeRuler(aiRealmId)]]),
    aiState: new Map([[aiRealmId, { strategic: null, operational: [] }]]),
    ...overrides,
  })
}

describe('tactical boundary tests', () => {
  it('empty Operational directives produce zero events across 10 ticks', () => {
    const world = makeWorld({ aiState: new Map([[aiRealmId, { strategic: null, operational: [] }]]) })
    let currentWorld = world
    let totalEvents = 0

    for (let i = 0; i < 10; i += 1) {
      const result = aiTacticalStep(currentWorld, currentWorld.rngState)
      currentWorld = result.world
      totalEvents += result.events.length
    }

    expect(totalEvents).toBe(0)
  })

  it('dispatch_army directives do not change war counts', () => {
    const world = makeWorld({
      wars: declareWar(new Map(), aiRealmId, enemyRealmId),
      aiState: new Map([[aiRealmId, { strategic: null, operational: [makeDirective()] }]]),
    })

    const result = aiTacticalStep(world, createInitialRng(42))

    expect(result.world.wars.size).toBe(world.wars.size)
  })

  it('tactical-step.ts has no forbidden imports', () => {
    const content = readFileSync(fileURLToPath(new URL('../tactical-step.ts', import.meta.url)), 'utf-8')

    expect(content).not.toMatch(/import.*diplomacy/)
    expect(content).not.toMatch(/import.*espionage/)
    expect(content).not.toMatch(/declareWar/)
    expect(content).not.toMatch(/proposeAlliance/)
  })
})
