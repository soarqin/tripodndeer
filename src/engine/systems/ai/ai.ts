import type { GameEvent, Realm, RNGState, World } from '~/shared/types'
import { M7_ENABLED } from '~/content/m2/balance'
import {
  type AiTickContext,
  tickContextWithDiplomacyResult,
  tickContextWithEspionageResult,
  worldWithAiTickContext,
} from './internal/tick-context'
import { planDiplomacyAction } from './internal/diplomacy'
export { planEspionageAction } from './internal/espionage'
import { planEspionageAction } from './internal/espionage'

export function runDiplomacyForRealm(
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

export function runEspionageForRealm(
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
// IMPORTANT: realm and army iteration order is locked to lexicographic ID sort.
// This is a contract — changing iteration order breaks RNG reproducibility.
