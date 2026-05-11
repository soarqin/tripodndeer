import { describe, expect, it } from 'vitest'
import { getCurrentScenarioId } from '../use-hint-coordinator'
import type { World } from '~/shared/types'

function makeWorldWithSites(count: number): World {
  return {
    sites: new Map(Array.from({ length: count }, (_, i) => [`site_${i}`, {}])),
    scenarioId: count >= 250 ? 'm9' : 'm1',
    tutorialState: null,
  } as unknown as World
}

describe('M1 scenario gating', () => {
  it('M1 world (50 sites) returns m1', () => {
    const world = makeWorldWithSites(50)
    expect(getCurrentScenarioId(world)).toBe('m1')
  })

  it('M9 world (250 sites) returns m9', () => {
    const world = makeWorldWithSites(250)
    expect(getCurrentScenarioId(world)).toBe('m9')
  })

  it('any world with < 250 sites returns m1', () => {
    for (const count of [0, 1, 50, 100, 249]) {
      const world = makeWorldWithSites(count)
      expect(getCurrentScenarioId(world)).toBe('m1')
    }
  })
})
