import type { Site, Faction, SiteId, FactionId } from '@/shared/types'

/** 预渲染的 (site, faction) tile — HTMLCanvasElement */
export type TileCache = ReadonlyMap<SiteId, ReadonlyMap<FactionId, HTMLCanvasElement>>

const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 600
const BORDER_COLOR = '#1A1A1A'
const TEXT_COLOR = '#666666'

/** 计算多边形质心 */
function centroid(polygon: readonly (readonly [number, number])[]): [number, number] {
  let cx = 0, cy = 0
  for (const [x, y] of polygon) { cx += x; cy += y }
  return [cx / polygon.length, cy / polygon.length]
}

/**
 * 通过中点的 C¹ quadratic Bezier 平滑曲线。
 * 每个顶点作为控制点，中点作为端点 — 产生 C¹ 连续的平滑闭合曲线。
 * 仅在 Tile Cache 构建时调用（不在 runtime render 中）。
 */
export function buildSmoothPath(polygon: readonly (readonly [number, number])[]): Path2D {
  const path = new Path2D()
  const n = polygon.length
  if (n < 3) return path
  const midX = (i: number, j: number) => (polygon[i]![0] + polygon[j]![0]) / 2
  const midY = (i: number, j: number) => (polygon[i]![1] + polygon[j]![1]) / 2
  // 从最后一条边的中点出发（避免 seam）
  path.moveTo(midX(n - 1, 0), midY(n - 1, 0))
  for (let i = 0; i < n; i++) {
    const next = (i + 1) % n
    path.quadraticCurveTo(
      polygon[i]![0], polygon[i]![1],  // 控制点 = 顶点
      midX(i, next), midY(i, next),    // 端点 = 下一中点
    )
  }
  path.closePath()
  return path
}

/** 在 canvas 上以平滑曲线绘制单个 site（填色 + 描边 + 文字） */
function paintSiteTile(
  canvas: HTMLCanvasElement,
  site: Site,
  factionColor: string,
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
  const path = buildSmoothPath(site.polygon)
  ctx.fillStyle = factionColor
  ctx.fill(path)
  ctx.strokeStyle = BORDER_COLOR
  ctx.lineWidth = 1.2
  ctx.stroke(path)
  const [cx, cy] = centroid(site.polygon)
  ctx.fillStyle = TEXT_COLOR
  ctx.font = '14px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(site.name, cx, cy)
}

/**
 * 一次性构建所有 (site × faction) tile cache。
 * 在应用启动时调用一次，之后 runtime 仅用 ctx.drawImage()。
 * 使用 document.createElement('canvas') 而非 OffscreenCanvas（jsdom 兼容）。
 */
export function buildTileCache(
  sites: ReadonlyMap<SiteId, Site>,
  factions: ReadonlyMap<FactionId, Faction>,
): TileCache {
  const cache = new Map<SiteId, Map<FactionId, HTMLCanvasElement>>()
  for (const [siteId, site] of sites) {
    const siteCache = new Map<FactionId, HTMLCanvasElement>()
    for (const [factionId, faction] of factions) {
      const canvas = document.createElement('canvas')
      canvas.width = CANVAS_WIDTH
      canvas.height = CANVAS_HEIGHT
      paintSiteTile(canvas, site, faction.color)
      siteCache.set(factionId, canvas)
    }
    cache.set(siteId, siteCache)
  }
  return cache
}
