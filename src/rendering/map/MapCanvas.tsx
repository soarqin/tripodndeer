import React, { useRef, useEffect, useCallback } from 'react'
import { useSites, useFactions } from '@/ui/store/selectors'
import type { Site, Faction } from '@/shared/types'
import { drawAllSites, type TransitionMap } from './draw-sites'

const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 600

function useSiteTransitions(
  sites: ReadonlyMap<string, Site>,
  factions: ReadonlyMap<string, Faction>,
  transitionsRef: React.MutableRefObject<TransitionMap>
) {
  const prevSitesRef = useRef<ReadonlyMap<string, Site> | null>(null)
  
  useEffect(() => {
    const prev = prevSitesRef.current
    if (prev) {
      for (const [id, site] of sites) {
        const prevSite = prev.get(id)
        if (prevSite && prevSite.ownerId !== site.ownerId) {
          const prevFaction = prevSite.ownerId ? factions.get(prevSite.ownerId) : null
          const newFaction = site.ownerId ? factions.get(site.ownerId) : null
          transitionsRef.current.set(id, {
            fromColor: prevFaction?.color ?? '#888888',
            toColor: newFaction?.color ?? '#888888',
            startMs: performance.now(),
          })
        }
      }
    }
    prevSitesRef.current = sites
  }, [sites, factions, transitionsRef])
}

function useCanvasAnimation(draw: () => void, transitionsRef: React.MutableRefObject<TransitionMap>) {
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

export function MapCanvas(): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const transitionsRef = useRef<TransitionMap>(new Map())
  
  const sites = useSites()
  const factions = useFactions()
  
  useSiteTransitions(sites, factions, transitionsRef)
  
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    drawAllSites(ctx, sites, factions, transitionsRef.current, performance.now(), CANVAS_WIDTH, CANVAS_HEIGHT)
  }, [sites, factions])
  
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
