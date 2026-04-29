import { describe, expect, it } from 'vitest'

import { createInitialWorld, createWorldFromM1Data, loadM0Data, loadM1Data } from '../factory'

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
})
