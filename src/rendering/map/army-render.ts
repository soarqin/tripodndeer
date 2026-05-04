import type { Army, Site, Realm, ArmyId, RealmId } from '~/shared/types'
import { makeCoverageKey, type CoverageKey } from '~/shared/types'
import { getCoverageTier } from '~/engine/systems/espionage/coverage-tier'

const ARMY_RADIUS = 8
const ARMY_FONT = 'bold 9px sans-serif'
const SELECTION_COLOR = '#FFD700'
const SELECTION_LINE_WIDTH = 2
const FOG_HIGH_BORDER_COLOR = '#C0C0C0'
const FOG_HIGH_BORDER_WIDTH = 1

export function drawArmies(
  ctx: CanvasRenderingContext2D,
  armies: ReadonlyMap<ArmyId, Army>,
  sites: ReadonlyMap<string, Site>,
  realms: ReadonlyMap<string, Realm>,
  selectedArmyId: ArmyId | null,
  playerRealmId: RealmId,
  intelligenceCoverage: ReadonlyMap<CoverageKey, number>,
  activeAllies: ReadonlySet<RealmId>,
  m7Enabled: boolean,
): void {
  ctx.save()

  for (const army of armies.values()) {
    const site = sites.get(army.location)
    if (!site) continue

    let showManpower = true
    let showDot = true
    let showHighBorder = false

    if (m7Enabled && army.realmId !== playerRealmId && !activeAllies.has(army.realmId)) {
      const coverage = intelligenceCoverage.get(makeCoverageKey(playerRealmId, army.realmId)) ?? 0
      const tier = getCoverageTier(coverage)
      if (tier === 'hidden') {
        showDot = false
        showManpower = false
      } else if (tier === 'low') {
        showManpower = false
      } else if (tier === 'high') {
        showHighBorder = true
      }
    }

    if (!showDot) continue

    const realm = realms.get(army.realmId)
    const color = realm?.color ?? '#888888'
    const [cx, cy] = site.position

    ctx.beginPath()
    ctx.arc(cx, cy, ARMY_RADIUS, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()

    if (army.id === selectedArmyId) {
      ctx.strokeStyle = SELECTION_COLOR
      ctx.lineWidth = SELECTION_LINE_WIDTH
      ctx.stroke()
    } else if (showHighBorder) {
      ctx.strokeStyle = FOG_HIGH_BORDER_COLOR
      ctx.lineWidth = FOG_HIGH_BORDER_WIDTH
      ctx.stroke()
    }

    if (showManpower) {
      ctx.fillStyle = '#FFFFFF'
      ctx.font = ARMY_FONT
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const label = army.manpower >= 1000
        ? `${Math.floor(army.manpower / 1000)}k`
        : String(army.manpower)
      ctx.fillText(label, cx, cy)
    }
  }

  ctx.restore()
}
