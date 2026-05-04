import { describe, expect, it } from 'vitest'
import { M7_COVERAGE_TIER_1 } from '~/content/m2/balance'
import { createWorldFromM1Data, loadM1Data } from '~/engine/world/factory'
import { makeCoverageKey } from '../types'
import { makeEmptyWorld } from './fixtures'

describe('M7 World fields (intelligenceCoverage / spyMissions / counterIntelStates)', () => {
  it('createWorldFromM1Data initializes intelligenceCoverage with 56 directional entries (8 realms × 7 others)', () => {
    const data = loadM1Data()
    const world = createWorldFromM1Data(data, 42, 'realm_qin')
    expect(world.intelligenceCoverage.size).toBe(56)
  })

  it('intelligenceCoverage is directional: coverage(qin→chu) key ≠ coverage(chu→qin) key', () => {
    const data = loadM1Data()
    const world = createWorldFromM1Data(data, 42, 'realm_qin')
    const qinToChuKey = makeCoverageKey('realm_qin', 'realm_chu')
    const chuToQinKey = makeCoverageKey('realm_chu', 'realm_qin')
    expect(qinToChuKey).not.toBe(chuToQinKey)
    expect(world.intelligenceCoverage.has(qinToChuKey)).toBe(true)
    expect(world.intelligenceCoverage.has(chuToQinKey)).toBe(true)
  })

  it('all intelligenceCoverage entries initialized to 0 or M7_COVERAGE_TIER_1 (adjacency-aware seeding)', () => {
    const data = loadM1Data()
    const world = createWorldFromM1Data(data, 42, 'realm_qin')
    for (const value of world.intelligenceCoverage.values()) {
      expect([0, M7_COVERAGE_TIER_1]).toContain(value)
    }
  })

  it('intelligenceCoverage has no self-pair entries (a==a)', () => {
    const data = loadM1Data()
    const world = createWorldFromM1Data(data, 42, 'realm_qin')
    for (const key of world.intelligenceCoverage.keys()) {
      const [observer, target] = key.split('__')
      expect(observer).not.toBe(target)
    }
  })

  it('spyMissions is initially empty', () => {
    const data = loadM1Data()
    const world = createWorldFromM1Data(data, 42, 'realm_qin')
    expect(world.spyMissions.size).toBe(0)
  })

  it('counterIntelStates has 8 entries (one per realm)', () => {
    const data = loadM1Data()
    const world = createWorldFromM1Data(data, 42, 'realm_qin')
    expect(world.counterIntelStates.size).toBe(8)
    for (const realmId of world.realms.keys()) {
      expect(world.counterIntelStates.has(realmId)).toBe(true)
    }
  })

  it('each counterIntelState has detectionLevel === 0 and lastUpdatedTick === 0', () => {
    const data = loadM1Data()
    const world = createWorldFromM1Data(data, 42, 'realm_qin')
    for (const state of world.counterIntelStates.values()) {
      expect(state.detectionLevel).toBe(0)
      expect(state.lastUpdatedTick).toBe(0)
    }
  })

  it('counterIntelState.realmId matches its Map key', () => {
    const data = loadM1Data()
    const world = createWorldFromM1Data(data, 42, 'realm_qin')
    for (const [key, state] of world.counterIntelStates) {
      expect(state.realmId).toBe(key)
    }
  })

  it('makeEmptyWorld has all 3 new Maps initialized as empty', () => {
    const world = makeEmptyWorld()
    expect(world.intelligenceCoverage).toBeInstanceOf(Map)
    expect(world.intelligenceCoverage.size).toBe(0)
    expect(world.spyMissions).toBeInstanceOf(Map)
    expect(world.spyMissions.size).toBe(0)
    expect(world.counterIntelStates).toBeInstanceOf(Map)
    expect(world.counterIntelStates.size).toBe(0)
  })
})
