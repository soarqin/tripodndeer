import {
  AI_RETREAT_BASE_SCORE,
  AI_RETREAT_DISADVANTAGE_SCORE_CAP,
  AI_RETREAT_DISADVANTAGE_SCORE_SCALE,
  AI_RETREAT_LOW_SUPPLY_SCORE,
  AI_RETREAT_LOW_SUPPLY_THRESHOLD,
  AI_RETREAT_OUTNUMBERED_RATIO,
} from '~/content/m2/balance'
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

  const weakVsEnemy = nearbyEnemy != null && army.manpower < nearbyEnemy.manpower * AI_RETREAT_OUTNUMBERED_RATIO
  const inSiegeWithLowSupply = [...world.sieges.values()].some(
    s => s.attackerArmyIds.includes(army.id) && s.supplyRemaining < AI_RETREAT_LOW_SUPPLY_THRESHOLD,
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
    ? Math.min(
      AI_RETREAT_DISADVANTAGE_SCORE_CAP,
      (nearbyEnemy!.manpower / Math.max(1, army.manpower) - 1) * AI_RETREAT_DISADVANTAGE_SCORE_SCALE,
    )
    : AI_RETREAT_LOW_SUPPLY_SCORE

  return {
    kind: 'retreat',
    armyId: army.id,
    targetSiteId: friendlySiteId,
    score: AI_RETREAT_BASE_SCORE + disadvantageScore,
  }
}
