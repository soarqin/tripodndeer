import type {
  EdgeId,
  Faction,
  FactionId,
  GameDate,
  MapEdge,
  Site,
  SiteId,
  SpeedTier,
} from '@/shared/types'
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

export function useFactions(): ReadonlyMap<FactionId, Faction> {
  return useGameStore((s) => s.world.factions)
}

export function useEdges(): ReadonlyMap<EdgeId, MapEdge> {
  return useGameStore((s) => s.world.edges)
}
