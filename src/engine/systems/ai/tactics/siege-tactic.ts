import {
  AI_SIEGE_ADVANTAGE_SCORE_CAP,
  AI_SIEGE_BASE_SCORE,
  AI_SIEGE_MIN_ADVANTAGE_RATIO,
  AI_SIEGE_SUPPLY_SCORE,
} from '~/content/m2/balance'
import type { Army, World } from '~/shared/types'
import type { AIOption } from '../utility-scorer'

/**
 * Evaluate whether the given army should start (or continue) a siege at its current location.
 *
 * Triggers when an army has finished marching to an enemy-owned site (state='idle' with
 * destination still flagged) and brings a meaningful manpower advantage (>= 1.2x defenders).
 *
 * Returns null if the conditions are not met. Higher scores reflect a stronger advantage.
 */
export function evaluateSiegeOption(army: Army, world: World): AIOption | null {
  if (army.state !== 'idle' || !army.destination) return null

  const alreadySieging = [...world.sieges.values()].some(s => s.attackerArmyIds.includes(army.id))
  if (alreadySieging) return null

  const destSite = world.sites.get(army.location)
  if (!destSite || destSite.ownerId === army.realmId) return null

  const defenders = [...world.armies.values()].filter(
    a => a.location === army.location && a.realmId === destSite.ownerId,
  )
  const defenderManpower = defenders.reduce((sum, a) => sum + a.manpower, 0)
  if (defenderManpower === 0 || army.manpower < defenderManpower * AI_SIEGE_MIN_ADVANTAGE_RATIO) return null

  const advantageScore = Math.min(
    AI_SIEGE_ADVANTAGE_SCORE_CAP,
    (army.manpower / Math.max(1, defenderManpower) - AI_SIEGE_MIN_ADVANTAGE_RATIO) * 100,
  )

  return {
    kind: 'siege-continue',
    armyId: army.id,
    targetSiteId: army.location,
    score: AI_SIEGE_BASE_SCORE + AI_SIEGE_SUPPLY_SCORE + advantageScore,
  }
}
