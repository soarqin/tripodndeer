import { beforeEach, describe, expect, it } from 'vitest'
import { useGameStore } from '../game-store'
import {
  selectActivePanel,
  selectAllPlayerArmies,
  selectContextMenu,
  selectIdlePlayerArmies,
  selectPlayerRealm,
  selectSelectedArmy,
  selectTransientBanner,
} from '../selectors'

beforeEach(() => {
  useGameStore.getState().reset()
})

describe('store tick at 1x speed', () => {
  it('advances world by one tick for 5500ms with 500ms residual accumulator', () => {
    const initial = useGameStore.getState()
    initial.setSpeed('1x')
    initial.tick(5500)

    const next = useGameStore.getState()
    expect(next.world.tick).toBe(1)
    expect(next.clockState.realTimeAccum).toBe(500)
  })
})

describe('store setSpeed', () => {
  it('resets realTimeAccum to 0 and stores new speed when changing speed mid-cycle', () => {
    const store = useGameStore.getState()
    store.setSpeed('1x')
    store.tick(4000)
    expect(useGameStore.getState().clockState.realTimeAccum).toBe(4000)

    useGameStore.getState().setSpeed('5x')
    const after = useGameStore.getState()
    expect(after.clockState.realTimeAccum).toBe(0)
    expect(after.clockState.speed).toBe('5x')
  })
})

describe('store reset', () => {
  it('returns world.tick to 0 and speed to pause after running ticks', () => {
    const store = useGameStore.getState()
    store.setSpeed('5x')
    store.tick(10000)
    expect(useGameStore.getState().world.tick).toBeGreaterThan(0)

    useGameStore.getState().reset()
    const after = useGameStore.getState()
    expect(after.world.tick).toBe(0)
    expect(after.clockState.speed).toBe('pause')
    expect(after.clockState.realTimeAccum).toBe(0)
  })
})

describe('store pause speed', () => {
  it('does not advance world.tick or accumulate time while paused', () => {
    useGameStore.getState().tick(60000)

    const state = useGameStore.getState()
    expect(state.world.tick).toBe(0)
    expect(state.clockState.realTimeAccum).toBe(0)
    expect(state.clockState.speed).toBe('pause')
  })
})

describe('store consecutive ticks', () => {
  it('accumulates partial deltas across multiple tick calls at 1x speed', () => {
    const store = useGameStore.getState()
    store.setSpeed('1x')

    store.tick(2000)
    expect(useGameStore.getState().world.tick).toBe(0)
    expect(useGameStore.getState().clockState.realTimeAccum).toBe(2000)

    useGameStore.getState().tick(3500)
    const after = useGameStore.getState()
    expect(after.world.tick).toBe(1)
    expect(after.clockState.realTimeAccum).toBe(500)
  })
})

describe('ui store selection actions', () => {
  it('selectArmy sets selectedArmyId', () => {
    const armyId = [...useGameStore.getState().world.armies.keys()][0]!
    useGameStore.getState().selectArmy(armyId)

    expect(useGameStore.getState().selectedArmyId).toBe(armyId)
  })

  it('clearSelection clears selectedArmyId', () => {
    const armyId = [...useGameStore.getState().world.armies.keys()][0]!
    useGameStore.getState().selectArmy(armyId)
    useGameStore.getState().clearSelection()

    expect(useGameStore.getState().selectedArmyId).toBeNull()
  })
})

describe('ui store context menu actions', () => {
  it('openContextMenu sets contextMenu with correct coords', () => {
    const payload = { siteId: [...useGameStore.getState().world.sites.keys()][0]!, x: 120, y: 240 }
    useGameStore.getState().openContextMenu(payload)

    expect(selectContextMenu(useGameStore.getState())).toEqual(payload)
  })

  it('closeContextMenu clears contextMenu', () => {
    const payload = { siteId: [...useGameStore.getState().world.sites.keys()][0]!, x: 120, y: 240 }
    useGameStore.getState().openContextMenu(payload)
    useGameStore.getState().closeContextMenu()

    expect(useGameStore.getState().contextMenu).toBeNull()
  })
})

describe('ui store panel and banner actions', () => {
  it('setActivePanel sets activePanel', () => {
    useGameStore.getState().setActivePanel('junshi')

    expect(selectActivePanel(useGameStore.getState())).toBe('junshi')
  })

  it('showBanner sets transientBanner with text', () => {
    const state = useGameStore.getState()
    state.showBanner('hello banner')

    expect(selectTransientBanner(useGameStore.getState())).toEqual({
      text: 'hello banner',
      createdAt: useGameStore.getState().world.tick,
    })
  })
})

describe('ui store order actions', () => {
  it('issueOrder adds order to world.pendingOrders', () => {
    const armyId = [...useGameStore.getState().world.armies.keys()][0]!
    const targetSiteId = [...useGameStore.getState().world.sites.keys()][0]!
    const order = { type: 'march', armyId, targetSiteId } as const

    useGameStore.getState().issueOrder(order)

    expect(useGameStore.getState().world.pendingOrders).toEqual([order])
  })
})

describe('ui store army selector', () => {
  it('selectSelectedArmy returns correct army after selectArmy', () => {
    const armyId = [...useGameStore.getState().world.armies.keys()][0]!
    useGameStore.getState().selectArmy(armyId)

    expect(selectSelectedArmy(useGameStore.getState())?.id).toBe(armyId)
  })
})

describe('ui store realm selectors', () => {
  it('selectPlayerRealm returns the configured player realm', () => {
    const state = useGameStore.getState()
    const realmId = [...state.world.realms.keys()][0]!
    const testState = { ...state, playerRealmId: realmId }

    expect(selectPlayerRealm(testState)?.id).toBe(realmId)
  })

  it('selectAllPlayerArmies returns only armies for the player realm', () => {
    const state = useGameStore.getState()
    const realmId = [...state.world.realms.keys()][0]!
    const testState = { ...state, playerRealmId: realmId }

    expect(selectAllPlayerArmies(testState)).toEqual(
      [...state.world.armies.values()].filter((army) => army.realmId === realmId),
    )
  })

  it('selectIdlePlayerArmies returns only idle player armies', () => {
    const state = useGameStore.getState()
    const realmId = [...state.world.realms.keys()][0]!
    const testState = { ...state, playerRealmId: realmId }

    expect(selectIdlePlayerArmies(testState)).toEqual(
      [...state.world.armies.values()].filter(
        (army) => army.realmId === realmId && army.state === 'idle',
      ),
    )
  })
})
