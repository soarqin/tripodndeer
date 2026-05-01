import { describe, expect, it } from 'vitest'

import { siegeStep, startSiege } from '../siege'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import type { Army, RNGState, Site, World } from '~/shared/types'

const rng: RNGState = { seed: 0, counter: 0 }

function makeArmy(overrides: Partial<Army> = {}): Army {
  return {
    id: 'army_attacker',
    realmId: 'realm_qin',
    manpower: 10000,
    location: 'site_target',
    state: 'besieging',
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

function makeWorld(armies: readonly Army[], sites: readonly Site[]): World {
  return makeEmptyWorld({
    sites: new Map(sites.map((s) => [s.id, s])),
    armies: new Map(armies.map((a) => [a.id, a])),
    rngState: rng,
  })
}

describe('startSiege', () => {
  it('initializes a siege with full fortification and supply', () => {
    const attacker = makeArmy()
    const target = makeSite('site_target', 'realm_zhao')
    const world = makeWorld([attacker], [target])

    const next = startSiege(world, 'army_attacker', 'site_target')

    const sieges = [...next.sieges.values()]
    expect(sieges).toHaveLength(1)
    const siege = sieges[0]!
    expect(siege.fortification).toBe(100)
    expect(siege.supplyRemaining).toBe(20)
    expect(siege.durationTicks).toBe(0)
    expect(siege.attackerArmyIds).toEqual(['army_attacker'])
    expect(siege.defenderSiteId).toBe('site_target')

    const army = next.armies.get('army_attacker')!
    expect(army.state).toBe('besieging')
    expect(army.location).toBe('site_target')
  })
})

describe('siegeStep starvation path', () => {
  it('starvation forces surrender when supply exhausts', () => {
    const attacker = makeArmy()
    const target = makeSite('site_target', 'realm_zhao')
    let world = makeWorld([attacker], [target])
    world = startSiege(world, 'army_attacker', 'site_target')

    // 20 supply / 2 per tick = 10 ticks until exhausted
    const events = []
    for (let i = 0; i < 10; i++) {
      const result = siegeStep(world, rng)
      world = result.world
      events.push(...result.events)
    }

    // Site should now belong to attacker
    expect(world.sites.get('site_target')!.ownerId).toBe('realm_qin')
    // Siege removed
    expect(world.sieges.size).toBe(0)
    // siteConquered emitted with reason 'starvation'
    const conquest = events.find((e) => e.type === 'siteConquered') as
      | { type: 'siteConquered'; payload: { reason?: string } }
      | undefined
    expect(conquest).toBeDefined()
    expect(conquest!.payload.reason).toBe('starvation')
    // siegeEnded with outcome 'starvation'
    const ended = events.find((e) => e.type === 'siegeEnded') as
      | { type: 'siegeEnded'; payload: { outcome: string } }
      | undefined
    expect(ended).toBeDefined()
    expect(ended!.payload.outcome).toBe('starvation')
    // Attacker is idle on the conquered site
    const attackerAfter = world.armies.get('army_attacker')!
    expect(attackerAfter.state).toBe('idle')
    expect(attackerAfter.location).toBe('site_target')
  })
})

describe('siegeStep wallBreach event', () => {
  it('emits wallBreach event when fortification crosses below 20', () => {
    const attacker = makeArmy()
    const target = makeSite('site_target', 'realm_zhao')
    let world = makeWorld([attacker], [target])
    world = startSiege(world, 'army_attacker', 'site_target')

    // Override siege with high supply so starvation does not trigger before breach.
    const sieges = new Map(world.sieges)
    const [siegeId, siege] = [...sieges.entries()][0]!
    sieges.set(siegeId, { ...siege, supplyRemaining: 1000 })
    world = { ...world, sieges }

    // Fortification: 100 -> 95 -> 90 -> ... -> 25 -> 20 -> 15 ...
    // 100 - 17*5 = 15 → first tick where new fortification < 20 is tick 17.
    const allEvents = []
    for (let i = 0; i < 17; i++) {
      const result = siegeStep(world, rng)
      world = result.world
      allEvents.push(...result.events)
      if (world.sieges.size === 0) break
    }

    const breachEvents = allEvents.filter((e) => e.type === 'wallBreach')
    expect(breachEvents.length).toBeGreaterThanOrEqual(1)
    const firstBreach = breachEvents[0] as
      | { type: 'wallBreach'; payload: { fortification: number } }
      | undefined
    expect(firstBreach!.payload.fortification).toBeLessThan(20)
  })
})

describe('siegeStep retreat path', () => {
  it('ends siege when all attacker armies are retreating', () => {
    const attacker = makeArmy({ state: 'retreating' })
    const target = makeSite('site_target', 'realm_zhao')
    let world = makeWorld([attacker], [target])
    // Manually inject a siege referencing the retreating attacker
    world = startSiege(world, 'army_attacker', 'site_target')
    // Override the attacker to retreating after startSiege
    const armies = new Map(world.armies)
    armies.set('army_attacker', { ...armies.get('army_attacker')!, state: 'retreating' })
    world = { ...world, armies }

    const result = siegeStep(world, rng)

    expect(result.world.sieges.size).toBe(0)
    const ended = result.events.find((e) => e.type === 'siegeEnded') as
      | { type: 'siegeEnded'; payload: { outcome: string } }
      | undefined
    expect(ended).toBeDefined()
    expect(ended!.payload.outcome).toBe('retreat')
    // Site ownership unchanged
    expect(result.world.sites.get('site_target')!.ownerId).toBe('realm_zhao')
  })
})
