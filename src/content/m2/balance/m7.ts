import type {
  EspionageActionKind,
  PersonalityArchetype,
} from '~/shared/types'

// === M7 Espionage System ===
export const M7_ENABLED: boolean = true

// Mission durations (ticks)
export const M7_RECON_DURATION_TICKS = 6
export const M7_RUMOR_DURATION_TICKS = 9
export const M7_DISCORD_DURATION_TICKS = 12

// Base success probabilities
export const M7_RECON_BASE_SUCCESS = 0.8
export const M7_RUMOR_BASE_SUCCESS = 0.5
export const M7_DISCORD_BASE_SUCCESS = 0.4

// Base exposure probabilities on failure
export const M7_LOW_RISK_EXPOSE_PROB = 0.1
export const M7_MID_RISK_EXPOSE_PROB = 0.5
export const M7_HIGH_RISK_EXPOSE_PROB = 1.0

// Effect magnitudes
export const M7_RECON_COVERAGE_GAIN = 5
export const M7_RUMOR_FACTION_DELTA = -25
export const M7_DISCORD_LOYALTY_DELTA = -15
export const M7_FAILURE_ATTITUDE_DELTA = -30
export const M7_FAILURE_TRUST_DELTA = -40

// Counter intel
export const M7_COUNTER_DETECTION_BONUS_PER_LEVEL = 0.1

// Spy skill bonus
export const M7_SPY_SKILL_BONUS_PER_MOU = 0.02

// Coverage visibility thresholds
export const M7_COVERAGE_TIER_1 = 30
export const M7_COVERAGE_TIER_2 = 60
export const M7_COVERAGE_TIER_3 = 90
export const M7_COVERAGE_MIN = 0
export const M7_COVERAGE_MAX = 100

// AI mission cadence
export const M7_COUNTER_INTEL_MAX_LEVEL = 10

// 8 archetype × 4 action weight matrix
export const M7_ESPIONAGE_WEIGHTS: Record<
  PersonalityArchetype,
  Record<EspionageActionKind, number>
> = {
  conqueror: {
    reconnaissance: 1.5,
    rumor: 0.8,
    discord: 1.0,
    counter_intel: 0.5,
  },
  steward: {
    reconnaissance: 1.0,
    rumor: 0.3,
    discord: 0.3,
    counter_intel: 2.0,
  },
  schemer: {
    reconnaissance: 2.0,
    rumor: 2.5,
    discord: 2.0,
    counter_intel: 1.5,
  },
  learned: {
    reconnaissance: 1.5,
    rumor: 0.5,
    discord: 0.3,
    counter_intel: 1.0,
  },
  tyrant: { reconnaissance: 1.0, rumor: 1.5, discord: 2.5, counter_intel: 0.3 },
  incompetent: {
    reconnaissance: 0.5,
    rumor: 0.5,
    discord: 0.5,
    counter_intel: 0.5,
  },
  benevolent: {
    reconnaissance: 0.5,
    rumor: 0.1,
    discord: 0.1,
    counter_intel: 2.5,
  },
  builder: {
    reconnaissance: 1.0,
    rumor: 0.3,
    discord: 0.3,
    counter_intel: 1.5,
  },
}
