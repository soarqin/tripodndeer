import React, { useRef, useCallback, useMemo } from 'react'
import { useSites, useRealms, useEdges } from '@/ui/store/selectors'
import { useGameStore } from '@/ui/store/game-store'
import { buildTileCache } from './tile-cache'
import { useSiteTransitions, useCanvasAnimation, TransitionMap } from './transitions'
import { drawMap, drawArmiesAndPasses, CANVAS_WIDTH, CANVAS_HEIGHT } from './drawing'
import { useCanvasInteractionHandlers } from './interaction'

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
