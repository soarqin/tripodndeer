import { castDraft } from 'immer'
import { advanceClock, setSpeed as engineSetSpeed } from '@/engine/clock'
import type { SpeedTier } from '~/shared/types'
import type { StoreSet } from '../game-store'
import { makeInitialState } from '../initial-state'
import { getPlayerBattleResolution } from './battle-slice'

export interface ClockActions {
  tick: (deltaMs: number) => void
  setSpeed: (speed: SpeedTier) => void
  reset: () => void
}

export function createClockSlice(set: StoreSet): ClockActions {
  return {
    tick: (deltaMs) =>
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
    setSpeed: (speed) =>
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
        state.selectedCodexEntryId = fresh.selectedCodexEntryId
        state.diplomacyTargetRealmId = fresh.diplomacyTargetRealmId
        state.transientBanner = fresh.transientBanner
        state.modalQueue = castDraft(fresh.modalQueue)
        state.previousClockSpeed = fresh.previousClockSpeed
        state.codexPreviousClockSpeed = fresh.codexPreviousClockSpeed
        state.bootStatus = fresh.bootStatus
      }),
  }
}
