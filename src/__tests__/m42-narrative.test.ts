import { describe, expect, it } from 'vitest'

import { runTickPhases } from '~/engine/clock'
import { createWorldFromM1Data, loadM1Data } from '~/engine/world/factory'
import type { World } from '~/shared/types'

const TICKS_PER_RUN = 200
const HUNDRED_TICKS = 100

function withSeed(world: World, seed: number): World {
  return { ...world, rngState: { seed, counter: 0 } }
}

function runForTicks(initial: World, ticks: number): { world: World; events: number } {
  let world = initial
  let eventCount = 0
  for (let i = 0; i < ticks; i++) {
    const result = runTickPhases(world, world.rngState)
    world = result.world
    eventCount += result.events.length
  }
  return { world, events: eventCount }
}

describe('M4.2 emergent narrative', () => {
  it('runs 200 ticks with M4.2 phases without crashing (seed=42)', () => {
    const data = loadM1Data()
    const initial = withSeed(createWorldFromM1Data(data, 42, 'realm_qin'), 42)

    const { world, events } = runForTicks(initial, TICKS_PER_RUN)

    expect(world.tick).toBe(TICKS_PER_RUN)
    expect(events).toBeGreaterThanOrEqual(0)
  }, { timeout: 30000 })

  it('faction influences remain within [0,100] over 100 ticks across 3 seeds', () => {
    const data = loadM1Data()

    for (const seed of [42, 100, 200]) {
      const initial = withSeed(createWorldFromM1Data(data, seed, 'realm_qin'), seed)
      const { world } = runForTicks(initial, HUNDRED_TICKS)

      for (const [, state] of world.factionInfluences) {
        for (const [, value] of state.influences) {
          expect(value).toBeGreaterThanOrEqual(0)
          expect(value).toBeLessThanOrEqual(100)
        }
      }
    }
  }, { timeout: 30000 })

  it('trade routes do not grow unboundedly over 100 ticks', () => {
    const data = loadM1Data()
    const initial = withSeed(createWorldFromM1Data(data, 7, 'realm_qin'), 7)
    const initialRouteCount = initial.tradeRoutes.size

    const { world } = runForTicks(initial, HUNDRED_TICKS)

    expect(world.tradeRoutes.size).toBeLessThanOrEqual(initialRouteCount + 50)
  }, { timeout: 30000 })

  it('disaster states resolve within reasonable bounds across 200 ticks', () => {
    const data = loadM1Data()
    const initial = withSeed(createWorldFromM1Data(data, 999, 'realm_qin'), 999)

    const { world } = runForTicks(initial, TICKS_PER_RUN)

    const unresolvedPerRealm = new Map<string, number>()
    for (const [realmId, state] of world.disasterStates) {
      if (state.status === 'awaiting_decision' || state.status === 'resolving') {
        unresolvedPerRealm.set(realmId, (unresolvedPerRealm.get(realmId) ?? 0) + 1)
      }
    }
    for (const [, count] of unresolvedPerRealm) {
      expect(count).toBeLessThanOrEqual(1)
    }
  }, { timeout: 30000 })

  it('faction influences drift over 100 ticks (not all realms remain at default)', () => {
    const data = loadM1Data()
    const initial = withSeed(createWorldFromM1Data(data, 333, 'realm_qin'), 333)

    const { world } = runForTicks(initial, HUNDRED_TICKS)

    let drifted = false
    for (const [, state] of world.factionInfluences) {
      for (const [, value] of state.influences) {
        if (value !== 50) {
          drifted = true
          break
        }
      }
      if (drifted) break
    }
    expect(drifted).toBe(true)
  }, { timeout: 30000 })
})
