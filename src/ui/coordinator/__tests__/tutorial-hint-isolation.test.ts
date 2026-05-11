import { describe, expect, it } from 'vitest'
import { getCurrentScenarioId } from '../use-hint-coordinator'
import type { ScenarioId, World } from '~/shared/types'

function makeWorld(scenarioId: ScenarioId, sitesCount: number): World {
  return {
    sites: new Map(Array.from({ length: sitesCount }, (_, i) => [`site_${i}`, {}])),
    scenarioId,
    tutorialState: null,
  } as unknown as World
}

describe('M10.2 tutorial hint isolation', () => {
  it('tutorial world reports scenarioId="tutorial" and fails the m9 gate', () => {
    const world = makeWorld('tutorial', 5)
    const result = getCurrentScenarioId(world)
    expect(result).toBe('tutorial')
    expect(result !== 'm9').toBe(true)
  })

  it('m9 world reports scenarioId="m9" and passes the m9 gate', () => {
    const world = makeWorld('m9', 250)
    const result = getCurrentScenarioId(world)
    expect(result).toBe('m9')
    expect(result !== 'm9').toBe(false)
  })

  it('m1 world reports scenarioId="m1" and fails the m9 gate', () => {
    const world = makeWorld('m1', 50)
    const result = getCurrentScenarioId(world)
    expect(result).toBe('m1')
    expect(result !== 'm9').toBe(true)
  })

  it('explicit tutorial scenarioId wins over the site-count fallback', () => {
    const world = makeWorld('tutorial', 250)
    expect(getCurrentScenarioId(world)).toBe('tutorial')
  })

  it('tutorial scenarioId is deterministic across repeated calls', () => {
    const world = makeWorld('tutorial', 5)
    expect(getCurrentScenarioId(world)).toBe('tutorial')
    expect(getCurrentScenarioId(world)).toBe('tutorial')
  })
})
