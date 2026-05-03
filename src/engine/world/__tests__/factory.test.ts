import { describe, expect, it } from 'vitest'

import { runTickPhases } from '@/engine/clock'
import { PHASE_ORDER } from '@/engine/phases'
import { aiPlanStep } from '@/engine/systems/ai'
import { characterLifecyclePhase } from '@/engine/systems/character'
import { combatV2Step } from '@/engine/systems/combat-v2'
import { culturalIdentityPhase } from '@/engine/systems/culture/cultural-identity-phase'
import { ideologyDriftPhase } from '@/engine/systems/culture/ideology-drift-phase'
import { prestigeUpdatePhase } from '@/engine/systems/culture/prestige-update-phase'
import { diplomacyLifecycleStep } from '@/engine/systems/diplomacy'
import { disasterPhase } from '@/engine/systems/disaster/disaster-phase'
import { economyPhase } from '@/engine/systems/economy'
import { factionPhase } from '@/engine/systems/faction/faction-phase'
import { historicalEventsPhase } from '@/engine/systems/events'
import { manpowerTick } from '@/engine/systems/manpower'
import { marchStep } from '@/engine/systems/march'
import { orderApplyStep } from '@/engine/systems/orders'
import { recruitmentPhase } from '@/engine/systems/recruitment'
import { reformPhase } from '@/engine/systems/reform'
import { rulerLifecyclePhase } from '@/engine/systems/ruler'
import { siegeStep } from '@/engine/systems/siege'
import { tradePhase } from '@/engine/systems/trade/trade-phase'
import { victoryCheckStep } from '@/engine/systems/victory'
import {
  M4_BASE_FOOD_PRODUCTION_PER_HOUSEHOLD,
  M4_DEFAULT_REALM_FOOD_STORES,
  M4_DEFAULT_REALM_TREASURY,
  M4_DEFAULT_SITE_POPULATION,
  M4_DEFAULT_TAX_RATE,
  M4_HOUSEHOLD_DIVISOR,
} from '@/content/m2/balance'
import { createInitialWorld, createWorldFromM1Data, loadM0Data, loadM1Data } from '../factory'
import type { TickPhase } from '@/shared/types'

const expectedSiteHouseholds = Math.floor(M4_DEFAULT_SITE_POPULATION / M4_HOUSEHOLD_DIVISOR)
const expectedSiteEconomy = {
  population: M4_DEFAULT_SITE_POPULATION,
  households: expectedSiteHouseholds,
  taxBase: expectedSiteHouseholds,
  foodProduction: expectedSiteHouseholds * M4_BASE_FOOD_PRODUCTION_PER_HOUSEHOLD,
}

const expectedRealmEconomy = {
  treasury: M4_DEFAULT_REALM_TREASURY,
  foodStores: M4_DEFAULT_REALM_FOOD_STORES,
  taxRate: M4_DEFAULT_TAX_RATE,
}

function phaseName(phase: TickPhase): string {
  if (phase === aiPlanStep) return 'aiPlan'
  if (phase === orderApplyStep) return 'orderApply'
  if (phase === marchStep) return 'march'
  if (phase === siegeStep) return 'siege'
  if (phase === combatV2Step) return 'combat-v2'
  if (phase === culturalIdentityPhase) return 'culturalIdentity'
  if (phase === manpowerTick) return 'manpower'
  if (phase === rulerLifecyclePhase) return 'rulerLifecycle'
  if (phase === characterLifecyclePhase) return 'characterLifecycle'
  if (phase === recruitmentPhase) return 'recruitment'
  if (phase === ideologyDriftPhase) return 'ideologyDrift'
  if (phase === reformPhase) return 'reform'
  if (phase === victoryCheckStep) return 'victoryCheck'
  if (phase === diplomacyLifecycleStep) return 'diplomacyLifecycle'
  if (phase === economyPhase) return 'economy'
  if (phase === disasterPhase) return 'disaster'
  if (phase === tradePhase) return 'trade'
  if (phase === factionPhase) return 'faction'
  if (phase === historicalEventsPhase) return 'historicalEvents'
  if (phase === prestigeUpdatePhase) return 'prestigeUpdate'
  return 'unknown'
}

describe('loadM0Data', () => {
  it('loads and validates m0 data with edges', () => {
    const data = loadM0Data()
    expect(data.sites.length).toBe(5)
    expect(Object.keys(data.edges).length).toBeGreaterThan(0)
    expect(data.realms.length).toBe(2)
  })

  it('keeps the M0 loading path free of M1/M2 scenario collections', () => {
    const world = createInitialWorld(loadM0Data(), 42)

    expect(world.phases).toEqual([])
    expect(world.generals.size).toBe(0)
    expect(world.passes.size).toBe(0)
    expect(world.adjacencyEdges.size).toBe(0)
    expect(world.peaceProposals.size).toBe(0)
    expect(world.sieges.size).toBe(0)
    expect(world.relations.size).toBe(0)
    expect(world.edicts.size).toBe(0)
    expect(world.governorAssignments.size).toBe(0)
  })
})

describe('createInitialWorld — structure', () => {
  it('creates world with correct structure', () => {
    const data = loadM0Data()
    const world = createInitialWorld(data, 42)
    expect(world.sites.size).toBe(5)
    expect(world.realms.size).toBe(2)
    expect(world.rngState).toEqual({ seed: 42, counter: 0 })
    expect(world.phases.length).toBe(0)
    expect(world.tick).toBe(0)
    expect(world.date.yearBC).toBe(453)
    expect(world.date.season).toBe('spring')
    expect(world.relations.size).toBe(0)
    expect(world.diplomaticProposals.size).toBe(0)
    expect(world.treaties.size).toBe(0)
    expect(world.diplomacyHistory).toEqual([])
    expect(world.coalitions.size).toBe(0)
    expect(world.zhouInvestiture.size).toBe(0)
    expect(world.edicts).toEqual(new Map())
    expect(world.governorAssignments).toEqual(new Map())
  })

  it('initializes deterministic M4 economy defaults for M0 realms and sites', () => {
    const world = createInitialWorld(loadM0Data(), 42)

    for (const realm of world.realms.values()) {
      expect(realm.economy).toEqual(expectedRealmEconomy)
    }
    for (const site of world.sites.values()) {
      expect(site.economy).toEqual(expectedSiteEconomy)
    }
  })

  it('each site has polygon (expanded from boundary)', () => {
    const data = loadM0Data()
    const world = createInitialWorld(data, 42)
    for (const [, site] of world.sites) {
      expect(site.polygon.length).toBeGreaterThan(3)
    }
  })

  it('adjacency is derived and bidirectional', () => {
    const data = loadM0Data()
    const world = createInitialWorld(data, 42)
    for (const [siteId, site] of world.sites) {
      for (const nId of site.adjacency) {
        const neighbor = world.sites.get(nId)
        expect(neighbor?.adjacency).toContain(siteId)
      }
    }
  })
})

describe('createInitialWorld — error paths', () => {
  it('throws on unknown realm reference', () => {
    const data = loadM0Data()
    const bad = {
      ...data,
      initialOwnership: { ...data.initialOwnership, site_1: 'realm_unknown' },
    }
    expect(() => createInitialWorld(bad, 42)).toThrow(/unknown realm/)
  })

  it('throws on unknown edge reference', () => {
    const data = loadM0Data()
    const bad = {
      ...data,
      sites: data.sites.map((s, i) =>
        i === 0
          ? {
              ...s,
              boundary: [{ edge: 'e_NONEXISTENT', reverse: false }, ...s.boundary.slice(1)],
            }
          : s,
      ),
    }
    expect(() => createInitialWorld(bad, 42)).toThrow(/Unknown edge/)
  })
})

describe('createWorldFromM1Data — structure', () => {
  it('creates world with correct M1 structure', () => {
    const data = loadM1Data()
    const world = createWorldFromM1Data(data, 99, 'realm_qin')

    expect(world.realms.size).toBe(8)
    expect(world.armies.size).toBe(16)
    expect(world.wars.size).toBe(0)
    expect(world.playerRealmId).toBe('realm_qin')
    expect(world.tick).toBe(0)
    expect(world.date).toEqual({ yearBC: 260, season: 'spring', month: 1, xun: 'shang' })
    expect(world.relations.size).toBe(0)
    expect(world.diplomaticProposals.size).toBe(0)
    expect(world.treaties.size).toBe(0)
    expect(world.diplomacyHistory).toEqual([])
    expect(world.coalitions.size).toBe(0)
    expect(world.zhouInvestiture.size).toBe(0)
    expect(world.edicts.size).toBe(0)
    expect(world.governorAssignments.size).toBe(0)
  })

  it('initializes deterministic M4 economy defaults for every M1 realm and site', () => {
    const world = createWorldFromM1Data(loadM1Data(), 99, 'realm_qin')

    expect(world.realms.size).toBeGreaterThan(0)
    expect(world.sites.size).toBeGreaterThan(0)
    for (const realm of world.realms.values()) {
      expect(realm.economy).toEqual(expectedRealmEconomy)
    }
    for (const site of world.sites.values()) {
      expect(site.economy).toEqual(expectedSiteEconomy)
    }
  })

  it('createWorldFromM1Data has phases in correct order', () => {
    const data = loadM1Data()
    const world = createWorldFromM1Data(data, 42, 'realm_qin')

    expect(world.phases).toEqual([
      aiPlanStep,
      orderApplyStep,
      marchStep,
      siegeStep,
      combatV2Step,
      culturalIdentityPhase,
      manpowerTick,
      rulerLifecyclePhase,
      characterLifecyclePhase,
      recruitmentPhase,
      ideologyDriftPhase,
      reformPhase,
      victoryCheckStep,
      diplomacyLifecycleStep,
      economyPhase,
      disasterPhase,
      tradePhase,
      factionPhase,
      historicalEventsPhase,
      prestigeUpdatePhase,
    ])
    expect(world.phases.map(phaseName)).toEqual(PHASE_ORDER)

    const result = runTickPhases(world, world.rngState)
    expect(result.world.tick).toBe(1)
    expect(Object.keys(result).sort()).toEqual(['events', 'nextRng', 'world'])
    expect(Array.isArray(result.events)).toBe(true)
    expect(result.nextRng).toEqual(result.world.rngState)
    expect(result.world.phases.map(phaseName)).toEqual(PHASE_ORDER)
  })

  it('builds populated sites and edges', () => {
    const data = loadM1Data()
    const world = createWorldFromM1Data(data, 99, 'realm_qin')

    expect(world.sites.size).toBeGreaterThan(0)
    expect(world.edges.size).toBeGreaterThan(0)
    for (const [, site] of world.sites) {
      expect(site.polygon.length).toBeGreaterThan(3)
      expect(Array.isArray(site.adjacency)).toBe(true)
    }
  })

  it('all owned sites have occupation initialized', () => {
    const data = loadM1Data()
    const world = createWorldFromM1Data(data, 99, 'realm_qin')

    let ownedCount = 0
    for (const site of world.sites.values()) {
      if (site.ownerId) {
        expect(site.occupation?.occupierId).toBe(site.ownerId)
        expect(site.occupation?.controlLevel).toBe(100)
        ownedCount++
      }
    }

    expect(ownedCount).toBeGreaterThan(0)
  })

  it('world loads generals, passes, adjacencyEdges', () => {
    const world = createWorldFromM1Data(loadM1Data(), 99, 'realm_qin')

    expect(world.generals.size).toBeGreaterThanOrEqual(17)
    expect(world.passes.size).toBe(5)
    expect(world.adjacencyEdges.size).toBe(5)

    for (const pass of world.passes.values()) {
      expect(world.adjacencyEdges.has(pass.edgeId)).toBe(true)
    }
  })

  it('creates a complete M2 world shape for every runtime collection', () => {
    const world = createWorldFromM1Data(loadM1Data(), 99, 'realm_qin')

    expect(world).toMatchObject({
      wars: expect.any(Map),
      peaceProposals: expect.any(Map),
      relations: expect.any(Map),
      diplomaticProposals: expect.any(Map),
      treaties: expect.any(Map),
      coalitions: expect.any(Map),
      zhouInvestiture: expect.any(Map),
      generals: expect.any(Map),
      passes: expect.any(Map),
      adjacencyEdges: expect.any(Map),
      sieges: expect.any(Map),
      edicts: expect.any(Map),
      governorAssignments: expect.any(Map),
    })
  })
})
