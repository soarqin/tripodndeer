import { useEffect, useMemo, useRef } from 'react'
import { TUTORIAL_HINTS } from '@/content/m10_3/tutorial-hints'
import { TUTORIAL_STEPS } from '@/content/m10_3/tutorial-steps'
import { buildTutorialHintPayload } from '@/ui/components/HintModal/buildTutorialHintPayload'
import { buildTutorialCompletePayload } from '@/ui/components/TutorialCompleteModal'
import { useGameStore } from '@/ui/store'
import type { TutorialState, TutorialStepId } from '~/shared/types/tutorial'

const ORDERED_TUTORIAL_STEPS = [...TUTORIAL_STEPS].sort((a, b) => {
  const orderDelta = a.orderIndex - b.orderIndex
  return orderDelta === 0 ? a.id.localeCompare(b.id) : orderDelta
})

function setKey(values: ReadonlySet<TutorialStepId>): string {
  return [...values].sort((a, b) => a.localeCompare(b)).join('|')
}

export function getNextTutorialHintStepId(tutorialState: TutorialState): TutorialStepId | null {
  const nextStep = ORDERED_TUTORIAL_STEPS.find((step) => !tutorialState.completedSteps.has(step.id))
  if (!nextStep) return null
  if (tutorialState.dismissedStepHints.has(nextStep.id)) return null
  return nextStep.id
}

export function useTutorialCoordinator(): void {
  const world = useGameStore((state) => state.world)
  const bootStatus = useGameStore((state) => state.bootStatus)
  const openModal = useGameStore((state) => state.openModal)
  const closeModal = useGameStore((state) => state.closeModal)
  const openCodex = useGameStore((state) => state.openCodex)
  const dismissTutorialHint = useGameStore((state) => state.dismissTutorialHint)
  const resetToBootPending = useGameStore((state) => state.resetToBootPending)
  const queuedStepIdsRef = useRef<Set<TutorialStepId>>(new Set())
  const completeModalQueuedRef = useRef(false)

  const completedStepsKey = useMemo(
    () => (world.tutorialState ? setKey(world.tutorialState.completedSteps) : ''),
    [world.tutorialState],
  )
  const dismissedStepHintsKey = useMemo(
    () => (world.tutorialState ? setKey(world.tutorialState.dismissedStepHints) : ''),
    [world.tutorialState],
  )

  useEffect(() => {
    if (bootStatus !== 'ready') return
    if (world.scenarioId !== 'tutorial') return
    if (world.tutorialState === null) return

    const stepId = getNextTutorialHintStepId(world.tutorialState)
    if (stepId === null) return
    if (queuedStepIdsRef.current.has(stepId)) return

    const hint = [...TUTORIAL_HINTS]
      .sort((a, b) => a.stepId.localeCompare(b.stepId))
      .find((entry) => entry.stepId === stepId)
    if (!hint) return

    queuedStepIdsRef.current.add(stepId)

    openModal(buildTutorialHintPayload(
      hint,
      () => {
        dismissTutorialHint(stepId)
        closeModal()
        if (hint.codexEntryId) openCodex(hint.codexEntryId)
      },
      () => {
        dismissTutorialHint(stepId)
        closeModal()
      },
    ))
  }, [bootStatus, closeModal, completedStepsKey, dismissTutorialHint, dismissedStepHintsKey, openCodex, openModal, world])

  useEffect(() => {
    if (bootStatus !== 'ready') return
    if (world.scenarioId !== 'tutorial') return
    if (world.tutorialState === null) return
    if (completeModalQueuedRef.current) return

    const allStepsCompleted = world.tutorialState.completedSteps.size === TUTORIAL_STEPS.length
    if (world.tutorialState.currentStep === null && allStepsCompleted) {
      completeModalQueuedRef.current = true
      openModal(buildTutorialCompletePayload(
        () => {
          closeModal()
          resetToBootPending()
        },
        () => {
          closeModal()
        }
      ))
    }
  }, [bootStatus, closeModal, completedStepsKey, openModal, resetToBootPending, world])
}
