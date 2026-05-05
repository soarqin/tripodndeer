import type { GameEvent, RNGState, World } from '~/shared/types'
import { nextRng } from '~/engine/random'
import { M7_ENABLED } from '~/content/m2/balance'
import { getPersonality, pickAction } from './utility-scorer'
import {
  createAiPhaseState,
  phaseStateWithDiplomacyResult,
  phaseStateWithEspionageResult,
  worldWithAiPhaseState,
} from './internal/phase-state'
import { applyTacticalAction, collectTacticalOptions } from './internal/tactical'
import { planDiplomacyAction } from './internal/diplomacy'
export { planEspionageAction } from './internal/espionage'
import { planEspionageAction } from './internal/espionage'

// IMPORTANT: realm and army iteration order is locked to lexicographic ID sort.
// This is a contract — changing iteration order breaks RNG reproducibility.

/**
 * AI planning phase step.
 * Only executes every 3 ticks (monthly).
 * Each non-player realm has 20% chance to pick one tactical action.
 *
 * Options considered per realm:
 *  - attack: march an idle army into an adjacent enemy site
 *  - siege-continue: start a siege on the enemy site the army is parked at
 *  - cut-supply: march to an adjacent enemy site to tighten an existing siege
 *  - retreat: fall back to a friendly adjacent site when outmatched or starving
 *  - idle: do nothing (always available, low score)
 */
export function aiPlanStep(
  world: World,
  rng: RNGState
): { world: World; nextRng: RNGState; events: readonly GameEvent[] } {
  if (world.tick % 3 !== 0) {
    return { world, nextRng: rng, events: [] }
  }

  const events: GameEvent[] = []
  let currentRng = rng
  let phaseState = createAiPhaseState(world)

  for (const realm of [...world.realms.values()].sort((a, b) =>
    a.id.localeCompare(b.id)
  )) {
    if (realm.id === world.playerRealmId) continue
    if (realm.status === 'deactivated') continue

    const diplomacyWorld = worldWithAiPhaseState(world, phaseState)
    const diplomacy = planDiplomacyAction(diplomacyWorld, realm)
    if (diplomacy.ok) {
      phaseState = phaseStateWithDiplomacyResult(phaseState, diplomacy.world)
      events.push(...diplomacy.events)
    }

    if (M7_ENABLED) {
      const espionageWorld = worldWithAiPhaseState(world, phaseState)
      const espionage = planEspionageAction(espionageWorld, realm, currentRng)
      if (espionage.ok) {
        phaseState = phaseStateWithEspionageResult(phaseState, espionage.world)
        events.push(...espionage.events)
        currentRng = espionage.nextRng
      }
    }

    const roll = nextRng(currentRng)
    currentRng = roll.nextState

    if (roll.value >= 0.2) continue

    const options = collectTacticalOptions(world, phaseState, realm.id)

    // If there are no concrete options (only idle) skip the action entirely so
    // we keep the historical "no candidate → no events / no extra rng draws" contract.
    if (options.length === 1) continue

    const personality = getPersonality(world, realm.id)
    const { action, nextRng: pickRng } = pickAction(
      options,
      personality,
      currentRng
    )
    currentRng = pickRng

    if (action.kind === 'idle') continue
    if (!action.targetSiteId || !action.armyId) continue

    const result = applyTacticalAction(world, phaseState, realm.id, action)
    phaseState = result.phaseState
    events.push(...result.events)
  }

  return {
    world: worldWithAiPhaseState(world, phaseState),
    nextRng: currentRng,
    events,
  }
}
