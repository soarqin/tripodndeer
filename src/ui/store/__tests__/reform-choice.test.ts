import { beforeEach, describe, expect, it } from 'vitest'
import { castDraft } from 'immer'

import { useGameStore } from '../game-store'
import { selectActiveReformForPlayerRealm } from '../selectors'
import { reformPhase } from '~/engine/systems/reform'
import type { General, ReformState, World } from '~/shared/types'

beforeEach(() => {
  useGameStore.getState().reset()
})

function injectReformState(world: World, realmId: string, reformState: ReformState): World {
  const reformStates = new Map(world.reformStates)
  reformStates.set(realmId, reformState)
  return { ...world, reformStates }
}

function pickPlayerRealmId(): string {
  return useGameStore.getState().playerRealmId
}

function pickAIRealmId(): string {
  const { world, playerRealmId } = useGameStore.getState()
  for (const realmId of world.realms.keys()) {
    if (realmId !== playerRealmId) return realmId
  }
  throw new Error('no AI realm found in test fixture')
}

function makeInProgressReformState(realmId: string, reformId: string, stageId: string, tick: number): ReformState {
  return {
    realmId,
    reformId,
    currentStageId: stageId,
    startedAtTick: tick,
    stageEnteredAtTick: tick,
    status: 'in_progress',
    choiceHistory: [],
  }
}

describe('store.applyReformChoice', () => {
  it('player realm: invoking applyReformChoice advances the stage', () => {
    const playerRealmId = pickPlayerRealmId()
    const reformState = makeInProgressReformState(playerRealmId, 'reform_hu_fu_qi_she', 'wuling_proposal', 0)

    useGameStore.setState((state) => {
      state.world = castDraft({
        ...injectReformState(state.world, playerRealmId, reformState),
        tick: state.world.tick + 36,
      })
    })

    useGameStore.getState().applyReformChoice(playerRealmId, 'reform_hu_fu_qi_she', 'decree')

    const next = useGameStore.getState().world.reformStates.get(playerRealmId)
    expect(next?.choiceHistory.length).toBe(1)
    expect(next?.choiceHistory[0]?.choiceId).toBe('decree')
    expect(next?.currentStageId).toBe('court_debate')
  })

  it('invalid choiceId is no-op (no throw, state unchanged)', () => {
    const playerRealmId = pickPlayerRealmId()
    const reformState = makeInProgressReformState(playerRealmId, 'reform_hu_fu_qi_she', 'wuling_proposal', 0)

    useGameStore.setState((state) => {
      state.world = castDraft(injectReformState(state.world, playerRealmId, reformState))
    })

    expect(() => {
      useGameStore.getState().applyReformChoice(playerRealmId, 'reform_hu_fu_qi_she', 'no_such_choice')
    }).not.toThrow()

    const next = useGameStore.getState().world.reformStates.get(playerRealmId)
    expect(next?.choiceHistory.length).toBe(0)
    expect(next?.currentStageId).toBe('wuling_proposal')
  })

  it('invalid reformId is no-op (no throw, state unchanged)', () => {
    const playerRealmId = pickPlayerRealmId()
    const reformState = makeInProgressReformState(playerRealmId, 'reform_hu_fu_qi_she', 'wuling_proposal', 0)

    useGameStore.setState((state) => {
      state.world = castDraft(injectReformState(state.world, playerRealmId, reformState))
    })

    expect(() => {
      useGameStore.getState().applyReformChoice(playerRealmId, 'reform_does_not_exist', 'adopt')
    }).not.toThrow()

    const next = useGameStore.getState().world.reformStates.get(playerRealmId)
    expect(next?.choiceHistory.length).toBe(0)
  })
})

describe('player gate: reform-phase does not auto-advance for player realm', () => {
  it('player realm reform stays at current stage after 12 months elapsed', () => {
    const playerRealmId = pickPlayerRealmId()
    const reformState = makeInProgressReformState(playerRealmId, 'reform_hu_fu_qi_she', 'wuling_proposal', 0)

    useGameStore.setState((state) => {
      state.world = castDraft(injectReformState(state.world, playerRealmId, reformState))
    })

    const start = useGameStore.getState().world
    const advancedTick = start.tick + 36
    const advancedWorld: World = { ...start, tick: advancedTick, date: { ...start.date, yearBC: start.date.yearBC - 1 } }
    const result = reformPhase(advancedWorld, advancedWorld.rngState)

    const next = result.world.reformStates.get(playerRealmId)
    expect(next?.currentStageId).toBe('wuling_proposal')
    expect(next?.choiceHistory.length).toBe(0)
    expect(next?.status).toBe('in_progress')
  })

  it('AI realm reform auto-advances after threshold (existing behavior preserved)', () => {
    const aiRealmId = pickAIRealmId()
    const reformState = makeInProgressReformState(aiRealmId, 'reform_hu_fu_qi_she', 'wuling_proposal', 0)
    const reformer: General = {
      id: `gen_reformer_${aiRealmId}`,
      realmId: aiRealmId,
      name: 'Test Reformer',
      might: 50,
      command: 50,
      loyalty: 80,
      specialty: 'reformer',
    }

    useGameStore.setState((state) => {
      const generals = new Map<string, General>(state.world.generals)
      generals.set(reformer.id, reformer)
      const world: World = { ...state.world, generals }
      state.world = castDraft(injectReformState(world, aiRealmId, reformState))
    })

    const start = useGameStore.getState().world
    const advancedTick = start.tick + 36
    const advancedWorld: World = { ...start, tick: advancedTick, date: { ...start.date, yearBC: start.date.yearBC - 1 } }
    const result = reformPhase(advancedWorld, advancedWorld.rngState)

    const next = result.world.reformStates.get(aiRealmId)
    expect(next?.choiceHistory.length).toBeGreaterThan(0)
  })
})

describe('selectActiveReformForPlayerRealm', () => {
  it('returns null when player has no active reform', () => {
    expect(selectActiveReformForPlayerRealm(useGameStore.getState())).toBeNull()
  })

  it('returns reform definition + current stage when player has in-progress reform', () => {
    const playerRealmId = pickPlayerRealmId()
    const reformState = makeInProgressReformState(playerRealmId, 'reform_hu_fu_qi_she', 'wuling_proposal', 0)

    useGameStore.setState((state) => {
      state.world = castDraft({
        ...injectReformState(state.world, playerRealmId, reformState),
        tick: state.world.tick + 36,
      })
    })

    const result = selectActiveReformForPlayerRealm(useGameStore.getState())
    expect(result).not.toBeNull()
    expect(result?.reform.id).toBe('reform_hu_fu_qi_she')
    expect(result?.currentStage.id).toBe('wuling_proposal')
  })

  it('returns null when reform status is not in_progress', () => {
    const playerRealmId = pickPlayerRealmId()
    const reformState: ReformState = {
      ...makeInProgressReformState(playerRealmId, 'reform_hu_fu_qi_she', 'wuling_proposal', 0),
      status: 'completed_success',
    }

    useGameStore.setState((state) => {
      state.world = castDraft(injectReformState(state.world, playerRealmId, reformState))
    })

    expect(selectActiveReformForPlayerRealm(useGameStore.getState())).toBeNull()
  })
})
