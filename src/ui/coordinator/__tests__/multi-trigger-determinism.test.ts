import { describe, expect, it } from 'vitest'
import type { World } from '~/shared/types'

describe('pass arrival determinism', () => {
  it('getCurrentScenarioId is deterministic for same input', async () => {
    const { getCurrentScenarioId } = await import('../use-hint-coordinator')
    const world = {
      sites: new Map(Array.from({ length: 250 }, (_, index) => [`site_${index}`, {}])),
      scenarioId: 'm9',
      tutorialState: null,
    } as unknown as World

    expect(getCurrentScenarioId(world)).toBe('m9')
    expect(getCurrentScenarioId(world)).toBe('m9')
  })
})
