import {
  AI_CUT_SUPPLY_BASE_SCORE,
  AI_CUT_SUPPLY_ENEMY_CONTROL_SCORE_SCALE,
  AI_CUT_SUPPLY_MAX_ENCIRCLEMENT,
  AI_CUT_SUPPLY_MIN_MANPOWER,
} from '~/content/m2/balance'
import type { Army, Site, World } from '~/shared/types'
import type { AIOption } from '../utility-scorer'

/**
 * Evaluate whether the given army should march to an enemy-controlled adjacent site
 * in order to tighten the encirclement of the site it is currently besieging.
 *
 * The army must already be in an active siege and have at least 1500 manpower. We refuse to
 * cut more supply lines once we already control 50% or more of the defender's adjacent sites.
 */
export function evaluateCutSupplyOption(army: Army, world: World): AIOption | null {
  const activeSiege = [...world.sieges.values()].find(s => s.attackerArmyIds.includes(army.id))
  if (!activeSiege) return null
  if (army.manpower < AI_CUT_SUPPLY_MIN_MANPOWER) return null

  const destSite = world.sites.get(activeSiege.defenderSiteId)
  if (!destSite) return null

  const adjacentSites = destSite.adjacency
    .map(id => world.sites.get(id))
    .filter((s): s is Site => s != null && s.ownerId !== army.realmId)

  const totalAdjacent = destSite.adjacency.length
  const enemyControlled = adjacentSites.length
  const encirclement = 1 - enemyControlled / Math.max(1, totalAdjacent)

  if (encirclement >= AI_CUT_SUPPLY_MAX_ENCIRCLEMENT) return null

  const targetSite = adjacentSites[0]
  if (!targetSite) return null

  return {
    kind: 'cut-supply',
    armyId: army.id,
    targetSiteId: targetSite.id,
    score: AI_CUT_SUPPLY_BASE_SCORE + (enemyControlled / Math.max(1, totalAdjacent)) * AI_CUT_SUPPLY_ENEMY_CONTROL_SCORE_SCALE,
  }
}
