import React from 'react'
import { castDraft } from 'immer'
import { setSpeed as engineSetSpeed } from '@/engine/clock'
import type { ModalAction } from '@/ui/components/Modal'
import type { RealmId, SiteId } from '~/shared/types'
import type { GameStore, StoreSet } from '../game-store'

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

export interface Toast {
  readonly id: string
  readonly text: string
  readonly createdAt: number
  readonly durationMs: number
}

export interface EventLogEntry {
  readonly id: string
  readonly tick: number
  readonly type: string
  readonly text: string
  readonly createdAt: number
}

export interface UiActions {
  openContextMenu: (payload: { siteId: SiteId; x: number; y: number }) => void
  closeContextMenu: () => void
  setActivePanel: (panel: 'wanggong' | 'junshi' | 'neizheng' | 'rencai' | 'waijiao' | 'culture' | 'espionage' | 'province-browser' | 'region-browser' | 'character-browser' | null) => void
  openDiplomacyPanel: (realmId: RealmId) => void
  closeDiplomacyPanel: () => void
  openPeacePanel: () => void
  closePeacePanel: () => void
  showBanner: (text: string) => void
  clearBanner: () => void
  openModal: (modal: OpenModalPayload) => void
  closeModal: () => void
  clearModalQueue: () => void
  enqueueToast: (text: string, durationMs?: number) => void
  dismissToast: (id: string) => void
  appendEventLog: (entry: EventLogEntry) => void
  clearEventLog: () => void
}

export function enqueueModal(state: GameStore, modal: OpenModalPayload): void {
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

export function closeQueuedModal(state: GameStore): void {
  if (state.modalQueue.length === 0) return

  const nextQueue = state.modalQueue.slice(1)
  state.modalQueue = castDraft(nextQueue)
  if (nextQueue.length === 0) {
    state.clockState = engineSetSpeed(state.clockState, state.previousClockSpeed)
  }
}

export function clearQueuedModals(state: GameStore): void {
  if (state.modalQueue.length === 0) return

  state.modalQueue = []
  state.clockState = engineSetSpeed(state.clockState, state.previousClockSpeed)
}

export function createUiSlice(set: StoreSet): UiActions {
  return {
    openContextMenu: (payload) =>
      set((state) => {
        state.contextMenu = payload
      }),
    closeContextMenu: () =>
      set((state) => {
        state.contextMenu = null
      }),
    setActivePanel: (panel) =>
      set((state) => {
        state.activePanel = panel
      }),
    openDiplomacyPanel: (realmId) =>
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
    showBanner: (text) =>
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
    enqueueToast: (text, durationMs = 10000) =>
      set((state) => {
        const toast: Toast = {
          id: Math.random().toString(36).substring(2, 9),
          text,
          createdAt: Date.now(),
          durationMs,
        }
        state.toastQueue.push(toast)
        if (state.toastQueue.length > 5) {
          state.toastQueue.shift()
        }
      }),
    dismissToast: (id) =>
      set((state) => {
        state.toastQueue = castDraft(state.toastQueue.filter((t) => t.id !== id))
      }),
    appendEventLog: (entry) =>
      set((state) => {
        state.eventLog.unshift(entry)
        if (state.eventLog.length > 200) {
          state.eventLog.pop()
        }
      }),
    clearEventLog: () =>
      set((state) => {
        state.eventLog = []
      }),
  }
}
