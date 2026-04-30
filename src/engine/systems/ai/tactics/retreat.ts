import type { Army, World } from '~/shared/types'
import type { AIOption } from '../utility-scorer'

/**
 * Evaluate whether the given army should fall back to an adjacent friendly site.
 *
 * Triggers when the army is meaningfully outnumbered (< 70% of a colocated enemy army)
 * or stuck in a siege whose supply is about to run out. A fallback target site must exist
 * and be owned by the army's own realm.
 */
export function evaluateRetreatOption(army: Army, world: World): AIOption | null {
  const nearbyEnemy = [...world.armies.values()].find(
    a => a.realmId !== army.realmId && a.location === army.location,
  )

  const weakVsEnemy = nearbyEnemy != null && army.manpower < nearbyEnemy.manpower * 0.7
  const inSiegeWithLowSupply = [...world.sieges.values()].some(
    s => s.attackerArmyIds.includes(army.id) && s.supplyRemaining < 5,
  )

  if (!weakVsEnemy && !inSiegeWithLowSupply) return null

  const armySite = world.sites.get(army.location)
  if (!armySite) return null

  const friendlySiteId = armySite.adjacency.find(id => {
    const site = world.sites.get(id)
    return site != null && site.ownerId === army.realmId
  })
  if (!friendlySiteId) return null

  const disadvantageScore = weakVsEnemy
    ? Math.min(50, (nearbyEnemy!.manpower / Math.max(1, army.manpower) - 1) * 50)
    : 30

  return {
    kind: 'retreat',
    armyId: army.id,
    targetSiteId: friendlySiteId,
    score: 40 + disadvantageScore,
  }
}
