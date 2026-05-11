import type { GameDate } from '~/shared'

export type TutorialStepId = 'panel-tour' | 'diplomacy-ju' | 'declare-march' | 'siege-capture' | 'peace-annex'
export type PanelId = 'realm' | 'army' | 'diplomacy'

export interface TutorialState {
  currentStep: TutorialStepId | null
  completedSteps: ReadonlySet<TutorialStepId>
  startedAt: GameDate
  dismissedStepHints: ReadonlySet<TutorialStepId>
  panelsOpened: ReadonlySet<PanelId>
  timeoutHintShown: boolean
}

export interface TutorialStepEntry {
  id: TutorialStepId
  titleZH: string
  descriptionZH: string
  completionPredicateId: string
  orderIndex: 1 | 2 | 3 | 4 | 5
}

export interface TutorialHintEntry {
  stepId: TutorialStepId
  titleZH: string
  bodyZH: string
  codexEntryId?: string
}
