import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react'
import { useSites, useRealms, useEdges } from '@/ui/store/selectors'
import { useGameStore } from '@/ui/store/game-store'
import type { Site, Vec2, Pass, AdjacencyEdge, Realm, Army } from '@/shared/types'
import { buildTileCache } from './tile-cache'
import { findHitSite } from './hit-test'
import { drawArmies } from './army-render'

const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 600
const TRANSITION_DURATION_MS = 300
const BACKGROUND_COLOR = '#F5EFD9'

interface TransitionState {
  fromRealmId: string
  toRealmId: string
  startMs: number
}

type TransitionMap = Map<string, TransitionState>

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

function useSiteTransitions(
  sites: ReadonlyMap<string, Site>,
  transitionsRef: React.MutableRefObject<TransitionMap>,
) {
  const prevSitesRef = useRef<ReadonlyMap<string, Site> | null>(null)
  useEffect(() => {
    const prev = prevSitesRef.current
    if (prev) {
      for (const [id, site] of sites) {
        const prevSite = prev.get(id)
        if (prevSite && prevSite.ownerId !== site.ownerId) {
            transitionsRef.current.set(id, {
            fromRealmId: prevSite.ownerId ?? '',
            toRealmId: site.ownerId ?? '',
            startMs: performance.now(),
          })
        }
      }
    }
    prevSitesRef.current = sites
  }, [sites, transitionsRef])
}

function useCanvasAnimation(
  draw: () => void,
  transitionsRef: React.MutableRefObject<TransitionMap>,
) {
  const rafRef = useRef<number | null>(null)
  useEffect(() => {
    draw()
    if (transitionsRef.current.size > 0) {
      const animate = () => {
        draw()
        if (transitionsRef.current.size > 0) {
          rafRef.current = requestAnimationFrame(animate)
        } else {
          rafRef.current = null
        }
      }
      rafRef.current = requestAnimationFrame(animate)
    }
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [draw, transitionsRef])
}

function drawMap(
  ctx: CanvasRenderingContext2D,
  sites: ReadonlyMap<string, Site>,
  tileCache: ReturnType<typeof buildTileCache>,
  transitions: TransitionMap,
  now: number,
) {
  ctx.fillStyle = BACKGROUND_COLOR
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  for (const [siteId, site] of sites) {
    const siteTiles = tileCache.get(siteId)
    if (!siteTiles) continue
    const transition = transitions.get(siteId)
    if (transition) {
      const elapsed = now - transition.startMs
      if (elapsed >= TRANSITION_DURATION_MS) {
        transitions.delete(siteId)
        const tile = siteTiles.get(site.ownerId ?? '')
        if (tile) ctx.drawImage(tile, 0, 0)
      } else {
        const t = easeInOut(elapsed / TRANSITION_DURATION_MS)
        const fromTile = siteTiles.get(transition.fromRealmId)
        const toTile = siteTiles.get(transition.toRealmId)
        if (fromTile) { ctx.globalAlpha = 1 - t; ctx.drawImage(fromTile, 0, 0) }
        if (toTile) { ctx.globalAlpha = t; ctx.drawImage(toTile, 0, 0) }
        ctx.globalAlpha = 1
      }
    } else {
      const tile = siteTiles.get(site.ownerId ?? '')
      if (tile) ctx.drawImage(tile, 0, 0)
    }
  }
}

function getCanvasPoint(
  canvas: HTMLCanvasElement,
  event: React.MouseEvent<HTMLCanvasElement>,
): Vec2 {
  const rect = canvas.getBoundingClientRect()
  return [event.clientX - rect.left, event.clientY - rect.top]
}

function findPlayerArmyAtSite(
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

function drawArmiesAndPasses(
  ctx: CanvasRenderingContext2D,
  armies: ReadonlyMap<string, Army>,
  sites: ReadonlyMap<string, Site>,
  realms: ReadonlyMap<string, Realm>,
  selectedArmyId: string | null,
  passes: ReadonlyMap<string, Pass>,
  adjacencyEdges: ReadonlyMap<string, AdjacencyEdge>,
) {
  drawArmies(ctx, armies, sites, realms, selectedArmyId)

  ctx.save()
  for (const pass of passes.values()) {
    const ae = adjacencyEdges.get(pass.edgeId)
    if (!ae) continue
    const site1 = sites.get(ae.fromSiteId)
    const site2 = sites.get(ae.toSiteId)
    if (!site1 || !site2) continue

    const cx = (site1.position[0] + site2.position[0]) / 2
    const cy = (site1.position[1] + site2.position[1]) / 2

    const realm = realms.get(pass.controllerId)
    const color = realm?.color ?? '#888888'

    ctx.fillStyle = color
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 1

    // Padlock body
    ctx.fillRect(cx - 4, cy - 2, 8, 6)
    ctx.strokeRect(cx - 4, cy - 2, 8, 6)

    // Padlock shackle
    ctx.beginPath()
    ctx.arc(cx, cy - 2, 2.5, Math.PI, 0)
    ctx.stroke()
  }
  ctx.restore()
}

function findHitPass(
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

function dispatchLeftClick(hitSiteId: string | null): void {
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

function useCanvasInteractionHandlers(
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

export function MapCanvas(): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const transitionsRef = useRef<TransitionMap>(new Map())
  const sites = useSites()
  const realms = useRealms()
  const edges = useEdges()
  const armies = useGameStore(s => s.world.armies)
  const passes = useGameStore(s => s.world.passes)
  const adjacencyEdges = useGameStore(s => s.world.adjacencyEdges)
  const selectedArmyId = useGameStore(s => s.selectedArmyId)

  // Build tile cache once (or when sites/realms change — rare)
  const tileCache = useMemo(() => buildTileCache(sites, realms, edges), [sites, realms, edges])

  useSiteTransitions(sites, transitionsRef)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    drawMap(ctx, sites, tileCache, transitionsRef.current, performance.now())
    drawArmiesAndPasses(ctx, armies, sites, realms, selectedArmyId, passes, adjacencyEdges)
  }, [sites, tileCache, armies, realms, selectedArmyId, passes, adjacencyEdges])

  useCanvasAnimation(draw, transitionsRef)

  const { handleClick, handleContextMenu, handleMouseMove, handleMouseLeave, hoveredPassId, tooltipPos } = useCanvasInteractionHandlers(canvasRef, sites, passes, adjacencyEdges)

  const hoveredPass = hoveredPassId ? passes.get(hoveredPassId) : null
  const hoveredPassController = hoveredPass ? realms.get(hoveredPass.controllerId) : null

  return (
    <div style={{ position: 'relative', width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={{ display: 'block' }}
        data-testid="map-canvas"
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
      {hoveredPass && tooltipPos && (
        <div
          style={{
            position: 'fixed',
            left: tooltipPos.x + 10,
            top: tooltipPos.y + 10,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            pointerEvents: 'none',
            zIndex: 1000,
            whiteSpace: 'nowrap',
          }}
        >
          {hoveredPass.name} | 控制：{hoveredPassController?.displayName ?? '无'} | 防御：+{Math.round(hoveredPass.defenseBonus * 100)}%
        </div>
      )}
    </div>
  )
}
