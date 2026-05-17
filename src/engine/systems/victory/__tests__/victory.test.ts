import { describe, expect, it } from 'vitest'
import { isVictorious, isDefeated, victoryCheckStep } from '../victory'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import type { RNGState, Site, World } from '~/shared/types'

function makeWorld(siteOwners: Record<string, string>, playerRealmId: string): World {
  const sites = new Map(
    Object.entries(siteOwners).map(([id, ownerId]) => [
      id,
      {
        id,
        name: id,
        position: [0, 0] as [number, number],
        boundary: [],
        ownerId,
        polygon: [],
        adjacency: [],
        economy: { population: 0, households: 0, taxBase: 0, foodProduction: 0 },
      } as Site,
    ]),
  )

  return makeEmptyWorld({
    sites,
    playerRealmId,
  })
}

const rng: RNGState = { seed: 0, counter: 0 }

describe('isVictorious', () => {
  it('returns true when player owns all sites', () => {
    const world = makeWorld({ site_1: 'realm_qin', site_2: 'realm_qin' }, 'realm_qin')
    expect(isVictorious(world)).toBe(true)
  })

  it('returns false when one site is owned by another realm', () => {
    const world = makeWorld({ site_1: 'realm_qin', site_2: 'realm_han' }, 'realm_qin')
    expect(isVictorious(world)).toBe(false)
  })

  it('returns false when all sites are owned by another realm', () => {
    const world = makeWorld({ site_1: 'realm_han', site_2: 'realm_han' }, 'realm_qin')
    expect(isVictorious(world)).toBe(false)
  })

  it('returns false when there are no sites', () => {
    const world = makeWorld({}, 'realm_qin')
    expect(isVictorious(world)).toBe(false)
  })

  it('is stable across repeated calls', () => {
    const world = makeWorld({ site_1: 'realm_qin' }, 'realm_qin')
    expect(isVictorious(world)).toBe(isVictorious(world))
  })
})

describe('isDefeated', () => {
  it('returns true when player owns no sites', () => {
    const world = makeWorld({ site_1: 'realm_han', site_2: 'realm_zhao' }, 'realm_qin')
    expect(isDefeated(world)).toBe(true)
  })

  it('returns false when player owns at least one site', () => {
    const world = makeWorld({ site_1: 'realm_qin', site_2: 'realm_han' }, 'realm_qin')
    expect(isDefeated(world)).toBe(false)
  })

  it('returns false when there are no sites', () => {
    const world = makeWorld({}, 'realm_qin')
    expect(isDefeated(world)).toBe(false)
  })
})

describe('victoryCheckStep', () => {
  it('emits victoryAchieved when player owns all sites', () => {
    const world = makeWorld({ site_1: 'realm_qin' }, 'realm_qin')
    const { events } = victoryCheckStep(world, rng)

    expect(events).toHaveLength(1)
    expect(events[0]?.type).toBe('victoryAchieved')
    expect(events[0]?.payload).toEqual({ realmId: 'realm_qin' })
  })

  it('emits playerDefeated when player owns no sites', () => {
    const world = makeWorld({ site_1: 'realm_han' }, 'realm_qin')
    const { events } = victoryCheckStep(world, rng)

    expect(events).toHaveLength(1)
    expect(events[0]?.type).toBe('playerDefeated')
    expect(events[0]?.payload).toEqual({ realmId: 'realm_qin' })
  })

  it('emits no events when player does not own all sites but owns at least one', () => {
    const world = makeWorld({ site_1: 'realm_qin', site_2: 'realm_han' }, 'realm_qin')
    const { events } = victoryCheckStep(world, rng)

    expect(events).toHaveLength(0)
  })

  it('does not modify the world reference', () => {
    const world = makeWorld({ site_1: 'realm_qin' }, 'realm_qin')
    const result = victoryCheckStep(world, rng)

    expect(result.world).toBe(world)
  })

  it('returns the original rng reference as nextRng', () => {
    const world = makeWorld({ site_1: 'realm_qin' }, 'realm_qin')
    const result = victoryCheckStep(world, rng)

    expect(result.nextRng).toBe(rng)
  })
})
