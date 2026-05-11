import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useTutorialCoordinator } from '../use-tutorial-coordinator'
import { useGameStore } from '@/ui/store'
import type { ScenarioId, Site, World } from '~/shared/types'
import type { TutorialState, TutorialStepId } from '~/shared/types/tutorial'

function makeSite(id: string): Site {
  return {
    id,
    name: id,
    position: [0, 0],
    boundary: [],
    ownerId: null,
    polygon: [],
    adjacency: [],
    economy: {
      population: 0,
      households: 0,
      taxBase: 0,
      foodProduction: 0,
    },
  }
}

function makeTutorialState(
  completedSteps: readonly TutorialStepId[] = [],
  dismissedStepHints: readonly TutorialStepId[] = [],
): TutorialState {
  return {
    currentStep: null,
    completedSteps: new Set(completedSteps),
    startedAt: { yearBC: 316, season: 'spring', month: 1, xun: 'shang' },
    dismissedStepHints: new Set(dismissedStepHints),
    panelsOpened: new Set(),
    timeoutHintShown: false,
  }
}

function makeWorld(scenarioId: ScenarioId, tutorialState: TutorialState | null): World {
  return {
    date: { yearBC: 316, season: 'spring', month: 1, xun: 'shang' },
    tick: 0,
    sites: new Map(Array.from({ length: scenarioId === 'm9' ? 250 : 5 }, (_, index) => [`site_${index}`, makeSite(`site_${index}`)])),
    realms: new Map(),
    armies: new Map(),
    edges: new Map(),
    wars: new Map(),
    peaceProposals: new Map(),
    relations: new Map(),
    diplomaticProposals: new Map(),
    treaties: new Map(),
    diplomacyHistory: [],
    coalitions: new Map(),
    zhouInvestiture: new Map(),
    generals: new Map(),
    rulers: new Map(),
    academies: new Map(),
    eventChainStates: new Map(),
    reformStates: new Map(),
    disasterStates: new Map(),
    tradeRoutes: new Map(),
    factionInfluences: new Map(),
    passes: new Map(),
    adjacencyEdges: new Map(),
    sieges: new Map(),
    edicts: new Map(),
    governorAssignments: new Map(),
    intelligenceCoverage: new Map(),
    spyMissions: new Map(),
    counterIntelStates: new Map(),
    provinces: new Map(),
    regions: new Map(),
    characterTemplates: new Map(),
    localization: new Map(),
    aiState: new Map(),
    difficulty: 'hero',
    diplomaticMemory: new Map(),
    playerRealmId: 'realm_qin',
    scenarioId,
    tutorialState,
    rngState: { seed: 42, counter: 0 },
    phases: [],
    pendingOrders: [],
  }
}

function setReadyWorld(world: World): void {
  useGameStore.setState({
    world,
    playerRealmId: world.playerRealmId,
    bootStatus: 'ready',
    modalQueue: [],
    activePanel: null,
    selectedCodexEntryId: null,
  })
}

async function expectQueuedModal(testId: string): Promise<void> {
  await waitFor(() => {
    expect(useGameStore.getState().modalQueue[0]?.testId).toBe(testId)
  })
}

describe('useTutorialCoordinator', () => {
  beforeEach(() => {
    setReadyWorld(makeWorld('m1', null))
  })

  it('does not queue a modal for M1 worlds', () => {
    renderHook(() => useTutorialCoordinator())

    expect(useGameStore.getState().modalQueue).toHaveLength(0)
  })

  it('queues the first step hint on initial tutorial load', async () => {
    setReadyWorld(makeWorld('tutorial', makeTutorialState()))

    renderHook(() => useTutorialCoordinator())

    await expectQueuedModal('tutorial-hint-modal-panel-tour')
  })

  it('queues the second step hint after the first step is complete', async () => {
    setReadyWorld(makeWorld('tutorial', makeTutorialState(['panel-tour'])))

    renderHook(() => useTutorialCoordinator())

    await expectQueuedModal('tutorial-hint-modal-diplomacy-ju')
  })

  it('does not re-queue an already dismissed hint', () => {
    setReadyWorld(makeWorld('tutorial', makeTutorialState([], ['panel-tour'])))

    renderHook(() => useTutorialCoordinator())

    expect(useGameStore.getState().modalQueue).toHaveLength(0)
  })

  it('does not queue a modal when all tutorial steps are complete', () => {
    setReadyWorld(makeWorld('tutorial', makeTutorialState([
      'panel-tour',
      'diplomacy-ju',
      'declare-march',
      'siege-capture',
      'peace-annex',
    ])))

    renderHook(() => useTutorialCoordinator())

    expect(useGameStore.getState().modalQueue).toHaveLength(0)
  })

  it('dismiss action records dismissed step hints immutably', async () => {
    setReadyWorld(makeWorld('tutorial', makeTutorialState()))
    renderHook(() => useTutorialCoordinator())
    await expectQueuedModal('tutorial-hint-modal-panel-tour')

    const beforeDismiss = useGameStore.getState().world.tutorialState
    const dismissAction = useGameStore.getState().modalQueue[0]?.actions.find((action) => action.id === 'dismiss')
    expect(dismissAction).toBeDefined()

    act(() => {
      dismissAction?.onClick()
    })

    const afterDismiss = useGameStore.getState().world.tutorialState
    expect(afterDismiss?.dismissedStepHints.has('panel-tour')).toBe(true)
    expect(afterDismiss?.dismissedStepHints).not.toBe(beforeDismiss?.dismissedStepHints)
    expect(useGameStore.getState().modalQueue).toHaveLength(0)
  })
})
