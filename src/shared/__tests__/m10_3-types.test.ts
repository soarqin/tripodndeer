import { describe, expect, it } from 'vitest'

import { saveDtoSchema, type ScenarioId, TutorialStateSchema, type TutorialHintEntry, type TutorialState, type TutorialStepEntry, type TutorialStepId } from '~/shared'

const TUTORIAL_STEP_IDS: TutorialStepId[] = ['panel-tour', 'diplomacy-ju', 'declare-march', 'siege-capture', 'peace-annex']
const SCENARIO_IDS: ScenarioId[] = ['m1', 'm9', 'tutorial']

describe('M10.3 tutorial types', () => {
  it('TutorialStepId has 5 values', () => {
    expect(TUTORIAL_STEP_IDS).toHaveLength(5)
  })

  it('ScenarioId includes tutorial', () => {
    expect(SCENARIO_IDS).toContain('tutorial')
    expect(SCENARIO_IDS).toHaveLength(3)
    expect(saveDtoSchema.shape.scenarioId.safeParse('tutorial').success).toBe(true)
  })

  it('TutorialState schema accepts the expected structure', () => {
    const state: TutorialState = {
      currentStep: 'panel-tour',
      completedSteps: new Set(['panel-tour']),
      startedAt: { yearBC: 260, season: 'spring', month: 1, xun: 'shang' },
      dismissedStepHints: new Set(['panel-tour']),
      panelsOpened: new Set(['realm', 'army']),
      timeoutHintShown: false,
    }

    expect(TutorialStateSchema.safeParse(state).success).toBe(true)
  })

  it('TutorialStepEntry matches the contract shape', () => {
    const entry: TutorialStepEntry = {
      id: 'diplomacy-ju',
      titleZH: '外交',
      descriptionZH: '完成外交面板操作。',
      completionPredicateId: 'tutorial.diplomacyJu.complete',
      orderIndex: 2,
    }

    expect(entry.orderIndex).toBe(2)
  })

  it('TutorialHintEntry matches the contract shape', () => {
    const hint: TutorialHintEntry = {
      stepId: 'peace-annex',
      titleZH: '议和',
      bodyZH: '完成议和后可继续推进教程。',
      codexEntryId: 'tutorial-peace',
    }

    expect(hint.codexEntryId).toBe('tutorial-peace')
  })
})
