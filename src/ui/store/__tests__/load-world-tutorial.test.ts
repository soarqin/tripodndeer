import { beforeEach, describe, expect, it } from 'vitest'
import { saveDtoToWorld, worldToSaveDTO } from '~/engine/world/save-dto'
import { useGameStore } from '../game-store'

beforeEach(() => {
  useGameStore.getState().reset()
})

describe('tutorial loadWorld action', () => {
  it('loadWorld("tutorial") sets bootStatus ready and loads tutorial scenario', async () => {
    await useGameStore.getState().loadWorld('tutorial')

    const state = useGameStore.getState()
    expect(state.bootStatus).toBe('ready')
    expect(state.world.scenarioId).toBe('tutorial')
    expect(state.world.tutorialState?.currentStep).toBe('panel-tour')
    expect(state.playerRealmId).toBe('realm_qin_tutorial')
  })

  it('ignores requested difficulty because tutorial factory forces weak', async () => {
    await useGameStore.getState().loadWorld('tutorial', 'hegemon')

    expect(useGameStore.getState().world.difficulty).toBe('weak')
  })

  it('replaceWorldFromSave restores tutorial state from SaveDTO round trip', async () => {
    await useGameStore.getState().loadWorld('tutorial')

    const tutorialWorld = useGameStore.getState().world
    const tutorialState = tutorialWorld.tutorialState
    expect(tutorialState).not.toBeNull()
    if (!tutorialState) return

    const saved = worldToSaveDTO({
      ...tutorialWorld,
      tick: 7,
      tutorialState: {
        ...tutorialState,
        currentStep: 'diplomacy-ju',
        completedSteps: new Set(['panel-tour']),
        dismissedStepHints: new Set(['diplomacy-ju']),
        panelsOpened: new Set(['diplomacy']),
      },
    }, 'm1', {
      seenHints: useGameStore.getState().seenHints,
      hintsEnabled: useGameStore.getState().hintsEnabled,
    })
    const restored = saveDtoToWorld(saved)
    expect(restored.ok).toBe(true)
    if (!restored.ok) return

    useGameStore.getState().resetToBootPending()
    useGameStore.getState().replaceWorldFromSave(restored.value)

    const state = useGameStore.getState()
    expect(state.bootStatus).toBe('ready')
    expect(state.world.scenarioId).toBe('tutorial')
    expect(state.world.tick).toBe(7)
    expect(state.world.tutorialState?.currentStep).toBe('diplomacy-ju')
    expect(state.world.tutorialState?.completedSteps.has('panel-tour')).toBe(true)
    expect(state.world.tutorialState?.dismissedStepHints.has('diplomacy-ju')).toBe(true)
    expect(state.world.tutorialState?.panelsOpened.has('diplomacy')).toBe(true)
  })
})
