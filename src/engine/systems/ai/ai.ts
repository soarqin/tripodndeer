import type { GameEvent, Realm, RNGState, World } from '~/shared/types'
import { nextRng } from '~/engine/random'
import { M7_ENABLED } from '~/content/m2/balance'
import { getPersonality, pickAction } from './utility-scorer'
import {
  createAiTickContext,
  type AiTickContext,
  tickContextWithDiplomacyResult,
  tickContextWithEspionageResult,
  worldWithAiTickContext,
} from './internal/tick-context'
import { applyTacticalAction, collectTacticalOptions } from './internal/tactical'
import { planDiplomacyAction } from './internal/diplomacy'
export { planEspionageAction } from './internal/espionage'
import { planEspionageAction } from './internal/espionage'

function runDiplomacyForRealm(
  world: World,
  realm: Realm,
  ctx: AiTickContext,
  _rng: RNGState
): { ctx: AiTickContext; events: readonly GameEvent[]; nextRng: RNGState } {
  const diplomacyWorld = worldWithAiTickContext(world, ctx)
  const diplomacy = planDiplomacyAction(diplomacyWorld, realm)
  if (diplomacy.ok) {
    return {
      ctx: tickContextWithDiplomacyResult(ctx, diplomacy.world),
      events: diplomacy.events,
      nextRng: _rng,
    }
  }
  return { ctx, events: [], nextRng: _rng }
}

function runEspionageForRealm(
  world: World,
  realm: Realm,
  ctx: AiTickContext,
  rng: RNGState
): { ctx: AiTickContext; events: readonly GameEvent[]; nextRng: RNGState } {
  if (!M7_ENABLED) {
    return { ctx, events: [], nextRng: rng }
  }
  const espionageWorld = worldWithAiTickContext(world, ctx)
  const espionage = planEspionageAction(espionageWorld, realm, rng)
  if (espionage.ok) {
    return {
      ctx: tickContextWithEspionageResult(ctx, espionage.world),
      events: espionage.events,
      nextRng: espionage.nextRng,
    }
  }
  return { ctx, events: [], nextRng: rng }
}

function runTacticalForRealm(
  world: World,
  realm: Realm,
  ctx: AiTickContext,
  rng: RNGState
): { ctx: AiTickContext; events: readonly GameEvent[]; nextRng: RNGState } {
  // 20% gate — PRESERVE THIS EXACT LOCATION (T3.5/T4.1 will relocate it; T1.5 freezes it here)
  const roll = nextRng(rng)
  const currentRng = roll.nextState
  if (roll.value >= 0.2) {
    return { ctx, events: [], nextRng: currentRng }
  }

  const options = collectTacticalOptions(world, ctx, realm.id)
  if (options.length === 1) {
    return { ctx, events: [], nextRng: currentRng }
  }

  const personality = getPersonality(world, realm.id)
  const { action, nextRng: pickRng } = pickAction(options, personality, currentRng)
  let postPickRng = pickRng

  if (action.kind === 'idle') return { ctx, events: [], nextRng: postPickRng }
  if (!action.targetSiteId || !action.armyId) return { ctx, events: [], nextRng: postPickRng }

  const result = applyTacticalAction(world, ctx, realm.id, action)
  return {
    ctx: result.tickContext,
    events: result.events,
    nextRng: postPickRng,
  }
}

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
  let tickContext = createAiTickContext(world)

  for (const realm of [...world.realms.values()].sort((a, b) =>
    a.id.localeCompare(b.id)
  )) {
    if (realm.id === world.playerRealmId) continue
    if (realm.status === 'deactivated') continue

    const diplomacy = runDiplomacyForRealm(world, realm, tickContext, currentRng)
    tickContext = diplomacy.ctx
    events.push(...diplomacy.events)

    const espionage = runEspionageForRealm(world, realm, tickContext, currentRng)
    tickContext = espionage.ctx
    events.push(...espionage.events)
    currentRng = espionage.nextRng

    const tactical = runTacticalForRealm(world, realm, tickContext, currentRng)
    tickContext = tactical.ctx
    events.push(...tactical.events)
    currentRng = tactical.nextRng

  }

  return {
    world: worldWithAiTickContext(world, tickContext),
    nextRng: currentRng,
    events,
  }
}
