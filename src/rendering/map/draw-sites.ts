import type { Site, Faction, SiteId } from '@/shared/types'
import { lerpColor } from './lerp-color'

const BACKGROUND_COLOR = '#F5EFD9'
const BORDER_COLOR = '#1A1A1A'
const TEXT_COLOR = '#666666'
const TRANSITION_DURATION_MS = 300

interface TransitionState {
  fromColor: string
  toColor: string
  startMs: number
}

export type TransitionMap = Map<SiteId, TransitionState>

/** 计算 site 当前应显示的颜色（考虑 transition） */
export function getSiteColor(
  site: Site,
  factions: ReadonlyMap<string, Faction>,
  transitions: TransitionMap,
  nowMs: number,
): string {
  const faction = site.ownerId ? factions.get(site.ownerId) : null
  const targetColor = faction?.color ?? '#888888'
  
  const transition = transitions.get(site.id)
  if (!transition) return targetColor
  
  const elapsed = nowMs - transition.startMs
  if (elapsed >= TRANSITION_DURATION_MS) {
    transitions.delete(site.id)
    return targetColor
  }
  
  const t = elapsed / TRANSITION_DURATION_MS
  return lerpColor(transition.fromColor, transition.toColor, t)
}

/** 计算多边形质心 */
function centroid(polygon: readonly (readonly [number, number])[]): [number, number] {
  let cx = 0, cy = 0
  for (const [x, y] of polygon) { cx += x; cy += y }
  return [cx / polygon.length, cy / polygon.length]
}

/** 绘制所有邑到 canvas */
export function drawAllSites(
  ctx: CanvasRenderingContext2D,
  sites: ReadonlyMap<string, Site>,
  factions: ReadonlyMap<string, Faction>,
  transitions: TransitionMap,
  nowMs: number,
  width: number,
  height: number,
): void {
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = BACKGROUND_COLOR
  ctx.fillRect(0, 0, width, height)
  
  for (const site of sites.values()) {
    const color = getSiteColor(site, factions, transitions, nowMs)
    const poly = site.polygon
    if (poly.length < 3) continue
    
    ctx.beginPath()
    ctx.moveTo(poly[0]![0], poly[0]![1])
    for (let i = 1; i < poly.length; i++) {
      ctx.lineTo(poly[i]![0], poly[i]![1])
    }
    ctx.closePath()
    ctx.fillStyle = color
    ctx.fill()
    ctx.strokeStyle = BORDER_COLOR
    ctx.lineWidth = 1
    ctx.stroke()
    
    // 绘制名称
    const [cx, cy] = centroid(poly)
    ctx.fillStyle = TEXT_COLOR
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(site.name, cx, cy)
  }
}
