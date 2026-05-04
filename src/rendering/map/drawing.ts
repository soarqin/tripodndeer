import type { Site, Realm, Army, Pass, AdjacencyEdge } from '@/shared/types'
import { buildTileCache } from './tile-cache'
import { drawArmies } from './army-render'
import { TRANSITION_DURATION_MS, TransitionMap, easeInOut } from './transitions'

export const CANVAS_WIDTH = 800
export const CANVAS_HEIGHT = 600
export const BACKGROUND_COLOR = '#F5EFD9'

export function drawMap(
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

export function drawArmiesAndPasses(
  ctx: CanvasRenderingContext2D,
  armies: ReadonlyMap<string, Army>,
  sites: ReadonlyMap<string, Site>,
  realms: ReadonlyMap<string, Realm>,
  selectedArmyId: string | null,
  passes: ReadonlyMap<string, Pass>,
  adjacencyEdges: ReadonlyMap<string, AdjacencyEdge>,
) {
  drawArmies(ctx, armies, sites, realms, selectedArmyId, '', new Map(), new Set(), false)

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
