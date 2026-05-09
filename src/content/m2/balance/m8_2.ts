import type { DifficultyTier, DiplomaticMemoryEventKind, RulerPersonalityProfile } from '~/shared/types'

export interface DifficultyProfile {
  aiDecisionQuality: number
  strategicTruncation: boolean
  incompetentMix: number
  aiEconomyMul: number
  aiManpowerMul: number
  playerEconomyMul: number
  playerManpowerMul: number
}

export const M8_2_DIFFICULTY_PROFILES: Readonly<Record<DifficultyTier, DifficultyProfile>> = {
  weak: {
    aiDecisionQuality: 0.7,
    strategicTruncation: true,
    incompetentMix: 0.4,
    aiEconomyMul: 1.0,
    aiManpowerMul: 1.0,
    playerEconomyMul: 1.1,
    playerManpowerMul: 1.1,
  },
  common: {
    aiDecisionQuality: 0.8,
    strategicTruncation: true,
    incompetentMix: 0.2,
    aiEconomyMul: 1.0,
    aiManpowerMul: 1.0,
    playerEconomyMul: 1.0,
    playerManpowerMul: 1.0,
  },
  hero: {
    aiDecisionQuality: 1.0,
    strategicTruncation: false,
    incompetentMix: 0.0,
    aiEconomyMul: 1.0,
    aiManpowerMul: 1.0,
    playerEconomyMul: 1.0,
    playerManpowerMul: 1.0,
  },
  hegemon: {
    aiDecisionQuality: 1.0,
    strategicTruncation: false,
    incompetentMix: 0.0,
    aiEconomyMul: 1.1,
    aiManpowerMul: 1.1,
    playerEconomyMul: 1.0,
    playerManpowerMul: 1.0,
  },
  sage: {
    aiDecisionQuality: 1.0,
    strategicTruncation: false,
    incompetentMix: 0.0,
    aiEconomyMul: 1.2,
    aiManpowerMul: 1.2,
    playerEconomyMul: 1.0,
    playerManpowerMul: 1.0,
  },
} as const

export const M8_2_MEMORY_DECAY_FACTOR_PER_XUN = 0.99
export const M8_2_MEMORY_MAX_SCORE = 100
export const M8_2_MEMORY_MIN_SCORE = 1
export const M8_2_MEMORY_BUFFER_SIZE = 10
export const M8_2_MEMORY_PUSHCANDIDATE_WEIGHT = 0.5
export const M8_2_BORDER_SKIRMISH_ARMY_THRESHOLD = 1000

export const M8_2_MEMORY_EVENT_BASE_WEIGHT: Record<DiplomaticMemoryEventKind, number> = {
  broken_alliance: 30,
  broken_peace: 25,
  unprovoked_war: 20,
  spy_caught: 15,
  battlefield_victory: 10,
  border_skirmish: 5,
}

export interface DriftRule {
  trigger: 'catastrophic_loss' | 'repeated_betrayal_success' | 'prolonged_prosperity'
  dimension: keyof Omit<RulerPersonalityProfile, 'preferredStrategy'>
  delta: number
}

export const M8_2_DRIFT_RULES: readonly DriftRule[] = [
  { trigger: 'catastrophic_loss', dimension: 'caution', delta: 0.05 },
  { trigger: 'repeated_betrayal_success', dimension: 'diplomaticTrust', delta: -0.05 },
  { trigger: 'prolonged_prosperity', dimension: 'reformInclination', delta: 0.03 },
]

export const M8_2_DRIFT_CLAMP_MIN = 0
export const M8_2_DRIFT_CLAMP_MAX = 1
