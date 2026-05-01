import React from 'react'
import { castDraft } from 'immer'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { advanceClock, setSpeed as engineSetSpeed } from '@/engine/clock'
import type { ClockState } from '@/engine/clock'
import { applyDiplomacyAction, relationKey, validateDiplomacyAction, type DiplomacyActionRequest, type DiplomacyValidationReason } from '~/engine/systems/diplomacy'
import { createWorldFromM1Data, loadM1Data } from '@/engine/world'
import type {
  ArmyId,
  DiplomaticActionKind,
  DiplomaticProposalId,
  EdictId,
  EdictKind,
  GameEvent,
  GeneralId,
  Order,
  RealmId,
  RelationKey,
  SiteId,
  SpeedTier,
  World,
} from '~/shared/types'

// Vite 注入的 import.meta.env 类型增强（避免依赖 vite/client 全局类型）

import type { ModalAction } from '@/ui/components/Modal'

interface GameState {
  world: World
  clockState: ClockState
  events: readonly GameEvent[]
  diplomacyFeedback: readonly DiplomacyActionFeedback[]
  playerRealmId: RealmId
  selectedArmyId: ArmyId | null
  contextMenu: { siteId: SiteId; x: number; y: number } | null
  activePanel: 'wanggong' | 'junshi' | 'neizheng' | null
  diplomacyTargetRealmId: RealmId | null
  transientBanner: { text: string; createdAt: number } | null
  modal: {
    title: string
    content: React.ReactNode
    actions: ModalAction[]
    dismissable: boolean
  } | null
}

export interface DiplomacyActionFeedback {
  readonly id: string
  readonly kind: DiplomaticActionKind
  readonly proposingRealmId: RealmId
  readonly targetRealmId: RealmId
  readonly relationKey: RelationKey
  readonly createdAtTick: number
  readonly status: 'submitted' | 'rejected'
  readonly reason: DiplomacyValidationReason | null
  readonly proposalId: DiplomaticProposalId | null
  readonly acceptanceScore: number | null
}

export type SubmitPlayerDiplomacyActionPayload = Omit<DiplomacyActionRequest, 'proposingRealmId'>

export type SubmitPlayerDiplomacyActionResult =
  | { readonly ok: true; readonly feedback: DiplomacyActionFeedback }
  | { readonly ok: false; readonly reason: DiplomacyValidationReason; readonly feedback: DiplomacyActionFeedback }

interface GameActions {
  tick: (deltaMs: number) => void
  setSpeed: (speed: SpeedTier) => void
  reset: () => void
  selectArmy: (armyId: ArmyId) => void
  clearSelection: () => void
  openContextMenu: (payload: { siteId: SiteId; x: number; y: number }) => void
  closeContextMenu: () => void
  setActivePanel: (panel: 'wanggong' | 'junshi' | 'neizheng' | null) => void
  openDiplomacyPanel: (realmId: RealmId) => void
  closeDiplomacyPanel: () => void
  issueOrder: (order: Order) => void
  activatePlayerEdict: (payload: ActivatePlayerEdictPayload) => void
  assignPlayerGovernor: (payload: AssignPlayerGovernorPayload) => void
  submitPlayerDiplomacyAction: (payload: SubmitPlayerDiplomacyActionPayload) => SubmitPlayerDiplomacyActionResult
  showBanner: (text: string) => void
  clearBanner: () => void
  openModal: (modal: { title: string; content: React.ReactNode; actions: ModalAction[]; dismissable?: boolean }) => void
  closeModal: () => void
}

export interface ActivatePlayerEdictPayload {
  readonly edictId: EdictId
  readonly kind: EdictKind
  readonly durationMonths: number
}

export interface AssignPlayerGovernorPayload {
  readonly siteId: SiteId
  readonly generalId: GeneralId
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
        state.diplomacyFeedback = castDraft(fresh.diplomacyFeedback)
        state.playerRealmId = fresh.playerRealmId
        state.selectedArmyId = fresh.selectedArmyId
        state.contextMenu = fresh.contextMenu
        state.activePanel = fresh.activePanel
        state.diplomacyTargetRealmId = fresh.diplomacyTargetRealmId
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
): Pick<GameActions, 'openContextMenu' | 'closeContextMenu' | 'setActivePanel' | 'openDiplomacyPanel' | 'closeDiplomacyPanel' | 'openModal' | 'closeModal'> {
  return {
    openContextMenu: (payload: { siteId: SiteId; x: number; y: number }) =>
      set((state) => {
        state.contextMenu = payload
      }),
    closeContextMenu: () =>
      set((state) => {
        state.contextMenu = null
      }),
    setActivePanel: (panel: 'wanggong' | 'junshi' | 'neizheng' | null) =>
      set((state) => {
        state.activePanel = panel
      }),
    openDiplomacyPanel: (realmId: RealmId) =>
      set((state) => {
        state.diplomacyTargetRealmId = realmId
      }),
    closeDiplomacyPanel: () =>
      set((state) => {
        state.diplomacyTargetRealmId = null
      }),
    openModal: (modal) =>
      set((state) => {
        state.modal = { ...modal, dismissable: modal.dismissable ?? true }
        state.clockState = engineSetSpeed(state.clockState, 'pause')
      }),
    closeModal: () =>
      set((state) => {
        state.modal = null
      }),
  }
}

function createWorldActions(
  set: StoreSet,
): Pick<GameActions, 'issueOrder' | 'activatePlayerEdict' | 'assignPlayerGovernor' | 'submitPlayerDiplomacyAction' | 'showBanner' | 'clearBanner'> {
  return {
    issueOrder: (order: Order) =>
      set((state) => {
        state.world = castDraft({
          ...state.world,
          pendingOrders: [...state.world.pendingOrders, order],
        })
      }),
    activatePlayerEdict: (payload: ActivatePlayerEdictPayload) =>
      set((state) => {
        const order: Order = {
          type: 'activate-edict',
          edictId: payload.edictId,
          realmId: state.playerRealmId,
          kind: payload.kind,
          durationMonths: payload.durationMonths,
        }
        state.world = castDraft({
          ...state.world,
          pendingOrders: [...state.world.pendingOrders, order],
        })
      }),
    assignPlayerGovernor: (payload: AssignPlayerGovernorPayload) =>
      set((state) => {
        const order: Order = {
          type: 'assign-governor',
          siteId: payload.siteId,
          generalId: payload.generalId,
        }
        state.world = castDraft({
          ...state.world,
          pendingOrders: [...state.world.pendingOrders, order],
        })
      }),
    submitPlayerDiplomacyAction: (payload: SubmitPlayerDiplomacyActionPayload) => {
      let outcome: SubmitPlayerDiplomacyActionResult | null = null

      set((state) => {
        const request: DiplomacyActionRequest = {
          ...payload,
          proposingRealmId: state.playerRealmId,
        }
        const validation = validateDiplomacyAction(state.world, request)
        const nextFeedback = createDiplomacyActionFeedback(state.world, request, state.diplomacyFeedback.length, validation)

        state.diplomacyFeedback = castDraft([...state.diplomacyFeedback, nextFeedback])

        if (!validation.ok) {
          state.events = castDraft([])
          outcome = { ok: false, reason: validation.reason, feedback: nextFeedback }
          return
        }

        const integration = applyDiplomacyAction(state.world, request)
        if (!integration.ok) {
          state.events = castDraft(integration.events)
          const rejectedFeedback: DiplomacyActionFeedback = {
            ...nextFeedback,
            status: 'rejected',
            reason: integration.reason,
          }
          state.diplomacyFeedback = castDraft([
            ...state.diplomacyFeedback.slice(0, -1),
            rejectedFeedback,
          ])
          outcome = { ok: false, reason: integration.reason, feedback: rejectedFeedback }
          return
        }

        state.world = castDraft(integration.world)
        state.events = castDraft(integration.events)
        outcome = { ok: true, feedback: nextFeedback }
      })

      return outcome!
    },
    showBanner: (text: string) =>
      set((state) => {
        state.transientBanner = {
          text,
          createdAt: state.world.tick,
        }
      }),
    clearBanner: () =>
      set((state) => {
        state.transientBanner = null
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
    diplomacyFeedback: [],
    playerRealmId,
    selectedArmyId: null,
    contextMenu: null,
    activePanel: null,
    diplomacyTargetRealmId: null,
    transientBanner: null,
    modal: null,
  }
}

function createDiplomacyActionFeedback(
  world: World,
  request: DiplomacyActionRequest,
  index: number,
  validation: ReturnType<typeof validateDiplomacyAction>,
): DiplomacyActionFeedback {
  return {
    id: `diplomacy_feedback_${world.tick}_${request.kind}_${relationKey(request.proposingRealmId, request.targetRealmId)}_${index}`,
    kind: request.kind,
    proposingRealmId: request.proposingRealmId,
    targetRealmId: request.targetRealmId,
    relationKey: relationKey(request.proposingRealmId, request.targetRealmId),
    createdAtTick: world.tick,
    status: validation.ok ? 'submitted' : 'rejected',
    reason: validation.ok ? null : validation.reason,
    proposalId: validation.ok && validation.proposalOrOrder.type === 'proposal'
      ? validation.proposalOrOrder.proposal.id
      : null,
    acceptanceScore: validation.ok ? validation.proposalOrOrder.acceptanceScore : null,
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
