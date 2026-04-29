import { castDraft } from 'immer'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { advanceClock, setSpeed as engineSetSpeed } from '@/engine/clock'
import type { ClockState } from '@/engine/clock'
import { createWorldFromM1Data, loadM1Data } from '@/engine/world'
import type {
  ArmyId,
  GameEvent,
  Order,
  RealmId,
  SiteId,
  SpeedTier,
  World,
} from '~/shared/types'

// Vite 注入的 import.meta.env 类型增强（避免依赖 vite/client 全局类型）

interface GameState {
  world: World
  clockState: ClockState
  events: readonly GameEvent[]
  playerRealmId: RealmId
  selectedArmyId: ArmyId | null
  contextMenu: { siteId: SiteId; x: number; y: number } | null
  activePanel: 'wanggong' | 'junshi' | null
  transientBanner: { text: string; createdAt: number } | null
}

interface GameActions {
  tick: (deltaMs: number) => void
  setSpeed: (speed: SpeedTier) => void
  reset: () => void
  selectArmy: (armyId: ArmyId) => void
  clearSelection: () => void
  openContextMenu: (payload: { siteId: SiteId; x: number; y: number }) => void
  closeContextMenu: () => void
  setActivePanel: (panel: 'wanggong' | 'junshi' | null) => void
  issueOrder: (order: Order) => void
  showBanner: (text: string) => void
}

type GameStore = GameState & GameActions

export type GameStoreState = GameStore

type StoreSet = (updater: (state: GameStore) => void) => void

function createCoreActions(set: StoreSet): Pick<GameActions, 'tick' | 'setSpeed' | 'reset'> {
  return {
    tick: (deltaMs: number) =>
      set((state) => {
        const result = advanceClock(state.clockState, deltaMs, state.world)
        state.world = castDraft(result.nextWorld)
        state.clockState = result.clockState
        state.events = castDraft(result.events)
      }),
    setSpeed: (speed: SpeedTier) =>
      set((state) => {
        state.clockState = engineSetSpeed(state.clockState, speed)
      }),
    reset: () =>
      set((state) => {
        const fresh = makeInitialState()
        state.world = castDraft(fresh.world)
        state.clockState = fresh.clockState
        state.events = castDraft(fresh.events)
        state.playerRealmId = fresh.playerRealmId
        state.selectedArmyId = fresh.selectedArmyId
        state.contextMenu = fresh.contextMenu
        state.activePanel = fresh.activePanel
        state.transientBanner = fresh.transientBanner
      }),
  }
}

function createSelectionActions(set: StoreSet): Pick<GameActions, 'selectArmy' | 'clearSelection'> {
  return {
    selectArmy: (armyId: ArmyId) =>
      set((state) => {
        state.selectedArmyId = armyId
      }),
    clearSelection: () =>
      set((state) => {
        state.selectedArmyId = null
      }),
  }
}

function createUiActions(
  set: StoreSet,
): Pick<GameActions, 'openContextMenu' | 'closeContextMenu' | 'setActivePanel'> {
  return {
    openContextMenu: (payload: { siteId: SiteId; x: number; y: number }) =>
      set((state) => {
        state.contextMenu = payload
      }),
    closeContextMenu: () =>
      set((state) => {
        state.contextMenu = null
      }),
    setActivePanel: (panel: 'wanggong' | 'junshi' | null) =>
      set((state) => {
        state.activePanel = panel
      }),
  }
}

function createWorldActions(set: StoreSet): Pick<GameActions, 'issueOrder' | 'showBanner'> {
  return {
    issueOrder: (order: Order) =>
      set((state) => {
        state.world = castDraft({
          ...state.world,
          pendingOrders: [...state.world.pendingOrders, order],
        })
      }),
    showBanner: (text: string) =>
      set((state) => {
        state.transientBanner = {
          text,
          createdAt: state.world.tick,
        }
      }),
  }
}

function makeInitialState(): GameState {
  const data = loadM1Data()
  const playerRealmId = 'realm_qin'
  return {
    world: createWorldFromM1Data(data, 42, playerRealmId),
    clockState: { speed: 'pause', realTimeAccum: 0 },
    events: [],
    playerRealmId,
    selectedArmyId: null,
    contextMenu: null,
    activePanel: null,
    transientBanner: null,
  }
}

/**
 * Zustand 桥接 store：
 * - 持有 World + ClockState + 最近一次 events
 * - actions 委托给纯函数 engine（advanceClock / setSpeed）
 * - immer 中间件让我们以可变写法替换整字段（World 引用本身仍由 engine 重新构造）
 */
export const useGameStore = create<GameStore>()(
  immer((set) => ({
    ...makeInitialState(),
    ...createCoreActions(set),
    ...createSelectionActions(set),
    ...createUiActions(set),
    ...createWorldActions(set),
  })),
)

// DEV-only 调试钩子（Playwright E2E 通过 window.__game.world() 读取）
// 仅在浏览器 + Vite DEV 时挂载；jsdom 测试环境一般不会触发
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  ;(window as Window & { __game?: unknown }).__game = {
    store: useGameStore,
    world: () => useGameStore.getState().world,
  }
}
