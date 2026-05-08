import type { ClockState } from '@/engine/clock'
import type { BattleResolution } from '~/engine/systems/combat-v2'
import { createWorldFromM1Data, loadM1Data } from '@/engine/world'
import { loadReformDefinitions } from '~/engine/systems/reform'
import { getEventChain } from '~/engine/systems/events/event-chain-engine'
import type {
  ArmyId,
  GameEvent,
  RealmId,
  SiteId,
  SpeedTier,
  World,
} from '~/shared/types'
import type { Modal, Toast, EventLogEntry } from './slices/ui-slice'
import type { DiplomacyActionFeedback } from './slices/world-slice'

export type BootStatus = 'pending' | 'ready'

export interface GameState {
  world: World
  clockState: ClockState
  events: readonly GameEvent[]
  diplomacyFeedback: readonly DiplomacyActionFeedback[]
  playerRealmId: RealmId
  selectedArmyId: ArmyId | null
  lastBattleResolution: BattleResolution | null
  contextMenu: { siteId: SiteId; x: number; y: number } | null
  activePanel: 'wanggong' | 'junshi' | 'neizheng' | 'rencai' | 'waijiao' | 'culture' | 'espionage' | null
  diplomacyTargetRealmId: RealmId | null
  isPeacePanelOpen: boolean
  transientBanner: { text: string; createdAt: number } | null
  modalQueue: ReadonlyArray<Modal>
  toastQueue: Toast[]
  eventLog: EventLogEntry[]
  previousClockSpeed: SpeedTier
  bootStatus: BootStatus
}

export function makeInitialState(): GameState {
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
    toastQueue: [],
    eventLog: [],
    previousClockSpeed: '1x',
    bootStatus: 'pending',
  }
}
