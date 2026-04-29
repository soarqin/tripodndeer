import type { Army, Site, Realm, ArmyId } from '~/shared/types'

const ARMY_RADIUS = 8
const ARMY_FONT = 'bold 9px sans-serif'
const SELECTION_COLOR = '#FFD700' // gold
const SELECTION_LINE_WIDTH = 2

/**
 * Draw all armies on the canvas.
 * Each army is a colored circle with manpower number.
 * Selected army gets a gold border.
 */
export function drawArmies(
  ctx: CanvasRenderingContext2D,
  armies: ReadonlyMap<ArmyId, Army>,
  sites: ReadonlyMap<string, Site>,
  realms: ReadonlyMap<string, Realm>,
  selectedArmyId: ArmyId | null,
): void {
  ctx.save()

  for (const army of armies.values()) {
    const site = sites.get(army.location)
    if (!site) continue

    const realm = realms.get(army.realmId)
    const color = realm?.color ?? '#888888'

    const [cx, cy] = site.position

    // Draw circle
    ctx.beginPath()
    ctx.arc(cx, cy, ARMY_RADIUS, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()

    // Draw selection highlight
    if (army.id === selectedArmyId) {
      ctx.strokeStyle = SELECTION_COLOR
      ctx.lineWidth = SELECTION_LINE_WIDTH
      ctx.stroke()
    }

    // Draw manpower number
    ctx.fillStyle = '#FFFFFF'
    ctx.font = ARMY_FONT
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const label = army.manpower >= 1000
      ? `${Math.floor(army.manpower / 1000)}k`
      : String(army.manpower)
    ctx.fillText(label, cx, cy)
  }

  ctx.restore()
}
