import { describe, expect, it } from 'vitest'

import { loadM0Data, createInitialWorld } from '../factory'
import { M0DataSchema } from '@/shared/schemas'

describe('loadM0Data', () => {
  it('loads m0 data', () => {
    const data = loadM0Data()

    expect(data.sites.length).toBeGreaterThan(0)
    expect(() => M0DataSchema.parse(data)).not.toThrow()
  })
})

describe('createInitialWorld', () => {
  it('creates world from m0 data', () => {
    const data = loadM0Data()
    const world = createInitialWorld(data, 42)

    expect(world.sites.size).toBeGreaterThan(0)
    expect(world.factions.size).toBeGreaterThan(0)
    expect(world.rngState).toEqual({ seed: 42, counter: 0 })
    expect(world.phases.length).toBe(1)
    expect(world.tick).toBe(0)
    expect(world.date.yearBC).toBe(453)
    expect(world.date.season).toBe('spring')
  })

  it('throws on unknown faction reference in ownership', () => {
    const data = loadM0Data()
    const bad = {
      ...data,
      initialOwnership: { ...data.initialOwnership, site_1: 'faction_does_not_exist' },
    }

    expect(() => createInitialWorld(bad, 42)).toThrow(/unknown faction/)
  })
})
