import { describe, expect, it } from 'vitest'
import type { TutorialStepId } from '~/shared'
import { TUTORIAL_HINTS } from '../tutorial-hints'

describe('tutorial hint IDs uniqueness', () => {
  it('has exactly 5 tutorial hint entries', () => {
    expect(TUTORIAL_HINTS.length).toBe(5)
  })

  it('all step IDs are unique', () => {
    const stepIds = TUTORIAL_HINTS.map(hint => hint.stepId)
    expect(new Set(stepIds).size).toBe(stepIds.length)
  })

  it('all step IDs are valid TutorialStepId values', () => {
    const validStepIds = new Set<TutorialStepId>([
      'panel-tour',
      'diplomacy-ju',
      'declare-march',
      'siege-capture',
      'peace-annex',
    ])

    for (const hint of TUTORIAL_HINTS) {
      expect(validStepIds.has(hint.stepId)).toBe(true)
    }
  })
})
