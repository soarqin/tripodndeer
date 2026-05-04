import type {
  RealmId,
  RNGState,
  PersonalityArchetype,
  World,
} from '~/shared/types'
import { nextRng } from '~/engine/random'
import { M5_PERSONALITY_WEIGHTS } from '~/content/m2/balance'

export interface AIOption {
  kind:
    | 'attack'
    | 'siege-continue'
    | 'cut-supply'
    | 'retreat'
    | 'idle'
    | 'economy'
    | 'diplomacy'
    | 'recruit'
  targetSiteId?: string
  armyId?: string
  score?: number
}

export function getPersonality(
  world: World,
  realmId: RealmId
): PersonalityArchetype {
  const ruler = world.rulers.get(realmId)
  if (ruler) {
    return ruler.personality
  }

  const realm = world.realms.get(realmId)
  const configured = realm?.aiPersonality

  if (configured === 'aggressive') return 'conqueror'
  if (configured === 'cautious') return 'steward'
  if (configured === 'aggressive_random') return 'schemer'

  return 'incompetent'
}

export function scoreOption(
  option: AIOption,
  personality: PersonalityArchetype
): number {
  const weight = M5_PERSONALITY_WEIGHTS[personality]?.[option.kind] ?? 1.0
  return (option.score ?? 0) * weight
}

export function pickAction(
  options: readonly AIOption[],
  personality: PersonalityArchetype,
  rng: RNGState
): { action: AIOption; nextRng: RNGState } {
  if (options.length === 0) {
    return { action: { kind: 'idle' }, nextRng: rng }
  }

  const scored = options.map((opt) => ({
    opt,
    score: scoreOption(opt, personality),
  }))
  const maxScore = Math.max(...scored.map((s) => s.score))
  const topOptions = scored.filter((s) => s.score === maxScore)

  const roll = nextRng(rng)
  const idx = Math.floor(roll.value * topOptions.length)
  const picked = topOptions[Math.min(idx, topOptions.length - 1)]!

  return { action: picked.opt, nextRng: roll.nextState }
}
