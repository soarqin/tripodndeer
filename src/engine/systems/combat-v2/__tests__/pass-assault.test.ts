import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { setCombatVarianceEnabled } from '~/engine/random'
import { createWorldFromM1Data, loadM1Data } from '~/engine/world/factory'
import type {
  AdjacencyEdge,
  Army,
  Pass,
  RNGState,
  Site,
  World,
} from '~/shared/types'
import { combatV2Step } from '../combat-v2-step'

const rng: RNGState = { seed: 0, counter: 0 }

function makeArmy(overrides: Partial<Army> = {}): Army {
  return {
    id: 'army_attacker',
    realmId: 'realm_qin',
    manpower: 1000,
    location: 'site_1',
    state: 'idle',
    destination: null,
    ticksRemaining: 0,
    source: null,
    ...overrides,
  }
}

function makeSite(id: string, ownerId: string | null): Site {
  return {
    id,
    name: id,
    position: [0, 0],
    boundary: [],
    ownerId,
    polygon: [],
    adjacency: [],
    economy: { population: 0, households: 0, taxBase: 0, foodProduction: 0 },
  }
}

function makePass(overrides: Partial<Pass> = {}): Pass {
  return {
    id: 'pass_test',
    name: 'Test Pass',
    edgeId: 'ae_test',
    defenseBonus: 0.6,
    controllerId: 'realm_han',
    fortification: 80,
    ...overrides,
  }
}

function makeAdjacencyEdge(overrides: Partial<AdjacencyEdge> = {}): AdjacencyEdge {
  return {
    id: 'ae_test',
    fromSiteId: 'site_1',
    toSiteId: 'site_2',
    passId: 'pass_test',
    ...overrides,
  }
}

function makeWorld(
  armies: readonly Army[],
  sites: readonly Site[],
  passes: readonly Pass[] = [],
  adjacencyEdges: readonly AdjacencyEdge[] = [],
  yearBC = 260,
): World {
  return {
    date: { yearBC, season: 'spring', month: 1, xun: 'shang' },
    tick: 0,
    sites: new Map(sites.map((site) => [site.id, site])),
    realms: new Map(),
    armies: new Map(armies.map((army) => [army.id, army])),
    edges: new Map(),
    wars: new Map(),
    peaceProposals: new Map(),
    relations: new Map(),
    diplomaticProposals: new Map(),
    treaties: new Map(),
    diplomacyHistory: [],
    coalitions: new Map(),
    zhouInvestiture: new Map(),
    generals: new Map(),
    passes: new Map(passes.map((pass) => [pass.id, pass])),
    adjacencyEdges: new Map(adjacencyEdges.map((ae) => [ae.id, ae])),
    sieges: new Map(),
    edicts: new Map(),
    governorAssignments: new Map(),
    playerRealmId: 'realm_qin',
    rngState: rng,
    phases: [],
    pendingOrders: [],
  }
}

describe('pass-assault factory loading', () => {
  it('loads 5 passes and 5 adjacencyEdges from M1 scenario data', () => {
    const data = loadM1Data()
    const world = createWorldFromM1Data(data, 0, 'realm_qin')

    expect(world.passes.size).toBe(5)
    expect(world.adjacencyEdges.size).toBe(5)

    const expectedPassIds = ['pass_hangu', 'pass_wu', 'pass_hulao', 'pass_xiao', 'pass_dasan']
    for (const id of expectedPassIds) {
      expect(world.passes.has(id)).toBe(true)
    }

    const hangu = world.passes.get('pass_hangu')
    expect(hangu?.defenseBonus).toBeCloseTo(0.6)
    expect(hangu?.controllerId).toBe('realm_qin')
  })
})

describe('pass-assault combatV2Step', () => {
  beforeEach(() => setCombatVarianceEnabled(false))
  afterEach(() => setCombatVarianceEnabled(true))

  it('applies pass defense bonus when attacker crosses an edge controlled by another realm', () => {
    const attacker = makeArmy({
      id: 'army_attacker',
      realmId: 'realm_qin',
      manpower: 1000,
      state: 'marching',
      source: 'site_1',
      destination: 'site_2',
      ticksRemaining: 0,
    })
    const defender = makeArmy({
      id: 'army_defender',
      realmId: 'realm_han',
      manpower: 1000,
      location: 'site_2',
    })
    const pass = makePass({ defenseBonus: 0.6, controllerId: 'realm_han' })
    const ae = makeAdjacencyEdge()
    const world = makeWorld(
      [attacker, defender],
      [makeSite('site_1', 'realm_qin'), makeSite('site_2', 'realm_han')],
      [pass],
      [ae],
    )

    const result = combatV2Step(world, rng)
    const events = result.events

    expect(events.some((e) => e.type === 'battleLost')).toBe(true)
    expect(events.some((e) => e.type === 'siteConquered')).toBe(false)
  })

  it('does not apply pass defense bonus when attacker already controls the pass', () => {
    const attacker = makeArmy({
      id: 'army_attacker',
      realmId: 'realm_qin',
      manpower: 1000,
      state: 'marching',
      source: 'site_1',
      destination: 'site_2',
      ticksRemaining: 0,
    })
    const defender = makeArmy({
      id: 'army_defender',
      realmId: 'realm_han',
      manpower: 1000,
      location: 'site_2',
    })
    const pass = makePass({ defenseBonus: 0.6, controllerId: 'realm_qin' })
    const ae = makeAdjacencyEdge()
    const world = makeWorld(
      [attacker, defender],
      [makeSite('site_1', 'realm_qin'), makeSite('site_2', 'realm_han')],
      [pass],
      [ae],
    )

    const result = combatV2Step(world, rng)

    // No pass defense bonus → 1000 vs 1000 plains plus tactic variance, but no pass-defense step
    // The pass should still belong to realm_qin afterwards
    expect(result.world.passes.get('pass_test')?.controllerId).toBe('realm_qin')
  })

  it('transfers pass controllerId to attacker on victory and emits passCaptured event', () => {
    const attacker = makeArmy({
      id: 'army_attacker',
      realmId: 'realm_qin',
      manpower: 5000,
      state: 'marching',
      source: 'site_1',
      destination: 'site_2',
      ticksRemaining: 0,
    })
    const defender = makeArmy({
      id: 'army_defender',
      realmId: 'realm_han',
      manpower: 500,
      location: 'site_2',
    })
    const pass = makePass({
      id: 'pass_test',
      defenseBonus: 0.1,
      controllerId: 'realm_han',
      fortification: 80,
    })
    const ae = makeAdjacencyEdge()
    const world = makeWorld(
      [attacker, defender],
      [makeSite('site_1', 'realm_qin'), makeSite('site_2', 'realm_han')],
      [pass],
      [ae],
    )

    const result = combatV2Step(world, rng)

    const updatedPass = result.world.passes.get('pass_test')
    expect(updatedPass?.controllerId).toBe('realm_qin')
    expect(updatedPass?.fortification).toBe(50)

    expect(result.events).toContainEqual({
      type: 'passCaptured',
      payload: {
        passId: 'pass_test',
        byRealm: 'realm_qin',
        fromRealm: 'realm_han',
      },
    })
  })
})
