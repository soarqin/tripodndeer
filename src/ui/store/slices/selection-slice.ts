import type { ArmyId } from '~/shared/types'
import type { StoreSet } from '../game-store'

export interface SelectionActions {
  selectArmy: (armyId: ArmyId) => void
  clearSelection: () => void
}

export function createSelectionSlice(set: StoreSet): SelectionActions {
  return {
    selectArmy: (armyId) =>
      set((state) => {
        state.selectedArmyId = armyId
      }),
    clearSelection: () =>
      set((state) => {
        state.selectedArmyId = null
      }),
  }
}
