import { describe, expect, it } from 'vitest'

import { runTickPhases } from '@/engine/clock'
import { PHASE_ORDER } from '@/engine/phases'
import { aiPlanStep } from '@/engine/systems/ai'
import { combatV2Step } from '@/engine/systems/combat-v2'
import { diplomacyLifecycleStep } from '@/engine/systems/diplomacy'
import { manpowerTick } from '@/engine/systems/manpower'
import { marchStep } from '@/engine/systems/march'
import { orderApplyStep } from '@/engine/systems/orders'
import { siegeStep } from '@/engine/systems/siege'
import { victoryCheckStep } from '@/engine/systems/victory'
import { createInitialWorld, createWorldFromM1Data, loadM0Data, loadM1Data } from '../factory'
import type { TickPhase } from '@/shared/types'

function phaseName(phase: TickPhase): string {
  if (phase === aiPlanStep) return 'aiPlan'
  if (phase === orderApplyStep) return 'orderApply'
  if (phase === marchStep) return 'march'
  if (phase === siegeStep) return 'siege'
  if (phase === combatV2Step) return 'combat-v2'
  if (phase === manpowerTick) return 'manpower'
  if (phase === victoryCheckStep) return 'victoryCheck'
  if (phase === diplomacyLifecycleStep) return 'diplomacyLifecycle'
  return 'unknown'
}

describe('loadM0Data', () => {
  it('loads and validates m0 data with edges', () => {
    const data = loadM0Data()
    expect(data.sites.length).toBe(5)
    expect(Object.keys(data.edges).length).toBeGreaterThan(0)
    expect(data.realms.length).toBe(2)
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
      manpowerTick,
      victoryCheckStep,
      diplomacyLifecycleStep,
    ])
    expect(world.phases.map(phaseName)).toEqual(PHASE_ORDER)

    const result = runTickPhases(world, world.rngState)
    expect(result.world.tick).toBe(1)
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
})
