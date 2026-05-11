import type { GameEvent, RNGState, TutorialStepId, World } from '~/shared/types'
import { TUTORIAL_STEPS } from '~/content/m10_3/tutorial-steps'
import { evaluateStepPredicate } from './predicate'

export function tutorialPhase(
  world: World,
  rng: RNGState,
): { world: World; nextRng: RNGState; events: readonly GameEvent[] } {
  if (world.scenarioId !== 'tutorial' || world.tutorialState === null) {
    return { world, nextRng: rng, events: [] }
  }

  const tutorialState = world.tutorialState
  const completedSteps = new Set(tutorialState.completedSteps)
  const events: GameEvent[] = []

  for (const step of TUTORIAL_STEPS) {
    if (completedSteps.has(step.id)) continue
    if (!evaluateStepPredicate(world, step.id)) continue

    completedSteps.add(step.id)
    events.push({ type: 'TUTORIAL_STEP_COMPLETE', payload: { stepId: step.id } })
  }

  if (events.length === 0) {
    return { world, nextRng: rng, events: [] }
  }

  const nextStep = [...TUTORIAL_STEPS]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .find((step) => !completedSteps.has(step.id)) ?? null

  if (nextStep === null) {
    events.push({ type: 'TUTORIAL_COMPLETE', payload: {} })
  }

  return {
    world: {
      ...world,
      tutorialState: {
        ...tutorialState,
        completedSteps: completedSteps as ReadonlySet<TutorialStepId>,
        currentStep: nextStep?.id ?? null,
      },
    },
    nextRng: rng,
    events,
  }
}
