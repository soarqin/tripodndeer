import type {
  Army,
  EdgeId,
  GameDate,
  MapEdge,
  Realm,
  Site,
  RealmId,
  SiteId,
  SpeedTier,
} from '~/shared/types'
import type { GameStoreState } from './game-store'
import { useGameStore } from './game-store'

/**
 * 细粒度 React selector hooks。
 * 每个 hook 只订阅 store 的单一字段，借助 zustand 默认 strict-equality
 * 比较自动避免无关字段变更导致的重渲染。
 */

export function useWorldDate(): GameDate {
  return useGameStore((s) => s.world.date)
}

export function useWorldTick(): number {
  return useGameStore((s) => s.world.tick)
}

export function useSpeed(): SpeedTier {
  return useGameStore((s) => s.clockState.speed)
}

export function useSites(): ReadonlyMap<SiteId, Site> {
  return useGameStore((s) => s.world.sites)
}

export function useRealms(): ReadonlyMap<RealmId, Realm> {
  return useGameStore((s) => s.world.realms)
}

export function useEdges(): ReadonlyMap<EdgeId, MapEdge> {
  return useGameStore((s) => s.world.edges)
}

export const selectSelectedArmy = (state: GameStoreState): Army | null => {
  if (!state.selectedArmyId) return null
  return state.world.armies.get(state.selectedArmyId) ?? null
}

export const selectContextMenu = (state: GameStoreState) => state.contextMenu

export const selectActivePanel = (state: GameStoreState) => state.activePanel

export const selectPlayerRealm = (state: GameStoreState): Realm | null =>
  state.world.realms.get(state.playerRealmId) ?? null

export const selectTransientBanner = (state: GameStoreState) => state.transientBanner

export const selectAllPlayerArmies = (state: GameStoreState): Army[] =>
  [...state.world.armies.values()].filter((a) => a.realmId === state.playerRealmId)

export const selectIdlePlayerArmies = (state: GameStoreState): Army[] =>
  [...state.world.armies.values()].filter(
    (a) => a.realmId === state.playerRealmId && a.state === 'idle',
  )
