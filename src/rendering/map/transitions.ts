import { useEffect, useRef } from 'react'
import type { Site } from '@/shared/types'

export const TRANSITION_DURATION_MS = 300

export interface TransitionState {
  fromRealmId: string
  toRealmId: string
  startMs: number
}

export type TransitionMap = Map<string, TransitionState>

export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

export function useSiteTransitions(
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

export function useCanvasAnimation(
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
