import type { AIPersonality, RealmId, RNGState } from '~/shared/types'
import { nextRng } from '~/engine/random'

export type Personality = 'aggressive' | 'cautious'

export interface AIOption {
  kind: 'attack' | 'siege-continue' | 'cut-supply' | 'retreat' | 'idle'
  targetSiteId?: string
  armyId?: string
  score?: number
}

const PERSONALITY_WEIGHTS: Record<Personality, Partial<Record<AIOption['kind'], number>>> = {
  aggressive: { attack: 20, retreat: -15, 'siege-continue': 5 },
  cautious: { attack: -10, retreat: 20, 'siege-continue': 0 },
}

export function getPersonality(configured: AIPersonality, realmId: RealmId): Personality {
  if (configured === 'aggressive' || configured === 'cautious') {
    return configured
  }

  const sum = [...realmId].reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return sum % 2 === 0 ? 'aggressive' : 'cautious'
}

export function scoreOption(option: AIOption, personality: Personality): number {
  const base = PERSONALITY_WEIGHTS[personality][option.kind] ?? 0
  return base + (option.score ?? 0)
}

export function pickAction(
  options: readonly AIOption[],
  personality: Personality,
  rng: RNGState,
): { action: AIOption; nextRng: RNGState } {
  if (options.length === 0) {
    return { action: { kind: 'idle' }, nextRng: rng }
  }

  const scored = options.map(opt => ({ opt, score: scoreOption(opt, personality) }))
  const maxScore = Math.max(...scored.map(s => s.score))
  const topOptions = scored.filter(s => s.score === maxScore)

  const roll = nextRng(rng)
  const idx = Math.floor(roll.value * topOptions.length)
  const picked = topOptions[Math.min(idx, topOptions.length - 1)]!

  return { action: picked.opt, nextRng: roll.nextState }
}
