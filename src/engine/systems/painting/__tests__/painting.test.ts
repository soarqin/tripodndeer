import { describe, expect, it } from 'vitest'

import { INITIAL_DATE } from '@/shared/constants'
import type { Faction, FactionId, RNGState, Site, World } from '@/shared/types'

import { paintingStep } from '../painting'

function makeWorld(
  siteConfigs: Array<{ id: string; adjacency: string[]; owner: FactionId }>,
): World {
  const sites = new Map<string, Site>()
  for (const cfg of siteConfigs) {
    sites.set(cfg.id, {
      id: cfg.id,
      name: cfg.id,
      position: [0, 0],
      boundary: [],
      polygon: [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
      ],
      adjacency: cfg.adjacency,
      ownerId: cfg.owner,
    })
  }

  const factions = new Map<string, Faction>()
  factions.set('faction_red', { id: 'faction_red', displayName: '红', color: '#dc2626' })
  factions.set('faction_blue', { id: 'faction_blue', displayName: '蓝', color: '#2563eb' })

  return {
    date: { ...INITIAL_DATE },
    tick: 0,
    sites,
    factions,
    rngState: { seed: 42, counter: 0 },
    phases: [],
  }
}

function owners(world: World): Record<string, FactionId | null> {
  return Object.fromEntries(
    Array.from(world.sites.entries()).map(([id, site]) => [id, site.ownerId]),
  )
}

describe('paintingStep adjacency rules', () => {
  it('only flips blue sites adjacent to red sites', () => {
    let world = makeWorld([
      { id: 'A', adjacency: ['C'], owner: 'faction_red' },
      { id: 'B', adjacency: [], owner: 'faction_blue' },
      { id: 'C', adjacency: ['A'], owner: 'faction_blue' },
    ])
    let rng: RNGState = { seed: 7, counter: 0 }

    for (let i = 0; i < 5; i += 1) {
      const result = paintingStep(world, rng)
      world = result.world
      rng = result.nextRng
    }

    expect(owners(world)).toEqual({ A: 'faction_red', B: 'faction_blue', C: 'faction_red' })
  })
})

describe('paintingStep no-op cases', () => {
  it('returns the same world when red has no blue neighbors', () => {
    const world = makeWorld([
      { id: 'A', adjacency: [], owner: 'faction_red' },
      { id: 'B', adjacency: [], owner: 'faction_blue' },
    ])
    const rng: RNGState = { seed: 42, counter: 0 }

    const result = paintingStep(world, rng)

    expect(result.world).toBe(world)
    expect(result.nextRng).toBe(rng)
    expect(result.events).toEqual([])
  })

  it('returns the same world when every site is already red', () => {
    const world = makeWorld([
      { id: 'A', adjacency: ['B'], owner: 'faction_red' },
      { id: 'B', adjacency: ['A'], owner: 'faction_red' },
    ])
    const rng: RNGState = { seed: 42, counter: 0 }

    const result = paintingStep(world, rng)

    expect(result.world).toBe(world)
    expect(result.nextRng).toBe(rng)
    expect(result.events).toEqual([])
  })
})

describe('paintingStep randomness', () => {
  it('is deterministic for the same world and rng', () => {
    const world = makeWorld([
      { id: 'A', adjacency: ['B', 'C'], owner: 'faction_red' },
      { id: 'B', adjacency: ['A'], owner: 'faction_blue' },
      { id: 'C', adjacency: ['A'], owner: 'faction_blue' },
    ])
    const rng: RNGState = { seed: 123, counter: 4 }

    const first = paintingStep(world, rng)
    const second = paintingStep(world, rng)

    expect(owners(first.world)).toEqual(owners(second.world))
    expect(first.nextRng).toEqual(second.nextRng)
    expect(first.events).toEqual(second.events)
  })
})

describe('paintingStep evolution', () => {
  it('eventually turns a connected five-site graph red', () => {
    let world = makeWorld([
      { id: 'A', adjacency: ['B'], owner: 'faction_red' },
      { id: 'B', adjacency: ['A', 'C'], owner: 'faction_blue' },
      { id: 'C', adjacency: ['B', 'D'], owner: 'faction_blue' },
      { id: 'D', adjacency: ['C', 'E'], owner: 'faction_blue' },
      { id: 'E', adjacency: ['D'], owner: 'faction_blue' },
    ])
    let rng: RNGState = { seed: 42, counter: 0 }

    for (let i = 0; i < 4; i += 1) {
      const result = paintingStep(world, rng)
      world = result.world
      rng = result.nextRng
    }

    expect(Array.from(world.sites.values()).every(site => site.ownerId === 'faction_red')).toBe(true)
  })
})
