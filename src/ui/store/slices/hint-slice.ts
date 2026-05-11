import type { HintId } from '@/ui/components/HintModal/hint-types'
import type { GameStore, StoreSet } from '../game-store'

export interface HintSlice {
  seenHints: Record<HintId, true>
  hintsEnabled: boolean
  markHintSeen: (id: HintId) => void
  resetAllHints: () => void
  setHintsEnabled: (enabled: boolean) => void
  isHintSeen: (id: HintId) => boolean
  isHintsEnabled: () => boolean
}

export function createHintSlice(set: StoreSet, get: () => GameStore): HintSlice {
  return {
    seenHints: {},
    hintsEnabled: true,
    markHintSeen: (id) => {
      set((state) => {
        state.seenHints = { ...state.seenHints, [id]: true }
      })
    },
    resetAllHints: () => {
      set((state) => {
        state.seenHints = {}
      })
    },
    setHintsEnabled: (enabled) => {
      set((state) => {
        state.hintsEnabled = enabled
      })
    },
    isHintSeen: (id) => {
      return get().seenHints[id] === true
    },
    isHintsEnabled: () => {
      return get().hintsEnabled
    },
  }
}
