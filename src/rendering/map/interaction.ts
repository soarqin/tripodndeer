import { useState, useCallback } from 'react'
import type { Site, Pass, AdjacencyEdge, Vec2 } from '@/shared/types'
import { useGameStore } from '@/ui/store/game-store'
import { findHitSite } from './hit-test'

export function getCanvasPoint(
  canvas: HTMLCanvasElement,
  event: React.MouseEvent<HTMLCanvasElement>,
): Vec2 {
  const rect = canvas.getBoundingClientRect()
  return [event.clientX - rect.left, event.clientY - rect.top]
}

export function findPlayerArmyAtSite(
  armies: ReadonlyMap<string, { id: string; realmId: string; location: string }>,
  playerRealmId: string,
  siteId: string,
): string | null {
  for (const army of armies.values()) {
    if (army.realmId === playerRealmId && army.location === siteId) {
      return army.id
    }
  }
  return null
}

export function findHitPass(
  point: Vec2,
  passes: ReadonlyMap<string, Pass>,
  adjacencyEdges: ReadonlyMap<string, AdjacencyEdge>,
  sites: ReadonlyMap<string, Site>,
): string | null {
  for (const pass of passes.values()) {
    const ae = adjacencyEdges.get(pass.edgeId)
    if (!ae) continue
    const site1 = sites.get(ae.fromSiteId)
    const site2 = sites.get(ae.toSiteId)
    if (!site1 || !site2) continue

    const cx = (site1.position[0] + site2.position[0]) / 2
    const cy = (site1.position[1] + site2.position[1]) / 2

    const dx = point[0] - cx
    const dy = point[1] - cy
    if (dx * dx + dy * dy <= 64) { // radius 8
      return pass.id
    }
  }
  return null
}

export function dispatchLeftClick(hitSiteId: string | null): void {
  const store = useGameStore.getState()
  if (hitSiteId === null) {
    store.clearSelection()
    return
  }
  const playerArmyId = findPlayerArmyAtSite(
    store.world.armies,
    store.playerRealmId,
    hitSiteId,
  )
  if (playerArmyId !== null) {
    store.selectArmy(playerArmyId)
  } else {
    store.clearSelection()
  }
}

export function useCanvasInteractionHandlers(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  sites: ReadonlyMap<string, Site>,
  passes: ReadonlyMap<string, Pass>,
  adjacencyEdges: ReadonlyMap<string, AdjacencyEdge>,
) {
  const [hoveredPassId, setHoveredPassId] = useState<string | null>(null)
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null)

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const point = getCanvasPoint(canvas, event)
      const hitPassId = findHitPass(point, passes, adjacencyEdges, sites)
      
      if (hitPassId !== hoveredPassId) {
        setHoveredPassId(hitPassId)
      }
      if (hitPassId) {
        setTooltipPos({ x: event.clientX, y: event.clientY })
      } else {
        setTooltipPos(null)
      }
    },
    [canvasRef, sites, passes, adjacencyEdges, hoveredPassId],
  )

  const handleMouseLeave = useCallback(() => {
    setHoveredPassId(null)
    setTooltipPos(null)
  }, [])

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const point = getCanvasPoint(canvas, event)
      dispatchLeftClick(findHitSite(point, sites))
    },
    [canvasRef, sites],
  )

  const handleContextMenu = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      event.preventDefault()
      const canvas = canvasRef.current
      if (!canvas) return
      const point = getCanvasPoint(canvas, event)
      const hitSiteId = findHitSite(point, sites)
      if (hitSiteId === null) return
      useGameStore.getState().openContextMenu({
        siteId: hitSiteId,
        x: event.clientX,
        y: event.clientY,
      })
    },
    [canvasRef, sites],
  )

  return { handleClick, handleContextMenu, handleMouseMove, handleMouseLeave, hoveredPassId, tooltipPos }
}
