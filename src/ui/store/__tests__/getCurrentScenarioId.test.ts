import { describe, expect, it } from 'vitest'
import { getCurrentScenarioId } from '@/ui/coordinator/use-hint-coordinator'
import type { World } from '~/shared/types'

function makeWorld(scenarioId: World['scenarioId']): World {
  return {
    sites: new Map(),
    scenarioId,
    tutorialState: null,
  } as unknown as World
}

describe('getCurrentScenarioId', () => {
  it('returns m1 when world.scenarioId is m1', () => {
    expect(getCurrentScenarioId(makeWorld('m1'))).toBe('m1')
  })

  it('returns m9 when world.scenarioId is m9', () => {
    expect(getCurrentScenarioId(makeWorld('m9'))).toBe('m9')
  })

  it('returns tutorial when world.scenarioId is tutorial', () => {
    expect(getCurrentScenarioId(makeWorld('tutorial'))).toBe('tutorial')
  })
})
