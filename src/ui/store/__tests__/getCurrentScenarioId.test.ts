import { describe, expect, it } from 'vitest'
import { getCurrentScenarioId } from '@/ui/coordinator/use-hint-coordinator'
import type { World } from '~/shared/types'

function makeWorld(sitesCount: number): World {
  return {
    sites: new Map(Array.from({ length: sitesCount }, (_, i) => [`site_${i}`, {}])),
    scenarioId: sitesCount >= 250 ? 'm9' : 'm1',
    tutorialState: null,
  } as unknown as World
}

describe('getCurrentScenarioId', () => {
  it('returns m1 for 50 sites (M1 scenario)', () => {
    expect(getCurrentScenarioId(makeWorld(50))).toBe('m1')
  })

  it('returns m9 for 250 sites (M9 scenario)', () => {
    expect(getCurrentScenarioId(makeWorld(250))).toBe('m9')
  })

  it('boundary: 249 sites = m1', () => {
    expect(getCurrentScenarioId(makeWorld(249))).toBe('m1')
  })

  it('boundary: 250 sites = m9', () => {
    expect(getCurrentScenarioId(makeWorld(250))).toBe('m9')
  })

  it('prefers explicit scenarioId over site-count fallback', () => {
    const world = {
      sites: new Map(Array.from({ length: 250 }, (_, i) => [`site_${i}`, {}])),
      scenarioId: 'tutorial',
      tutorialState: null,
    } as unknown as World

    expect(getCurrentScenarioId(world)).toBe('tutorial')
  })
})
