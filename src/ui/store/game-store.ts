import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { makeInitialState, type GameState } from './initial-state'
import { createClockSlice, type ClockActions } from './slices/clock-slice'
import { createSelectionSlice, type SelectionActions } from './slices/selection-slice'
import { createBattleSlice, type BattleActions } from './slices/battle-slice'
import { createUiSlice, type UiActions } from './slices/ui-slice'
import { createSuccessionSlice, type SuccessionActions } from './slices/succession-slice'
import { createWorldSlice, type WorldActions } from './slices/world-slice'
import { createHintSlice, type HintSlice } from './slices/hint-slice'

// Vite 注入的 import.meta.env 类型增强（避免依赖 vite/client 全局类型）

export { ModalPriority } from './slices/ui-slice'
export type { Modal, OpenModalPayload } from './slices/ui-slice'
export type {
  DiplomacyActionFeedback,
  ScenarioId,
  SubmitPlayerDiplomacyActionPayload,
  SubmitPlayerDiplomacyActionResult,
  ActivatePlayerEdictPayload,
  AssignPlayerGovernorPayload,
  AssignPlayerPostPayload,
  UnassignPlayerPostPayload,
} from './slices/world-slice'

export type GameStore = GameState
  & ClockActions
  & SelectionActions
  & BattleActions
  & UiActions
  & SuccessionActions
  & WorldActions
  & HintSlice

export type GameStoreState = GameStore

export type StoreSet = (updater: (state: GameStore) => void) => void

/**
 * Zustand 桥接 store：
 * - 持有 World + ClockState + 最近一次 events
 * - actions 委托给纯函数 engine（advanceClock / setSpeed）
 * - immer 中间件让我们以可变写法替换整字段（World 引用本身仍由 engine 重新构造）
 */
export const useGameStore = create<GameStore>()(
  immer((set, get) => ({
    ...makeInitialState(),
    ...createClockSlice(set),
    ...createSelectionSlice(set),
    ...createBattleSlice(set),
    ...createUiSlice(set),
    ...createSuccessionSlice(set),
    ...createWorldSlice(set),
    ...createHintSlice(set, get),
  })),
)

// DEV-only 调试钩子（agent-browser 通过 `agent-browser eval "window.__game.world()"` 读取）
// 仅在浏览器 + Vite DEV 时挂载；jsdom 测试环境一般不会触发
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  ;(window as Window & { __game?: unknown }).__game = {
    store: useGameStore,
    world: () => useGameStore.getState().world,
  }

  // DEV-only `?forceScenario=m1|m9` skips the ScenarioPicker and immediately loads the named scenario.
  const params = new URLSearchParams(window.location.search)
  const forceScenario = params.get('forceScenario')
  if (forceScenario === 'm1' || forceScenario === 'm9') {
    void useGameStore.getState().loadWorld(forceScenario)
  }
}
