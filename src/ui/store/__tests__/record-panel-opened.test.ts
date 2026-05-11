import { beforeEach, describe, expect, it } from 'vitest'
import { useGameStore } from '../game-store'

beforeEach(() => {
  useGameStore.getState().reset()
})

describe('recordPanelOpened action', () => {
  it('records panel in tutorial world (panelsOpened.has stays true after dispatch)', async () => {
    await useGameStore.getState().loadWorld('tutorial')

    useGameStore.getState().recordPanelOpened('realm')

    const state = useGameStore.getState()
    expect(state.world.tutorialState?.panelsOpened.has('realm')).toBe(true)
    expect(state.world.tutorialState?.panelsOpened.size).toBe(1)
  })

  it('is a no-op for non-tutorial scenarios (m1 world stays unchanged)', async () => {
    await useGameStore.getState().loadWorld('m1')

    const worldBefore = useGameStore.getState().world
    expect(worldBefore.tutorialState).toBeNull()

    useGameStore.getState().recordPanelOpened('realm')

    const worldAfter = useGameStore.getState().world
    expect(worldAfter).toBe(worldBefore)
    expect(worldAfter.tutorialState).toBeNull()
  })

  it('is idempotent: dispatching the same panelId twice does not grow the Set', async () => {
    await useGameStore.getState().loadWorld('tutorial')

    useGameStore.getState().recordPanelOpened('army')
    const worldAfterFirst = useGameStore.getState().world
    expect(worldAfterFirst.tutorialState?.panelsOpened.size).toBe(1)

    useGameStore.getState().recordPanelOpened('army')
    const worldAfterSecond = useGameStore.getState().world

    expect(worldAfterSecond.tutorialState?.panelsOpened.size).toBe(1)
    expect(worldAfterSecond).toBe(worldAfterFirst)
  })

  it('accumulates distinct panelIds across 3 dispatches (realm + army + diplomacy)', async () => {
    await useGameStore.getState().loadWorld('tutorial')

    useGameStore.getState().recordPanelOpened('realm')
    useGameStore.getState().recordPanelOpened('army')
    useGameStore.getState().recordPanelOpened('diplomacy')

    const opened = useGameStore.getState().world.tutorialState?.panelsOpened
    expect(opened?.size).toBe(3)
    expect(opened?.has('realm')).toBe(true)
    expect(opened?.has('army')).toBe(true)
    expect(opened?.has('diplomacy')).toBe(true)
  })
})
