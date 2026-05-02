import React from 'react'
import { castDraft } from 'immer'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { advanceClock, setSpeed as engineSetSpeed } from '@/engine/clock'
import type { ClockState } from '@/engine/clock'
import type { BattleResolution } from '~/engine/systems/combat-v2'
import { applyDiplomacyAction, relationKey, validateDiplomacyAction, type DiplomacyActionRequest, type DiplomacyValidationReason } from '~/engine/systems/diplomacy'
import { createWorldFromM1Data, loadM1Data } from '@/engine/world'
import { applyChoiceEffects, loadDisasterDefinitions, setDisasterState } from '~/engine/systems/disaster/disaster-phase'
import { applyReformChoice as engineApplyReformChoice, loadReformDefinitions } from '~/engine/systems/reform'
import { applyEventChainChoice as engineApplyEventChainChoice, getEventChain } from '~/engine/systems/events/event-chain-engine'
import { M5_RULER_BASE_LIFESPAN } from '~/content/m2/balance'
import { bannerTextForCriticalEvent, type CriticalEventType } from './critical-events'
import type {
  ArmyId,
  DiplomaticActionKind,
  DiplomaticProposalId,
  EdictId,
  EdictKind,
  GameEvent,
  GeneralId,
  Order,
  Realm,
  RealmId,
  ReformId,
  EventChainId,
  RelationKey,
  RulerState,
  SiteId,
  SpeedTier,
  World,
} from '~/shared/types'

// Vite 注入的 import.meta.env 类型增强（避免依赖 vite/client 全局类型）

import type { ModalAction } from '@/ui/components/Modal'

export enum ModalPriority {
  SUCCESSION_CRISIS = 100,
  EVENT_CHAIN = 80,
  REFORM_PROMPT = 60,
  DISASTER_RELIEF = 40,
  GENERIC = 20,
}

export interface Modal {
  readonly title: string
  readonly content: React.ReactNode
  readonly actions: ModalAction[]
  readonly dismissable: boolean
  readonly priority: ModalPriority
  readonly testId?: string
}

export interface OpenModalPayload {
  readonly title: string
  readonly content: React.ReactNode
  readonly actions: ModalAction[]
  readonly dismissable?: boolean
  readonly priority?: ModalPriority
  readonly testId?: string
}

interface GameState {
  world: World
  clockState: ClockState
  events: readonly GameEvent[]
  diplomacyFeedback: readonly DiplomacyActionFeedback[]
  playerRealmId: RealmId
  selectedArmyId: ArmyId | null
  lastBattleResolution: BattleResolution | null
  contextMenu: { siteId: SiteId; x: number; y: number } | null
  activePanel: 'wanggong' | 'junshi' | 'neizheng' | 'rencai' | 'waijiao' | null
  diplomacyTargetRealmId: RealmId | null
  isPeacePanelOpen: boolean
  transientBanner: { text: string; createdAt: number } | null
  modalQueue: ReadonlyArray<Modal>
  previousClockSpeed: SpeedTier
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
  setLastBattleResolution: (resolution: BattleResolution | null) => void
  clearLastBattleResolution: () => void
  openContextMenu: (payload: { siteId: SiteId; x: number; y: number }) => void
  closeContextMenu: () => void
  setActivePanel: (panel: 'wanggong' | 'junshi' | 'neizheng' | 'rencai' | 'waijiao' | null) => void
  openDiplomacyPanel: (realmId: RealmId) => void
  closeDiplomacyPanel: () => void
  openPeacePanel: () => void
  closePeacePanel: () => void
  issueOrder: (order: Order) => void
  activatePlayerEdict: (payload: ActivatePlayerEdictPayload) => void
  assignPlayerGovernor: (payload: AssignPlayerGovernorPayload) => void
  assignPlayerPost: (payload: AssignPlayerPostPayload) => void
  unassignPlayerPost: (payload: UnassignPlayerPostPayload) => void
  submitPlayerDiplomacyAction: (payload: SubmitPlayerDiplomacyActionPayload) => SubmitPlayerDiplomacyActionResult
  showBanner: (text: string) => void
  clearBanner: () => void
  openModal: (modal: OpenModalPayload) => void
  closeModal: () => void
  clearModalQueue: () => void
  resolveSuccessionForceCollateral: (realmId: RealmId, candidateId: GeneralId) => void
  resolveSuccessionFraternal: (realmId: RealmId, brotherId: GeneralId) => void
  resolveSuccessionCivilWar: (realmId: RealmId) => void
  resolveSuccessionForceVassal: (realmId: RealmId) => void
  applyDisasterChoice: (disasterId: string, choiceId: string) => void
  applyReformChoice: (realmId: RealmId, reformId: ReformId, choiceId: string) => void
  applyEventChainChoice: (chainId: EventChainId, choiceId: string) => void
  pauseOnCriticalEvent: (eventType: CriticalEventType, payload?: Record<string, unknown>) => void
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

export interface AssignPlayerPostPayload {
  readonly generalId: GeneralId
  readonly post: import('~/shared/types').Post
}

export interface UnassignPlayerPostPayload {
  readonly generalId: GeneralId
  readonly post: import('~/shared/types').Post
}

type GameStore = GameState & GameActions

export type GameStoreState = GameStore

type StoreSet = (updater: (state: GameStore) => void) => void

function getPlayerBattleResolution(events: readonly GameEvent[], playerRealmId: RealmId): BattleResolution | null {
  let latest: BattleResolution | null = null

  for (const event of events) {
    if (event.type !== 'battleResolved') continue
    if (typeof event.payload !== 'object' || event.payload === null) continue

    const payload = event.payload as {
      readonly battleResolution?: BattleResolution
      readonly attackerRealmId?: RealmId | null
      readonly defenderRealmId?: RealmId | null
    }

    if (payload.attackerRealmId === playerRealmId || payload.defenderRealmId === playerRealmId) {
      latest = payload.battleResolution ?? null
    }
  }

  return latest
}

function enqueueModal(state: GameStore, modal: OpenModalPayload): void {
  const wasEmpty = state.modalQueue.length === 0
  const queuedModal: Modal = {
    ...modal,
    dismissable: modal.dismissable ?? true,
    priority: modal.priority ?? ModalPriority.GENERIC,
  }

  const nextQueue = [...state.modalQueue]
  const insertAt = nextQueue.findIndex((entry) => entry.priority < queuedModal.priority)
  if (insertAt === -1) {
    nextQueue.push(queuedModal)
  } else {
    nextQueue.splice(insertAt, 0, queuedModal)
  }

  state.modalQueue = castDraft(nextQueue)
  if (wasEmpty) {
    state.previousClockSpeed = state.clockState.speed
    state.clockState = engineSetSpeed(state.clockState, 'pause')
  }
}

function closeQueuedModal(state: GameStore): void {
  if (state.modalQueue.length === 0) return

  const nextQueue = state.modalQueue.slice(1)
  state.modalQueue = castDraft(nextQueue)
  if (nextQueue.length === 0) {
    state.clockState = engineSetSpeed(state.clockState, state.previousClockSpeed)
  }
}

function clearQueuedModals(state: GameStore): void {
  if (state.modalQueue.length === 0) return

  state.modalQueue = []
  state.clockState = engineSetSpeed(state.clockState, state.previousClockSpeed)
}

function createCoreActions(set: StoreSet): Pick<GameActions, 'tick' | 'setSpeed' | 'reset'> {
  return {
    tick: (deltaMs: number) =>
      set((state) => {
        const result = advanceClock(state.clockState, deltaMs, state.world)
        state.world = castDraft(result.nextWorld)
        state.clockState = result.clockState
        state.events = castDraft(result.events)

        const lastBattleResolution = getPlayerBattleResolution(result.events, state.playerRealmId)
        if (lastBattleResolution !== null) {
          state.lastBattleResolution = lastBattleResolution
        }
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
        state.lastBattleResolution = fresh.lastBattleResolution
        state.contextMenu = fresh.contextMenu
        state.activePanel = fresh.activePanel
        state.diplomacyTargetRealmId = fresh.diplomacyTargetRealmId
        state.transientBanner = fresh.transientBanner
        state.modalQueue = castDraft(fresh.modalQueue)
        state.previousClockSpeed = fresh.previousClockSpeed
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

function createBattleActions(set: StoreSet): Pick<GameActions, 'setLastBattleResolution' | 'clearLastBattleResolution'> {
  return {
    setLastBattleResolution: (resolution: BattleResolution | null) =>
      set((state) => {
        state.lastBattleResolution = resolution
      }),
    clearLastBattleResolution: () =>
      set((state) => {
        state.lastBattleResolution = null
      }),
  }
}

function createUiActions(
  set: StoreSet,
): Pick<GameActions, 'openContextMenu' | 'closeContextMenu' | 'setActivePanel' | 'openDiplomacyPanel' | 'closeDiplomacyPanel' | 'openPeacePanel' | 'closePeacePanel' | 'openModal' | 'closeModal' | 'clearModalQueue'> {
  return {
    openContextMenu: (payload: { siteId: SiteId; x: number; y: number }) =>
      set((state) => {
        state.contextMenu = payload
      }),
    closeContextMenu: () =>
      set((state) => {
        state.contextMenu = null
      }),
    setActivePanel: (panel: 'wanggong' | 'junshi' | 'neizheng' | 'rencai' | 'waijiao' | null) =>
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
    openPeacePanel: () =>
      set((state) => {
        state.isPeacePanelOpen = true
      }),
    closePeacePanel: () =>
      set((state) => {
        state.isPeacePanelOpen = false
      }),
    openModal: (modal) =>
      set((state) => {
        enqueueModal(state, modal)
      }),
    closeModal: () =>
      set((state) => {
        closeQueuedModal(state)
      }),
    clearModalQueue: () =>
      set((state) => {
        clearQueuedModals(state)
      }),
  }
}

function installSuccessor(world: World, realmId: RealmId, newGeneralId: GeneralId): World {
  const rulers = new Map(world.rulers)
  const realms = new Map(world.realms)
  const generals = new Map(world.generals)

  const prevRuler = rulers.get(realmId)
  const heir = generals.get(newGeneralId)

  const successor: RulerState = {
    realmId,
    generalId: newGeneralId,
    age: heir?.age ?? 30,
    lifespan: M5_RULER_BASE_LIFESPAN,
    health: 100,
    personality: prevRuler?.personality ?? 'steward',
    successionLawId: 'primogeniture',
    inOfficeSinceTick: world.tick,
  }
  rulers.set(realmId, successor)

  const realm = realms.get(realmId)
  if (realm !== undefined) {
    const updatedRealm: Realm = { ...realm, rulerId: newGeneralId }
    realms.set(realmId, updatedRealm)
  }

  if (prevRuler !== undefined) {
    generals.delete(prevRuler.generalId)
  }

  return { ...world, rulers, realms, generals }
}

function vacateRealm(world: World, realmId: RealmId): World {
  const rulers = new Map(world.rulers)
  const realms = new Map(world.realms)
  const generals = new Map(world.generals)

  const prevRuler = rulers.get(realmId)
  rulers.delete(realmId)

  const realm = realms.get(realmId)
  if (realm !== undefined) {
    const updatedRealm: Realm = { ...realm, rulerId: null }
    realms.set(realmId, updatedRealm)
  }

  if (prevRuler !== undefined) {
    generals.delete(prevRuler.generalId)
  }

  return { ...world, rulers, realms, generals }
}

function createSuccessionActions(
  set: StoreSet,
): Pick<
  GameActions,
  | 'resolveSuccessionForceCollateral'
  | 'resolveSuccessionFraternal'
  | 'resolveSuccessionCivilWar'
  | 'resolveSuccessionForceVassal'
> {
  return {
    resolveSuccessionForceCollateral: (realmId: RealmId, candidateId: GeneralId) =>
      set((state) => {
        state.world = castDraft(installSuccessor(state.world, realmId, candidateId))
        closeQueuedModal(state)
      }),
    resolveSuccessionFraternal: (realmId: RealmId, brotherId: GeneralId) =>
      set((state) => {
        state.world = castDraft(installSuccessor(state.world, realmId, brotherId))
        closeQueuedModal(state)
      }),
    resolveSuccessionCivilWar: (realmId: RealmId) =>
      set((state) => {
        const events: GameEvent[] = [{ type: 'successionCivilWar', payload: { realmId } }]
        state.world = castDraft(vacateRealm(state.world, realmId))
        state.events = castDraft(events)
        closeQueuedModal(state)
      }),
    resolveSuccessionForceVassal: (realmId: RealmId) =>
      set((state) => {
        state.world = castDraft(vacateRealm(state.world, realmId))
        closeQueuedModal(state)
      }),
  }
}

function createWorldActions(
  set: StoreSet,
): Pick<GameActions, 'issueOrder' | 'activatePlayerEdict' | 'assignPlayerGovernor' | 'assignPlayerPost' | 'unassignPlayerPost' | 'submitPlayerDiplomacyAction' | 'showBanner' | 'clearBanner'> {
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
    assignPlayerPost: (payload: AssignPlayerPostPayload) =>
      set((state) => {
        const order: Order = {
          type: 'assign-post',
          generalId: payload.generalId,
          post: payload.post,
        }
        state.world = castDraft({
          ...state.world,
          pendingOrders: [...state.world.pendingOrders, order],
        })
      }),
    unassignPlayerPost: (payload: UnassignPlayerPostPayload) =>
      set((state) => {
        const order: Order = {
          type: 'unassign-post',
          generalId: payload.generalId,
          post: payload.post,
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
  let playerRealmId = 'realm_qin'

  if (typeof window !== 'undefined' && import.meta.env.DEV) {
    const params = new URLSearchParams(window.location.search)
    const forcePlayerRealm = params.get('forcePlayerRealm')
    if (forcePlayerRealm) {
      playerRealmId = forcePlayerRealm
    }
  }

  let world = createWorldFromM1Data(data, 42, playerRealmId)

  if (typeof window !== 'undefined' && import.meta.env.DEV) {
    const params = new URLSearchParams(window.location.search)
    const forceTrigger = params.get('forceTrigger')
    if (forceTrigger) {
      const chainIds = forceTrigger.split(',')
      const eventChainStates = new Map(world.eventChainStates)
      for (const chainId of chainIds) {
        const chain = getEventChain(chainId)
        if (chain && chain.stages.length > 0) {
          eventChainStates.set(chainId, {
            id: chainId,
            currentStageId: chain.stages[0]!.id,
            completed: false,
            startedAtTick: world.tick,
            choiceHistory: [],
          })
        }
      }
      world = { ...world, eventChainStates }
    }

    const forceReform = params.get('forceReform')
    if (forceReform) {
      const targetRealmId = params.get('forceReformRealm') || playerRealmId
      const reformStates = new Map(world.reformStates)
      const defs = loadReformDefinitions()
      const def = defs.find(d => d.id === forceReform)
      if (def && def.stages.length > 0) {
        const firstStage = def.stages[0]!
        reformStates.set(targetRealmId, {
          realmId: targetRealmId,
          reformId: forceReform,
          status: 'in_progress',
          currentStageId: firstStage.id,
          startedAtTick: world.tick,
          stageEnteredAtTick: world.tick - firstStage.advanceAfterMonths * 3,
          choiceHistory: [],
        })
      }
      world = { ...world, reformStates }
    }
  }

  return {
    world,
    clockState: { speed: 'pause', realTimeAccum: 0 },
    events: [],
    diplomacyFeedback: [],
    playerRealmId,
    selectedArmyId: null,
    lastBattleResolution: null,
    contextMenu: null,
    activePanel: null,
    diplomacyTargetRealmId: null,
    isPeacePanelOpen: false,
    transientBanner: null,
    modalQueue: [],
    previousClockSpeed: '1x',
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

function createDisasterActions(set: StoreSet): Pick<GameActions, 'applyDisasterChoice'> {
  return {
    applyDisasterChoice: (disasterId: string, choiceId: string) =>
      set((state) => {
        const defs = loadDisasterDefinitions()
        const def = defs.find(d => d.id === disasterId)
        if (!def) return

        const playerRealmId = state.playerRealmId
        const existingState = state.world.disasterStates.get(playerRealmId)
        if (!existingState || existingState.status !== 'awaiting_decision' || existingState.disasterId !== disasterId) {
          return
        }

        let nextWorld = applyChoiceEffects(state.world, def, choiceId, playerRealmId)
        
        const resolvedState = {
          ...existingState,
          status: 'resolved' as const,
          chosenChoiceId: choiceId,
          resolvedAtTick: nextWorld.tick,
        }
        
        nextWorld = setDisasterState(nextWorld, playerRealmId, resolvedState)
        
        state.world = castDraft(nextWorld)
        closeQueuedModal(state)
      }),
  }
}

function createReformActions(set: StoreSet): Pick<GameActions, 'applyReformChoice'> {
  return {
    applyReformChoice: (realmId: RealmId, reformId: ReformId, choiceId: string) =>
      set((state) => {
        const defs = loadReformDefinitions()
        const def = defs.find((d) => d.id === reformId)
        if (!def) return

        const result = engineApplyReformChoice(state.world, realmId, def, choiceId)
        if (result.world === state.world) return

        state.world = castDraft(result.world)
      }),
  }
}

function createEventChainActions(set: StoreSet): Pick<GameActions, 'applyEventChainChoice'> {
  return {
    applyEventChainChoice: (chainId: EventChainId, choiceId: string) =>
      set((state) => {
        const result = engineApplyEventChainChoice(state.world, chainId, choiceId)
        state.world = castDraft(result.world)
        state.events = castDraft(result.events)
        closeQueuedModal(state)
      }),
  }
}

function createCriticalEventActions(set: StoreSet): Pick<GameActions, 'pauseOnCriticalEvent'> {
  return {
    pauseOnCriticalEvent: (eventType: CriticalEventType, _payload?: Record<string, unknown>) =>
      set((state) => {
        if (state.clockState.speed !== 'pause') {
          state.previousClockSpeed = state.clockState.speed
          state.clockState = engineSetSpeed(state.clockState, 'pause')
        }
        state.transientBanner = {
          text: bannerTextForCriticalEvent(eventType),
          createdAt: state.world.tick,
        }
      }),
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
    ...createBattleActions(set),
    ...createUiActions(set),
    ...createWorldActions(set),
    ...createSuccessionActions(set),
    ...createDisasterActions(set),
    ...createReformActions(set),
    ...createEventChainActions(set),
    ...createCriticalEventActions(set),
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
