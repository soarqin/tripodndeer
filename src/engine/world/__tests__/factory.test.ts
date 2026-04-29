import { describe, expect, it } from 'vitest'

import { loadM0Data, createInitialWorld } from '../factory'
import { M0DataSchema } from '@/shared/schemas'

describe('loadM0Data', () => {
  it('loads and validates m0 data', () => {
    const data = loadM0Data()

    expect(data.sites.length).toBe(5)
    expect(data.factions.length).toBe(2)
    expect(() => M0DataSchema.parse(data)).not.toThrow()
  })
})

describe('createInitialWorld', () => {
  it('creates valid world from m0 data', () => {
    const data = loadM0Data()
    const world = createInitialWorld(data, 42)

    expect(world.sites.size).toBe(5)
    expect(world.factions.size).toBe(2)
    expect(world.rngState).toEqual({ seed: 42, counter: 0 })
    expect(world.phases.length).toBe(1)
    expect(world.tick).toBe(0)
    expect(world.date.yearBC).toBe(453)
    expect(world.date.season).toBe('spring')
  })

  it('throws ZodError on invalid data (missing polygon)', () => {
    const data = loadM0Data()
    const bad = {
      ...data,
      sites: data.sites.map((site, index) => (index === 0 ? { ...site, polygon: undefined } : site)),
    }

    expect(() => createInitialWorld(bad as never, 42)).toThrow()
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
