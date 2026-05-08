import { castDraft } from 'immer'
import { setSpeed as engineSetSpeed } from '@/engine/clock'
import {
  createWorldFromM1Data,
  createWorldFromM9Data,
  loadM1Data,
  loadM9Data,
} from '@/engine/world'
import {
  applyDiplomacyAction,
  relationKey,
  validateDiplomacyAction,
  type DiplomacyActionRequest,
  type DiplomacyValidationReason,
} from '~/engine/systems/diplomacy'
import {
  applyChoiceEffects,
  loadDisasterDefinitions,
  setDisasterState,
} from '~/engine/systems/disaster/disaster-phase'
import {
  applyReformChoice as engineApplyReformChoice,
  loadReformDefinitions,
} from '~/engine/systems/reform'
import {
  applyEventChainChoice as engineApplyEventChainChoice,
} from '~/engine/systems/events/event-chain-engine'
import type {
  DiplomaticActionKind,
  DiplomaticProposalId,
  EdictId,
  EdictKind,
  EventChainId,
  GeneralId,
  Order,
  Post,
  RealmId,
  RelationKey,
  ReformId,
  SiteId,
  World,
} from '~/shared/types'
import { bannerTextForCriticalEvent, type CriticalEventType } from '../critical-events'
import type { GameStore, StoreSet } from '../game-store'
import { closeQueuedModal } from './ui-slice'

export type ScenarioId = 'm1' | 'm9'

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
  readonly post: Post
}

export interface UnassignPlayerPostPayload {
  readonly generalId: GeneralId
  readonly post: Post
}

export interface WorldActions {
  issueOrder: (order: Order) => void
  activatePlayerEdict: (payload: ActivatePlayerEdictPayload) => void
  assignPlayerGovernor: (payload: AssignPlayerGovernorPayload) => void
  assignPlayerPost: (payload: AssignPlayerPostPayload) => void
  unassignPlayerPost: (payload: UnassignPlayerPostPayload) => void
  submitPlayerDiplomacyAction: (payload: SubmitPlayerDiplomacyActionPayload) => SubmitPlayerDiplomacyActionResult
  applyDisasterChoice: (disasterId: string, choiceId: string) => void
  applyReformChoice: (realmId: RealmId, reformId: ReformId, choiceId: string) => void
  applyEventChainChoice: (chainId: EventChainId, choiceId: string) => void
  pauseOnCriticalEvent: (eventType: CriticalEventType, payload?: Record<string, unknown>) => void
  loadWorld: (scenarioId: ScenarioId) => Promise<void>
  replaceWorldFromSave: (world: World) => void
  resetToBootPending: () => void
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

function createOrderActions(set: StoreSet): Pick<WorldActions, 'issueOrder' | 'activatePlayerEdict' | 'assignPlayerGovernor' | 'assignPlayerPost' | 'unassignPlayerPost'> {
  return {
    issueOrder: (order) =>
      set((state) => {
        state.world = castDraft({
          ...state.world,
          pendingOrders: [...state.world.pendingOrders, order],
        })
      }),
    activatePlayerEdict: (payload) =>
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
    assignPlayerGovernor: (payload) =>
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
    assignPlayerPost: (payload) =>
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
    unassignPlayerPost: (payload) =>
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
  }
}

function createDiplomacyAction(set: StoreSet): Pick<WorldActions, 'submitPlayerDiplomacyAction'> {
  return {
    submitPlayerDiplomacyAction: (payload) => {
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
  }
}

function applyReadyWorld(state: GameStore, world: World, playerRealmId: RealmId): void {
  state.world = castDraft(world)
  state.playerRealmId = playerRealmId
  state.bootStatus = 'ready'
  state.selectedArmyId = null
  state.lastBattleResolution = null
  state.contextMenu = null
  state.activePanel = null
  state.diplomacyTargetRealmId = null
  state.isPeacePanelOpen = false
  state.transientBanner = null
  state.events = castDraft([])
  state.diplomacyFeedback = castDraft([])
  state.modalQueue = castDraft([])
}

function createBootActions(set: StoreSet): Pick<WorldActions, 'loadWorld' | 'replaceWorldFromSave' | 'resetToBootPending'> {
  return {
    loadWorld: async (scenarioId) => {
      if (scenarioId === 'm1') {
        const data = loadM1Data()
        const playerRealmId: RealmId = 'realm_qin'
        const world = createWorldFromM1Data(data, 42, playerRealmId)
        set((state) => {
          applyReadyWorld(state, world, playerRealmId)
        })
        return
      }

      const data = await loadM9Data()
      const playerRealmId: RealmId = 'realm_qin'
      const world = createWorldFromM9Data(data, 42, playerRealmId)
      set((state) => {
        applyReadyWorld(state, world, playerRealmId)
      })
    },
    replaceWorldFromSave: (world) =>
      set((state) => {
        applyReadyWorld(state, world, world.playerRealmId)
      }),
    resetToBootPending: () =>
      set((state) => {
        state.bootStatus = 'pending'
        state.selectedArmyId = null
        state.lastBattleResolution = null
        state.contextMenu = null
        state.activePanel = null
        state.diplomacyTargetRealmId = null
        state.isPeacePanelOpen = false
        state.transientBanner = null
        state.events = castDraft([])
        state.diplomacyFeedback = castDraft([])
        state.modalQueue = castDraft([])
      }),
  }
}

function createDecisionActions(set: StoreSet): Pick<WorldActions, 'applyDisasterChoice' | 'applyReformChoice' | 'applyEventChainChoice' | 'pauseOnCriticalEvent'> {
  return {
    applyDisasterChoice: (disasterId, choiceId) =>
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
    applyReformChoice: (realmId, reformId, choiceId) =>
      set((state) => {
        const defs = loadReformDefinitions()
        const def = defs.find((d) => d.id === reformId)
        if (!def) return

        const result = engineApplyReformChoice(state.world, realmId, def, choiceId)
        if (result.world === state.world) return

        state.world = castDraft(result.world)
      }),
    applyEventChainChoice: (chainId, choiceId) =>
      set((state) => {
        const result = engineApplyEventChainChoice(state.world, chainId, choiceId)
        state.world = castDraft(result.world)
        state.events = castDraft(result.events)
        closeQueuedModal(state)
      }),
    pauseOnCriticalEvent: (eventType, _payload) =>
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

export function createWorldSlice(set: StoreSet): WorldActions {
  return {
    ...createOrderActions(set),
    ...createDiplomacyAction(set),
    ...createDecisionActions(set),
    ...createBootActions(set),
  }
}
