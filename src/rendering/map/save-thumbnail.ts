import type { World } from '@/shared/types'
import { buildSitePathFromBoundary } from './tile-cache'

const THUMBNAIL_WIDTH = 300
const THUMBNAIL_HEIGHT = 200
const MAP_WIDTH = 800
const MAP_HEIGHT = 600
const BACKGROUND_COLOR = '#F5EFD9'
const BORDER_COLOR = '#1A1A1A'

export async function generateThumbnail(world: World): Promise<string> {
  // Use document.createElement for JSDOM compatibility in tests
  const canvas = document.createElement('canvas')
  canvas.width = THUMBNAIL_WIDTH
  canvas.height = THUMBNAIL_HEIGHT
  
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Failed to get 2d context for thumbnail generation')
  }

  // Fill background
  ctx.fillStyle = BACKGROUND_COLOR
  ctx.fillRect(0, 0, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT)

  // Scale context to map coordinates
  ctx.scale(THUMBNAIL_WIDTH / MAP_WIDTH, THUMBNAIL_HEIGHT / MAP_HEIGHT)

  // Draw sites
  for (const site of world.sites.values()) {
    const path = buildSitePathFromBoundary(site, world.edges)
    
    const owner = site.ownerId ? world.realms.get(site.ownerId) : null
    ctx.fillStyle = owner ? owner.color : '#CCCCCC'
    ctx.fill(path)
    
    ctx.strokeStyle = BORDER_COLOR
    // Scale line width inversely to keep it visible but thin
    ctx.lineWidth = 1.2 * (MAP_WIDTH / THUMBNAIL_WIDTH)
    ctx.stroke(path)
  }

  // We don't draw armies or text for the thumbnail to keep it clean and fast
  
  return canvas.toDataURL('image/png')
}
