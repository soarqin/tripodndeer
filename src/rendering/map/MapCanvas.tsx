import React, { useRef, useEffect, useCallback, useMemo } from 'react'
import { useSites, useFactions, useEdges } from '@/ui/store/selectors'
import type { Site } from '@/shared/types'
import { buildTileCache } from './tile-cache'

const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 600
const TRANSITION_DURATION_MS = 300
const BACKGROUND_COLOR = '#F5EFD9'

interface TransitionState {
  fromFactionId: string
  toFactionId: string
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
            fromFactionId: prevSite.ownerId ?? '',
            toFactionId: site.ownerId ?? '',
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
        const fromTile = siteTiles.get(transition.fromFactionId)
        const toTile = siteTiles.get(transition.toFactionId)
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

export function MapCanvas(): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const transitionsRef = useRef<TransitionMap>(new Map())
  const sites = useSites()
  const factions = useFactions()
  const edges = useEdges()

  // Build tile cache once (or when sites/factions change — rare)
  const tileCache = useMemo(() => buildTileCache(sites, factions, edges), [sites, factions, edges])

  useSiteTransitions(sites, transitionsRef)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    drawMap(ctx, sites, tileCache, transitionsRef.current, performance.now())
  }, [sites, tileCache])

  useCanvasAnimation(draw, transitionsRef)

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      style={{ display: 'block' }}
      data-testid="map-canvas"
    />
  )
}
