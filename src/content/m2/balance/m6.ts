// M6 Feature Flag
export const M6_ENABLED: boolean = true

// M6 Cultural conversion (D9 three-tier)
export const M6_CULTURAL_CHINESE_TO_CHINESE_YEARS = 50
export const M6_CULTURAL_CHINESE_TO_BARBARIAN_YEARS = 200
export const M6_CULTURAL_BARBARIAN_TO_BARBARIAN_YEARS = 100
export const M6_CULTURAL_FLIP_THRESHOLD = 30
export const M6_CULTURAL_DRIFT_PER_TICK = 0.1
export const M6_CULTURAL_CONQUEST_DROP = 30

// M6 Ideology source weights (sum = 1.0)
export const M6_IDEOLOGY_RULER_PERSONALITY_WEIGHT = 0.4
export const M6_IDEOLOGY_TALENT_WEIGHT = 0.2
export const M6_IDEOLOGY_POLICY_WEIGHT = 0.2
export const M6_IDEOLOGY_ACADEMY_WEIGHT = 0.2

// M6 Academy production ratios (sum = 1.0)
export const M6_ACADEMY_HOST_RATIO = 0.6
export const M6_ACADEMY_NEAR_RATIO = 0.3
export const M6_ACADEMY_FAR_RATIO = 0.1
export const M6_ACADEMY_PRODUCTION_PER_YEAR = 1

// M6 Prestige source weights (sum = 1.0)
export const M6_PRESTIGE_LEGITIMACY_WEIGHT = 0.3
export const M6_PRESTIGE_CULTURE_DIFFUSION_WEIGHT = 0.2
export const M6_PRESTIGE_MILITARY_WEIGHT = 0.2
export const M6_PRESTIGE_RITUAL_WEIGHT = 0.15
export const M6_PRESTIGE_ALLIANCE_WEIGHT = 0.15
export const M6_PRESTIGE_VICTORY_BONUS = 5
export const M6_PRESTIGE_USURPATION_PENALTY = -30

// M6 Diplomacy hooks
export const M6_PRESTIGE_DIFFERENTIAL_WEIGHT = 0.5
export const M6_IDEOLOGY_DISTANCE_WEIGHT = 20

// M6 Succession
export const M6_LEGITIMACY_BONUS_THRESHOLD = 60
export const M6_LEGITIMACY_BONUS_MULTIPLIER = 1.1

// M6 Tribute cultural pull
export const M6_TRIBUTE_CULTURAL_PULL_PER_YEAR = 2
