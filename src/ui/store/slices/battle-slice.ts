import type { BattleResolution } from '~/engine/systems/combat-v2'
import type { GameEvent, RealmId } from '~/shared/types'
import type { StoreSet } from '../game-store'

export interface BattleActions {
  setLastBattleResolution: (resolution: BattleResolution | null) => void
  clearLastBattleResolution: () => void
}

export function getPlayerBattleResolution(events: readonly GameEvent[], playerRealmId: RealmId): BattleResolution | null {
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

export function createBattleSlice(set: StoreSet): BattleActions {
  return {
    setLastBattleResolution: (resolution) =>
      set((state) => {
        state.lastBattleResolution = resolution
      }),
    clearLastBattleResolution: () =>
      set((state) => {
        state.lastBattleResolution = null
      }),
  }
}
