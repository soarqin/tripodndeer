import { beforeEach, describe, expect, it } from 'vitest'
import { useGameStore } from '../game-store'

beforeEach(() => {
  useGameStore.getState().reset()
})

describe('bootStatus default', () => {
  it('defaults to pending in fresh store after reset', () => {
    expect(useGameStore.getState().bootStatus).toBe('pending')
  })
})

describe('loadWorld action', () => {
  it('loadWorld("m1") sets bootStatus to ready and produces a 50-site world', async () => {
    await useGameStore.getState().loadWorld('m1')

    const state = useGameStore.getState()
    expect(state.bootStatus).toBe('ready')
    expect(state.world.sites.size).toBe(50)
    expect(state.playerRealmId).toBe('realm_qin')
  })

  it('loadWorld("m9") sets bootStatus to ready and produces a 250-site world', async () => {
    await useGameStore.getState().loadWorld('m9')

    const state = useGameStore.getState()
    expect(state.bootStatus).toBe('ready')
    expect(state.world.sites.size).toBe(250)
    expect(state.playerRealmId).toBe('realm_qin')
  })

  it('clears UI selection state when switching scenarios', async () => {
    await useGameStore.getState().loadWorld('m1')

    const armyId = [...useGameStore.getState().world.armies.keys()][0]!
    useGameStore.getState().selectArmy(armyId)
    useGameStore.getState().setActivePanel('junshi')
    useGameStore.getState().showBanner('hello')
    expect(useGameStore.getState().selectedArmyId).toBe(armyId)
    expect(useGameStore.getState().activePanel).toBe('junshi')
    expect(useGameStore.getState().transientBanner).not.toBeNull()

    await useGameStore.getState().loadWorld('m9')

    const next = useGameStore.getState()
    expect(next.selectedArmyId).toBeNull()
    expect(next.activePanel).toBeNull()
    expect(next.transientBanner).toBeNull()
    expect(next.world.sites.size).toBe(250)
  })
})

describe('resetToBootPending action', () => {
  it('moves bootStatus from ready back to pending and clears UI state', async () => {
    await useGameStore.getState().loadWorld('m1')
    expect(useGameStore.getState().bootStatus).toBe('ready')

    useGameStore.getState().setActivePanel('junshi')
    useGameStore.getState().resetToBootPending()

    const state = useGameStore.getState()
    expect(state.bootStatus).toBe('pending')
    expect(state.activePanel).toBeNull()
    expect(state.selectedArmyId).toBeNull()
  })
})

describe('replaceWorldFromSave action', () => {
  it('replaces world directly without re-running scenario factory and sets bootStatus ready', async () => {
    await useGameStore.getState().loadWorld('m1')

    const baseWorld = useGameStore.getState().world
    const savedWorld = { ...baseWorld, tick: 12345 }

    useGameStore.getState().resetToBootPending()
    expect(useGameStore.getState().bootStatus).toBe('pending')

    useGameStore.getState().replaceWorldFromSave(savedWorld)

    const state = useGameStore.getState()
    expect(state.bootStatus).toBe('ready')
    expect(state.world.tick).toBe(12345)
    expect(state.world.sites.size).toBe(50)
    expect(state.playerRealmId).toBe(savedWorld.playerRealmId)
  })
})
