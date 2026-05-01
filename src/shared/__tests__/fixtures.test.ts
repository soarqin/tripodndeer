import { describe, expect, it } from 'vitest'
import type { World } from '~/shared/types'
import { makeEmptyWorld, makeM5World, TEST_WORLD_DATE } from './fixtures'

const REQUIRED_WORLD_KEYS: readonly (keyof World)[] = [
  'date',
  'tick',
  'sites',
  'realms',
  'armies',
  'edges',
  'wars',
  'peaceProposals',
  'relations',
  'diplomaticProposals',
  'treaties',
  'diplomacyHistory',
  'coalitions',
  'zhouInvestiture',
  'generals',
  'rulers',
  'eventChainStates',
  'passes',
  'adjacencyEdges',
  'sieges',
  'edicts',
  'governorAssignments',
  'playerRealmId',
  'rngState',
  'phases',
  'pendingOrders',
]

describe('makeEmptyWorld', () => {
  it('returns object with all required World fields', () => {
    const world = makeEmptyWorld()

    for (const key of REQUIRED_WORLD_KEYS) {
      expect(world).toHaveProperty(key)
    }

    expect(world.date).toEqual(TEST_WORLD_DATE)
    expect(world.tick).toBe(0)
    expect(world.playerRealmId).toBe('realm_qin')
    expect(world.rngState).toEqual({ seed: 0, counter: 0 })
    expect(world.phases).toEqual([])
    expect(world.pendingOrders).toEqual([])
    expect(world.diplomacyHistory).toEqual([])

    expect(world.sites).toBeInstanceOf(Map)
    expect(world.realms).toBeInstanceOf(Map)
    expect(world.armies).toBeInstanceOf(Map)
    expect(world.edges).toBeInstanceOf(Map)
    expect(world.wars).toBeInstanceOf(Map)
    expect(world.peaceProposals).toBeInstanceOf(Map)
    expect(world.relations).toBeInstanceOf(Map)
    expect(world.diplomaticProposals).toBeInstanceOf(Map)
    expect(world.treaties).toBeInstanceOf(Map)
    expect(world.coalitions).toBeInstanceOf(Map)
    expect(world.zhouInvestiture).toBeInstanceOf(Map)
    expect(world.generals).toBeInstanceOf(Map)
    expect(world.rulers).toBeInstanceOf(Map)
    expect(world.eventChainStates).toBeInstanceOf(Map)
    expect(world.passes).toBeInstanceOf(Map)
    expect(world.adjacencyEdges).toBeInstanceOf(Map)
    expect(world.sieges).toBeInstanceOf(Map)
    expect(world.edicts).toBeInstanceOf(Map)
    expect(world.governorAssignments).toBeInstanceOf(Map)

    expect(world.sites.size).toBe(0)
    expect(world.realms.size).toBe(0)
  })

  it('overrides work correctly', () => {
    const world = makeEmptyWorld({
      tick: 42,
      playerRealmId: 'realm_chu',
      rngState: { seed: 7, counter: 3 },
    })

    expect(world.tick).toBe(42)
    expect(world.playerRealmId).toBe('realm_chu')
    expect(world.rngState).toEqual({ seed: 7, counter: 3 })
    expect(world.date).toEqual(TEST_WORLD_DATE)
    expect(world.phases).toEqual([])
  })

  it('returns a fresh rngState object so callers cannot mutate the default', () => {
    const a = makeEmptyWorld()
    const b = makeEmptyWorld()
    expect(a.rngState).not.toBe(b.rngState)
    expect(a.rngState).toEqual(b.rngState)
  })
})

describe('makeM5World', () => {
  it('returns valid World with specified realmIds', () => {
    const world = makeM5World({ realmIds: ['realm_qin', 'realm_chu', 'realm_qi'] })

    expect(world.realms.size).toBe(3)
    expect(world.realms.has('realm_qin')).toBe(true)
    expect(world.realms.has('realm_chu')).toBe(true)
    expect(world.realms.has('realm_qi')).toBe(true)
    expect(world.playerRealmId).toBe('realm_qin')
  })

  it('uses default two-realm setup when realmIds omitted', () => {
    const world = makeM5World()
    expect(world.realms.size).toBe(2)
    expect(world.realms.has('realm_qin')).toBe(true)
    expect(world.realms.has('realm_chu')).toBe(true)
  })

  it('populates generals when withCharacters is true', () => {
    const world = makeM5World({
      realmIds: ['realm_qin', 'realm_chu'],
      withCharacters: true,
    })

    expect(world.generals.size).toBe(2)
    const generals = [...world.generals.values()]
    expect(generals.every((g) => typeof g.might === 'number')).toBe(true)
    expect(generals.every((g) => typeof g.command === 'number')).toBe(true)
    expect(generals.map((g) => g.realmId).sort()).toEqual(['realm_chu', 'realm_qin'])
  })

  it('omits generals when withCharacters is false or default', () => {
    const world = makeM5World({ realmIds: ['realm_qin'] })
    expect(world.generals.size).toBe(0)
  })

  it('accepts withRulers option without error (reserved for T1.4)', () => {
    const world = makeM5World({ realmIds: ['realm_qin'], withRulers: true })
    expect(world.realms.size).toBe(1)
  })

  it('produced World has all required fields', () => {
    const world = makeM5World({ realmIds: ['realm_qin'], withCharacters: true })
    for (const key of REQUIRED_WORLD_KEYS) {
      expect(world).toHaveProperty(key)
    }
  })
})
