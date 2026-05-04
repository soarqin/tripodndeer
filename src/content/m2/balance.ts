import type {
  EdictKind,
  EspionageActionKind,
  PersonalityArchetype,
  Specialty,
} from '~/shared/types'

export type UnitType = 'infantry' | 'chariot' | 'cavalry' | 'crossbow'
export type TerrainType =
  | 'plains'
  | 'hills'
  | 'mountains'
  | 'forest'
  | 'swamp'
  | 'grassland'
  | 'desert'
export type TacticId =
  | 'qi-zheng'
  | 'sheng-dong'
  | 'you-di'
  | 'bei-shui'
  | 'wei-shi'
  | 'yi-zhan'
  | 'pi-di'

export const UNIT_BASE_POWER: Record<UnitType, number> = {
  infantry: 10,
  chariot: 15,
  cavalry: 12,
  crossbow: 11,
}

// Counter matrix: attacker row vs defender column
// Values > 1.0 mean attacker advantage, < 1.0 mean disadvantage
export const UNIT_COUNTER_MATRIX: Record<UnitType, Record<UnitType, number>> = {
  infantry: { infantry: 1.0, chariot: 0.8, cavalry: 1.2, crossbow: 1.3 },
  chariot: { infantry: 1.2, chariot: 1.0, cavalry: 1.1, crossbow: 0.6 },
  cavalry: { infantry: 0.9, chariot: 0.9, cavalry: 1.0, crossbow: 1.1 },
  crossbow: { infantry: 0.8, chariot: 1.4, cavalry: 0.9, crossbow: 1.0 },
}

export const TERRAIN_DEFENSE: Record<TerrainType, number> = {
  plains: 0.0,
  hills: 0.2,
  mountains: 0.5,
  forest: 0.25,
  swamp: 0.3,
  grassland: -0.1,
  desert: -0.2,
}

export const TERRAIN_TRAVEL_COST: Record<TerrainType, number> = {
  plains: 1.0,
  hills: 1.3,
  mountains: 2.0,
  forest: 1.4,
  swamp: 1.8,
  grassland: 0.9,
  desert: 1.6,
}

export const GENERAL_MIGHT_SCALING = 0.01
export const GENERAL_COMMAND_CAP_BASE = 5000
export const GENERAL_LOSER_DEATH_RATE = 0.05
export const GENERAL_WINNER_DEATH_RATE = 0.01

export interface TacticEffect {
  attackMultiplier?: number
  defenseMultiplier?: number
  lossBonusMultiplier?: number
  moraleCrashChance?: number
  postBattleManpowerGain?: number
}

export const TACTIC_COSTS: Record<TacticId, number> = {
  'qi-zheng': 15,
  'sheng-dong': 10,
  'you-di': 8,
  'bei-shui': 20,
  'wei-shi': 12,
  'yi-zhan': 5,
  'pi-di': 0,
}

export const TACTIC_EFFECTS: Record<TacticId, TacticEffect> = {
  'qi-zheng': { attackMultiplier: 1.2, defenseMultiplier: 0.8 },
  'sheng-dong': { defenseMultiplier: 0.8 },
  'you-di': { attackMultiplier: 1.3 },
  'bei-shui': { attackMultiplier: 1.5, lossBonusMultiplier: 1.3 },
  'wei-shi': { moraleCrashChance: 0.4 },
  'yi-zhan': { postBattleManpowerGain: 500 },
  'pi-di': { defenseMultiplier: 0.75 },
}

export const MANPOWER_RECOVERY_PER_MONTH = 500
export const WAR_WEARINESS_PER_MONTH_AT_WAR = 5
export const WAR_WEARINESS_RECOVERY_THRESHOLD = 30
export const RNG_VARIANCE_PERCENT = 0.1
export const DEFAULT_TRAVEL_COST = 3
export const FRIENDLY_PASS_TRAVEL_MULTIPLIER = 0.8
export const PEACE_INDEMNITY_MAX = 100000
export const PEACE_TRIBUTE_AMOUNT_MAX = 5000
export const PEACE_TRIBUTE_YEARS_MAX = 10

export const M4_DEFAULT_REALM_TREASURY = 1000
export const M4_DEFAULT_REALM_FOOD_STORES = 2000
export const M4_DEFAULT_TAX_RATE = 10
export const M4_MAX_TAX_RATE = 50
export const M4_DEFAULT_SITE_POPULATION = 10000
export const M4_HOUSEHOLD_DIVISOR = 5
export const M4_BASE_FOOD_PRODUCTION_PER_HOUSEHOLD = 2
export const M4_FOOD_CONSUMPTION_PER_HOUSEHOLD = 3
export const M4_BASE_TAX_PER_HOUSEHOLD = 1
export const M4_TAX_RATE_DIVISOR = 100
export const M4_POPULATION_GROWTH_BASIS_POINTS = 100
export const M4_BASIS_POINTS_DIVISOR = 10000
export const M4_EDICT_TAX_RELIEF_MODIFIER = -5
export const M4_EDICT_GRAIN_RESERVE_MODIFIER = 10
export const M4_EDICT_TAX_RELIEF_TAX_INCOME_BASIS_POINTS = -2500
export const M4_EDICT_TAX_RELIEF_POPULATION_GROWTH_BASIS_POINTS = 5
export const M4_EDICT_GRAIN_RESERVE_FOOD_PRODUCTION_BASIS_POINTS = 1000
export const M4_EDICT_GRAIN_RESERVE_TREASURY_COST = 10
/** @deprecated since M5 — replaced by attrs.zheng-based calculation (M5_GOVERNOR_TAX_BONUS_PER_ZHENG × zheng) */
export const M4_GOVERNOR_TAX_MODIFIER = 5
/** @deprecated since M5 — replaced by attrs.zheng-based calculation (M5_GOVERNOR_FOOD_BONUS_PER_ZHENG × zheng) */
export const M4_GOVERNOR_FOOD_MODIFIER = 5
export const M4_TRIBUTE_AMOUNT_MIN = 0
export const M4_TRIBUTE_AMOUNT_MAX = 5000
export const M4_INDEMNITY_AMOUNT_MAX = 100000
export const M4_MONTHS_PER_SEASON = 3
export const M4_MONTHS_PER_YEAR = 12

export const AI_SIEGE_MIN_ADVANTAGE_RATIO = 1.2
export const AI_SIEGE_BASE_SCORE = 60
export const AI_SIEGE_SUPPLY_SCORE = 30
export const AI_SIEGE_ADVANTAGE_SCORE_CAP = 50

export const AI_CUT_SUPPLY_MIN_MANPOWER = 1500
export const AI_CUT_SUPPLY_MAX_ENCIRCLEMENT = 0.5
export const AI_CUT_SUPPLY_BASE_SCORE = 40
export const AI_CUT_SUPPLY_ENEMY_CONTROL_SCORE_SCALE = 30

export const AI_RETREAT_OUTNUMBERED_RATIO = 0.7
export const AI_RETREAT_LOW_SUPPLY_THRESHOLD = 5
export const AI_RETREAT_BASE_SCORE = 40
export const AI_RETREAT_LOW_SUPPLY_SCORE = 30
export const AI_RETREAT_DISADVANTAGE_SCORE_CAP = 50
export const AI_RETREAT_DISADVANTAGE_SCORE_SCALE = 50

export const DIPLOMACY_ATTITUDE_MIN = -100
export const DIPLOMACY_ATTITUDE_MAX = 100
export const DIPLOMACY_TRUST_MIN = 0
export const DIPLOMACY_TRUST_MAX = 100
export const DIPLOMACY_PROPOSAL_DURATION_TICKS = 9
export const DIPLOMACY_TRUCE_DURATION_TICKS = 36
export const DIPLOMACY_NON_AGGRESSION_DURATION_TICKS = 72
export const DIPLOMACY_COALITION_THREAT_THRESHOLD = 70
export const DIPLOMACY_COALITION_DISSOLVE_THREAT_THRESHOLD = 45
export const DIPLOMACY_COALITION_MIN_MEMBERS = 2
export const DIPLOMACY_COALITION_WAR_THREAT_BONUS = 20
export const DIPLOMACY_BETRAYAL_TRUST_DELTA = -30
export const DIPLOMACY_THIRD_PARTY_DECLARE_WAR_AGGRESSOR_ATTITUDE_DELTA = -12
export const DIPLOMACY_THIRD_PARTY_DECLARE_WAR_AGGRESSOR_TRUST_DELTA = -6
export const DIPLOMACY_THIRD_PARTY_DECLARE_WAR_TARGET_ATTITUDE_DELTA = 4
export const DIPLOMACY_THIRD_PARTY_DECLARE_WAR_TARGET_TRUST_DELTA = 2
export const DIPLOMACY_ACCEPTANCE_BASE = 0
export const DIPLOMACY_ACCEPTANCE_ATTITUDE_THRESHOLD = 0
export const DIPLOMACY_ACCEPTANCE_TRUST_THRESHOLD = 50
export const DIPLOMACY_ACCEPTANCE_ATTITUDE_WEIGHT = 0.5
export const DIPLOMACY_ACCEPTANCE_TRUST_WEIGHT = 0.4
export const DIPLOMACY_ACCEPTANCE_EXISTING_WAR_MODIFIER = -40
export const DIPLOMACY_ACCEPTANCE_TRUCE_MODIFIER = -80
export const DIPLOMACY_ACCEPTANCE_TREATY_CONFLICT_MODIFIER = -60
export const DIPLOMACY_ACCEPTANCE_THREAT_WEIGHT = 0.2
export const DIPLOMACY_ZHOU_INVESTITURE_ACCEPTANCE_MODIFIER = 10
export const DIPLOMACY_ZHOU_INVESTITURE_REACTION_MODIFIER = 10
export const DIPLOMACY_THREAT_SITE_POWER = 10
export const DIPLOMACY_THREAT_ARMY_MANPOWER_DIVISOR = 1000
export const DIPLOMACY_THREAT_MANPOWER_DIVISOR = 1000
export const DIPLOMACY_RELATION_DRIFT_INTERVAL_TICKS = 6
export const DIPLOMACY_RELATION_DRIFT_DELTA = 1
export const DIPLOMACY_RELATION_NEUTRAL_ATTITUDE = 0
export const DIPLOMACY_RELATION_NEUTRAL_TRUST = 50
export const DIPLOMACY_ACTION_COSTS = {
  alliance: 35,
  non_aggression: 15,
  tribute: 25,
  marriage: 20,
  envoy: 5,
  declare_war: 30,
  peace: 10,
}

export const M5_RULER_BASE_LIFESPAN = 65
export const M5_RULER_LIFESPAN_VARIANCE = 5
export const M5_HEALTH_DECREASE_PER_YEAR = 1
export const M5_HEALTH_DEATH_THRESHOLD = 0

export const M5_LOYALTY_SHIRKING_THRESHOLD = 60
export const M5_LOYALTY_DEPARTURE_THRESHOLD = 40
export const M5_LOYALTY_SECRET_CONTACT_THRESHOLD = 25
export const M5_LOYALTY_DEFECTION_THRESHOLD = 10

export const M5_RECRUITMENT_PER_REALM_PER_YEAR = 1
export const M5_RECRUITMENT_NAMING_POOL_SIZE = 60

export const M5_GOVERNOR_TAX_BONUS_PER_ZHENG = 0.5
export const M5_GOVERNOR_FOOD_BONUS_PER_ZHENG = 0.5

export const M5_ARMY_CAP_BONUS_PER_WU = 100

export const M5_PERSONALITY_WEIGHTS: Record<string, Record<string, number>> = {
  conqueror: {
    attack: 3.0,
    retreat: 0.5,
    'siege-continue': 2.0,
    recruit: 1.5,
    diplomacy: 0.5,
    economy: 0.5,
  },
  steward: {
    attack: 0.5,
    retreat: 1.5,
    'siege-continue': 0.5,
    recruit: 1.0,
    diplomacy: 1.5,
    economy: 3.0,
  },
  schemer: {
    attack: 1.5,
    retreat: 1.0,
    'siege-continue': 1.5,
    recruit: 1.0,
    diplomacy: 2.0,
    economy: 1.0,
  },
  learned: {
    attack: 0.5,
    retreat: 1.0,
    'siege-continue': 0.5,
    recruit: 1.0,
    diplomacy: 2.0,
    economy: 2.5,
  },
  tyrant: {
    attack: 2.5,
    retreat: 0.3,
    'siege-continue': 2.5,
    recruit: 1.5,
    diplomacy: 0.3,
    economy: 0.5,
  },
  incompetent: {
    attack: 1.0,
    retreat: 1.5,
    'siege-continue': 0.5,
    recruit: 0.5,
    diplomacy: 1.0,
    economy: 1.0,
  },
  benevolent: {
    attack: 0.3,
    retreat: 2.0,
    'siege-continue': 0.3,
    recruit: 1.0,
    diplomacy: 2.5,
    economy: 2.0,
  },
  builder: {
    attack: 0.5,
    retreat: 1.0,
    'siege-continue': 0.5,
    recruit: 1.5,
    diplomacy: 1.5,
    economy: 3.0,
  },
}

export const M5_SPECIALTY_WEIGHTS_RECRUITMENT: Record<string, number> = {
  commander: 0.1,
  warrior: 0.2,
  strategist: 0.15,
  administrator: 0.2,
  reformer: 0.05,
  diplomat: 0.1,
  spy: 0.08,
  scholar: 0.07,
  engineer: 0.05,
}

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

// === M4.1 Reform System ===
export const M41_AI_REFORM_CHECK_INTERVAL_TICKS = 36

export const M41_AI_PERSONALITY_REFORM_PROPENSITY: Record<string, number> = {
  builder: 0.4,
  conqueror: 0.25,
  steward: 0,
  schemer: 0,
  learned: 0,
  tyrant: 0,
  incompetent: 0,
  benevolent: 0,
}

export const M41_REFORM_FAILURE_TREASURY_LOSS = 2000
export const M41_REFORM_FAILURE_COOLDOWN_YEARS = 10
export const M41_REFORM_FAILED_SCAR_TRAIT = 'reform_failed_scar'
export const M41_REFORMS_COUNT = 4
export const M41_REFORM_TRAIT_DIMENSIONS_COUNT = 6
export const M41_REFORM_PREDICATE_KINDS_COUNT = 12
export const M41_REFORMER_GRACE_PERIOD_YEARS = 2
export const M41_REFORM_STAGE_LIMIT = 5

export const M41_PRE_APPLIED_TRAITS: Record<string, readonly string[]> = {
  realm_qin: ['shang_yang_reform_done'],
  realm_zhao: ['hu_fu_qi_she_done'],
  realm_chu: ['wu_qi_failed_legacy'],
  realm_wei: ['li_kui_reform_done'],
}

export const M41_PRE_APPLIED_POLITICAL_SYSTEMS: Record<string, string> = {
  realm_qin: 'legalist_centralized',
  realm_zhao: 'commandery',
  realm_wei: 'commandery',
  realm_chu: 'enfeoffment',
}

// === M4.2 Disaster / Trade / Faction System ===
export const M42_DISASTER_COUNT = 6
export const M42_DISASTER_TYPES: readonly string[] = [
  'disaster_feng_nian',
  'disaster_qian_nian',
  'disaster_da_han',
  'disaster_da_shui',
  'disaster_huang_zai',
  'disaster_wen_yi',
]
export const M42_DISASTER_BASE_PROBABILITY_BP: Record<string, number> = {
  disaster_feng_nian: 800,
  disaster_qian_nian: 600,
  disaster_da_han: 400,
  disaster_da_shui: 300,
  disaster_huang_zai: 500,
  disaster_wen_yi: 200,
}
export const M42_DISASTER_RELIEF_CHOICES: readonly string[] = [
  'open_granary',
  'reduce_tax',
  'forced_levy',
  'ignore',
]
export const M42_DISASTER_OPEN_GRANARY_FOOD_COST = 2000
export const M42_DISASTER_REDUCE_TAX_TREASURY_LOSS = 500
export const M42_DISASTER_FORCED_LEVY_TREASURY_GAIN = 300
export const M42_DISASTER_COOLDOWN_TICKS = 36
export const M42_DISASTER_DECISION_TIMEOUT_TICKS = 3
export const M42_TRADE_ROUTE_BASE_INCOME_PER_XUN = 50
export const M42_TRADE_ROUTE_MAX_PER_REALM = 12
export const M42_TRADE_ROUTE_DISTANCE_PENALTY_BP_PER_HOP = 200
export const M42_TRADE_ROUTE_INITIAL_COUNT = 6
export const M42_TRADE_FACTION_INFLUENCE_PER_ROUTE_PER_YEAR = 5
export const M42_TRADE_ATTITUDE_BONUS_PER_YEAR = 2
export const M42_TRADE_MAX_HOPS_FALLBACK = 5
export const M42_FACTION_COUNT = 6
export const M42_FACTION_INFLUENCE_INITIAL = 50
export const M42_FACTION_INFLUENCE_MIN = 0
export const M42_FACTION_INFLUENCE_MAX = 100
export const M42_FACTION_IMBALANCE_THRESHOLD = 70
export const M42_FACTION_EVENT_COOLDOWN_YEARS = 5
export const M42_FACTION_EVENT_PRIORITY: readonly string[] = [
  'coup',
  'split',
  'overthrow',
]
export const M42_FACTION_DRIFT_PER_GENERAL_BP = 50
export const M42_TRAIT_DIMENSIONS_COUNT = 3
export const M42_FACTION_BALANCE_PROXIMITY_THRESHOLD = 10
export const M42_FACTION_BALANCE_EDICT_DURATION_MONTHS = 6
export const M42_FACTION_REFORM_BLOCK_THRESHOLD = 70
export const M42_AI_DISASTER_RELIEF_PROPENSITY: Record<string, string> = {
  benevolent: 'open_granary',
  steward: 'reduce_tax',
  tyrant: 'forced_levy',
  conqueror: 'ignore',
  incompetent: 'ignore',
  builder: 'open_granary',
  learned: 'reduce_tax',
  schemer: 'reduce_tax',
}

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

// === M8 Personality Differentiation ===
export const M8_PERSONALITY_DIMENSIONS_COUNT = 8

export const M8_PERSONALITY_ARCHETYPE_LIST = [
  'conqueror',
  'steward',
  'schemer',
  'learned',
  'tyrant',
  'incompetent',
  'benevolent',
  'builder',
] as const

export const M8_WAR_DECLARATION_BIAS: Record<PersonalityArchetype, number> = {
  conqueror: 0.4,
  steward: -0.3,
  schemer: 0.1,
  learned: -0.2,
  tyrant: 0.35,
  incompetent: 0.01,
  benevolent: -0.35,
  builder: -0.25,
}

export const M8_PEACE_ACCEPTANCE_THRESHOLD: Record<
  PersonalityArchetype,
  number
> = {
  conqueror: -0.3,
  steward: 0.2,
  schemer: 0.05,
  learned: 0.15,
  tyrant: -0.25,
  incompetent: 0.1,
  benevolent: 0.35,
  builder: 0.1,
}

export const M8_ALLIANCE_PROPENSITY: Record<PersonalityArchetype, number> = {
  conqueror: -0.1,
  steward: 0.2,
  schemer: 0.3,
  learned: 0.15,
  tyrant: -0.2,
  incompetent: 0.0,
  benevolent: 0.25,
  builder: 0.1,
}

export const M8_COALITION_JOIN_BIAS: Record<PersonalityArchetype, number> = {
  conqueror: 0.1,
  steward: -0.1,
  schemer: 0.3,
  learned: -0.15,
  tyrant: -0.25,
  incompetent: 0.0,
  benevolent: -0.1,
  builder: -0.05,
}

export const M8_RECRUITMENT_SPECIALTY_PREFERENCE: Record<
  PersonalityArchetype,
  Record<Specialty, number>
> = {
  conqueror: {
    commander: 2.5,
    warrior: 2.5,
    strategist: 1.0,
    administrator: 0.5,
    reformer: 0.5,
    diplomat: 0.5,
    spy: 0.8,
    scholar: 0.5,
    engineer: 0.7,
  },
  steward: {
    commander: 0.5,
    warrior: 0.5,
    strategist: 0.8,
    administrator: 3.0,
    reformer: 1.0,
    diplomat: 1.5,
    spy: 0.5,
    scholar: 1.2,
    engineer: 1.0,
  },
  schemer: {
    commander: 0.8,
    warrior: 0.8,
    strategist: 2.5,
    administrator: 0.8,
    reformer: 0.8,
    diplomat: 2.0,
    spy: 2.5,
    scholar: 0.8,
    engineer: 0.5,
  },
  learned: {
    commander: 0.5,
    warrior: 0.5,
    strategist: 1.5,
    administrator: 1.0,
    reformer: 1.5,
    diplomat: 1.5,
    spy: 0.5,
    scholar: 3.0,
    engineer: 1.0,
  },
  tyrant: {
    commander: 2.5,
    warrior: 2.0,
    strategist: 0.8,
    administrator: 0.5,
    reformer: 0.3,
    diplomat: 0.3,
    spy: 2.0,
    scholar: 0.3,
    engineer: 0.8,
  },
  incompetent: {
    commander: 1.0,
    warrior: 1.0,
    strategist: 1.0,
    administrator: 1.0,
    reformer: 1.0,
    diplomat: 1.0,
    spy: 1.0,
    scholar: 1.0,
    engineer: 1.0,
  },
  benevolent: {
    commander: 0.5,
    warrior: 0.5,
    strategist: 0.8,
    administrator: 2.5,
    reformer: 1.0,
    diplomat: 1.5,
    spy: 0.3,
    scholar: 2.0,
    engineer: 1.0,
  },
  builder: {
    commander: 0.5,
    warrior: 0.5,
    strategist: 0.8,
    administrator: 1.5,
    reformer: 3.0,
    diplomat: 0.8,
    spy: 0.5,
    scholar: 1.5,
    engineer: 2.5,
  },
}

export const M8_TAX_RATE_TARGET: Record<PersonalityArchetype, number> = {
  conqueror: 30,
  steward: 20,
  schemer: 22,
  learned: 18,
  tyrant: 40,
  incompetent: 20,
  benevolent: 10,
  builder: 18,
}

export const M8_TREASURY_RESERVE_FLOOR: Record<PersonalityArchetype, number> = {
  conqueror: 5000,
  steward: 8000,
  schemer: 6000,
  learned: 7000,
  tyrant: 3000,
  incompetent: 2000,
  benevolent: 6000,
  builder: 9000,
}

export const M8_EDICT_ENACTMENT_BIAS: Record<
  PersonalityArchetype,
  { issuanceMultiplier: number; preferredEdict: EdictKind | null }
> = {
  conqueror: { issuanceMultiplier: 1.5, preferredEdict: 'edict_grain_reserve' },
  steward: { issuanceMultiplier: 1.0, preferredEdict: 'edict_tax_relief' },
  schemer: { issuanceMultiplier: 1.3, preferredEdict: null },
  learned: { issuanceMultiplier: 0.9, preferredEdict: 'edict_tax_relief' },
  tyrant: { issuanceMultiplier: 1.5, preferredEdict: 'edict_grain_reserve' },
  incompetent: { issuanceMultiplier: 0.5, preferredEdict: null },
  benevolent: { issuanceMultiplier: 0.9, preferredEdict: 'edict_tax_relief' },
  builder: { issuanceMultiplier: 1.4, preferredEdict: null },
}
