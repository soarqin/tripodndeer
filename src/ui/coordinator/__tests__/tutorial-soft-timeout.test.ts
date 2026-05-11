import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useTutorialCoordinator } from '../use-tutorial-coordinator'
import { useGameStore } from '@/ui/store'
import { ModalPriority } from '@/ui/store/slices/ui-slice'
import type { GameDate, Site, World } from '~/shared/types'
import type { TutorialState, TutorialStepId } from '~/shared/types/tutorial'

const SEASON_ORDER: Record<GameDate['season'], number> = {
  spring: 0,
  summer: 1,
  autumn: 2,
  winter: 3,
}

const SEASONS: readonly GameDate['season'][] = ['spring', 'summer', 'autumn', 'winter']

function shiftDate(date: GameDate, months: number): GameDate {
  const startMonthIndex = SEASON_ORDER[date.season] * 3 + (date.month - 1)
  const totalMonths = startMonthIndex + months
  const yearBC = date.yearBC - Math.floor(totalMonths / 12)
  const monthIndex = totalMonths % 12
  const seasonIndex = Math.floor(monthIndex / 3) as 0 | 1 | 2 | 3
  const month = (monthIndex % 3) + 1

  return { yearBC, season: SEASONS[seasonIndex]!, month: month as 1 | 2 | 3, xun: date.xun }
}

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

function makeTutorialState(overrides: Partial<TutorialState> = {}): TutorialState {
  return {
    currentStep: 'panel-tour',
    completedSteps: new Set<TutorialStepId>(),
    startedAt: { yearBC: 316, season: 'spring', month: 1, xun: 'shang' },
    dismissedStepHints: new Set<TutorialStepId>(['panel-tour']),
    panelsOpened: new Set(),
    timeoutHintShown: false,
    ...overrides,
  }
}

function makeWorld(tutorialState: TutorialState | null, date: GameDate): World {
  return {
    date,
    tick: 0,
    sites: new Map(Array.from({ length: 5 }, (_, index) => [`site_${index}`, makeSite(`site_${index}`)])),
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
    scenarioId: 'tutorial',
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

async function flushEffects(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

describe('tutorial soft timeout', () => {
  beforeEach(() => {
    setReadyWorld(makeWorld(null, { yearBC: 316, season: 'spring', month: 1, xun: 'shang' }))
  })

  it('does not queue a timeout modal before 24 months', async () => {
    const world = makeWorld(makeTutorialState(), shiftDate({ yearBC: 316, season: 'spring', month: 1, xun: 'shang' }, 23))
    setReadyWorld(world)

    renderHook(() => useTutorialCoordinator())
    await flushEffects()

    expect(useGameStore.getState().modalQueue.some((modal) => modal.testId === 'tutorial-timeout-modal')).toBe(false)
  })

  it('queues the timeout modal once at 24 months', async () => {
    const world = makeWorld(makeTutorialState(), shiftDate({ yearBC: 316, season: 'spring', month: 1, xun: 'shang' }, 24))
    setReadyWorld(world)

    renderHook(() => useTutorialCoordinator())
    await waitFor(() => {
      expect(useGameStore.getState().modalQueue[0]?.testId).toBe('tutorial-timeout-modal')
    })

    expect(useGameStore.getState().modalQueue).toHaveLength(1)
    expect(useGameStore.getState().modalQueue[0]?.priority).toBe(ModalPriority.TUTORIAL_TIMEOUT)
    expect(useGameStore.getState().world.tutorialState?.timeoutHintShown).toBe(true)
  })

  it('does not re-trigger after timeoutHintShown is set', async () => {
    const world = makeWorld(makeTutorialState({ timeoutHintShown: true }), shiftDate({ yearBC: 316, season: 'spring', month: 1, xun: 'shang' }, 24))
    setReadyWorld(world)

    renderHook(() => useTutorialCoordinator())
    await flushEffects()

    expect(useGameStore.getState().modalQueue.some((modal) => modal.testId === 'tutorial-timeout-modal')).toBe(false)
  })

  it('does not trigger after the tutorial is complete', async () => {
    const world = makeWorld(makeTutorialState({ currentStep: null }), shiftDate({ yearBC: 316, season: 'spring', month: 1, xun: 'shang' }, 24))
    setReadyWorld(world)

    renderHook(() => useTutorialCoordinator())
    await flushEffects()

    expect(useGameStore.getState().modalQueue.some((modal) => modal.testId === 'tutorial-timeout-modal')).toBe(false)
  })
})
