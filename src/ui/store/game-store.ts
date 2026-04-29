import { castDraft } from 'immer'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { advanceClock, setSpeed as engineSetSpeed } from '@/engine/clock'
import type { ClockState } from '@/engine/clock'
import { createInitialWorld, loadM0Data } from '@/engine/world'
import type { GameEvent, SpeedTier, World } from '@/shared/types'

// Vite 注入的 import.meta.env 类型增强（避免依赖 vite/client 全局类型）

interface GameState {
  world: World
  clockState: ClockState
  events: readonly GameEvent[]
}

interface GameActions {
  tick: (deltaMs: number) => void
  setSpeed: (speed: SpeedTier) => void
  reset: () => void
}

type GameStore = GameState & GameActions

function makeInitialState(): GameState {
  const data = loadM0Data()
  return {
    world: createInitialWorld(data, 42),
    clockState: { speed: 'pause', realTimeAccum: 0 },
    events: [],
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

    tick: (deltaMs: number) =>
      set((state) => {
        const result = advanceClock(state.clockState, deltaMs, state.world)
        // World 整体由 engine 重新构造（含 ReadonlyMap），用 castDraft 跳过 immer
        // 的 WritableDraft 包装；events 同理。
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
      }),
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
