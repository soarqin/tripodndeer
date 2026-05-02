import { describe, expect, it } from 'vitest'
import type { z } from 'zod'

import { WorldSchema } from '~/shared/schemas'
import type { World } from '~/shared/types'

import { makeEmptyWorld } from './fixtures'

type MapFieldsOf<T> = {
  readonly [K in keyof T]: T[K] extends ReadonlyMap<unknown, unknown> ? K : never
}[keyof T]

const WORLD_MAP_FIELDS = [
  'sites',
  'realms',
  'armies',
  'edges',
  'wars',
  'peaceProposals',
  'relations',
  'diplomaticProposals',
  'treaties',
  'coalitions',
  'zhouInvestiture',
  'generals',
  'rulers',
  'eventChainStates',
  'reformStates',
  'disasterStates',
  'tradeRoutes',
  'factionInfluences',
  'passes',
  'adjacencyEdges',
  'sieges',
  'edicts',
  'governorAssignments',
] as const satisfies readonly MapFieldsOf<World>[]

const STRICT_MAP_FIELDS = [
  'rulers',
  'eventChainStates',
  'disasterStates',
  'tradeRoutes',
  'factionInfluences',
] as const satisfies readonly (typeof WORLD_MAP_FIELDS)[number][]

const shape = WorldSchema.shape as Record<string, z.ZodTypeAny>

describe('WorldSchema parity with World interface (T2.1)', () => {
  it.each(WORLD_MAP_FIELDS)('declares a validator for Map field "%s"', (field) => {
    expect(shape[field]).toBeDefined()
  })

  it.each(STRICT_MAP_FIELDS)('uses ZodMap (z.map) validator for strict field "%s"', (field) => {
    const fieldSchema = shape[field]
    expect(fieldSchema).toBeDefined()
    expect(fieldSchema?._def.typeName).toBe('ZodMap')
  })

  it('parses a full default world fixture successfully', () => {
    const world = makeEmptyWorld()
    const result = WorldSchema.safeParse(world)
    expect(result.success).toBe(true)
  })

  it.each(STRICT_MAP_FIELDS)('rejects a world missing strict Map field "%s"', (field) => {
    const world = makeEmptyWorld()
    const incomplete = { ...world } as Record<string, unknown>
    delete incomplete[field]
    const result = WorldSchema.safeParse(incomplete)
    expect(result.success).toBe(false)
  })

  it('rejects rulers when it is a plain object instead of a Map', () => {
    const world = makeEmptyWorld()
    const result = WorldSchema.safeParse({
      ...world,
      rulers: {} as unknown as ReadonlyMap<string, unknown>,
    })
    expect(result.success).toBe(false)
  })

  it('rejects rulers when it contains a malformed RulerState entry', () => {
    const world = makeEmptyWorld()
    const malformedRulers = new Map<string, unknown>([
      ['realm_qin', { realmId: 'realm_qin' }],
    ])
    const result = WorldSchema.safeParse({
      ...world,
      rulers: malformedRulers as unknown as ReadonlyMap<string, unknown>,
    })
    expect(result.success).toBe(false)
  })

  it('rejects eventChainStates when an entry has wrong type for choiceHistory', () => {
    const world = makeEmptyWorld()
    const badEventChainStates = new Map<string, unknown>([
      [
        'event_test',
        {
          id: 'event_test',
          currentStageId: 'stage_1',
          completed: false,
          startedAtTick: 0,
          choiceHistory: 'not-an-array',
        },
      ],
    ])
    const result = WorldSchema.safeParse({
      ...world,
      eventChainStates: badEventChainStates as unknown as ReadonlyMap<string, unknown>,
    })
    expect(result.success).toBe(false)
  })
})
