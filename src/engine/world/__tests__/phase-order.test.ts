import { describe, expect, it } from 'vitest'

import { getDefaultPhases } from '../factory'
import { tutorialPhase } from '~/engine/systems/tutorial/tutorial-phase'

describe('getDefaultPhases', () => {
  it('puts tutorialPhase last', () => {
    const phases = getDefaultPhases()

    expect(phases.at(-1)).toBe(tutorialPhase)
    // 27 existing phases + 1 tutorial phase = 28 total.
    expect(phases).toHaveLength(28)
  })
})
